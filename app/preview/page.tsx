"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowRight, CheckCircle, Lock, Loader2, Sparkles, ExternalLink } from "lucide-react";
import { AGENT_ORDER, AGENT_META, AGENT_COLOR, saveSession, type AgentId, type AgentOutputs } from "@/app/lib/cabana-config";
import { AgentCard, LockedMore } from "@/app/components/cabana/AgentCard";

type Stage = "bootup" | "building" | "preview";

// ─── Boot-up ──────────────────────────────────────────────────────────────────

function BootupScreen({ idea, onDone, onOutputs }: {
  idea: string;
  onDone: () => void;
  onOutputs: (o: AgentOutputs) => void;
}) {
  const [statuses, setStatuses] = useState<Record<string, "queued" | "working" | "done">>({});
  const [displayLines, setDisplayLines] = useState<Record<string, string>>({});
  const [stats, setStats] = useState<Record<string, { label: string; value: string }[]>>({});
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function run() {
      const res = await fetch("/api/cabana/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea }),
      });
      if (!res.body) return;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.agent && event.type === "start") {
              setStatuses(s => ({ ...s, [event.agent]: "working" }));
            }
            if (event.agent && event.type === "progress") {
              setStatuses(s => ({ ...s, [event.agent]: "working" }));
              setDisplayLines(d => ({ ...d, [event.agent]: event.text }));
            }
            if (event.agent && event.type === "done") {
              setStatuses(s => ({ ...s, [event.agent]: "done" }));
              if (event.stats) setStats(st => ({ ...st, [event.agent]: event.stats }));
            }
            if (event.type === "complete") {
              onOutputs(event.outputs);
              setTimeout(onDone, 800);
            }
          } catch { /* skip */ }
        }
      }
    }

    run().catch(console.error);
  }, []);

  const allDone = AGENT_ORDER.every(id => statuses[id] === "done");

  return (
    <div className="min-h-screen bg-white flex flex-col items-center px-4 py-16">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-black/[0.04] text-black/60 text-xs font-medium px-3 py-1.5 rounded-full mb-5">
            <Loader2 size={12} className={allDone ? "" : "animate-spin"} style={{ color: "var(--brand)" }} />
            {allDone ? "Crew is ready" : "Putting your crew to work…"}
          </div>
          <h1 className="text-3xl font-bold tracking-[-0.03em]">Your Cabana crew is online.</h1>
          <p className="text-sm text-black/40 mt-2 italic">"{idea}"</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {AGENT_ORDER.map(id => {
            const status = statuses[id] ?? "queued";
            const m = AGENT_META[id];
            const color = AGENT_COLOR[id];
            const agentStats = stats[id] ?? [];
            return (
              <div
                key={id}
                className={`flex flex-col rounded-3xl border p-5 transition-all duration-500 ${
                  status === "queued" ? "border-black/5 bg-white opacity-40" : "border-black/10 bg-white"
                }`}
              >
                {/* Title */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm" style={{ backgroundColor: `${color}1a` }}>
                      {m.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm leading-tight">{m.name}</p>
                      <p className="text-xs text-black/40 leading-tight">{m.role}</p>
                    </div>
                  </div>
                  <span
                    className="text-xs px-2.5 py-0.5 rounded-full font-medium whitespace-nowrap"
                    style={
                      status === "done"    ? { backgroundColor: "#0cf5741a", color: "#0a9e4e" } :
                      status === "working" ? { backgroundColor: `${color}1a`, color } :
                      { backgroundColor: "rgba(0,0,0,0.04)", color: "rgba(0,0,0,0.4)" }
                    }
                  >
                    {status === "done" ? "Done" : status === "working" ? "Working…" : "Queued"}
                  </span>
                </div>

                {/* Streaming text area */}
                <div className="flex-1 bg-black/[0.02] rounded-2xl p-3 min-h-[120px] mb-3 overflow-hidden">
                  <p className="text-xs text-black/60 font-mono leading-relaxed whitespace-pre-wrap break-words">
                    {status === "queued" ? "Waiting for upstream agents…" : displayLines[id]}
                    {status === "working" && <span className="animate-pulse">▋</span>}
                  </p>
                </div>

                {/* Stats footer */}
                <div className="flex items-center gap-4 min-h-[28px]">
                  {agentStats.map(st => (
                    <div key={st.label} className="flex flex-col">
                      <span className="text-sm font-bold leading-none" style={{ color }}>{st.value}</span>
                      <span className="text-[10px] text-black/40 uppercase tracking-wide mt-1">{st.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Revenue projection ───────────────────────────────────────────────────────

function RevenueProjection({ outputs }: { outputs: AgentOutputs }) {
  const priceStr = outputs.strategist?.price ?? "$29 one-time";
  const price = parseInt(priceStr.replace(/[^0-9]/g, ""), 10) || 29;
  const goalStr = outputs.strategist?.goal ?? "3 paid orders";
  const goalNum = parseInt(goalStr.replace(/[^0-9]/g, ""), 10) || 3;

  const scenarios = [
    { label: "Conservative", sales: goalNum,      days: 14 },
    { label: "Target",       sales: goalNum * 3,  days: 30 },
    { label: "Strong",       sales: goalNum * 10, days: 90 },
  ];

  return (
    <div className="bg-white border border-black/10 rounded-3xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">Revenue Projection</h3>
        <span className="text-xs text-black/40">at {priceStr.split(" ")[0]} per sale</span>
      </div>

      <div className="bg-black rounded-2xl p-5 mb-5 flex items-center justify-between text-white">
        <div>
          <p className="text-xs text-white/50 font-medium mb-0.5">Monthly revenue potential</p>
          <p className="text-4xl font-bold tracking-tight" style={{ color: "var(--brand)" }}>${(price * 40).toLocaleString()}</p>
          <p className="text-xs text-white/40 mt-1">at 10 sales/week · crew running in {outputs.strategist?.channel ?? "your channel"}</p>
        </div>
        <div className="text-right text-xs text-white/60 bg-white/10 px-3 py-2 rounded-xl">
          <p className="font-semibold">{priceStr.split(" ")[0]}</p>
          <p className="text-white/40">per sale</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {scenarios.map((sc, i) => (
          <div key={sc.label} className="bg-black/[0.03] border border-black/5 rounded-2xl p-3 text-center">
            <p className="text-xl font-bold" style={i === 2 ? { color: "var(--brand)" } : undefined}>${(sc.sales * price).toLocaleString()}</p>
            <p className="text-xs text-black/40 mt-0.5">{sc.sales} sales</p>
            <p className="text-xs text-black/40">{sc.label}</p>
            <p className="text-xs text-black/30">~{sc.days}d</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {[
          { label: "First sale target",    value: goalStr,                note: "Sprint goal" },
          { label: "Revenue per sale",     value: priceStr.split(" ")[0], note: "No fulfilment cost" },
          { label: "Break-even",           value: "3 sales",              note: "Crew handles outreach" },
          { label: "Annual run rate",      value: `$${(price * 40 * 12).toLocaleString()}`, note: "Repeatable channel" },
        ].map(r => (
          <div key={r.label} className="flex items-center justify-between text-sm py-1.5 border-b border-black/5 last:border-0">
            <span className="text-black/50">{r.label}</span>
            <div className="text-right">
              <span className="font-semibold">{r.value}</span>
              <span className="text-xs text-black/40 ml-2">{r.note}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-black/30 mt-4">Crew handles execution. Results depend on market fit.</p>
    </div>
  );
}

// ─── Preview ──────────────────────────────────────────────────────────────────

type BuildPhase = "idle" | "writing" | "rendering" | "deploying" | "done" | "error";

function BuilderCard({ outputs }: { outputs: AgentOutputs }) {
  const [phase, setPhase] = useState<BuildPhase>("idle");
  const [code, setCode] = useState("");
  const [html, setHtml] = useState<string | null>(null);
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("");
  const started = useRef(false);
  const codeRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (started.current || !outputs.builder || !outputs.strategist) return;
    started.current = true;
    setPhase("writing");
    setStatusText("Builder writing the page…");

    async function runDeploy() {
      const res = await fetch("/api/cabana/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outputs }),
      });
      if (!res.body) { setPhase("error"); return; }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "phase") { setStatusText(event.text); if (event.phase === "deploying") setPhase("deploying"); }
            if (event.type === "code") {
              setPhase("writing");
              setCode(c => c + event.delta);
              requestAnimationFrame(() => codeRef.current?.scrollTo({ top: codeRef.current.scrollHeight }));
            }
            if (event.type === "html") { setHtml(event.html); setPhase("rendering"); }
            if (event.type === "complete") {
              if (event.html) setHtml(event.html);
              setDeployUrl(event.url ?? null);
              setPhase("done");
            }
            if (event.type === "error") setPhase("error");
          } catch { /* skip */ }
        }
      }
    }

    runDeploy().catch(() => setPhase("error"));
  }, []);

  const writing = phase === "writing";
  const showSite = html && (phase === "rendering" || phase === "deploying" || phase === "done");

  return (
    <AgentCard agentId="builder">
      {/* Status line */}
      <div className="flex items-center gap-2 text-xs text-black/50 mb-3 font-mono">
        {(writing || phase === "deploying" || phase === "rendering") && <Loader2 size={12} className="animate-spin shrink-0" style={{ color: AGENT_COLOR.builder }} />}
        {phase === "done" && <CheckCircle size={12} className="shrink-0" style={{ color: AGENT_COLOR.builder }} />}
        <span>{statusText || "Builder writing the page…"}</span>
      </div>

      {/* Code writing — visible while writing, collapses once the site renders */}
      {(writing || (!showSite && code)) && (
        <pre
          ref={codeRef}
          className="bg-[#0d1117] text-[#8ddb9c] rounded-2xl p-4 text-[11px] leading-relaxed font-mono overflow-auto max-h-[260px] whitespace-pre-wrap break-words"
        >
          {code}
          {writing && <span className="animate-pulse">▋</span>}
        </pre>
      )}

      {/* The website appears — real generated HTML rendered in an iframe */}
      {showSite && (
        <div className="rounded-2xl border border-black/10 overflow-hidden">
          <div className="flex items-center gap-1.5 px-3 py-2 bg-black/[0.03] border-b border-black/10">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
            <span className="ml-2 text-[11px] text-black/40 font-mono truncate">
              {deployUrl ?? "preview"}
            </span>
          </div>
          <iframe
            title="Your generated site"
            srcDoc={html!}
            className="w-full h-[420px] bg-white"
            sandbox="allow-scripts"
          />
        </div>
      )}

      {/* Live link */}
      {phase === "done" && deployUrl && (
        <a
          href={deployUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-2 mt-3 rounded-full px-4 py-3 text-sm text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--brand)" }}
        >
          <span className="font-semibold">Your page is live — open it</span>
          <ExternalLink size={14} className="shrink-0" />
        </a>
      )}
      {phase === "done" && !deployUrl && (
        <p className="text-xs text-black/40 mt-3">Live preview ready. Publishing to a URL unlocks after launch.</p>
      )}

      {phase === "error" && (
        <p className="text-xs text-red-500 bg-red-50 rounded-2xl px-4 py-3 border border-red-100">Builder hit an error — check server logs.</p>
      )}
    </AgentCard>
  );
}

function PreviewScreen({ idea, outputs, onLaunch }: {
  idea: string;
  outputs: AgentOutputs;
  onLaunch: () => void;
}) {
  const s = outputs.strategist;
  const scout = outputs.scout;
  const builder = outputs.builder;
  const seller = outputs.seller;
  const creator = outputs.creator;
  const analyst = outputs.analyst;

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="bg-white border-b border-black/10 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <span className="font-bold text-sm">Cabana</span>
          <button onClick={onLaunch} className="bg-black hover:bg-black/80 text-white text-sm font-semibold px-5 py-2.5 rounded-full flex items-center gap-2 transition-colors">
            Launch this Cabana <ArrowRight size={14} />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 pb-24">
        {/* Summary */}
        <div className="bg-white border border-black/10 rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle size={16} style={{ color: "var(--brand)" }} />
            <span className="text-sm font-semibold">Your Cabana found a path to first revenue.</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              { label: "Business", value: s?.businessName ?? "—" },
              { label: "Offer",    value: s?.offer ?? "—" },
              { label: "Channel",  value: s?.channel ?? "—" },
              { label: "Goal",     value: s?.goal ?? "—" },
            ].map(r => (
              <div key={r.label}>
                <p className="text-black/40 text-xs mb-1">{r.label}</p>
                <p className="font-semibold">{r.value}</p>
              </div>
            ))}
          </div>
        </div>

        <AgentCard agentId="scout">
          <p className="text-xs font-medium text-black/40 mb-2">Pain clusters found</p>
          {(scout?.pains ?? []).map((p, i) => (
            <div key={i} className="flex items-start gap-2 mb-1.5">
              <span className="mt-0.5 shrink-0" style={{ color: "var(--brand)" }}>•</span>
              <span className="text-sm">{p}</span>
            </div>
          ))}
          <p className="text-xs font-medium text-black/40 mt-3 mb-2">Top channels</p>
          <div className="flex flex-wrap gap-2">
            {(scout?.channels ?? []).map(c => (
              <span key={c} className="bg-black/[0.04] text-black/70 text-xs px-2.5 py-1 rounded-full">{c}</span>
            ))}
          </div>
        </AgentCard>

        <AgentCard agentId="strategist">
          <div className="space-y-3 text-sm">
            <div className="bg-black/[0.03] rounded-xl p-3">
              <p className="text-xs font-medium mb-1" style={{ color: AGENT_COLOR.strategist }}>Recommended offer</p>
              <p className="font-semibold">{s?.offer ?? "—"}</p>
              <p className="text-black/40 text-xs mt-1">{s?.price}</p>
            </div>
            {s?.icp && <div><p className="text-xs text-black/40 mb-1">Target customer</p><p>{s.icp}</p></div>}
            {s?.firstPriority && <div><p className="text-xs text-black/40 mb-1">First priority</p><p>{s.firstPriority}</p></div>}
          </div>
        </AgentCard>

        <BuilderCard outputs={outputs} />

        <AgentCard agentId="seller">
          <p className="text-xs text-black/40 mb-3">3 of 10 outreach drafts</p>
          <div className="space-y-2">
            {(seller?.messages ?? []).map((msg, i) => (
              <div key={i} className="bg-black/[0.03] rounded-xl p-3 text-sm text-black/70 border border-black/5">"{msg}"</div>
            ))}
          </div>
          <LockedMore label="7 more messages unlock after launch" />
        </AgentCard>

        <AgentCard agentId="creator">
          <p className="text-xs text-black/40 mb-3">3 of 12 content hooks</p>
          <div className="space-y-2">
            {(creator?.hooks ?? []).map((hook, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-black/30 font-mono text-xs mt-0.5 shrink-0">{i + 1}.</span>
                <span>{hook}</span>
              </div>
            ))}
          </div>
          <LockedMore label="9 more hooks + scripts unlock after launch" />
        </AgentCard>

        <AgentCard agentId="analyst">
          <p className="text-xs text-black/40 mb-2">Recommended first play</p>
          <p className="text-sm font-medium mb-3">{analyst?.recommended_path ?? "—"}</p>
          {analyst?.next_play && (
            <div className="bg-black/[0.03] rounded-xl p-3 text-sm border border-black/5">
              <span className="font-medium" style={{ color: AGENT_COLOR.analyst }}>Next 24h: </span>
              <span className="text-black/70">{analyst.next_play}</span>
            </div>
          )}
        </AgentCard>

        <RevenueProjection outputs={outputs} />

        <div className="bg-black rounded-3xl p-8 text-white text-center">
          <h3 className="text-2xl font-bold mb-2 tracking-tight">Your Cabana is ready to launch.</h3>
          <p className="text-white/50 text-sm mb-6">Unlock the full crew — page, outreach, content, daily plays, and signal tracking.</p>
          <button onClick={onLaunch} className="text-black font-bold px-6 py-3.5 rounded-full transition-opacity hover:opacity-90 w-full sm:w-auto" style={{ backgroundColor: "var(--brand)", color: "#fff" }}>
            Launch this Cabana — $29
          </button>
          <p className="text-white/30 text-xs mt-3">Planning is free. Launching takes a crew.</p>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function PreviewPage() {
  const params = useSearchParams();
  const router = useRouter();
  const idea = decodeURIComponent(params.get("idea") ?? "");
  const [stage, setStage] = useState<Stage>("bootup");
  const [outputs, setOutputs] = useState<AgentOutputs>({});

  if (!idea) {
    router.replace("/");
    return null;
  }

  function handleOutputs(o: AgentOutputs) {
    setOutputs(o);
    saveSession(idea, o);
  }

  async function handleLaunch() {
    // Save to DB (creates Cabana record), then go to upgrade
    try {
      await fetch("/api/cabana", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, outputs }),
      });
    } catch { /* non-blocking */ }
    router.push("/upgrade");
  }

  return (
    <>
      {stage === "bootup" && (
        <BootupScreen
          idea={idea}
          onDone={() => setStage("preview")}
          onOutputs={handleOutputs}
        />
      )}
      {stage === "preview" && (
        <PreviewScreen idea={idea} outputs={outputs} onLaunch={handleLaunch} />
      )}
    </>
  );
}

export default function Page() {
  return (
    <Suspense>
      <PreviewPage />
    </Suspense>
  );
}
