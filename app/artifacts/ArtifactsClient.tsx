"use client";

import { useMemo, useState } from "react";
import { Search, X, ExternalLink, FileText } from "lucide-react";
import type { Artifact, ArtifactType, Goal } from "../lib/types";
import { PageShell } from "../components/Shell";
import { formatDate } from "../components/ui";

const TYPE_LABEL: Record<ArtifactType, string> = {
  daily_brief: "Briefs",
  task_plan: "Plans",
  decision_memo: "Decisions",
  prd: "Specs",
  github_issue: "Issues",
  growth_draft: "Growth",
  design_critique: "Design",
  code_review: "Reviews",
  research_note: "Research",
};

const TYPE_ACCENT: Record<ArtifactType, string> = {
  daily_brief: "bg-blue-50 text-blue-600 border-blue-200",
  task_plan: "bg-violet-50 text-violet-600 border-violet-200",
  decision_memo: "bg-emerald-50 text-emerald-700 border-emerald-200",
  prd: "bg-amber-50 text-amber-700 border-amber-200",
  github_issue: "bg-zinc-100 text-zinc-700 border-zinc-200",
  growth_draft: "bg-pink-50 text-pink-600 border-pink-200",
  design_critique: "bg-rose-50 text-rose-600 border-rose-200",
  code_review: "bg-blue-50 text-blue-700 border-blue-200",
  research_note: "bg-violet-50 text-violet-700 border-violet-200",
};

export default function ArtifactsClient({
  artifacts,
  goals,
}: {
  artifacts: Artifact[];
  goals: Goal[];
}) {
  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState<ArtifactType | null>(null);
  const [reading, setReading] = useState<Artifact | null>(null);

  const presentTypes = useMemo(() => {
    const s = new Set<ArtifactType>();
    artifacts.forEach((a) => s.add(a.type));
    return Array.from(s);
  }, [artifacts]);

  const createdAtMs = (value: unknown): number => {
    if (value instanceof Date) return value.getTime();
    if (typeof value === "string" || typeof value === "number") {
      const ms = new Date(value).getTime();
      return Number.isFinite(ms) ? ms : 0;
    }
    return 0;
  };

  const filtered = useMemo(() => {
    let xs = artifacts;
    if (activeType) xs = xs.filter((a) => a.type === activeType);
    if (query.trim()) {
      const q = query.toLowerCase();
      xs = xs.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.content.toLowerCase().includes(q)
      );
    }
    return [...xs].sort(
      (a, b) => createdAtMs(b.created_at) - createdAtMs(a.created_at)
    );
  }, [artifacts, query, activeType]);

  const grouped = useMemo(() => {
    const map: Record<string, Artifact[]> = {};
    for (const a of filtered) {
      (map[a.type] = map[a.type] || []).push(a);
    }
    return map;
  }, [filtered]);

  const orderedTypes = (Object.keys(grouped) as ArtifactType[]).sort();

  return (
    <PageShell title="Artifacts">
      <p className="mb-6 -mt-6 text-sm text-zinc-500">
        Everything the agents have thought, decided, and produced.
      </p>

      {/* Big search bar */}
      <div className="relative mb-5">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title or content…"
          className="w-full rounded-lg border border-zinc-200 bg-white py-2.5 pl-9 pr-3 text-sm text-zinc-800 outline-none placeholder:text-zinc-400 focus:border-zinc-400"
        />
      </div>

      {/* Type chips */}
      <div className="mb-8 flex flex-wrap gap-1.5">
        <Chip
          active={activeType === null}
          onClick={() => setActiveType(null)}
          count={artifacts.length}
        >
          All
        </Chip>
        {presentTypes.map((t) => (
          <Chip
            key={t}
            active={activeType === t}
            onClick={() => setActiveType(t)}
            count={artifacts.filter((a) => a.type === t).length}
          >
            {TYPE_LABEL[t]}
          </Chip>
        ))}
      </div>

      {/* Grouped sections */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-200 p-12 text-center text-sm text-zinc-400">
          Nothing matches.
        </div>
      ) : (
        <div className="space-y-10">
          {orderedTypes.map((t) => (
            <section key={t}>
              <div className="mb-3 flex items-baseline gap-2">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-700">
                  {TYPE_LABEL[t]}
                </h2>
                <span className="text-xs text-zinc-400 tabular-nums">
                  {grouped[t].length}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {grouped[t].map((a) => (
                  <ArtifactCard key={a.id} a={a} onOpen={() => setReading(a)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Reading mode */}
      {reading && (
        <Reader
          artifact={reading}
          goals={goals}
          onClose={() => setReading(null)}
        />
      )}
    </PageShell>
  );
}

function ArtifactCard({
  a,
  onOpen,
}: {
  a: Artifact;
  onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      className="group flex h-full flex-col rounded-lg border border-zinc-200 bg-white p-4 text-left transition-colors hover:border-zinc-300"
    >
      <div className="flex items-center gap-2">
        <span
          className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${TYPE_ACCENT[a.type]}`}
        >
          {TYPE_LABEL[a.type]}
        </span>
        <span className="text-[11px] text-zinc-400">
          {a.created_by_agent}
        </span>
        <span className="ml-auto text-[11px] tabular-nums text-zinc-400">
          {formatDate(a.created_at)}
        </span>
      </div>
      <h3 className="mt-3 text-sm font-medium leading-snug text-zinc-900 group-hover:text-zinc-950">
        {a.title}
      </h3>
      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-zinc-500">
        {a.content}
      </p>
    </button>
  );
}

function Chip({
  children,
  active,
  onClick,
  count,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-zinc-900 bg-zinc-900 text-white"
          : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
      }`}
    >
      {children}
      <span
        className={`tabular-nums ${active ? "text-white/60" : "text-zinc-400"}`}
      >
        {count}
      </span>
    </button>
  );
}

function Reader({
  artifact,
  goals,
  onClose,
}: {
  artifact: Artifact;
  goals: Goal[];
  onClose: () => void;
}) {
  const goal = goals.find((g) => g.id === artifact.goal_id);
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-zinc-900/30 px-4 py-12 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-xl border border-zinc-200 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-7 py-4">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-zinc-500" />
            <span
              className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${TYPE_ACCENT[artifact.type]}`}
            >
              {TYPE_LABEL[artifact.type]}
            </span>
            <span className="text-xs text-zinc-400">
              {artifact.created_by_agent} · {formatDate(artifact.created_at)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          >
            <X size={15} />
          </button>
        </div>
        <article className="px-7 py-7">
          <h1 className="text-xl font-semibold leading-snug tracking-tight text-zinc-900">
            {artifact.title}
          </h1>
          {goal && (
            <p className="mt-2 text-xs text-zinc-400">
              Related to <span className="text-zinc-600">{goal.title}</span>
            </p>
          )}
          <div className="prose prose-sm prose-zinc mt-6 max-w-none">
            <p className="whitespace-pre-wrap text-[15px] leading-7 text-zinc-700">
              {artifact.content}
            </p>
          </div>
          {artifact.url && (
            <a
              href={artifact.url}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
            >
              {artifact.url}
              <ExternalLink size={11} />
            </a>
          )}
        </article>
        <div className="flex items-center justify-between border-t border-zinc-100 px-7 py-3">
          <span className="font-mono text-[10px] text-zinc-400">
            {artifact.id}
          </span>
          <div className="flex gap-1.5">
            <button className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50">
              Pin
            </button>
            <button className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50">
              Copy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
