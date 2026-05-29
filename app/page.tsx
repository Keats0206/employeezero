"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { AGENT_ORDER, AGENT_META, AGENT_PALETTE, EXAMPLES } from "@/app/lib/cabana-config";
import { DevNav } from "@/app/components/cabana/DevNav";

export default function LandingPage() {
  const [idea, setIdea] = useState("");
  const [placeholder, setPlaceholder] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const t = setInterval(() => setPlaceholder(p => (p + 1) % EXAMPLES.length), 3000);
    return () => clearInterval(t);
  }, []);

  function launch(text: string) {
    if (!text.trim()) return;
    router.push(`/preview?idea=${encodeURIComponent(text.trim())}`);
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <span className="font-bold text-lg tracking-tight">Cabana</span>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <a href="#how" className="hover:text-gray-900">How it works</a>
          <a href="#crew" className="hover:text-gray-900">The crew</a>
          <button
            onClick={() => router.push("/sign-in")}
            className="bg-black text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Sign in
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pt-16 pb-24 text-center max-w-3xl mx-auto w-full">
        <div className="inline-flex items-center gap-2 bg-violet-50 text-violet-700 text-xs font-medium px-3 py-1.5 rounded-full mb-8">
          <Sparkles size={12} />
          Your AI crew. First sale focus.
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.08] mb-6">
          Give Cabana an idea.<br />
          <span className="text-violet-600">Your crew starts building.</span>
        </h1>
        <p className="text-lg text-gray-500 mb-10 max-w-xl">
          Cabana spins up 6 AI agents that research, build, market, and test your internet business idea — so you can move toward your first sale.
        </p>

        <div className="w-full max-w-xl">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={idea}
              onChange={e => setIdea(e.target.value)}
              onKeyDown={e => e.key === "Enter" && launch(idea)}
              placeholder={EXAMPLES[placeholder]}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50 placeholder:text-gray-400"
            />
            <button
              onClick={() => launch(idea)}
              disabled={!idea.trim()}
              className="bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-3.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              Launch my crew <ArrowRight size={16} />
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-3">Free to generate a preview. No credit card needed.</p>
        </div>

        {/* Clickable examples */}
        <div className="w-full max-w-xl mt-6">
          <p className="text-xs text-gray-400 mb-3">Try one of these:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {EXAMPLES.map(ex => (
              <button
                key={ex}
                onClick={() => launch(ex)}
                className="text-xs bg-gray-50 hover:bg-violet-50 border border-gray-200 hover:border-violet-300 text-gray-600 hover:text-violet-700 px-3 py-2 rounded-full transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* How it works */}
      <div id="how" className="border-t border-gray-100 py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 text-center mb-12">How it works</p>
          <div className="grid sm:grid-cols-4 gap-8">
            {[
              { n: "1", title: "Drop in an idea", body: "Tell Cabana what you want to build, sell, or test." },
              { n: "2", title: "Crew comes online", body: "Scout, Strategist, Builder, Seller, Creator, and Analyst start working." },
              { n: "3", title: "Review the plan",  body: "Cabana generates offers, a page, outreach, content, and a path to first revenue." },
              { n: "4", title: "Launch",            body: "Approve plays, publish the page, send messages, track signals." },
            ].map(s => (
              <div key={s.n} className="flex flex-col gap-2">
                <span className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 text-sm font-bold flex items-center justify-center">{s.n}</span>
                <h3 className="font-semibold text-sm">{s.title}</h3>
                <p className="text-sm text-gray-500">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Crew */}
      <div id="crew" className="bg-gray-50 py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 text-center mb-4">Meet your First Sale Crew</p>
          <h2 className="text-3xl font-bold text-center mb-12">6 agents. One goal.</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {AGENT_ORDER.map(id => {
              const m = AGENT_META[id];
              const p = AGENT_PALETTE[id];
              return (
                <div key={id} className={`${p.bg} border ${p.border} rounded-xl p-5`}>
                  <div className={`w-9 h-9 rounded-lg ${p.iconBg} flex items-center justify-center text-lg mb-3`}>{m.icon}</div>
                  <h3 className={`font-semibold text-sm mb-1 ${p.iconText}`}>{m.name}</h3>
                  <p className="text-sm text-gray-600">{m.role}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="py-20 px-6 text-center">
        <h2 className="text-3xl font-bold mb-3">Planning is free.</h2>
        <p className="text-gray-500 mb-8">Launching takes a crew.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-xl mx-auto">
          <input
            type="text"
            value={idea}
            onChange={e => setIdea(e.target.value)}
            onKeyDown={e => e.key === "Enter" && launch(idea)}
            placeholder="Describe your idea…"
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50"
          />
          <button
            onClick={() => launch(idea)}
            disabled={!idea.trim()}
            className="bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white px-6 py-3.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            Launch my crew <ArrowRight size={16} />
          </button>
        </div>
      </div>

      <DevNav />
    </div>
  );
}
