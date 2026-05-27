import { z } from "zod";

export type ToolRisk = "low" | "medium" | "high";
export type ToolCapability = "read" | "write" | "send" | "spend" | "deploy";

export interface ToolDefinition {
  key: string;
  name: string;
  description: string;
  riskLevel: ToolRisk;
  requiresApproval: boolean;
  capabilities: ToolCapability[];
  inputSchema: z.ZodTypeAny;
}

export interface ToolExecutionContext {
  workspaceId: string;
  agentId: string;
  taskId?: string;
  decisionId?: string;
}

export interface ToolRunResult {
  ok: boolean;
  output?: unknown;
  error?: string;
  durationMs?: number;
  estimatedCostUsdCents?: number;
}
