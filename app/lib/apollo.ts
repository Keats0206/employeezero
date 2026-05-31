// Apollo.io — real B2B prospect discovery for the Seller agent.
// Two-step: mixed_people/api_search finds candidates (no emails), then
// people/match reveals an email per person. Keep calls small — each reveal can
// burn a credit. Everything degrades gracefully: a missing key or a failed call
// returns empty so the Seller can fall back to drafting without real contacts.

const APOLLO_BASE = "https://api.apollo.io/api/v1";

function apolloKey(): string | null {
  return process.env.APOLLO_API_KEY ?? null;
}

export type ApolloProspect = {
  id?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  organization?: string;
  domain?: string;
  linkedinUrl?: string;
  email?: string | null;
};

function looksLockedEmail(email: unknown): boolean {
  return typeof email === "string" && /not_unlocked|email_not_unlocked|domain\.com/i.test(email);
}

export async function searchPeople(opts: {
  titles?: string[];
  keywords?: string;
  locations?: string[];
  seniorities?: string[];
  perPage?: number;
}): Promise<ApolloProspect[]> {
  const key = apolloKey();
  if (!key) return [];
  try {
    const res = await fetch(`${APOLLO_BASE}/mixed_people/api_search`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "x-api-key": key },
      body: JSON.stringify({
        person_titles: opts.titles,
        q_keywords: opts.keywords,
        person_locations: opts.locations,
        person_seniorities: opts.seniorities,
        per_page: opts.perPage ?? 10,
        page: 1,
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const people = (data.people ?? []) as any[];
    return people.map((p) => ({
      id: p.id,
      name: p.name ?? [p.first_name, p.last_name].filter(Boolean).join(" "),
      firstName: p.first_name,
      lastName: p.last_name,
      title: p.title,
      organization: p.organization?.name ?? p.organization_name,
      domain: p.organization?.primary_domain ?? p.organization?.website_url,
      linkedinUrl: p.linkedin_url,
      email: looksLockedEmail(p.email) ? null : (p.email ?? null),
    }));
  } catch {
    return [];
  }
}

// Reveal an email for a single candidate. Returns null when Apollo can't match
// or the plan doesn't permit the reveal.
export async function enrichEmail(p: ApolloProspect): Promise<string | null> {
  const key = apolloKey();
  if (!key) return null;
  try {
    const params = new URLSearchParams({ reveal_personal_emails: "true" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: Record<string, any> = {};
    if (p.firstName) body.first_name = p.firstName;
    if (p.lastName) body.last_name = p.lastName;
    if (!p.firstName && !p.lastName && p.name) body.name = p.name;
    if (p.organization) body.organization_name = p.organization;
    if (p.domain) body.domain = p.domain;
    if (p.linkedinUrl) body.linkedin_url = p.linkedinUrl;
    if (p.id) body.id = p.id;

    const res = await fetch(`${APOLLO_BASE}/people/match?${params}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const email = data.person?.email ?? null;
    return looksLockedEmail(email) ? null : email;
  } catch {
    return null;
  }
}

export function apolloEnabled(): boolean {
  return !!apolloKey();
}
