"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Clock3, CircleX, Sparkles, ShieldCheck, AlertTriangle, Inbox as InboxIcon } from "lucide-react";
import { INBOX_DECISIONS, WORK_TASKS, type InboxDecision } from "../lib/prototype";
import { EmptyState } from "../components/EmptyState";
import Link from "next/link";

type Filter = "open" | "resolved" | "deferred";
type Triage = "all" | "blocking" | "approvals" | "recommendations";

const TYPE_LABEL: Record<InboxDecision["type"], string> = {
  approval: "Approval",
  choice: "Choice",
  review: "Review",
  escalation: "Escalation",
  recommendation: "Recommendation",
};

export default function InboxPageClient() {
  const [items, setItems] = useState(INBOX_DECISIONS);
  const [filter, setFilter] = useState<Filter>("open");
  const [triage, setTriage] = useState<Triage>("all");
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? "");

  const inTriage = (i: InboxDecision) => {
    if (triage === "all") return true;
    if (triage === "blocking") return i.blocking;
    if (triage === "approvals") return i.type === "approval" && !i.blocking;
    if (triage === "recommendations") return i.type === "recommendation" || i.strategic;
    return true;
  };

  if (items.length === 0) {
    return (
      <EmptyState
        icon={InboxIcon}
        title="Nothing in your inbox"
        hint="When an agent needs an approval, a choice, or a review, it shows up here. Try: 'Propose a tweet for the launch' in chat."
      />
    );
  }

  const filtered = items.filter((i) => i.state === filter && (filter !== "open" || inTriage(i)));
  const selected = filtered.find((i) => i.id === selectedId) ?? filtered[0] ?? null;

  const summary = useMemo(() => {
    const open = items.filter((i) => i.state === "open");
    const blocking = open.filter((i) => i.blocking).length;
    const approvals = open.filter((i) => i.type === "approval" && !i.blocking).length;
    const recommendations = open.filter((i) => i.type === "recommendation" || i.strategic).length;
    const lowRisk = open.filter((i) => i.lowRiskApproval).length;
    const running = WORK_TASKS.filter((t) => t.status === "running").length;
    return { blocking, approvals, recommendations, lowRisk, running, open: open.length };
  }, [items]);

  function patch(id: string, next: Partial<InboxDecision>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...next } : i)));
  }

  function approveAllLowRisk() {
    setItems((prev) =>
      prev.map((i) => (i.state === "open" && i.lowRiskApproval ? { ...i, state: "resolved" } : i)),
    );
  }

  function reviewBlocking() {
    setFilter("open");
    setTriage("blocking");
    const firstBlocking = items.find((i) => i.state === "open" && i.blocking);
    if (firstBlocking) setSelectedId(firstBlocking.id);
  }

  return (
    <div>
      <header className="mb-6 border-b border-zinc-200 pb-5">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Today</h1>
        <p className="mt-1 text-sm text-zinc-600">What needs you right now.</p>
      </header>

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TriageChip
          tone="red"
          label="decisions blocking work"
          count={summary.blocking}
          active={filter === "open" && triage === "blocking"}
          onClick={() => {
            setFilter("open");
            setTriage("blocking");
          }}
        />
        <TriageChip
          tone="amber"
          label="approvals ready"
          count={summary.approvals}
          active={filter === "open" && triage === "approvals"}
          onClick={() => {
            setFilter("open");
            setTriage("approvals");
          }}
        />
        <TriageChip
          tone="gray"
          label="agent tasks running"
          count={summary.running}
          href="/work"
        />
        <TriageChip
          tone="blue"
          label="recommended pivots"
          count={summary.recommendations}
          active={filter === "open" && triage === "recommendations"}
          onClick={() => {
            setFilter("open");
            setTriage("recommendations");
          }}
        />
      </section>

      <div className="mb-5 flex flex-wrap items-center gap-2 border-y border-zinc-200 py-3">
        <button
          onClick={approveAllLowRisk}
          disabled={summary.lowRisk === 0}
          className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 hover:border-emerald-500 disabled:opacity-40"
        >
          <ShieldCheck size={13} />
          Approve all low-risk{summary.lowRisk > 0 ? ` (${summary.lowRisk})` : ""}
        </button>
        <button
          onClick={reviewBlocking}
          disabled={summary.blocking === 0}
          className="inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-800 hover:border-rose-500 disabled:opacity-40"
        >
          <AlertTriangle size={13} />
          Review blocking items{summary.blocking > 0 ? ` (${summary.blocking})` : ""}
        </button>
        <span className="ml-auto text-[11px] text-zinc-500">
          {summary.open} open · agents pause on uncertainty, resume on your call
        </span>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["open", "resolved", "deferred"] as Filter[]).map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-full border px-3 py-1 text-xs capitalize ${
              filter === key ? "border-zinc-900 text-zinc-900" : "border-zinc-300 text-zinc-500"
            }`}
          >
            {key}
          </button>
        ))}
        {filter === "open" && triage !== "all" && (
          <button
            onClick={() => setTriage("all")}
            className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-500 hover:border-zinc-500"
          >
            Clear filter: {triage}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_420px]">
        <div className="border border-zinc-200">
          {filtered.length === 0 ? (
            <div className="p-6 text-sm text-zinc-500">No items in this state.</div>
          ) : (
            <ul>
              {filtered.map((item) => (
                <li
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`cursor-pointer border-b border-zinc-100 px-4 py-3 last:border-b-0 ${selected?.id === item.id ? "bg-zinc-50/60" : "hover:bg-zinc-50/40"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-zinc-500">{TYPE_LABEL[item.type]}</span>
                    <span className={`text-xs ${riskColor(item.risk)}`}>{item.risk}</span>
                  </div>
                  <div className="mt-1 text-sm text-zinc-900">{item.title}</div>
                  <div className="mt-1 text-xs text-zinc-500">From: {item.agent}</div>
                  <div className="mt-1 text-xs text-zinc-500">{item.whyItMatters}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside>
          {selected ? (
            <div className="border border-zinc-200">
              <section className="border-b border-zinc-200 px-5 py-4">
                <div className="text-[11px] uppercase tracking-wider text-zinc-500">{TYPE_LABEL[selected.type]}</div>
                <h2 className="mt-1 text-base font-semibold text-zinc-900">{selected.title}</h2>
                <p className="mt-1 text-xs text-zinc-500">Owner: {selected.agent}</p>
                <p className="mt-2 text-sm text-zinc-700">{selected.whyItMatters}</p>
                <p className="mt-1 text-sm text-zinc-600">Recommendation: {selected.recommendation}</p>
              </section>

              <Section title="Preview" body={selected.preview} />
              <ListSection title="Evidence" items={selected.evidence} />
              {selected.options && <ListSection title="Options" items={selected.options} />}
              <ListSection title="Downstream Impact" items={selected.downstreamImpact} />

              <div className="flex flex-wrap gap-2 px-5 py-4">
                <Action
                  icon={<CheckCircle2 size={13} className="text-emerald-600" />}
                  onClick={() => patch(selected.id, { state: "resolved" })}
                >
                  Approve
                </Action>
                <Action
                  icon={<Clock3 size={13} className="text-amber-600" />}
                  onClick={() => patch(selected.id, { state: "deferred" })}
                >
                  Snooze
                </Action>
                <Action
                  icon={<CircleX size={13} className="text-rose-600" />}
                  onClick={() => patch(selected.id, { state: "deferred", recommendation: "Rejected by founder" })}
                >
                  Reject
                </Action>
                <Action
                  icon={<Sparkles size={13} className="text-violet-600" />}
                  onClick={() => patch(selected.id, { recommendation: "Requested sharper options from agent" })}
                >
                  Revise
                </Action>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-zinc-300 p-6 text-sm text-zinc-500">No item selected.</div>
          )}
        </aside>
      </div>
    </div>
  );
}

