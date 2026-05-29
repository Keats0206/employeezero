// Build & deploy bridge for the chat. The CoS never triggers this — only a
// human click does. Assembles the crew's outputs into the shape the deploy
// route expects, then streams the Builder's SSE phases back to the caller.

import type { CrewStatus } from "@/app/components/cabana/Desk";

export type BuildState = {
  status: "idle" | "building" | "done" | "error";
  phase?: string;
  html?: string;
  url?: string | null;
  error?: string;
};

// Build the deploy payload from accumulated crew outputs + the founder's chosen
// headline. contentFromOutputs (server) fills any gaps with sane defaults.
function assembleOutputs(crew: CrewStatus, chosenHeadline?: string) {
  const builder = (crew.builder?.output ?? {}) as { concept?: string; angle?: string; headline_options?: string[] };
  const strategist = (crew.strategist?.output ?? {}) as Record<string, unknown>;
  const scout = (crew.scout?.output ?? {}) as { pains?: string[] };

  return {
    builder: {
      headline: chosenHeadline || builder.headline_options?.[0] || "Launch your offer this week",
      subheadline: builder.angle || "",
      cta: "Get started",
      pain_hook: builder.concept || "",
    },
    strategist,
    scout: { pains: scout.pains ?? [] },
  };
}

export async function streamBuild(
  crew: CrewStatus,
  chosenHeadline: string | undefined,
  onState: (patch: Partial<BuildState>) => void,
  signal?: AbortSignal,
) {
  onState({ status: "building", phase: "Starting the Builder…", error: undefined });

  const res = await fetch("/api/cabana/deploy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ outputs: assembleOutputs(crew, chosenHeadline), taskType: "new_site" }),
    signal,
  });

  if (!res.ok || !res.body) {
    onState({ status: "error", error: `Build failed to start (${res.status})` });
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let codeBuf = ""; // accumulates streamed HTML so the preview builds live

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      let event: Record<string, unknown>;
      try {
        event = JSON.parse(line.slice(6));
      } catch {
        continue;
      }
      switch (event.type) {
        case "phase":
          onState({ status: "building", phase: String(event.text ?? event.phase ?? "Working…") });
          break;
        case "code":
          // Live HTML deltas — stream them straight into the preview iframe.
          codeBuf += String(event.delta ?? "");
          onState({ status: "building", html: codeBuf });
          break;
        case "html":
          codeBuf = String(event.html ?? "");
          onState({ html: codeBuf });
          break;
        case "complete":
          onState({ status: "done", html: String(event.html ?? ""), url: (event.url as string | null) ?? null, phase: undefined });
          break;
        case "deploy_error":
          // The page HTML still rendered; deploy to the sandbox failed.
          onState({ status: "done", url: null, phase: undefined, error: `Live deploy failed: ${event.message}` });
          break;
        case "error":
          onState({ status: "error", error: String(event.message ?? "Unknown build error") });
          break;
      }
    }
  }
}
