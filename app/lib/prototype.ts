export type WorkStatus =
  | "queued"
  | "running"
  | "waiting"
  | "needs_review"
  | "blocked"
  | "done"
  | "failed";

export type Priority = "high" | "medium" | "low";
export type Risk = "low" | "medium" | "high";

export type InboxType =
  | "approval"
  | "choice"
  | "review"
  | "escalation"
  | "recommendation";

export type DecisionState = "open" | "resolved" | "deferred";

export interface WorkTask {
  id: string;
  title: string;
  agent: string;
  status: WorkStatus;
  priority: Priority;
  linkedGoal: string;
  output: string;
  needsApproval: boolean;
  lastUpdate: string;
  risk: Risk;
  sprint: string;
  customer?: string;
  experiment?: string;
  brief: string;
  plan: string[];
  logs: string[];
  artifacts: string[];
  dependsOn: string[];
  unblocks: string[];
  memoryUpdates: string[];
}

export interface InboxDecision {
  id: string;
  agent: string;
  type: InboxType;
  state: DecisionState;
  title: string;
  whyItMatters: string;
  risk: Risk;
  recommendation: string;
  preview: string;
  evidence: string[];
  options?: string[];
  downstreamImpact: string[];
  blocking: boolean;
  customerFacing: boolean;
  strategic: boolean;
  lowRiskApproval: boolean;
  linkedTaskId?: string;
}

export const SPRINT = {
  name: "",
  goal: "",
  timebox: "",
  success: "",
};

export const WORK_TASKS: WorkTask[] = [];
export const INBOX_DECISIONS: InboxDecision[] = [];
