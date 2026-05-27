import { and, eq } from "drizzle-orm";
import { db, WORKSPACE_ID } from "../db";
import { agentToolPermissions, toolRegistry } from "../db/schema";
import { AGENT_CATALOG } from "../agent-catalog";
import { TOOL_REGISTRY } from "./registry";

function resolveAgentTools(agentId: string): string[] {
  const agent = AGENT_CATALOG.find((a) => a.id === agentId);
  if (!agent) return [];
  return agent.starterTools.filter((t) => !!TOOL_REGISTRY[t]);
}

export async function ensureToolRegistryBootstrapped() {
  for (const tool of Object.values(TOOL_REGISTRY)) {
    const exists = await db
      .select()
      .from(toolRegistry)
      .where(
        and(
          eq(toolRegistry.workspace_id, WORKSPACE_ID),
          eq(toolRegistry.key, tool.key)
        )
      )
      .limit(1);

    if (!exists[0]) {
      await db.insert(toolRegistry).values({
        workspace_id: WORKSPACE_ID,
        key: tool.key,
        name: tool.name,
        description: tool.description,
        input_schema: JSON.stringify({ type: "zod", key: tool.key }),
        risk_level: tool.riskLevel,
        requires_approval: tool.requiresApproval,
        enabled: true,
      });
    }
  }

  for (const agent of AGENT_CATALOG) {
    for (const toolKey of resolveAgentTools(agent.id)) {
      const exists = await db
        .select()
        .from(agentToolPermissions)
        .where(
          and(
            eq(agentToolPermissions.workspace_id, WORKSPACE_ID),
            eq(agentToolPermissions.agent_id, agent.id),
            eq(agentToolPermissions.tool_key, toolKey)
          )
        )
        .limit(1);

      if (!exists[0]) {
        await db.insert(agentToolPermissions).values({
          workspace_id: WORKSPACE_ID,
          agent_id: agent.id,
          tool_key: toolKey,
          allowed: true,
        });
      }
    }
  }
}
