// AgentMail inbound webhook. When someone replies to outreach, AgentMail POSTs
// a `message.received` event here. We map the receiving inbox back to its cabana
// and record the reply as a real signal — both in the signals table (the CoS /
// Analyst read path) and, if the cabana has a generated-app project, as a
// "replies" document so it shows in the Desk's Signals tab next to captured leads.

import { NextResponse } from "next/server";
import { getCabanaByInbox, logSignal } from "@/app/lib/db/cabana-queries";
import { getProjectByCabana, insertDocument } from "@/app/lib/db/app-data";

export const runtime = "nodejs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pickInbox(message: any): string | null {
  return (
    message?.inboxId ??
    message?.inbox_id ??
    (Array.isArray(message?.to) ? message.to[0] : message?.to) ??
    null
  );
}

export async function POST(req: Request) {
  // Optional shared-secret check (set AGENTMAIL_WEBHOOK_SECRET to enforce).
  const secret = process.env.AGENTMAIL_WEBHOOK_SECRET;
  if (secret) {
    const header = req.headers.get("x-webhook-secret") ?? req.headers.get("authorization");
    if (header !== secret && header !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any;
  try {
    event = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }

  const type = event?.event ?? event?.type;
  if (type && type !== "message.received") {
    return NextResponse.json({ ok: true, ignored: type });
  }

  const message = event?.message ?? event?.data?.message ?? event;
  const inbox = pickInbox(message);
  if (!inbox) return NextResponse.json({ ok: true, ignored: "no-inbox" });

  const cabana = await getCabanaByInbox(String(inbox));
  if (!cabana) return NextResponse.json({ ok: true, ignored: "no-cabana" });

  const from = message?.from ?? "unknown";
  const subject = message?.subject ?? "";
  const body = String(message?.extractedText ?? message?.text ?? "").trim();
  const excerpt = body.slice(0, 280);

  // Canonical signal — what the Analyst / CoS read.
  await logSignal(cabana.id, "reply", 1, `${from}${subject ? ` · ${subject}` : ""}: ${excerpt}`);

  // Surface in the Signals tab too, when the cabana has a generated-app project.
  const project = await getProjectByCabana(cabana.id);
  if (project) {
    await insertDocument(project.id, "replies", {
      from,
      subject,
      text: excerpt,
      threadId: message?.threadId ?? message?.thread_id ?? null,
      receivedAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({ ok: true, cabana: cabana.id });
}
