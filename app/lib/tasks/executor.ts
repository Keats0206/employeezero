import { and, desc, eq } from "drizzle-orm";
import { generateText } from "ai";
import { db, WORKSPACE_ID } from "../db";
import { artifacts, goals, memories, tasks } from "../db/schema";

const RUNNABLE_OUTPUT_TYPES = new Set([
  "growth_draft",
  "decision_memo",
  "research_note",
  "github_issue",
]);

type RunnableArtifactType =
  | "growth_draft"
  | "decision_memo"
  | "research_note"
  | "github_issue";

export function isRunnableOutputType(outputType: string) {
  return RUNNABLE_OUTPUT_TYPES.has(outputType);
}

function outputTypeToArtifactType(outputType: string): RunnableArtifactType {
  if (outputType === "decision_memo") return "decision_memo";
  if (outputType === "research_note") return "research_note";
  if (outputType === "github_issue") return "github_issue";
  return "growth_draft";
}

function promptForType(type: RunnableArtifactType, title: string, description: string) {
  if (type === "github_issue") {
    return `Write a GitHub issue draft for this task.

TASK
Title: ${title}
Description: ${description}

Return markdown with sections:
- Problem
- Goal
- Scope
- Acceptance Criteria
- Risks`;
  }

  if (type === "decision_memo") {
    return `Write a short decision memo for this task.

TASK
Title: ${title}
Description: ${description}

Return markdown with sections:
- Decision
- Context
- Options considered
- Why this choice
- Next step`;
  }

  if (type === "research_note") {
    return `Write a focused research note for this task.

TASK
Title: ${title}
Description: ${description}

Return markdown with sections:
- Question
- Findings
- Evidence gaps
- Recommendation`;
  }

  return `Write a growth draft for this task.

TASK
Title: ${title}
Description: ${description}

Return markdown with sections:
- Objective
- Draft copy
- Distribution plan
- Success metric`;
}

export async function runTaskById(taskId: string) {
  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.workspace_id, WORKSPACE_ID)))
    .limit(1);

  if (!task) throw new Error("Task not found");
  if (!isRunnableOutputType(task.output_type)) {
    throw new Error(`Task output_type '${task.output_type}' is not runnable yet`);
  }
  if (task.status === "done") {
    return { task, artifactId: null, skipped: true as const };
  }

  await db
    .update(tasks)
    .set({ status: "in_progress" })
    .where(and(eq(tasks.id, task.id), eq(tasks.workspace_id, WORKSPACE_ID)));

  try {
    const [goal, pinnedMemories, recentArtifacts] = await Promise.all([
      db
        .select()
        .from(goals)
        .where(and(eq(goals.id, task.goal_id), eq(goals.workspace_id, WORKSPACE_ID)))
        .limit(1)
        .then((rows) => rows[0] ?? null),
      db
        .select()
        .from(memories)
        .where(
          and(
            eq(memories.workspace_id, WORKSPACE_ID),
            eq(memories.pinned, true)
          )
        )
        .orderBy(desc(memories.created_at))
        .limit(10),
      db
        .select()
        .from(artifacts)
        .where(eq(artifacts.workspace_id, WORKSPACE_ID))
        .orderBy(desc(artifacts.created_at))
        .limit(5),
    ]);

    const artifactType = outputTypeToArtifactType(task.output_type);
    const context = `
ACTIVE GOAL
${goal?.title ?? "No goal linked"}
Why: ${goal?.why_it_matters ?? "N/A"}
Metric: ${goal?.success_metric ?? "N/A"}

PINNED MEMORIES
${pinnedMemories.map((m) => `- ${m.title}: ${m.content}`).join("\n")}

RECENT ARTIFACTS
${recentArtifacts.map((a) => `- (${a.type}) ${a.title}`).join("\n")}
`.trim();

    const { text } = await generateText({
      model: "anthropic/claude-haiku-4-5",
      system:
        "You are an execution agent. Produce concrete, concise founder-grade output in markdown.",
      prompt: `${context}\n\n${promptForType(
        artifactType,
        task.title,
        task.description
      )}`,
    });

    const inserted = await db
      .insert(artifacts)
      .values({
        workspace_id: WORKSPACE_ID,
        goal_id: task.goal_id,
        task_id: task.id,
        type: artifactType,
        title: `${task.title} (${artifactType.replace(/_/g, " ")})`,
        content: text,
        created_by_agent: "task_executor",
      })
      .returning();

    await db
      .update(tasks)
      .set({ status: "done" })
      .where(and(eq(tasks.id, task.id), eq(tasks.workspace_id, WORKSPACE_ID)));

    return { task, artifactId: inserted[0]?.id ?? null, skipped: false as const };
  } catch (error) {
    await db
      .update(tasks)
      .set({ status: "needs_review" })
      .where(and(eq(tasks.id, task.id), eq(tasks.workspace_id, WORKSPACE_ID)));
    throw error;
  }
}
