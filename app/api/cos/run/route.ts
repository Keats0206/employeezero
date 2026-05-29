import { cosAgent } from "@/app/lib/agents/cos";
import { db } from "@/app/lib/db";
import { cabanas } from "@/app/lib/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const maxDuration = 120;

// Called by Vercel Cron (hourly/daily) or manually from the dashboard.
// Runs the CoS for all active cabanas, or a specific one if cabana_id is passed.

export async function POST(req: Request) {
  let cabana_id: string | null = null;

  try {
    const body = await req.json().catch(() => ({}));
    cabana_id = body.cabana_id ?? null;
  } catch { /* cron calls may send no body */ }

  // Verify cron secret in production
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    // Get target cabanas
    const targets = cabana_id
      ? await db.select().from(cabanas).where(eq(cabanas.id, cabana_id)).limit(1)
      : await db.select().from(cabanas).where(eq(cabanas.status, "active")).limit(20);

    if (targets.length === 0) {
      return Response.json({ ok: true, message: "No active cabanas to run" });
    }

    const results = [];

    for (const cabana of targets) {
      try {
        const result = await cosAgent.generate({
          prompt: `Run the crew for cabana "${cabana.name || cabana.idea}" (id: ${cabana.id}).

Read the current state, decide which agents are most valuable to run right now, run them, and create plays for the user to review. Be decisive — pick the 2-3 highest-leverage actions.`,
        });

        results.push({
          cabana_id: cabana.id,
          name: cabana.name,
          ok: true,
          steps: result.steps?.length ?? 0,
        });
      } catch (err) {
        results.push({
          cabana_id: cabana.id,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return Response.json({ ok: true, ran: results.length, results });

  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

// Cron hits this as GET on Vercel
export async function GET(req: Request) {
  return POST(req);
}
