import { and, desc, eq } from "drizzle-orm";
import { db, WORKSPACE_ID } from "./index";
import {
  goals,
  tasks,
  artifacts,
  memories,
  approvals,
  decisions,
  toolRegistry,
  agentToolPermissions,
  toolRuns,
  connectors,
  connectorEvents,
} from "./schema";

const ws = (t: { workspace_id: typeof goals.workspace_id }) =>
  eq(t.workspace_id, WORKSPACE_ID);

export async function getGoals() {
  return db
    .select()
    .from(goals)
    .where(eq(goals.workspace_id, WORKSPACE_ID))
    .orderBy(desc(goals.active), desc(goals.created_at));
}

export async function getActiveGoal() {
  const rows = await db
    .select()
    .from(goals)
    .where(and(eq(goals.workspace_id, WORKSPACE_ID), eq(goals.active, true)))
    .limit(1);
  if (rows[0]) return rows[0];
  const fallback = await db
    .select()
    .from(goals)
    .where(eq(goals.workspace_id, WORKSPACE_ID))
    .limit(1);
  return fallback[0] ?? null;
}

export async function getTasks() {
  return db
    .select()
    .from(tasks)
    .where(eq(tasks.workspace_id, WORKSPACE_ID))
    .orderBy(desc(tasks.created_at));
}

export async function getArtifacts() {
  return db
    .select()
    .from(artifacts)
    .where(eq(artifacts.workspace_id, WORKSPACE_ID))
    .orderBy(desc(artifacts.created_at));
}

export async function getMemories() {
  return db
    .select()
    .from(memories)
    .where(eq(memories.workspace_id, WORKSPACE_ID))
    .orderBy(desc(memories.pinned), desc(memories.importance), desc(memories.created_at));
}

export async function getApprovals() {
  return db
    .select()
    .from(approvals)
    .where(eq(approvals.workspace_id, WORKSPACE_ID))
    .orderBy(desc(approvals.created_at));
}

export async function getPendingApprovals() {
  return db
    .select()
    .from(approvals)
    .where(
      and(
        eq(approvals.workspace_id, WORKSPACE_ID),
        eq(approvals.status, "pending")
      )
    )
    .orderBy(desc(approvals.created_at));
}

export async function getOpenDecisions() {
  return db
    .select()
    .from(decisions)
    .where(
      and(
        eq(decisions.workspace_id, WORKSPACE_ID),
        eq(decisions.status, "open")
      )
    )
    .orderBy(desc(decisions.created_at));
}

export async function getTools() {
  return db
    .select()
    .from(toolRegistry)
    .where(eq(toolRegistry.workspace_id, WORKSPACE_ID))
    .orderBy(desc(toolRegistry.created_at));
}

export async function getAgentToolPermissions(agentId: string) {
  return db
    .select()
    .from(agentToolPermissions)
    .where(
      and(
        eq(agentToolPermissions.workspace_id, WORKSPACE_ID),
        eq(agentToolPermissions.agent_id, agentId)
      )
    )
    .orderBy(desc(agentToolPermissions.created_at));
}

export async function getToolRunsForTask(taskId: string) {
  return db
    .select()
    .from(toolRuns)
    .where(
      and(eq(toolRuns.workspace_id, WORKSPACE_ID), eq(toolRuns.task_id, taskId))
    )
    .orderBy(desc(toolRuns.created_at));
}

const DEFAULT_CONNECTORS = [
  { key: "google", label: "Google", scopes: "drive.readonly profile email" },
  { key: "github", label: "GitHub", scopes: "repo read:org" },
  { key: "stripe", label: "Stripe", scopes: "read_only" },
] as const;

export async function ensureDefaultConnectors() {
  const existing = await db
    .select()
    .from(connectors)
    .where(eq(connectors.workspace_id, WORKSPACE_ID));

  const existingKeys = new Set(existing.map((c) => c.key));
  const missing = DEFAULT_CONNECTORS.filter((c) => !existingKeys.has(c.key));
  if (!missing.length) return;

  await db.insert(connectors).values(
    missing.map((c) => ({
      workspace_id: WORKSPACE_ID,
      key: c.key,
      label: c.label,
      scopes: c.scopes,
      status: "not_connected" as const,
    }))
  );
}

export async function getConnectors() {
  await ensureDefaultConnectors();
  return db
    .select()
    .from(connectors)
    .where(eq(connectors.workspace_id, WORKSPACE_ID))
    .orderBy(desc(connectors.created_at));
}

export async function getConnectorEvents(limit = 50) {
  return db
    .select()
    .from(connectorEvents)
    .where(eq(connectorEvents.workspace_id, WORKSPACE_ID))
    .orderBy(desc(connectorEvents.created_at))
    .limit(limit);
}
