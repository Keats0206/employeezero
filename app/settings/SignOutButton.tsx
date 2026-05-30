"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/sign-in" })}
      className="rounded-full border border-black/15 px-5 py-2 text-sm font-medium transition-colors hover:border-black/40"
    >
      Sign out
    </button>
  );
}
