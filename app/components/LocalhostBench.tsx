"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  Binoculars,
  ChevronUpCircle,
  CircleAlert,
  GitFork,
  SquareTerminal,
} from "lucide-react";

function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function LocalhostBench() {
  const [showBench, setShowBench] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setShowBench(isLocalHost(window.location.hostname));
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  if (!showBench) return null;

  return (
    <footer className="fixed inset-x-0 bottom-0 z-50 pointer-events-none px-0 pb-0">
      <div className="pointer-events-auto flex min-h-12 items-center justify-between border border-white/10 bg-[#181b21]/95 px-10 text-[#9ba3b2] shadow-[0_-1px_18px_rgba(0,0,0,0.26)] backdrop-blur-md sm:rounded-t-lg">
        <Link
          href="/dev"
          className="group flex min-w-0 items-center gap-4 py-2 text-[13px] font-medium text-[#c9ced8] transition-colors hover:text-white"
          aria-label="Open admin page"
        >
          <SquareTerminal size={17} strokeWidth={2.2} className="shrink-0 text-[#8e96a6] transition-colors group-hover:text-white" />
          <span className="truncate text-[15px]">Developers</span>
        </Link>

        <div className="flex items-center gap-7">
          {[
            { icon: Binoculars, label: "Inspect" },
            { icon: CircleAlert, label: "Alerts" },
            { icon: ArrowUpDown, label: "Sync" },
            { icon: GitFork, label: "Flows" },
          ].map(({ icon: Icon, label }) => (
            <button
              key={label}
              type="button"
              className="rounded-md p-1 text-[#9ba3b2] transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
              aria-label={label}
              title={label}
            >
              <Icon size={18} strokeWidth={2.35} />
            </button>
          ))}
          <Link
            href="/dev"
            className="rounded-md p-1 text-[#9ba3b2] transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
            aria-label="Open admin page"
            title="Open admin page"
          >
            <ChevronUpCircle size={19} strokeWidth={2.35} />
          </Link>
        </div>
      </div>
    </footer>
  );
}
