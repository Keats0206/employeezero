"use client";

import { useRouter } from "next/navigation";
import { CheckCircle, ArrowRight } from "lucide-react";
import { loadSession } from "@/app/lib/cabana-config";
import { DevNav } from "@/app/components/cabana/DevNav";

export default function UpgradePage() {
  const router = useRouter();
  const { idea } = loadSession();

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        <div className="text-4xl mb-4">🚀</div>
        <h1 className="text-3xl font-bold mb-3">Your First Sale Crew is ready.</h1>
        {idea && <p className="text-gray-500 mb-2 text-sm italic">"{idea}"</p>}
        <p className="text-gray-500 mb-8">Unlock the full crew to publish your page, run plays, and track your first revenue signal.</p>

        <div className="border border-gray-100 rounded-2xl p-6 mb-6 text-left">
          <div className="flex items-center justify-between mb-4">
            <span className="font-bold text-lg">First Sale Sprint</span>
            <span className="text-2xl font-bold">$29</span>
          </div>
          <p className="text-sm text-gray-500 mb-4">7 days of crew work toward your first revenue signal.</p>
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
                <CheckCircle size={14} className="text-emerald-500 shrink-0" /> {f}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => router.push("/dashboard")}
          className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-4 rounded-xl text-base transition-colors flex items-center justify-center gap-2"
        >
          Launch this Cabana — $29 <ArrowRight size={16} />
        </button>
        <button
          onClick={() => router.push("/dashboard")}
          className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          Start 7-day free trial instead
        </button>
        <p className="text-xs text-gray-300 mt-4">Planning is free. Launching takes a crew.</p>
      </div>
      <DevNav />
    </div>
  );
}
