import { z } from "zod";
import type { ToolDefinition } from "./types";

export const TOOL_REGISTRY: Record<string, ToolDefinition> = {
  "web.search": {
    key: "web.search",
    name: "Web Search",
    description: "Search the web for current external information.",
    riskLevel: "low",
    requiresApproval: false,
    capabilities: ["read"],
    inputSchema: z.object({
      query: z.string().min(1),
      limit: z.number().int().positive().max(25).default(10),
    }),
  },
  "web.fetch": {
    key: "web.fetch",
    name: "Web Fetch",
    description: "Fetch and parse a specific URL.",
    riskLevel: "low",
    requiresApproval: false,
    capabilities: ["read"],
    inputSchema: z.object({
      url: z.string().url(),
    }),
  },
  "gmail.draft": {
    key: "gmail.draft",
    name: "Gmail Draft",
    description: "Create an email draft without sending.",
    riskLevel: "medium",
    requiresApproval: false,
    capabilities: ["write"],
    inputSchema: z.object({
      to: z.array(z.string().email()).min(1),
      subject: z.string().min(1),
      body: z.string().min(1),
    }),
  },
  "gmail.send": {
    key: "gmail.send",
    name: "Gmail Send",
    description: "Send an email to recipients.",
    riskLevel: "high",
    requiresApproval: true,
    capabilities: ["send"],
    inputSchema: z.object({
      draftId: z.string().min(1).optional(),
      to: z.array(z.string().email()).optional(),
      subject: z.string().optional(),
      body: z.string().optional(),
    }),
  },
  "github.create_issue": {
    key: "github.create_issue",
    name: "GitHub Create Issue",
    description: "Create a GitHub issue for scoped execution.",
    riskLevel: "medium",
    requiresApproval: false,
    capabilities: ["write"],
    inputSchema: z.object({
      repo: z.string().min(1),
      title: z.string().min(1),
      body: z.string().min(1),
    }),
  },
};

export function getToolDefinition(toolKey: string) {
  return TOOL_REGISTRY[toolKey] ?? null;
}
