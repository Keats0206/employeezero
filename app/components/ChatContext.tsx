"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import type { DataPart } from "../lib/agents/sandbox/data-parts";

export type ChatMsg = UIMessage<never, DataPart>;

export const MODELS = [
  { id: "anthropic/claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { id: "anthropic/claude-opus-4-7", label: "Claude Opus 4.7" },
  { id: "anthropic/claude-haiku-4-5", label: "Claude Haiku 4.5" },
  { id: "openai/gpt-5.3-codex", label: "GPT-5.3 Codex" },
  { id: "xai/grok-4.1-fast-reasoning", label: "Grok 4.1 Reasoning" },
];

type Ctx = {
  messages: ChatMsg[];
  sendMessage: (message: { text: string }) => void;
  status: string;
  model: string;
  setModel: (id: string) => void;
  sandboxUrl: string | null;
};

const ChatCtx = createContext<Ctx | null>(null);

export function useChatCtx() {
  const c = useContext(ChatCtx);
  if (!c) throw new Error("useChatCtx must be used inside <ChatProvider>");
  return c;
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [model, setModel] = useState(MODELS[0].id);
  const { messages, sendMessage, status } = useChat<ChatMsg>({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: () => ({ model }),
    }),
  });

  const sandboxUrl = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      for (const p of messages[i].parts) {
        if (p.type === "data-get-sandbox-url") {
          const d = (p as { data: DataPart["get-sandbox-url"] }).data;
          if (d.url) return d.url;
        }
      }
    }
    return null;
  }, [messages]);

  return (
    <ChatCtx.Provider value={{ messages, sendMessage, status, model, setModel, sandboxUrl }}>
      {children}
    </ChatCtx.Provider>
  );
}
