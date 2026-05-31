// AgentMail — a Cabana-managed sending inbox per business. Outreach goes out from
// here, and inbound replies hit our webhook (see app/api/agentmail/webhook) so a
// reply becomes a real signal the Analyst can read. One inbox per cabana keeps
// replies attributable. Everything is best-effort: a missing key throws only at
// call time, and callers handle failure.

import { AgentMailClient } from "agentmail";

let client: AgentMailClient | null = null;

export function getAgentMail(): AgentMailClient {
  if (!client) {
    const apiKey = process.env.AGENTMAIL_API_KEY;
    if (!apiKey) throw new Error("AGENTMAIL_API_KEY is not set");
    client = new AgentMailClient({ apiKey });
  }
  return client;
}

export function agentMailEnabled(): boolean {
  return !!process.env.AGENTMAIL_API_KEY;
}

// A stable, valid inbox username derived from the cabana id. AgentMail usernames
// allow [a-z0-9.-]; the cabana id is a uuid, so strip to hex + dashes.
function inboxUsername(cabanaId: string): string {
  const slug = cabanaId.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 24);
  return `cabana-${slug || "outreach"}`;
}

export type CabanaInbox = { inboxId: string; email: string };

// Create (or reuse) the cabana's outreach inbox. client_id makes create
// idempotent, so repeated calls return the same inbox instead of erroring.
export async function getOrCreateInbox(cabanaId: string, displayName?: string): Promise<CabanaInbox> {
  const am = getAgentMail();
  const username = inboxUsername(cabanaId);
  try {
    const inbox = (await am.inboxes.create({
      username,
      displayName: displayName ?? "Cabana Outreach",
      clientId: cabanaId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)) as any;
    const inboxId = inbox.inboxId ?? inbox.inbox_id ?? inbox.email;
    const email = inbox.email ?? inboxId;
    return { inboxId, email };
  } catch {
    // Likely already exists — fall back to the deterministic address.
    const fallback = `${username}@agentmail.to`;
    return { inboxId: fallback, email: fallback };
  }
}

export type SendResult = { messageId?: string; threadId?: string; ok: boolean };

export async function sendEmail(
  inboxId: string,
  opts: { to: string; subject: string; text: string; html?: string },
): Promise<SendResult> {
  const am = getAgentMail();
  try {
    const res = (await am.inboxes.messages.send(inboxId, {
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)) as any;
    return {
      messageId: res?.messageId ?? res?.message_id,
      threadId: res?.threadId ?? res?.thread_id,
      ok: true,
    };
  } catch {
    return { ok: false };
  }
}
