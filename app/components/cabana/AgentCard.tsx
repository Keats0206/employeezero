"use client";

import { AGENT_META, AGENT_PALETTE, type AgentId } from "@/app/lib/cabana-config";
import { Lock } from "lucide-react";

export function AgentCard({ agentId, children }: { agentId: AgentId; children: React.ReactNode }) {
  const p = AGENT_PALETTE[agentId];
  const m = AGENT_META[agentId];
  return (
    <div className={`${p.bg} border ${p.border} rounded-2xl p-6`}>
      <div className={`inline-flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-full mb-4 ${p.iconBg} ${p.iconText}`}>
        <span>{m.icon}</span> {m.name} · {m.role}
      </div>
      {children}
    </div>
  );
}

export function LockedMore({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-400">
      <Lock size={11} /> {label}
    </div>
  );
}
