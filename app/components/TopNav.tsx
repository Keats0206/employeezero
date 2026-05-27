"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Inbox,
  Target,
  ListChecks,
  FileText,
  Brain,
  Plus,
} from "lucide-react";

const NAV = [
  { href: "/", label: "Inbox", icon: Inbox },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/artifacts", label: "Artifacts", icon: FileText },
  { href: "/memory", label: "Memory", icon: Brain },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-56 flex-col border-r border-zinc-100 bg-white px-4 py-6 md:flex">
      <Link href="/" className="mb-10 flex items-center gap-2 px-2">
        <span className="text-base font-medium tracking-tight text-zinc-900">
          employeezero
        </span>
        <span className="rounded-full border border-pink-200 bg-pink-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-pink-500">
          Alpha
        </span>
      </Link>

      <nav className="flex flex-col gap-0.5">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                active
                  ? "bg-zinc-100 text-zinc-900"
                  : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
              }`}
            >
              <Icon size={15} strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <button
          type="button"
          onClick={() => console.log("new task")}
          className="flex w-full items-center justify-center gap-1.5 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
        >
          <Plus size={14} strokeWidth={2} />
          New task
        </button>
        <div className="mt-3 px-2 text-[11px] text-zinc-400">
          v0 · single-tenant
        </div>
      </div>
    </aside>
  );
}
