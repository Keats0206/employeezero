import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  hint,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-12 text-center">
      <Icon size={28} strokeWidth={1.5} className="text-zinc-400" />
      <div className="text-sm font-medium text-zinc-700">{title}</div>
      {hint && <div className="max-w-sm text-xs text-zinc-500">{hint}</div>}
    </div>
  );
}
