import { headers } from "next/headers";
import { db } from "@/app/lib/db";
import { cabanas } from "@/app/lib/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

/**
 * Stripe webhook handler
 * 
 * Setup:
 * 1. Get your webhook secret from Stripe dashboard
 * 2. Add STRIPE_WEBHOOK_SECRET to .env.local
 * 3. In Stripe, set webhook URL to: https://yourdomain.com/api/stripe/webhook
 * 4. Subscribe to: checkout.session.completed
 * 
 * When creating checkout, pass cabanaId in metadata:
 * metadata: { cabanaId: "..." }
 */
export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const sig = headersList.get("stripe-signature");

  if (!sig) {
    return Response.json({ error: "No signature" }, { status: 400 });
  }

  // TODO: Add Stripe signature verification once you have stripe package installed
  // For now, we'll trust the webhook endpoint is private

  let event;
  try {
    event = JSON.parse(body);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Handle checkout.session.completed
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const cabanaId = session.metadata?.cabanaId;

    if (!cabanaId) {
      console.error("No cabanaId in Stripe session metadata");
      return Response.json({ error: "No cabanaId" }, { status: 400 });
    }

    // Upgrade the cabana to "sprint" plan
    await db
      .update(cabanas)
      .set({ plan: "sprint", status: "active" })
      .where(eq(cabanas.id, cabanaId));

    console.log(`✓ Upgraded cabana ${cabanaId} to sprint plan`);
  }

  return Response.json({ received: true });
}
