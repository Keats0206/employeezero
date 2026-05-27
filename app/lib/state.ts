import type { Approval, AgentRun, Artifact, Goal, Memory, Task } from "./types";

type Store = {
  goals: Goal[];
  tasks: Task[];
  artifacts: Artifact[];
  memories: Memory[];
  approvals: Approval[];
  agentRuns: AgentRun[];
};

const globalForState = globalThis as unknown as { __employeezero_store?: Store };

function initStore(): Store {
  return {
    goals: [],
    tasks: [],
    artifacts: [],
    memories: [],
    approvals: [],
    agentRuns: [],
  };
}

export const store: Store = globalForState.__employeezero_store ?? initStore();
if (!globalForState.__employeezero_store) {
  globalForState.__employeezero_store = store;
}

export function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso() {
  return new Date().toISOString();
}
