import { COS_MODEL, runCosWorkbenchLoop, type LoopMode } from "@/app/lib/agents/cos-workbench";
import type { AgentOutputs } from "@/app/lib/cabana-config";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const {
    idea,
    outputs,
    signals,
    actions,
    founder_brief,
    company_context,
    sprint_plan,
    cycle,
    mode = "plan_only",
  }: {
    idea?: string;
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
  } = await req.json();

  if (!idea?.trim()) {
    return Response.json({ error: "idea required" }, { status: 400 });
  }

  try {
    const result = await runCosWorkbenchLoop({
      idea,
      outputs,
      signals,
      actions,
      founder_brief,
      company_context,
      sprint_plan,
      cycle,
      mode,
    });

    return Response.json({
      ok: true,
      model: COS_MODEL,
      cycle: cycle ?? 1,
      mode,
      loop: result.loop,
      work_orders: result.loop.work_orders,
      agent_results: result.agentResults,
      usage: result.usage,
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
