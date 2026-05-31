import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/auth";
import { getUserActions, insertAction, updateActionStatus, getAction } from "@/app/lib/db/persistence";
import { agentMailEnabled, getOrCreateInbox, sendEmail } from "@/app/lib/agentmail";
import { setCabanaInbox } from "@/app/lib/db/cabana-queries";

export const runtime = "nodejs";

// GET /api/cabana/actions — load all actions for the current user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const list = await getUserActions(session.user.email);
  return NextResponse.json({ actions: list });
}

// POST /api/cabana/actions — create a new action
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: {
    title: string;
    channel?: string;
    details?: string;
    why?: string;
    status?: string;
    risk?: string;
    agent?: string;
    cycle?: number;
  } = await req.json();

  const action = await insertAction({
    userId: session.user.email,
    title: body.title,
    channel: body.channel,
    details: body.details,
    why: body.why,
    status: body.status,
    risk: body.risk,
    agent: body.agent,
    cycle: body.cycle,
  });

  return NextResponse.json(action);
}

// PATCH /api/cabana/actions — update an action's status. Approving a sendable
// action (tool === "agentmail") triggers the real send: the message leaves a
// Cabana-managed inbox for that cabana, and the status moves approved → done.
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, status, outputJson, resultUrl }: {
    id: string;
    status: string;
    outputJson?: string;
    resultUrl?: string;
  } = await req.json();

  // Ownership check before any mutation or send.
  const action = await getAction(id);
  if (!action || action.user_id !== session.user.email) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Real send on approval of an email outreach action.
  if (status === "approved" && action.tool === "agentmail") {
    if (!agentMailEnabled()) {
      await updateActionStatus(id, "failed", { outputJson: JSON.stringify({ error: "AgentMail not configured" }) });
      return NextResponse.json({ ok: false, error: "AgentMail not configured" }, { status: 503 });
    }
    let payload: { to?: string; subject?: string; text?: string; html?: string } = {};
    try { payload = JSON.parse(action.input_json || "{}"); } catch { /* ignore */ }
    if (!payload.to || !payload.text) {
      await updateActionStatus(id, "failed", { outputJson: JSON.stringify({ error: "Missing recipient or body" }) });
      return NextResponse.json({ ok: false, error: "Missing recipient or body" }, { status: 400 });
    }

    await updateActionStatus(id, "running");
    const inboxKey = action.cabana_id ?? session.user.email;
    const inbox = await getOrCreateInbox(inboxKey);
    // Remember which inbox this cabana sends from so reply webhooks map back.
    if (action.cabana_id) await setCabanaInbox(action.cabana_id, inbox.email);
    const sent = await sendEmail(inbox.inboxId, {
      to: payload.to,
      subject: payload.subject || "Quick question",
      text: payload.text,
      html: payload.html,
    });

    if (sent.ok) {
      await updateActionStatus(id, "done", {
        outputJson: JSON.stringify({ messageId: sent.messageId, threadId: sent.threadId, from: inbox.email }),
      });
      return NextResponse.json({ ok: true, sent: true, from: inbox.email });
    }
    await updateActionStatus(id, "failed", { outputJson: JSON.stringify({ error: "Send failed" }) });
    return NextResponse.json({ ok: false, error: "Send failed" }, { status: 502 });
  }

  await updateActionStatus(id, status, { outputJson, resultUrl });
  return NextResponse.json({ ok: true });
}
