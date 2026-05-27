"use client";

import { useMemo, useState } from "react";
import { PageShell } from "../components/Shell";

const STARTING_MRR = 189;
const WEEKLY_MRR_GROWTH = 42;

const WHILE_AWAY = [
  { value: "5", label: "tasks completed" },
  { value: "2", label: "decisions needed" },
  { value: "33", label: "leads found" },
  { value: "1", label: "experiment ready to launch" },
  { value: "4h", label: "of founder work saved" },
];

const TRACTION_METRICS = [
  { label: "Leads Contacted", value: "128", delta: "+33 this week" },
  { label: "Qualified Replies", value: "19", delta: "+7 this week" },
  { label: "Calls Booked", value: "6", delta: "+2 this week" },
  { label: "Landing Conversion", value: "6.8%", delta: "+1.1% this week" },
];

const SPEND_BREAKDOWN = [
  { area: "Research Agent", amount: 124.5 },
  { area: "Growth Agent", amount: 102.2 },
  { area: "Engineering Agent", amount: 93.8 },
  { area: "Design Agent", amount: 58.1 },
  { area: "Sales Agent", amount: 50.1 },
];

const REVENUE_BREAKDOWN = [
  { source: "Design Partners", amount: 110.0 },
  { source: "Pilot Subscriptions", amount: 59.4 },
  { source: "Advisory Calls", amount: 20.0 },
];

const WEEKLY_MRR = [96, 108, 122, 135, 148, 166, 189];

const BOARD_MEETING = {
  tried: [
    "Ran cold outreach to founder ICP with 3 message angles",
    "Published revised landing page with clarity-first hero",
    "Interviewed responders to identify top objections",
  ],
  worked: [
    "Specific ROI language increased reply quality",
    "Founder-to-founder tone outperformed generic startup copy",
  ],
  failed: [
    "Broad audience targeting diluted conversion quality",
    "Long-form first-touch email lowered response rate",
  ],
  recommends: [
    "Focus next sprint on one wedge: solo technical founders",
    "Ship tighter landing page v3 with one proof loop",
    "Run 25 more outreach messages with winning variant",
  ],
  needsFromYou: [
    "Approve ICP focus: indie hackers vs agencies",
    "Approve sending next outreach batch",
    "Approve headline direction for landing v3",
  ],
};

export default function DashboardPage() {
  const [freedomGoal, setFreedomGoal] = useState(3000);
  const mrr = STARTING_MRR;
  const maxMRR = Math.max(...WEEKLY_MRR);
  const progressPct = Math.min(100, Math.round((mrr / freedomGoal) * 100));
  const progressPctExact = Math.min(100, (mrr / freedomGoal) * 100);
  const weeksToGoal = WEEKLY_MRR_GROWTH > 0 ? Math.max(0, (freedomGoal - mrr) / WEEKLY_MRR_GROWTH) : 0;
  const daysToGoal = Math.ceil(weeksToGoal * 7);
  const netBurn = useMemo(() => {
    const spent = SPEND_BREAKDOWN.reduce((a, b) => a + b.amount, 0);
    const rev = REVENUE_BREAKDOWN.reduce((a, b) => a + b.amount, 0);
    return spent - rev;
  }, []);

  return (
    <PageShell
      title="Dashboard"
      context="Traction, momentum, and your path to founder freedom."
    >
      <section className="mb-6 rounded-xl border border-zinc-200 bg-gradient-to-br from-emerald-50 to-white p-6">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
          While You Were Away
        </div>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-zinc-900">
          Your company moved forward.
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
          {WHILE_AWAY.map((item) => (
            <div key={item.label} className="rounded-lg border border-emerald-100 bg-white p-3">
              <div className="text-2xl font-semibold tracking-tight text-zinc-900">{item.value}</div>
              <div className="mt-0.5 text-xs leading-tight text-zinc-600">{item.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Founder Freedom
            </div>
            <div className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900">
              ${mrr.toLocaleString()} <span className="text-zinc-400">/ ${freedomGoal.toLocaleString()} MRR</span>
            </div>
            <div className="mt-1 text-sm text-zinc-600">
              <span className="font-medium text-emerald-700">{progressPctExact.toFixed(1)}%</span> to founder freedom
              {" · "}
              <span className="text-zinc-500">Est. {daysToGoal} days at current weekly growth rate</span>
            </div>
          </div>
          <div className="w-full max-w-sm">
            <label className="text-xs text-zinc-500">Set monthly freedom goal</label>
            <input
              type="range"
              min={500}
              max={10000}
              step={100}
              value={freedomGoal}
              onChange={(e) => setFreedomGoal(Number(e.target.value))}
              className="mt-1 w-full"
            />
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progressPct}%` }} />
        </div>
      </section>

      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        Traction Detail
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {TRACTION_METRICS.map((m) => (
          <section key={m.label} className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              {m.label}
            </div>
            <div className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
              {m.value}
            </div>
            <div className="mt-1 text-xs text-zinc-500">{m.delta}</div>
          </section>
        ))}
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Net Burn
          </div>
          <div className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
            ${netBurn.toFixed(2)}
          </div>
          <div className="mt-1 text-xs text-zinc-500">Money spent minus revenue earned</div>
        </section>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Spend Breakdown
          </div>
          <ul className="mt-3 space-y-2">
            {SPEND_BREAKDOWN.map((row) => (
              <li key={row.area} className="flex items-center justify-between rounded-md border border-zinc-100 px-3 py-2">
                <span className="text-sm text-zinc-700">{row.area}</span>
                <span className="text-sm font-medium text-zinc-900">${row.amount.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Revenue Breakdown
          </div>
          <ul className="mt-3 space-y-2">
            {REVENUE_BREAKDOWN.map((row) => (
              <li key={row.source} className="flex items-center justify-between rounded-md border border-zinc-100 px-3 py-2">
                <span className="text-sm text-zinc-700">{row.source}</span>
                <span className="text-sm font-medium text-zinc-900">${row.amount.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 lg:col-span-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            7-Day MRR Momentum
          </div>
          <div className="mt-4 flex h-36 items-end gap-2">
            {WEEKLY_MRR.map((v, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-sm bg-emerald-500/85"
                  style={{ height: `${Math.max(8, (v / maxMRR) * 100)}%` }}
                />
                <span className="text-[10px] text-zinc-400">D{i + 1}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 lg:col-span-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Weekly Board Meeting
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            What the company tried, what worked, what failed, and what it needs from you.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <BoardColumn title="What We Tried" items={BOARD_MEETING.tried} />
            <BoardColumn title="What Worked" items={BOARD_MEETING.worked} />
            <BoardColumn title="What Failed" items={BOARD_MEETING.failed} />
            <BoardColumn title="What We Recommend" items={BOARD_MEETING.recommends} />
          </div>

          <div className="mt-4 rounded-md border border-zinc-100 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Needs From You
            </div>
            <ul className="mt-2 space-y-1.5">
              {BOARD_MEETING.needsFromYou.map((item) => (
                <li key={item} className="text-sm text-zinc-700">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </PageShell>
  );
}

function BoardColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border border-zinc-100 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        {title}
      </div>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="text-sm text-zinc-700">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
