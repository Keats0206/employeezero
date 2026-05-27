import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, WORKSPACE_ID } from "../../../lib/db";
import { tasks } from "../../../lib/db/schema";

export const runtime = "nodejs";

const VALID = [
  "suggested",
  "approved",
  "in_progress",
  "needs_review",
  "done",
  "rejected",
] as const;
type Status = (typeof VALID)[number];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const status = body.status as Status;
  if (!VALID.includes(status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  await db
    .update(tasks)
    .set({ status })
    .where(and(eq(tasks.id, id), eq(tasks.workspace_id, WORKSPACE_ID)));

  return NextResponse.json({ ok: true });
}
