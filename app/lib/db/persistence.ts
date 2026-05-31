import { db } from "./index";
import {
  businessBriefs,
  chatThreads,
  pageVersions,
  actions,
} from "./schema";
import { eq, desc, and, isNull } from "drizzle-orm";

// ─── Business Brief ──────────────────────────────────────────────────────

export async function getActiveBrief(userId: string, cabanaId?: string | null) {
  const [row] = await db
    .select()
    .from(businessBriefs)
    .where(
      cabanaId
        ? and(eq(businessBriefs.user_id, userId), eq(businessBriefs.cabana_id, cabanaId))
        : and(eq(businessBriefs.user_id, userId), isNull(businessBriefs.cabana_id))
    )
    .orderBy(desc(businessBriefs.updated_at))
    .limit(1);
  return row ?? null;
}

export async function upsertBrief(userId: string, content: string, cabanaId?: string | null) {
  const existing = await getActiveBrief(userId, cabanaId);
  if (existing) {
    const [updated] = await db
      .update(businessBriefs)
      .set({ content, version: existing.version + 1, updated_at: new Date() })
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

export async function getOrCreateThread(userId: string, cabanaId?: string | null) {
  const [existing] = await db
    .select()
    .from(chatThreads)
    .where(
      cabanaId
        ? and(eq(chatThreads.user_id, userId), eq(chatThreads.cabana_id, cabanaId))
        : and(eq(chatThreads.user_id, userId), isNull(chatThreads.cabana_id))
    )
    .orderBy(desc(chatThreads.updated_at))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(chatThreads)
    .values({ user_id: userId, cabana_id: cabanaId ?? null, title: "Chief of Staff" })
    .returning();
  return created;
}

export async function getThreadMessages(userId: string, cabanaId?: string | null): Promise<string> {
  const thread = await getOrCreateThread(userId, cabanaId);
  return thread.messages_json;
}

export async function saveThreadMessages(userId: string, messagesJson: string, cabanaId?: string | null) {
  const thread = await getOrCreateThread(userId, cabanaId);
  await db
    .update(chatThreads)
    .set({ messages_json: messagesJson, updated_at: new Date() })
    .where(eq(chatThreads.id, thread.id));
}

export async function clearThread(userId: string, cabanaId?: string | null) {
  const thread = await getOrCreateThread(userId, cabanaId);
  await db
    .update(chatThreads)
    .set({ messages_json: "[]", updated_at: new Date() })
    .where(eq(chatThreads.id, thread.id));
}

// ─── Page Versions ───────────────────────────────────────────────────────

export async function getLatestPageVersion(userId: string, cabanaId?: string | null) {
  const [row] = await db
    .select()
    .from(pageVersions)
    .where(
      cabanaId
        ? and(eq(pageVersions.user_id, userId), eq(pageVersions.cabana_id, cabanaId))
        : and(eq(pageVersions.user_id, userId), isNull(pageVersions.cabana_id))
    )
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
  const latest = await getLatestPageVersion(opts.userId, opts.cabanaId);
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
  tool?: string;
  inputJson?: string;
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
      tool: opts.tool ?? null,
      input_json: opts.inputJson ?? "{}",
      cycle: opts.cycle ?? 0,
      work_order_json: opts.workOrderJson ?? null,
      cabana_id: opts.cabanaId ?? null,
    })
    .returning();
  return row;
}

export async function getAction(actionId: string) {
  const [row] = await db.select().from(actions).where(eq(actions.id, actionId)).limit(1);
  return row ?? null;
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
