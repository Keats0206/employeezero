import Link from "next/link";
import { PageShell } from "../components/Shell";
import { AGENT_CATALOG } from "../lib/agent-catalog";

export default function AgentsPage() {
  return (
    <PageShell
      title="Agents"
      context="Specialist agents and their scoped capabilities."
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {AGENT_CATALOG.map((agent) => (
          <Link
            key={agent.id}
            href={`/agents/${agent.id}`}
            className="rounded-xl border border-zinc-200 bg-white p-5 text-left transition-colors hover:border-zinc-300"
          >
            <h2 className="text-sm font-semibold text-zinc-900">{agent.name}</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">{agent.summary}</p>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
