"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, TreePalm } from "lucide-react";
import { AGENT_META, AGENT_COLOR, AGENT_ORDER } from "@/app/lib/cabana-config";

const SURF = "#23b5d3";

const STATS = [
  { label: "Crew agents", value: "6" },
  { label: "Time to first draft", value: "~2 min" },
  { label: "Live deploy", value: "Instant" },
  { label: "Sprint length", value: "7 days" },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Drop in an idea", body: "One sentence. That's all the crew needs to get started." },
  { step: "02", title: "Crew goes to work", body: "Six agents research, strategize, build, sell, create, and analyze in parallel." },
  { step: "03", title: "Page goes live", body: "Your landing page deploys to a real URL. Leads start capturing immediately." },
  { step: "04", title: "Chief of Staff runs the loop", body: "Daily plays, outreach drafts, signal tracking. You approve, the crew executes." },
];

export default function AboutPage() {
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
          <Link href="/ethos" className="px-3.5 py-1.5 rounded-full text-black/50 hover:bg-black/5 transition-colors">Ethos</Link>
          <Link href="/about" className="px-3.5 py-1.5 rounded-full bg-black/5 text-black font-medium">About</Link>
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
        {/* Hero image */}
        <div className="rounded-2xl overflow-hidden mb-10 border border-black/10">
          <Image
            src="/cabana-illustration.png"
            alt="A cabana on the beach"
            width={1408}
            height={768}
            className="w-full h-auto"
            priority
          />
        </div>

        {/* Headline + intro */}
        <h1 className="text-4xl sm:text-5xl font-bold tracking-[-0.03em] leading-[1.05] mb-4">About Cabana</h1>
        <p className="text-[15px] text-black/55 leading-relaxed mb-8">
          Cabana is a quiet place to build something of your own. Drop in an idea
          and a crew of AI agents goes to work — researching the market, sharpening
          the offer, building the page, writing the outreach, and finding the
          fastest path to your first sale.
        </p>

        {/* Stat grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-2xl border border-black/10 overflow-hidden mb-14">
          {STATS.map((s) => (
            <div key={s.label} className="bg-white p-4">
              <p className="text-xl font-bold tracking-tight" style={{ color: SURF }}>{s.value}</p>
              <p className="text-xs text-black/40 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* How it works — step timeline */}
        <div className="mb-14">
          <p className="text-xs font-medium text-black/40 mb-4">How it works</p>
          <div className="space-y-px rounded-2xl border border-black/10 overflow-hidden">
            {HOW_IT_WORKS.map((item, i) => (
              <div key={item.step} className={`flex gap-4 p-4 ${i > 0 ? "border-t border-black/10" : ""}`}>
                <span className="text-xs font-mono shrink-0 mt-0.5" style={{ color: SURF }}>{item.step}</span>
                <div>
                  <p className="text-sm font-bold tracking-tight">{item.title}</p>
                  <p className="text-sm text-black/55 leading-relaxed mt-0.5">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* The crew — agent cards */}
        <div className="mb-14">
          <p className="text-xs font-medium text-black/40 mb-4">The crew</p>
          <div className="grid sm:grid-cols-2 gap-px rounded-2xl border border-black/10 overflow-hidden">
            {AGENT_ORDER.map((id) => {
              const m = AGENT_META[id];
              const c = AGENT_COLOR[id];
              return (
                <div key={id} className="p-4 flex items-center gap-3">
                  <span
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm"
                    style={{ backgroundColor: `${c}1a` }}
                  >
                    {m.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight">{m.name}</p>
                    <p className="text-xs text-black/40 leading-tight">{m.role}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Belief block */}
        <div className="rounded-2xl border border-black/10 p-5 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SURF }} />
            <span className="text-xs font-semibold text-black/50">Our belief</span>
          </div>
          <p className="text-sm font-bold mb-1.5">Starting should feel like a beach hut, not a mountain.</p>
          <p className="text-[15px] text-black/55 leading-relaxed">
            You don&apos;t need a team, a budget, or a runway. You need momentum toward a first paying
            customer — and a crew that handles the parts that usually stall people out. Everything
            Cabana makes is real. Real pages, real outreach, real signals. No mockups, no someday.
          </p>
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
