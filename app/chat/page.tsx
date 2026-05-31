"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useRouter, useSearchParams } from "next/navigation";
import { AGENT_META, AGENT_COLOR, AGENT_MODELS, EXAMPLES, type AgentId } from "@/app/lib/cabana-config";
import { Desk, type CrewStatus, type AgentActivity, type CrewRun, type DeskTab } from "@/app/components/cabana/Desk";
import { loadBriefAsync, saveBrief, type BusinessBrief } from "@/app/lib/cabana-brief";
import { streamBuild, type BuildState } from "@/app/lib/cabana-build";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Suggestions, Suggestion } from "@/components/ai-elements/suggestion";
import Link from "next/link";
import { TreePalm, ChevronLeft } from "lucide-react";
import { Avatar } from "@/app/components/Avatar";
import { Tool, ToolHeader, ToolContent } from "@/components/ai-elements/tool";
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@/components/ai-elements/reasoning";
import { CrewToolCard } from "@/app/components/cabana/CrewCards";

const SURF = "#23b5d3";

// ─── DB-backed persistence ────────────────────────────────────────────────

function cabanaQs(cabanaId: string | null) {
  return cabanaId ? `?cabana=${cabanaId}` : "";
}

// Parse the JSON enabled_agents column into a clean AgentId[].
function parseRoster(raw: unknown): AgentId[] {
  try {
    const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(arr)) return [];
    return arr.filter((a): a is AgentId => a in AGENT_META);
  } catch {
    return [];
  }
}

