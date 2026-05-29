import { NextResponse } from "next/server";
import { abort, listActive } from "@/app/lib/agents/abort-registry";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const toolCallId = typeof body.toolCallId === "string" ? body.toolCallId : null;
  if (!toolCallId) {
    return NextResponse.json({ ok: false, reason: "toolCallId required" }, { status: 400 });
  }
  const ok = abort(toolCallId);
  return NextResponse.json({ ok, toolCallId });
}

export async function GET() {
  return NextResponse.json({ active: listActive() });
}
