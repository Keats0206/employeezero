"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { AGENT_ORDER, AGENT_META, EXAMPLES } from "@/app/lib/cabana-config";

const BEACH_COLORS = ["#23b5d3", "#0cf574", "#f5cb5c", "#d8bfaa", "#304c89", "#23b5d3"];

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
    <div className="min-h-screen bg-white text-black flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto w-full">
        <span className="font-bold text-lg tracking-tight">Cabana</span>
        <div className="flex items-center gap-1 text-sm">
          <button onClick={() => router.push("/ethos")} className="px-4 py-2 rounded-full hover:bg-black/5 transition-colors">Ethos</button>
          <button onClick={() => router.push("/about")} className="px-4 py-2 rounded-full hover:bg-black/5 transition-colors">About</button>
          <button
            onClick={() => router.push("/sign-in")}
            className="ml-1 bg-black text-white px-5 py-2 rounded-full font-medium hover:bg-black/80 transition-colors"
          >
            Sign in
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-20 text-center max-w-4xl mx-auto w-full">
        <p className="text-sm font-medium text-black/40 mb-6 tracking-tight">
          Your AI crew. One goal: <span className="text-[var(--brand)]">your first sale.</span>
        </p>

        <h1 className="text-6xl sm:text-7xl font-bold tracking-[-0.03em] leading-[0.95] mb-8">
          Give Cabana<br />an idea.
        </h1>
        <p className="text-xl text-black/50 mb-12 max-w-lg tracking-tight">
          Six agents research, build, market, and ship your idea — straight toward a paying customer.
        </p>

        {/* Input */}
        <div className="w-full max-w-xl">
          <div className="flex items-center gap-2 border border-black/10 rounded-full p-2 pl-6 focus-within:border-black/30 transition-colors">
            <input
              type="text"
              value={idea}
              onChange={e => setIdea(e.target.value)}
              onKeyDown={e => e.key === "Enter" && launch(idea)}
              placeholder={EXAMPLES[placeholder]}
              className="flex-1 bg-transparent text-base focus:outline-none placeholder:text-black/30"
            />
            <button
              onClick={() => launch(idea)}
              disabled={!idea.trim()}
              className="bg-[var(--brand)] hover:bg-[var(--brand-hover)] disabled:opacity-30 text-white w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-colors"
              aria-label="Launch crew"
            >
              <ArrowRight size={18} />
            </button>
          </div>
          <p className="text-xs text-black/30 mt-4">Free to generate a preview. No card needed.</p>
        </div>

        {/* Examples */}
        <div className="flex flex-wrap gap-2 justify-center mt-8 max-w-xl">
          {EXAMPLES.map(ex => (
            <button
              key={ex}
              onClick={() => launch(ex)}
              className="text-sm border border-black/10 hover:border-black/30 text-black/60 hover:text-black px-4 py-2 rounded-full transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* The crew — black section, big and bold */}
      <div className="bg-black text-white py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-sm font-medium text-white/40 mb-3">Meet your crew</p>
          <h2 className="text-5xl sm:text-6xl font-bold tracking-[-0.03em] mb-16 leading-none">
            Six agents.<br />One goal.
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/10 rounded-3xl overflow-hidden">
            {AGENT_ORDER.map((id, i) => {
              const m = AGENT_META[id];
              const color = BEACH_COLORS[i % BEACH_COLORS.length];
              return (
                <div key={id} className="bg-black p-8 flex flex-col gap-3 group hover:bg-white/[0.04] transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-sm font-mono text-white/30">0{i + 1}</span>
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight mt-2" style={{ color }}>{m.name}</h3>
                  <p className="text-white/50">{m.role}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* First sale focus — the money moment */}
      <div className="bg-white py-28 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm font-medium text-black/40 mb-6">The only metric that matters</p>
          <h2 className="text-5xl sm:text-7xl font-bold tracking-[-0.03em] leading-none mb-6">
            Your first<br /><span className="text-[var(--brand)]">$29.</span>
          </h2>
          <p className="text-xl text-black/50 max-w-md mx-auto mb-12 tracking-tight">
            Not impressions. Not followers. A stranger paying you money. That's what the crew points at.
          </p>
          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
              setTimeout(() => document.querySelector("input")?.focus(), 400);
            }}
            className="bg-black text-white text-lg font-semibold px-8 py-4 rounded-full hover:bg-black/80 transition-colors inline-flex items-center gap-2"
          >
            Start building <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
