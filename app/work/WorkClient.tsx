"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CircleDot,
  PlayCircle,
  Clock3,
  OctagonAlert,
  CheckCircle2,
  XCircle,
  ListTodo,
} from "lucide-react";
import { SPRINT, WORK_TASKS, type WorkStatus, type WorkTask } from "../lib/prototype";
import { EmptyState } from "../components/EmptyState";

type Filter = "all" | "active" | "waiting_on_me" | "blocked" | "completed" | "failed";

const STATUS_STYLES: Record<WorkStatus, string> = {
  queued: "border-zinc-200 bg-zinc-50 text-zinc-600",
  running: "border-blue-200 bg-blue-50 text-blue-700",
  waiting: "border-amber-200 bg-amber-50 text-amber-700",
  needs_review: "border-violet-200 bg-violet-50 text-violet-700",
  blocked: "border-rose-200 bg-rose-50 text-rose-700",
  done: "border-emerald-200 bg-emerald-50 text-emerald-700",
  failed: "border-red-200 bg-red-50 text-red-700",
};

const STAT_STYLES = [
  "border-blue-200 bg-blue-50",
  "border-violet-200 bg-violet-50",
  "border-emerald-200 bg-emerald-50",
  "border-rose-200 bg-rose-50",
  "border-amber-200 bg-amber-50",
];

const FILTERS: {
  key: Filter;
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  iconClass: string;
}[] = [
  { key: "all", label: "All", Icon: CircleDot, iconClass: "text-zinc-500" },
  { key: "active", label: "Active", Icon: PlayCircle, iconClass: "text-blue-600" },
  { key: "waiting_on_me", label: "Waiting on me", Icon: Clock3, iconClass: "text-violet-600" },
  { key: "blocked", label: "Blocked", Icon: OctagonAlert, iconClass: "text-rose-600" },
  { key: "completed", label: "Completed", Icon: CheckCircle2, iconClass: "text-emerald-600" },
  { key: "failed", label: "Failed", Icon: XCircle, iconClass: "text-red-600" },
];

function isActiveStatus(status: WorkStatus) {
  return ["queued", "running", "waiting", "needs_review", "blocked"].includes(status);
}

export default function WorkClient() {
  const [tasks] = useState<WorkTask[]>(WORK_TASKS);
  const [filter, setFilter] = useState<Filter>("all");

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={ListTodo}
        title="No work yet"
        hint="Tasks created by you or the operator land here. Try: 'Create a task to draft 3 landing page headlines' in chat."
      />
    );
  }


  const counts = useMemo(() => {
    const active = tasks.filter((t) => isActiveStatus(t.status)).length;
    const waitingOnYou = tasks.filter((t) => t.needsApproval || t.status === "needs_review").length;
    const completed = tasks.filter((t) => t.status === "done").length;
    const blocked = tasks.filter((t) => t.status === "blocked").length;
    const experiments = new Set(tasks.filter((t) => t.experiment).map((t) => t.experiment)).size;
    return { active, waitingOnYou, completed, blocked, experiments };
  }, [tasks]);

  const filtered = useMemo(() => {
    if (filter === "all") return tasks;
    if (filter === "active") return tasks.filter((t) => isActiveStatus(t.status));
    if (filter === "waiting_on_me") return tasks.filter((t) => t.needsApproval || t.status === "needs_review");
    if (filter === "blocked") return tasks.filter((t) => t.status === "blocked");
    if (filter === "completed") return tasks.filter((t) => t.status === "done");
    return tasks.filter((t) => t.status === "failed");
  }, [tasks, filter]);

  return (
    <div>
      <header className="mb-8 border-b border-zinc-200 pb-5">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Mission Control</h1>
        <p className="mt-2 text-sm text-zinc-600">{SPRINT.name}</p>
        <p className="mt-1 text-sm text-zinc-500">Goal: {SPRINT.goal}</p>
        <p className="mt-1 text-sm text-zinc-500">{SPRINT.timebox} · {SPRINT.success}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/inbox" className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-700 hover:border-zinc-500">
            Back to Inbox
          </Link>
          <Link href="/agents/chief-of-staff-cos" className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-700 hover:border-zinc-500">
            Configure Agent Tools
          </Link>
        </div>
      </header>

      <section className="mb-6 rounded-lg border border-zinc-200 bg-gradient-to-br from-zinc-50 to-white p-5">
        <div className="flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500">Today&apos;s brief</div>
          <div className="text-[11px] text-zinc-400">Since you last checked · 4h ago</div>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-zinc-800">
          <span className="font-medium text-zinc-900">Research Agent</span> found 37 likely Lovable users and analyzed 12 customer replies.{" "}
          <span className="font-medium text-zinc-900">Growth Agent</span> drafted 3 outreach sequences — waiting on your approval to send to 50 leads.{" "}
          <span className="font-medium text-zinc-900">Design Agent</span> is blocked until you choose a landing-page positioning angle.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <button
            onClick={() => setFilter("waiting_on_me")}
            className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-800 hover:border-amber-400"
          >
            {counts.waitingOnYou} waiting on you →
          </button>
          <button
            onClick={() => setFilter("blocked")}
            className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-rose-800 hover:border-rose-400"
          >
            {counts.blocked} blocked →
          </button>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-2 gap-3 border-b border-zinc-200 pb-5 text-sm lg:grid-cols-5">
        <Stat label="Active" value={`${counts.active} running`} tone={STAT_STYLES[0]} />
        <Stat label="Waiting on You" value={`${counts.waitingOnYou} approvals`} tone={STAT_STYLES[1]} />
        <Stat label="Completed" value={`${counts.completed} tasks`} tone={STAT_STYLES[2]} />
        <Stat label="Blocked" value={`${counts.blocked} tasks`} tone={STAT_STYLES[3]} />
        <Stat label="Experiments" value={`${counts.experiments} running`} tone={STAT_STYLES[4]} />
      </section>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map(({ key, label, Icon, iconClass }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
              filter === key
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            <Icon
              size={13}
              className={filter === key ? "text-white" : iconClass}
            />
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden border border-zinc-200">
        <table className="w-full text-left text-sm">
          <thead className="text-[11px] uppercase tracking-wider text-zinc-500">
            <tr className="border-b border-zinc-200">
              <th className="px-4 py-3">Task</th>
              <th className="px-4 py-3">Agent</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Goal</th>
              <th className="px-4 py-3">Output</th>
              <th className="px-4 py-3">Approval</th>
              <th className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((task) => (
              <tr key={task.id} className="border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50/60">
                <td className="px-4 py-3 text-zinc-900">
                  <Link href={`/work/${task.id}`} className="hover:underline">
                    {task.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-600">{task.agent}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[task.status]}`}
                  >
                    {task.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3 capitalize text-zinc-600">{task.priority}</td>
                <td className="px-4 py-3 text-zinc-600">{task.linkedGoal}</td>
                <td className="px-4 py-3 text-zinc-600">{task.output}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                      task.needsApproval
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-zinc-200 bg-zinc-50 text-zinc-600"
                    }`}
                  >
                    {task.needsApproval ? "yes" : "no"}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-500">{task.lastUpdate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${tone}`}>
      <div className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 text-sm text-zinc-900">{value}</div>
    </div>
  );
}
