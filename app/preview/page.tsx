"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowRight, CheckCircle, Lock, Loader2, Sparkles, ExternalLink } from "lucide-react";
import { AGENT_ORDER, AGENT_META, AGENT_PALETTE, saveSession, type AgentId, type AgentOutputs } from "@/app/lib/cabana-config";
import { AgentCard, LockedMore } from "@/app/components/cabana/AgentCard";
import { DevNav } from "@/app/components/cabana/DevNav";

type Stage = "bootup" | "preview";

// ─── Boot-up ──────────────────────────────────────────────────────────────────

function BootupScreen({ idea, onDone, onOutputs }: {
  idea: string;
  onDone: () => void;
  onOutputs: (o: AgentOutputs) => void;
}) {
  const [statuses, setStatuses] = useState<Record<string, "queued" | "working" | "done">>({});
  const [displayLines, setDisplayLines] = useState<Record<string, string>>({});
  const typewriterRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const started = useRef(false);

  function typewrite(agentId: string, text: string) {
    if (typewriterRefs.current[agentId]) clearTimeout(typewriterRefs.current[agentId]);
    let i = 0;
    const tick = () => {
      i++;
      setDisplayLines(d => ({ ...d, [agentId]: text.slice(0, i) }));
      if (i < text.length) typewriterRefs.current[agentId] = setTimeout(tick, 18);
    };
    tick();
  }

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
            if (event.agent && event.type === "progress") {
              setStatuses(s => ({ ...s, [event.agent]: "working" }));
              typewrite(event.agent, event.text);
            }
            if (event.agent && event.type === "done") {
              setStatuses(s => ({ ...s, [event.agent]: "done" }));
              setDisplayLines(d => ({ ...d, [event.agent]: "Done ✓" }));
            }
            if (event.type === "complete") {
              onOutputs(event.outputs);
              setTimeout(onDone, 600);
            }
          } catch { /* skip */ }
        }
      }
    }

    run().catch(console.error);
  }, []);

  const allDone = AGENT_ORDER.every(id => statuses[id] === "done");

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-violet-50 text-violet-700 text-xs font-medium px-3 py-1.5 rounded-full mb-5">
            <Loader2 size={12} className={allDone ? "" : "animate-spin"} />
            {allDone ? "Crew is ready" : "Spinning up your First Sale Crew…"}
          </div>
          <h1 className="text-2xl font-bold">Your First Sale Crew is online.</h1>
          <p className="text-sm text-gray-500 mt-2 italic">"{idea}"</p>
        </div>

        <div className="space-y-3">
          {AGENT_ORDER.map(id => {
            const status = statuses[id] ?? "queued";
            const p = AGENT_PALETTE[id];
            const m = AGENT_META[id];
            return (
              <div key={id} className={`flex items-start gap-4 p-4 rounded-xl border transition-all duration-500 ${
                status === "queued" ? "border-gray-100 bg-white opacity-40" : `${p.border} ${p.bg}`
              }`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-base ${p.iconBg} ${p.iconText}`}>
                  {m.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-semibold text-sm">{m.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                      status === "done"    ? "bg-emerald-100 text-emerald-700" :
                      status === "working" ? `${p.badge} ${p.badgeText}` :
                      "bg-gray-100 text-gray-400"
                    }`}>
                      {status === "done" ? "Done" : status === "working" ? "Working…" : "Queued"}
                    </span>
                  </div>
                  {status !== "queued" && (
                    <p className="text-xs text-gray-500 font-mono leading-relaxed min-h-[16px]">
                      {displayLines[id]}
                      {status === "working" && <span className="animate-pulse">▋</span>}
                    </p>
                  )}
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
    { label: "Conservative", sales: goalNum,      days: 14, color: "text-gray-700",    bg: "bg-gray-50",    border: "border-gray-200" },
    { label: "Target",       sales: goalNum * 3,  days: 30, color: "text-violet-700",  bg: "bg-violet-50",  border: "border-violet-200" },
    { label: "Strong",       sales: goalNum * 10, days: 90, color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  ];

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">Revenue Projection</h3>
        <span className="text-xs text-gray-400">at {priceStr.split(" ")[0]} per sale</span>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-emerald-600 font-medium mb-0.5">Monthly revenue potential</p>
          <p className="text-3xl font-bold text-emerald-700">${(price * 40).toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">at 10 sales/week · crew running in {outputs.strategist?.channel ?? "your channel"}</p>
        </div>
        <div className="text-right text-xs text-emerald-600 bg-emerald-100 px-3 py-2 rounded-lg">
          <p className="font-semibold">{priceStr.split(" ")[0]}</p>
          <p className="text-emerald-500">per sale</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {scenarios.map(s => (
          <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl p-3 text-center`}>
            <p className={`text-xl font-bold ${s.color}`}>${(s.sales * price).toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.sales} sales</p>
            <p className="text-xs text-gray-400">{s.label}</p>
            <p className="text-xs text-gray-400">~{s.days}d</p>
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
          <div key={r.label} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
            <span className="text-gray-500">{r.label}</span>
            <div className="text-right">
              <span className="font-semibold">{r.value}</span>
              <span className="text-xs text-gray-400 ml-2">{r.note}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-300 mt-4">Crew handles execution. Results depend on market fit.</p>
    </div>
  );
}

// ─── Preview ──────────────────────────────────────────────────────────────────

type DeployState = "idle" | "building" | "done" | "error";

function BuilderCard({ outputs }: { outputs: AgentOutputs }) {
  const [deployState, setDeployState] = useState<DeployState>("idle");
  const [deployProgress, setDeployProgress] = useState("");
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const started = useRef(false);
  const builder = outputs.builder;

  useEffect(() => {
    if (started.current || !outputs.builder || !outputs.strategist) return;
    started.current = true;
    setDeployState("building");

    async function runDeploy() {
      const res = await fetch("/api/cabana/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outputs }),
      });
      if (!res.body) { setDeployState("error"); return; }

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
            if (event.type === "progress") setDeployProgress(event.text);
            if (event.type === "complete") { setDeployUrl(event.url); setDeployState("done"); }
            if (event.type === "error") setDeployState("error");
          } catch { /* skip */ }
        }
      }
    }

    runDeploy().catch(() => setDeployState("error"));
  }, []);

  return (
    <AgentCard agentId="builder">
      <div className="bg-gray-900 rounded-lg p-4 text-white">
        <p className="text-lg font-bold mb-1">{builder?.headline ?? "—"}</p>
        <p className="text-sm text-gray-400 mb-3">{builder?.subheadline}</p>
        <button className="bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-lg">{builder?.cta ?? "Get started"}</button>
      </div>

      <div className="mt-3">
        {deployState === "building" && (
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
            <Loader2 size={12} className="animate-spin shrink-0" />
            <span className="font-mono">{deployProgress || "Initializing…"}</span>
          </div>
        )}
        {deployState === "done" && deployUrl && (
          <a
            href={deployUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            <div>
              <p className="font-semibold">Your page is live</p>
              <p className="text-xs text-emerald-600 font-mono mt-0.5 truncate max-w-xs">{deployUrl}</p>
            </div>
            <ExternalLink size={14} className="shrink-0" />
          </a>
        )}
        {deployState === "error" && (
          <p className="text-xs text-red-500 bg-red-50 rounded-lg px-4 py-3 border border-red-100">Deploy failed — check server logs.</p>
        )}
        {deployState === "idle" && (
          <div className="relative rounded-lg overflow-hidden">
            <div className="bg-gray-100 p-4 blur-sm select-none text-sm text-gray-400">
              <p>Benefits · How it works · FAQ · Pricing · CTA</p>
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80">
              <Lock size={16} className="text-gray-400 mb-1.5" />
              <p className="text-xs font-medium text-gray-500">Full page unlocks after launch</p>
            </div>
          </div>
        )}
      </div>
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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <span className="font-bold text-sm">Cabana</span>
          <button onClick={onLaunch} className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
            Launch this Cabana <ArrowRight size={14} />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 pb-24">
        {/* Summary */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle size={16} className="text-emerald-500" />
            <span className="text-sm font-semibold text-emerald-700">Your Cabana found a path to first revenue.</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              { label: "Business", value: s?.businessName ?? "—" },
              { label: "Offer",    value: s?.offer ?? "—" },
              { label: "Channel",  value: s?.channel ?? "—" },
              { label: "Goal",     value: s?.goal ?? "—" },
            ].map(r => (
              <div key={r.label}>
                <p className="text-gray-400 text-xs mb-1">{r.label}</p>
                <p className="font-semibold">{r.value}</p>
              </div>
            ))}
          </div>
        </div>

        <AgentCard agentId="scout">
          <p className="text-xs font-medium text-gray-500 mb-2">Pain clusters found</p>
          {(scout?.pains ?? []).map((p, i) => (
            <div key={i} className="flex items-start gap-2 mb-1.5">
              <span className="text-emerald-500 mt-0.5 shrink-0">•</span>
              <span className="text-sm">{p}</span>
            </div>
          ))}
          <p className="text-xs font-medium text-gray-500 mt-3 mb-2">Top channels</p>
          <div className="flex flex-wrap gap-2">
            {(scout?.channels ?? []).map(c => (
              <span key={c} className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full">{c}</span>
            ))}
          </div>
        </AgentCard>

        <AgentCard agentId="strategist">
          <div className="space-y-3 text-sm">
            <div className="bg-violet-50 rounded-lg p-3">
              <p className="text-xs text-violet-500 font-medium mb-1">Recommended offer</p>
              <p className="font-semibold">{s?.offer ?? "—"}</p>
              <p className="text-gray-500 text-xs mt-1">{s?.price}</p>
            </div>
            {s?.icp && <div><p className="text-xs text-gray-400 mb-1">Target customer</p><p>{s.icp}</p></div>}
            {s?.firstPriority && <div><p className="text-xs text-gray-400 mb-1">First priority</p><p>{s.firstPriority}</p></div>}
          </div>
        </AgentCard>

        <BuilderCard outputs={outputs} />

        <AgentCard agentId="seller">
          <p className="text-xs text-gray-400 mb-3">3 of 10 outreach drafts</p>
          <div className="space-y-2">
            {(seller?.messages ?? []).map((msg, i) => (
              <div key={i} className="bg-orange-50 rounded-lg p-3 text-sm text-gray-700 border border-orange-100">"{msg}"</div>
            ))}
          </div>
          <LockedMore label="7 more messages unlock after launch" />
        </AgentCard>

        <AgentCard agentId="creator">
          <p className="text-xs text-gray-400 mb-3">3 of 12 content hooks</p>
          <div className="space-y-2">
            {(creator?.hooks ?? []).map((hook, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-gray-300 font-mono text-xs mt-0.5 shrink-0">{i + 1}.</span>
                <span>{hook}</span>
              </div>
            ))}
          </div>
          <LockedMore label="9 more hooks + scripts unlock after launch" />
        </AgentCard>

        <AgentCard agentId="analyst">
          <p className="text-xs text-gray-400 mb-2">Recommended first play</p>
          <p className="text-sm font-medium mb-3">{analyst?.recommended_path ?? "—"}</p>
          {analyst?.next_play && (
            <div className="bg-amber-50 rounded-lg p-3 text-sm border border-amber-100">
              <span className="font-medium text-amber-700">Next 24h: </span>
              <span className="text-gray-700">{analyst.next_play}</span>
            </div>
          )}
        </AgentCard>

        <RevenueProjection outputs={outputs} />

        <div className="bg-violet-600 rounded-2xl p-6 text-white text-center">
          <h3 className="text-xl font-bold mb-2">Your Cabana is ready to launch.</h3>
          <p className="text-violet-200 text-sm mb-5">Unlock the full crew — page, outreach, content, daily plays, and signal tracking.</p>
          <button onClick={onLaunch} className="bg-white text-violet-600 font-bold px-6 py-3 rounded-xl hover:bg-violet-50 transition-colors w-full sm:w-auto">
            Launch this Cabana — $29
          </button>
          <p className="text-violet-300 text-xs mt-3">Planning is free. Launching takes a crew.</p>
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
      <DevNav />
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
