"use client";

import { useState, useRef, useEffect } from "react";
import { Streamdown } from "streamdown";
import { Users, Globe, Activity, BookText, Inbox, Pencil, Check, Hammer, Loader2, ExternalLink, RotateCw, SquareStack, List } from "lucide-react";
import { BRIEF_TEMPLATE, type BusinessBrief } from "@/app/lib/cabana-brief";
import type { BuildState } from "@/app/lib/cabana-build";
import { AGENT_META, AGENT_COLOR, AGENT_ORDER, BUILD_MODELS, type AgentId } from "@/app/lib/cabana-config";

const SURF = "#23b5d3";

export type AgentActivity = {
  status: "idle" | "working" | "done";
  task?: string;
  output?: unknown;
};
export type CrewStatus = Record<AgentId, AgentActivity>;

// One entry per agent tool call, in order — so re-running an agent appends to
// the history instead of overwriting it.
export type CrewRun = {
  id: string;
  agent: AgentId;
  task?: string;
  status: "working" | "done";
  output?: unknown;
  streamingText?: string;
};

export type DeskTab = "actions" | "crew" | "page" | "signals" | "brief";

// The Desk — the right half of /chat. The founder's operating surface that
// fills in as the Chief of Staff runs the crew.
//   Home      — top-level view: sprint goal, progress, urgent actions
//   Page      — the live landing page (hero artifact)
//   Signals   — traction / proof of life
//   Artifacts — everything the crew has produced
//   Brief     — the CoS's long-term memory of the business (editable)
// A persistent action/approval strip lives at the bottom. Mostly empty for now;
// the CoS data flow gets wired in next.

export function Desk({
  brief,
  onBriefChange,
  crew,
  runs,
  tab,
  onTabChange,
  build,
  onBuild,
  buildModel,
  onBuildModelChange,
  onQuickAction,
}: {
  brief: BusinessBrief;
  onBriefChange: (content: string) => void;
  crew: CrewStatus;
  runs: CrewRun[];
  tab: DeskTab;
  onTabChange: (t: DeskTab) => void;
  build: BuildState;
  onBuild: (chosenHeadline?: string) => void;
  buildModel: string;
  onBuildModelChange: (model: string) => void;
  onQuickAction: (prompt: string) => void;
}) {
  const setTab = onTabChange;
  const workingCount = AGENT_ORDER.filter((id) => crew[id]?.status === "working").length;

  // The Website tab only earns a slot once the Builder has been used — either a
  // build is underway/done, or the Builder agent has produced a page suggestion.
  const showWebsite = build.status !== "idle" || !!crew.builder?.output;
  // Guard against a stale "page" selection when the Website tab isn't shown.
  const activeTab = tab === "page" && !showWebsite ? "actions" : tab;

  return (
    <div className="flex flex-col h-full bg-black/[0.02]">
      {/* Tabs */}
      <div className="flex items-center gap-0.5 px-3 pt-3 border-b border-black/10">
        <TabButton id="actions" active={activeTab === "actions"} onClick={setTab} icon={<Inbox size={14} />} label="Actions" />
        <TabButton id="crew" active={activeTab === "crew"} onClick={setTab} icon={<Users size={14} />} label="Crew" badge={workingCount || undefined} />
        {showWebsite && (
          <TabButton id="page" active={activeTab === "page"} onClick={setTab} icon={<Globe size={14} />} label="Website" />
        )}
        <TabButton id="signals" active={activeTab === "signals"} onClick={setTab} icon={<Activity size={14} />} label="Signals" />
        <TabButton id="brief" active={activeTab === "brief"} onClick={setTab} icon={<BookText size={14} />} label="Brief" />
      </div>

      {/* Active view */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "actions" && <ActionsPanel crew={crew} build={build} onQuickAction={onQuickAction} />}
        {activeTab === "crew" && <CrewPanel runs={runs} />}
        {activeTab === "page" && <PagePanel crew={crew} build={build} onBuild={onBuild} buildModel={buildModel} onBuildModelChange={onBuildModelChange} />}
        {activeTab === "signals" && <SignalsPanel projectId={build.projectId} />}
        {activeTab === "brief" && <BriefPanel brief={brief} onChange={onBriefChange} />}
      </div>
    </div>
  );
}

