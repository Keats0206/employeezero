import { ReactNode } from "react";

export function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6">
      <h2 className="text-base font-semibold tracking-tight text-zinc-900">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
      )}
    </div>
  );
}

export function PageHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-12">
      <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
      )}
    </div>
  );
}

export function StatCard({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 px-5 py-4">
      <div className="text-2xl font-semibold tracking-tight text-zinc-900">
        {value}
      </div>
      <div className="text-xs text-zinc-500">{label}</div>
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-zinc-200 bg-white ${className}`}
    >
      {children}
    </div>
  );
}

type ToneKey =
  | "neutral"
  | "pink"
  | "amber"
  | "emerald"
  | "blue"
  | "violet"
  | "rose";

const TONE: Record<ToneKey, string> = {
  neutral: "border-zinc-200 bg-zinc-50 text-zinc-600",
  pink: "border-pink-200 bg-pink-50 text-pink-600",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  violet: "border-violet-200 bg-violet-50 text-violet-700",
  rose: "border-rose-200 bg-rose-50 text-rose-700",
};

export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: ToneKey;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${TONE[tone]}`}
    >
      {children}
    </span>
  );
}

export function GhostButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
    >
      {children}
    </button>
  );
}

export function SolidButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-zinc-700"
    >
      {children}
    </button>
  );
}

export function Divider() {
  return <div className="my-12 h-px bg-zinc-100" />;
}

export function statusTone(status: string): ToneKey {
  switch (status) {
    case "suggested":
      return "neutral";
    case "approved":
      return "blue";
    case "in_progress":
      return "violet";
    case "needs_review":
      return "amber";
    case "done":
      return "emerald";
    case "rejected":
      return "rose";
    default:
      return "neutral";
  }
}

export function riskTone(risk: string): ToneKey {
  switch (risk) {
    case "low":
      return "emerald";
    case "medium":
      return "amber";
    case "high":
      return "rose";
    default:
      return "neutral";
  }
}

export function importanceDot(importance: number) {
  const color =
    importance >= 3
      ? "bg-pink-500"
      : importance === 2
      ? "bg-zinc-400"
      : "bg-zinc-300";
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${color}`} />;
}

export function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
