import { NextResponse } from "next/server";
import Stripe from "stripe";
import { requireAuth } from "@/app/lib/auth-helpers";
import { getSubscription } from "@/app/lib/db/subscription-queries";
import { getAttribution, attributionToStripeMetadata } from "@/app/lib/db/attribution-queries";

export const runtime = "nodejs";

const isDev = process.env.NODE_ENV !== "production";

function getStripe() {
  const key = isDev
    ? process.env.STRIPE_SECRET_KEY_TEST!
    : process.env.STRIPE_SECRET_KEY!;
  return new Stripe(key);
}

function getPriceIds() {
  return isDev
    ? { starter: process.env.STRIPE_STARTER_PRICE_ID_TEST!, pro: process.env.STRIPE_PRO_PRICE_ID_TEST! }
    : { starter: process.env.STRIPE_STARTER_PRICE_ID!, pro: process.env.STRIPE_PRO_PRICE_ID! };
}

export async function POST(req: Request) {
  let userId: string;
  try {
    ({ userId } = await requireAuth());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: { plan?: "starter" | "pro"; credits?: number } = await req.json();
  const origin = new URL(req.url).origin;
  const stripe = getStripe();
  const PRICE_IDS = getPriceIds();
  const CREDITS_PRICE_ID = process.env.STRIPE_CREDITS_PRICE_ID!;

  // ── Credits top-up (one-time payment) ────────────────────────────────────
  if (body.credits) {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: CREDITS_PRICE_ID, quantity: body.credits }],
      metadata: { userId, credits: String(body.credits) },
      success_url: `${origin}/chat?credits=success`,
      cancel_url: `${origin}/upgrade`,
    });
    return NextResponse.json({ url: session.url });
  }

  // ── Subscription (with 7-day trial, card required upfront) ───────────────
  const plan = body.plan ?? "starter";
  const priceId = PRICE_IDS[plan];
  if (!priceId) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  // Reuse existing Stripe customer if available
  const existingSub = await getSubscription(userId);
  const customerParams = existingSub?.stripe_customer_id
    ? { customer: existingSub.stripe_customer_id }
    : { customer_email: userId };

  // Forward ad/referral attribution so paid conversions are attributable.
  const attribution = attributionToStripeMetadata(await getAttribution(userId));

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    ...customerParams,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 7,
      metadata: { userId, plan, ...attribution },
    },
    metadata: { userId, plan, ...attribution },
    success_url: `${origin}/chat?subscribed=success`,
    cancel_url: `${origin}/upgrade`,
  });

  return NextResponse.json({ url: session.url });
}
