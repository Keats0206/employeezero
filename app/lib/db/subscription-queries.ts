import { db } from "./index";
import { userSubscriptions } from "./schema";
import { eq } from "drizzle-orm";

export type SubscriptionStatus = "none" | "trialing" | "active" | "canceled" | "past_due" | "unpaid";

export async function getSubscription(userId: string) {
  const [row] = await db
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.user_id, userId))
    .limit(1);
  return row ?? null;
}

export function isSubscriptionActive(sub: Awaited<ReturnType<typeof getSubscription>>): boolean {
  if (!sub) return false;
  if (sub.status === "active") return true;
  if (sub.status === "trialing" && sub.trial_ends_at && new Date(sub.trial_ends_at) > new Date()) return true;
  return false;
}

export async function upsertSubscription(opts: {
  userId: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  status: SubscriptionStatus;
  plan?: "starter" | "pro";
  currentPeriodEnd?: Date;
  trialEndsAt?: Date;
}) {
  const existing = await getSubscription(opts.userId);
  if (existing) {
    const [updated] = await db
      .update(userSubscriptions)
      .set({
        stripe_customer_id: opts.stripeCustomerId ?? existing.stripe_customer_id,
        stripe_subscription_id: opts.stripeSubscriptionId ?? existing.stripe_subscription_id,
        status: opts.status,
        plan: opts.plan ?? existing.plan,
        current_period_end: opts.currentPeriodEnd ?? existing.current_period_end,
        trial_ends_at: opts.trialEndsAt ?? existing.trial_ends_at,
        updated_at: new Date(),
      })
      .where(eq(userSubscriptions.id, existing.id))
      .returning();
    return updated;
  }
  const [created] = await db
    .insert(userSubscriptions)
    .values({
      user_id: opts.userId,
      stripe_customer_id: opts.stripeCustomerId ?? null,
      stripe_subscription_id: opts.stripeSubscriptionId ?? null,
      status: opts.status,
      plan: opts.plan ?? "starter",
      current_period_end: opts.currentPeriodEnd ?? null,
      trial_ends_at: opts.trialEndsAt ?? null,
    })
    .returning();
  return created;
}

export async function addCredits(userId: string, amount: number) {
  const existing = await getSubscription(userId);
  const current = existing?.credits_remaining ?? 0;
  if (existing) {
    await db
      .update(userSubscriptions)
      .set({ credits_remaining: current + amount, updated_at: new Date() })
      .where(eq(userSubscriptions.id, existing.id));
  } else {
    await db
      .insert(userSubscriptions)
      .values({ user_id: userId, status: "none", credits_remaining: amount });
  }
}
