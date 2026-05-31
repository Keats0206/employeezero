import { headers } from "next/headers";
import Stripe from "stripe";
import { upsertSubscription, addCredits } from "@/app/lib/db/subscription-queries";

export const runtime = "nodejs";

const isDev = process.env.NODE_ENV !== "production";

function getStripe() {
  const key = isDev ? process.env.STRIPE_SECRET_KEY_TEST! : process.env.STRIPE_SECRET_KEY!;
  return new Stripe(key);
}

function getWebhookSecret() {
  return isDev ? process.env.STRIPE_WEBHOOK_SECRET_TEST! : process.env.STRIPE_WEBHOOK_SECRET!;
}

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const sig = headersList.get("stripe-signature");

  if (!sig) return Response.json({ error: "No signature" }, { status: 400 });

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, getWebhookSecret());
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (!userId) break;

      if (session.mode === "subscription") {
        // Subscription started — status will arrive via subscription.updated,
        // but capture the customer/subscription IDs immediately
        await upsertSubscription({
          userId,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
          status: "trialing",
          plan: (session.metadata?.plan as "starter" | "pro") ?? "starter",
        });
      } else if (session.mode === "payment") {
        // Credits top-up
        const credits = Number(session.metadata?.credits ?? 0);
        if (credits > 0) await addCredits(userId, credits);
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.userId;
      if (!userId) break;

      await upsertSubscription({
        userId,
        stripeCustomerId: sub.customer as string,
        stripeSubscriptionId: sub.id,
        status: sub.status as "trialing" | "active" | "canceled" | "past_due" | "unpaid",
        plan: (sub.metadata?.plan as "starter" | "pro") ?? "starter",
        currentPeriodEnd: new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000),
        trialEndsAt: (sub as unknown as { trial_end?: number | null }).trial_end
          ? new Date(((sub as unknown as { trial_end: number }).trial_end) * 1000)
          : undefined,
      });
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.userId;
      if (!userId) break;

      await upsertSubscription({
        userId,
        stripeCustomerId: sub.customer as string,
        stripeSubscriptionId: sub.id,
        status: "canceled",
      });
      break;
    }
  }

  return Response.json({ received: true });
}
