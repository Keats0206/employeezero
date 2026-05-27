"use client";

import { PageShell } from "../components/Shell";
import { type Experiment } from "../lib/experiments";

export default function ExperimentsClient({ experiments: _experiments }: { experiments: Experiment[] }) {
  return (
    <PageShell
      title="Experiments"
      context="Timeboxed experiments under your epic. Validate hypotheses and ship decisions."
    >
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center">
        <p className="text-sm text-zinc-600">No experiments yet.</p>
        <p className="mt-1 text-xs text-zinc-500">
          Create your first experiment under an epic.
        </p>
      </div>
    </PageShell>
  );
}