async function loadHistoryDB(cabanaId: string | null): Promise<UIMessage[]> {
  try {
    const res = await fetch(`/api/cabana/chat-history${cabanaQs(cabanaId)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.messages ?? [];
  } catch {
    return [];
  }
}

async function saveHistoryDB(messages: UIMessage[], cabanaId: string | null) {
  try {
    await fetch(`/api/cabana/chat-history${cabanaQs(cabanaId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
  } catch { /* ignore */ }
}

async function clearHistoryDB(cabanaId: string | null) {
  try {
    await fetch(`/api/cabana/chat-history${cabanaQs(cabanaId)}`, { method: "DELETE" });
  } catch { /* ignore */ }
}

async function loadBuildDB(cabanaId: string | null): Promise<BuildState | null> {
  try {
    const res = await fetch(`/api/cabana/builds${cabanaQs(cabanaId)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status === "idle" || !data.html) return null;
    return { status: "done", html: data.html, url: data.url, projectId: data.projectId };
  } catch {
    return null;
  }
}

async function saveBuildDB(build: BuildState, cabanaId: string | null) {
  try {
    await fetch(`/api/cabana/builds${cabanaQs(cabanaId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        html: build.html,
        deployUrl: build.url,
        deployStatus: build.url ? "deployed" : "pending",
        projectId: build.projectId ?? null,
      }),
    });
  } catch { /* ignore */ }
}

// Derive each agent's live status from the chat's tool-call stream. The CoS
// calls agents as tools; we read those parts to drive the desk's crew cards.
function deriveCrew(messages: ReturnType<typeof useChat>["messages"]): CrewStatus {
  const crew = Object.fromEntries(
    Object.keys(AGENT_META).map((id) => [id, { status: "idle" } as AgentActivity])
  ) as CrewStatus;

  for (const m of messages) {
    if (m.role !== "assistant") continue;
    for (const part of m.parts) {
      if (!part.type.startsWith("tool-")) continue;
      const name = part.type.slice("tool-".length);
      if (!(name in crew)) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = part as any;
      const working = p.state === "input-streaming" || p.state === "input-available";
      crew[name as AgentId] = {
        status: p.state === "output-available" ? "done" : working ? "working" : crew[name as AgentId].status,
        task: p.input?.task ?? crew[name as AgentId].task,
        output: p.output ?? crew[name as AgentId].output,
      };
    }
  }
  return crew;
}

// Derive the ordered run history — one entry per agent tool call, in order, so
// re-running an agent appends rather than overwrites. Drives the Crew feed.
function deriveRuns(messages: ReturnType<typeof useChat>["messages"]): CrewRun[] {
  const runs: CrewRun[] = [];
  for (const m of messages) {
    if (m.role !== "assistant") continue;
    for (const part of m.parts) {
      if (!part.type.startsWith("tool-")) continue;
      const agent = part.type.slice("tool-".length);
      if (!(agent in AGENT_META)) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = part as any;
      
      // Capture streaming text — the AI SDK exposes the partial result in p.result
      // while streaming (state = "output-streaming"), then the final output once done.
      const streamingText = p.state === "output-streaming" ? p.result : undefined;
      
      runs.push({
        id: p.toolCallId ?? `${agent}-${runs.length}`,
        agent: agent as AgentId,
        task: p.input?.task,
        status: p.state === "output-available" ? "done" : "working",
        output: p.output,
        streamingText,
      });
    }
  }
  return runs;
}

// Map a tool name (e.g. "scout", "request_landing_page_deploy") to crew metadata.
function toolMeta(toolName: string): { name: string; icon: string; color: string } {
  const id = toolName as AgentId;
  if (id in AGENT_META) {
    return { name: AGENT_META[id].name, icon: AGENT_META[id].icon, color: AGENT_COLOR[id] };
  }
  if (toolName === "request_landing_page_deploy") {
    return { name: "Work order", icon: "📋", color: SURF };
  }
  return { name: toolName, icon: "🛠️", color: SURF };
}

function ChatInner() {
  const router = useRouter();
  const params = useSearchParams();
  const cabanaId = params.get("cabana");

  // Subscription gate — check on mount, redirect to /upgrade if inactive.
  // Skip the redirect when coming back from Stripe checkout (?subscribed=success)
  // since the webhook may not have fired yet.
  const [subChecked, setSubChecked] = useState(false);
  const [showSuccess, setShowSuccess] = useState(params.get("subscribed") === "success");
  const comingFromCheckout = params.get("subscribed") === "success";

  useEffect(() => {
    fetch("/api/user/subscription")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && !data.active && !comingFromCheckout) router.replace("/upgrade");
        else setSubChecked(true);
      })
      .catch(() => setSubChecked(true));
  }, [router, comingFromCheckout]);
  
  // The Business Brief — CoS long-term memory. Held here, sent with every
  // request, and re-persisted whenever the CoS revises it via its tool.
  const [brief, setBrief] = useState<BusinessBrief>({ content: "", updatedAt: null });
  const briefRef = useRef(brief);
  briefRef.current = brief;

  // Current cabana id as a ref so the (once-created) chat transport always sends
  // the latest value — needed so the Seller queues outreach under the right cabana.
  const cabanaIdRef = useRef(cabanaId);
  cabanaIdRef.current = cabanaId;

  // The founder-approved crew roster. Empty = intake not done yet, so the CoS
  // runs in "propose a roster" mode. Sent with every request so the server
  // knows which crew tools to expose.
  const rosterRef = useRef<AgentId[]>([]);
  // Summary of an imported existing site (when the cabana was started via
  // "Import a website"). Fed to the intake so it can skip the Builder.
  const sourceContextRef = useRef<string>("");

  // The current project's display name, shown in the header.
  const [projectName, setProjectName] = useState<string | null>(null);

  // Load cabana data if cabanaId is provided
  useEffect(() => {
    if (cabanaId) {
      async function loadCabana() {
        try {
          const res = await fetch(`/api/cabana/${cabanaId}`);
          if (!res.ok) {
            // Ownership check failed or not found
            router.push("/cabanas");
            return;
          }
          const data = await res.json();
          // Load the cabana's brief if available
          if (data.cabana) {
            setProjectName(data.cabana.name || data.cabana.idea || null);
            // Rehydrate the approved roster + imported-site context so a reload
            // resumes in the right mode (intake vs operating).
            rosterRef.current = parseRoster(data.cabana.enabled_agents);
            if (data.cabana.source_url) {
              sourceContextRef.current =
                briefRef.current.content || `Imported existing site: ${data.cabana.source_url}`;
            }
            // Load cabana-specific brief (other states handled by their own effects).
            loadBriefAsync(cabanaId).then(setBrief);
          }
        } catch {
          router.push("/cabanas");
        }
      }
      loadCabana();
    } else {
      setProjectName(null);
      loadBriefAsync(null).then(setBrief);
    }
  }, [cabanaId, router]);

  function commitBrief(content: string) {
    const next = { content, updatedAt: Date.now() };
    setBrief(next);
    saveBrief(next, cabanaId);
  }

  const transport = useRef(
    new DefaultChatTransport({
      api: "/api/cabana/cos-chat",
      // Inject the latest brief + roster + imported-site context into every
      // request. An empty roster signals the server to run intake mode.
      prepareSendMessagesRequest({ messages, body }) {
        return {
          body: {
            ...body,
            messages,
            brief: briefRef.current.content,
            enabledAgents: rosterRef.current,
            sourceContext: sourceContextRef.current || undefined,
            cabanaId: cabanaIdRef.current,
          },
        };
      },
    })
  ).current;

  const { messages, sendMessage, setMessages, status } = useChat({ transport });
  const busy = status === "submitted" || status === "streaming";

  // When we create a project on the user's first message, the URL gains a
  // ?cabana=<id> param. That changes cabanaId and would normally trigger the
  // rehydrate effect below — which would wipe the in-flight message with the
  // (empty) history of the just-created project. This ref suppresses that one
  // reload so the conversation the user just started survives the transition.
  const justCreatedRef = useRef(false);

  // Rehydrate the saved thread from DB on mount.
  useEffect(() => {
    if (justCreatedRef.current) {
      justCreatedRef.current = false;
      return;
    }
    loadHistoryDB(cabanaId).then((db) => setMessages(db));
  }, [cabanaId, setMessages]);

  // Persist message history whenever a turn settles.
  useEffect(() => {
    if (status === "ready") saveHistoryDB(messages, cabanaId);
  }, [messages, status, cabanaId]);

  function newChat() {
    router.push("/chat");
    setMessages([]);
    clearHistoryDB(cabanaId);
    setBuild({ status: "idle" });
  }

  // Desk tab is controlled here so a build can switch the desk to the Page tab.
  const [deskTab, setDeskTab] = useState<DeskTab>("actions");

  // Build state — driven only by an explicit human click, never by the CoS.
  const [build, setBuild] = useState<BuildState>({ status: "idle" });

  // Rehydrate the last finished build from DB on mount.
  useEffect(() => {
    loadBuildDB(cabanaId).then((db) => {
      if (db?.html) setBuild(db);
    });
  }, [cabanaId]);

  // Persist only completed builds — never the transient "building" state.
  useEffect(() => {
    if (build.status === "done" && build.html) {
      saveBuildDB(build, cabanaId);
    }
  }, [build, cabanaId]);
  // Which model the Builder uses — founder-selectable per build. Defaults to the
  // Builder's configured model.
  const [buildModel, setBuildModel] = useState<string>(AGENT_MODELS.builder);
  const crewRef = useRef<CrewStatus>({} as CrewStatus);

  function startBuild(chosenHeadline?: string) {
    setDeskTab("page");
    const existingProjectId = build.projectId;
    const wo = workOrderRef.current;
    const isUpdate = wo?.task_type === "product_update" && !!wo?.brief && !!build.html;
    setBuild({ status: "building", phase: "Starting the Builder…", projectId: existingProjectId });
    streamBuild(
      crewRef.current,
      chosenHeadline,
      (patch) => setBuild((b) => ({ ...b, ...patch })),
      undefined,
      buildModel,
      existingProjectId,
      isUpdate ? wo!.brief : undefined,
      isUpdate ? build.html : undefined,
    ).catch((err) =>
      setBuild({ status: "error", error: err instanceof Error ? err.message : String(err) })
    );
  }

  // Track the latest pending work order from the CoS so startBuild can use it.
  const workOrderRef = useRef<{ brief?: string; task_type?: string } | null>(null);

  // When the CoS files a build work order, surface the Page tab and cache the order.
  useEffect(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role !== "assistant") continue;
      for (const part of m.parts) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p = part as any;
        if (part.type === "tool-request_landing_page_deploy" && p.state === "output-available") {
          const wo = p.output?.work_order as { brief?: string; task_type?: string } | undefined;
          workOrderRef.current = wo ?? null;
          setDeskTab("page");
          return;
        }
      }
    }
  }, [messages]);

  // Watch for the CoS revising the brief, persist the newest revision.
  useEffect(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role !== "assistant") continue;
      for (const part of m.parts) {
        if (
          part.type === "tool-update_business_brief" &&
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (part as any).state === "output-available"
        ) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const content = (part as any).output?.content as string | undefined;
          if (content && content !== briefRef.current.content) commitBrief(content);
          return;
        }
      }
    }
  }, [messages]);

  function submitText(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    setDeskTab("crew");

    // Send immediately for instant feedback.
    sendMessage({ text: t });

    // First message of a brand-new chat → create a real project row in the
    // background so it shows up in the grid and threads history/builds under
    // its id. justCreatedRef keeps the URL change from wiping this message.
    if (!cabanaId && messages.length === 0) {
      fetch("/api/cabana", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: t }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          const cabana = data?.cabana;
          if (cabana?.id) {
            justCreatedRef.current = true;
            setProjectName(cabana.name || cabana.idea || null);
            router.replace(`/chat?cabana=${cabana.id}`);
          }
        })
        .catch(() => {
          /* fall back to an unthreaded chat if creation fails */
        });
    }
  }

  function handlePromptSubmit(message: PromptInputMessage) {
    submitText(message.text ?? "");
  }

  // "Import a website" entry. Scrapes + summarizes the site, seeds the brief and
  // source context, then kicks the intake turn (which proposes a roster minus
  // the Builder). Returns an error string to show inline, or null on success.
  async function importSite(rawUrl: string): Promise<string | null> {
    const url = rawUrl.trim();
    if (!url || busy) return null;

    let data: { error?: string; summary?: string; offer?: string; audience?: string; inferredIdea?: string; url?: string };
    try {
      const res = await fetch("/api/cabana/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      data = await res.json();
    } catch {
      return "Couldn't reach that site. Try again or start from an idea.";
    }
    if (data.error || !data.inferredIdea) {
      return data.error || "Couldn't read that site. Start from an idea instead.";
    }

    const siteUrl = data.url ?? url;
    const summary = [
      `## Imported site`,
      siteUrl,
      ``,
      `**What it is:** ${data.summary ?? ""}`,
      `**Offer:** ${data.offer ?? ""}`,
      `**Audience:** ${data.audience ?? ""}`,
    ].join("\n");

    // Set source context synchronously so the very next request carries it.
    sourceContextRef.current = summary;
    rosterRef.current = [];
    commitBrief(summary);
    setDeskTab("crew");

    sendMessage({ text: `I want to grow my existing site (${siteUrl}). It's ${data.inferredIdea}. Which crew do I need?` });

    if (!cabanaId) {
      fetch("/api/cabana", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: data.inferredIdea, sourceUrl: siteUrl }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((d) => {
          const cabana = d?.cabana;
          if (cabana?.id) {
            justCreatedRef.current = true;
            setProjectName(cabana.name || cabana.idea || null);
            router.replace(`/chat?cabana=${cabana.id}`);
          }
        })
        .catch(() => {});
    }
    return null;
  }

  // Founder approved the proposed crew. Persist it, flip into operating mode,
  // then nudge the CoS to run the now-enabled crew.
  async function approveRoster(agents: AgentId[]) {
    if (agents.length === 0 || busy) return;
    rosterRef.current = agents;
    if (cabanaId) {
      await fetch(`/api/cabana/${cabanaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabledAgents: agents }),
      }).catch(() => {});
    }
    const names = agents.map((a) => AGENT_META[a].name).join(", ");
    sendMessage({ text: `Approved — let's run with ${names}. Go.` });
  }

  const empty = messages.length === 0;
  const crew = deriveCrew(messages);
  crewRef.current = crew;
  const runs = deriveRuns(messages);

  // Snap to crew tab whenever an agent starts working mid-stream.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const anyWorking = Object.values(crew).some((a) => a.status === "working");
    if (anyWorking) setDeskTab((t) => (t === "page" ? t : "crew"));
  }, [crew]);

  if (!subChecked) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex items-center gap-2 text-black/40 text-sm">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: SURF }} />
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white text-black flex-col">
      {/* ── Subscription success banner ─────────────────────────────── */}
      {showSuccess && (
        <div className="shrink-0 flex items-center justify-between px-6 py-2.5 text-sm font-medium text-white" style={{ background: SURF }}>
          <span>You&apos;re on — your crew is ready to run. 🏄</span>
          <button onClick={() => setShowSuccess(false)} className="opacity-70 hover:opacity-100 transition-opacity text-xs ml-4">✕</button>
        </div>
      )}
      <div className="flex flex-1 min-h-0">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="flex w-16 shrink-0 flex-col items-center justify-between border-r border-black/10 py-5">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: `${SURF}1a`, color: SURF }}
        >
          <TreePalm size={20} strokeWidth={1.75} />
        </div>
        <Link
          href="/settings"
          aria-label="Settings"
          className="rounded-full ring-offset-2 transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
        >
          <Avatar seed="founder" label="You" size={32} />
        </Link>
      </aside>

      {/* ── Chat pane ───────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 border-r border-black/10">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-black/10">
          <Link
            href="/cabanas"
            className="flex items-center gap-2 group min-w-0"
          >
            <ChevronLeft size={16} className="text-black/30 group-hover:text-black/60 transition-colors shrink-0" />
            <span className="text-sm font-semibold truncate">
              {projectName ?? "New project"}
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs text-black/50">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: busy ? SURF : "#0cf574" }} />
              {busy ? "Working" : "Ready"}
            </span>
            {messages.length > 0 && (
              <button
                onClick={newChat}
                className="text-xs px-3 py-1.5 rounded-full border border-black/15 hover:border-black/40 transition-colors"
              >
                New chat
              </button>
            )}
          </div>
        </header>

        {/* Conversation */}
        {empty ? (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-4 py-8">
              <EmptyState onPick={submitText} onImport={importSite} />
            </div>
          </div>
        ) : (
          <Conversation className="flex-1">
            <ConversationContent className="mx-auto w-full max-w-2xl gap-6 px-4 py-8">
              {messages.map((m) => (
                <MessageView key={m.id} message={m} streaming={busy} onAnswer={submitText} onApproveRoster={approveRoster} onStartBuild={startBuild} busy={busy} />
              ))}
              {status === "submitted" && (
                <div className="text-sm text-black/40">Chief of Staff is thinking…</div>
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        )}

        {/* Composer */}
        <div className="border-t border-black/10">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <PromptInput
              onSubmit={handlePromptSubmit}
              className="overflow-hidden rounded-3xl border border-black/15 transition-colors focus-within:border-black/40 [&_[data-slot=input-group]]:rounded-none [&_[data-slot=input-group]]:border-0 [&_[data-slot=input-group]]:focus-within:ring-0"
            >
              <PromptInputBody>
                <PromptInputTextarea
                  placeholder="Message your Chief of Staff…"
                  disabled={busy}
                  className="min-h-[52px] px-4 pt-3 text-[15px]"
                />
              </PromptInputBody>
              <PromptInputFooter className="px-3 pb-2.5">
                <span className="text-xs text-black/30">⏎ to send · ⇧⏎ for newline</span>
                <PromptInputSubmit
                  status={status}
                  disabled={busy}
                  className="bg-black text-white hover:bg-black/80"
                />
              </PromptInputFooter>
            </PromptInput>
            <p className="mt-2 text-center text-xs text-black/30">
              The CoS runs the crew — it never deploys without your approval.
            </p>
          </div>
        </div>
      </div>

      {/* ── Desk pane (right half) ──────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        <Desk
          brief={brief}
          onBriefChange={commitBrief}
          crew={crew}
          runs={runs}
          tab={deskTab}
          onTabChange={setDeskTab}
          build={build}
          onBuild={startBuild}
          buildModel={buildModel}
          onBuildModelChange={setBuildModel}
          onQuickAction={submitText}
        />
      </div>
      </div>
    </div>
  );
}

function EmptyState({
  onPick,
  onImport,
}: {
  onPick: (text: string) => void;
  onImport: (url: string) => Promise<string | null>;
}) {
  const [mode, setMode] = useState<"idea" | "import">("idea");
  const [url, setUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitImport() {
    if (!url.trim() || importing) return;
    setImporting(true);
    setError(null);
    const err = await onImport(url);
    if (err) {
      setError(err);
      setImporting(false);
    }
    // On success the chat takes over; leave the spinner until unmount.
  }

  return (
    <div className="pt-12 text-center">
      <h1 className="text-2xl font-bold tracking-tight">
        {mode === "idea" ? "What are we building?" : "What are we growing?"}
      </h1>
      <p className="mt-2 text-black/50">
        {mode === "idea"
          ? "Tell your Chief of Staff a one-line idea. They’ll assemble the crew and drive it toward first revenue."
          : "Already have a site? Drop the link and your Chief of Staff builds a growth crew around it."}
      </p>

      {/* Mode toggle */}
      <div className="mt-6 mx-auto inline-flex rounded-full border border-black/10 p-1">
        {(["idea", "import"] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setError(null); }}
            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
              mode === m ? "text-white" : "text-black/50 hover:text-black/80"
            }`}
            style={mode === m ? { background: SURF } : undefined}
          >
            {m === "idea" ? "Start from an idea" : "Import a website"}
          </button>
        ))}
      </div>

      {mode === "idea" ? (
        <div className="mt-8 mx-auto max-w-md flex flex-col gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => onPick(ex)}
              className="w-full text-left px-4 py-3 rounded-2xl border border-black/10 text-sm text-black/70 transition-colors hover:border-black/30 hover:text-black"
            >
              {ex}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-8 mx-auto max-w-md">
          <div className="flex items-center gap-2 rounded-2xl border border-black/15 px-3 py-2 transition-colors focus-within:border-black/40">
            <input
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") submitImport(); }}
              placeholder="yoursite.com"
              disabled={importing}
              className="flex-1 bg-transparent px-1 py-1.5 text-sm outline-none placeholder:text-black/30"
            />
            <button
              onClick={submitImport}
              disabled={!url.trim() || importing}
              className="shrink-0 rounded-full px-4 py-1.5 text-sm font-medium text-white transition-opacity disabled:opacity-40"
              style={{ background: SURF }}
            >
              {importing ? "Reading…" : "Import"}
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
          {importing && !error && (
            <p className="mt-2 text-xs text-black/40">Reading your site — this takes a few seconds.</p>
          )}
        </div>
      )}
    </div>
  );
}

function MessageView({
  message,
  streaming,
  onAnswer,
  onApproveRoster,
  onStartBuild,
  busy,
}: {
  message: ReturnType<typeof useChat>["messages"][number];
  streaming: boolean;
  onAnswer: (text: string) => void;
  onApproveRoster: (agents: AgentId[]) => void;
  onStartBuild: (headline?: string) => void;
  busy: boolean;
}) {
  const isUser = message.role === "user";

  if (isUser) {
    const text = message.parts
      .filter((p) => p.type === "text")
      .map((p) => (p as { text: string }).text)
      .join("");
    return (
      <Message from="user">
        <MessageContent className="text-[15px]">
          <span className="whitespace-pre-wrap">{text}</span>
        </MessageContent>
      </Message>
    );
  }

  return (
    <Message from="assistant">
      <MessageContent className="gap-3">
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            return (
              <MessageResponse
                key={i}
                className="prose max-w-none text-[15px] leading-relaxed text-black/90 prose-p:my-2 prose-headings:mt-3 prose-headings:mb-1 prose-ul:my-2"
              >
                {(part as { text: string }).text}
              </MessageResponse>
            );
          }
          if (part.type === "reasoning") {
            return (
              <Reasoning key={i} isStreaming={streaming}>
                <ReasoningTrigger />
                <ReasoningContent>{(part as { text: string }).text}</ReasoningContent>
              </Reasoning>
            );
          }
          // Tool calls render as chat components. A small registry maps certain
          // tools to purpose-built, sometimes-interactive views; everything else
          // falls back to the generic crew activity card.
          if (part.type.startsWith("tool-")) {
            const toolName = part.type.slice("tool-".length);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const p = part as any;
            // Internal fallback for rerouted hallucinated tool calls — never
            // shown to the founder.
            if (toolName === "noop") return null;
            if (toolName === "ask_founder" && p.output) {
              return (
                <ChoiceCard
                  key={i}
                  question={String(p.output.question ?? "")}
                  options={(p.output.options as string[]) ?? []}
                  onAnswer={onAnswer}
                  disabled={busy}
                />
              );
            }
            if (toolName === "propose_roster" && p.output) {
              return (
                <RosterCard
                  key={i}
                  summary={String(p.output.summary ?? "")}
                  roster={(p.output.roster as { agent: AgentId; reason: string }[]) ?? []}
                  note={String(p.output.note ?? "")}
                  onApprove={onApproveRoster}
                  disabled={busy}
                />
              );
            }
            // Crew specialists get purpose-built compact cards (chips/badges +
            // light actions) instead of the generic key-value dump.
            if (toolName in AGENT_META) {
              return (
                <CrewToolCard
                  key={i}
                  agent={toolName as AgentId}
                  part={p}
                  onSubmit={onAnswer}
                  onStartBuild={onStartBuild}
                />
              );
            }
            return <ToolCard key={i} toolName={toolName} part={p} />;
          }
          return null;
        })}
      </MessageContent>
    </Message>
  );
}

// Interactive chat component: the CoS asks one decision and we render tappable
// options. Tapping sends that label back as the founder's next message, so the
// conversation just continues — no free-typing needed.
function ChoiceCard({
  question,
  options,
  onAnswer,
  disabled,
}: {
  question: string;
  options: string[];
  onAnswer: (text: string) => void;
  disabled: boolean;
}) {
  const [picked, setPicked] = useState<string | null>(null);

  function choose(opt: string) {
    if (picked || disabled) return;
    setPicked(opt);
    onAnswer(opt);
  }

  return (
    <div className="rounded-2xl border border-black/10 overflow-hidden">
      <div className="px-4 py-3">
        <p className="text-sm font-medium text-black/80">{question}</p>
      </div>
      <div className="px-4 pb-4 flex flex-wrap gap-2">
        {options.map((opt) => {
          const isPicked = picked === opt;
          return (
            <button
              key={opt}
              onClick={() => choose(opt)}
              disabled={!!picked || disabled}
              className="text-sm px-4 py-2 rounded-full border transition-colors disabled:opacity-50"
              style={
                isPicked
                  ? { background: SURF, borderColor: SURF, color: "#fff" }
                  : { borderColor: "rgba(0,0,0,0.15)" }
              }
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Interactive intake card: the CoS proposes which specialists to enable, each
// with a one-line reason. The founder toggles agents on/off and approves —
// which persists the roster and flips the chat into operating mode.
function RosterCard({
  summary,
  roster,
  note,
  onApprove,
  disabled,
}: {
  summary: string;
  roster: { agent: AgentId; reason: string }[];
  note: string;
  onApprove: (agents: AgentId[]) => void;
  disabled: boolean;
}) {
  // Proposed agents start enabled; any other agent starts off but is togglable.
  const proposed = roster.map((r) => r.agent);
  const reasons = Object.fromEntries(roster.map((r) => [r.agent, r.reason])) as Record<AgentId, string>;
  const [enabled, setEnabled] = useState<Set<AgentId>>(() => new Set(proposed));
  const [approved, setApproved] = useState(false);

  // Show every known agent so the founder can add one the CoS left out.
  const allAgents = Object.keys(AGENT_META) as AgentId[];

  function toggle(a: AgentId) {
    if (approved || disabled) return;
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(a)) next.delete(a); else next.add(a);
      return next;
    });
  }

  function approve() {
    if (approved || disabled || enabled.size === 0) return;
    setApproved(true);
    onApprove(allAgents.filter((a) => enabled.has(a)));
  }

  return (
    <div className="rounded-2xl border border-black/10 overflow-hidden">
      <div className="px-4 pt-3 pb-2">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: SURF }}>
          Your proposed crew
        </p>
        {summary && <p className="mt-1 text-sm text-black/70">{summary}</p>}
      </div>
      <div className="px-2 pb-2 flex flex-col">
        {allAgents.map((a) => {
          const on = enabled.has(a);
          const wasProposed = proposed.includes(a);
          return (
            <button
              key={a}
              onClick={() => toggle(a)}
              disabled={approved || disabled}
              className="flex items-center gap-3 px-2 py-2.5 rounded-xl text-left transition-colors hover:bg-black/[0.03] disabled:cursor-default"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
                style={{ background: `${AGENT_COLOR[a]}1a`, opacity: on ? 1 : 0.35 }}
              >
                {AGENT_META[a].icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-semibold ${on ? "text-black" : "text-black/40"}`}>
                  {AGENT_META[a].name}
                  <span className="font-normal text-black/40"> · {AGENT_META[a].role}</span>
                </span>
                <span className="block text-xs text-black/50 truncate">
                  {wasProposed ? reasons[a] : "Not suggested — tap to add"}
                </span>
              </span>
              <span
                className="shrink-0 flex h-5 w-9 items-center rounded-full px-0.5 transition-colors"
                style={{ background: on ? SURF : "rgba(0,0,0,0.12)" }}
              >
                <span
                  className="h-4 w-4 rounded-full bg-white transition-transform"
                  style={{ transform: on ? "translateX(16px)" : "translateX(0)" }}
                />
              </span>
            </button>
          );
        })}
      </div>
      <div className="border-t border-black/10 px-4 py-3 flex items-center justify-between gap-3">
        <span className="text-xs text-black/50 truncate">{note}</span>
        <button
          onClick={approve}
          disabled={approved || disabled || enabled.size === 0}
          className="shrink-0 rounded-full px-5 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
          style={{ background: SURF }}
        >
          {approved ? "Crew assembled" : "Approve crew"}
        </button>
      </div>
    </div>
  );
}

