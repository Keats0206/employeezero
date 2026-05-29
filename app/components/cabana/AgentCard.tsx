"use client";

import { AGENT_META, AGENT_COLOR, type AgentId } from "@/app/lib/cabana-config";
import { Lock } from "lucide-react";

export function AgentCard({ agentId, children }: { agentId: AgentId; children: React.ReactNode }) {
  const m = AGENT_META[agentId];
  const color = AGENT_COLOR[agentId];
  return (
    <div className="bg-white border border-black/10 rounded-3xl p-6">
      <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-4 bg-black/[0.04]">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-black">{m.name}</span>
        <span className="text-black/40">· {m.role}</span>
      </div>
      {children}
    </div>
  );
}

export function LockedMore({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5 mt-3 text-xs text-black/40">
      <Lock size={11} /> {label}
    </div>
  );
}