function TabButton({
  id,
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  id: DeskTab;
  active: boolean;
  onClick: (id: DeskTab) => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg border-b-2 -mb-px transition-colors ${
        active ? "text-black border-black" : "text-black/40 border-transparent hover:text-black/70"
      }`}
    >
      {icon}
      {label}
      {badge != null && (
        <span className="ml-0.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[10px] text-white tabular-nums" style={{ background: SURF }}>
          {badge}
        </span>
      )}
    </button>
  );
}

function EmptyPanel({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) {
  return (
    <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-center">
      <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: `${SURF}14`, color: SURF }}>
        {icon}
      </div>
      <p className="mt-3 text-sm font-medium text-black/70">{title}</p>
      <p className="mt-1 text-xs text-black/35 max-w-[260px]">{hint}</p>
    </div>
  );
}

// ─── Actions — approvals + next steps ────────────────────────────────────────
// The founder's default surface: what needs their attention (CoS approval queue)
// and what to do next (high-leverage moves the crew has surfaced). One place for
// "what now?" — replaces the old gamified Home panel.
function ActionsPanel({
  crew,
  build,
  onQuickAction,
}: {
  crew: CrewStatus;
  build: BuildState;
  onQuickAction: (prompt: string) => void;
}) {
  const [actions, setActions] = useState<Action[]>([]);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch("/api/cabana/actions");
        if (!res.ok) return;
        const json = await res.json();
        if (active) setActions(json.actions ?? []);
      } catch {
        /* ignore */
      }
    }
    load();
    const t = setInterval(load, 10000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, []);

  const pending = actions.filter((a) => a.status === "proposed" || a.status === "needs_approval");

  async function updateStatus(id: string, status: string) {
    try {
      await fetch("/api/cabana/actions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      setActions((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    } catch {
      /* ignore */
    }
  }

  // Next steps the crew has surfaced — highest-leverage moves, tappable to send
  // straight to the Chief of Staff.
  const strat = crew.strategist?.output as { firstPriority?: string } | undefined;
  const analyst = crew.analyst?.output as { next_play?: string; signals_to_watch?: string[] } | undefined;
  const nextSteps: { emoji: string; label: string; prompt: string }[] = [];
  if (analyst?.next_play) nextSteps.push({ emoji: "⏱️", label: analyst.next_play, prompt: analyst.next_play });
  if (strat?.firstPriority) nextSteps.push({ emoji: "🎯", label: strat.firstPriority, prompt: strat.firstPriority });
  if (build.url) nextSteps.push({ emoji: "📣", label: "Share your live page to land first leads", prompt: "Give me a plan to share my landing page and get my first leads." });

  // Starter prompts when there's nothing yet — keeps a fresh project moving.
  const starters = [
    { emoji: "🧭", label: "What's my next move?", prompt: "What should I focus on next to get my first sale?" },
    { emoji: "🔍", label: "Find my customers", prompt: "Help me figure out where my customers hang out and the best way to reach them." },
    { emoji: "🎯", label: "Sharpen my offer", prompt: "Let's refine my offer and pricing so it converts." },
    { emoji: "✍️", label: "Write outreach", prompt: "Draft outreach messages I can send to land my first customers." },
  ];
  const steps = nextSteps.length > 0 ? nextSteps : starters;

  return (
    <div className="space-y-5">
      {/* Approvals */}
      <section>
        <div className="flex items-center gap-2 mb-2.5">
          <Inbox size={13} className="text-black/40" />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-black/50">Needs approval</span>
          {pending.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full text-white tabular-nums" style={{ background: SURF }}>
              {pending.length}
            </span>
          )}
        </div>

        {pending.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/10 px-4 py-6 text-center">
            <p className="text-sm text-black/50">Nothing waiting on you.</p>
            <p className="mt-0.5 text-xs text-black/35">Approvals and decisions from the crew land here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pending.map((action) => (
              <div key={action.id} className="rounded-2xl border border-black/10 bg-white px-4 py-3">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-black/80">{action.title}</p>
                    {action.why && <p className="text-xs text-black/50 mt-0.5">{action.why}</p>}
                  </div>
                  <span
                    className="shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{
                      background: action.risk === "high" ? "#fef2f2" : action.risk === "medium" ? "#fffbeb" : "#f0fdf4",
                      color: action.risk === "high" ? "#991b1b" : action.risk === "medium" ? "#92400e" : "#166534",
                    }}
                  >
                    {action.risk}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateStatus(action.id, "approved")}
                    className="text-xs px-3 py-1.5 rounded-full font-medium text-white"
                    style={{ background: SURF }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => updateStatus(action.id, "canceled")}
                    className="text-xs px-3 py-1.5 rounded-full font-medium border border-black/10 hover:border-black/25 transition-colors"
                  >
                    Reject
                  </button>
                  {action.details && (
                    <button
                      onClick={() => alert(action.details)}
                      className="ml-auto text-[11px] text-black/40 hover:text-black/60"
                    >
                      Details →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Next steps */}
      <section>
        <div className="flex items-center gap-2 mb-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-black/50">
            {nextSteps.length > 0 ? "Recommended next" : "Get started"}
          </span>
        </div>
        <div className="space-y-2">
          {steps.map((s) => (
            <button
              key={s.label}
              onClick={() => onQuickAction(s.prompt)}
              className="w-full flex items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 text-left hover:border-black/30 transition-colors"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base" style={{ background: `${SURF}1a` }}>
                {s.emoji}
              </span>
              <span className="flex-1 text-sm font-medium text-black/80">{s.label}</span>
              <span className="shrink-0 text-black/25">→</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── Crew — filter by agent, show all runs for that agent ────────────────────
function CrewPanel({ runs }: { runs: CrewRun[] }) {
  // Find which agents have actually run
  const agentsWithRuns = AGENT_ORDER.filter(id => runs.some(r => r.agent === id));
  
  // Default to first agent that has runs, or Scout if none
  const [selectedAgent, setSelectedAgent] = useState<AgentId>(agentsWithRuns[0] || "scout");
  const [view, setView] = useState<"card" | "inbox">("card");
  const [cardIndex, setCardIndex] = useState(0);

  // Filter runs for the selected agent, newest first
  const agentRuns = runs.filter(r => r.agent === selectedAgent).reverse();

  // When switching agents, reset to first card
  const prevAgent = useRef(selectedAgent);
  useEffect(() => {
    if (selectedAgent !== prevAgent.current) {
      prevAgent.current = selectedAgent;
      setCardIndex(0);
    }
  }, [selectedAgent]);

  if (runs.length === 0) {
    return (
      <div className="h-full rounded-2xl border border-black/10 bg-white overflow-hidden">
        <EmptyPanel
          icon={<Users size={20} />}
          title="Crew hasn't run yet"
          hint="Give the Chief of Staff an idea. Every time it runs an agent, the work shows up here."
        />
      </div>
    );
  }

  // View toggle
  const toggle = (
    <div className="flex items-center gap-0.5 rounded-full border border-black/10 p-0.5 shrink-0">
      <button
        onClick={() => setView("card")}
        className={`p-1.5 rounded-full transition-colors ${view === "card" ? "bg-black/[0.06] text-black" : "text-black/35 hover:text-black/60"}`}
        title="Card view"
      >
        <SquareStack size={14} />
      </button>
      <button
        onClick={() => setView("inbox")}
        className={`p-1.5 rounded-full transition-colors ${view === "inbox" ? "bg-black/[0.06] text-black" : "text-black/35 hover:text-black/60"}`}
        title="List view"
      >
        <List size={14} />
      </button>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Agent filter pills — always show all 6 agents */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {AGENT_ORDER.map(id => {
          const m = AGENT_META[id];
          const count = runs.filter(r => r.agent === id).length;
          const active = id === selectedAgent;
          const hasRuns = count > 0;
          const working = runs.some(r => r.agent === id && r.status === "working");
          
          return (
            <button
              key={id}
              onClick={() => setSelectedAgent(id)}
              disabled={!hasRuns}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors disabled:opacity-30 ${
                active ? "border-black/40 bg-black/[0.04] text-black" : "border-black/10 text-black/50 hover:text-black/80"
              }`}
            >
              <span>{m.icon}</span>
              <span>{m.name}</span>
              {hasRuns && <span className="text-[10px] opacity-60">({count})</span>}
              {working && <StatusDot status="working" />}
            </button>
          );
        })}
      </div>

      {/* View toggle */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wide text-black/40">
          {agentRuns.length} run{agentRuns.length === 1 ? "" : "s"}
        </span>
        {toggle}
      </div>

      {/* No runs for this agent */}
      {agentRuns.length === 0 && (
        <div className="rounded-2xl border border-black/10 bg-white p-8 text-center">
          <p className="text-sm text-black/40">{AGENT_META[selectedAgent].name} hasn't run yet.</p>
        </div>
      )}

      {/* List view — show all runs */}
      {agentRuns.length > 0 && view === "inbox" && (
        <div className="rounded-2xl border border-black/10 bg-white overflow-hidden divide-y divide-black/5">
          {agentRuns.map((r, i) => (
            <button
              key={r.id}
              onClick={() => { setCardIndex(i); setView("card"); }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-black/[0.02] transition-colors"
            >
              <span className="text-sm text-black/30 font-mono w-6">#{agentRuns.length - i}</span>
              <span className="text-xs text-black/45 truncate flex-1">{r.task || AGENT_META[r.agent].role}</span>
              <StatusDot status={r.status} className="shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Card view — carousel through runs */}
      {agentRuns.length > 0 && view === "card" && (
        <div className="space-y-3">
          {agentRuns.length > 1 && (
            <div className="flex items-center gap-2 justify-center">
              {agentRuns.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCardIndex(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === cardIndex ? "bg-black/60" : "bg-black/15 hover:bg-black/30"
                  }`}
                  title={`Run ${agentRuns.length - i}`}
                />
              ))}
            </div>
          )}
          <RunCard run={agentRuns[cardIndex]} />
        </div>
      )}
    </div>
  );
}

function StatusDot({ status, className = "" }: { status: "idle" | "working" | "done"; className?: string }) {
  const color = status === "working" ? SURF : status === "done" ? "#0cf574" : "#d1d5db";
  return (
    <span className={`w-2.5 h-2.5 rounded-full ${status === "working" ? "animate-pulse" : ""} ${className}`} style={{ background: color }} />
  );
}

function RunCard({ run }: { run: CrewRun }) {
  const m = AGENT_META[run.agent];
  const color = AGENT_COLOR[run.agent];
  const working = run.status === "working";

  return (
    <div className={`rounded-2xl border bg-white overflow-hidden transition-colors ${working ? "border-black/25" : "border-black/10"}`}>
      <div className="flex items-start gap-3 px-5 py-4">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0" style={{ background: `${color}1a` }}>
          {m.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-black/85">{m.name}</span>
            <span className="text-xs text-black/35">{m.role}</span>
          </div>
          {run.task && <p className="mt-1 text-sm text-black/55 leading-snug">{run.task}</p>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 pt-1">
          <StatusDot status={run.status} />
          <span className="text-xs text-black/40 capitalize">{working ? "working…" : "done"}</span>
        </div>
      </div>
      {working && !run.output && !run.streamingText && (
        <div className="px-5 pb-4 text-sm text-black/35">Thinking…</div>
      )}
      {run.streamingText && (
        <div className="px-5 py-4 border-t border-black/5 bg-black/[0.02]">
          <p className="text-sm text-black/75 leading-relaxed">{run.streamingText}<span className="animate-pulse">▋</span></p>
        </div>
      )}
      {run.output != null && !run.streamingText && (
        <div className="px-5 py-4 border-t border-black/5 bg-black/[0.02]">
          <RunOutput output={run.output} />
        </div>
      )}
    </div>
  );
}

function RunOutput({ output }: { output: unknown }) {
  if (typeof output === "string") return <p className="text-sm text-black/75 leading-relaxed">{output}</p>;
  if (output && typeof output === "object") {
    return (
      <dl className="space-y-3">
        {Object.entries(output as Record<string, unknown>).map(([k, v]) => (
          <div key={k}>
            <dt className="text-[11px] uppercase tracking-wide text-black/40 mb-1">{k.replace(/_/g, " ")}</dt>
            <dd className="text-sm text-black/80 leading-relaxed">
              {Array.isArray(v) ? (
                <ul className="list-disc pl-4 space-y-1">
                  {v.map((x, i) => (
                    <li key={i}>{typeof x === "object" ? JSON.stringify(x) : String(x)}</li>
                  ))}
                </ul>
              ) : (
                String(v)
              )}
            </dd>
          </div>
        ))}
      </dl>
    );
  }
  return null;
}

// Terminal log stream — shows real-time stdout/stderr from the sandbox build.
function BuildTerminal({ logs, currentCmd, html }: {
  logs: { stream: "stdout" | "stderr"; text: string }[];
  currentCmd?: string;
  html?: string; // fall back to code stream if no logs yet
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  if (!logs.length && html) {
    return <CodeStream code={html} />;
  }

  return (
    <div className="flex-1 bg-[#0d1117] overflow-y-auto p-4 font-mono text-[11px] leading-relaxed min-h-[120px]">
      {currentCmd && (
        <div className="flex items-center gap-2 mb-2 text-[#58a6ff]">
          <span className="text-[#3fb950]">$</span>
          <span>{currentCmd}</span>
          <span className="animate-pulse">▋</span>
        </div>
      )}
      {logs.map((l, i) => (
        <div key={i} className={l.stream === "stderr" ? "text-[#f85149]" : "text-[#8ddb9c]"}>
          {l.text}
        </div>
      ))}
      {!logs.length && (
        <div className="text-[#484f58]">Waiting for build output…</div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}

// The Builder wraps its output in a markdown ```html fence; strip it so both
// the live code view and the final iframe preview get clean HTML.
function stripFence(code?: string): string {
  return (code ?? "")
    .replace(/^\s*```(?:html)?\s*\n?/, "")
    .replace(/\n?```\s*$/, "");
}

// Streams the Builder's raw HTML as code text while the page is being written,
// auto-scrolling to follow the latest output.
function CodeStream({ code }: { code: string }) {
  const ref = useRef<HTMLPreElement>(null);

  const clean = stripFence(code);

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [clean]);

  return (
    <pre
      ref={ref}
      className="flex-1 w-full min-h-[420px] overflow-auto bg-[#0b0e14] px-4 py-3 text-[11px] leading-relaxed text-emerald-200/90 font-mono whitespace-pre-wrap break-words"
    >
      <code>{clean}</code>
    </pre>
  );
}

// Compact model picker for build requests. Lets the founder swap which model
// the Builder runs before kicking off (or rebuilding) a page.
function ModelPicker({ value, onChange }: { value: string; onChange: (m: string) => void }) {
  // Show just the model name (drop the "provider/" prefix) to keep it compact.
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-[11px] rounded-full border border-black/15 px-2.5 py-1 bg-white hover:border-black/40 focus:outline-none focus:border-black/40 transition-colors cursor-pointer"
      title="Model the Builder uses for this build"
    >
      {BUILD_MODELS.map((m) => (
        <option key={m} value={m}>
          {m.includes("/") ? m.split("/")[1] : m}
        </option>
      ))}
    </select>
  );
}

function PagePanel({
  crew,
  build,
  onBuild,
  buildModel,
  onBuildModelChange,
}: {
  crew: CrewStatus;
  build: BuildState;
  onBuild: (h?: string) => void;
  buildModel: string;
  onBuildModelChange: (m: string) => void;
}) {
  // Building — show terminal logs + live iframe once the sandbox is up.
  if (build.status === "building") {
    const hasLivePreview = !!build.previewUrl;
    return (
      <div className="h-full rounded-2xl border border-black/10 bg-white overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-black/10 shrink-0">
          <Loader2 size={14} className="animate-spin shrink-0" style={{ color: SURF }} />
          <span className="text-sm font-medium text-black/80 truncate">{build.phase || "Builder is working…"}</span>
          {hasLivePreview && (
            <a href={build.previewUrl!} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs text-black/50 hover:text-black/80 shrink-0">
              <ExternalLink size={12} /> Open
            </a>
          )}
        </div>

        {/* Live app iframe — appears once Vite dev server is up */}
        {hasLivePreview && (
          <iframe
            src={build.previewUrl!}
            title="Live preview"
            className="w-full border-b border-black/10"
            style={{ height: "340px" }}
          />
        )}

        {/* Terminal log stream */}
        <BuildTerminal logs={build.logs ?? []} currentCmd={build.currentCmd} html={!hasLivePreview ? build.html : undefined} />
      </div>
    );
  }
  if (build.status === "done" || (build.status === "error" && build.html)) {
    return (
      <div className="h-full rounded-2xl border border-black/10 bg-white overflow-hidden flex flex-col">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-black/10">
          <Globe size={14} style={{ color: SURF }} />
          <span className="text-sm font-medium text-black/80">Landing page</span>
          {build.url ? (
            <a href={build.url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs text-black/50 hover:text-black/80">
              <ExternalLink size={12} /> Open live
            </a>
          ) : (
            <span className="ml-auto text-[11px] text-black/30">Preview (not deployed)</span>
          )}
          <div className="ml-3 flex items-center gap-2">
            <ModelPicker value={buildModel} onChange={onBuildModelChange} />
            <button onClick={() => onBuild()} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-black/15 hover:border-black/40 transition-colors">
              <RotateCw size={12} /> Rebuild
            </button>
          </div>
        </div>
        {build.error && <div className="px-4 py-2 text-[11px] text-amber-700 bg-amber-50 border-b border-amber-100">{build.error}</div>}
        {build.previewUrl ? (
          <iframe src={build.previewUrl} title="Landing page preview" className="flex-1 w-full min-h-[420px] bg-white" />
        ) : (
          <iframe srcDoc={stripFence(build.html!)} title="Landing page preview" className="flex-1 w-full min-h-[420px] bg-white" sandbox="allow-scripts" />
        )}
      </div>
    );
  }
  if (build.status === "error") {
    return (
      <div className="h-full rounded-2xl border border-black/10 bg-white">
        <EmptyPanel icon={<Globe size={20} />} title="Build failed" hint={build.error || "Something went wrong. Try building again."} />
        <div className="px-4 pb-4 text-center">
          <button onClick={() => onBuild()} className="text-xs px-3 py-1.5 rounded-full border border-black/15 hover:border-black/40 transition-colors">Try again</button>
        </div>
      </div>
    );
  }

  // Idle — show the build-ready card if the Builder has proposed a page.
  const suggestion = crew.builder?.output as
    | { concept?: string; angle?: string; sections?: string[]; headline_options?: string[] }
    | undefined;

  if (suggestion?.concept || suggestion?.headline_options?.length) {
    return (
      <BuildReady
        suggestion={suggestion}
        hasStrategy={!!crew.strategist?.output}
        onBuild={onBuild}
        buildModel={buildModel}
        onBuildModelChange={onBuildModelChange}
      />
    );
  }

  return (
    <div className="h-full rounded-2xl border border-black/10 bg-white overflow-hidden">
      <EmptyPanel
        icon={<Globe size={20} />}
        title="No landing page yet"
        hint="Ask the Chief of Staff for a landing page. The Builder proposes the concept, you approve, then build it here — nothing deploys without your go."
      />
    </div>
  );
}

function BuildReady({
  suggestion,
  hasStrategy,
  onBuild,
  buildModel,
  onBuildModelChange,
}: {
  suggestion: { concept?: string; angle?: string; sections?: string[]; headline_options?: string[] };
  hasStrategy: boolean;
  onBuild: (h?: string) => void;
  buildModel: string;
  onBuildModelChange: (m: string) => void;
}) {
  const options = suggestion.headline_options ?? [];
  const [chosen, setChosen] = useState<string>(options[0] ?? "");

  return (
    <div className="rounded-2xl border border-black/10 bg-white">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-black/10">
        <Hammer size={14} style={{ color: SURF }} />
        <span className="text-sm font-medium text-black/80">Ready to build</span>
        <div className="ml-auto">
          <ModelPicker value={buildModel} onChange={onBuildModelChange} />
        </div>
      </div>
      <div className="p-4 space-y-4">
        {suggestion.concept && <p className="text-sm text-black/70">{suggestion.concept}</p>}
        {suggestion.angle && (
          <p className="text-xs text-black/45"><span className="font-medium text-black/60">Angle:</span> {suggestion.angle}</p>
        )}

        {options.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wide text-black/40 mb-2">Pick a headline</p>
            <div className="space-y-1.5">
              {options.map((h) => (
                <button
                  key={h}
                  onClick={() => setChosen(h)}
                  className={`block w-full text-left text-sm px-3 py-2 rounded-xl border transition-colors ${
                    chosen === h ? "border-black/40 bg-black/[0.03]" : "border-black/10 hover:border-black/25"
                  }`}
                >
                  {chosen === h && <Check size={12} className="inline mr-1.5" style={{ color: SURF }} />}
                  {h}
                </button>
              ))}
            </div>
          </div>
        )}

        {suggestion.sections && suggestion.sections.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wide text-black/40 mb-1.5">Sections</p>
            <p className="text-xs text-black/55">{suggestion.sections.join(" · ")}</p>
          </div>
        )}

        <button
          onClick={() => onBuild(chosen || undefined)}
          disabled={!hasStrategy}
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-full text-white text-sm font-medium disabled:opacity-40 transition-opacity"
          style={{ background: "#000" }}
        >
          <Hammer size={14} /> Build the site
        </button>
        {!hasStrategy && <p className="text-[11px] text-black/35 text-center">Run the strategist first so the page has an offer to sell.</p>}
      </div>
    </div>
  );
}

type AppDoc = { id: string; collection: string; data: Record<string, unknown>; created_at: string };

function SignalsPanel({ projectId }: { projectId?: string }) {
  const [docs, setDocs] = useState<AppDoc[]>([]);
  const [counts, setCounts] = useState<{ collection: string; count: number }[]>([]);

  // Poll the project's captured documents while the Signals tab is open, so new
  // leads from the live page show up without a manual refresh.
  useEffect(() => {
    if (!projectId) return;
    let active = true;
    async function pull() {
      try {
        const res = await fetch(`/api/cabana/app-data/${projectId}`);
        if (!res.ok) return;
        const json = await res.json();
        if (!active) return;
        setDocs(json.documents ?? []);
        setCounts(json.counts ?? []);
      } catch {
        /* ignore */
      }
    }
    pull();
    const t = setInterval(pull, 5000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [projectId]);

  if (!projectId) {
    return (
      <div className="rounded-2xl border border-black/10 bg-white">
        <EmptyPanel
          icon={<Activity size={20} />}
          title="No data yet"
          hint="Build the landing page first. Once it's live, every form submission flows into Cabana's database and shows up here in real time."
        />
      </div>
    );
  }

  const total = counts.reduce((n, c) => n + c.count, 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        <div className="rounded-xl border border-black/10 bg-white px-3 py-3">
          <p className="text-[10px] uppercase tracking-wide text-black/30">Captured</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums" style={{ color: SURF }}>{total}</p>
        </div>
        {counts.slice(0, 3).map((c) => (
          <div key={c.collection} className="rounded-xl border border-black/10 bg-white px-3 py-3">
            <p className="text-[10px] uppercase tracking-wide text-black/30 truncate">{c.collection}</p>
            <p className="mt-1 text-2xl font-semibold text-black/70 tabular-nums">{c.count}</p>
          </div>
        ))}
        {counts.length === 0 && [0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-black/10 bg-white px-3 py-3">
            <p className="text-[10px] uppercase tracking-wide text-black/30">—</p>
            <p className="mt-1 text-2xl font-semibold text-black/15 tabular-nums">0</p>
          </div>
        ))}
      </div>

      {docs.length === 0 ? (
        <div className="rounded-2xl border border-black/10 bg-white">
          <EmptyPanel
            icon={<Activity size={20} />}
            title="Listening for submissions…"
            hint="Share the live page. Every form submission lands here — the Analyst watches these to call the next play."
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-black/10 bg-white divide-y divide-black/5">
          {docs.map((d) => (
            <div key={d.id} className="px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-wide text-black/30">{d.collection}</span>
                <span className="text-[10px] text-black/30">{new Date(d.created_at).toLocaleString()}</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-black/80">
                {Object.entries(d.data).map(([k, v]) => (
                  <span key={k}>
                    <span className="text-black/40">{k}:</span> {String(v)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}



// ─── Brief — the CoS's long-term memory ──────────────────────────────────────
function BriefPanel({ brief, onChange }: { brief: BusinessBrief; onChange: (content: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const hasContent = brief.content.trim().length > 0;

  function startEdit() {
    setDraft(brief.content || BRIEF_TEMPLATE);
    setEditing(true);
  }
  function save() {
    onChange(draft);
    setEditing(false);
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-black/10">
        <BookText size={14} style={{ color: SURF }} />
        <span className="text-sm font-medium text-black/80">Business brief</span>
        <span className="text-[11px] text-black/30">
          {brief.updatedAt ? `Updated ${new Date(brief.updatedAt).toLocaleString()}` : "The CoS's memory"}
        </span>
        <button
          onClick={editing ? save : startEdit}
          className="ml-auto inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-black/15 hover:border-black/40 transition-colors"
        >
          {editing ? <><Check size={12} /> Save</> : <><Pencil size={12} /> Edit</>}
        </button>
      </div>
      <div className="p-4">
        {editing ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={18}
            className="w-full resize-none text-xs font-mono leading-relaxed bg-black/[0.02] rounded-xl p-3 outline-none focus:bg-black/[0.04]"
          />
        ) : hasContent ? (
          <div className="prose prose-sm max-w-none text-black/80">
            <Streamdown>{brief.content}</Streamdown>
          </div>
        ) : (
          <EmptyPanel
            icon={<BookText size={20} />}
            title="No brief yet"
            hint="As you talk, the Chief of Staff writes down what the business is and what it learns. You can edit it anytime."
          />
        )}
      </div>
    </div>
  );
}

type Action = {
  id: string;
  title: string;
  status: string;
  risk: string;
  details: string;
  why: string;
  channel?: string;
  type?: string;
  agent?: string;
};
