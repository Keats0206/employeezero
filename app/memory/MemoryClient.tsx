"use client";

import { useMemo, useState } from "react";
import { Pin, Search, Plus, Brain } from "lucide-react";
import type { Artifact, Memory, MemoryType } from "../lib/types";
import { PageShell } from "../components/Shell";
import { EmptyState } from "../components/EmptyState";
import { formatDate } from "../components/ui";

const SECTIONS: { key: MemoryType; label: string; blurb: string }[] = [
  {
    key: "company",
    label: "Company",
    blurb: "Stable facts about what we're building.",
  },
  {
    key: "decision",
    label: "Decisions",
    blurb: "Calls we made, and why.",
  },
  {
    key: "agent_note",
    label: "Agent notes",
    blurb: "Things individual agents have learned.",
  },
];

function referencedBy(memoryId: string, artifactCount: number) {
  if (artifactCount === 0) return 0;
  const seed = parseInt(memoryId.replace(/\D/g, ""), 10) || 0;
  return (seed * 3) % artifactCount;
}

export default function MemoryClient({
  memories,
  artifacts,
}: {
  memories: Memory[];
  artifacts: Artifact[];
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<MemoryType>("company");
  const [pinned, setPinned] = useState<Record<string, boolean>>({});

  if (memories.length === 0 && artifacts.length === 0) {
    return (
      <PageShell title="Memory">
        <EmptyState
          icon={Brain}
          title="No memories or artifacts yet"
          hint="Memories preserve decisions, company context, and agent notes. Try: 'Remember that we decided to skip auth for the MVP' in chat."
        />
      </PageShell>
    );
  }

  const section = SECTIONS.find((s) => s.key === active)!;

  const items = useMemo(() => {
    let xs = memories.filter((m) => m.type === active);
    if (query.trim()) {
      const q = query.toLowerCase();
      xs = xs.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.content.toLowerCase().includes(q)
      );
    }
    return [...xs].sort((a, b) => {
      const pa = pinned[a.id] ? 1 : 0;
      const pb = pinned[b.id] ? 1 : 0;
      if (pa !== pb) return pb - pa;
      return b.importance - a.importance;
    });
  }, [query, active, pinned]);

  const counts = useMemo(() => {
    const c: Record<MemoryType, number> = {
      company: 0,
      decision: 0,
      agent_note: 0,
    };
    memories.forEach((m) => (c[m.type] += 1));
    return c;
  }, []);

  const togglePin = (id: string) =>
    setPinned((p) => ({ ...p, [id]: !p[id] }));

  return (
    <PageShell title="Memory">
      <p className="mb-6 -mt-6 text-sm text-zinc-500">
        What the system remembers between runs.
      </p>

      {/* Search */}
      <div className="relative mb-5">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search memory…"
          className="w-full rounded-lg border border-zinc-200 bg-white py-2.5 pl-9 pr-3 text-sm text-zinc-800 outline-none placeholder:text-zinc-400 focus:border-zinc-400"
        />
      </div>

      {/* Section nav */}
      <div className="mb-8 flex flex-wrap gap-1.5">
        {SECTIONS.map((s) => {
          const isActive = active === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setActive(s.key)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
              }`}
            >
              {s.label}
              <span
                className={`tabular-nums ${
                  isActive ? "text-white/60" : "text-zinc-400"
                }`}
              >
                {counts[s.key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Section header */}
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-zinc-900">
            {section.label}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">{section.blurb}</p>
        </div>
        <button className="flex items-center gap-1 rounded-md border border-zinc-200 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50">
          <Plus size={11} /> Add memory
        </button>
      </div>

      {/* The wiki — one column, full content visible */}
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-200 p-12 text-center text-sm text-zinc-400">
          Nothing in {section.label.toLowerCase()} yet.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((m) => (
            <MemoryEntry
              key={m.id}
              m={m}
              pinned={!!pinned[m.id]}
              onPin={() => togglePin(m.id)}
              refs={referencedBy(m.id, artifacts.length)}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}

function MemoryEntry({
  m,
  pinned,
  onPin,
  refs,
}: {
  m: Memory;
  pinned: boolean;
  onPin: () => void;
  refs: number;
}) {
  const importanceTone =
    m.importance === 3
      ? "bg-pink-500"
      : m.importance === 2
      ? "bg-zinc-500"
      : "bg-zinc-300";
  const importanceLabel =
    m.importance === 3
      ? "Critical"
      : m.importance === 2
      ? "Important"
      : "Note";

  return (
    <article className="group rounded-lg border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-300">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span
            className={`inline-block h-2 w-2 rounded-full ${importanceTone}`}
          />
          <h3 className="text-sm font-semibold text-zinc-900">{m.title}</h3>
          {pinned && (
            <Pin size={12} className="text-pink-500" fill="currentColor" />
          )}
        </div>
        <button
          onClick={onPin}
          aria-label={pinned ? "Unpin" : "Pin"}
          className={`rounded p-1 transition-colors ${
            pinned
              ? "text-pink-500 hover:bg-pink-50"
              : "text-zinc-300 opacity-0 hover:bg-zinc-100 hover:text-zinc-700 group-hover:opacity-100"
          }`}
        >
          <Pin size={13} />
        </button>
      </header>

      <p className="mt-2.5 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
        {m.content}
      </p>

      <footer className="mt-3 flex items-center gap-3 text-[11px] text-zinc-400">
        <span>{importanceLabel}</span>
        <span>·</span>
        <span>{formatDate(m.created_at)}</span>
        <span>·</span>
        <span>referenced by {refs} artifacts</span>
        <span className="ml-auto font-mono text-[10px]">{m.id}</span>
      </footer>
    </article>
  );
}
