"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquarePlus, X, Loader2, CheckCircle2 } from "lucide-react";

type Kind = "bug" | "feature" | "feedback";

export function ReportButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("feedback");
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ url: string; number: number; title: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          summary,
          details,
          page: pathname,
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setResult(data);
      setSummary("");
      setDetails("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  function close() {
    setOpen(false);
    setResult(null);
    setError(null);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3.5 py-2 text-xs font-medium text-zinc-700 shadow-md hover:bg-zinc-50"
        aria-label="Report"
      >
        <MessageSquarePlus size={14} />
        Report
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={close}>
          <div
            className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">File feedback</h2>
              <button onClick={close} className="text-zinc-400 hover:text-zinc-700">
                <X size={16} />
              </button>
            </div>

            {result ? (
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-emerald-900">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium">Issue #{result.number} filed</div>
                    <div className="text-xs text-emerald-800">{result.title}</div>
                  </div>
                </div>
                <a
                  href={result.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full rounded-md border border-zinc-200 px-3 py-2 text-center text-xs hover:bg-zinc-50"
                >
                  Open on GitHub →
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-1">
                  {(["bug", "feature", "feedback"] as Kind[]).map((k) => (
                    <button
                      key={k}
                      onClick={() => setKind(k)}
                      className={`rounded-md px-2.5 py-1 text-xs ${
                        kind === k
                          ? "bg-zinc-900 text-white"
                          : "border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                      }`}
                    >
                      {k}
                    </button>
                  ))}
                </div>
                <input
                  autoFocus
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="What happened / what's needed?"
                  className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                />
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="More detail (optional)"
                  rows={4}
                  className="w-full resize-none rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                />
                <div className="text-[11px] text-zinc-500">Page: {pathname}</div>
                {error && <div className="rounded-md bg-rose-50 p-2 text-xs text-rose-700">{error}</div>}
                <button
                  onClick={submit}
                  disabled={!summary.trim() || submitting}
                  className="flex w-full items-center justify-center gap-1.5 rounded-md bg-zinc-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-40"
                >
                  {submitting && <Loader2 size={12} className="animate-spin" />}
                  {submitting ? "Filing…" : "File issue"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
