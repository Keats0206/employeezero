import { approvals, artifacts, goals, suggestedNextMoves, tasks } from "./fixtures";

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
  title: string;
  subtitle: string;
  meta: string;
  created_at: string;
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

export function buildInbox(): InboxItem[] {
  const items: InboxItem[] = [];

  for (const a of approvals) {
    const task = a.task_id ? tasks.find((t) => t.id === a.task_id) : null;
    const goal = task ? goals.find((g) => g.id === task.goal_id) : null;
    items.push({
      id: a.id,
      kind: "approval",
      title: a.action,
      subtitle: task ? `Draft ready · ${task.output_type}` : "Approval needed",
      meta: goal ? `serves "${goal.title}"` : "no goal linked",
      created_at: a.created_at,
    });
  }

  items.push({
    id: "rev_1",
    kind: "revision",
    title: "Daily brief — May 27",
    subtitle: "You asked: \"make it shorter\" — redrafted",
    meta: "Daily Operator",
    created_at: "2026-05-27T06:30:00Z",
  });

  const recentArtifacts = [...artifacts]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 2);
  for (const a of recentArtifacts) {
    const goal = goals.find((g) => g.id === a.goal_id);
    items.push({
      id: `na_${a.id}`,
      kind: "new_artifact",
      title: a.title,
      subtitle: `${a.created_by_agent} drafted a ${a.type.replace(/_/g, " ")}`,
      meta: goal ? `related to "${goal.title}"` : "",
      created_at: a.created_at,
    });
  }

  items.push({
    id: "q_1",
    kind: "question",
    title: 'Which goal does "tweet draft" serve?',
    subtitle: "Growth agent needs a parent before continuing",
    meta: "blocks 1 task",
    created_at: "2026-05-27T03:10:00Z",
    options: goals.map((g) => g.title),
  });

  items.push({
    id: "bl_1",
    kind: "blocked",
    title: "Wire Supabase needs schema sign-off",
    subtitle: "Waiting on you to approve t_1",
    meta: "snoozed until approval",
    created_at: "2026-05-26T18:00:00Z",
  });

  for (const m of suggestedNextMoves) {
    items.push({
      id: `pr_${m}`,
      kind: "proposal",
      title: m,
      subtitle: "Daily Operator suggests this as your next move",
      meta: "no commitment yet",
      created_at: "2026-05-27T07:00:00Z",
    });
  }

  return items
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((it) => ({ ...it, meta: it.meta || ago(it.created_at) }));
}

export function timeAgo(iso: string) {
  return ago(iso);
}
