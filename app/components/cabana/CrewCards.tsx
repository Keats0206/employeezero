"use client";

// Per-agent chat cards. The Chief of Staff runs the 6 specialists as tools; each
// returns richly structured data (see app/lib/agents/crew-tools.ts schemas). This
// renders that data as compact, on-brand cards with a few light actions instead of
// the generic key-value dump. One dispatcher (CrewToolCard) + one card per agent.

import { useState } from "react";
import { Copy, Check, ArrowRight, Hammer } from "lucide-react";
import { AGENT_META, AGENT_COLOR, type AgentId } from "@/app/lib/cabana-config";

const SURF = "#23b5d3";

// The tool-part shape the chat passes us (subset of the AI SDK UIMessage part).
type ToolPart = {
  type: string;
  state: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
};

// ─── Shared primitives ──────────────────────────────────────────────────────

function CardShell({ agent, children }: { agent: AgentId; children: React.ReactNode }) {
  const meta = AGENT_META[agent];
  const color = AGENT_COLOR[agent];
  return (
    <div className="rounded-2xl border border-black/10 overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 pt-3 pb-2">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm"
          style={{ background: `${color}1a` }}
        >
          {meta.icon}
        </span>
        <span className="text-sm font-semibold">{meta.name}</span>
        <span className="text-xs text-black/35">{meta.role}</span>
      </div>
      <div className="px-4 pb-4">{children}</div>
    </div>
  );
}

function Chip({ children, tone }: { children: React.ReactNode; tone?: string }) {
  const c = tone ?? SURF;
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ background: `${c}14`, color: c }}
    >
      {children}
    </span>
  );
}

function ChipGroup({ label, items, tone }: { label: string; items?: string[]; tone?: string }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="mt-2.5 first:mt-0">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-black/35">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it, i) => (
          <Chip key={i} tone={tone}>{it}</Chip>
        ))}
      </div>
    </div>
  );
}

// A short labeled list for sentence-length items (pains, questions) that read
// better stacked than as wrapping chips.
function MiniList({ label, items }: { label: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="mt-2.5 first:mt-0">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-black/35">{label}</p>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-sm text-black/75">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ background: SURF }} />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      },
      () => {},
    );
  }
  return (
    <button
      onClick={copy}
      className="shrink-0 inline-flex items-center gap-1 rounded-full border border-black/10 px-2.5 py-1 text-[11px] font-medium text-black/55 transition-colors hover:border-black/25 hover:text-black/80"
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// Primary in-card action button (pill). Used for "Build a page for this", etc.
function ActionButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
      style={{ background: SURF }}
    >
      {children}
    </button>
  );
}

// ─── Per-agent cards ────────────────────────────────────────────────────────

function ScoutCard({ o }: { o: Record<string, unknown> }) {
  return (
    <CardShell agent="scout">
      <MiniList label="Pains" items={o.pains as string[]} />
      <ChipGroup label="Channels" items={o.channels as string[]} />
      <ChipGroup label="Competitors" items={o.competitors as string[]} tone="#304c89" />
      <ChipGroup label="Keywords" items={o.keywords as string[]} tone="#888" />
    </CardShell>
  );
}

function StrategistCard({ o, onSubmit }: { o: Record<string, unknown>; onSubmit: (t: string) => void }) {
  const name = (o.businessName as string) || "Your offer";
  const price = o.price as string | undefined;
  return (
    <CardShell agent="strategist">
      <div className="flex items-start justify-between gap-3">
        <p className="text-base font-bold tracking-tight">{name}</p>
        {price && (
          <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold text-white" style={{ background: "#304c89" }}>
            {price}
          </span>
        )}
      </div>
      {o.offer ? <p className="mt-1.5 text-sm text-black/80">{o.offer as string}</p> : null}
      {o.icp ? <p className="mt-1 text-xs text-black/45">For: {o.icp as string}</p> : null}

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {o.channel ? <Chip tone="#304c89">📍 {o.channel as string}</Chip> : null}
        {o.goal ? <Chip tone="#304c89">🎯 {o.goal as string}</Chip> : null}
      </div>

      {o.firstPriority ? (
        <div className="mt-3 rounded-xl px-3 py-2 text-sm" style={{ background: `${SURF}10` }}>
          <span className="font-semibold" style={{ color: SURF }}>This week: </span>
          <span className="text-black/80">{o.firstPriority as string}</span>
        </div>
      ) : null}

      <div className="mt-3">
        <ActionButton onClick={() => onSubmit("Build the landing page.")}>
          <Hammer size={14} /> Build a page for this
        </ActionButton>
      </div>
    </CardShell>
  );
}