function riskColor(risk: "low" | "medium" | "high") {
  if (risk === "high") return "text-rose-700";
  if (risk === "medium") return "text-amber-700";
  return "text-emerald-700";
}

function TriageChip({
  label,
  count,
  tone,
  active,
  onClick,
  href,
}: {
  label: string;
  count: number;
  tone: "red" | "amber" | "gray" | "blue";
  active?: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const toneClass = {
    red: "border-rose-300 bg-rose-50 text-rose-900",
    amber: "border-amber-300 bg-amber-50 text-amber-900",
    gray: "border-zinc-300 bg-zinc-50 text-zinc-800",
    blue: "border-blue-300 bg-blue-50 text-blue-900",
  }[tone];
  const ring = active ? "ring-2 ring-zinc-900 ring-offset-1" : "";
  const body = (
    <div className={`flex items-baseline gap-2 rounded-md border px-3 py-2.5 text-left ${toneClass} ${ring} hover:brightness-95`}>
      <span className="text-2xl font-semibold leading-none">{count}</span>
      <span className="text-xs leading-snug">{label}</span>
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block">
        {body}
      </Link>
    );
  }
  return (
    <button onClick={onClick} className="block w-full">
      {body}
    </button>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <section className="border-b border-zinc-200 px-5 py-4">
      <h3 className="text-[11px] uppercase tracking-wider text-zinc-500">{title}</h3>
      <p className="mt-2 text-sm text-zinc-800">{body}</p>
    </section>
  );
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="border-b border-zinc-200 px-5 py-4">
      <h3 className="text-[11px] uppercase tracking-wider text-zinc-500">{title}</h3>
      <ul className="mt-2 space-y-1 text-sm text-zinc-800">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function Action({
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
