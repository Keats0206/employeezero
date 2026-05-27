"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  Sparkles,
  ArrowUp,
  Search,
  Loader2,
  CheckCircle2,
} from "lucide-react";

const STARTERS = [
  "I'm building an AI cockpit for solo founders. First user is technical founders running 2–10 person teams. Next two weeks I want 5 pilot calls with Lovable users building SaaS dashboards.",
  "I'm building a Notion alternative for designers. First user is in-house design teams at Series A startups. Next month I want 100 active workspaces.",
];

type Source = {
  label: string;
  detail: string;
  href?: string;
  date: string;
};

type ResearchResult = {
  question: string;
  synthesis: string;
  confidence: number;
  sources: Source[];
  recommendation?: string;
};

export default function OnboardingPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [accepted, setAccepted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/onboarding/chat" }),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  function submit(text: string) {
    const t = text.trim();
    if (!t || status === "streaming" || status === "submitted") return;
    sendMessage({ text: t });
    setInput("");
  }

  function acceptMission() {
    setAccepted(true);
    const briefText = messages
      .filter((m) => m.role === "user")
      .flatMap((m) => m.parts)
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("\n\n");

    const payload = { brief: briefText };
    try {
      fetch("/api/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch {}
    document.cookie =
      "ez_onboarding_done=1; Path=/; Max-Age=31536000; SameSite=Lax";
    localStorage.setItem("ez_onboarding_payload", JSON.stringify(payload));
    setTimeout(() => {
      router.push("/inbox");
      router.refresh();
    }, 900);
  }

  const isBusy = status === "streaming" || status === "submitted";
  const hasMessages = messages.length > 0;

  return (
    <div className="mx-auto flex h-[calc(100vh-6rem)] max-w-3xl flex-col">
      <div className="mb-4">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-pink-200 bg-pink-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-pink-500">
          <Sparkles size={11} />
          First run · Chief of Staff
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Tell me about your company.
        </h1>
        <p className="mt-1.5 text-sm text-zinc-500">
          Write like you&apos;d brief a new chief of staff. I&apos;ll do real
          research and propose your first mission.
        </p>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-5"
      >
        {!hasMessages && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="max-w-md text-sm text-zinc-500">
              Start with what you&apos;re building, who it&apos;s for, and
              what needs to ship next.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => submit(s)}
                  className="max-w-xl rounded-lg border border-zinc-200 px-3 py-2 text-left text-xs text-zinc-600 hover:border-zinc-400 hover:text-zinc-900"
                >
                  “{s}”
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-5">
          {messages.map((m) => (
            <MessageView key={m.id} message={m} onAccept={acceptMission} accepted={accepted} />
          ))}
          {isBusy && (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Loader2 size={13} className="animate-spin" />
              Chief of Staff is thinking…
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error.message}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="mt-3 flex items-end gap-2 rounded-xl border border-zinc-200 bg-white p-2 focus-within:border-zinc-400"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(input);
            }
          }}
          rows={2}
          placeholder={
            hasMessages ? "Reply…" : "Tell me what you're building."
          }
          className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm leading-relaxed text-zinc-900 outline-none placeholder:text-zinc-400"
        />
        <button
          type="submit"
          disabled={!input.trim() || isBusy}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-zinc-900 text-white transition-colors hover:bg-zinc-700 disabled:opacity-40"
          aria-label="Send"
        >
          <ArrowUp size={15} />
        </button>
      </form>
    </div>
  );
}

type AnyPart = {
  type: string;
  text?: string;
  input?: unknown;
  output?: unknown;
  state?: string;
};

