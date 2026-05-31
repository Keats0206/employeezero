import { NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth-helpers";
import { upsertAttribution } from "@/app/lib/db/attribution-queries";

export const runtime = "nodejs";

// POST /api/user/attribution — commit the ad/referral attribution captured
// anonymously during onboarding, now that the visitor has signed in.
export async function POST(req: Request) {
  let userId: string;
  try {
    ({ userId } = await requireAuth());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: {
    referralCode?: string | null;
    utmSource?: string | null;
    utmMedium?: string | null;
    utmCampaign?: string | null;
    landingPath?: string | null;
  } = await req.json().catch(() => ({}));

  const row = await upsertAttribution(userId, body);
  return NextResponse.json({ attribution: row });
}
