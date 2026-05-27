"use client";

import { useMemo, useState } from "react";
import { Check, X, CornerUpLeft, GitBranch, Bot, ChevronDown } from "lucide-react";
import type { TaskStatus, Task, Goal } from "../lib/types";
import {
  DetailSection,
  DetailShell,
  EmptyDetail,
  FooterHints,
  PageShell,
  ReplyBox,
  TwoPane,
} from "../components/Shell";

const GROUPS: { key: TaskStatus; label: string; color: string; defaultOpen: boolean }[] = [
  { key: "needs_review", label: "Needs review", color: "bg-amber-500", defaultOpen: true },
  { key: "in_progress", label: "In progress", color: "bg-violet-500", defaultOpen: true },
  { key: "approved", label: "Approved", color: "bg-blue-500", defaultOpen: true },
  { key: "suggested", label: "Suggested", color: "bg-zinc-400", defaultOpen: true },
  { key: "done", label: "Done", color: "bg-emerald-500", defaultOpen: false },
  { key: "rejected", label: "Rejected", color: "bg-rose-400", defaultOpen: false },
];

const riskColor: Record<string, string> = {
  low: "text-emerald-600",
  medium: "text-amber-600",
  high: "text-rose-600",
};

export default function TasksClient({
  tasks,
  goals,
}: {
  tasks: Task[];
  goals: Goal[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>(
    Object.fromEntries(GROUPS.map((g) => [g.key, g.defaultOpen]))
  );

  const grouped = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const g of GROUPS) {
      map[g.key] = tasks.filter((t) => t.status === g.key);
    }
    return map;
  }, []);

  const flat = GROUPS.flatMap((g) => grouped[g.key]);
  const selected = flat.find((t) => t.id === selectedId) ?? flat[0] ?? null;
  const selectedGoal = selected
    ? goals.find((g) => g.id === selected.goal_id)
    : null;

  return (
    <PageShell title="Tasks">
      <TwoPane
        list={
          <div>
            {GROUPS.map((g) => {
              const items = grouped[g.key];
              if (items.length === 0) return null;
              const isOpen = open[g.key];
              return (
                <div key={g.key} className="border-b border-zinc-100 last:border-b-0">
                  <button
                    onClick={() =>
                      setOpen((o) => ({ ...o, [g.key]: !o[g.key] }))
                    }
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-zinc-50"
                  >
                    <ChevronDown
                      size={13}
                      className={`text-zinc-400 transition-transform ${
                        isOpen ? "" : "-rotate-90"
                      }`}
                    />
                    <span className={`h-2 w-2 rounded-full ${g.color}`} />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-700">
                      {g.label}
                    </span>
                    <span className="text-xs tabular-nums text-zinc-400">
                      {items.length}
                    </span>
                  </button>
                  {isOpen && (
                    <ul className="divide-y divide-zinc-100">
                      {items.map((t) => {
                        const goal = goals.find((x) => x.id === t.goal_id);
                        const isSelected = selected?.id === t.id;
                        return (
                          <li
                            key={t.id}
                            onClick={() => setSelectedId(t.id)}
                            className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 pl-9 transition-colors ${
                              isSelected ? "bg-zinc-50" : "hover:bg-zinc-50"
                            }`}
                          >
                            <span className="font-mono text-[10px] text-zinc-400">
                              {t.id}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-sm text-zinc-900">
                              {t.title}
                            </span>
                            <span className="hidden truncate text-xs text-zinc-500 sm:block">
                              {goal?.title}
                            </span>
                            <span className={`text-xs ${riskColor[t.risk_level]}`}>
                              {t.risk_level}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        }
        detail={
          selected ? (
            <DetailShell
              label={selected.status.replace(/_/g, " ")}
              labelColor={
                (
                  {
                    approved: "text-blue-600",
                    in_progress: "text-violet-600",
                    needs_review: "text-amber-600",
                    done: "text-emerald-600",
                    rejected: "text-rose-600",
                  } as Record<string, string>
                )[selected.status] ?? "text-zinc-500"
              }
              title={selected.title}
              subtitle={selected.description}
              meta={`${selected.id} · ${selected.output_type}`}
              footer={
                <>
                  <div className="flex gap-1.5">
                    <Btn icon={<CornerUpLeft size={12} />}>Revise</Btn>
                    <Btn icon={<GitBranch size={12} />}>Issue</Btn>
                    <Btn icon={<Bot size={12} />}>Run</Btn>
                  </div>
                  <div className="flex gap-1.5">
                    <Btn icon={<X size={12} />}>Reject</Btn>
                    <BtnSolid icon={<Check size={12} />}>Approve</BtnSolid>
                  </div>
                </>
              }
            >
              <DetailSection label="Serves goal">
                <div className="text-sm text-zinc-800">{selectedGoal?.title}</div>
                <div className="mt-0.5 text-xs text-zinc-500">
                  {selectedGoal?.success_metric}
                </div>
              </DetailSection>
              <DetailSection label="Risk">
                <span className={`text-sm ${riskColor[selected.risk_level]}`}>
                  {selected.risk_level}
                </span>
              </DetailSection>
              <ReplyBox placeholder="Steer this task…" />
            </DetailShell>
          ) : (
            <EmptyDetail>No task selected.</EmptyDetail>
          )
        }
      />

      <FooterHints
        hints={[
          { key: "a", label: "approve" },
          { key: "r", label: "reject" },
          { key: "e", label: "revise" },
          { key: "g", label: "issue" },
        ]}
        right={`${tasks.length} tasks total`}
      />
    </PageShell>
  );
}

function Btn({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <button className="flex items-center gap-1 rounded-md border border-zinc-200 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50">
      {icon}
      {children}
    </button>
  );
}

function BtnSolid({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <button className="flex items-center gap-1 rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-zinc-700">
      {icon}
      {children}
    </button>
  );
}
