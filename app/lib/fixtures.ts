import type {
  Goal,
  Task,
  Artifact,
  Memory,
  AgentRun,
  Approval,
} from "./types";

export const goals: Goal[] = [];
export const tasks: Task[] = [];
export const artifacts: Artifact[] = [];
export const memories: Memory[] = [];
export const agentRuns: AgentRun[] = [];
export const approvals: Approval[] = [];
export const suggestedNextMoves: { id: string; title: string; subtitle: string }[] = [];
export const dailyBrief = { headline: "", bullets: [] as string[] };
