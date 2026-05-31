import { db } from "./index";
import { userAttribution } from "./schema";
import { eq } from "drizzle-orm";

export type AttributionFields = {
  referralCode?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  landingPath?: string | null;
};

export async function getAttribution(userId: string) {
  const [row] = await db
    .select()
    .from(userAttribution)
    .where(eq(userAttribution.user_id, userId))
    .limit(1);
  return row ?? null;
}

// Upsert, but never overwrite a previously captured non-empty value with null —
// the first touch that brought the user in is the one worth keeping.
export async function upsertAttribution(userId: string, fields: AttributionFields) {
  const existing = await getAttribution(userId);
  const merged = {
    referral_code: fields.referralCode ?? existing?.referral_code ?? null,
    utm_source: fields.utmSource ?? existing?.utm_source ?? null,
    utm_medium: fields.utmMedium ?? existing?.utm_medium ?? null,
    utm_campaign: fields.utmCampaign ?? existing?.utm_campaign ?? null,
    landing_path: fields.landingPath ?? existing?.landing_path ?? null,
  };

  if (existing) {
    const [updated] = await db
      .update(userAttribution)
      .set(merged)
      .where(eq(userAttribution.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(userAttribution)
    .values({ user_id: userId, ...merged })
    .returning();
  return created;
}

// Stripe metadata values must be strings; drop empties so we don't clutter.
export function attributionToStripeMetadata(
  row: Awaited<ReturnType<typeof getAttribution>>,
): Record<string, string> {
  if (!row) return {};
  const out: Record<string, string> = {};
  if (row.referral_code) out.referral_code = row.referral_code;
  if (row.utm_source) out.utm_source = row.utm_source;
  if (row.utm_medium) out.utm_medium = row.utm_medium;
  if (row.utm_campaign) out.utm_campaign = row.utm_campaign;
  return out;
}
