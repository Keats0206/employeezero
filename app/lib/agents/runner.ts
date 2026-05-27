// In-memory agent run store. MVP — swap for DB + AI SDK when ready.

export type StepKind = "thought" | "tool_call" | "tool_result" | "output" | "error";

export type Step = {
  id: string;
  kind: StepKind;
  label: string;
  detail?: string;
  ts: number;
};

export type RunStatus = "queued" | "running" | "succeeded" | "failed";

export type Run = {
  id: string;
  agent_type: string;
  input: string;
  status: RunStatus;
  steps: Step[];
  created_at: number;
  finished_at?: number;
};

type Listener = (step: Step | { done: true; status: RunStatus }) => void;

const runs = new Map<string, Run>();
const listeners = new Map<string, Set<Listener>>();

export function listRuns(): Run[] {
  return [...runs.values()].sort((a, b) => b.created_at - a.created_at);
}

export function getRun(id: string): Run | undefined {
  return runs.get(id);
}

export function subscribe(id: string, fn: Listener): () => void {
  if (!listeners.has(id)) listeners.set(id, new Set());
  listeners.get(id)!.add(fn);
  return () => listeners.get(id)?.delete(fn);
}

function emit(runId: string, payload: Step | { done: true; status: RunStatus }) {
  listeners.get(runId)?.forEach((fn) => fn(payload));
}

function pushStep(run: Run, kind: StepKind, label: string, detail?: string) {
  const step: Step = {
    id: `${run.id}-${run.steps.length}`,
    kind,
    label,
    detail,
    ts: Date.now(),
  };
  run.steps.push(step);
  emit(run.id, step);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const SCRIPTS: Record<string, (run: Run) => Promise<void>> = {
  inbox_triage: async (run) => {
    pushStep(run, "thought", "Scanning inbox", "Looking at 14 unread items since last run.");
    await sleep(800);
    pushStep(run, "tool_call", "gmail.search", "label:inbox is:unread newer_than:1d");
    await sleep(900);
    pushStep(run, "tool_result", "14 threads", "3 from team, 4 customer, 7 newsletter.");
    await sleep(600);
    pushStep(run, "thought", "Clustering by sender + topic");
    await sleep(700);
    pushStep(run, "tool_call", "memory.lookup", "company priorities for this week");
    await sleep(500);
    pushStep(run, "tool_result", "2 active goals", "Ship onboarding · Land design partner");
    await sleep(600);
    pushStep(run, "output", "Created 3 suggested tasks", "See Tasks → Suggested.");
  },
  daily_brief: async (run) => {
    pushStep(run, "thought", "Pulling overnight signals");
    await sleep(700);
    pushStep(run, "tool_call", "github.events", "since=yesterday");
    await sleep(800);
    pushStep(run, "tool_result", "9 PRs · 2 issues opened");
    await sleep(500);
    pushStep(run, "tool_call", "calendar.today");
    await sleep(500);
    pushStep(run, "tool_result", "4 meetings · 2 focus blocks");
    await sleep(700);
    pushStep(run, "output", "Daily brief drafted", "Artifact saved.");
  },
  task_plan: async (run) => {
    pushStep(run, "thought", "Reading task: " + run.input);
    await sleep(600);
    pushStep(run, "tool_call", "memory.lookup", "prior decisions on this surface");
    await sleep(800);
    pushStep(run, "tool_result", "2 relevant decisions found");
    await sleep(600);
    pushStep(run, "thought", "Drafting 5-step plan");
    await sleep(900);
    pushStep(run, "output", "Plan ready for review");
  },
};

export function startRun(agent_type: string, input: string): Run {
  const id = crypto.randomUUID().slice(0, 8);
  const run: Run = {
    id,
    agent_type,
    input,
    status: "queued",
    steps: [],
    created_at: Date.now(),
  };
  runs.set(id, run);

  (async () => {
    try {
      run.status = "running";
      const script = SCRIPTS[agent_type] ?? SCRIPTS.task_plan;
      await script(run);
      run.status = "succeeded";
    } catch (err) {
      run.status = "failed";
      pushStep(run, "error", "Run failed", err instanceof Error ? err.message : String(err));
    } finally {
      run.finished_at = Date.now();
      emit(run.id, { done: true, status: run.status });
    }
  })();

  return run;
}
