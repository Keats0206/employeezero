"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

type Connection = {
  id: string;
  name: string;
  description: string;
  connected: boolean;
  authUrl: string | null;
};

export function Connections() {
  const [connections, setConnections] = useState<Connection[] | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/connections");
      const data = await res.json();
      setConnections(data.connections ?? []);
    } catch {
      setConnections([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function connect(id: string) {
    setPending(id);
    try {
      const res = await fetch(`/api/connections/${id}`, { method: "POST" });
      const data = await res.json();
      if (data.authUrl) {
        // Open Arcade's OAuth in a new tab; when the user comes back we re-check
        // status. Poll a few times so the row flips to Connected on its own.
        window.open(data.authUrl, "_blank", "noopener,noreferrer");
        for (let i = 0; i < 20; i++) {
          await new Promise((r) => setTimeout(r, 3000));
          const check = await fetch("/api/connections");
          const fresh = await check.json();
          const row = (fresh.connections as Connection[] | undefined)?.find(
            (c) => c.id === id
          );
          if (row?.connected) {
            setConnections(fresh.connections);
            break;
          }
        }
      } else if (data.connected) {
        await load();
      }
    } finally {
      setPending(null);
    }
  }

  if (connections === null) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-black/40">
        <Loader2 size={15} className="animate-spin" /> Loading connections…
      </div>
    );
  }

  return (
    <div className="divide-y divide-black/5">
      {connections.map((c) => (
        <div key={c.id} className="flex items-center justify-between gap-4 py-4">
          <div className="min-w-0">
            <p className="font-medium">{c.name}</p>
            <p className="truncate text-sm text-black/50">{c.description}</p>
          </div>
          {c.connected ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#0cf574]/15 px-3 py-1.5 text-xs font-medium text-[#0a8f47]">
              <Check size={13} /> Connected
            </span>
          ) : (
            <button
              onClick={() => connect(c.id)}
              disabled={pending === c.id}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-black px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-black/80 disabled:opacity-40"
            >
              {pending === c.id ? (
                <>
                  <Loader2 size={13} className="animate-spin" /> Connecting…
                </>
              ) : (
                "Connect"
              )}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
