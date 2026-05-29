"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { AGENT_META, AGENT_COLOR, AGENT_MODELS, EXAMPLES, type AgentId } from "@/app/lib/cabana-config";
import { Desk, type CrewStatus, type AgentActivity, type CrewRun, type DeskTab } from "@/app/components/cabana/Desk";
import { loadBrief, saveBrief, type BusinessBrief } from "@/app/lib/cabana-brief";
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
import { Tool, ToolHeader, ToolContent } from "@/components/ai-elements/tool";
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@/components/ai-elements/reasoning";

const SURF = "#23b5d3";
const HISTORY_KEY = "cabana_chat_history";

// Chat history persists to localStorage so the conversation always survives a
// reload. Prototype storage — same DB seam as the brief.
function loadHistory(): UIMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as UIMessage[]) : [];
  } catch {
    return [];
  }
}
function saveHistory(messages: UIMessage[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(messages));
  } catch {
    /* ignore */
  }
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
      runs.push({
        id: p.toolCallId ?? `${agent}-${runs.length}`,
        agent: agent as AgentId,
        task: p.input?.task,
        status: p.state === "output-available" ? "done" : "working",
        output: p.output,
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

export default function ChatPage() {
  // The Business Brief — CoS long-term memory. Held here, sent with every
  // request, and re-persisted whenever the CoS revises it via its tool.
  const [brief, setBrief] = useState<BusinessBrief>({ content: "", updatedAt: null });
  const briefRef = useRef(brief);
  briefRef.current = brief;

  useEffect(() => {
    setBrief(loadBrief());
  }, []);

  function commitBrief(content: string) {
    const next = { content, updatedAt: Date.now() };
    setBrief(next);
    saveBrief(next);
  }

  const transport = useRef(
    new DefaultChatTransport({
      api: "/api/cabana/cos-chat",
      // Inject the latest brief into every request body.
      prepareSendMessagesRequest({ messages, body }) {
        return { body: { ...body, messages, brief: briefRef.current.content } };
      },
    })
  ).current;

  const { messages, sendMessage, setMessages, status } = useChat({ transport });
  const busy = status === "submitted" || status === "streaming";

  // Rehydrate the saved thread after mount. The server renders an empty thread
  // (no localStorage), so loading here keeps SSR and the first client render in
  // sync and avoids a hydration mismatch.
  useEffect(() => {
    const saved = loadHistory();
    if (saved.length) setMessages(saved);
  }, [setMessages]);

  // Persist message history whenever a turn settles, so reloads keep the thread.
  useEffect(() => {
    if (status === "ready") saveHistory(messages);
  }, [messages, status]);

  function newChat() {
    setMessages([]);
    saveHistory([]);
  }

  // Desk tab is controlled here so a build can switch the desk to the Page tab.
  const [deskTab, setDeskTab] = useState<DeskTab>("home");

  // Build state — driven only by an explicit human click, never by the CoS.
  const [build, setBuild] = useState<BuildState>({ status: "idle" });
  // Which model the Builder uses — founder-selectable per build. Defaults to the
  // Builder's configured model.
  const [buildModel, setBuildModel] = useState<string>(AGENT_MODELS.builder);
  const crewRef = useRef<CrewStatus>({} as CrewStatus);

  function startBuild(chosenHeadline?: string) {
    setDeskTab("page");
    setBuild({ status: "building", phase: "Starting the Builder…" });
    streamBuild(
      crewRef.current,
      chosenHeadline,
      (patch) => setBuild((b) => ({ ...b, ...patch })),
      undefined,
      buildModel,
    ).catch((err) =>
      setBuild({ status: "error", error: err instanceof Error ? err.message : String(err) })
    );
  }

  // When the CoS files a build work order (after the founder approved), surface
  // it on the Page tab so the founder can pick a headline and hit build.
  useEffect(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role !== "assistant") continue;
      for (const part of m.parts) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (part.type === "tool-request_landing_page_deploy" && (part as any).state === "output-available") {
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
    sendMessage({ text: t });
  }

  function handlePromptSubmit(message: PromptInputMessage) {
    submitText(message.text ?? "");
  }

  const empty = messages.length === 0;
  const crew = deriveCrew(messages);
  crewRef.current = crew;
  const runs = deriveRuns(messages);

  return (
    <div className="flex h-screen bg-white text-black">
      {/* ── Chat pane (left half) ───────────────────────────────────────── */}
      <div className="flex flex-col w-1/2 border-r border-black/10">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-black/10">
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-tight">Cabana</span>
            <span className="text-black/30">/</span>
            <span className="text-sm text-black/50">Chief of Staff</span>
          </div>
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
              <EmptyState onPick={submitText} />
            </div>
          </div>
        ) : (
          <Conversation className="flex-1">
            <ConversationContent className="mx-auto w-full max-w-2xl gap-6 px-4 py-8">
              {messages.map((m) => (
                <MessageView key={m.id} message={m} streaming={busy} />
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
              className="rounded-3xl border border-black/15 transition-colors focus-within:border-black/40"
            >
              <PromptInputBody>
                <PromptInputTextarea
                  placeholder="Message your Chief of Staff…"
                  disabled={busy}
                />
                <PromptInputFooter className="px-2 pb-2">
                  <span className="text-xs text-black/30">⏎ to send · ⇧⏎ for newline</span>
                  <PromptInputSubmit
                    status={status}
                    disabled={busy}
                    className="bg-black text-white hover:bg-black/80"
                  />
                </PromptInputFooter>
              </PromptInputBody>
            </PromptInput>
            <p className="mt-2 text-center text-xs text-black/30">
              The CoS runs the crew — it never deploys without your approval.
            </p>
          </div>
        </div>
      </div>

      {/* ── Desk pane (right half) ──────────────────────────────────────── */}
      <div className="w-1/2">
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
        />
      </div>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="pt-12 text-center">
      <h1 className="text-2xl font-bold tracking-tight">What are we building?</h1>
      <p className="mt-2 text-black/50">
        Tell your Chief of Staff a one-line idea. They&apos;ll run the crew and drive it toward first revenue.
      </p>
      <div className="mt-8 flex justify-center">
        <Suggestions className="flex-col items-stretch gap-2">
          {EXAMPLES.map((ex) => (
            <Suggestion
              key={ex}
              suggestion={ex}
              onClick={onPick}
              className="justify-start whitespace-normal border-black/10 px-4 py-3 text-left text-sm hover:border-black/30"
            />
          ))}
        </Suggestions>
      </div>
    </div>
  );
}

function MessageView({
  message,
  streaming,
}: {
  message: ReturnType<typeof useChat>["messages"][number];
  streaming: boolean;
}) {
  const isUser = message.role === "user";

  if (isUser) {
    const text = message.parts
      .filter((p) => p.type === "text")
      .map((p) => (p as { text: string }).text)
      .join("");
    return (
      <Message from="user">
        <MessageContent>
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
                className="prose prose-sm max-w-none leading-relaxed text-black/90 prose-p:my-2 prose-headings:mt-3 prose-headings:mb-1 prose-ul:my-2"
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
          // Tool calls render as crew activity cards.
          if (part.type.startsWith("tool-")) {
            const toolName = part.type.slice("tool-".length);
            return (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              <ToolCard key={i} toolName={toolName} part={part as any} />
            );
          }
          return null;
        })}
      </MessageContent>
    </Message>
  );
}

function ToolCard({
  toolName,
  part,
}: {
  toolName: string;
  part: { type: string; state: string; input?: unknown; output?: unknown };
}) {
  const meta = toolMeta(toolName);
  const done = part.state === "output-available";

  return (
    <Tool defaultOpen={done}>
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
