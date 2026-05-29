"use client";

import { useEffect, useState, useRef } from "react";
import {
  AGENT_ORDER, AGENT_META, AGENT_COLOR, EXAMPLES, AGENT_MODELS, MODEL_PRICING,
  saveSession, loadSession, STORAGE_KEYS, type AgentId, type AgentOutputs,
} from "@/app/lib/cabana-config";

// Dev-only inspector for the Cabana generate flow.
// Shows every agent's live stream, final parsed object, model, tokens,
// timing, and estimated cost. Visit /dev directly. Hidden in production.

type Status = "queued" | "working" | "done" | "error";
type AgentState = {
  status: Status;
  text: string;                 // live streamed preview
  output?: Record<string, unknown>;  // final parsed object
  stats?: { label: string; value: string }[];
  startedAt?: number;
  doneAt?: number;
  model?: string;
  usage?: { inputTokens: number; outputTokens: number };
  cost?: number;
  ms?: number;
};

type Totals = { inputTokens: number; outputTokens: number; totalTokens: number; cost: number };
type LoopAgent = {
  agent: AgentId;
  task: string;
  reason: string;
};
type LoopChange = {
  type: "add" | "update" | "remove";
  text: string;
};
type LoopResult = {
  state_read: string;
  decision: string;
  agents_to_run: LoopAgent[];
  plan_changes: LoopChange[];
  work_orders?: BuilderWorkOrder[];
  escalation: {
    needed: boolean;
    question: string;
    reason: string;
  };
  next_play: string;
};
type LoopRun = {
  cycle: number;
  model?: string;
  mode?: LoopMode;
  founderBrief?: string;
  loop: LoopResult;
  agent_results?: {
    agent: AgentId;
    task: string;
    result: {
      summary: string;
      output: string;
      suggested_play: string;
    };
    usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
  }[];
  usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
};
type LoopMode = "plan_only" | "run_agents";
type DevTab = "home" | "runs" | "product" | "actions" | "context" | "costs";
type ActionStatus = "pending" | "approved" | "done";
type BuilderWorkOrder = {
  agent: "builder";
  task_type: "new_site" | "product_update";
  title: string;
  brief: string;
  reason: string;
  requires_approval: true;
  status: "pending_approval" | "approved" | "running" | "done";
};
type ActionItem = {
  id: string;
  cycle: number;
  title: string;
  channel: string;
  details: string;
  why: string;
  status: ActionStatus;
  createdAt: string;
  type?: "manual" | "builder_work_order";
  workOrder?: BuilderWorkOrder;
  resultUrl?: string | null;
  resultHtml?: string;
};
type DevError = {
  message: string;
  agent?: AgentId;
  model?: string;
  raw?: string;
  cause?: string;
  finishReason?: string;
};
type AiCall = {
  id: string;
  source: "generate" | "cos";
  agent: AgentId | "cos";
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  ms?: number;
  cycle?: number;
  status: "done" | "error";
};

const COMPANY_CONTEXT_KEY = "cabana_dev_company_context";
const SPRINT_PLAN_KEY = "cabana_dev_sprint_plan";
const ACTION_QUEUE_KEY = "cabana_dev_action_queue";

function shortModel(m?: string): string {
  if (!m) return "";
  return m.split("/").pop() ?? m;
}
function fmtCost(c?: number): string {
  if (c == null) return "—";
  if (c === 0) return "$0";
  return c < 0.01 ? `$${c.toFixed(4)}` : `$${c.toFixed(3)}`;
}

function emptyState(): Record<AgentId, AgentState> {
  return AGENT_ORDER.reduce((acc, id) => {
    acc[id] = { status: "queued", text: "" };
    return acc;
  }, {} as Record<AgentId, AgentState>);
}

export default function DevPage() {
  if (process.env.NODE_ENV === "production") {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-black/40">
        Dev tools are disabled in production.
      </div>
    );
  }
  return <DevInspector />;
}

