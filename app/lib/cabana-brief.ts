// The Business Brief — the Chief of Staff's long-term memory of the business.
// DB-backed with localStorage fallback for unauthenticated / demo use.

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

// ─── localStorage fallback (unauthenticated / demo) ──────────────────────

function loadBriefLocal(): BusinessBrief {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_BRIEF;
    return JSON.parse(raw) as BusinessBrief;
  } catch {
    return EMPTY_BRIEF;
  }
}

function saveBriefLocal(brief: BusinessBrief) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(brief));
  } catch {
    /* ignore */
  }
}

// ─── DB-backed persistence ────────────────────────────────────────────────

async function loadBriefDB(): Promise<BusinessBrief> {
  try {
    const res = await fetch("/api/cabana/brief");
    if (!res.ok) return EMPTY_BRIEF;
    const data = await res.json();
    return {
      content: data.content ?? "",
      updatedAt: data.updatedAt ?? null,
    };
  } catch {
    return EMPTY_BRIEF;
  }
}

async function saveBriefDB(brief: BusinessBrief): Promise<void> {
  try {
    await fetch("/api/cabana/brief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: brief.content }),
    });
  } catch {
    /* ignore — localStorage fallback still works */
  }
}

// ─── Public API (same interface as before) ────────────────────────────────

export function loadBrief(): BusinessBrief {
  // Sync load — returns localStorage immediately. DB load happens in
  // loadBriefAsync below for the chat page's useEffect hydration.
  return loadBriefLocal();
}

export async function loadBriefAsync(): Promise<BusinessBrief> {
  const dbBrief = await loadBriefDB();
  if (dbBrief.content) {
    // Sync to localStorage so legacy reads still work
    saveBriefLocal(dbBrief);
    return dbBrief;
  }
  return loadBriefLocal();
}

export function saveBrief(brief: BusinessBrief) {
  // Sync save to localStorage for immediate reads
  saveBriefLocal(brief);
  // Async save to DB — fire-and-forget
  saveBriefDB(brief);
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