function MessageView({
  message,
  onAccept,
  accepted,
}: {
  message: { id: string; role: string; parts: unknown[] };
  onAccept: () => void;
  accepted: boolean;
}) {
  const isUser = message.role === "user";
  const parts = message.parts as AnyPart[];

  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={`max-w-[85%] space-y-2 ${
          isUser ? "rounded-2xl bg-zinc-900 px-3.5 py-2 text-sm text-white" : "text-sm text-zinc-800"
        }`}
      >
        {parts.map((part, i) => {
          if (part.type === "text" && part.text) {
            return (
              <p key={i} className="leading-relaxed whitespace-pre-wrap">
                {part.text}
              </p>
            );
          }
          // AI SDK v6 tool parts have type "tool-<toolName>"
          if (part.type === "tool-user_research") {
            return (
              <ResearchCard
                key={i}
                state={part.state}
                input={part.input as { question?: string; audience?: string } | undefined}
                output={part.output as ResearchResult | undefined}
              />
            );
          }
          return null;
        })}
        {!isUser && !accepted && parts.some(isMissionProposal) && (
          <button
            onClick={onAccept}
            className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700"
          >
            <CheckCircle2 size={13} /> Accept mission · start first task
          </button>
        )}
        {!isUser && accepted && (
          <div className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            <CheckCircle2 size={13} /> Mission accepted · setting up your cockpit
          </div>
        )}
      </div>
    </div>
  );
}

function isMissionProposal(part: AnyPart): boolean {
  if (part.type !== "text" || !part.text) return false;
  const t = part.text.toLowerCase();
  return (
    t.includes("nail your icp") ||
    (t.includes("mission") && t.includes("icp"))
  );
}

function ResearchCard({
  state,
  input,
  output,
}: {
  state?: string;
  input?: { question?: string; audience?: string };
  output?: ResearchResult;
}) {
  const isRunning =
    state === "input-streaming" ||
    state === "input-available" ||
    state === "executing" ||
    (!output && state !== "output-available");

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-violet-700">
        <Search size={11} />
        Research Agent
        {isRunning && <Loader2 size={11} className="animate-spin text-zinc-400" />}
      </div>
      {input?.question && (
        <div className="mt-1.5 text-[13px] font-medium text-zinc-900">
          {input.question}
        </div>
      )}
      {input?.audience && (
        <div className="text-[11px] text-zinc-500">Audience: {input.audience}</div>
      )}

      {isRunning && (
        <div className="mt-2 text-xs text-zinc-500">
          Searching the web, Reddit, and Hacker News…
        </div>
      )}

      {output && (
        <>
          <p className="mt-2.5 text-[13px] leading-relaxed text-zinc-800">
            {renderWithCitations(output.synthesis, output.sources)}
          </p>
          <div className="mt-2 flex items-center gap-2 text-[10px] text-zinc-500">
            <span>Confidence</span>
            <div className="h-1 w-20 overflow-hidden rounded-full bg-zinc-200">
              <div
                className={`h-full ${
                  output.confidence >= 70
                    ? "bg-emerald-500"
                    : output.confidence >= 50
                      ? "bg-amber-500"
                      : "bg-rose-500"
                }`}
                style={{ width: `${output.confidence}%` }}
              />
            </div>
            <span className="tabular-nums">{output.confidence}%</span>
          </div>
          {output.sources.length > 0 && (
            <div className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
              {output.sources.map((s, idx) => {
                const n = idx + 1;
                const domain = s.href ? safeDomain(s.href) : "internal";
                const card = (
                  <div className="h-full rounded-md border border-zinc-200 bg-white p-2 hover:border-zinc-400">
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                      <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-sm bg-zinc-100 text-[9px] font-semibold text-zinc-700">
                        {n}
                      </span>
                      <span className="truncate">{domain}</span>
                      <span className="ml-auto shrink-0">{s.date}</span>
                    </div>
                    <div className="mt-1 line-clamp-2 text-[12px] font-medium leading-snug text-zinc-900">
                      {s.label}
                    </div>
                  </div>
                );
                return s.href ? (
                  <a key={n} href={s.href} target="_blank" rel="noreferrer" className="block">
                    {card}
                  </a>
                ) : (
                  <div key={n}>{card}</div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function renderWithCitations(text: string, sources: Source[]) {
  const parts = text.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const m = part.match(/^\[(\d+)\]$/);
    if (m) {
      const n = parseInt(m[1], 10);
      const src = sources[n - 1];
      const chip = (
        <span className="ml-0.5 inline-flex h-[15px] min-w-[15px] items-center justify-center rounded-sm bg-zinc-200 px-1 text-[10px] font-semibold text-zinc-700 hover:bg-zinc-900 hover:text-white">
          {n}
        </span>
      );
      return src?.href ? (
        <a key={i} href={src.href} target="_blank" rel="noreferrer">
          {chip}
        </a>
      ) : (
        <span key={i}>{chip}</span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function safeDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "link";
  }
}
