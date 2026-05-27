"use client";

import { useState } from "react";
import { Plus, Target } from "lucide-react";
import { artifacts, goals, tasks, memories } from "../lib/fixtures";
import type { Goal } from "../lib/types";
import { PageShell } from "../components/Shell";
import { formatDate } from "../components/ui";

function progress(goalId: string) {
  const related = tasks.filter((t) => t.goal_id === goalId);
  const done = related.filter((t) => t.status === "done").length;
  const total = related.length || 1;
  return { done, total, pct: Math.round((done / total) * 100), related };
}

function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

export default function GoalsPage() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active =
    goals.find((g) => g.id === activeId) ??
    goals.find((g) => g.active) ??
    goals[0];
  const others = goals.filter((g) => g.id !== active.id);

  return (
    <PageShell title="Goals">
      <HeroGoal goal={active} />

      {others.length > 0 && (
        <div className="mt-12">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Other goals
            </h2>
            <button className="flex items-center gap-1 rounded-md border border-zinc-200 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50">
              <Plus size={11} /> New goal
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {others.map((g) => (
              <SmallGoalCard
                key={g.id}
                goal={g}
                onClick={() => setActiveId(g.id)}
              />
            ))}
          </div>
        </div>
      )}
    </PageShell>
  );
}

function HeroGoal({ goal }: { goal: Goal }) {
  const p = progress(goal.id);
  const d = daysUntil(goal.deadline);
  const inFlight = p.related.filter(
    (t) => t.status === "in_progress" || t.status === "approved"
  );
  const goalArtifacts = artifacts
    .filter((a) => a.goal_id === goal.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 4);
  const goalNotes = memories
    .filter((m) => m.type === "agent_note")
    .slice(0, 3);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-7">
      <div className="flex items-center gap-2">
        <Target size={14} className="text-pink-500" strokeWidth={2} />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-pink-500">
          Active goal
        </span>
      </div>
      <h2 className="mt-2 text-2xl font-semibold leading-tight tracking-tight text-zinc-900">
        {goal.title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">
        {goal.why_it_matters}
      </p>

      {/* Progress strip */}
      <div className="mt-6">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Progress
            </div>
            <div className="mt-1 text-sm text-zinc-700">
              {goal.success_metric}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold tabular-nums tracking-tight text-zinc-900">
              {p.pct}%
            </div>
            <div className="text-xs text-zinc-500">
              {p.done}/{p.total} tasks · {d > 0 ? `${d}d left` : `${Math.abs(d)}d over`}
            </div>
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full bg-zinc-900 transition-all"
            style={{ width: `${p.pct}%` }}
          />
        </div>
      </div>

      {/* Three columns: in flight / artifacts / notes */}
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <Column label={`In flight · ${inFlight.length}`}>
          {inFlight.length === 0 ? (
            <Empty>Nothing in flight.</Empty>
          ) : (
            <ul className="space-y-2">
              {inFlight.map((t) => (
                <li key={t.id} className="flex items-start gap-2 text-sm">
                  <span
                    className={`mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                      t.status === "in_progress"
                        ? "bg-violet-500"
                        : "bg-blue-500"
                    }`}
                  />
                  <span className="text-zinc-700">{t.title}</span>
                </li>
              ))}
            </ul>
          )}
        </Column>

        <Column label={`Recent artifacts · ${goalArtifacts.length}`}>
          {goalArtifacts.length === 0 ? (
            <Empty>None yet.</Empty>
          ) : (
            <ul className="space-y-2">
              {goalArtifacts.map((a) => (
                <li key={a.id} className="text-sm">
                  <div className="truncate text-zinc-700">{a.title}</div>
                  <div className="text-[11px] text-zinc-400">
                    {a.created_by_agent} · {formatDate(a.created_at)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Column>

        <Column label="Agent notes">
          <ul className="space-y-2">
            {goalNotes.map((m) => (
              <li key={m.id} className="text-sm">
                <div className="truncate text-zinc-700">{m.title}</div>
                <div className="line-clamp-2 text-[11px] leading-snug text-zinc-400">
                  {m.content}
                </div>
              </li>
            ))}
          </ul>
        </Column>
      </div>

      {/* Hero footer */}
      <div className="mt-8 flex items-center justify-between border-t border-zinc-100 pt-5">
        <div className="text-xs text-zinc-400">
          Deadline {new Date(goal.deadline).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
        </div>
        <div className="flex gap-1.5">
          <button className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50">
            Edit
          </button>
          <button className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50">
            Pause
          </button>
          <button className="rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-zinc-700">
            Add task
          </button>
        </div>
      </div>
    </section>
  );
}

function SmallGoalCard({
  goal,
  onClick,
}: {
  goal: Goal;
  onClick: () => void;
}) {
  const p = progress(goal.id);
  const d = daysUntil(goal.deadline);
  return (
    <button
      onClick={onClick}
      className="rounded-lg border border-zinc-200 bg-white p-5 text-left transition-colors hover:border-zinc-300"
    >
      <div className="flex items-center gap-1.5">
        <Target size={11} className="text-zinc-400" strokeWidth={2} />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          {goal.status}
        </span>
      </div>
      <div className="mt-1.5 text-sm font-medium text-zinc-900">
        {goal.title}
      </div>
      <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
        {goal.why_it_matters}
      </p>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-zinc-100">
        <div
          className="h-full bg-zinc-700"
          style={{ width: `${p.pct}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400 tabular-nums">
        <span>
          {p.done}/{p.total} tasks
        </span>
        <span>{d > 0 ? `${d}d left` : `${Math.abs(d)}d over`}</span>
      </div>
    </button>
  );
}

function Column({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-zinc-400">{children}</div>;
}
