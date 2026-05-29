// Shared types and constants used across all Cabana pages

export const AGENT_ORDER = ["scout", "strategist", "builder", "seller", "creator", "analyst"] as const;
export type AgentId = typeof AGENT_ORDER[number];
export type AgentStatus = "queued" | "working" | "done";
export type Screen = "landing" | "bootup" | "preview" | "upgrade" | "dashboard";

// ─── Model selection (per agent role) ──────────────────────────────────────────
// One model per agent so we can trade cost vs. reliability per role. The
// schema-strict agents (exact-length arrays) get a sturdier model; the loose
// free-text ones can stay cheap. Gateway provider/model identifiers.
export const AGENT_MODELS: Record<AgentId, string> = {
  scout:      "anthropic/claude-haiku-4-5",
  strategist: "anthropic/claude-haiku-4-5",
  builder:    "anthropic/claude-sonnet-4-6", // only the builder needs the strong model
  seller:     "anthropic/claude-haiku-4-5",
  creator:    "anthropic/claude-haiku-4-5",
  analyst:    "anthropic/claude-haiku-4-5",
};

// Stress-test switch. When set, the chat CoS + every crew tool run on this one
// ultra-cheap model instead of their per-role assignments. Override via the
// CABANA_CHEAP_MODEL env var; default is the cheapest model in MODEL_PRICING.
export const CHEAP_MODEL = process.env.CABANA_CHEAP_MODEL || "anthropic/claude-haiku-4-5";

// USD per 1,000,000 tokens, by gateway model id. Estimates — adjust to match
// your gateway billing. Used only to display run cost in the dev inspector.
export const MODEL_PRICING: Record<string, { in: number; out: number }> = {
  "anthropic/claude-sonnet-4-6": { in: 3, out: 15 },
  "anthropic/claude-haiku-4-5":  { in: 1, out: 5 },
  "deepseek/deepseek-v3.2":      { in: 0.28, out: 0.42 },
  "openai/gpt-5":                { in: 1.25, out: 10 },
};

// Models the founder can pick for a build request, in the Desk's model picker.
// Keyed off MODEL_PRICING so a new gateway model becomes selectable by adding
// it there once.
export const BUILD_MODELS = Object.keys(MODEL_PRICING);

export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const p = MODEL_PRICING[model];
  if (!p) return 0;
  return (inputTokens / 1_000_000) * p.in + (outputTokens / 1_000_000) * p.out;
}

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

// Beach palette — one hex per agent, used as accents on a black/white canvas.
export const AGENT_COLOR: Record<AgentId, string> = {
  scout:      "#23b5d3", // Turquoise Surf
  strategist: "#304c89", // Dusk Blue
  builder:    "#0cf574", // Spring Green
  seller:     "#f5cb5c", // Tuscan Sun
  creator:    "#d8bfaa", // Desert Sand
  analyst:    "#23b5d3", // Turquoise Surf
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
