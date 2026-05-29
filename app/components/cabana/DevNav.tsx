"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SCREENS = [
  { label: "Landing",   href: "/" },
  { label: "Preview",   href: "/preview?idea=A+paid+community+for+beginner+golfers" },
  { label: "Upgrade",   href: "/upgrade" },
  { label: "Dashboard", href: "/dashboard" },
];

export function DevNav() {
  const path = usePathname();

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-gray-900/90 backdrop-blur px-3 py-2 rounded-full shadow-xl border border-white/10">
      <span className="text-gray-500 text-xs mr-2 font-mono">proto</span>
      {SCREENS.map(s => {
        const active = s.href === "/" ? path === "/" : path.startsWith(s.href.split("?")[0]);
        return (
          <Link
            key={s.href}
            href={s.href}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              active ? "bg-violet-600 text-white" : "text-gray-400 hover:text-white hover:bg-white/10"
            }`}
          >
            {s.label}
          </Link>
        );
      })}
    </div>
  );
}
