import Stripe from "stripe";
import * as fs from "fs";
import * as path from "path";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function main() {
  console.log("Setting up Stripe products and prices...\n");

  // ── Starter plan ──────────────────────────────────────────────────────────
  const starter = await stripe.products.create({
    name: "Cabana Starter",
    description: "1 active cabana, full crew, daily plays",
  });
  const starterPrice = await stripe.prices.create({
    product: starter.id,
    unit_amount: 2900,
    currency: "usd",
    recurring: { interval: "month" },
    nickname: "Starter Monthly",
  });
  console.log(`✓ Starter product: ${starter.id}`);
  console.log(`✓ Starter price:   ${starterPrice.id}`);

  // ── Pro plan ──────────────────────────────────────────────────────────────
  const pro = await stripe.products.create({
    name: "Cabana Pro",
    description: "Unlimited cabanas, priority runs, multi-business dashboard",
  });
  const proPrice = await stripe.prices.create({
    product: pro.id,
    unit_amount: 7900,
    currency: "usd",
    recurring: { interval: "month" },
    nickname: "Pro Monthly",
  });
  console.log(`✓ Pro product:     ${pro.id}`);
  console.log(`✓ Pro price:       ${proPrice.id}`);

  // ── Credits (one-time, sold per unit) ─────────────────────────────────────
  const credits = await stripe.products.create({
    name: "Cabana Credits",
    description: "Extra agent reruns and on-demand builds",
  });
  const creditsPrice = await stripe.prices.create({
    product: credits.id,
    unit_amount: 100, // $1 per credit
    currency: "usd",
    nickname: "Credit (x1)",
  });
  console.log(`✓ Credits product: ${credits.id}`);
  console.log(`✓ Credits price:   ${creditsPrice.id}`);

  // ── Write env vars ────────────────────────────────────────────────────────
  const envLines = [
    `STRIPE_STARTER_PRICE_ID=${starterPrice.id}`,
    `STRIPE_PRO_PRICE_ID=${proPrice.id}`,
    `STRIPE_CREDITS_PRICE_ID=${creditsPrice.id}`,
  ];

  const envPath = path.join(process.cwd(), ".env.local");
  const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";

  // Remove any old lines for these keys and append fresh ones
  const keys = ["STRIPE_STARTER_PRICE_ID", "STRIPE_PRO_PRICE_ID", "STRIPE_CREDITS_PRICE_ID"];
  const filtered = existing
    .split("\n")
    .filter((l) => !keys.some((k) => l.startsWith(k)))
    .join("\n")
    .trimEnd();

  fs.writeFileSync(envPath, filtered + "\n" + envLines.join("\n") + "\n");

  console.log("\n✓ Written to .env.local:");
  envLines.forEach((l) => console.log(`  ${l}`));
  console.log("\nDone! Now add STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET manually if not already set.");
}

main().catch((e) => { console.error(e); process.exit(1); });
