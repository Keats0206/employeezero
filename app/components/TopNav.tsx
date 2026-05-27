"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Target,
  Grid2x2,
  Activity,
  Brain,
  LayoutDashboard,
  ListTodo,
  Inbox,
  Plug,
  Box,
} from "lucide-react";

const NAV = [
  { href: "/inbox", label: "Today", icon: Inbox },
  { href: "/work", label: "Work", icon: ListTodo },
  { href: "/experiments", label: "Experiments", icon: Target },
  { href: "/canvas", label: "Business Model", icon: Grid2x2 },
  { href: "/connectors", label: "Connectors", icon: Plug },
  { href: "/agents", label: "Agents", icon: Activity },
  { href: "/memory", label: "Memory", icon: Brain },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sandbox", label: "Sandbox", icon: Box },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userName = session?.user?.name?.trim() || "Signed in";
  const userEmail = session?.user?.email?.trim() || "";
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
        <div className="mb-3 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-2">
          <div className="truncate text-xs font-medium text-zinc-800">
            {userName}
          </div>
          {userEmail ? (
            <div className="truncate text-[11px] text-zinc-500">{userEmail}</div>
          ) : null}
        </div>
        <div className="px-2 text-[11px] text-zinc-400">
          v0 · single-tenant
        </div>
      </div>
    </aside>
  );
}
