import { Grid2x2 } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { PageShell } from "../components/Shell";

export const dynamic = "force-dynamic";

export default function CanvasPage() {
  return (
    <PageShell
      title="Business Model Canvas"
      context="Working strategy model. Each assumption is scored by evidence — agents propose updates, you decide."
    >
      <EmptyState
        icon={Grid2x2}
        title="Canvas is empty"
        hint="Try: 'Help me fill in the business model canvas for my project' in chat — the operator can propose assumptions you can refine."
      />
    </PageShell>
  );
}
