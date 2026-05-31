"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, TreePalm, Check } from "lucide-react";
import { AGENT_META, AGENT_COLOR, AGENT_ORDER } from "@/app/lib/cabana-config";

const SURF = "#23b5d3";

const PLANS = [
  {
    id: "starter" as const,
    name: "Starter",
    price: "$29",
    period: "/mo",
    tagline: "One active cabana, full crew",
    features: [
      "1 active cabana",
      "Landing page + published URL",
      "Outreach batch (50+ messages)",
      "Content calendar (12+ hooks)",
      "Revenue tracker + signals",
      "Daily plays from all 6 agents",
      "On-demand agent reruns",
    ],
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: "$79",
    period: "/mo",
    tagline: "Unlimited cabanas, priority runs",
    features: [
      "Unlimited cabanas",
      "Everything in Starter",
      "Priority CoS execution",
      "Multi-business dashboard",
      "Early access to new agents",
    ],
    highlighted: true,
  },
];

export default function UpgradePage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(plan: "starter" | "pro") {
    setLoading(plan);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) {
        if (res.status === 401) { router.push("/sign-in"); return; }
        throw new Error("Failed to create checkout session");
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div
            className="inline-flex h-14 w-14 items-center justify-center rounded-full mb-4"
            style={{ background: `${SURF}1a`, color: SURF }}
          >
            <TreePalm size={28} strokeWidth={1.75} />
          </div>
          <h1 className="text-3xl font-bold tracking-[-0.03em] leading-tight">
            Your crew is ready to work.
          </h1>
          <p className="text-black/50 text-sm mt-2 max-w-sm mx-auto">
            7-day free trial, card required. Cancel anytime.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`border rounded-2xl overflow-hidden flex flex-col ${
                plan.highlighted ? "border-black" : "border-black/10"
              }`}
            >
              {plan.highlighted && (
                <div className="px-5 py-1.5 text-center text-xs font-semibold text-white" style={{ background: "black" }}>
                  Most popular
                </div>
              )}
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-end justify-between mb-1">
                  <span className="font-bold text-lg">{plan.name}</span>
                  <span className="text-2xl font-bold tracking-tight" style={{ color: SURF }}>
                    {plan.price}<span className="text-sm font-normal text-black/40">{plan.period}</span>
                  </span>
                </div>
                <p className="text-xs text-black/40">{plan.tagline}</p>
              </div>

              <div className="border-t border-black/10 px-5 py-4 flex-1">
                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check size={14} className="mt-0.5 shrink-0" style={{ color: SURF }} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Crew pills */}
              <div className="border-t border-black/10 px-5 py-3">
                <p className="text-[11px] font-medium text-black/40 mb-2">Crew included</p>
                <div className="flex flex-wrap gap-1.5">
                  {AGENT_ORDER.map((id) => {
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

              <div className="px-5 pb-5 pt-3">
                <button
                  onClick={() => startCheckout(plan.id)}
                  disabled={loading !== null}
                  className="w-full font-bold py-3 rounded-full text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                  style={plan.highlighted
                    ? { background: "black", color: "white" }
                    : { background: `${SURF}1a`, color: SURF }
                  }
                >
                  {loading === plan.id ? "Redirecting…" : <>Start free trial <ArrowRight size={14} /></>}
                </button>
              </div>
            </div>
          ))}
        </div>

        {error && <p className="text-center text-sm text-red-500 mb-4">{error}</p>}
        <p className="text-xs text-black/30 text-center">
          7-day free trial. Your card will be charged after the trial ends unless you cancel.
        </p>
      </div>
    </div>
  );
}
