"use client";

import { FormEvent, useMemo, useState } from "react";
import { SendHorizontal } from "lucide-react";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

const SUGGESTIONS = [
  "What is this sprint about?",
  "How do I create an experiment?",
  "What should I prioritize today?",
  "Show blockers in work queue",
];

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

export function RightRailChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");

  const hasMessages = useMemo(() => messages.length > 0, [messages.length]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMessage: ChatMessage = { id: makeId(), role: "user", text: trimmed };
    const botMessage: ChatMessage = {
      id: makeId(),
      role: "assistant",
      text: "Noted. I can help map this to epics, experiments, and tasks next.",
    };
    setMessages((prev) => [...prev, userMessage, botMessage]);
    setInput("");
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <aside className="fixed inset-x-0 bottom-0 z-20 flex h-64 flex-col border-t border-zinc-200 bg-white md:inset-y-0 md:right-0 md:left-auto md:h-auto md:w-[340px] md:border-t-0 md:border-l">
      <div className="border-b border-zinc-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-900">employeezero Chat</h2>
      </div>

      <div className="border-b border-zinc-100 px-3 py-3">
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => send(suggestion)}
              className="rounded-full border border-zinc-200 px-2.5 py-1 text-[11px] text-zinc-600 hover:bg-zinc-50"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {!hasMessages ? (
          <p className="text-xs text-zinc-500">Ask about your epics, experiments, and tasks.</p>
        ) : (
          <div className="space-y-2">
            {messages.map((m) => (
              <div key={m.id} className={m.role === "user" ? "text-right" : ""}>
                <div
                  className={`inline-block max-w-[90%] rounded-lg px-2.5 py-2 text-xs ${
                    m.role === "user"
                      ? "bg-zinc-900 text-white"
                      : "border border-zinc-200 bg-zinc-50 text-zinc-700"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="border-t border-zinc-200 p-3">
        <div className="flex items-center gap-2 rounded-md border border-zinc-200 px-2 py-1.5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="w-full bg-transparent text-xs text-zinc-700 outline-none placeholder:text-zinc-400"
          />
          <button
            type="submit"
            className="rounded-md bg-zinc-900 p-1.5 text-white hover:bg-zinc-700"
            aria-label="Send message"
          >
            <SendHorizontal size={12} />
          </button>
        </div>
      </form>
    </aside>
  );
}

export function RightRailChatPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-30">
      <button
        type="button"
        className="absolute inset-0 bg-black/20"
        aria-label="Close chat"
        onClick={onClose}
      />
      <div className="absolute inset-y-0 right-0 w-[340px] border-l border-zinc-200 bg-white">
        <RightRailChat />
      </div>
    </div>
  );
}
