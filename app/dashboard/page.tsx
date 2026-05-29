"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart2, Lock, ChevronRight, Loader2, Plus
} from "lucide-react";
import {
  AGENT_ORDER, AGENT_META, AGENT_PALETTE, loadSession,
  type AgentId, type AgentOutputs
} from "@/app/lib/cabana-config";

type Play = { id: string; title: string; agent: AgentId; why: string; status: "pending" | "approved" | "rejected"; output?: string };
type FeedItem = { agent: AgentId | "system"; text: string; time: string; fresh?: boolean };
type DashTab = "plays" | "assets" | "outreach" | "content";
type CopiedMap = Record<string, boolean>;
type DashboardSession = { idea: string; outputs: AgentOutputs };

export default function DashboardPage() {
  const [session, setSession] = useState<DashboardSession | null>(null);
  const [checkedSession, setCheckedSession] = useState(false);

  useEffect(() => {
    const loaded = loadSession();
    setSession(loaded.idea ? loaded : null);
    setCheckedSession(true);
  }, []);

  if (!checkedSession) return <DashboardLoading />;
  if (!session) return <EmptyDashboard />;

  return <Dashboard idea={session.idea} outputs={session.outputs} />;
}

function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white border border-gray-100 rounded-2xl px-5 py-4 flex items-center gap-3 text-sm text-gray-500 shadow-sm">
        <Loader2 size={15} className="animate-spin text-violet-600" />
        Loading Cabana...
      </div>
    </div>
  );
}

function EmptyDashboard() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-gray-100 rounded-3xl p-8 text-center shadow-sm">
        <div className="w-11 h-11 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mx-auto mb-4">
          <Plus size={20} />
        </div>
        <h1 className="text-xl font-bold tracking-tight mb-2">No Cabana loaded</h1>
        <p className="text-sm text-gray-500 mb-6">
          Generate a preview first, then launch it to open the sprint dashboard.
        </p>
        <button
          onClick={() => router.push("/")}
          className="w-full bg-gray-900 text-white text-sm font-semibold px-4 py-3 rounded-xl hover:bg-gray-700 transition-colors"
        >
          Start a Cabana
        </button>
      </div>
    </div>
  );
}

