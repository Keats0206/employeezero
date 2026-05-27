import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "../../components/Shell";
import { AGENT_CATALOG } from "../../lib/agent-catalog";
import AgentToolsClient from "./AgentToolsClient";

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agent = AGENT_CATALOG.find((a) => a.id === id);

  if (!agent) notFound();

  return (
    <PageShell title={agent.name} context={agent.summary}>
      <div className="mb-4">
        <Link
          href="/agents"
          className="text-xs text-zinc-500 underline-offset-2 hover:underline"
        >
          Back to agents
        </Link>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 px-5 py-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Specific Skills
          </div>
        </div>

        <div className="px-5 py-4">
          <ul className="space-y-2">
            {agent.responsibilities.map((skill) => (
              <li
                key={skill}
                className="rounded-md border border-zinc-100 px-3 py-2 text-sm text-zinc-700"
              >
                {skill}
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-zinc-100 px-5 py-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Default Outputs
          </div>
          <ul className="space-y-1.5">
            {agent.defaultOutputs.map((out) => (
              <li key={out} className="text-sm text-zinc-600">
                {out}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <AgentToolsClient agent={agent} />
    </PageShell>
  );
}
