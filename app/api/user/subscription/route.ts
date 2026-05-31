import { NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth-helpers";
import { getSubscription, isSubscriptionActive } from "@/app/lib/db/subscription-queries";

export const runtime = "nodejs";

export async function GET() {
  let userId: string;
  try {
    ({ userId } = await requireAuth());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sub = await getSubscription(userId);
  const active = isSubscriptionActive(sub);

  return NextResponse.json({
    status: sub?.status ?? "none",
    plan: sub?.plan ?? null,
    active,
    trialEndsAt: sub?.trial_ends_at ?? null,
    currentPeriodEnd: sub?.current_period_end ?? null,
    creditsRemaining: sub?.credits_remaining ?? 0,
  });
}
