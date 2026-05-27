"use client";

import Link from "next/link";
import { useState } from "react";
import {
  PauseCircle,
  XCircle,
  Repeat2,
  ArrowUpCircle,
  RefreshCw,
  Send,
} from "lucide-react";
import { type WorkTask } from "../../lib/prototype";

export default function TaskDetailClient({ task }: { task: WorkTask }) {
  const [state, setState] = useState(task);

  function patch(p: Partial<WorkTask>) {
    setState((s) => ({ ...s, ...p, lastUpdate: "just now" }));
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3 text-sm text-zinc-500">
        <Link
          href="/work"
          className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-700 hover:border-zinc-500"
        >
          Back to Work Queue
        </Link>
        <span>{state.id}</span>
      </div>

      <header className="border-b border-zinc-200 pb-4">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">{state.title}</h1>
        <p className="mt-1 text-sm text-zinc-600">Assigned to: {state.agent}</p>
        <p className="text-sm text-zinc-600">Goal: {state.linkedGoal}</p>
        <p className="text-sm text-zinc-500">Status: {state.status.replace("_", " ")} · Priority: {state.priority}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Btn
            icon={<PauseCircle size={13} className="text-amber-600" />}
            onClick={() => patch({ status: "waiting" })}
          >
            Pause
          </Btn>
          <Btn
            icon={<XCircle size={13} className="text-rose-600" />}
            onClick={() => patch({ status: "failed" })}
          >
            Cancel
          </Btn>
          <Btn
            icon={<Repeat2 size={13} className="text-blue-600" />}
            onClick={() => patch({ agent: "Chief of Staff Agent" })}
          >
            Reassign
          </Btn>
          <Btn
            icon={<ArrowUpCircle size={13} className="text-violet-600" />}
            onClick={() => patch({ priority: "high" })}
          >
            Increase priority
          </Btn>
          <Btn
            icon={<RefreshCw size={13} className="text-emerald-600" />}
            onClick={() => patch({ status: "running" })}
          >
            Ask for update
          </Btn>
          <Btn
            icon={<Send size={13} className="text-zinc-700" />}
            onClick={() => patch({ needsApproval: true, status: "needs_review" })}
          >
            Convert to decision
          </Btn>
        </div>
      </header>

      <Section title="Task Brief" body={state.brief} />
      <List title="Agent Plan" items={state.plan} />
      <List title="Live Activity Log" items={state.logs} />
      <List title="Artifacts Generated" items={state.artifacts} />
      <List title="Dependencies" items={state.dependsOn} />
      <List title="Unblocks" items={state.unblocks} />
      <List title="Memory Updates" items={state.memoryUpdates.length ? state.memoryUpdates : ["No memory updates yet"]} />
    </div>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <section className="border-b border-zinc-200 py-4">
      <h2 className="text-[11px] uppercase tracking-wider text-zinc-500">{title}</h2>
      <p className="mt-2 text-sm text-zinc-800">{body}</p>
    </section>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="border-b border-zinc-200 py-4">
      <h2 className="text-[11px] uppercase tracking-wider text-zinc-500">{title}</h2>
      <ul className="mt-2 space-y-1 text-sm text-zinc-800">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </section>
  );
}

function Btn({
  children,
  onClick,
  icon,
}: {
  children: React.ReactNode;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-700 hover:border-zinc-500"
    >
      {icon}
      {children}
    </button>
  );
}
