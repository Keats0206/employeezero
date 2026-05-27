import { NextResponse } from "next/server";
import { listRuns, startRun } from "@/app/lib/agents/runner";

export async function GET() {
  return NextResponse.json({ runs: listRuns() });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const agent_type = body.agent_type ?? "task_plan";
  const input = body.input ?? "";
  const run = startRun(agent_type, input);
  return NextResponse.json({ run });
}
