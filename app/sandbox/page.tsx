import { PageShell } from "../components/Shell";

export const dynamic = "force-dynamic";

export default function SandboxPage() {
  return (
    <PageShell title="Sandbox">
      <div className="space-y-4">
        <p className="text-sm text-zinc-600">
          The agent workspace. Issues filed via the Report button land here as proposed PRs.
          Approve to merge → Vercel redeploys → site updates.
        </p>
        <div className="rounded-lg border border-dashed border-zinc-200 p-12 text-center text-sm text-zinc-400">
          No active sandbox runs yet. File feedback via the Report button to get started.
        </div>
      </div>
    </PageShell>
  );
}
