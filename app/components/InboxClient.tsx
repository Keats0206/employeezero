"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Check,
  FileText,
  HelpCircle,
  Pause,
  Archive as ArchiveIcon,
  Clock,
  Sparkles,
  Pencil,
  MessageSquare,
  EyeOff,
} from "lucide-react";
import type { InboxItem, InboxKind } from "../lib/inbox";
import { timeAgo } from "../lib/inbox";

const KIND_META: Record<
  InboxKind,
  { label: string; icon: typeof Check; color: string }
> = {
  approval: { label: "Approval", icon: Check, color: "text-emerald-500" },
  revision: { label: "Review", icon: FileText, color: "text-violet-500" },
  new_artifact: { label: "Notice", icon: FileText, color: "text-blue-500" },
  question: { label: "Question", icon: HelpCircle, color: "text-amber-500" },
  blocked: { label: "Blocked", icon: Pause, color: "text-zinc-400" },
  proposal: { label: "Proposal", icon: Sparkles, color: "text-pink-500" },
};

type Filter = "requires_action" | "idle" | "busy" | "done";

export function InboxClient({
  initialItems,
  activeGoalTitle,
}: {
  initialItems: InboxItem[];
  activeGoalTitle: string;
}) {
  const [isPending] = useTransition();
  const [feed, setFeed] = useState<InboxItem[]>(initialItems);
  const [filter, setFilter] = useState<Filter>("requires_action");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, Filter | undefined>>({});

  const today = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    []
  );

  const items = feed.filter((it) => {
    const state = overrides[it.id] ?? it.state;
    return state === filter;
  });

  const counts = {
    requires_action: feed.filter(
      (it) => (overrides[it.id] ?? it.state) === "requires_action"
    ).length,
    idle: feed.filter((it) => (overrides[it.id] ?? it.state) === "idle").length,
    busy: feed.filter((it) => (overrides[it.id] ?? it.state) === "busy").length,
    done: feed.filter((it) => (overrides[it.id] ?? it.state) === "done").length,
  };

  const selected = items.find((it) => it.id === selectedId) ?? items[0];

  async function setStatus(item: InboxItem, s: "approved" | "rejected") {
    // UI prototype mode: no backend mutation.
    if (s === "approved") setVisualState(item, "done");
    if (s === "rejected") setVisualState(item, "idle");
  }

  function setVisualState(item: InboxItem, next: Filter) {
    setOverrides((h) => ({ ...h, [item.id]: next }));
  }

  async function runDailyOperator() {
    setRunning(true);
    try {
      const now = new Date();
      const ts = now.toISOString();
      const seed = now.getTime().toString(36).slice(-6);
      const mocks: InboxItem[] = [
        {
          id: `mock_${seed}_1`,
          kind: "proposal",
          state: "requires_action",
          interrupt_type: "question",
          agent: "Research Agent",
          input_needed: "Pick one positioning angle",
          title: "Choose launch channel for demo",
          subtitle: "I found three options with different speed vs. quality tradeoffs.",
          meta: `Mission: ${activeGoalTitle}`,
          created_at: ts,
          source: "artifact",
          source_id: `mock_artifact_${seed}_1`,
        },
        {
          id: `mock_${seed}_2`,
          kind: "approval",
          state: "requires_action",
          interrupt_type: "approval",
          agent: "Growth Agent",
          input_needed: "Approve sending these 25 emails?",
          title: "Approve draft: founder outreach email",
          subtitle: "Draft is ready; I need approval before sending.",
          meta: `Mission: ${activeGoalTitle}`,
          created_at: ts,
          source: "approval",
          source_id: `mock_approval_${seed}_2`,
        },
      ];
      setFeed((prev) => [...mocks, ...prev]);
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
            Decision Inbox
          </h1>
          <p className="mt-1 text-sm text-zinc-500">{today}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-zinc-400">
              Active mission
            </div>
            <div className="mt-0.5 max-w-xs truncate text-sm text-zinc-700">
              {activeGoalTitle}
            </div>
          </div>
          <button
            onClick={runDailyOperator}
            disabled={running}
            className="flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
          >
            <Sparkles size={12} className="text-pink-500" />
            {running ? "Running..." : "Run Agent Simulation"}
          </button>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-5 border-b border-zinc-100 text-sm">
        {([
          ["requires_action", "Needs Decision"],
          ["idle", "Idle"],
          ["busy", "Busy"],
          ["done", "Resolved"],
        ] as [Filter, string][]).map(([key, label]) => {
          const active = filter === key;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`-mb-px flex items-center gap-1.5 border-b-2 pb-2.5 transition-colors ${
                active
                  ? "border-zinc-900 text-zinc-900"
                  : "border-transparent text-zinc-500 hover:text-zinc-900"
              }`}
            >
              {label}
              <span
                className={`tabular-nums text-xs ${
                  active ? "text-zinc-500" : "text-zinc-400"
                }`}
              >
                {counts[key]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        {items.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <ul className="divide-y divide-zinc-100">
            {items.map((it) => {
              const expanded = selected?.id === it.id;
              return (
                <li key={it.id}>
                  <Row
                    item={it}
                    selected={expanded}
                    onSelect={() => setSelectedId(expanded ? null : it.id)}
                    onIdle={() => setVisualState(it, "idle")}
                    onDone={() => setVisualState(it, "done")}
                  />
                  {expanded && (
                    <div className="border-t border-zinc-100 bg-zinc-50/40 px-4 py-4">
                      <DetailInline
                        item={it}
                        onAccept={async () => {
                          await setStatus(it, "approved");
                          setVisualState(it, "done");
                        }}
                        onRespond={() => setVisualState(it, "busy")}
                        onIgnore={() => setVisualState(it, "idle")}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between text-[11px] text-zinc-400">
        <div>
          <Kbd>a</Kbd> approve · <Kbd>x</Kbd> reject · <Kbd>e</Kbd> edit · <Kbd>r</Kbd> redirect
        </div>
        <div>
          {counts.requires_action} pending decisions · {counts.busy} in progress
          {isPending && " · refreshing..."}
        </div>
      </div>
    </>
  );
}

function Row({
  item,
  selected,
  onSelect,
  onIdle,
  onDone,
}: {
  item: InboxItem;
  selected: boolean;
  onSelect: () => void;
  onIdle: () => void;
  onDone: () => void;
}) {
  const meta = KIND_META[item.kind];
  const Icon = meta.icon;
  return (
    <div
      onClick={onSelect}
      className={`group flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors ${
        selected ? "bg-zinc-50" : "hover:bg-zinc-50"
      }`}
    >
      <div className="mt-0.5">
        <Icon size={15} strokeWidth={2} className={meta.color} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            {meta.label}
          </span>
          <span className="truncate text-sm font-medium text-zinc-900">
            {item.title}
          </span>
        </div>
        <div className="mt-0.5 text-xs text-zinc-500">
          {item.agent} · input needed: {item.input_needed}
        </div>
        <div className="mt-0.5 truncate text-sm text-zinc-500">{item.subtitle}</div>
        <div className="mt-1 truncate text-xs text-zinc-400">{item.meta}</div>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-xs tabular-nums text-zinc-400">{timeAgo(item.created_at)}</span>
        <div className="ml-1 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <IconBtn label="Idle" onClick={(e) => { e.stopPropagation(); onIdle(); }}>
            <Clock size={13} />
          </IconBtn>
          <IconBtn label="Done" onClick={(e) => { e.stopPropagation(); onDone(); }}>
            <ArchiveIcon size={13} />
          </IconBtn>
        </div>
      </div>
    </div>
  );
}

function DetailInline({
  item,
  onAccept,
  onRespond,
  onIgnore,
}: {
  item: InboxItem;
  onAccept: () => void;
  onRespond: () => void;
  onIgnore: () => void;
}) {
  const meta = KIND_META[item.kind];
  const needsAction = item.state === "requires_action";

  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <div className="border-b border-zinc-100 px-4 py-4">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${meta.color}`}>
            {meta.label}
          </span>
          <span className="rounded-full border border-zinc-200 px-2 py-0.5 text-[10px] text-zinc-500">
            {item.state.replace("_", " ")}
          </span>
          <span className="text-xs text-zinc-400">· {timeAgo(item.created_at)} ago</span>
        </div>
        <h3 className="mt-1.5 text-base font-medium text-zinc-900">{item.title}</h3>
        <p className="mt-1 text-sm text-zinc-500">{item.subtitle}</p>
        <p className="mt-2 text-xs text-zinc-400">{item.meta}</p>
      </div>

      <div className="border-b border-zinc-100 px-4 py-4">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          Input Needed
        </div>
        <p className="mb-3 text-sm text-zinc-700">{item.input_needed}</p>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Founder Guidance</div>
        <textarea
          rows={3}
          placeholder="Edit or redirect what this agent should do next..."
          className="w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none placeholder:text-zinc-400 focus:border-zinc-400"
        />
      </div>

      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <button
          onClick={onIgnore}
          className="flex items-center gap-1 rounded-md border border-zinc-200 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
        >
          <EyeOff size={12} />
          Defer
        </button>

        <div className="flex gap-1.5">
          <button
            onClick={onRespond}
            className="flex items-center gap-1 rounded-md border border-zinc-200 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
          >
            <MessageSquare size={12} />
            Redirect
          </button>
          <button className="flex items-center gap-1 rounded-md border border-zinc-200 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50">
            <Pencil size={12} />
            Edit
          </button>
          <button
            onClick={() => onIgnore()}
            className="flex items-center gap-1 rounded-md border border-zinc-200 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
          >
            Reject
          </button>
          <button
            onClick={onAccept}
            disabled={!needsAction}
            className="flex items-center gap-1 rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
          >
            <Check size={12} />
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}

function IconBtn({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
    >
      {children}
    </button>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="mx-0.5 rounded border border-zinc-200 bg-white px-1 font-mono text-[10px] text-zinc-600">
      {children}
    </kbd>
  );
}

function EmptyState({ filter }: { filter: Filter }) {
  const label =
    filter === "requires_action"
      ? "No items require action."
      : filter === "idle"
      ? "No idle items."
      : filter === "busy"
      ? "No active work in progress."
      : "Nothing marked done.";

  return (
    <div className="p-10 text-center text-sm text-zinc-400">{label}</div>
  );
}
