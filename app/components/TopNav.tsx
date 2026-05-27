"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Target,
  Grid2x2,
  Activity,
  Brain,
  LayoutDashboard,
  ListTodo,
  Inbox,
  Box,
  Globe,
  Settings,
} from "lucide-react";

const TABS = [
  { href: "/preview", label: "Preview", icon: Globe },
  { href: "/inbox", label: "Today", icon: Inbox },
  { href: "/work", label: "Work", icon: ListTodo },
  { href: "/experiments", label: "Experiments", icon: Target },
  { href: "/canvas", label: "Canvas", icon: Grid2x2 },
  { href: "/memory", label: "Memory", icon: Brain },
  { href: "/agents", label: "Agents", icon: Activity },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function SideNav() {
  const pathname = usePathname();
  return (
    <nav className="flex w-56 shrink-0 flex-col gap-0.5 border-r border-zinc-200 bg-white px-3 py-4">
      {TABS.map((t) => {
        const Icon = t.icon;
        const active = pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
              active
                ? "bg-zinc-100 text-zinc-900"
                : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
            }`}
          >
            <Icon size={14} strokeWidth={1.75} />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

// Back-compat shims
export function TabStrip() {
  return null;
}
export function Sidebar() {
  return null;
}
