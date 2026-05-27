import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, WORKSPACE_ID } from "../../../lib/db";
import { goals } from "../../../lib/db/schema";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const updates: Record<string, unknown> = {};
  if (typeof body.title === "string") updates.title = body.title;
  if (typeof body.why_it_matters === "string")
    updates.why_it_matters = body.why_it_matters;
  if (typeof body.success_metric === "string")
    updates.success_metric = body.success_metric;
  if (typeof body.deadline === "string")
    updates.deadline = new Date(body.deadline);
  if (typeof body.active === "boolean") updates.active = body.active;
  if (typeof body.status === "string") updates.status = body.status;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "no updates" }, { status: 400 });
  }

  await db
    .update(goals)
    .set(updates)
    .where(and(eq(goals.id, id), eq(goals.workspace_id, WORKSPACE_ID)));

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db
    .delete(goals)
    .where(and(eq(goals.id, id), eq(goals.workspace_id, WORKSPACE_ID)));
  return NextResponse.json({ ok: true });
}
