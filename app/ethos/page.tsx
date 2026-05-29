"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

const PRINCIPLES = [
  {
    n: "01",
    title: "Make it real",
    body: "No mockups, no someday. Every page deploys live, every message can be sent, every signal is something you can actually track.",
  },
  {
    n: "02",
    title: "First sale over everything",
    body: "Vanity metrics are a distraction. The only milestone that matters is a stranger paying you money. The crew points at that, relentlessly.",
  },
  {
    n: "03",
    title: "Small and yours",
    body: "You don't need a team, a budget, or a runway. A cabana, not a skyscraper. Start small, stay focused, keep ownership.",
  },
  {
    n: "04",
    title: "The crew does the work",
    body: "Cabana isn't a tool you operate — it's a crew that executes. Less \"you should,\" more \"here's what we did.\"",
  },
  {
    n: "05",
    title: "Momentum beats perfection",
    body: "A shipped page that's 80% right beats a perfect plan that never launches. We optimize for the next move, not the final form.",
  },
];

export default function EthosPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <Link href="/" className="font-bold text-lg tracking-tight">Cabana</Link>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <Link href="/ethos" className="px-4 py-2 rounded-full bg-black/5 text-black font-medium">Ethos</Link>
          <Link href="/about" className="px-4 py-2 rounded-full hover:bg-black/5 transition-colors">About</Link>
          <button
            onClick={() => router.push("/sign-in")}
            className="ml-1 bg-black text-white px-5 py-2 rounded-full font-medium hover:bg-black/80 transition-colors"
          >
            Sign in
          </button>
        </div>
      </nav>

      <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-16">
        <p className="text-sm font-medium text-black/40 mb-4">Our ethos</p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-[-0.03em] leading-[1.05] mb-6">
          Building should feel like a beach hut, not a mountain.
        </h1>
        <p className="text-lg text-black/50 mb-16 leading-relaxed tracking-tight">
          A few beliefs that shape everything Cabana makes.
        </p>

        <div className="space-y-12">
          {PRINCIPLES.map(p => (
            <div key={p.n} className="flex gap-6">
              <span className="text-sm font-mono text-[var(--brand)] pt-1 shrink-0">{p.n}</span>
              <div>
                <h2 className="text-xl font-bold mb-2 tracking-tight">{p.title}</h2>
                <p className="text-black/60 leading-relaxed">{p.body}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => router.push("/")}
          className="mt-16 inline-flex items-center gap-2 bg-black hover:bg-black/80 text-white px-6 py-3.5 rounded-full font-semibold text-sm transition-colors"
        >
          Start building <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
