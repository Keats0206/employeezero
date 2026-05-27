import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, WORKSPACE_ID } from "@/app/lib/db";
import { connectorEvents, connectors } from "@/app/lib/db/schema";

const ParamsSchema = z.object({
  key: z.enum(["google", "github", "stripe"]),
});

const BodySchema = z.object({
  action: z.enum(["connect", "disconnect", "test"]),
});

function nowIso() {
  return new Date().toISOString();
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ key: string }> }
) {
  const rawParams = await ctx.params;
  const parsedParams = ParamsSchema.safeParse(rawParams);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "invalid connector key" }, { status: 400 });
  }

  const rawBody = await req.json().catch(() => null);
  const parsedBody = BodySchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }

  const key = parsedParams.data.key;
  const action = parsedBody.data.action;

  const rows = await db
    .select()
    .from(connectors)
    .where(and(eq(connectors.workspace_id, WORKSPACE_ID), eq(connectors.key, key)))
    .limit(1);

  const connector = rows[0];
  if (!connector) {
    return NextResponse.json({ error: "connector not found" }, { status: 404 });
  }

  if (action === "connect") {
    await db
      .update(connectors)
      .set({
        status: "connected",
        last_error: null,
        last_synced_at: new Date(nowIso()),
      })
      .where(and(eq(connectors.workspace_id, WORKSPACE_ID), eq(connectors.key, key)));
  }

  if (action === "disconnect") {
    await db
      .update(connectors)
      .set({
        status: "not_connected",
        last_error: null,
      })
      .where(and(eq(connectors.workspace_id, WORKSPACE_ID), eq(connectors.key, key)));
  }

  if (action === "test") {
    await db
      .update(connectors)
      .set({
        status: "connected",
        last_error: null,
        last_synced_at: new Date(nowIso()),
      })
      .where(and(eq(connectors.workspace_id, WORKSPACE_ID), eq(connectors.key, key)));
  }

  await db.insert(connectorEvents).values({
    workspace_id: WORKSPACE_ID,
    connector_id: connector.id,
    connector_key: key,
    actor_user_id: null,
    action,
    status: "ok",
    detail:
      action === "test"
        ? "Connectivity test passed in local mode."
        : `Connector ${action}ed by operator.`,
  });

  const latest = await db
    .select()
    .from(connectors)
    .where(and(eq(connectors.workspace_id, WORKSPACE_ID), eq(connectors.key, key)))
    .limit(1);

  return NextResponse.json({ item: latest[0] ?? null });
}
