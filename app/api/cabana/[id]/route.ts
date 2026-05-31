import { requireAuth, unauthorizedResponse } from "@/app/lib/auth-helpers";
import { getCabana, getCabanaOutputs, getCabanaPlays, deleteCabana, setCabanaRoster } from "@/app/lib/db/cabana-queries";
import { AGENT_ORDER, type AgentId } from "@/app/lib/cabana-config";

export const runtime = "nodejs";

// GET /api/cabana/[id] — load a specific cabana (with ownership check)
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let userId: string;
  try {
    ({ userId } = await requireAuth());
  } catch {
    return unauthorizedResponse();
  }

  try {
    const { id } = await params;

    const cabana = await getCabana(id);

    // Ownership check
    if (!cabana || cabana.user_id !== userId) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    // Load related data
    const [outputs, plays] = await Promise.all([
      getCabanaOutputs(id),
      getCabanaPlays(id),
    ]);

    return Response.json({ cabana, outputs, plays });
  } catch (err) {
    // Don't mask data-layer failures as auth errors — that turns a DB/schema
    // problem into a silent redirect on the client. Log and return 500.
    console.error("GET /api/cabana/[id] failed:", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}

// PATCH /api/cabana/[id] — persist the founder-approved crew roster
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let userId: string;
  try {
    ({ userId } = await requireAuth());
  } catch {
    return unauthorizedResponse();
  }

  try {
    const { id } = await params;
    const cabana = await getCabana(id);
    if (!cabana || cabana.user_id !== userId) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const { enabledAgents } = (await req.json()) as { enabledAgents?: string[] };
    if (!Array.isArray(enabledAgents)) {
      return Response.json({ error: "enabledAgents required" }, { status: 400 });
    }
    // Whitelist + dedupe against the known roster so we never persist junk.
    const roster = AGENT_ORDER.filter((a) => enabledAgents.includes(a)) as AgentId[];
    if (roster.length === 0) {
      return Response.json({ error: "Pick at least one agent" }, { status: 400 });
    }

    await setCabanaRoster(id, roster);
    return Response.json({ ok: true, enabledAgents: roster });
  } catch (err) {
    console.error("PATCH /api/cabana/[id] failed:", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}

// DELETE /api/cabana/[id] — delete a cabana and all its related data
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let userId: string;
  try {
    ({ userId } = await requireAuth());
  } catch {
    return unauthorizedResponse();
  }

  try {
    const { id } = await params;
    const cabana = await getCabana(id);
    if (!cabana || cabana.user_id !== userId) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    await deleteCabana(id);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/cabana/[id] failed:", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