function ToolCard({
  toolName,
  part,
}: {
  toolName: string;
  part: { type: string; state: string; input?: unknown; output?: unknown; errorText?: string };
}) {
  const meta = toolMeta(toolName);
  const done = part.state === "output-available";
  const errored = part.state === "output-error";

  // Controlled open state — auto-open when the tool settles (done or errored),
  // but let the user toggle. Adjusting state during render (the React-sanctioned
  // pattern) avoids both the Base UI "changed default after init" warning and a
  // sync effect.
  const settled = done || errored;
  const [open, setOpen] = useState(settled);
  const [wasSettled, setWasSettled] = useState(settled);
  if (settled !== wasSettled) {
    setWasSettled(settled);
    if (settled) setOpen(true);
  }

  return (
    <Tool open={open} onOpenChange={setOpen}>
      <ToolHeader
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type={part.type as any}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        state={part.state as any}
        title={`${meta.icon}  ${meta.name}`}
        className="px-4 py-2.5"
      />
      {done && part.output != null && (
        <ToolContent>
          <div className="px-4 pb-3 text-xs text-black/70">
            <ToolOutput output={part.output} />
          </div>
        </ToolContent>
      )}
      {errored && (
        <ToolContent>
          <div className="px-4 pb-3 text-xs">
            <p className="text-black/70">
              {meta.name} hit a snag and didn&apos;t finish. Your other agents kept going — just ask your Chief of Staff to re-run this one.
            </p>
            {part.errorText && (
              <p className="mt-1.5 font-mono text-[11px] text-red-500/80 break-words">{part.errorText}</p>
            )}
          </div>
        </ToolContent>
      )}
    </Tool>
  );
}

function ToolOutput({ output }: { output: unknown }) {
  if (typeof output === "string") return <p>{output}</p>;
  if (output && typeof output === "object") {
    return (
      <dl className="space-y-1.5">
        {Object.entries(output as Record<string, unknown>).map(([k, v]) => (
          <div key={k} className="flex gap-2">
            <dt className="font-medium text-black/40 min-w-[88px] capitalize">{k.replace(/_/g, " ")}</dt>
            <dd className="text-black/80">
              {Array.isArray(v) ? (
                <ul className="list-disc pl-4 space-y-0.5">
                  {v.map((item, i) => (
                    <li key={i}>{typeof item === "object" ? JSON.stringify(item) : String(item)}</li>
                  ))}
                </ul>
              ) : typeof v === "object" && v != null ? (
                <pre className="whitespace-pre-wrap">{JSON.stringify(v, null, 2)}</pre>
              ) : (
                String(v)
              )}
            </dd>
          </div>
        ))}
      </dl>
    );
  }
  return null;
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center">Loading...</div>}>
      <ChatInner />
    </Suspense>
  );
}