function DevInspector() {
  const [idea, setIdea] = useState("");
  const [running, setRunning] = useState(false);
  const [agents, setAgents] = useState<Record<AgentId, AgentState>>(emptyState);
  const [outputs, setOutputs] = useState<AgentOutputs | null>(null);
  const [error, setError] = useState<DevError | null>(null);
  const [totalMs, setTotalMs] = useState<number | null>(null);
  const [totals, setTotals] = useState<Totals | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const detailedErrorRef = useRef(false);

  // Builder → sandbox deploy state
  const [deploying, setDeploying] = useState(false);
  const [deployPhase, setDeployPhase] = useState<string>("");
  const [deployCode, setDeployCode] = useState<string>("");   // live-streamed HTML source
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const [deployHtml, setDeployHtml] = useState<string | null>(null);
  const [deployErr, setDeployErr] = useState<string | null>(null);
  const [deployInstruction, setDeployInstruction] = useState("");

  // CoS loop trace state
  const [loopRunning, setLoopRunning] = useState(false);
  const [loopModeRunning, setLoopModeRunning] = useState<LoopMode | null>(null);
  const [loopRuns, setLoopRuns] = useState<LoopRun[]>([]);
  const [loopErr, setLoopErr] = useState<string | null>(null);
  const [founderBrief, setFounderBrief] = useState("");
  const [devTab, setDevTab] = useState<DevTab>("home");
  const [companyContext, setCompanyContext] = useState("");
  const [sprintPlan, setSprintPlan] = useState("");
  const [contextSavedAt, setContextSavedAt] = useState<string | null>(null);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [copiedActionId, setCopiedActionId] = useState<string | null>(null);
  const [aiCalls, setAiCalls] = useState<AiCall[]>([]);
  const [costFilter, setCostFilter] = useState<"all" | "generate" | "cos">("all");
  const [loopSignals, setLoopSignals] = useState({
    outreach_sent: 0,
    replies: 0,
    page_views: 0,
    sales: 0,
  });

  function recordAiCall(call: Omit<AiCall, "id">) {
    setAiCalls(calls => [
      {
        ...call,
        id: `${call.source}-${call.agent}-${call.cycle ?? "run"}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      },
      ...calls,
    ]);
  }

  useEffect(() => {
    try {
      setCompanyContext(localStorage.getItem(COMPANY_CONTEXT_KEY) ?? defaultCompanyContext(idea));
      setSprintPlan(localStorage.getItem(SPRINT_PLAN_KEY) ?? defaultSprintPlan());
      setActions(readStoredActions());
    } catch {
      setCompanyContext(defaultCompanyContext(idea));
      setSprintPlan(defaultSprintPlan());
      setActions([]);
    }
  }, []);

  function persistActions(next: ActionItem[]) {
    setActions(next);
    try {
      localStorage.setItem(ACTION_QUEUE_KEY, JSON.stringify(next));
    } catch {
      setLoopErr("Could not save action queue to localStorage.");
    }
  }

  function updateAction(id: string, patch: Partial<ActionItem>) {
    persistActions(actions.map(action => action.id === id ? { ...action, ...patch } : action));
  }

  function updateActionWithResult(id: string, updater: (action: ActionItem) => ActionItem) {
    persistActions(actions.map(action => action.id === id ? updater(action) : action));
  }

  function addCycleActions(run: LoopRun) {
    const created = actionsFromCycle(run);
    const existingKeys = new Set(actions.map(action => `${action.cycle}:${action.title}:${action.details}`));
    const nextActions = created.filter(action => !existingKeys.has(`${action.cycle}:${action.title}:${action.details}`));
    if (nextActions.length === 0) return;
    persistActions([...nextActions, ...actions]);
    setDevTab("actions");
  }

  async function copyAction(action: ActionItem) {
    const text = `${action.title}\n\nChannel: ${action.channel}\n\n${action.details}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedActionId(action.id);
      window.setTimeout(() => setCopiedActionId(null), 1400);
    } catch {
      setLoopErr("Could not copy action text.");
    }
  }

  function saveCompanyContext(nextContext = companyContext, nextSprint = sprintPlan) {
    try {
      localStorage.setItem(COMPANY_CONTEXT_KEY, nextContext);
      localStorage.setItem(SPRINT_PLAN_KEY, nextSprint);
      setContextSavedAt(new Date().toLocaleTimeString());
    } catch {
      setLoopErr("Could not save company context to localStorage.");
    }
  }

  async function runCosLoop(mode: LoopMode = "plan_only") {
    const activeOutputs = outputs ?? loadSession().outputs;
    setLoopRunning(true);
    setLoopModeRunning(mode);
    setLoopErr(null);
    const briefForRun = founderBrief.trim();
    try {
      const cycle = loopRuns.length + 1;
      const res = await fetch("/api/cos/loop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea,
          outputs: activeOutputs,
          signals: loopSignals,
          actions: summarizeActions(actions),
          founder_brief: briefForRun,
          company_context: companyContext,
          sprint_plan: sprintPlan,
          cycle,
          mode,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "CoS loop failed");
      setLoopRuns(runs => [{
        cycle,
        model: json.model,
        mode: json.mode,
        founderBrief: briefForRun || undefined,
        loop: json.loop as LoopResult,
        agent_results: json.agent_results,
        usage: json.usage,
      }, ...runs]);
      if (briefForRun) setFounderBrief("");
      const loopUsage = normalizeUsage(json.usage);
      recordAiCall({
        source: "cos",
        agent: "cos",
        model: json.model ?? "unknown",
        ...loopUsage,
        cost: estimateCallCost(json.model, loopUsage.inputTokens, loopUsage.outputTokens),
        cycle,
        status: "done",
      });
      for (const agentRun of json.agent_results ?? []) {
        const usage = normalizeUsage(agentRun.usage);
        recordAiCall({
          source: "cos",
          agent: agentRun.agent,
          model: json.model ?? "unknown",
          ...usage,
          cost: estimateCallCost(json.model, usage.inputTokens, usage.outputTokens),
          cycle,
          status: "done",
        });
      }
    } catch (e) {
      setLoopErr((e as Error).message);
    } finally {
      setLoopRunning(false);
      setLoopModeRunning(null);
    }
  }

  function bumpSignal(key: keyof typeof loopSignals) {
    setLoopSignals(s => ({ ...s, [key]: s[key] + 1 }));
  }

  async function deploySite(workOrderAction?: ActionItem) {
    if (!outputs?.builder || !outputs?.strategist) {
      setError({ message: "Need builder + strategist outputs first — run or replay." });
      return;
    }
    if (workOrderAction?.workOrder?.task_type === "product_update" && !deployHtml) {
      setDeployErr("Builder product updates need an existing deployed/previewed HTML page first.");
      return;
    }
    setDeploying(true);
    setDeployPhase("");
    setDeployCode("");
    setDeployUrl(null);
    if (!workOrderAction) setDeployHtml(null);
    setDeployErr(null);
    const workOrder = workOrderAction?.workOrder;
    const updateInstruction = workOrder?.brief ?? (deployHtml && deployInstruction.trim() ? deployInstruction.trim() : "");
    if (workOrderAction) {
      updateActionWithResult(workOrderAction.id, action => ({
        ...action,
        status: "approved",
        workOrder: action.workOrder ? { ...action.workOrder, status: "running" } : action.workOrder,
      }));
    }
    try {
      const res = await fetch("/api/cabana/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outputs,
          taskType: workOrder?.task_type,
          existingHtml: updateInstruction && deployHtml ? deployHtml : undefined,
          updateInstruction: updateInstruction || undefined,
        }),
      });
      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          let ev: Record<string, unknown>;
          try { ev = JSON.parse(line.slice(6)); } catch { continue; }
          if (ev.type === "phase") setDeployPhase(String(ev.text ?? ev.phase ?? ""));
          else if (ev.type === "code") setDeployCode(c => c + String(ev.delta ?? ""));
          else if (ev.type === "html") setDeployHtml(ev.html as string);
          else if (ev.type === "deploy_error") setDeployErr(String(ev.message));
          else if (ev.type === "complete") {
            setDeployHtml(ev.html as string);
            setDeployUrl((ev.url as string) ?? null);
            setDeployPhase(ev.url ? "live" : "done (no URL — preview only)");
            if (workOrderAction) {
              updateActionWithResult(workOrderAction.id, action => ({
                ...action,
                status: "done",
                resultUrl: (ev.url as string) ?? null,
                resultHtml: ev.html as string,
                workOrder: action.workOrder ? { ...action.workOrder, status: "done" } : action.workOrder,
              }));
              setDevTab("actions");
            } else if (updateInstruction) setDeployInstruction("");
          } else if (ev.type === "error") {
            setDeployErr(String(ev.message));
          }
        }
      }
    } catch (e) {
      setDeployErr((e as Error).message);
      if (workOrderAction) {
        updateActionWithResult(workOrderAction.id, action => ({
          ...action,
          workOrder: action.workOrder ? { ...action.workOrder, status: "approved" } : action.workOrder,
        }));
      }
    } finally {
      setDeploying(false);
    }
  }

  function patch(id: AgentId, p: Partial<AgentState>) {
    setAgents(prev => ({ ...prev, [id]: { ...prev[id], ...p } }));
  }

  async function run() {
    setRunning(true);
    setError(null);
    detailedErrorRef.current = false;
    setOutputs(null);
    setTotalMs(null);
    setTotals(null);
    setAgents(emptyState());
    const t0 = performance.now();

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/cabana/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea }),
        signal: ctrl.signal,
      });
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          let event: Record<string, unknown>;
          try { event = JSON.parse(line.slice(6)); } catch { continue; }

          const id = event.agent as AgentId | undefined;
          if (id && event.type === "start") {
            patch(id, { status: "working", startedAt: performance.now(), model: event.model as string });
          } else if (id && event.type === "progress") {
            patch(id, { status: "working", text: String(event.text ?? "") });
          } else if (id && event.type === "done") {
            const usage = event.usage as { inputTokens: number; outputTokens: number } | undefined;
            const inputTokens = usage?.inputTokens ?? 0;
            const outputTokens = usage?.outputTokens ?? 0;
            patch(id, {
              status: "done",
              doneAt: performance.now(),
              output: event.output as Record<string, unknown>,
              stats: event.stats as { label: string; value: string }[],
              model: event.model as string,
              usage: { inputTokens, outputTokens },
              cost: event.cost as number,
              ms: event.ms as number,
            });
            recordAiCall({
              source: "generate",
              agent: id,
              model: event.model as string,
              inputTokens,
              outputTokens,
              totalTokens: inputTokens + outputTokens,
              cost: event.cost as number,
              ms: event.ms as number,
              status: "done",
            });
          } else if (event.type === "complete") {
            const o = event.outputs as AgentOutputs;
            setOutputs(o);
            saveSession(idea, o);
            setTotalMs(performance.now() - t0);
            if (event.totals) setTotals(event.totals as Totals);
          } else if (id && event.type === "error") {
            patch(id, { status: "error", model: event.model as string });
            detailedErrorRef.current = true;
            setError({
              message: String(event.message ?? "Unknown error"),
              agent: id,
              model: event.model as string | undefined,
              raw: event.raw as string | undefined,
              cause: event.cause as string | undefined,
              finishReason: event.finishReason as string | undefined,
            });
          } else if (event.type === "error") {
            if (!detailedErrorRef.current) {
              setError({ message: String(event.message ?? "Unknown error") });
            }
          }
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError({ message: (e as Error).message });
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
    setRunning(false);
  }

  function resetSandbox() {
    abortRef.current?.abort();
    abortRef.current = null;
    try {
      localStorage.removeItem(STORAGE_KEYS.idea);
      localStorage.removeItem(STORAGE_KEYS.outputs);
      localStorage.removeItem(COMPANY_CONTEXT_KEY);
      localStorage.removeItem(SPRINT_PLAN_KEY);
      localStorage.removeItem(ACTION_QUEUE_KEY);
    } catch {
      setLoopErr("Could not clear sandbox localStorage.");
    }
    setIdea("");
    setRunning(false);
    setAgents(emptyState());
    setOutputs(null);
    setError(null);
    setTotalMs(null);
    setTotals(null);
    setDeploying(false);
    setDeployPhase("");
    setDeployCode("");
    setDeployUrl(null);
    setDeployHtml(null);
    setDeployErr(null);
    setDeployInstruction("");
    setLoopRunning(false);
    setLoopModeRunning(null);
    setLoopRuns([]);
    setLoopErr(null);
    setFounderBrief("");
    setDevTab("home");
    setCompanyContext(defaultCompanyContext(""));
    setSprintPlan(defaultSprintPlan());
    setContextSavedAt(null);
    setActions([]);
    setCopiedActionId(null);
    setAiCalls([]);
    setCostFilter("all");
    setLoopSignals({
      outreach_sent: 0,
      replies: 0,
      page_views: 0,
      sales: 0,
    });
  }

  // Replay whatever's in localStorage without hitting the API.
  function replayLast() {
    const { idea: savedIdea, outputs: saved } = loadSession();
    if (!savedIdea || !Object.keys(saved).length) {
    setError({ message: "Nothing saved in localStorage yet — run once first." });
      return;
    }
    setIdea(savedIdea);
    setOutputs(saved);
    setError(null);
    setTotalMs(null);
    setAgents(
      AGENT_ORDER.reduce((acc, id) => {
        acc[id] = {
          status: saved[id] ? "done" : "queued",
          text: "",
          output: saved[id] as Record<string, unknown> | undefined,
        };
        return acc;
      }, {} as Record<AgentId, AgentState>),
    );
  }

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [loopRuns, loopRunning]);

  function handleChatKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!loopRunning && founderBrief.trim()) runCosLoop("plan_only");
    }
  }

  return (
    <div className="h-screen bg-[#0d0d0f] text-white font-mono text-sm flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="border-b border-white/10 px-5 py-3 flex items-center justify-between shrink-0 bg-[#0d0d0f]/95 backdrop-blur z-10">
        <div className="flex items-center gap-3">
          <span className="font-bold tracking-tight text-white/80">cabana</span>
          <span className="text-white/20">/</span>
          <input
            value={idea}
            onChange={e => setIdea(e.target.value)}
            placeholder="Business idea…"
            className="bg-transparent border-none outline-none text-sm text-white/70 placeholder:text-white/25 w-72"
          />
          {running ? (
            <button onClick={stop} className="bg-red-500/20 text-red-300 border border-red-500/30 px-3 py-1 rounded-md text-xs hover:bg-red-500/30">
              Stop
            </button>
          ) : (
            <button onClick={run} disabled={!idea.trim()} className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-md text-xs hover:bg-emerald-500/30 disabled:opacity-40">
              Run agents
            </button>
          )}
          <button onClick={replayLast} className="bg-white/5 border border-white/10 px-3 py-1 rounded-md text-xs hover:bg-white/10">
            Replay
          </button>
          <button onClick={() => deploySite()} disabled={deploying || !outputs?.builder} className="bg-violet-500/20 text-violet-300 border border-violet-500/30 px-3 py-1 rounded-md text-xs hover:bg-violet-500/30 disabled:opacity-40 whitespace-nowrap">
            {deploying ? "Building…" : "Deploy site"}
          </button>
          {totals && (
            <span className="text-xs text-emerald-400/70">{fmtCost(totals.cost)}</span>
          )}
          {totalMs != null && (
            <span className="text-xs text-white/30">{(totalMs / 1000).toFixed(1)}s</span>
          )}
        </div>
        <button
          onClick={resetSandbox}
          className="bg-red-500/10 text-red-200 border border-red-500/25 px-3 py-1.5 rounded-md text-xs hover:bg-red-500/20 whitespace-nowrap"
        >
          Reset sandbox
        </button>
      </div>

      {error && (
        <div className="px-5 pt-2 shrink-0">
          <DevErrorBox error={error} />
        </div>
      )}

      {/* Two-column body */}
      <div className="flex flex-1 min-h-0">

        {/* LEFT: Chief of Staff chat */}
        <div className="w-1/2 shrink-0 border-r border-white/10 flex flex-col">
          {/* Chat header */}
          <div className="px-4 py-3 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-cyan-300 font-semibold text-xs">Chief of Staff</span>
              <span className={`w-1.5 h-1.5 rounded-full ${loopRunning ? "bg-yellow-400 animate-pulse" : "bg-emerald-400"}`} />
            </div>
            <p className="text-[11px] text-white/35 mt-0.5">Reads state · chooses agents · mutates the plan</p>
          </div>

          {/* Message thread */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {loopRuns.length === 0 && !loopRunning && (
              <div className="text-[11px] text-white/30 text-center pt-8">
                Send a message to brief the Chief of Staff.<br />
                <span className="text-white/20">Shift+Enter for a new line.</span>
              </div>
            )}

            {[...loopRuns].reverse().map(run => (
              <CosChatMessage
                key={run.cycle}
                run={run}
                onAddActions={addCycleActions}
              />
            ))}

            {loopRunning && (
              <div className="flex gap-2 items-start">
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] text-cyan-300">CoS</span>
                </div>
                <div className="bg-white/[0.04] border border-white/10 rounded-lg rounded-tl-none px-3 py-2">
                  <span className="text-[11px] text-white/50 animate-pulse">
                    {loopModeRunning === "run_agents" ? "Running agents…" : "Planning…"}
                  </span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {loopErr && (
            <div className="px-4 py-2 text-[10px] text-red-300 bg-red-500/10 border-t border-red-500/20 shrink-0">
              {loopErr}
            </div>
          )}

          {/* Chat input */}
          <div className="px-4 py-3 border-t border-white/10 shrink-0">
            <div className="flex gap-2 items-end">
              <textarea
                ref={chatInputRef}
                value={founderBrief}
                onChange={e => setFounderBrief(e.target.value)}
                onKeyDown={handleChatKeyDown}
                placeholder="Brief the crew… (Enter to send)"
                rows={2}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/80 placeholder:text-white/25 outline-none focus:border-cyan-500/40 resize-none"
                spellCheck={false}
              />
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => runCosLoop("plan_only")}
                  disabled={loopRunning || !idea.trim()}
                  className="bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 px-3 py-1.5 rounded-md text-xs hover:bg-cyan-500/30 disabled:opacity-40 whitespace-nowrap"
                >
                  Send
                </button>
                <button
                  onClick={() => runCosLoop("run_agents")}
                  disabled={loopRunning || !idea.trim()}
                  className="bg-white/5 text-white/50 border border-white/10 px-3 py-1.5 rounded-md text-xs hover:bg-white/10 disabled:opacity-40 whitespace-nowrap"
                  title="Send brief + run specialist agents"
                >
                  + agents
                </button>
              </div>
            </div>
            {/* Example chips */}
            <div className="flex flex-wrap gap-1 mt-2">
              {EXAMPLES.slice(0, 3).map(ex => (
                <button
                  key={ex}
                  onClick={() => {
                    setFounderBrief(ex);
                    chatInputRef.current?.focus();
                  }}
                  className="text-[10px] text-white/30 hover:text-white/60 bg-white/5 hover:bg-white/10 px-1.5 py-0.5 rounded truncate max-w-[160px]"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Workbench */}
        <div className="w-1/2 min-w-0 flex flex-col overflow-hidden">
          {/* Workbench tabs */}
          <div className="px-5 py-3 border-b border-white/10 flex items-center gap-1 shrink-0">
            {[
              ["home", "Home"],
              ["runs", "Agent runs"],
              ["product", `Product${deploying ? " · building" : deployHtml ? " · live" : ""}`],
              ["actions", `Actions${actions.filter(a => a.status !== "done").length > 0 ? ` · ${actions.filter(a => a.status !== "done").length}` : ""}`],
              ["context", "Context"],
              ["costs", "AI calls"],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setDevTab(id as DevTab)}
                className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                  devTab === id ? "bg-white/10 text-white" : "text-white/40 hover:text-white hover:bg-white/5"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Workbench content */}
          <div className="flex-1 overflow-y-auto">

            {devTab === "context" && (
              <div className="p-5">
                <div className="border border-white/10 rounded-lg overflow-hidden bg-white/[0.03]">
                  <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10">
                    <div>
                      <h2 className="font-semibold text-white text-xs">Company context</h2>
                      <p className="text-[11px] text-white/40 mt-0.5">CoS and specialist agents read this on every loop.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {contextSavedAt && <span className="text-[11px] text-white/35">Saved {contextSavedAt}</span>}
                      <button
                        onClick={() => saveCompanyContext()}
                        className="bg-white/10 border border-white/15 px-3 py-1.5 rounded-md text-xs hover:bg-white/15"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-white/60">Sprint plan</label>
                        <span className="text-[11px] text-white/25">Loop's operating target</span>
                      </div>
                      <textarea
                        value={sprintPlan}
                        onChange={e => setSprintPlan(e.target.value)}
                        onBlur={() => saveCompanyContext()}
                        className="w-full min-h-[150px] bg-black/30 border border-white/10 rounded-md p-4 text-xs text-white/75 outline-none focus:border-white/25 whitespace-pre-wrap"
                        spellCheck={false}
                      />
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-white/60">Strategy doc</label>
                      <span className="text-[11px] text-white/25">Broader context, constraints, notes</span>
                    </div>
                    <textarea
                      value={companyContext}
                      onChange={e => setCompanyContext(e.target.value)}
                      onBlur={() => saveCompanyContext()}
                      className="w-full min-h-[360px] bg-black/30 border border-white/10 rounded-md p-4 text-xs text-white/75 outline-none focus:border-white/25 whitespace-pre-wrap"
                      spellCheck={false}
                    />
                    <div className="mt-3 flex items-center justify-between text-[11px] text-white/35">
                      <span>{companyContext.length.toLocaleString()} chars</span>
                      <button
                        onClick={() => {
                          const nextContext = defaultCompanyContext(idea);
                          const nextSprint = defaultSprintPlan();
                          setCompanyContext(nextContext);
                          setSprintPlan(nextSprint);
                          saveCompanyContext(nextContext, nextSprint);
                        }}
                        className="hover:text-white"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {devTab === "actions" && (
              <div className="p-5">
                <ActionQueue
                  actions={actions}
                  copiedActionId={copiedActionId}
                  onCopy={copyAction}
                  onUpdate={updateAction}
                  onRunBuilder={deploySite}
                  onSignal={bumpSignal}
                  builderRunning={deploying}
                  hasDeployHtml={Boolean(deployHtml)}
                />
              </div>
            )}

            {devTab === "costs" && (
              <div className="p-5">
                <AiCallLedger calls={aiCalls} filter={costFilter} onFilterChange={setCostFilter} />
              </div>
            )}

            {devTab === "home" && (
              <DevHomeSummary
                idea={idea}
                outputs={outputs}
                actions={actions}
                agents={agents}
                totals={totals}
                loopSignals={loopSignals}
                deployHtml={deployHtml}
                deployUrl={deployUrl}
                deploying={deploying}
                onSignal={bumpSignal}
              />
            )}

            {devTab === "product" && (
              <div className="p-5">
                <div className="border border-violet-500/20 rounded-lg overflow-hidden bg-violet-500/[0.03]">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
                    <span className="font-semibold text-violet-300 text-xs">Builder → Vercel Sandbox</span>
                    {deployPhase ? (
                      <span className="text-[11px] text-white/50">
                        {deployPhase}{deploying && <span className="animate-pulse"> ▋</span>}
                      </span>
                    ) : (
                      <button
                        onClick={() => deploySite()}
                        disabled={deploying || !outputs?.builder}
                        className="text-[11px] bg-violet-500/15 text-violet-200 border border-violet-500/25 rounded px-3 py-1.5 hover:bg-violet-500/25 disabled:opacity-40"
                      >
                        Deploy site
                      </button>
                    )}
                  </div>
                  {deployErr && (
                    <div className="px-4 py-2 text-[11px] text-yellow-300 bg-yellow-500/10 border-b border-white/5">
                      {deployErr} (preview still rendered below)
                    </div>
                  )}
                  {!deploying && !deployCode && !deployHtml && (
                    <div className="px-4 py-10 text-center">
                      <p className="text-xs text-white/45">No product preview yet.</p>
                      <p className="mt-1 text-[11px] text-white/25">Run agents until Builder has an output, then deploy the site.</p>
                    </div>
                  )}
                  {deployCode && !deployHtml && (
                    <pre className="px-4 py-3 text-[11px] text-white/60 whitespace-pre-wrap break-words max-h-64 overflow-auto">
                      {deployCode}{deploying && <span className="animate-pulse">▋</span>}
                    </pre>
                  )}
                  {deployHtml && (
                    <div className="px-4 py-4">
                      {deployUrl && (
                        <a href={deployUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-300 underline break-all">
                          {deployUrl} ↗
                        </a>
                      )}
                      <div className="mt-3 border border-white/10 rounded-md bg-black/20 p-3">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <label className="text-[11px] text-white/45">Push an update</label>
                          <button
                            onClick={() => deploySite()}
                            disabled={deploying || !deployInstruction.trim()}
                            className="text-[11px] bg-violet-500/15 text-violet-200 border border-violet-500/25 rounded px-3 py-1.5 hover:bg-violet-500/25 disabled:opacity-40"
                          >
                            {deploying ? "Updating…" : "Update & deploy"}
                          </button>
                        </div>
                        <textarea
                          value={deployInstruction}
                          onChange={e => setDeployInstruction(e.target.value)}
                          placeholder="Example: Reframe the hero around private feedback instead of community."
                          className="w-full min-h-[72px] bg-white/5 border border-white/10 rounded p-2 text-[11px] text-white/75 outline-none focus:border-violet-500/35"
                          spellCheck={false}
                        />
                      </div>
                      <iframe
                        title="generated site preview"
                        srcDoc={deployHtml}
                        className="w-full h-[520px] mt-3 rounded-md border border-white/10 bg-white"
                      />
                      <details className="mt-2">
                        <summary className="cursor-pointer text-[11px] text-white/40 select-none">View source ({deployHtml.length.toLocaleString()} chars)</summary>
                        <pre className="mt-2 text-[11px] text-white/50 whitespace-pre-wrap break-words max-h-64 overflow-auto">{deployHtml}</pre>
                      </details>
                    </div>
                  )}
                </div>
              </div>
            )}

            {devTab === "runs" && (
              <div className="p-5 space-y-4">
                {/* Agent grid */}
                <div className="grid xl:grid-cols-2 gap-3">
                  {AGENT_ORDER.map(id => (
                    <AgentPanel key={id} id={id} state={agents[id]} />
                  ))}
                </div>

                {/* Full outputs dump */}
                {outputs && (
                  <details className="bg-white/5 border border-white/10 rounded-lg">
                    <summary className="cursor-pointer px-4 py-3 text-xs text-white/50 select-none">
                      Full AgentOutputs (localStorage)
                    </summary>
                    <pre className="px-4 pb-4 text-[11px] text-white/70 overflow-auto whitespace-pre-wrap break-words">
                      {JSON.stringify(outputs, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function defaultSprintPlan() {
  return `# Current Experiment

Hypothesis:
Beginner golfers who feel lost after lessons will pay for a short, guided feedback sprint.

Test:
Publish one landing page and send a small batch of founder-approved Reddit/community replies.

Success metric:
Interested replies, checkout clicks, signups, or first sale.

Threshold:
3+ interested replies or 1 paid order before expanding scope.

Next review:
After 24-48 hours of signals.`;
}

function defaultCompanyContext(idea: string) {
  return `# Company Context

## Business
${idea}

## Current Strategy
- ICP:
- Offer:
- Price:
- Primary channel:
- First revenue signal:

## Working Plan
- Publish a simple landing page.
- Drive one narrow channel.
- Track replies, clicks, signups, and sales.
- Adapt after every signal.

## Constraints
- Do not claim external actions happened unless a tool actually did them.
- Escalate before publishing, sending outreach, spending money, or changing the core offer.

## Open Questions
- Who can the founder already reach?
- What asset or proof does the founder already have?
- What is the smallest paid test?`;
}

function normalizeUsage(usage: unknown) {
  const u = usage as { inputTokens?: number; outputTokens?: number; totalTokens?: number } | undefined;
  const inputTokens = u?.inputTokens ?? 0;
  const outputTokens = u?.outputTokens ?? 0;
  return {
    inputTokens,
    outputTokens,
    totalTokens: u?.totalTokens ?? inputTokens + outputTokens,
  };
}

function estimateCallCost(model: string | undefined, inputTokens: number, outputTokens: number) {
  const p = model ? MODEL_PRICING[model] : undefined;
  if (!p) return 0;
  return (inputTokens / 1_000_000) * p.in + (outputTokens / 1_000_000) * p.out;
}

function readStoredActions(): ActionItem[] {
  try {
    const raw = localStorage.getItem(ACTION_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function summarizeActions(actions: ActionItem[]) {
  return actions.slice(0, 20).map(action => ({
    title: action.title,
    channel: action.channel,
    status: action.status,
    cycle: action.cycle,
    type: action.type,
    work_order_status: action.workOrder?.status,
    task_type: action.workOrder?.task_type,
    details: action.details.slice(0, 500),
  }));
}

function actionId(cycle: number, label: string) {
  return `action-${cycle}-${label}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function actionsFromCycle(run: LoopRun): ActionItem[] {
  const createdAt = new Date().toISOString();
  const actions: ActionItem[] = [];

  if (run.loop.next_play) {
    actions.push({
      id: actionId(run.cycle, "next-play"),
      cycle: run.cycle,
      title: "Execute next play",
      channel: inferChannel(run.loop.next_play),
      details: run.loop.next_play,
      why: "This is the CoS-selected next external move for the sprint.",
      status: "pending",
      createdAt,
    });
  }

  for (const workOrder of run.loop.work_orders ?? []) {
    actions.push({
      id: actionId(run.cycle, `builder-${workOrder.task_type}`),
      cycle: run.cycle,
      title: workOrder.title || `Builder: ${workOrder.task_type === "new_site" ? "create landing page" : "update product page"}`,
      channel: "Builder",
      details: workOrder.brief,
      why: workOrder.reason,
      status: "pending",
      createdAt,
      type: "builder_work_order",
      workOrder: { ...workOrder, status: "pending_approval" },
    });
  }

  if (run.loop.escalation.needed) {
    actions.push({
      id: actionId(run.cycle, "escalation"),
      cycle: run.cycle,
      title: "Resolve founder escalation",
      channel: "Founder approval",
      details: run.loop.escalation.question,
      why: run.loop.escalation.reason,
      status: "pending",
      createdAt,
    });
  }

  for (const agentRun of run.agent_results ?? []) {
    const name = AGENT_META[agentRun.agent].name;
    actions.push({
      id: actionId(run.cycle, agentRun.agent),
      cycle: run.cycle,
      title: `${name}: use output`,
      channel: inferChannel(`${agentRun.task}\n${agentRun.result.output}`),
      details: agentRun.result.output,
      why: agentRun.result.suggested_play || agentRun.task,
      status: "pending",
      createdAt,
    });
  }

  if (actions.length === 0) {
    for (const agent of run.loop.agents_to_run) {
      actions.push({
        id: actionId(run.cycle, agent.agent),
        cycle: run.cycle,
        title: `${AGENT_META[agent.agent].name}: prepare work`,
        channel: inferChannel(agent.task),
        details: agent.task,
        why: agent.reason,
        status: "pending",
        createdAt,
      });
    }
  }

  return actions.slice(0, 5);
}

function inferChannel(text: string) {
  const t = text.toLowerCase();
  if (t.includes("reddit") || t.includes("r/")) return "Reddit";
  if (t.includes("gmail") || t.includes("email")) return "Email";
  if (t.includes("gumroad") || t.includes("stripe") || t.includes("checkout")) return "Checkout";
  if (t.includes("landing") || t.includes("page") || t.includes("carrd")) return "Landing page";
  if (t.includes("discord") || t.includes("slack")) return "Community";
  return "Manual";
}

function ActionQueue({
  actions,
  copiedActionId,
  onCopy,
  onUpdate,
  onRunBuilder,
  onSignal,
  builderRunning,
  hasDeployHtml,
}: {
  actions: ActionItem[];
  copiedActionId: string | null;
  onCopy: (action: ActionItem) => void;
  onUpdate: (id: string, patch: Partial<ActionItem>) => void;
  onRunBuilder: (action: ActionItem) => void;
  onSignal: (key: "outreach_sent" | "replies" | "page_views" | "sales") => void;
  builderRunning: boolean;
  hasDeployHtml: boolean;
}) {
  const active = actions.filter(action => action.status !== "done");
  const done = actions.filter(action => action.status === "done");

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden bg-white/[0.03]">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10">
        <div>
          <h2 className="font-semibold text-white">Action queue</h2>
          <p className="text-[11px] text-white/40 mt-0.5">Manual execution bridge. Copy the work, do it outside Cabana, then log what happened.</p>
        </div>
        <div className="text-[11px] text-white/35">
          {active.length} active · {done.length} done
        </div>
      </div>

      {actions.length === 0 ? (
        <div className="px-4 py-5 text-xs text-white/40">
          No actions yet. Run a CoS cycle, then click Add actions on the cycle card.
        </div>
      ) : (
        <div className="divide-y divide-white/10">
          {actions.map(action => (
            <div key={action.id} className={`p-4 ${action.status === "done" ? "opacity-55" : ""}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-white">{action.title}</span>
                    <span className="text-[10px] text-cyan-200 bg-cyan-500/10 border border-cyan-500/20 rounded px-1.5 py-0.5">{action.channel}</span>
                    <span className={`text-[10px] rounded px-1.5 py-0.5 border ${
                      action.status === "done" ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/20" :
                      action.status === "approved" ? "text-yellow-200 bg-yellow-500/10 border-yellow-500/20" :
                      "text-white/45 bg-white/5 border-white/10"
                    }`}>
                      {action.status}
                    </span>
                    <span className="text-[10px] text-white/25">cycle {action.cycle}</span>
                  </div>
                  <p className="text-[11px] text-white/35 mt-2">{action.why}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => onCopy(action)} className="text-[11px] bg-white/5 border border-white/10 rounded px-2 py-1 hover:bg-white/10">
                    {copiedActionId === action.id ? "Copied" : "Copy"}
                  </button>
                  <button
                    onClick={() => onUpdate(action.id, {
                      status: "approved",
                      workOrder: action.workOrder ? { ...action.workOrder, status: "approved" } : action.workOrder,
                    })}
                    className="text-[11px] bg-yellow-500/10 text-yellow-200 border border-yellow-500/20 rounded px-2 py-1 hover:bg-yellow-500/20"
                  >
                    Approve
                  </button>
                  {action.type === "builder_work_order" && (
                    <button
                      onClick={() => onRunBuilder(action)}
                      disabled={
                        builderRunning ||
                        action.status !== "approved" ||
                        action.workOrder?.status === "running" ||
                        (action.workOrder?.task_type === "product_update" && !hasDeployHtml)
                      }
                      className="text-[11px] bg-violet-500/15 text-violet-200 border border-violet-500/25 rounded px-2 py-1 hover:bg-violet-500/25 disabled:opacity-40"
                      title={action.workOrder?.task_type === "product_update" && !hasDeployHtml ? "Build or replay a site before running a product update." : undefined}
                    >
                      {action.workOrder?.status === "running" ? "Running..." : "Run Builder"}
                    </button>
                  )}
                  <button onClick={() => onUpdate(action.id, { status: "done" })} className="text-[11px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded px-2 py-1 hover:bg-emerald-500/20">
                    Done
                  </button>
                </div>
              </div>

              <pre className="mt-3 text-[11px] text-white/70 whitespace-pre-wrap break-words bg-black/25 border border-white/10 rounded p-3 max-h-52 overflow-auto">
                {action.details}
              </pre>

              {action.resultUrl && (
                <a href={action.resultUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-[11px] text-violet-300 underline break-all">
                  {action.resultUrl}
                </a>
              )}

              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-white/35">Log signal</span>
                {[
                  ["outreach_sent", "+ Outreach"],
                  ["replies", "+ Reply"],
                  ["page_views", "+ View"],
                  ["sales", "+ Sale"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => onSignal(key as "outreach_sent" | "replies" | "page_views" | "sales")}
                    className="text-[11px] bg-white/5 border border-white/10 rounded px-2 py-1 hover:bg-white/10"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DevHomeSummary({
  idea,
  outputs,
  actions,
  agents,
  totals,
  loopSignals,
  deployHtml,
  deployUrl,
  deploying,
  onSignal,
}: {
  idea: string;
  outputs: AgentOutputs | null;
  actions: ActionItem[];
  agents: Record<AgentId, AgentState>;
  totals: Totals | null;
  loopSignals: Record<"outreach_sent" | "replies" | "page_views" | "sales", number>;
  deployHtml: string | null;
  deployUrl: string | null;
  deploying: boolean;
  onSignal: (key: "outreach_sent" | "replies" | "page_views" | "sales") => void;
}) {
  const doneAgents = AGENT_ORDER.filter(id => agents[id].status === "done").length;
  const activeActions = actions.filter(action => action.status !== "done").length;
  const businessName = outputs?.strategist?.businessName ?? idea;
  const offer = outputs?.strategist?.offer ?? "No offer locked yet";
  const channel = outputs?.strategist?.channel ?? outputs?.scout?.channels?.[0] ?? "No channel selected";
  const nextPlay = outputs?.analyst?.next_play ?? actions.find(action => action.status !== "done")?.details ?? "Run the crew to get the next recommended play.";
  const headline = outputs?.builder?.headline ?? "No product page generated yet";
  const sprintGoal = outputs?.strategist?.goal ?? "First paid signal";
  const latestActions = actions.slice(0, 4);

  return (
    <div className="p-5 space-y-4">
      <div className="border border-white/10 rounded-lg bg-white/[0.03] overflow-hidden">
        <div className="px-4 py-4 border-b border-white/10">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-white/30">Sprint dashboard</p>
              <h2 className="mt-1 text-lg font-semibold text-white truncate">{businessName || "Untitled Cabana"}</h2>
              <p className="mt-1 text-xs text-white/45 line-clamp-2">{idea}</p>
            </div>
            <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] ${
              deployHtml ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300" :
              deploying ? "border-yellow-500/25 bg-yellow-500/10 text-yellow-200" :
              "border-white/10 bg-white/5 text-white/40"
            }`}>
              {deployHtml ? "Product live" : deploying ? "Building" : "Drafting"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-px bg-white/10">
          {[
            ["Agents", `${doneAgents}/${AGENT_ORDER.length}`],
            ["Actions", activeActions.toString()],
            ["Signals", Object.values(loopSignals).reduce((sum, value) => sum + value, 0).toString()],
            ["Cost", fmtCost(totals?.cost)],
          ].map(([label, value]) => (
            <div key={label} className="bg-[#0d0d0f] px-4 py-3">
              <p className="text-[10px] text-white/35 uppercase tracking-wide">{label}</p>
              <p className="mt-1 text-sm font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid xl:grid-cols-2 gap-4">
        <div className="border border-white/10 rounded-lg bg-white/[0.03] p-4">
          <p className="text-[10px] uppercase tracking-wide text-white/30">Strategy</p>
          <div className="mt-3 space-y-3">
            {[
              ["Offer", offer],
              ["Channel", channel],
              ["Goal", sprintGoal],
              ["Next play", nextPlay],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-[10px] text-white/30">{label}</p>
                <p className="mt-0.5 text-xs text-white/70 line-clamp-3">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-white/10 rounded-lg bg-white/[0.03] p-4">
          <p className="text-[10px] uppercase tracking-wide text-white/30">Product</p>
          <h3 className="mt-3 text-sm font-semibold text-white line-clamp-2">{headline}</h3>
          <p className="mt-2 text-xs text-white/45 line-clamp-3">{outputs?.builder?.subheadline ?? outputs?.builder?.pain_hook ?? "Builder output will appear here after an agent run."}</p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-[11px] text-white/35">{deployHtml ? `${deployHtml.length.toLocaleString()} chars generated` : "No preview generated"}</span>
            {deployUrl && (
              <a href={deployUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-violet-300 underline">
                Open site ↗
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-2 gap-4">
        <div className="border border-white/10 rounded-lg bg-white/[0.03] p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wide text-white/30">Signals</p>
            <p className="text-[11px] text-white/35">Manual loop input</p>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {[
              ["outreach_sent", "Outreach", loopSignals.outreach_sent],
              ["replies", "Replies", loopSignals.replies],
              ["page_views", "Views", loopSignals.page_views],
              ["sales", "Sales", loopSignals.sales],
            ].map(([key, label, value]) => (
              <button
                key={key}
                onClick={() => onSignal(key as "outreach_sent" | "replies" | "page_views" | "sales")}
                className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-left hover:bg-white/5 transition-colors"
              >
                <p className="text-[10px] text-white/35">{label}</p>
                <p className="mt-1 text-sm font-semibold text-emerald-300">+{value}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="border border-white/10 rounded-lg bg-white/[0.03] p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wide text-white/30">Action queue</p>
            <p className="text-[11px] text-white/35">{activeActions} active</p>
          </div>
          <div className="mt-3 space-y-2">
            {latestActions.length === 0 ? (
              <p className="text-xs text-white/40">No actions queued yet.</p>
            ) : latestActions.map(action => (
              <div key={action.id} className="rounded-md border border-white/10 bg-black/20 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-white truncate">{action.title}</p>
                  <span className="text-[10px] text-white/35 shrink-0">{action.status}</span>
                </div>
                <p className="mt-1 text-[11px] text-white/35 line-clamp-2">{action.why}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AiCallLedger({
  calls,
  filter,
  onFilterChange,
}: {
  calls: AiCall[];
  filter: "all" | "generate" | "cos";
  onFilterChange: (f: "all" | "generate" | "cos") => void;
}) {
  const filtered = filter === "all" ? calls : calls.filter(c => c.source === filter);
  const totals = filtered.reduce(
    (acc, call) => {
      acc.inputTokens += call.inputTokens;
      acc.outputTokens += call.outputTokens;
      acc.totalTokens += call.totalTokens;
      acc.cost += call.cost;
      return acc;
    },
    { inputTokens: 0, outputTokens: 0, totalTokens: 0, cost: 0 }
  );

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden bg-white/[0.03]">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10">
        <div>
          <h2 className="font-semibold text-white">AI call ledger</h2>
          <p className="text-[11px] text-white/40 mt-0.5">Session total for generation, CoS decisions, and specialist subcalls.</p>
        </div>
        <div className="inline-flex bg-black/20 border border-white/10 rounded-md p-1">
          {(["all", "generate", "cos"] as const).map(f => (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
              className={`text-[11px] px-2.5 py-1 rounded ${filter === f ? "bg-white text-black" : "text-white/50 hover:text-white"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-px bg-white/10 border-b border-white/10">
        {[
          ["Input", totals.inputTokens.toLocaleString()],
          ["Output", totals.outputTokens.toLocaleString()],
          ["Total", totals.totalTokens.toLocaleString()],
          ["Cost", fmtCost(totals.cost)],
        ].map(([label, value]) => (
          <div key={label} className="bg-[#0d0d0f] px-4 py-3">
            <p className="text-[10px] text-white/35 uppercase tracking-wide">{label}</p>
            <p className="text-sm font-semibold text-emerald-300 mt-1">{value}</p>
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="px-4 py-5 text-xs text-white/40">No AI calls recorded in this browser session yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-white/35 border-b border-white/10">
              <tr>
                <th className="text-left font-medium px-4 py-2">Source</th>
                <th className="text-left font-medium px-4 py-2">Agent</th>
                <th className="text-left font-medium px-4 py-2">Model</th>
                <th className="text-right font-medium px-4 py-2">Input</th>
                <th className="text-right font-medium px-4 py-2">Output</th>
                <th className="text-right font-medium px-4 py-2">Total</th>
                <th className="text-right font-medium px-4 py-2">Cost</th>
                <th className="text-right font-medium px-4 py-2">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(call => (
                <tr key={call.id} className="text-white/65">
                  <td className="px-4 py-2">{call.source}{call.cycle ? ` #${call.cycle}` : ""}</td>
                  <td className="px-4 py-2">{call.agent === "cos" ? "CoS" : AGENT_META[call.agent].name}</td>
                  <td className="px-4 py-2 text-white/40">{shortModel(call.model)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{call.inputTokens.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{call.outputTokens.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{call.totalTokens.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-emerald-300">{fmtCost(call.cost)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-white/35">{call.ms ? `${(call.ms / 1000).toFixed(1)}s` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DevErrorBox({ error }: { error: DevError }) {
  return (
    <div className="mt-2 text-xs text-red-200 bg-red-500/10 border border-red-500/30 rounded-md overflow-hidden">
      <div className="px-3 py-2 flex items-center gap-2 flex-wrap">
        <span className="font-semibold text-red-100">Run error</span>
        {error.agent && <span className="text-red-200/70">agent: {AGENT_META[error.agent].name}</span>}
        {error.model && <span className="text-red-200/70">model: {shortModel(error.model)}</span>}
        {error.finishReason && <span className="text-red-200/70">finish: {error.finishReason}</span>}
      </div>
      <div className="px-3 pb-3">
        <p className="text-red-100">{humanizeDevError(error.message)}</p>
        {error.cause && <p className="text-red-200/60 mt-1">{error.cause}</p>}
        {error.raw && (
          <details className="mt-2">
            <summary className="cursor-pointer text-red-200/70 select-none">Raw model output</summary>
            <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap break-words bg-black/30 border border-red-500/20 rounded p-3 text-red-100/80">
              {error.raw}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

function humanizeDevError(message: string) {
  if (!message) return "Unknown run error. Check the raw output or server log for details.";
  if (message.includes("No object generated") || message.includes("response did not match schema")) {
    return "The model returned output that did not match the required JSON schema.";
  }
  return message;
}

function TraceBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-md p-3">
      <p className="text-[11px] text-white/40 mb-1">{label}</p>
      <p className="text-[11px] text-white/70">{text}</p>
    </div>
  );
}

function CosChatMessage({
  run,
  onAddActions,
}: {
  run: LoopRun;
  onAddActions: (run: LoopRun) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-2">
      {/* Founder brief (if any) — shown as user bubble */}
      {run.founderBrief && (
        <div className="flex justify-end">
          <div className="bg-white/10 border border-white/10 rounded-lg rounded-tr-none px-3 py-2 max-w-[85%]">
            <p className="text-[11px] text-white/80 whitespace-pre-wrap">{run.founderBrief}</p>
          </div>
        </div>
      )}

      {/* CoS response bubble */}
      <div className="flex gap-2 items-start">
        <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-[9px] text-cyan-300 font-bold">CoS</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="bg-white/[0.04] border border-white/10 rounded-lg rounded-tl-none px-3 py-2.5 space-y-2">
            {/* Decision */}
            <p className="text-[11px] text-white/80 leading-relaxed">{run.loop.decision}</p>

            {/* Plan changes */}
            {run.loop.plan_changes.length > 0 && (
              <div className="space-y-0.5 pt-1 border-t border-white/8">
                {run.loop.plan_changes.map((change, i) => (
                  <div key={i} className="flex gap-1.5 text-[10px]">
                    <span className={
                      change.type === "add" ? "text-emerald-400" :
                      change.type === "remove" ? "text-red-400" :
                      "text-yellow-400"
                    }>
                      {change.type === "add" ? "+" : change.type === "remove" ? "−" : "~"}
                    </span>
                    <span className="text-white/55">{change.text}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Next play */}
            {run.loop.next_play && (
              <div className="pt-1 border-t border-white/8">
                <span className="text-[10px] text-cyan-300/70">next → </span>
                <span className="text-[10px] text-white/60">{run.loop.next_play}</span>
              </div>
            )}

            {/* Escalation */}
            {run.loop.escalation.needed && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-md px-2.5 py-2">
                <p className="text-[10px] text-yellow-200 font-semibold mb-0.5">Needs your input</p>
                <p className="text-[10px] text-white/70">{run.loop.escalation.question}</p>
              </div>
            )}

            {/* Expand for full detail */}
            <button
              onClick={() => setExpanded(e => !e)}
              className="text-[10px] text-white/25 hover:text-white/50 pt-0.5"
            >
              {expanded ? "hide detail ↑" : "show detail ↓"}
            </button>

            {expanded && (
              <div className="space-y-2 pt-1 border-t border-white/8">
                <div>
                  <p className="text-[10px] text-white/35 mb-1">State read</p>
                  <p className="text-[10px] text-white/60">{run.loop.state_read}</p>
                </div>
                {run.loop.agents_to_run.length > 0 && (
                  <div>
                    <p className="text-[10px] text-white/35 mb-1">Agents selected</p>
                    {run.loop.agents_to_run.map((a, i) => (
                      <div key={i} className="text-[10px] mb-1">
                        <span className="font-semibold" style={{ color: AGENT_COLOR[a.agent] }}>{AGENT_META[a.agent].name}</span>
                        <span className="text-white/45"> — {a.task}</span>
                      </div>
                    ))}
                  </div>
                )}
                {run.agent_results && run.agent_results.length > 0 && (
                  <div>
                    <p className="text-[10px] text-white/35 mb-1">Specialist outputs</p>
                    {run.agent_results.map((ar, i) => (
                      <div key={i} className="mb-2">
                        <span className="text-[10px] font-semibold" style={{ color: AGENT_COLOR[ar.agent] }}>{AGENT_META[ar.agent].name}</span>
                        <pre className="mt-1 text-[10px] text-white/60 whitespace-pre-wrap break-words bg-black/20 rounded p-2 max-h-40 overflow-auto">{ar.result.output}</pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer: meta + action */}
          <div className="flex items-center gap-2 mt-1 px-1">
            <span className="text-[10px] text-white/20">
              cycle {run.cycle} · {run.mode === "run_agents" ? "with agents" : "plan only"}
              {run.usage?.totalTokens ? ` · ${run.usage.totalTokens.toLocaleString()} tok` : ""}
            </span>
            <button
              onClick={() => onAddActions(run)}
              className="text-[10px] text-cyan-300/60 hover:text-cyan-300 ml-auto"
            >
              + add actions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AgentPanel({ id, state }: { id: AgentId; state: AgentState }) {
  const m = AGENT_META[id];
  const color = AGENT_COLOR[id];
  const model = state.model ?? AGENT_MODELS[id];
  const elapsed =
    state.ms != null
      ? (state.ms / 1000).toFixed(1) + "s"
      : state.startedAt != null && state.doneAt != null
      ? ((state.doneAt - state.startedAt) / 1000).toFixed(1) + "s"
      : null;
  const tokens =
    state.usage ? state.usage.inputTokens + state.usage.outputTokens : null;

  const statusColor =
    state.status === "done" ? "text-emerald-400"
    : state.status === "working" ? "text-yellow-400"
    : state.status === "error" ? "text-red-400"
    : "text-white/30";

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden bg-white/[0.02]">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10" style={{ background: `${color}10` }}>
        <div className="flex items-center gap-2 min-w-0">
          <span>{m.icon}</span>
          <span className="font-semibold" style={{ color }}>{m.name}</span>
          <span className="text-white/30 text-[10px] bg-white/5 px-1.5 py-0.5 rounded">{shortModel(model)}</span>
        </div>
        <div className="flex items-center gap-3 text-xs shrink-0">
          {elapsed && <span className="text-white/40">{elapsed}</span>}
          <span className={statusColor}>{state.status}</span>
        </div>
      </div>

      {state.status === "working" && (
        <div className="px-4 py-1.5 border-b border-white/5 text-[11px] text-yellow-300/70">
          streaming live output…
        </div>
      )}

      {/* Usage / cost row */}
      {(tokens != null || state.cost != null) && (
        <div className="flex gap-4 px-4 py-1.5 border-b border-white/5 text-[11px] text-white/40">
          {tokens != null && (
            <span>
              {tokens.toLocaleString()} tok
              <span className="text-white/25"> ({state.usage!.inputTokens.toLocaleString()}↓ / {state.usage!.outputTokens.toLocaleString()}↑)</span>
            </span>
          )}
          {state.cost != null && <span className="text-emerald-400/70">≈ {fmtCost(state.cost)}</span>}
        </div>
      )}

      {/* Stats */}
      {state.stats && state.stats.length > 0 && (
        <div className="flex gap-4 px-4 py-2 border-b border-white/5">
          {state.stats.map(s => (
            <div key={s.label} className="text-xs">
              <span className="text-white/40">{s.label}: </span>
              <span style={{ color }}>{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Body: final parsed object if done, else live stream */}
      <div className="px-4 py-3 min-h-[120px]">
        {state.output ? (
          <pre className="text-[11px] text-white/70 whitespace-pre-wrap break-words">
            {JSON.stringify(state.output, null, 2)}
          </pre>
        ) : (
          <p className="text-[11px] text-white/40 whitespace-pre-wrap break-words leading-relaxed">
            {state.status === "queued" ? "waiting…" : state.text}
            {state.status === "working" && <span className="animate-pulse">▋</span>}
          </p>
        )}
      </div>
    </div>
  );
}
