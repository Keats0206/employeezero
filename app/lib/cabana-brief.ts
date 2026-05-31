// The Business Brief — the Chief of Staff's long-term memory of the business.
// DB-backed only. No localStorage.

export type BusinessBrief = {
  content: string;
  updatedAt: number | null;
};

export const EMPTY_BRIEF: BusinessBrief = { content: "", updatedAt: null };

export const BRIEF_TEMPLATE = `## What we're building
_Not defined yet._

## Who it's for
_Not defined yet._

## Offer & pricing
_Not defined yet._

## Positioning & angle
_Not defined yet._

## Constraints & preferences
_Not defined yet._

## What we've learned
_Nothing yet._`;

function briefQs(cabanaId: string | null) {
  return cabanaId ? `?cabana=${cabanaId}` : "";
}

async function loadBriefDB(cabanaId: string | null): Promise<BusinessBrief> {
  try {
    const res = await fetch(`/api/cabana/brief${briefQs(cabanaId)}`);
    if (!res.ok) return EMPTY_BRIEF;
    const data = await res.json();
    return { content: data.content ?? "", updatedAt: data.updatedAt ?? null };
  } catch {
    return EMPTY_BRIEF;
  }
}

async function saveBriefDB(brief: BusinessBrief, cabanaId: string | null): Promise<void> {
  try {
    await fetch(`/api/cabana/brief${briefQs(cabanaId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: brief.content }),
    });
  } catch { /* ignore */ }
}

export async function loadBriefAsync(cabanaId: string | null): Promise<BusinessBrief> {
  return loadBriefDB(cabanaId);
}

export function saveBrief(brief: BusinessBrief, cabanaId: string | null) {
  saveBriefDB(brief, cabanaId);
}

export function briefForPrompt(brief: BusinessBrief): string {
  return brief.content.trim() || "No business brief yet — this is a brand new business.";
}

export type OnboardingData = {
  idea: string;
  why: string[];
  niche: string;
  goal: string;
  days: number;
  name: string;
  vibe: string;
};

export function briefFromOnboarding(d: OnboardingData): string {
  const line = (v: string) => (v.trim() ? v.trim() : "_Not defined yet._");
  return `## What we're building
${line(d.name ? `${d.name} — ${d.idea}` : d.idea)}

## Who it's for
${line(d.niche)}

## Offer & pricing
_Not defined yet._

## Positioning & angle
${d.vibe ? `Brand vibe: ${d.vibe}.` : "_Not defined yet._"}

## Goal & timeline
${d.goal ? `Target ${d.goal}, first sale within ${d.days} days.` : "_Not defined yet._"}

## Founder's why
${d.why.length ? d.why.map((w) => `- ${w}`).join("\n") : "_Not defined yet._"}

## What we've learned
_Nothing yet — just getting started._`;
}
