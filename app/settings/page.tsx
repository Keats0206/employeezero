import Link from "next/link";
import { Plug, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

const SECTIONS = [
  {
    href: "/settings/connectors",
    label: "Connectors",
    description: "Google, GitHub, Stripe, and other integrations",
    icon: Plug,
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Settings</h1>
      <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.href}
              href={s.href}
              className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50"
            >
              <Icon size={16} className="text-zinc-500" />
              <div className="flex-1">
                <div className="text-sm font-medium text-zinc-900">{s.label}</div>
                <div className="text-xs text-zinc-500">{s.description}</div>
              </div>
              <ChevronRight size={14} className="text-zinc-400" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