function Dashboard({ idea, outputs }: { idea: string; outputs: AgentOutputs }) {
  const router = useRouter();
  const name = outputs.strategist?.businessName ?? idea.split(" ").slice(-2).join(" ");
  const offer = outputs.strategist?.offer ?? "$29 starter plan";
  const channel = outputs.strategist?.channel ?? "Reddit + communities";
  const headline = outputs.builder?.headline ?? "Get results in 7 days";
  const sprintGoal = outputs.strategist?.goal ?? "3 paid orders";

  const [tab, setTab] = useState<DashTab>("plays");
  const [day, setDay] = useState(1);
  const [cosRunning, setCosRunning] = useState(false);
  const [signals, setSignals] = useState({ outreach: 0, replies: 0, pageViews: 0, sales: 0 });
  const [copied, setCopied] = useState<CopiedMap>({});
  const [plays, setPlays] = useState<Play[]>([
    { id: "p1", title: "Publish landing page", agent: "builder", why: "Crew built the page — approve to make it live.", status: "pending", output: headline },
    { id: "p2", title: "Send outreach batch", agent: "seller", why: "Seller drafted 10 messages ready to go in your channel.", status: "pending", output: outputs.seller?.messages?.[0] },
    { id: "p3", title: "Post first content hook", agent: "creator", why: "Creator queued your strongest hook.", status: "pending", output: outputs.creator?.hooks?.[0] },
  ]);
  const [feed, setFeed] = useState<FeedItem[]>([
    { agent: "scout",      text: `Scanned ${outputs.scout?.channels?.join(", ") ?? "Reddit + communities"}. Found 3 pain clusters.`, time: "Day 1" },
    { agent: "strategist", text: `Offer locked: ${offer}.`, time: "Day 1" },
    { agent: "builder",    text: `Landing page drafted. Headline: "${headline}".`, time: "Day 1" },
    { agent: "seller",     text: `10 outreach messages drafted for ${channel}.`, time: "Day 1" },
    { agent: "creator",    text: "12 content hooks generated. 3 scripts ready.", time: "Day 1" },
    { agent: "analyst",    text: outputs.analyst?.next_play ?? "Approve the landing page first, then Seller begins outreach.", time: "Day 1" },
  ]);
  const [analystNote, setAnalystNote] = useState(outputs.analyst?.next_play ?? "Approve the landing page first, then Seller will begin outreach.");

  function addFeed(item: FeedItem) {
    setFeed(f => [{ ...item, fresh: true }, ...f]);
  }

  function approvePlay(id: string) {
    setPlays(ps => ps.map(p => p.id === id ? { ...p, status: "approved" } : p));
    const play = plays.find(p => p.id === id);
    if (!play) return;
    setTimeout(() => addFeed({ agent: play.agent, text: `"${play.title}" approved. Running now…`, time: `Day ${day}`, fresh: true }), 400);
    setTimeout(() => {
      const done: Record<string, string> = {
        p1: `Landing page is live. Seller queuing outreach.`,
        p2: `Outreach batch sent to ${channel}. Tracking replies.`,
        p3: `Content hook posted. Creator drafting next batch.`,
      };
      addFeed({ agent: play.agent, text: done[id] ?? "Play complete.", time: `Day ${day}`, fresh: true });
      const analystNotes: Record<string, string> = {
        p1: "Page is live. Next: approve outreach so Seller can start driving traffic.",
        p2: "Outreach running. Watch for replies in the next 24–48h.",
        p3: "Content is out. If 3+ engagements in 24h, Creator will double down.",
      };
      setTimeout(() => {
        const note = analystNotes[id] ?? "Good. Crew is executing.";
        setAnalystNote(note);
        addFeed({ agent: "analyst", text: note, time: `Day ${day}`, fresh: true });
      }, 1200);
    }, 1800);
  }

  function advanceDay() {
    const next = day + 1;
    setDay(next);
    const newPlays: Play[] = [
      { id: `d${next}-1`, title: "Scout daily research run", agent: "scout", why: "Scout scans for new buyer threads and pain signals.", status: "pending" },
      { id: `d${next}-2`, title: "Send follow-up outreach", agent: "seller", why: "Seller drafted follow-ups for anyone who didn't reply.", status: "pending" },
    ];
    setPlays(ps => [...ps.filter(p => p.status === "approved"), ...newPlays]);
    addFeed({ agent: "analyst", text: `Day ${next} briefing complete. 2 new plays queued.`, time: `Day ${next}`, fresh: true });
    setAnalystNote(`Day ${next}: crew refreshed research and queued follow-up outreach. Approve to keep momentum.`);
  }

  function logSignal(key: keyof typeof signals) {
    setSignals(s => ({ ...s, [key]: s[key] + 1 }));
    if (key === "replies") {
      setTimeout(() => addFeed({ agent: "seller", text: "Reply received — drafting a follow-up.", time: `Day ${day}`, fresh: true }), 300);
    }
    if (key === "sales") {
      setTimeout(() => {
        addFeed({ agent: "analyst", text: `Sale recorded — ${offer}. Crew is doubling down.`, time: `Day ${day}`, fresh: true });
        setAnalystNote("First sale logged. Analyst identifying the next scale play.");
      }, 300);
    }
  }

  function copyText(key: string, text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(c => ({ ...c, [key]: true }));
    setTimeout(() => setCopied(c => ({ ...c, [key]: false })), 2000);
  }

  const pendingCount = plays.filter(p => p.status === "pending").length;
  const totalSignals = Object.values(signals).reduce((a, b) => a + b, 0);

  const TABS: { id: DashTab; label: string; count?: number }[] = [
    { id: "plays",    label: "Plays",   count: pendingCount },
    { id: "assets",   label: "Assets" },
    { id: "outreach", label: "Outreach" },
    { id: "content",  label: "Content" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/")} className="font-bold text-sm hover:text-violet-600 transition-colors">Cabana</button>
            <ChevronRight size={14} className="text-gray-300" />
            <span className="text-sm font-medium">{name}</span>
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Crew working</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                setCosRunning(true);
                try {
                  await fetch("/api/cos/run", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ cabana_id: "demo" }),
                  });
                  addFeed({ agent: "analyst", text: "CoS run complete. New plays queued.", time: `Day ${day}`, fresh: true });
                } catch { /* ignore */ } finally { setCosRunning(false); }
              }}
              disabled={cosRunning}
              className="text-xs border border-violet-200 bg-violet-50 text-violet-700 px-3 py-1.5 rounded-lg hover:bg-violet-100 transition-colors font-medium flex items-center gap-1.5 disabled:opacity-50"
            >
              {cosRunning ? <><Loader2 size={11} className="animate-spin" /> Running…</> : "⚡ Run crew"}
            </button>
            <button onClick={advanceDay} className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors font-medium">
              Day {day + 1} →
            </button>
            <button
              onClick={() => router.push("/")}
              className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center gap-1"
            >
              <Plus size={11} /> New Cabana
            </button>
            <span className="text-xs text-gray-400">Sprint Day {day} of 7</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6 pb-24">
        {/* Main */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tab bar */}
          <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-xl p-1">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-lg transition-colors ${
                  tab === t.id ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {t.label}
                {t.count !== undefined && t.count > 0 && (
                  <span className={`text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold ${tab === t.id ? "bg-white text-gray-900" : "bg-violet-100 text-violet-700"}`}>{t.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Plays */}
          {tab === "plays" && (
            <div className="space-y-3">
              {plays.filter(p => p.status === "pending").length === 0 && (
                <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center">
                  <p className="text-2xl mb-2">✓</p>
                  <p className="font-semibold text-sm">All plays approved</p>
                  <p className="text-xs text-gray-400 mt-1">Crew is executing. Advance to the next day for more plays.</p>
                </div>
              )}
              {plays.map(play => {
                const p = AGENT_PALETTE[play.agent];
                const m = AGENT_META[play.agent];
                if (play.status !== "pending") return (
                  <div key={play.id} className="bg-white border border-gray-100 rounded-xl p-4 opacity-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{m.icon}</span>
                      <span className="text-sm text-gray-500 line-through">{play.title}</span>
                    </div>
                    <span className={`text-xs font-medium ${play.status === "approved" ? "text-emerald-600" : "text-red-400"}`}>
                      {play.status === "approved" ? "Approved" : "Skipped"}
                    </span>
                  </div>
                );
                return (
                  <div key={play.id} className={`bg-white border ${p.border} rounded-2xl p-5`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-7 h-7 rounded-lg ${p.iconBg} flex items-center justify-center text-sm shrink-0`}>{m.icon}</span>
                        <span className="font-semibold text-sm">{play.title}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${p.badge} ${p.badgeText}`}>{m.name}</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3 ml-9">{play.why}</p>
                    {play.output && (
                      <div className={`${p.bg} rounded-lg p-3 mb-3 ml-9 text-xs text-gray-700 italic border ${p.border}`}>"{play.output}"</div>
                    )}
                    <div className="flex gap-2 ml-9">
                      <button onClick={() => approvePlay(play.id)} className="bg-gray-900 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">Approve</button>
                      <button className="border border-gray-200 text-xs px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">Edit</button>
                      <button onClick={() => setPlays(ps => ps.map(p => p.id === play.id ? { ...p, status: "rejected" } : p))}
                        className="border border-gray-200 text-xs px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-gray-400">Skip</button>
                    </div>
                  </div>
                );
              })}

              {/* Feed */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5">
                <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
                  <BarChart2 size={14} className="text-gray-400" /> Live Agent Feed
                </h2>
                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {feed.map((item, i) => {
                    const color = item.agent === "system" ? "text-gray-500" : (AGENT_PALETTE[item.agent as AgentId]?.iconText ?? "text-gray-700");
                    const agentName = item.agent === "system" ? "System" : AGENT_META[item.agent as AgentId]?.name ?? item.agent;
                    return (
                      <div key={i} className="flex gap-3 text-sm">
                        <span className="text-xs text-gray-400 whitespace-nowrap pt-0.5 w-10 shrink-0">{item.time}</span>
                        <div><span className={`font-medium ${color}`}>{agentName}</span><span className="text-gray-500"> — {item.text}</span></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Assets */}
          {tab === "assets" && (
            <div className="space-y-4">
              <div className="bg-white border border-gray-100 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-sm flex items-center gap-2">📄 Landing Page</h3>
                  <div className="flex gap-2">
                    <button onClick={() => copyText("pageUrl", `cabana.app/${name.toLowerCase().replace(/ /g, "-")}`)}
                      className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                      {copied.pageUrl ? "Copied!" : "Copy URL"}
                    </button>
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg font-medium">Live</span>
                  </div>
                </div>
                <div className="bg-gray-900 rounded-xl p-6 text-white">
                  <p className="text-xl font-bold mb-2">{headline}</p>
                  <p className="text-sm text-gray-400 mb-4">{outputs.builder?.subheadline}</p>
                  <button className="bg-emerald-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl">{outputs.builder?.cta ?? "Get started"}</button>
                </div>
                <p className="text-xs text-gray-400 mt-3">cabana.app/{name.toLowerCase().replace(/ /g, "-")}</p>
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl p-5">
                <h3 className="font-semibold text-sm mb-4">⚡ Offer</h3>
                <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
                  <p className="font-bold text-violet-800 mb-1">{offer}</p>
                  <p className="text-sm text-gray-600">{outputs.strategist?.icp}</p>
                </div>
                <button onClick={() => copyText("offer", offer)}
                  className="mt-3 text-xs border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                  {copied.offer ? "Copied!" : "Copy offer"}
                </button>
              </div>
            </div>
          )}

          {/* Outreach */}
          {tab === "outreach" && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm">💬 Outreach Messages</h3>
                <span className="text-xs text-gray-400">{channel}</span>
              </div>
              <div className="space-y-3">
                {(outputs.seller?.messages ?? []).map((msg, i) => (
                  <div key={i} className="border border-orange-100 bg-orange-50 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-gray-700 flex-1">"{msg}"</p>
                      <button onClick={() => copyText(`msg-${i}`, msg)}
                        className="text-xs border border-orange-200 bg-white px-2.5 py-1 rounded-lg shrink-0 font-medium">
                        {copied[`msg-${i}`] ? "✓" : "Copy"}
                      </button>
                    </div>
                    <button onClick={() => logSignal("outreach")} className="text-xs text-orange-600 font-medium mt-2">+ Log as sent</button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-4 flex items-center gap-1"><Lock size={10} /> 7 more messages unlock on next crew run</p>
            </div>
          )}

          {/* Content */}
          {tab === "content" && (
            <div className="space-y-3">
              <div className="bg-white border border-gray-100 rounded-2xl p-5">
                <h3 className="font-semibold text-sm mb-4">🎬 Content Hooks</h3>
                <div className="space-y-3">
                  {(outputs.creator?.hooks ?? []).map((hook, i) => (
                    <div key={i} className="border border-pink-100 bg-pink-50 rounded-xl p-4 flex items-center justify-between gap-3">
                      <p className="text-sm text-gray-700 flex-1">{hook}</p>
                      <button onClick={() => copyText(`hook-${i}`, hook)}
                        className="text-xs border border-pink-200 bg-white px-2.5 py-1 rounded-lg shrink-0 font-medium">
                        {copied[`hook-${i}`] ? "✓" : "Copy"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              {outputs.creator?.script_opener && (
                <div className="bg-white border border-gray-100 rounded-2xl p-5">
                  <h3 className="font-semibold text-sm mb-3">🎬 Video Script Opener</h3>
                  <div className="bg-pink-50 border border-pink-100 rounded-xl p-4">
                    <p className="text-sm text-gray-700 italic">"{outputs.creator.script_opener}"</p>
                  </div>
                  <button onClick={() => copyText("script", outputs.creator!.script_opener)}
                    className="mt-2 text-xs border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                    {copied.script ? "Copied!" : "Copy opener"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right rail */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <h2 className="font-semibold text-sm mb-1">Revenue Signals</h2>
            <p className="text-xs text-gray-400 mb-4">Log what's happening out there.</p>
            <div className="space-y-3 text-sm">
              {[
                { label: "Outreach sent", key: "outreach" as const, color: "text-orange-600" },
                { label: "Replies",       key: "replies"  as const, color: "text-blue-600" },
                { label: "Page views",    key: "pageViews" as const, color: "text-violet-600" },
                { label: "Sales 🎉",      key: "sales"    as const, color: "text-emerald-600" },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-gray-500">{s.label}</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold tabular-nums w-6 text-right ${signals[s.key] > 0 ? s.color : "text-gray-400"}`}>{signals[s.key]}</span>
                    <button onClick={() => logSignal(s.key)} className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded font-medium transition-colors">+1</button>
                  </div>
                </div>
              ))}
            </div>
            {totalSignals > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 font-medium">{totalSignals} signals logged</p>
                {signals.sales > 0 && <p className="text-xs text-emerald-600 font-semibold mt-1">🎉 Revenue: ${signals.sales * 29}</p>}
              </div>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <p className="text-xs font-semibold text-amber-600 mb-2 flex items-center gap-1">📊 Analyst · Next play</p>
            <p className="text-sm text-gray-700">{analystNote}</p>
          </div>

          <div className="bg-violet-50 border border-violet-100 rounded-2xl p-5">
            <p className="text-xs font-medium text-violet-600 mb-3">Sprint snapshot</p>
            <div className="space-y-2 text-xs text-gray-600">
              {[
                { label: "Idea",    value: idea },
                { label: "Offer",   value: offer },
                { label: "Channel", value: channel },
                { label: "Goal",    value: sprintGoal },
                { label: "Day",     value: `${day} of 7` },
              ].map(r => (
                <div key={r.label} className="flex justify-between gap-2">
                  <span className="text-gray-400 shrink-0">{r.label}</span>
                  <span className="font-medium text-right truncate max-w-[60%]" title={r.value}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* New Cabana CTA */}
          <button
            onClick={() => router.push("/")}
            className="w-full border border-dashed border-gray-300 rounded-2xl p-4 text-sm text-gray-400 hover:text-violet-600 hover:border-violet-300 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={14} /> Start another Cabana
          </button>
        </div>
      </div>
    </div>
  );
}