function BuilderCard({ o, onStartBuild }: { o: Record<string, unknown>; onStartBuild: (headline?: string) => void }) {
  const headlines = (o.headline_options as string[]) ?? [];
  const [picked, setPicked] = useState<string | null>(null);

  function choose(h: string) {
    if (picked) return;
    setPicked(h);
    onStartBuild(h);
  }

  return (
    <CardShell agent="builder">
      {o.concept ? <p className="text-sm text-black/80">{o.concept as string}</p> : null}
      {o.angle ? <p className="mt-1 text-xs text-black/45">Angle: {o.angle as string}</p> : null}

      <ChipGroup label="Sections" items={o.sections as string[]} tone="#0a8f48" />

      {headlines.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-black/35">
            Pick a headline to build
          </p>
          <div className="flex flex-col gap-1.5">
            {headlines.map((h, i) => {
              const isPicked = picked === h;
              return (
                <button
                  key={i}
                  onClick={() => choose(h)}
                  disabled={!!picked}
                  className="group flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors disabled:cursor-default"
                  style={
                    isPicked
                      ? { background: `${SURF}14`, borderColor: SURF, color: "#000" }
                      : { borderColor: "rgba(0,0,0,0.12)" }
                  }
                >
                  <span className="text-black/80">{h}</span>
                  {isPicked ? (
                    <Check size={14} className="shrink-0" style={{ color: SURF }} />
                  ) : (
                    <Hammer size={13} className="shrink-0 text-black/20 transition-colors group-hover:text-black/50" />
                  )}
                </button>
              );
            })}
          </div>
          {picked && <p className="mt-2 text-xs text-black/45">Building with “{picked}”…</p>}
        </div>
      )}

      <MiniList label="Open questions" items={o.open_questions as string[]} />
    </CardShell>
  );
}

type QueuedOutreach = {
  name: string;
  title?: string;
  organization?: string;
  channel: "email" | "manual";
  hasContact: boolean;
  preview: string;
};

function SellerCard({ o }: { o: Record<string, unknown> }) {
  // New shape: real outreach queued to the Actions tab. Old shape: messages[].
  const prospects = o.prospects as QueuedOutreach[] | undefined;
  const note = o.note as string | undefined;

  if (Array.isArray(prospects)) {
    return (
      <CardShell agent="seller">
        <div className="flex flex-col gap-2">
          {prospects.map((p, i) => (
            <div key={i} className="rounded-xl border border-black/10 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-black/85">{p.name}</span>
                {p.title && <span className="text-xs text-black/45">{p.title}</span>}
                <span
                  className="ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={p.channel === "email"
                    ? { background: "#0a8f4814", color: "#0a8f48" }
                    : { background: "#00000008", color: "#00000066" }}
                >
                  {p.channel === "email" ? "✉️ email" : "✍️ by hand"}
                </span>
              </div>
              {p.organization && <p className="text-xs text-black/40">{p.organization}</p>}
              <p className="mt-1.5 text-sm text-black/70">{p.preview}</p>
            </div>
          ))}
        </div>
        {note && (
          <div className="mt-3 rounded-xl px-3 py-2 text-xs font-medium" style={{ background: `${SURF}10`, color: SURF }}>
            {note}
          </div>
        )}
      </CardShell>
    );
  }

  // Back-compat: plain drafted messages.
  const messages = (o.messages as string[]) ?? [];
  return (
    <CardShell agent="seller">
      <div className="flex flex-col gap-2">
        {messages.map((m, i) => (
          <div key={i} className="flex items-start gap-2 rounded-xl border border-black/10 px-3 py-2">
            <p className="flex-1 text-sm text-black/80">{m}</p>
            <CopyButton text={m} />
          </div>
        ))}
      </div>
    </CardShell>
  );
}

