"use client";

import { ReactNode } from "react";

export function PageShell({
  title,
  context,
  contextLabel,
  children,
}: {
  title: string;
  context?: string;
  contextLabel?: string;
  children: ReactNode;
}) {
  return (
    <>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
            {title}
          </h1>
          {context && (
            <p className="mt-1 text-sm text-zinc-500">{context}</p>
          )}
        </div>
        {contextLabel && context && (
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-zinc-400">
              {contextLabel}
            </div>
            <div className="mt-0.5 max-w-xs truncate text-sm text-zinc-700">
              {context}
            </div>
          </div>
        )}
      </div>
      {children}
    </>
  );
}

export function FilterTabs<T extends string>({
  options,
  value,
  onChange,
  counts,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  counts: Record<string, number>;
}) {
  return (
    <div className="mb-4 flex items-center gap-5 overflow-x-auto border-b border-zinc-100 text-sm">
      {options.map((o) => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            className={`-mb-px flex shrink-0 items-center gap-1.5 border-b-2 pb-2.5 transition-colors ${
              active
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-900"
            }`}
          >
            {o.label}
            <span
              className={`tabular-nums text-xs ${
                active ? "text-zinc-500" : "text-zinc-400"
              }`}
            >
              {counts[o.key] ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function TwoPane({
  list,
  detail,
}: {
  list: ReactNode;
  detail: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        {list}
      </div>
      <aside className="hidden lg:block">
        <div className="sticky top-6">{detail}</div>
      </aside>
    </div>
  );
}

export function ListRow({
  selected,
  onClick,
  children,
}: {
  selected?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <li
      onClick={onClick}
      className={`group flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors ${
        selected ? "bg-zinc-50" : "hover:bg-zinc-50"
      }`}
    >
      {children}
    </li>
  );
}

export function DetailShell({
  label,
  labelColor,
  title,
  subtitle,
  meta,
  children,
  footer,
}: {
  label: string;
  labelColor?: string;
  title: string;
  subtitle?: string;
  meta?: string;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <div className="border-b border-zinc-100 px-5 py-4">
        <div
          className={`text-[10px] font-semibold uppercase tracking-wider ${
            labelColor ?? "text-zinc-500"
          }`}
        >
          {label}
        </div>
        <h3 className="mt-1.5 text-base font-medium text-zinc-900">{title}</h3>
        {subtitle && (
          <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
        )}
        {meta && <p className="mt-2 text-xs text-zinc-400">{meta}</p>}
      </div>
      {children}
      {footer && (
        <div className="flex items-center justify-between gap-2 border-t border-zinc-100 px-5 py-3">
          {footer}
        </div>
      )}
    </div>
  );
}

export function DetailSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="border-b border-zinc-100 px-5 py-4 last:border-b-0">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div className="text-sm text-zinc-700">{children}</div>
    </div>
  );
}

export function ReplyBox({ placeholder }: { placeholder?: string }) {
  return (
    <DetailSection label="Reply">
      <textarea
        rows={3}
        placeholder={placeholder ?? "Steer the agent…"}
        className="w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none placeholder:text-zinc-400 focus:border-zinc-400"
      />
    </DetailSection>
  );
}

export function FooterHints({
  hints,
  right,
}: {
  hints: { key: string; label: string }[];
  right?: ReactNode;
}) {
  return (
    <div className="mt-6 flex items-center justify-between text-[11px] text-zinc-400">
      <div>
        {hints.map((h, i) => (
          <span key={h.key}>
            <kbd className="mx-0.5 rounded border border-zinc-200 bg-white px-1 font-mono text-[10px] text-zinc-600">
              {h.key}
            </kbd>{" "}
            {h.label}
            {i < hints.length - 1 ? " · " : ""}
          </span>
        ))}
      </div>
      {right && <div>{right}</div>}
    </div>
  );
}

export function EmptyDetail({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-400">
      {children}
    </div>
  );
}
