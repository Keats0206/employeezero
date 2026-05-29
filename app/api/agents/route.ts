import { NextResponse } from "next/server";
import { listRuns, removeNonRunningRuns, removeRun, startRun } from "@/app/lib/agents/runner";

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

export async function DELETE(req: Request) {
  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? (body.ids as string[]) : [];
  const id = typeof body.id === "string" ? body.id : null;
  const allowActive = body.allowActive === true;

  if (id) {
    const result = removeRun(id, { allowActive });
    return NextResponse.json({ id, ...result });
  }

  if (ids.length > 0) {
    const results = ids.map((runId) => ({ id: runId, ...removeRun(runId, { allowActive }) }));
    return NextResponse.json({ results });
  }

  const summary = removeNonRunningRuns();
  return NextResponse.json({ mode: "non_running_only", ...summary });
}
