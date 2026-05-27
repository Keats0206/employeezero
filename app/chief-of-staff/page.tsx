"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRouter } from "next/navigation";
import { Sparkles, Wrench, ArrowUp, RefreshCw } from "lucide-react";

const TOOL_LABEL: Record<string, string> = {
  list_goals: "Reading goals",
  list_memories: "Reading memories",
  list_tasks: "Reading tasks",
  get_active_goal: "Reading active goal",
  create_goal: "Creating goal",
  update_goal: "Updating goal",
  create_memory: "Saving memory",
  create_task: "Creating task",
};

export default function ChiefOfStaffPage() {
  const router = useRouter();
  const [input, setInput] = useState("");

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chief-of-staff" }),
    onFinish: () => router.refresh(),
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const isLoading = status === "submitted" || status === "streaming";

  function submit() {
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
            Chief of Staff
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Talk it out. It can read and edit your goals, tasks, and memory.
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="flex items-center gap-1 rounded-md border border-zinc-200 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
          >
            <RefreshCw size={11} />
            New thread
          </button>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-lg border border-zinc-200 bg-white"
      >
        {messages.length === 0 ? (
          <EmptyState onPick={(s) => sendMessage({ text: s })} />
        ) : (
          <div className="flex flex-col gap-6 px-5 py-6">
            {messages.map((m) => (
              <Message key={m.id} message={m} />
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Sparkles size={12} className="animate-pulse text-pink-500" />
                thinking…
              </div>
            )}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="mt-3"
      >
        <div className="flex items-end gap-2 rounded-lg border border-zinc-200 bg-white p-2 focus-within:border-zinc-400">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Ask, tell, or steer… (⏎ to send, shift+⏎ for newline)"
            rows={2}
            className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-zinc-800 outline-none placeholder:text-zinc-400"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-zinc-900 text-white transition-colors hover:bg-zinc-700 disabled:opacity-40"
          >
            <ArrowUp size={14} />
          </button>
        </div>
      </form>
    </div>
  );
}

type UIMessage = ReturnType<typeof useChat>["messages"][number];

function Message({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  if (isUser) {
    const text = message.parts
      .map((p) => (p.type === "text" ? p.text : ""))
      .join("");
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-zinc-900 px-4 py-2.5 text-sm text-white">
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {message.parts.map((part, i) => {
        if (part.type === "text") {
          return (
            <div
              key={i}
              className="max-w-[85%] whitespace-pre-wrap text-sm leading-relaxed text-zinc-800"
            >
              {part.text}
            </div>
          );
        }
        if (part.type?.startsWith("tool-")) {
          const toolName = part.type.replace(/^tool-/, "");
          const label = TOOL_LABEL[toolName] ?? toolName;
          // @ts-expect-error tool parts have state/input/output
          const state: string = part.state ?? "input-available";
          const done =
            state === "output-available" || state === "output-error";
          return (
            <div
              key={i}
              className="inline-flex w-fit items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] text-zinc-600"
            >
              <Wrench
                size={10}
                className={done ? "text-emerald-500" : "text-violet-500"}
              />
              {label}
              {!done && (
                <span className="ml-1 inline-block h-1 w-1 animate-pulse rounded-full bg-violet-500" />
              )}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (s: string) => void }) {
  const prompts = [
    "What should I focus on today?",
    "Save: prioritize marketing and human-in-the-loop validation.",
    "Add a goal: get 3 paying users by end of next week.",
    "What memories do we have about positioning?",
  ];
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
      <Sparkles size={20} className="mb-3 text-pink-500" />
      <h2 className="text-base font-medium text-zinc-900">
        Your Chief of Staff
      </h2>
      <p className="mt-1 max-w-md text-sm text-zinc-500">
        I can read and write everything in your cockpit. Ask me anything, or
        tell me what to remember.
      </p>
      <div className="mt-6 flex max-w-md flex-wrap justify-center gap-1.5">
        {prompts.map((p) => (
          <button
            key={p}
            onClick={() => onPick(p)}
            className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
