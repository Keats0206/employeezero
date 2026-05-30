// Persistence queries for Sprint 1 (Make memory real).
// Each function maps to one of the four prototype→DB migrations:
//   businessBriefs, chatThreads, pageVersions, actions.

import { db } from "./index";
import {
  businessBriefs,
  chatThreads,
  pageVersions,
  actions,
} from "./schema";
import { eq, desc, and, isNull } from "drizzle-orm";

// ─── Business Brief ──────────────────────────────────────────────────────

export async function getActiveBrief(userId: string) {
  const [row] = await db
    .select()
    .from(businessBriefs)
    .where(eq(businessBriefs.user_id, userId))
    .orderBy(desc(businessBriefs.updated_at))
    .limit(1);
  return row ?? null;
}

export async function upsertBrief(userId: string, content: string, cabanaId?: string) {
  const existing = await getActiveBrief(userId);
  if (existing) {
    const [updated] = await db
      .update(businessBriefs)
      .set({ content, version: existing.version + 1, updated_at: new Date(), cabana_id: cabanaId ?? existing.cabana_id })
      .where(eq(businessBriefs.id, existing.id))
      .returning();
    return updated;
  }
  const [created] = await db
    .insert(businessBriefs)
    .values({ user_id: userId, content, cabana_id: cabanaId ?? null })
    .returning();
  return created;
}

// ─── Chat Thread ─────────────────────────────────────────────────────────
// Stores the full UIMessage[] array as one JSON blob per thread. This
// preserves message IDs, part ordering, tool-call states, and everything
// the AI SDK's useChat needs on rehydration — a normalized per-message
// table would lose that structure.

export async function getOrCreateThread(userId: string) {
  const [existing] = await db
    .select()
    .from(chatThreads)
    .where(and(eq(chatThreads.user_id, userId), isNull(chatThreads.cabana_id)))
    .orderBy(desc(chatThreads.updated_at))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(chatThreads)
    .values({ user_id: userId, title: "Chief of Staff" })
    .returning();
  return created;
}

export async function getThreadMessages(userId: string): Promise<string> {
  const thread = await getOrCreateThread(userId);
  return thread.messages_json; // raw JSON string — client parses it
}

export async function saveThreadMessages(userId: string, messagesJson: string) {
  const thread = await getOrCreateThread(userId);
  await db
    .update(chatThreads)
    .set({ messages_json: messagesJson, updated_at: new Date() })
    .where(eq(chatThreads.id, thread.id));
}

export async function clearThread(userId: string) {
  const thread = await getOrCreateThread(userId);
  await db
    .update(chatThreads)
    .set({ messages_json: "[]", updated_at: new Date() })
    .where(eq(chatThreads.id, thread.id));
}

// ─── Page Versions ───────────────────────────────────────────────────────

export async function getLatestPageVersion(userId: string) {
  const [row] = await db
    .select()
    .from(pageVersions)
    .where(eq(pageVersions.user_id, userId))
    .orderBy(desc(pageVersions.version))
    .limit(1);
  return row ?? null;
}

export async function insertPageVersion(opts: {
  userId: string;
  html: string;
  deployUrl?: string | null;
  deployError?: string | null;
  deployStatus?: string;
  projectId?: string | null;
  model?: string | null;
  updateInstruction?: string | null;
  cabanaId?: string | null;
}) {
  const latest = await getLatestPageVersion(opts.userId);
  const version = (latest?.version ?? 0) + 1;

  const [row] = await db
    .insert(pageVersions)
    .values({
      user_id: opts.userId,
      html: opts.html,
      deploy_url: opts.deployUrl ?? null,
      deploy_error: opts.deployError ?? null,
      deploy_status: opts.deployStatus ?? "pending",
      project_id: opts.projectId ?? null,
      model: opts.model ?? null,
      version,
      update_instruction: opts.updateInstruction ?? null,
      cabana_id: opts.cabanaId ?? null,
    })
    .returning();
  return row;
}

// ─── Actions ─────────────────────────────────────────────────────────────

export async function getUserActions(userId: string) {
  return db
    .select()
    .from(actions)
    .where(eq(actions.user_id, userId))
    .orderBy(desc(actions.created_at));
}

export async function insertAction(opts: {
  userId: string;
  title: string;
  channel?: string;
  details?: string;
  why?: string;
  status?: string;
  risk?: string;
  type?: string;
  agent?: string;
  cycle?: number;
  workOrderJson?: string;
  cabanaId?: string | null;
}) {
  const [row] = await db
    .insert(actions)
    .values({
      user_id: opts.userId,
      title: opts.title,
      channel: opts.channel ?? "manual",
      details: opts.details ?? "",
      why: opts.why ?? "",
      status: opts.status ?? "proposed",
      risk: opts.risk ?? "low",
      type: opts.type ?? null,
      agent: opts.agent ?? null,
      cycle: opts.cycle ?? 0,
      work_order_json: opts.workOrderJson ?? null,
      cabana_id: opts.cabanaId ?? null,
    })
    .returning();
  return row;
}

export async function updateActionStatus(
  actionId: string,
  status: string,
  patch?: { outputJson?: string; resultUrl?: string; workOrderJson?: string },
) {
  return db
    .update(actions)
    .set({ status, ...patch })
    .where(eq(actions.id, actionId));
}
