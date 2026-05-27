"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { ChatProvider } from "./components/ChatContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ChatProvider>{children}</ChatProvider>
    </SessionProvider>
  );
}
