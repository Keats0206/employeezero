"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Check, X, Sparkles } from "lucide-react";
import { PageShell } from "../components/Shell";

type CanvasBlock = {
  key: string;
  title: string;
  content: string[];
};

type Source = {
  label: string;
  detail: string;
  href?: string;
  date: string;
};

type Recommendation = {
  agent: string;
  text: string;
  rationale: string;
};

type Assumption = {
  id: string;
  text: string;
  confidence: number;
  previousConfidence?: number;
  synthesis: string;
  sources: Source[];
  recommendation?: Recommendation;
};

function sourceDomain(s: Source) {
  if (!s.href) return "internal";
  try {
    return new URL(s.href).hostname.replace(/^www\./, "");
  } catch {
    return "internal";
  }
}

function renderSynthesis(text: string) {
  const parts = text.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const m = part.match(/^\[(\d+)\]$/);
    if (m) {
      return (
        <a
          key={i}
          href={`#src-${m[1]}`}
          className="ml-0.5 inline-flex h-[15px] min-w-[15px] items-center justify-center rounded-sm bg-zinc-200 px-1 text-[10px] font-semibold text-zinc-700 hover:bg-zinc-900 hover:text-white"
        >
          {m[1]}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

const BLOCKS: CanvasBlock[] = [
  {
    key: "customer_segments",
    title: "Customer Segments",
    content: ["Solo founders shipping first product", "Technical operators running lean teams"],
  },
  {
    key: "problem",
    title: "Problem",
    content: [
      "Founders confuse activity with validation",
      "Execution tools don't force discovery before build",
    ],
  },
  {
    key: "unique_value",
    title: "Unique Value Proposition",
    content: ["An operating system that turns assumptions into evidence-driven decisions"],
  },
  {
    key: "solution",
    title: "Solution",
    content: [
      "Interrupt-driven inbox + mission goals + startup brain canvas",
      "Agents propose, human decides, loop resumes",
    ],
  },
  {
    key: "channels",
    title: "Channels",
    content: [
      "Founder communities (Reddit/X)",
      "Cold outreach to ICP founders",
      "Design partner intros",
    ],
  },
  {
    key: "revenue",
    title: "Revenue Streams",
    content: ["SaaS subscription for founder teams", "Potential premium automation pack"],
  },
  {
    key: "costs",
    title: "Cost Structure",
    content: ["Model inference costs", "Integration + infrastructure", "Founder time for validation interviews"],
  },
  {
    key: "key_metrics",
    title: "Key Metrics",
    content: [
      "Weekly qualified conversations",
      "Interrupt resolution velocity",
      "Assumption confidence delta",
    ],
  },
  {
    key: "unfair_advantage",
    title: "Unfair Advantage",
    content: ["Compounding startup memory tied to decisions and outcomes"],
  },
];

const ASSUMPTIONS: Assumption[] = [
  {
    id: "outreach-icp",
    text: "Cold outreach can generate 5+ ICP calls in 7 days",
    confidence: 48,
    previousConfidence: 61,
    synthesis:
      "Cold outreach is generating signal but not yet hitting the 5-call bar. 33 leads contacted across one Smartlead sequence produced 7 qualified replies and 2 booked calls [1][2] — a 21% reply rate versus 9% on the broader founder list. The lift concentrates almost entirely in a single sub-segment: builders who match the SaaS-dashboard pattern reply at 3.2× the rest [3]. Confidence dropped 13pts as the broader list underperformed projections.",
    sources: [
      {
        label: "Smartlead campaign — Lovable Outbound v4",
        detail: "33 sent · 7 replies · 2 booked",
        href: "https://app.smartlead.ai/campaigns/4821",
        date: "May 24",
      },
      {
        label: "HubSpot CRM — qualified replies",
        detail: "7 contacts tagged qualified-reply this week",
        href: "https://app.hubspot.com/contacts/12345/views/all",
        date: "May 26",
      },
      {
        label: "Lovable showcase scrape",
        detail: "412 builders identified, 37 match SaaS-dashboard pattern",
        date: "May 22",
      },
    ],
    recommendation: {
      agent: "Research Agent",
      text: "Narrow ICP to Lovable users building SaaS dashboards",
      rationale: "Reply rate inside that sub-segment is 3.2× the rest of the list. Narrowing raises projected booked-call rate from 6% → 14%.",
    },
  },
  {
    id: "interrupt-inbox",
    text: "Interrupt inbox is easier than task board workflows",
    confidence: 74,
    previousConfidence: 68,
    synthesis:
      "Strong qualitative and quantitative signal. 5 of 6 design partner interviews in the May cohort explicitly preferred the inbox framing over a task board [1], and pilot telemetry shows median time-to-decision dropped from ~4h to 22min after the switch [2]. Confidence up 6pts on consistent signal across both channels.",
    sources: [
      {
        label: "User interviews — May cohort (Dovetail)",
        detail: "6 interviews, 5 explicit preference for inbox",
        href: "https://dovetailapp.com/projects/ez-interviews",
        date: "May 18",
      },
      {
        label: "Pilot telemetry — Posthog",
        detail: "interrupt_resolved_seconds p50: 1,320s",
        href: "https://posthog.com/project/ez/insights/interrupts",
        date: "May 25",
      },
    ],
  },
  {
    id: "discovery-gating",
    text: "Founders will tolerate structured discovery gating",
    confidence: 62,
    previousConfidence: 55,
    synthesis:
      "Mixed but trending positive. Onboarding funnel shows a 28% drop-off at step 3 versus an 18% industry benchmark [1], and a vocal subset of YC Startup School posters push back on 'too much planning before code' [2]. But qualitative interviews land favorably — 4 of 6 founders described the gates as 'opinionated, not annoying' and converted to validated workflows 2.4× more often.",
    sources: [
      {
        label: "Onboarding funnel — Posthog",
        detail: "Step 3 drop-off 28% (industry benchmark 18%)",
        href: "https://posthog.com/project/ez/funnels/onboarding",
        date: "May 25",
      },
      {
        label: "YC Startup School thread",
        detail: "47 upvotes on 'too much planning before code' critique",
        href: "https://www.startupschool.org/posts/discovery-gating",
        date: "May 12",
      },
    ],
    recommendation: {
      agent: "Design Agent",
      text: "Make discovery gates skippable with a 'gate me later' option",
      rationale: "Would likely recover 60–70% of the step-3 drop-off without weakening signal — gated users still convert to validated workflows 2.4× more.",
    },
  },
  {
    id: "mission-framing",
    text: "Mission-first framing improves founder retention",
    confidence: 57,
    synthesis:
      "Too early to be conclusive. The mission-framed cohort opens the app 4.2×/week versus 2.8× for the task-framed control [1], but with n=24 and p=0.12 the result is not yet statistically significant. Worth holding the experiment another 2 weeks before updating the canvas.",
    sources: [
      {
        label: "Cohort A/B — Mission vs Tasks framing",
        detail: "n=24, p=0.12 (not yet significant)",
        href: "https://posthog.com/project/ez/experiments/mission-framing",
        date: "May 26",
      },
    ],
  },
];

function confidenceStyle(confidence: number) {
  if (confidence >= 70) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (confidence >= 50) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-rose-50 text-rose-700 border-rose-200";
}

function confidenceBar(confidence: number) {
  if (confidence >= 70) return "bg-emerald-500";
  if (confidence >= 50) return "bg-amber-500";
  return "bg-rose-500";
}

export default function CanvasPage() {
  const [expanded, setExpanded] = useState<string | null>("outreach-icp");
  const [decisions, setDecisions] = useState<Record<string, "accepted" | "rejected">>({});

  function decide(id: string, choice: "accepted" | "rejected") {
    setDecisions((d) => ({ ...d, [id]: choice }));
  }

  return (
    <PageShell
      title="Business Model Canvas"
      context="Working strategy model. Each assumption is scored by evidence — agents propose updates, you decide."
    >
      <section className="mb-6 rounded-xl border border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Top Assumptions
          </div>
          <div className="text-[10px] text-zinc-400">
            Confidence weighted by evidence recency · last sync 6m ago
          </div>
        </div>
        <ul className="divide-y divide-zinc-100">
          {ASSUMPTIONS.map((a) => {
            const isOpen = expanded === a.id;
            const decision = decisions[a.id];
            const delta = a.previousConfidence != null ? a.confidence - a.previousConfidence : null;
            return (
              <li key={a.id}>
                <button
                  onClick={() => setExpanded(isOpen ? null : a.id)}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-zinc-50"
                >
                  {isOpen ? (
                    <ChevronDown size={14} className="text-zinc-400" />
                  ) : (
                    <ChevronRight size={14} className="text-zinc-400" />
                  )}
                  <span className="flex-1 text-sm text-zinc-800">{a.text}</span>
                  {a.recommendation && !decision && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                      <Sparkles size={10} /> agent suggestion
                    </span>
                  )}
                  {delta != null && delta !== 0 && (
                    <span className={`text-[10px] font-medium ${delta > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {delta > 0 ? "+" : ""}
                      {delta}
                    </span>
                  )}
                  <span className="w-28">
                    <div className="flex items-center justify-end gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className={`h-full ${confidenceBar(a.confidence)}`}
                          style={{ width: `${a.confidence}%` }}
                        />
                      </div>
                      <span
                        className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${confidenceStyle(a.confidence)}`}
                      >
                        {a.confidence}%
                      </span>
                    </div>
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-zinc-100 bg-zinc-50/60 px-5 py-4">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                      Synthesis
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-800">
                      {renderSynthesis(a.synthesis)}
                    </p>

                    <div className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                      Sources · {a.sources.length}
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {a.sources.map((s, idx) => {
                        const n = idx + 1;
                        const domain = sourceDomain(s);
                        const card = (
                          <div className="h-full rounded-md border border-zinc-200 bg-white p-2.5 hover:border-zinc-400">
                            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                              <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm bg-zinc-100 text-[10px] font-semibold text-zinc-700">
                                {n}
                              </span>
                              <span className="truncate">{domain}</span>
                              <span className="ml-auto shrink-0">{s.date}</span>
                            </div>
                            <div className="mt-1.5 line-clamp-2 text-[13px] font-medium leading-snug text-zinc-900">
                              {s.label}
                            </div>
                            <div className="mt-1 line-clamp-2 text-[11px] leading-snug text-zinc-600">
                              {s.detail}
                            </div>
                          </div>
                        );
                        return (
                          <div key={s.label} id={`src-${n}`}>
                            {s.href ? (
                              <a
                                href={s.href}
                                target="_blank"
                                rel="noreferrer"
                                className="block"
                              >
                                {card}
                              </a>
                            ) : (
                              card
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {a.recommendation && (
                      <div className="mt-5 rounded-lg border border-violet-200 bg-violet-50/70 p-4">
                        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-violet-700">
                          <Sparkles size={11} /> {a.recommendation.agent} recommends
                        </div>
                        <div className="mt-1.5 text-sm font-medium text-zinc-900">
                          {a.recommendation.text}
                        </div>
                        <div className="mt-1 text-xs text-zinc-600">{a.recommendation.rationale}</div>
                        <div className="mt-3 flex items-center gap-2">
                          {decision ? (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                decision === "accepted"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-zinc-200 text-zinc-600"
                              }`}
                            >
                              {decision === "accepted" ? <Check size={11} /> : <X size={11} />}
                              {decision === "accepted" ? "Accepted — applied to canvas" : "Rejected"}
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => decide(a.id, "accepted")}
                                className="inline-flex items-center gap-1 rounded-md bg-zinc-900 px-3 py-1 text-xs text-white hover:bg-zinc-700"
                              >
                                <Check size={12} /> Accept
                              </button>
                              <button
                                onClick={() => decide(a.id, "rejected")}
                                className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-3 py-1 text-xs text-zinc-700 hover:bg-white"
                              >
                                <X size={12} /> Reject
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {BLOCKS.map((block) => (
          <section key={block.key} className="rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
              {block.title}
            </h2>
            <ul className="mt-3 space-y-2">
              {block.content.map((line) => (
                <li key={line} className="text-sm leading-relaxed text-zinc-700">
                  {line}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
