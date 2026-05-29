// Shared types and constants used across all Cabana pages

export const AGENT_ORDER = ["scout", "strategist", "builder", "seller", "creator", "analyst"] as const;
export type AgentId = typeof AGENT_ORDER[number];
export type AgentStatus = "queued" | "working" | "done";
export type Screen = "landing" | "bootup" | "preview" | "upgrade" | "dashboard";

export type AgentOutputs = {
  scout?: {
    pains: string[]; channels: string[]; competitors: string[]; keywords: string[];
  };
  strategist?: {
    businessName: string; offer: string; price: string; channel: string;
    goal: string; icp: string; firstPriority: string;
  };
  builder?: {
    headline: string; subheadline: string; cta: string; pain_hook: string;
  };
  seller?: { messages: string[] };
  creator?: { hooks: string[]; script_opener: string };
  analyst?: {
    recommended_path: string; next_play: string;
    signals_to_watch: string[]; verdict: string;
  };
};

export const AGENT_META: Record<AgentId, { name: string; role: string; icon: string }> = {
  scout:      { name: "Scout",      role: "Market research", icon: "🔍" },
  strategist: { name: "Strategist", role: "Offer design",    icon: "⚡" },
  builder:    { name: "Builder",    role: "Landing page",    icon: "📄" },
  seller:     { name: "Seller",     role: "Outreach",        icon: "💬" },
  creator:    { name: "Creator",    role: "Content",         icon: "🎬" },
  analyst:    { name: "Analyst",    role: "Revenue path",    icon: "📊" },
};

export const AGENT_PALETTE: Record<AgentId, {
  bg: string; border: string; iconBg: string; iconText: string; badge: string; badgeText: string;
}> = {
  scout:      { bg: "bg-blue-50",    border: "border-blue-200",    iconBg: "bg-blue-100",    iconText: "text-blue-600",    badge: "bg-blue-100",    badgeText: "text-blue-700" },
  strategist: { bg: "bg-violet-50",  border: "border-violet-200",  iconBg: "bg-violet-100",  iconText: "text-violet-600",  badge: "bg-violet-100",  badgeText: "text-violet-700" },
  builder:    { bg: "bg-emerald-50", border: "border-emerald-200", iconBg: "bg-emerald-100", iconText: "text-emerald-600", badge: "bg-emerald-100", badgeText: "text-emerald-700" },
  seller:     { bg: "bg-orange-50",  border: "border-orange-200",  iconBg: "bg-orange-100",  iconText: "text-orange-600",  badge: "bg-orange-100",  badgeText: "text-orange-700" },
  creator:    { bg: "bg-pink-50",    border: "border-pink-200",    iconBg: "bg-pink-100",    iconText: "text-pink-600",    badge: "bg-pink-100",    badgeText: "text-pink-700" },
  analyst:    { bg: "bg-amber-50",   border: "border-amber-200",   iconBg: "bg-amber-100",   iconText: "text-amber-600",   badge: "bg-amber-100",   badgeText: "text-amber-700" },
};

export const EXAMPLES = [
  "A paid community for beginner golfers",
  "A Notion template for real estate agents",
  "A micro-SaaS for wedding planners",
  "A Whop for AI automation tutorials",
  "A digital product for busy dads trying to lose weight",
];

// localStorage helpers
export const STORAGE_KEYS = {
  idea: "cabana_idea",
  outputs: "cabana_outputs",
};

export function saveSession(idea: string, outputs: AgentOutputs) {
  try {
    localStorage.setItem(STORAGE_KEYS.idea, idea);
    localStorage.setItem(STORAGE_KEYS.outputs, JSON.stringify(outputs));
  } catch { /* ignore */ }
}

export function loadSession(): { idea: string; outputs: AgentOutputs } {
  try {
    const idea = localStorage.getItem(STORAGE_KEYS.idea) ?? "";
    const raw = localStorage.getItem(STORAGE_KEYS.outputs);
    const outputs: AgentOutputs = raw ? JSON.parse(raw) : {};
    return { idea, outputs };
  } catch {
    return { idea: "", outputs: {} };
  }
}
