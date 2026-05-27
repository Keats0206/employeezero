import { and, eq } from "drizzle-orm";
import { db, WORKSPACE_ID } from "../db";
import { agentToolPermissions, decisions, toolRuns } from "../db/schema";
import { getToolDefinition } from "./registry";

export type PolicyDecision =
  | { allow: true; requiresApproval: boolean; reason?: string }
  | { allow: false; reason: string };

export async function evaluateToolPolicy(args: {
  agentId: string;
  toolKey: string;
  taskId?: string;
}): Promise<PolicyDecision> {
  const tool = getToolDefinition(args.toolKey);
  if (!tool) return { allow: false, reason: `Unknown tool '${args.toolKey}'` };

  const perms = await db
    .select()
    .from(agentToolPermissions)
    .where(
      and(
        eq(agentToolPermissions.workspace_id, WORKSPACE_ID),
        eq(agentToolPermissions.agent_id, args.agentId),
        eq(agentToolPermissions.tool_key, args.toolKey)
      )
    )
    .limit(1);

  const perm = perms[0];
  if (!perm || !perm.allowed) {
    return {
      allow: false,
      reason: `Agent '${args.agentId}' is not permitted to use '${args.toolKey}'`,
    };
  }

  if (tool.requiresApproval) {
    return {
      allow: true,
      requiresApproval: true,
      reason: `Tool '${args.toolKey}' is approval-gated`,
    };
  }

  return { allow: true, requiresApproval: false };
}

export async function createApprovalDecision(args: {
  taskId?: string;
  agentId: string;
  toolKey: string;
  summary: string;
}) {
  const inserted = await db
    .insert(decisions)
    .values({
      workspace_id: WORKSPACE_ID,
      task_id: args.taskId ?? null,
      agent_id: args.agentId,
      type: "approval",
      status: "open",
      title: `Approve tool action: ${args.toolKey}`,
      why_it_matters: args.summary,
      recommendation: "Approve if action aligns with current sprint goal.",
      evidence: JSON.stringify({ toolKey: args.toolKey }),
    })
    .returning();

  return inserted[0] ?? null;
}

export async function markToolRunBlocked(toolRunId: string, error: string) {
  await db
    .update(toolRuns)
    .set({ status: "blocked", error })
    .where(
      and(eq(toolRuns.workspace_id, WORKSPACE_ID), eq(toolRuns.id, toolRunId))
    );
}
