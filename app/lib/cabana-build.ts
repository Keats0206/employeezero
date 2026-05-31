// Build & deploy bridge for the chat. The CoS never triggers this — only a
// human click does. Assembles the crew's outputs into the shape the deploy
// route expects, then streams the Builder's SSE phases back to the caller.

import type { CrewStatus } from "@/app/components/cabana/Desk";

export type BuildLog = { stream: "stdout" | "stderr"; text: string };

export type BuildState = {
  status: "idle" | "building" | "done" | "error";
  phase?: string;
  html?: string;
  previewUrl?: string | null;
  url?: string | null;
  logs?: BuildLog[];
  currentCmd?: string;
  // The generated-app project this page captures data into. Persisted with the
  // build so a rebuild reuses it and leads accrue to one project.
  projectId?: string;
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
  model?: string,
  projectId?: string,
  updateBrief?: string,
  existingHtml?: string,
) {
  const taskType = updateBrief && existingHtml ? "product_update" : "new_site";
  onState({ status: "building", phase: "Starting the Builder…", error: undefined, logs: [], currentCmd: undefined, previewUrl: undefined });

  const res = await fetch("/api/cabana/deploy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      outputs: assembleOutputs(crew, chosenHeadline),
      taskType,
      model,
      projectId,
      updateInstruction: updateBrief,
      existingHtml,
    }),
    signal,
  });

  await consumeBuildStream(res, onState);
}

// Parse the Builder's SSE phases off a deploy Response into BuildState patches.
// Shared by the chat's streamBuild and the anonymous onboarding build.
export async function consumeBuildStream(
  res: Response,
  onState: (patch: Partial<BuildState>) => void,
) {
  if (!res.ok || !res.body) {
    onState({ status: "error", error: `Build failed to start (${res.status})` });
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let codeBuf = "";
  const logBuf: BuildLog[] = [];

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
        case "sandbox_ready":
          onState({ phase: "Sandbox ready — generating files…" });
          break;
        case "generating_files":
          onState({ phase: `Generating ${(event.paths as string[])?.length ?? ""} files…`, currentCmd: undefined });
          break;
        case "run_command":
          onState({ currentCmd: String(event.cmd ?? ""), phase: String(event.cmd ?? "Running…") });
          break;
        case "log":
          logBuf.push({ stream: event.stream as "stdout" | "stderr", text: String(event.text ?? "") });
          onState({ logs: logBuf.slice(-200) });
          break;
        case "preview_url":
          onState({ previewUrl: String(event.url ?? ""), phase: "Live preview ready" });
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
          onState({
            status: "done",
            html: String(event.html ?? ""),
            url: (event.url as string | null) ?? null,
            projectId: (event.projectId as string | undefined) ?? undefined,
            phase: undefined,
            currentCmd: undefined,
          });
          break;
        case "deploy_error":
          onState({ status: "done", url: null, phase: undefined, error: `Live deploy failed: ${event.message}` });
          break;
        case "error":
          onState({ status: "error", error: String(event.message ?? "Unknown build error") });
          break;
      }
    }
  }
}
