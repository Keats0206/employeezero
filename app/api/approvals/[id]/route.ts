import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, WORKSPACE_ID } from "../../../lib/db";
import { approvals, tasks } from "../../../lib/db/schema";
import { isRunnableOutputType, runTaskById } from "../../../lib/tasks/executor";

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
    .where(and(eq(approvals.id, id), eq(approvals.workspace_id, WORKSPACE_ID)))
    .limit(1);
  const approval = row[0];
  if (!approval) {
    return NextResponse.json({ error: "approval not found" }, { status: 404 });
  }

  await db
    .update(approvals)
    .set({ status })
    .where(and(eq(approvals.id, id), eq(approvals.workspace_id, WORKSPACE_ID)));

  let autoRanTask = false;
  let artifactId: string | null = null;

  if (approval.task_id) {
    if (status === "approved") {
      await db
        .update(tasks)
        .set({ status: "approved" })
        .where(
          and(
            eq(tasks.id, approval.task_id),
            eq(tasks.workspace_id, WORKSPACE_ID),
            eq(tasks.status, "suggested")
          )
        );

      const taskRow = await db
        .select()
        .from(tasks)
        .where(
          and(eq(tasks.id, approval.task_id), eq(tasks.workspace_id, WORKSPACE_ID))
        )
        .limit(1);
      const task = taskRow[0];

      // Auto-run only low/medium risk tasks for currently supported output types.
      if (
        task &&
        task.risk_level !== "high" &&
        isRunnableOutputType(task.output_type)
      ) {
        const result = await runTaskById(task.id);
        autoRanTask = !result.skipped;
        artifactId = result.artifactId;
      }
    }

    if (status === "rejected") {
      await db
        .update(tasks)
        .set({ status: "rejected" })
        .where(
          and(eq(tasks.id, approval.task_id), eq(tasks.workspace_id, WORKSPACE_ID))
        );
    }
  }

  return NextResponse.json({ ok: true, auto_ran_task: autoRanTask, artifact_id: artifactId });
}
