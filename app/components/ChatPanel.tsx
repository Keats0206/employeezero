"use client";

import { useState } from "react";
import { Streamdown } from "streamdown";
import {
  Send,
  Loader2,
  Terminal,
  FileCode,
  Box,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { MODELS, useChatCtx, type ChatMsg } from "./ChatContext";

export function ChatPanel() {
  const { messages, sendMessage, status, model, setModel } = useChatCtx();
  const [input, setInput] = useState("");
  const busy = status === "submitted" || status === "streaming";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    sendMessage({ text: input });
    setInput("");
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-3">
        <Box size={14} className="text-zinc-500" />
        <h1 className="text-sm font-medium">Operator</h1>
        {busy && <Loader2 size={12} className="animate-spin text-zinc-400" />}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="mt-4 space-y-3 text-sm text-zinc-500">
            <p className="font-medium text-zinc-900">What do you want to build or track?</p>
            <div className="space-y-1.5">
              {[
                "Build a landing page for a SaaS that helps founders run experiments.",
                "Create a goal: hit 100 signups by end of month.",
                "Draft a launch tweet.",
                "What's in progress?",
              ].map((p) => (
                <button
                  key={p}
                  onClick={() => sendMessage({ text: p })}
                  className="block w-full rounded-md border border-zinc-200 px-3 py-2 text-left text-xs hover:bg-zinc-50"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <MessageRow key={m.id} message={m} />
        ))}
      </div>

      <form onSubmit={submit} className="border-t border-zinc-200 bg-white p-3">
        <div className="mb-2 flex items-center gap-2">
          <label className="text-[11px] uppercase tracking-wider text-zinc-400">Model</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 outline-none focus:border-zinc-400"
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) submit(e);
            }}
            placeholder="Describe what to build, track, or change…"
            rows={2}
            className="flex-1 resize-none rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
          />
          <button
            type="submit"
            disabled={!input.trim() || busy}
            className="flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-white disabled:opacity-40"
          >
            <Send size={14} />
          </button>
        </div>
      </form>
    </div>
  );
}

function MessageRow({ message }: { message: ChatMsg }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-zinc-900 px-3.5 py-2 text-sm text-white">
          {message.parts.map((p, i) => (p.type === "text" ? <span key={i}>{p.text}</span> : null))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {message.parts.map((p, i) => {
        if (p.type === "text") {
          return (
            <div key={i} className="prose prose-sm prose-zinc max-w-none text-sm text-zinc-800">
              <Streamdown controls={false}>{p.text}</Streamdown>
            </div>
          );
        }
        if (p.type === "reasoning") {
          return (
            <div key={i} className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
              <span className="font-medium">thinking</span> · {p.text}
            </div>
          );
        }
        if (p.type.startsWith("data-")) {
          return <DataToolPart key={i} type={p.type} data={(p as { data: unknown }).data} />;
        }
        if (p.type.startsWith("tool-")) {
          return (
            <OperatorToolPart
              key={i}
              part={p as unknown as { type: string; state: string; input?: unknown; errorText?: string }}
            />
          );
        }
        return null;
      })}
    </div>
  );
}

function OperatorToolPart({
  part,
}: {
  part: { type: string; state: string; input?: unknown; errorText?: string };
}) {
  const name = part.type.replace(/^tool-/, "");
  const isError = part.state === "output-error";
  const isDone = part.state === "output-available";
  const Icon = isError ? AlertCircle : isDone ? CheckCircle2 : Loader2;
  const iconClass = isError
    ? "text-rose-500"
    : isDone
      ? "text-emerald-500"
      : "text-zinc-400 animate-spin";

  let summary = "";
  const input = part.input as Record<string, unknown> | undefined;
  if (input) {
    if (typeof input.title === "string") summary = input.title;
    else if (typeof input.id === "string") summary = input.id;
    else if (typeof input.status === "string") summary = `→ ${input.status}`;
    else summary = JSON.stringify(input).slice(0, 80);
  }

  return (
    <div className="flex items-start gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs">
      <Icon size={12} className={`mt-0.5 shrink-0 ${iconClass}`} />
      <div className="min-w-0 flex-1">
        <div className="font-medium text-zinc-700">{name}</div>
        {summary && <div className="mt-0.5 truncate text-zinc-500">{summary}</div>}
        {part.errorText && <div className="mt-1 text-rose-600">{part.errorText}</div>}
      </div>
    </div>
  );
}

function DataToolPart({ type, data }: { type: string; data: unknown }) {
  const d = data as {
    status?: string;
    sandboxId?: string;
    url?: string;
    command?: string;
    args?: string[];
    paths?: string[];
    exitCode?: number;
    error?: { message: string };
  };
  const isError = d?.status === "error";
  const isDone = d?.status === "done" || d?.status === "uploaded";
  const Icon = isError ? AlertCircle : isDone ? CheckCircle2 : Loader2;
  const iconClass = isError
    ? "text-rose-500"
    : isDone
      ? "text-emerald-500"
      : "text-zinc-400 animate-spin";

  let label = "";
  let detail = "";
  if (type === "data-create-sandbox") {
    label = "Create sandbox";
    detail = d.sandboxId ?? "spinning up…";
  } else if (type === "data-generating-files") {
    label =
      d.status === "uploading"
        ? "Uploading files"
        : d.status === "generating"
          ? "Generating files"
          : "Files";
    detail = (d.paths ?? []).join(", ") || "—";
  } else if (type === "data-run-command") {
    label = `${d.command ?? "command"} ${(d.args ?? []).join(" ")}`.trim();
    detail = d.exitCode !== undefined ? `exit ${d.exitCode}` : d.status ?? "";
  } else if (type === "data-get-sandbox-url") {
    label = "Preview URL";
    detail = d.url ?? "fetching…";
  }

  return (
    <div className="flex items-start gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs">
      <Icon size={12} className={`mt-0.5 shrink-0 ${iconClass}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {type === "data-run-command" ? (
            <Terminal size={11} className="text-zinc-400" />
          ) : type === "data-generating-files" ? (
            <FileCode size={11} className="text-zinc-400" />
          ) : null}
          <span className="font-medium text-zinc-700">{label}</span>
        </div>
        {detail && <div className="mt-0.5 truncate text-zinc-500">{detail}</div>}
        {d.error && <div className="mt-1 text-rose-600">{d.error.message}</div>}
      </div>
    </div>
  );
}
