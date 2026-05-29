"use client";

import { CheckCircle, ArrowRight } from "lucide-react";
import { loadSession } from "@/app/lib/cabana-config";

export default function UpgradePage() {
  const { idea } = loadSession();

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        <div className="text-4xl mb-4">🏖️</div>
        <h1 className="text-4xl font-bold mb-3 tracking-[-0.03em]">Your First Sale Crew is ready.</h1>
        {idea && <p className="text-black/40 mb-2 text-sm italic">"{idea}"</p>}
        <p className="text-black/50 mb-8 tracking-tight">Unlock the full crew to publish your page, run plays, and track your first revenue signal.</p>

        <div className="border border-black/10 rounded-3xl p-6 mb-6 text-left">
          <div className="flex items-center justify-between mb-4">
            <span className="font-bold text-lg">First Sale Sprint</span>
            <span className="text-3xl font-bold tracking-tight" style={{ color: "var(--brand)" }}>$29</span>
          </div>
          <p className="text-sm text-black/50 mb-4">7 days of crew work toward your first revenue signal.</p>
          <div className="space-y-2">
            {[
              "Full landing page + publishable URL",
              "Complete outreach batch (50+ messages)",
              "Full content calendar (12+ hooks)",
              "Daily plays from all 6 agents",
              "Revenue signal tracker",
              "Analyst next-play recommendations",
              "Agent reruns on demand",
            ].map(f => (
              <div key={f} className="flex items-center gap-2 text-sm">
                <CheckCircle size={14} className="shrink-0" style={{ color: "var(--brand)" }} /> {f}
              </div>
            ))}
          </div>
        </div>

        <a
          href={process.env.NEXT_PUBLIC_STRIPE_CHECKOUT_URL}
          className="w-full bg-black hover:bg-black/80 text-white font-bold py-4 rounded-full text-base transition-colors flex items-center justify-center gap-2"
        >
          Launch this Cabana — $29 <ArrowRight size={16} />
        </a>
        <p className="text-xs text-black/30 mt-4">Planning is free. Launching takes a crew.</p>
      </div>
    </div>
  );
}
