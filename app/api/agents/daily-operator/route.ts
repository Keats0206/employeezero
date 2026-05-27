import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, WORKSPACE_ID } from "../../../lib/db";
import { artifacts, approvals, agentRuns, tasks } from "../../../lib/db/schema";
import {
  getActiveGoal,
  getArtifacts,
  getMemories,
  getTasks,
} from "../../../lib/db/queries";

export const runtime = "nodejs";
export const maxDuration = 60;

const BriefSchema = z.object({
  brief: z.object({
    summary: z.string().describe("2-3 sentence narrative of where things stand"),
    changed: z.array(z.string()).max(4),
    blocked: z.array(z.string()).max(3),
    recommended: z.array(z.string()).max(4),
    needs_decision: z.array(z.string()).max(3),
  }),
  suggested_tasks: z
    .array(
      z.object({
        title: z.string(),
        why: z.string(),
        output_type: z.enum([
          "growth_draft",
          "decision_memo",
          "research_note",
          "github_issue",
        ]),
        risk: z.enum(["low", "medium", "high"]),
      })
    )
    .max(4),
});

const SYSTEM_PROMPT = `You are the Daily Operator for employeezero — an agentic cockpit for a solo founder.

Your job each morning:
1. Read the current goal, the founder's memories (pinned facts and decisions), and recent agent output.
2. Emit a Daily Brief: short, scannable, founder-facing. No fluff. No agent-speak.
3. Suggest 2-4 small, artifact-driven next tasks that serve the active goal.

Constraints:
- Daily briefs ≤ 4 bullets per section. If it doesn't fit, prioritize harder.
- Tasks must be small (≤ 2 hours each), output-typed, and tied to the active goal.
- Task output_type must be one of: growth_draft, decision_memo, research_note, github_issue.
- Never propose touching auth, billing, or db migrations without flagging risk as "high".
- Prefer to advance the active goal over starting new threads.

Output style: terse, founder-tool register. Borrow from Linear/Stripe. Avoid emojis and gradient slop.`;

export async function POST() {
  const run = await db
    .insert(agentRuns)
    .values({
      workspace_id: WORKSPACE_ID,
      agent_type: "daily_operator",
      status: "running",
      input: "morning run",
    })
    .returning();
  const runId = run[0].id;

  try {
    const [activeGoal, memories, recentArtifacts, allTasks] = await Promise.all(
      [getActiveGoal(), getMemories(), getArtifacts(), getTasks()]
    );

    if (!activeGoal) {
      throw new Error("No active goal — set one before running the operator.");
    }

    const pinnedMemories = memories.filter((m) => m.pinned).slice(0, 12);
    const otherMemories = memories.filter((m) => !m.pinned).slice(0, 8);
    const recent = recentArtifacts.slice(0, 6);
    const openTasks = allTasks.filter(
      (t) =>
        t.status === "in_progress" ||
        t.status === "approved" ||
        t.status === "needs_review"
    );

    const context = `
ACTIVE GOAL
${activeGoal.title}
Why: ${activeGoal.why_it_matters}
Metric: ${activeGoal.success_metric}

PINNED MEMORIES
${pinnedMemories.map((m) => `- [${m.type}] ${m.title}: ${m.content}`).join("\n")}

OTHER MEMORIES
${otherMemories.map((m) => `- [${m.type}] ${m.title}: ${m.content}`).join("\n")}

RECENT ARTIFACTS
${recent.map((a) => `- (${a.type}) ${a.title}`).join("\n")}

OPEN TASKS
${openTasks.map((t) => `- [${t.status}] ${t.title}`).join("\n")}
`.trim();

    const { object } = await generateObject({
      model: "anthropic/claude-haiku-4-5",
      schema: BriefSchema,
      system: SYSTEM_PROMPT,
      prompt: `Today is ${new Date().toDateString()}.\n\n${context}\n\nProduce the daily brief and suggested tasks.`,
    });

    const briefContent = [
      object.brief.summary,
      "",
      "CHANGED",
      ...object.brief.changed.map((s) => `· ${s}`),
      "",
      "BLOCKED",
      ...object.brief.blocked.map((s) => `· ${s}`),
      "",
      "RECOMMENDED",
      ...object.brief.recommended.map((s) => `· ${s}`),
      "",
      "NEEDS DECISION",
      ...object.brief.needs_decision.map((s) => `· ${s}`),
    ].join("\n");

    const briefRow = await db
      .insert(artifacts)
      .values({
        workspace_id: WORKSPACE_ID,
        goal_id: activeGoal.id,
        task_id: null,
        type: "daily_brief",
        title: `Daily Brief — ${new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}`,
        content: briefContent,
        created_by_agent: "daily_operator",
      })
      .returning();

    const insertedTasks = await db
      .insert(tasks)
      .values(
        object.suggested_tasks.map((t) => ({
          workspace_id: WORKSPACE_ID,
          goal_id: activeGoal.id,
          title: t.title,
          description: t.why,
          status: "suggested" as const,
          priority: 2,
          risk_level: t.risk,
          output_type: t.output_type,
        }))
      )
      .returning();

    if (insertedTasks.length > 0) {
      await db.insert(approvals).values(
        insertedTasks.map((t) => ({
          workspace_id: WORKSPACE_ID,
          task_id: t.id,
          artifact_id: null,
          action: `Approve task: ${t.title}`,
          status: "pending" as const,
          notes: "",
        }))
      );
    }

    await db
      .update(agentRuns)
      .set({
        status: "succeeded",
        output: `Brief ${briefRow[0].id}, ${insertedTasks.length} tasks suggested`,
      })
      .where(eq(agentRuns.id, runId));

    return NextResponse.json({
      ok: true,
      brief_id: briefRow[0].id,
      task_count: insertedTasks.length,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    await db
      .update(agentRuns)
      .set({ status: "failed", error: message })
      .where(eq(agentRuns.id, runId));
    console.error("daily-operator error", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
