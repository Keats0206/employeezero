import { LayoutDashboard } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { PageShell } from "../components/Shell";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <PageShell title="Dashboard">
      <EmptyState
        icon={LayoutDashboard}
        title="No metrics yet"
        hint="Connect Stripe, PostHog, or your analytics in Settings → Connectors. Once data flows in, traction, spend, and weekly summaries appear here."
      />
    </PageShell>
  );
}
