import { and, eq } from "drizzle-orm";
import { db, WORKSPACE_ID } from "../db";
import { toolRuns } from "../db/schema";
import { getToolDefinition } from "./registry";
import { createApprovalDecision, evaluateToolPolicy, markToolRunBlocked } from "./policy";
import type { ToolExecutionContext, ToolRunResult } from "./types";

async function executeConnectorTool(toolKey: string, input: unknown): Promise<ToolRunResult> {
  // Placeholder adapter layer for Exa / Arcade MCP integrations.
  // Replace this with actual connector dispatch once MCPs are wired.
  const start = Date.now();
  return {
    ok: true,
    output: {
      message: `Stub execution for ${toolKey}`,
      input,
    },
    durationMs: Date.now() - start,
    estimatedCostUsdCents: 0,
  };
}

export async function executeTool(args: {
  context: ToolExecutionContext;
  toolKey: string;
  input: unknown;
}) {
  const tool = getToolDefinition(args.toolKey);
  if (!tool) throw new Error(`Unknown tool '${args.toolKey}'`);

  const parsed = tool.inputSchema.safeParse(args.input);
  if (!parsed.success) {
    throw new Error(`Invalid tool input for '${args.toolKey}': ${parsed.error.message}`);
  }

  const [run] = await db
    .insert(toolRuns)
    .values({
      workspace_id: WORKSPACE_ID,
      task_id: args.context.taskId ?? null,
      decision_id: args.context.decisionId ?? null,
      agent_id: args.context.agentId,
      tool_key: args.toolKey,
      status: "queued",
      input: JSON.stringify(parsed.data),
      requires_approval: tool.requiresApproval,
    })
    .returning();

  if (!run) throw new Error("Failed to create tool run record");

  const policy = await evaluateToolPolicy({
    agentId: args.context.agentId,
    toolKey: args.toolKey,
    taskId: args.context.taskId,
  });

  if (!policy.allow) {
    await db
      .update(toolRuns)
      .set({ status: "failed", error: policy.reason })
      .where(and(eq(toolRuns.workspace_id, WORKSPACE_ID), eq(toolRuns.id, run.id)));
    throw new Error(policy.reason);
  }

  if (policy.requiresApproval) {
    const decision = await createApprovalDecision({
      taskId: args.context.taskId,
      agentId: args.context.agentId,
      toolKey: args.toolKey,
      summary: `Agent requested approval-gated tool '${args.toolKey}'.`,
    });

    await markToolRunBlocked(
      run.id,
      `Awaiting decision ${decision?.id ?? "(unavailable)"}`
    );

    return {
      runId: run.id,
      blocked: true,
      decisionId: decision?.id ?? null,
    };
  }

  await db
    .update(toolRuns)
    .set({ status: "running" })
    .where(and(eq(toolRuns.workspace_id, WORKSPACE_ID), eq(toolRuns.id, run.id)));

  const result = await executeConnectorTool(args.toolKey, parsed.data);

  if (!result.ok) {
    await db
      .update(toolRuns)
      .set({
        status: "failed",
        error: result.error ?? "Tool execution failed",
        duration_ms: result.durationMs ?? null,
      })
      .where(and(eq(toolRuns.workspace_id, WORKSPACE_ID), eq(toolRuns.id, run.id)));

    throw new Error(result.error ?? "Tool execution failed");
  }

  await db
    .update(toolRuns)
    .set({
      status: "succeeded",
      output: JSON.stringify(result.output ?? {}),
      duration_ms: result.durationMs ?? null,
      estimated_cost_usd_cents: result.estimatedCostUsdCents ?? null,
    })
    .where(and(eq(toolRuns.workspace_id, WORKSPACE_ID), eq(toolRuns.id, run.id)));

  return {
    runId: run.id,
    blocked: false,
    output: result.output ?? null,
  };
}
