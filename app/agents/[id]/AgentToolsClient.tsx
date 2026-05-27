"use client";

import { useState } from "react";
import type { AgentProfile } from "../../lib/agent-catalog";
import { CheckCircle2, Lock, Play, Wrench } from "lucide-react";
import Link from "next/link";

export default function AgentToolsClient({ agent }: { agent: AgentProfile }) {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(agent.starterTools.map((t) => [t, true]))
  );
  const [runReady, setRunReady] = useState(false);

  const enabledCount = Object.values(enabled).filter(Boolean).length;

  return (
    <section className="mt-6 border border-zinc-200">
      <div className="border-b border-zinc-200 px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-zinc-500">Tool Access</div>
            <div className="mt-1 text-sm text-zinc-700">Enable tools this agent can use in production runs.</div>
          </div>
          <div className="text-xs text-zinc-600">{enabledCount}/{agent.starterTools.length} enabled</div>
        </div>
      </div>

      <ul className="divide-y divide-zinc-100 px-5">
        {agent.starterTools.map((tool) => {
          const on = !!enabled[tool];
          return (
            <li key={tool} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2 text-sm text-zinc-800">
                <Wrench size={14} className={on ? "text-emerald-600" : "text-zinc-400"} />
                {tool}
              </div>
              <button
                onClick={() => setEnabled((prev) => ({ ...prev, [tool]: !prev[tool] }))}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${
                  on ? "border-emerald-300 text-emerald-700" : "border-zinc-300 text-zinc-600"
                }`}
              >
                {on ? <CheckCircle2 size={12} /> : <Lock size={12} />}
                {on ? "Enabled" : "Disabled"}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200 px-5 py-4">
        <button
          onClick={() => setRunReady(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-700 hover:border-zinc-500"
        >
          <Play size={12} className="text-blue-600" />
          Create sandbox run
        </button>
        <Link href="/inbox" className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-700 hover:border-zinc-500">
          Send to Inbox
        </Link>
        <Link href="/work" className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-700 hover:border-zinc-500">
          Back to Work Queue
        </Link>
        {runReady && <span className="text-xs text-emerald-700">Sandbox run queued for this agent.</span>}
      </div>
    </section>
  );
}
