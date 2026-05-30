"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, TreePalm } from "lucide-react";

const SURF = "#23b5d3";

const PRINCIPLES = [
  {
    title: "Make it real",
    body: "No mockups, no someday. Every page deploys live, every message can be sent, every signal is something you can actually track.",
    tags: ["Shipped, not planned", "Live URLs, not screenshots"],
  },
  {
    title: "First sale over everything",
    body: "Vanity metrics are a distraction. The only milestone that matters is a stranger paying you money. The crew points at that, relentlessly.",
    tags: ["Revenue signal", "No vanity metrics"],
  },
  {
    title: "Small and yours",
    body: "You don't need a team, a budget, or a runway. A cabana, not a skyscraper. Start small, stay focused, keep ownership.",
    tags: ["Solo founder", "No VC required"],
  },
  {
    title: "The crew does the work",
    body: "Cabana isn't a tool you operate — it's a crew that executes. Less \"you should,\" more \"here's what we did.\"",
    tags: ["Execution, not advice", "6 agents, 1 goal"],
  },
  {
    title: "Momentum beats perfection",
    body: "A shipped page that's 80% right beats a perfect plan that never launches. We optimize for the next move, not the final form.",
    tags: ["Ship fast", "Iterate always"],
  },
];

const ANTI_PRINCIPLES = [
  { label: "We don't do", value: "Vanity dashboards" },
  { label: "We don't do", value: "Advice without output" },
  { label: "We don't do", value: "Mockups that never ship" },
  { label: "We don't do", value: "\"Come back when you're ready\"" },
];

export default function EthosPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-black/10">
        <Link href="/" className="flex items-center gap-2">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ background: `${SURF}1a`, color: SURF }}
          >
            <TreePalm size={16} strokeWidth={1.75} />
          </span>
          <span className="font-bold tracking-tight">Cabana</span>
        </Link>
        <div className="flex items-center gap-1 text-sm">
          <Link href="/ethos" className="px-3.5 py-1.5 rounded-full bg-black/5 text-black font-medium">Ethos</Link>
          <Link href="/about" className="px-3.5 py-1.5 rounded-full text-black/50 hover:bg-black/5 transition-colors">About</Link>
          <Link href="/roadmap" className="px-3.5 py-1.5 rounded-full text-black/50 hover:bg-black/5 transition-colors">Roadmap</Link>
          <button
            onClick={() => router.push("/sign-in")}
            className="ml-2 bg-black text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-black/80 transition-colors"
          >
            Sign in
          </button>
        </div>
      </nav>

      <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-16">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-[-0.03em] leading-[1.05] mb-4">
          Building should feel like a beach hut, not a mountain.
        </h1>
        <p className="text-[15px] text-black/50 mb-14 leading-relaxed">
          A few beliefs that shape everything Cabana makes.
        </p>

        {/* Principles — rich cards with tags */}
        <div className="space-y-3 mb-14">
          {PRINCIPLES.map((p, i) => (
            <div
              key={p.title}
              className="rounded-2xl border border-black/10 p-5"
            >
              <div className="flex items-start gap-3 mb-2">
                <span
                  className="text-xs font-mono shrink-0 mt-0.5"
                  style={{ color: SURF }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-bold tracking-tight mb-1">{p.title}</h2>
                  <p className="text-[15px] text-black/55 leading-relaxed">{p.body}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3 ml-7">
                {p.tags.map(tag => (
                  <span
                    key={tag}
                    className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-black/[0.04] text-black/50"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Anti-principles — kv rows */}
        <div className="mb-14">
          <p className="text-xs font-medium text-black/40 mb-4">What we don&apos;t do</p>
          <div className="rounded-2xl border border-black/10 overflow-hidden">
            {ANTI_PRINCIPLES.map((item, i) => (
              <div
                key={item.value}
                className={`flex items-center justify-between px-4 py-3 text-sm ${i > 0 ? "border-t border-black/10" : ""}`}
              >
                <span className="text-black/40">{item.label}</span>
                <span className="font-medium text-black/70">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => router.push("/chat")}
          className="inline-flex items-center gap-2 bg-black hover:bg-black/80 text-white px-5 py-3 rounded-full font-semibold text-sm transition-colors"
        >
          Start building <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
