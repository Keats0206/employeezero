import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "../../../lib/db";
import { approvals } from "../../../lib/db/schema";

export const runtime = "nodejs";

const VALID = ["pending", "approved", "rejected", "snoozed", "archived"] as const;
type Status = (typeof VALID)[number];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const status = body.status as Status;
  if (!VALID.includes(status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  const row = await db
    .select()
    .from(approvals)
    .where(eq(approvals.id, id))
    .limit(1);
  const approval = row[0];
  if (!approval) {
    return NextResponse.json({ error: "approval not found" }, { status: 404 });
  }

  await db
    .update(approvals)
    .set({ status })
    .where(eq(approvals.id, id));

  return NextResponse.json({ ok: true });
}
