import { gateway, generateObject } from "ai";
import { z } from "zod";
import type { AgentOutputs } from "@/app/lib/cabana-config";

export const COS_MODEL = "anthropic/claude-sonnet-4-6";

const WorkOrderSchema = z.object({
  agent: z.literal("builder"),
  task_type: z.enum(["new_site", "product_update"]),
  title: z.string(),
  brief: z.string(),
  reason: z.string(),
  requires_approval: z.literal(true),
  status: z.enum(["pending_approval", "approved", "running", "done"]).default("pending_approval"),
});

export const LoopSchema = z.object({
  state_read: z.string().describe("One sentence summary of current cabana state"),
  decision: z.string().describe("The CoS decision for this cycle"),
  agents_to_run: z.array(z.object({
    agent: z.enum(["scout", "strategist", "builder", "seller", "creator", "analyst"]),
    task: z.string(),
    reason: z.string(),
  })).min(1).max(3),
  plan_changes: z.array(z.object({
    type: z.enum(["add", "update", "remove"]),
    text: z.string(),
  })).min(1).max(5),
  work_orders: z.array(WorkOrderSchema).max(2),
  escalation: z.object({
    needed: z.boolean(),
    question: z.string(),
    reason: z.string(),
  }),
  next_play: z.string(),
});

export const AgentResultSchema = z.object({
  summary: z.string(),
  output: z.string(),
  suggested_play: z.string(),
});

export type LoopResult = z.infer<typeof LoopSchema>;
export type LoopAgent = LoopResult["agents_to_run"][number];
export type LoopMode = "plan_only" | "run_agents";

function agentPrompt(
  agent: LoopAgent,
  idea: string,
  outputs: AgentOutputs | undefined,
  signals: Record<string, number> | undefined,
  companyContext: string | undefined,
  sprintPlan: string | undefined,
  loop: LoopResult
) {
  return `You are Cabana's ${agent.agent} agent.

Run this task for real and produce usable output. Do not claim that external publishing, sending, or sales happened. You are creating the concrete work product for the user or CoS to review.

Business idea: ${idea}
CoS decision: ${loop.decision}
Your task: ${agent.task}
Why you were selected: ${agent.reason}

Current outputs:
${JSON.stringify(outputs ?? {}, null, 2)}

Company context / strategy doc:
${companyContext?.trim() || "No persistent company context yet."}

Current experiment / sprint plan:
${sprintPlan?.trim() || "No active experiment defined yet."}

Signals:
${JSON.stringify(signals ?? {}, null, 2)}

Return:
- summary: what you did
- output: the actual artifact, draft, research, copy, or analysis
- suggested_play: the next reviewable play this output supports`;
}

function cosPrompt({
  idea,
  outputs,
  signals,
  actions,
  founder_brief,
  company_context,
  sprint_plan,
  cycle,
}: {
  idea: string;
  outputs?: AgentOutputs;
  signals?: Record<string, number>;
  actions?: Array<{
    title?: string;
    channel?: string;
    status?: string;
    cycle?: number;
    details?: string;
  }>;
  founder_brief?: string;
  company_context?: string;
  sprint_plan?: string;
  cycle?: number;
}) {
  return `You are Cabana's Chief of Staff.

Run one lightweight operating cycle for this tiny internet business. Do not pretend external actions have happened. Your job is to inspect the current state, choose the next best internal agent work, mutate the plan, and escalate only if human approval or context is needed.

You have a Builder subagent available through a runBuilder delegation path. In this version, runBuilder creates a Builder work order for human approval; it must not auto-publish. If page copy, positioning, pricing presentation, CTA, or product framing should change, create a Builder work order instead of pretending the page was updated.

Cycle: ${cycle ?? 1}
Idea: ${idea}

Current outputs:
${JSON.stringify(outputs ?? {}, null, 2)}

Company context / strategy doc:
${company_context?.trim() || "No persistent company context yet."}

Current experiment / sprint plan:
${sprint_plan?.trim() || "No active experiment defined yet."}

Signals logged:
${JSON.stringify(signals ?? {}, null, 2)}

Manual action queue:
${JSON.stringify(actions ?? [], null, 2)}

Founder brief for this cycle:
${founder_brief?.trim() || "No one-time founder brief provided."}

Rules:
- Choose 1-3 agents only.
- Treat the founder brief as high-priority guidance for this cycle, but do not make it permanent unless it supports a plan change.
- Prefer Seller/Creator if no market signals exist.
- Prefer Analyst if replies, clicks, or sales exist.
- If approved or done actions exist, use them as evidence of founder execution.
- If pending actions are blocking progress, prioritize escalation or Analyst over creating duplicate actions.
- Prefer Builder only when page copy clearly needs revision.
- Create a Builder work order when the page should be created or updated. Use task_type "new_site" if no site exists yet, otherwise "product_update".
- Builder work orders must always require approval and start as pending_approval.
- Do not allow CoS to auto-deploy.
- Plan changes should be concrete and test-oriented.
- Preserve the current experiment unless signals imply it should be changed.
- Escalation should be needed when approval, credentials, budget, channel choice, or user context blocks the next real-world action.
- Keep all copy concise.`;
}

export async function runCosWorkbenchLoop(input: {
  idea: string;
  outputs?: AgentOutputs;
  signals?: Record<string, number>;
  actions?: Array<{
    title?: string;
    channel?: string;
    status?: string;
    cycle?: number;
    details?: string;
  }>;
  founder_brief?: string;
  company_context?: string;
  sprint_plan?: string;
  cycle?: number;
  mode?: LoopMode;
}) {
  const result = await generateObject({
    model: gateway(COS_MODEL),
    schema: LoopSchema,
    prompt: cosPrompt(input),
  });

  const loop = result.object;
  const agentResults = input.mode === "run_agents"
    ? await Promise.all(
      loop.agents_to_run
        .filter(agent => agent.agent !== "builder" || loop.work_orders.length === 0)
        .map(async agent => {
          const agentRun = await generateObject({
            model: gateway(COS_MODEL),
            schema: AgentResultSchema,
            prompt: agentPrompt(agent, input.idea, input.outputs, input.signals, input.company_context, input.sprint_plan, loop),
          });

          return {
            agent: agent.agent,
            task: agent.task,
            result: agentRun.object,
            usage: await agentRun.usage,
          };
        })
    )
    : [];

  return {
    loop,
    agentResults,
    usage: await result.usage,
  };
}
