"use client";

import { useSession } from "next-auth/react";

export function AppRail() {
  const { data: session } = useSession();
  const email = session?.user?.email ?? "";
  const initial = email.charAt(0).toUpperCase() || "P";

  return (
    <div className="flex h-full w-14 shrink-0 flex-col items-center justify-between border-r border-zinc-200 bg-zinc-50 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-[11px] font-semibold tracking-tight text-white">
        ez
      </div>

      <div
        className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-200 text-xs font-medium text-zinc-700"
        title={email || "Account"}
      >
        {initial}
      </div>
    </div>
  );
}
