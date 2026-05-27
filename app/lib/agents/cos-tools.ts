import { tool } from "ai";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, WORKSPACE_ID } from "../db";
import { goals, memories, tasks } from "../db/schema";
import { getActiveGoal, getGoals, getMemories, getTasks } from "../db/queries";

export const cosTools = {
  list_goals: tool({
    description: "List all goals in the workspace",
    inputSchema: z.object({}),
    execute: async () => {
      const rows = await getGoals();
      return rows.map((g) => ({
        id: g.id,
        title: g.title,
        why: g.why_it_matters,
        metric: g.success_metric,
        active: g.active,
        status: g.status,
        deadline: g.deadline,
      }));
    },
  }),

  list_memories: tool({
    description:
      "List memories. Returns company facts, decisions, and agent notes.",
    inputSchema: z.object({
      type: z
        .enum(["company", "decision", "agent_note"])
        .optional()
        .describe("Filter by type"),
    }),
    execute: async ({ type }) => {
      const rows = await getMemories();
      const filtered = type ? rows.filter((m) => m.type === type) : rows;
      return filtered.map((m) => ({
        id: m.id,
        type: m.type,
        title: m.title,
        content: m.content,
        importance: m.importance,
        pinned: m.pinned,
      }));
    },
  }),

  list_tasks: tool({
    description: "List tasks. Optionally filter by status.",
    inputSchema: z.object({
      status: z
        .enum([
          "suggested",
          "approved",
          "in_progress",
          "needs_review",
          "done",
          "rejected",
        ])
        .optional(),
    }),
    execute: async ({ status }) => {
      const rows = await getTasks();
      const filtered = status ? rows.filter((t) => t.status === status) : rows;
      return filtered.map((t) => ({
        id: t.id,
        goal_id: t.goal_id,
        title: t.title,
        status: t.status,
        risk: t.risk_level,
      }));
    },
  }),

  create_goal: tool({
    description: "Create a new goal. Use when the founder wants to add a goal.",
    inputSchema: z.object({
      title: z.string(),
      why_it_matters: z.string(),
      success_metric: z.string(),
      deadline_days: z
        .number()
        .int()
        .min(1)
        .max(180)
        .describe("Days from today"),
      active: z.boolean().default(false),
    }),
    execute: async ({
      title,
      why_it_matters,
      success_metric,
      deadline_days,
      active,
    }) => {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + deadline_days);

      if (active) {
        await db
          .update(goals)
          .set({ active: false })
          .where(eq(goals.workspace_id, WORKSPACE_ID));
      }

      const [row] = await db
        .insert(goals)
        .values({
          workspace_id: WORKSPACE_ID,
          title,
          description: why_it_matters,
          why_it_matters,
          success_metric,
          status: "active",
          deadline,
          active,
        })
        .returning();

      return { id: row.id, title: row.title, active: row.active };
    },
  }),

  update_goal: tool({
    description: "Update a goal's fields by id",
    inputSchema: z.object({
      id: z.string(),
      title: z.string().optional(),
      why_it_matters: z.string().optional(),
      success_metric: z.string().optional(),
      active: z.boolean().optional(),
      status: z.enum(["active", "paused", "done"]).optional(),
    }),
    execute: async ({ id, ...patch }) => {
      if (patch.active === true) {
        await db
          .update(goals)
          .set({ active: false })
          .where(eq(goals.workspace_id, WORKSPACE_ID));
      }
      await db
        .update(goals)
        .set(patch)
        .where(and(eq(goals.id, id), eq(goals.workspace_id, WORKSPACE_ID)));
      return { ok: true, id };
    },
  }),

  create_memory: tool({
    description:
      "Save a memory. Use for stable facts (company), decisions, or agent learnings.",
    inputSchema: z.object({
      type: z.enum(["company", "decision", "agent_note"]),
      title: z.string(),
      content: z.string(),
      importance: z.union([z.literal(1), z.literal(2), z.literal(3)]),
      pinned: z.boolean().default(false),
    }),
    execute: async ({ type, title, content, importance, pinned }) => {
      const [row] = await db
        .insert(memories)
        .values({
          workspace_id: WORKSPACE_ID,
          type,
          title,
          content,
          importance,
          pinned,
        })
        .returning();
      return { id: row.id, title: row.title };
    },
  }),

  create_task: tool({
    description: "Create a task tied to a goal",
    inputSchema: z.object({
      goal_id: z.string(),
      title: z.string(),
      description: z.string(),
      output_type: z.string().describe("e.g. code, doc, decision_memo, integration"),
      risk_level: z.enum(["low", "medium", "high"]).default("low"),
    }),
    execute: async ({ goal_id, title, description, output_type, risk_level }) => {
      const [row] = await db
        .insert(tasks)
        .values({
          workspace_id: WORKSPACE_ID,
          goal_id,
          title,
          description,
          status: "suggested",
          priority: 2,
          risk_level,
          output_type,
        })
        .returning();
      return { id: row.id, title: row.title };
    },
  }),

  get_active_goal: tool({
    description: "Get the currently active goal",
    inputSchema: z.object({}),
    execute: async () => {
      const g = await getActiveGoal();
      if (!g) return null;
      return {
        id: g.id,
        title: g.title,
        why: g.why_it_matters,
        metric: g.success_metric,
        deadline: g.deadline,
      };
    },
  }),
};
