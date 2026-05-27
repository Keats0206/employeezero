export type TaskStatus =
  | "suggested"
  | "approved"
  | "in_progress"
  | "needs_review"
  | "done"
  | "rejected";

export type ArtifactType =
  | "daily_brief"
  | "task_plan"
  | "decision_memo"
  | "prd"
  | "github_issue"
  | "growth_draft"
  | "design_critique"
  | "code_review"
  | "research_note";

export type MemoryType = "company" | "decision" | "agent_note";

export type RiskLevel = "low" | "medium" | "high";

export type GoalStatus = "active" | "paused" | "done";

export interface Goal {
  id: string;
  title: string;
  description: string;
  why_it_matters: string;
  success_metric: string;
  status: GoalStatus;
  deadline: string;
  active: boolean;
  created_at: string;
}

export interface Task {
  id: string;
  goal_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: number;
  risk_level: RiskLevel;
  output_type: string;
  created_at: string;
}

export interface Artifact {
  id: string;
  goal_id: string;
  task_id: string | null;
  type: ArtifactType;
  title: string;
  content: string;
  url: string | null;
  created_by_agent: string;
  created_at: string;
}

export interface Memory {
  id: string;
  type: MemoryType;
  title: string;
  content: string;
  importance: 1 | 2 | 3;
  created_at: string;
}

export interface AgentRun {
  id: string;
  agent_type: string;
  status: "queued" | "running" | "succeeded" | "failed";
  input: string;
  output: string | null;
  error: string | null;
  created_at: string;
}

export interface Approval {
  id: string;
  task_id: string | null;
  artifact_id: string | null;
  action: string;
  status: "pending" | "approved" | "rejected";
  notes: string;
  created_at: string;
}
