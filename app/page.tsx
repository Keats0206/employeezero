"use client";

import { useMemo, useState } from "react";
import {
  Check,
  CornerUpLeft,
  FileText,
  HelpCircle,
  Lightbulb,
  Pause,
  X,
  Archive as ArchiveIcon,
  Clock,
} from "lucide-react";
import { buildInbox, timeAgo, type InboxItem, type InboxKind } from "./lib/inbox";
import { goals } from "./lib/fixtures";

const KIND_META: Record<
  InboxKind,
  { label: string; icon: typeof Check; color: string }
> = {
  approval: { label: "Approval", icon: Check, color: "text-emerald-500" },
  revision: { label: "Revision", icon: CornerUpLeft, color: "text-violet-500" },
  new_artifact: { label: "New", icon: FileText, color: "text-blue-500" },
  question: { label: "Question", icon: HelpCircle, color: "text-amber-500" },
  blocked: { label: "Blocked", icon: Pause, color: "text-zinc-400" },
  proposal: { label: "Proposal", icon: Lightbulb, color: "text-pink-500" },
};

type Filter = "inbox" | "snoozed" | "archived";

export default function InboxPage() {
  const all = useMemo(() => buildInbox(), []);
  const [handled, setHandled] = useState<
    Record<string, "snoozed" | "archived" | undefined>
  >({});
  const [filter, setFilter] = useState<Filter>("inbox");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const activeGoal = goals.find((g) => g.active) ?? goals[0];
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const items = all.filter((it) => {
    const s = handled[it.id];
    if (filter === "inbox") return !s;
    if (filter === "snoozed") return s === "snoozed";
    return s === "archived";
  });

  const counts = {
    inbox: all.filter((it) => !handled[it.id]).length,
    snoozed: all.filter((it) => handled[it.id] === "snoozed").length,
    archived: all.filter((it) => handled[it.id] === "archived").length,
  };

  const selected = items.find((it) => it.id === selectedId) ?? items[0];

  function setStatus(id: string, s: "snoozed" | "archived" | undefined) {
    setHandled((h) => ({ ...h, [id]: s }));
  }

  return (
    <>
      {/* Header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
            Inbox
          </h1>
          <p className="mt-1 text-sm text-zinc-500">{today}</p>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wider text-zinc-400">
            Current goal
          </div>
          <div className="mt-0.5 max-w-xs truncate text-sm text-zinc-700">
            {activeGoal.title}
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="mb-4 flex items-center gap-5 border-b border-zinc-100 text-sm">
        {([
          ["inbox", "Inbox"],
          ["snoozed", "Snoozed"],
          ["archived", "Archived"],
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

      {/* Two-pane layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* List */}
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          {items.length === 0 ? (
            <EmptyState filter={filter} />
          ) : (
            <ul className="divide-y divide-zinc-100">
              {items.map((it) => (
                <Row
                  key={it.id}
                  item={it}
                  selected={selected?.id === it.id}
                  onSelect={() => setSelectedId(it.id)}
                  onSnooze={() => setStatus(it.id, "snoozed")}
                  onArchive={() => setStatus(it.id, "archived")}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Detail */}
        <aside className="hidden lg:block">
          {selected ? (
            <Detail
              item={selected}
              onArchive={() => setStatus(selected.id, "archived")}
              onSnooze={() => setStatus(selected.id, "snoozed")}
            />
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-400">
              Inbox zero ✓
            </div>
          )}
        </aside>
      </div>

      {/* Footer hints */}
      <div className="mt-6 flex items-center justify-between text-[11px] text-zinc-400">
        <div>
          <Kbd>a</Kbd> approve · <Kbd>r</Kbd> reject · <Kbd>e</Kbd> revise ·{" "}
          <Kbd>s</Kbd> snooze · <Kbd>[</Kbd> archive
        </div>
        <div>
          {counts.snoozed} snoozed · {counts.archived} archived
        </div>
      </div>
    </>
  );
}

function Row({
  item,
  selected,
  onSelect,
  onSnooze,
  onArchive,
}: {
  item: InboxItem;
  selected: boolean;
  onSelect: () => void;
  onSnooze: () => void;
  onArchive: () => void;
}) {
  const meta = KIND_META[item.kind];
  const Icon = meta.icon;
  return (
    <li
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
        <div className="mt-0.5 truncate text-sm text-zinc-500">
          {item.subtitle}
        </div>
        <div className="mt-1 truncate text-xs text-zinc-400">{item.meta}</div>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-xs tabular-nums text-zinc-400">
          {timeAgo(item.created_at)}
        </span>
        <div className="ml-1 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <IconBtn
            label="Snooze"
            onClick={(e) => {
              e.stopPropagation();
              onSnooze();
            }}
          >
            <Clock size={13} />
          </IconBtn>
          <IconBtn
            label="Archive"
            onClick={(e) => {
              e.stopPropagation();
              onArchive();
            }}
          >
            <ArchiveIcon size={13} />
          </IconBtn>
        </div>
      </div>
    </li>
  );
}

function Detail({
  item,
  onArchive,
  onSnooze,
}: {
  item: InboxItem;
  onArchive: () => void;
  onSnooze: () => void;
}) {
  const meta = KIND_META[item.kind];
  return (
    <div className="sticky top-6 rounded-lg border border-zinc-200 bg-white">
      <div className="border-b border-zinc-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider ${meta.color}`}
          >
            {meta.label}
          </span>
          <span className="text-xs text-zinc-400">
            · {timeAgo(item.created_at)} ago
          </span>
        </div>
        <h3 className="mt-1.5 text-base font-medium text-zinc-900">
          {item.title}
        </h3>
        <p className="mt-1 text-sm text-zinc-500">{item.subtitle}</p>
        <p className="mt-2 text-xs text-zinc-400">{item.meta}</p>
      </div>

      {item.options && (
        <div className="border-b border-zinc-100 px-5 py-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Choose one
          </div>
          <div className="flex flex-wrap gap-1.5">
            {item.options.map((o) => (
              <button
                key={o}
                onClick={() => console.log("answer", item.id, o)}
                className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
              >
                {o}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border-b border-zinc-100 px-5 py-4">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          Reply
        </div>
        <textarea
          rows={3}
          placeholder="Steer the agent…"
          className="w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none placeholder:text-zinc-400 focus:border-zinc-400"
        />
      </div>

      <div className="flex items-center justify-between gap-2 px-5 py-3">
        <div className="flex gap-1.5">
          <button
            onClick={onSnooze}
            className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
          >
            Snooze
          </button>
          <button
            onClick={onArchive}
            className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
          >
            Archive
          </button>
        </div>
        <div className="flex gap-1.5">
          <button className="flex items-center gap-1 rounded-md border border-zinc-200 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50">
            <X size={12} />
            Reject
          </button>
          <button className="flex items-center gap-1 rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-zinc-700">
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
  const map: Record<Filter, string> = {
    inbox: "Inbox zero. Nice. The agent will check in tomorrow morning.",
    snoozed: "Nothing snoozed.",
    archived: "Nothing archived yet.",
  };
  return (
    <div className="px-6 py-16 text-center text-sm text-zinc-400">
      {map[filter]}
    </div>
  );
}
