"use client";

import { useMemo, useState, useTransition } from "react";
import { PageShell } from "../../components/Shell";

type ConnectorItem = {
  id: string;
  key: "google" | "github" | "stripe";
  label: string;
  status: "not_connected" | "connected" | "error";
  scopes: string;
  account_ref: string | null;
  last_synced_at: string | Date | null;
  last_error: string | null;
};

type ConnectorEvent = {
  id: string;
  connector_key: "google" | "github" | "stripe";
  action: string;
  status: string;
  detail: string;
  created_at: string | Date;
};

export default function ConnectorsClient({
  initialConnectors,
  initialEvents,
}: {
  initialConnectors: ConnectorItem[];
  initialEvents: ConnectorEvent[];
}) {
  const [connectors, setConnectors] = useState(initialConnectors);
  const [events, setEvents] = useState(initialEvents);
  const [isPending, startTransition] = useTransition();

  const byKey = useMemo(
    () =>
      Object.fromEntries(connectors.map((c) => [c.key, c])) as Record<
        ConnectorItem["key"],
        ConnectorItem
      >,
    [connectors]
  );

  function refreshData() {
    startTransition(async () => {
      const res = await fetch("/api/connectors", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        items: ConnectorItem[];
        events: ConnectorEvent[];
      };
      setConnectors(data.items);
      setEvents(data.events);
    });
  }

  async function runAction(key: ConnectorItem["key"], action: "connect" | "disconnect" | "test") {
    const res = await fetch(`/api/connectors/${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) return;
    refreshData();
  }

  return (
    <PageShell
      title="Connectors"
      context="Connect Google, GitHub, and Stripe. This is the control plane for agent tool access."
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {(["google", "github", "stripe"] as const).map((key) => {
          const c = byKey[key];
          if (!c) return null;
          return (
            <section key={c.id} className="rounded-xl border border-zinc-200 bg-white p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900">{c.label}</h2>
                  <p className="mt-1 text-xs text-zinc-500">{c.scopes}</p>
                </div>
                <StatusBadge status={c.status} />
              </div>
              <div className="mt-4 text-xs text-zinc-500">
                Last sync: {c.last_synced_at ? new Date(c.last_synced_at).toLocaleString() : "never"}
              </div>
              {c.last_error ? <p className="mt-2 text-xs text-rose-600">{c.last_error}</p> : null}
              <div className="mt-4 flex gap-2">
                <ActionButton
                  disabled={isPending}
                  onClick={() => runAction(c.key, "connect")}
                  label="Connect"
                />
                <ActionButton
                  disabled={isPending}
                  onClick={() => runAction(c.key, "test")}
                  label="Test"
                />
                <ActionButton
                  disabled={isPending}
                  onClick={() => runAction(c.key, "disconnect")}
                  label="Disconnect"
                />
              </div>
            </section>
          );
        })}
      </div>

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-zinc-900">Connector Event Log</h3>
        </div>
        <ul className="divide-y divide-zinc-100">
          {events.map((e) => (
            <li key={e.id} className="px-5 py-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="font-medium text-zinc-800">
                  {e.connector_key} · {e.action}
                </div>
                <div className="text-xs text-zinc-500">
                  {new Date(e.created_at).toLocaleString()}
                </div>
              </div>
              <p className="mt-1 text-xs text-zinc-500">{e.detail}</p>
            </li>
          ))}
          {!events.length ? (
            <li className="px-5 py-6 text-sm text-zinc-500">No connector events yet.</li>
          ) : null}
        </ul>
      </section>
    </PageShell>
  );
}

function StatusBadge({ status }: { status: ConnectorItem["status"] }) {
  const style =
    status === "connected"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "error"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : "border-zinc-200 bg-zinc-50 text-zinc-600";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${style}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function ActionButton({
  onClick,
  label,
  disabled,
}: {
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {label}
    </button>
  );
}
