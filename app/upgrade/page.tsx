"use client";

import { ArrowRight, TreePalm } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AGENT_META, AGENT_COLOR, AGENT_ORDER } from "@/app/lib/cabana-config";

const SURF = "#23b5d3";

const FEATURES = [
  { icon: "📄", label: "Landing page", detail: "Full page + publishable URL" },
  { icon: "💬", label: "Outreach batch", detail: "50+ ready-to-send messages" },
  { icon: "🎬", label: "Content calendar", detail: "12+ hooks + scripts" },
  { icon: "📊", label: "Revenue tracker", detail: "Signal dashboard + next-play" },
  { icon: "⚡", label: "Daily plays", detail: "All 6 agents, every day" },
  { icon: "🔄", label: "Agent reruns", detail: "On demand, any agent" },
];

function UpgradeInner() {
  const params = useSearchParams();
  const cabanaId = params.get("cabana");
  
  const checkoutUrl = process.env.NEXT_PUBLIC_STRIPE_CHECKOUT_URL + 
    (cabanaId ? `?client_reference_id=${cabanaId}` : "");

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="inline-flex h-14 w-14 items-center justify-center rounded-full mb-4"
            style={{ background: `${SURF}1a`, color: SURF }}
          >
            <TreePalm size={28} strokeWidth={1.75} />
          </div>
          <h1 className="text-3xl font-bold tracking-[-0.03em] leading-tight">Your First Sale Crew is ready.</h1>
          <p className="text-black/50 text-sm mt-2">Unlock the full crew to publish your page, run plays, and track your first revenue signal.</p>
        </div>

        {/* Pricing card */}
        <div className="border border-black/10 rounded-2xl overflow-hidden mb-5">
          {/* Price header */}
          <div className="px-5 pt-5 pb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold">First Sale Sprint</span>
              <span className="text-2xl font-bold tracking-tight" style={{ color: SURF }}>$29</span>
            </div>
            <p className="text-xs text-black/40">7 days of crew work toward your first revenue signal</p>
          </div>

          {/* Divider */}
          <div className="border-t border-black/10" />

          {/* Feature grid */}
          <div className="px-5 py-4">
            <div className="grid grid-cols-2 gap-3">
              {FEATURES.map(f => (
                <div key={f.label} className="flex items-start gap-2">
                  <span className="text-sm shrink-0">{f.icon}</span>
                  <div>
                    <p className="text-xs font-semibold">{f.label}</p>
                    <p className="text-[11px] text-black/40">{f.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-black/10" />

          {/* Included agents */}
          <div className="px-5 py-4">
            <p className="text-[11px] font-medium text-black/40 mb-2">Crew included</p>
            <div className="flex flex-wrap gap-1.5">
              {AGENT_ORDER.map(id => {
                const m = AGENT_META[id];
                const c = AGENT_COLOR[id];
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${c}1a`, color: c }}
                  >
                    {m.icon} {m.name}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <a
          href={checkoutUrl}
          className="w-full bg-black hover:bg-black/80 text-white font-bold py-3.5 rounded-full text-sm transition-colors flex items-center justify-center gap-2"
        >
          Launch this Cabana — $29 <ArrowRight size={14} />
        </a>
        <p className="text-xs text-black/30 text-center mt-4">Planning is free. Launching takes a crew.</p>
      </div>
    </div>
  );
}

export default function UpgradePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center">Loading...</div>}>
      <UpgradeInner />
    </Suspense>
  );
}
