import type { Artifact, Approval, Goal, Task } from "./types";

export type InboxKind =
  | "approval"
  | "revision"
  | "new_artifact"
  | "question"
  | "blocked"
  | "proposal";

export interface InboxItem {
  id: string;
  kind: InboxKind;
  state: "requires_action" | "busy" | "idle" | "done";
  interrupt_type: "approval" | "question" | "review" | "notice";
  agent: string;
  input_needed: string;
  title: string;
  subtitle: string;
  meta: string;
  created_at: string;
  source: "approval" | "artifact";
  source_id: string;
  options?: string[];
}

function ago(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.round(hrs / 24);
  return `${days}d`;
}

export function timeAgo(iso: string) {
  return ago(iso);
}

type WithDate = { created_at: string | Date };
const toIso = (v: string | Date): string =>
  typeof v === "string" ? v : new Date(v).toISOString();

export function buildInboxFromDb({
  approvals,
  artifacts,
  tasks,
  goals,
}: {
  approvals: (Approval & WithDate)[];
  artifacts: (Artifact & WithDate)[];
  tasks: Task[];
  goals: Goal[];
}): InboxItem[] {
  const items: InboxItem[] = [];

  for (const a of approvals) {
    if (a.status !== "pending") continue;
    const task = a.task_id ? tasks.find((t) => t.id === a.task_id) : null;
    const goal = task ? goals.find((g) => g.id === task.goal_id) : null;
    items.push({
      id: a.id,
      kind: "approval",
      state: "requires_action",
      interrupt_type: "approval",
      agent: "Growth Agent",
      input_needed: "Approve / Reject / Redirect",
      title: a.action,
      subtitle: task ? `${task.description}` : "Approval needed",
      meta: goal ? `serves "${goal.title}"` : "no goal linked",
      created_at: toIso(a.created_at),
      source: "approval",
      source_id: a.id,
    });
  }

  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recentArtifacts = [...artifacts]
    .filter((a) => new Date(a.created_at).getTime() > dayAgo)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 5);

  for (const a of recentArtifacts) {
    const goal = goals.find((g) => g.id === a.goal_id);
    items.push({
      id: `artifact_${a.id}`,
      kind: a.type === "daily_brief" ? "revision" : "new_artifact",
      state: a.type === "daily_brief" ? "requires_action" : "idle",
      interrupt_type: a.type === "daily_brief" ? "review" : "notice",
      agent: a.created_by_agent,
      input_needed:
        a.type === "daily_brief"
          ? "Pick direction and approve next action"
          : "Review and decide if follow-up is needed",
      title: a.title,
      subtitle:
        a.type === "daily_brief"
          ? a.content.slice(0, 140)
          : `${a.created_by_agent} drafted a ${a.type.replace(/_/g, " ")}`,
      meta: goal ? `related to "${goal.title}"` : "",
      created_at: toIso(a.created_at),
      source: "artifact",
      source_id: a.id,
    });
  }

  return items
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .map((it) => ({ ...it, meta: it.meta || ago(it.created_at) }));
}
