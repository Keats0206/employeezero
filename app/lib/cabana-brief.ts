// The Business Brief — the Chief of Staff's long-term memory of the business.
// Distinct from chat scrollback: chat is short-term, the brief is what survives
// across sessions. The CoS reads it before every turn and revises it as it
// learns (same read-revise-write pattern as agent memory). Prototype persists
// to localStorage; this is the seam where a DB-backed brief gets wired later.

export type BusinessBrief = {
  content: string; // living markdown document
  updatedAt: number | null;
};

const STORAGE_KEY = "cabana_business_brief";

export const EMPTY_BRIEF: BusinessBrief = { content: "", updatedAt: null };

// Seed structure shown to the founder (and the CoS) before anything is known.
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

export function loadBrief(): BusinessBrief {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_BRIEF;
    return JSON.parse(raw) as BusinessBrief;
  } catch {
    return EMPTY_BRIEF;
  }
}

export function saveBrief(brief: BusinessBrief) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(brief));
  } catch {
    /* ignore */
  }
}

export function briefForPrompt(brief: BusinessBrief): string {
  return brief.content.trim() || "No business brief yet — this is a brand new business.";
}

// Compose a starting brief from the onboarding answers. This is what the
// emotional onboarding flow produces — the CoS's first memory of the business.
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
