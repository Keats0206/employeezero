import { tool } from "ai";
import { and, desc, eq } from "drizzle-orm";
import z from "zod";
import { db, WORKSPACE_ID } from "@/app/lib/db";
import { goals, tasks, memories, artifacts } from "@/app/lib/db/schema";

const ws = (workspaceId: string = WORKSPACE_ID) => workspaceId;

const listGoals = tool({
  description: "List the user's goals.",
  inputSchema: z.object({}),
  execute: async () => {
    const rows = await db
      .select()
      .from(goals)
      .where(eq(goals.workspace_id, ws()))
      .orderBy(desc(goals.active), desc(goals.created_at));
    return { goals: rows };
  },
});

const createGoal = tool({
  description: "Create a new goal. Use when the user mentions something they want to achieve or measure.",
  inputSchema: z.object({
    title: z.string(),
    description: z.string().optional(),
    why_it_matters: z.string().optional(),
    success_metric: z.string().optional(),
    deadline: z.string().optional().describe("ISO date"),
  }),
  execute: async ({ title, description, why_it_matters, success_metric, deadline }) => {
    const [row] = await db
      .insert(goals)
      .values({
        workspace_id: ws(),
        title,
        description: description ?? "",
        why_it_matters: why_it_matters ?? "",
        success_metric: success_metric ?? "",
        deadline: deadline ? new Date(deadline) : null,
      })
      .returning();
    return { goal: row };
  },
});

const updateGoal = tool({
  description: "Update an existing goal's fields or status.",
  inputSchema: z.object({
    id: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
    status: z.enum(["active", "paused", "done"]).optional(),
    active: z.boolean().optional(),
  }),
  execute: async ({ id, ...patch }) => {
    const [row] = await db
      .update(goals)
      .set(patch)
      .where(and(eq(goals.workspace_id, ws()), eq(goals.id, id)))
      .returning();
    return { goal: row };
  },
});

const listTasks = tool({
  description: "List the user's tasks. Optionally filter by status or goal.",
  inputSchema: z.object({
    status: z
      .enum(["suggested", "approved", "in_progress", "needs_review", "done", "rejected"])
      .optional(),
    goalId: z.string().optional(),
  }),
  execute: async ({ status, goalId }) => {
    const conditions = [eq(tasks.workspace_id, ws())];
    if (status) conditions.push(eq(tasks.status, status));
    if (goalId) conditions.push(eq(tasks.goal_id, goalId));
    const rows = await db
      .select()
      .from(tasks)
      .where(and(...conditions))
      .orderBy(desc(tasks.created_at));
    return { tasks: rows };
  },
});

const createTask = tool({
  description: "Create a new task linked to a goal. Use when the user describes work that needs to happen.",
  inputSchema: z.object({
    goalId: z.string().describe("ID of the goal this task contributes to"),
    title: z.string(),
    description: z.string().optional(),
    priority: z.number().min(1).max(5).optional(),
    risk_level: z.enum(["low", "medium", "high"]).optional(),
    output_type: z.string().optional().describe("e.g. 'note', 'code', 'tweet', 'email'"),
  }),
  execute: async ({ goalId, title, description, priority, risk_level, output_type }) => {
    const [row] = await db
      .insert(tasks)
      .values({
        workspace_id: ws(),
        goal_id: goalId,
        title,
        description: description ?? "",
        priority: priority ?? 3,
        risk_level: risk_level ?? "low",
        output_type: output_type ?? "note",
      })
      .returning();
    return { task: row };
  },
});

const updateTaskStatus = tool({
  description: "Move a task through its lifecycle (approve, start, request review, complete, reject).",
  inputSchema: z.object({
    id: z.string(),
    status: z.enum(["suggested", "approved", "in_progress", "needs_review", "done", "rejected"]),
  }),
  execute: async ({ id, status }) => {
    const [row] = await db
      .update(tasks)
      .set({ status })
      .where(and(eq(tasks.workspace_id, ws()), eq(tasks.id, id)))
      .returning();
    return { task: row };
  },
});

const listMemories = tool({
  description: "List the user's saved memories (decisions, company context, agent notes).",
  inputSchema: z.object({
    type: z.enum(["company", "decision", "agent_note"]).optional(),
  }),
  execute: async ({ type }) => {
    const conditions = [eq(memories.workspace_id, ws())];
    if (type) conditions.push(eq(memories.type, type));
    const rows = await db
      .select()
      .from(memories)
      .where(and(...conditions))
      .orderBy(desc(memories.pinned), desc(memories.importance), desc(memories.created_at));
    return { memories: rows };
  },
});

const addMemory = tool({
  description:
    "Save a memory. Use to capture decisions, important context about the project, or learnings.",
  inputSchema: z.object({
    type: z.enum(["company", "decision", "agent_note"]),
    title: z.string(),
    content: z.string(),
    importance: z.number().min(1).max(5).optional(),
    pinned: z.boolean().optional(),
  }),
  execute: async ({ type, title, content, importance, pinned }) => {
    const [row] = await db
      .insert(memories)
      .values({
        workspace_id: ws(),
        type,
        title,
        content,
        importance: importance ?? 1,
        pinned: pinned ?? false,
      })
      .returning();
    return { memory: row };
  },
});

const createArtifact = tool({
  description: "Save a produced artifact (research note, draft tweet/email, PRD, code review, etc).",
  inputSchema: z.object({
    type: z.enum([
      "daily_brief",
      "task_plan",
      "decision_memo",
      "prd",
      "github_issue",
      "growth_draft",
      "design_critique",
      "code_review",
      "research_note",
    ]),
    title: z.string(),
    content: z.string(),
    goalId: z.string().optional(),
    taskId: z.string().optional(),
    url: z.string().optional(),
  }),
  execute: async ({ type, title, content, goalId, taskId, url }) => {
    const [row] = await db
      .insert(artifacts)
      .values({
        workspace_id: ws(),
        type,
        title,
        content,
        goal_id: goalId,
        task_id: taskId,
        url,
        created_by_agent: "chat",
      })
      .returning();
    return { artifact: row };
  },
});

export const operatorTools = {
  listGoals,
  createGoal,
  updateGoal,
  listTasks,
  createTask,
  updateTaskStatus,
  listMemories,
  addMemory,
  createArtifact,
};