function CreatorCard({ o }: { o: Record<string, unknown> }) {
  const hooks = (o.hooks as string[]) ?? [];
  const opener = o.script_opener as string | undefined;
  return (
    <CardShell agent="creator">
      {hooks.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {hooks.map((h, i) => (
            <div key={i} className="flex items-start gap-2 rounded-xl border border-black/10 px-3 py-2">
              <p className="flex-1 text-sm text-black/80">“{h}”</p>
              <CopyButton text={h} />
            </div>
          ))}
        </div>
      )}
      {opener ? (
        <div className="mt-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-black/35">Video opener</p>
          <div className="rounded-xl px-3 py-2 text-sm text-black/80" style={{ background: "#d8bfaa1a" }}>
            {opener}
          </div>
        </div>
      ) : null}
    </CardShell>
  );
}

const VERDICT_META: Record<string, { label: string; color: string }> = {
  launch:          { label: "Launch", color: "#0a8f48" },
  validate_first:  { label: "Validate first", color: "#b8860b" },
  pivot:           { label: "Pivot", color: "#b91c1c" },
};

function AnalystCard({ o, onSubmit }: { o: Record<string, unknown>; onSubmit: (t: string) => void }) {
  const verdict = (o.verdict as string) || "";
  const vm = VERDICT_META[verdict];
  const nextPlay = o.next_play as string | undefined;
  return (
    <CardShell agent="analyst">
      {vm && (
        <span
          className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold text-white"
          style={{ background: vm.color }}
        >
          {vm.label}
        </span>
      )}
      {o.recommended_path ? <p className="mt-2 text-sm text-black/80">{o.recommended_path as string}</p> : null}

      {nextPlay ? (
        <div className="mt-3 rounded-xl px-3 py-2 text-sm" style={{ background: `${SURF}10` }}>
          <span className="font-semibold" style={{ color: SURF }}>Next 24h: </span>
          <span className="text-black/80">{nextPlay}</span>
        </div>
      ) : null}

      <ChipGroup label="Signals to watch" items={o.signals_to_watch as string[]} />

      {nextPlay ? (
        <div className="mt-3">
          <button
            onClick={() => onSubmit(nextPlay)}
            className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3.5 py-1.5 text-xs font-semibold text-black/70 transition-colors hover:border-black/25 hover:text-black"
          >
            Do this next <ArrowRight size={12} />
          </button>
        </div>
      ) : null}
    </CardShell>
  );
}

// ─── Dispatcher ─────────────────────────────────────────────────────────────

// While an agent streams, show a slim working row; once output lands, render the
// agent's card. On error, a compact note (the CoS can re-run the one agent).
export function CrewToolCard({
  agent,
  part,
  onSubmit,
  onStartBuild,
}: {
  agent: AgentId;
  part: ToolPart;
  onSubmit: (text: string) => void;
  onStartBuild: (headline?: string) => void;
}) {
  const meta = AGENT_META[agent];
  const color = AGENT_COLOR[agent];

  if (part.state === "output-error") {
    return (
      <div className="flex items-center gap-2.5 rounded-2xl border border-black/10 px-4 py-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full text-sm" style={{ background: `${color}1a` }}>
          {meta.icon}
        </span>
        <p className="text-xs text-black/55">
          {meta.name} hit a snag and didn’t finish — ask your Chief of Staff to re-run it.
        </p>
      </div>
    );
  }

  if (part.state !== "output-available" || part.output == null) {
    return (
      <div className="flex items-center gap-2.5 rounded-2xl border border-black/10 px-4 py-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full text-sm" style={{ background: `${color}1a` }}>
          {meta.icon}
        </span>
        <span className="text-sm font-medium text-black/70">{meta.name}</span>
        <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-black/40">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: color }} />
          working…
        </span>
      </div>
    );
  }

  const o = part.output as Record<string, unknown>;
  switch (agent) {
    case "scout":      return <ScoutCard o={o} />;
    case "strategist": return <StrategistCard o={o} onSubmit={onSubmit} />;
    case "builder":    return <BuilderCard o={o} onStartBuild={onStartBuild} />;
    case "seller":     return <SellerCard o={o} />;
    case "creator":    return <CreatorCard o={o} />;
    case "analyst":    return <AnalystCard o={o} onSubmit={onSubmit} />;
    default:           return null;
  }
}
