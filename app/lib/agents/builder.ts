import { gateway, streamText, stepCountIs } from "ai";
import { AGENT_MODELS } from "@/app/lib/cabana-config";
import { createAppProject, getAppProject } from "@/app/lib/db/app-data";
import {
  makeCreateSandboxTool,
  makeGenerateFilesTool,
  makeRunCommandTool,
  makeGetSandboxURLTool,
  makeDeployTool,
  clearActiveSandbox,
  type BuilderToolEvent,
} from "./builder-tools";

export const BUILDER_MODEL = AGENT_MODELS["builder"]; // claude-sonnet-4-6

export type SiteContent = {
  headline: string;
  subheadline: string;
  cta: string;
  pain_hook: string;
  offer: string;
  price: string;
  businessName: string;
  icp: string;
  pains: string[];
};

export type BuilderTaskType = "new_site" | "product_update";

export type BuilderEvent =
  | { type: "phase"; phase: string; text: string }
  | { type: "sandbox_ready"; sandboxId: string }
  | { type: "generating_files"; paths: string[]; status: "generating" | "uploading" | "done" }
  | { type: "run_command"; cmd: string; cwd: string; status: "running" | "done" | "error" | "detached" }
  | { type: "log"; stream: "stdout" | "stderr"; text: string }
  | { type: "preview_url"; url: string }
  | { type: "html"; html: string }
  | { type: "deploy_error"; message: string }
  | { type: "complete"; html: string; url: string | null; summary: string; projectId?: string }
  | { type: "error"; message: string };

export function contentFromOutputs(outputs: {
  builder?: { headline?: string; subheadline?: string; cta?: string; pain_hook?: string };
  strategist?: { offer?: string; price?: string; businessName?: string; icp?: string };
  scout?: { pains?: string[] };
}): SiteContent | null {
  if (!outputs.builder || !outputs.strategist) return null;
  return {
    headline: outputs.builder.headline ?? "Launch a focused offer this week",
    subheadline: outputs.builder.subheadline ?? "A simple page for a simple paid test.",
    cta: outputs.builder.cta ?? "Get started",
    pain_hook: outputs.builder.pain_hook ?? "Built around the problem your customer already feels.",
    offer: outputs.strategist.offer ?? "Starter offer",
    price: outputs.strategist.price ?? "TBD",
    businessName: outputs.strategist.businessName ?? "Cabana Site",
    icp: outputs.strategist.icp ?? "early customers",
    pains: outputs.scout?.pains ?? [],
  };
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "cabana-site";
}

function injectCapture(html: string, projectId: string, publicKey: string): string {
  const base = (process.env.CABANA_URL || "").replace(/\/$/, "");
  const endpoint = `${base}/api/p/${projectId}/leads`;
  const script = `
<script>
(function () {
  var ENDPOINT = ${JSON.stringify(endpoint)};
  var KEY = ${JSON.stringify(publicKey)};
  function wire(form) {
    if (form.dataset.cabanaWired) return;
    form.dataset.cabanaWired = "1";
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var data = { _key: KEY };
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(function () {
        form.innerHTML = '<p style="text-align:center;font-weight:600;padding:1rem">Thanks — you\\'re on the list!</p>';
      }).catch(function () {
        form.innerHTML = '<p style="text-align:center;padding:1rem">Something went wrong. Try again.</p>';
      });
    });
  }
  function wireAll() { document.querySelectorAll("form").forEach(wire); }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wireAll);
  } else { wireAll(); }
})();
</script>`;
  return html.includes("</body>")
    ? html.replace("</body>", `${script}\n</body>`)
    : html + script;
}

// ─── System prompt ────────────────────────────────────────────────────────────

function builderSystemPrompt(c: SiteContent): string {
  const slug = slugify(c.businessName);
  return `You are Builder — a senior full-stack engineer and product designer. You ship real, working Vite + React apps from scratch inside a Vercel Sandbox VM.

## Your job
Given a product brief, scaffold a complete multi-page Vite + React + TypeScript app, install dependencies, run the dev server to verify it works, then deploy to Vercel.

## Product brief
Business: ${c.businessName}
Offer: ${c.offer} (${c.price})
Target customer: ${c.icp}
Hero headline: ${c.headline}
Subheadline: ${c.subheadline}
CTA: ${c.cta}
Pain hook: ${c.pain_hook}
Customer pains:
${c.pains.map(p => `- ${p}`).join("\n")}

## App structure to build
Generate these pages as React route components:
1. / — Hero + pain section + CTA form (email capture)
2. /pricing — Offer card, price, what's included, CTA
3. /how-it-works — 3-step explainer
4. /faq — 4-6 Q&A items

## Tech stack
- Vite 5 + React 18 + TypeScript
- Tailwind CSS (via CDN in index.html)
- react-router-dom v6 (BrowserRouter)
- Inter font from Google Fonts
- No component library — clean hand-rolled Tailwind components

## Design direction
- Choose a visual identity that fits the niche: color palette (1 accent + neutrals), typography weight, tone
- Black/white canvas with one strong accent color
- Mobile-first, no shadows, pill buttons
- Real conversion-focused copy — expand beyond the brief where it helps

## File tree to generate
\`\`\`
package.json
vite.config.ts
tsconfig.json
index.html
src/main.tsx
src/App.tsx
src/pages/Home.tsx
src/pages/Pricing.tsx
src/pages/HowItWorks.tsx
src/pages/FAQ.tsx
src/components/Nav.tsx
src/components/Footer.tsx
src/components/LeadForm.tsx
\`\`\`

## Execution order
1. createSandbox
2. generateFiles — all files above in one call
3. runCommand: npm install (cwd: /app, wait for exit)
4. runCommand: npm run dev (cwd: /app, detached: true)
5. getSandboxURL — get the preview link
6. deployToVercel with name "${slug}"

## Error handling
- If npm install or build fails, read stderr, call generateFiles again with only the broken files fixed
- Never regenerate all files to fix one error
- Track what you've already tried — don't repeat the same fix twice
- Max 3 fix attempts before reporting failure

## Important
- /app is the working directory inside the sandbox
- Do not run \`cd\` — use the cwd param on runCommand instead
- Forms POST to /api/leads — LeadForm.tsx should handle this
- "Built with Cabana" in the footer`;
}

// ─── Main runner ──────────────────────────────────────────────────────────────

export async function runBuilderTask({
  content,
  taskType,
  brief,
  existingHtml,
  model,
  projectId,
  onEvent,
}: {
  content: SiteContent;
  taskType: BuilderTaskType;
  brief?: string;
  existingHtml?: string;
  model?: string;
  projectId?: string;
  onEvent?: (event: BuilderEvent) => void;
}) {
  const send = (event: BuilderEvent) => onEvent?.(event);
  const toolSend = (e: BuilderToolEvent) => send(e as BuilderEvent);

  const buildModel = model || BUILDER_MODEL;
  send({ type: "phase", phase: "writing", text: `Builder scaffolding with ${buildModel}…` });

  // Mint / reuse the lead-capture project.
  const project = (projectId && (await getAppProject(projectId))) || (await createAppProject({ label: content.businessName }));

  // For product_update we still use the old one-shot approach until we build
  // a proper update flow. New sites get the full agentic builder.
  if (taskType === "product_update" && existingHtml && brief?.trim()) {
    return runLegacyUpdate({ content, brief, existingHtml, buildModel, project, send });
  }

  // ── Agentic build loop ───────────────────────────────────────────────────
  try {
    const { fullStream } = streamText({
      model: gateway(buildModel),
      system: builderSystemPrompt(content),
      prompt: `Build the ${content.businessName} product now. Follow the execution order in the system prompt exactly.`,
      tools: {
        createSandbox:   makeCreateSandboxTool(toolSend),
        generateFiles:   makeGenerateFilesTool(toolSend),
        runCommand:      makeRunCommandTool(toolSend),
        getSandboxURL:   makeGetSandboxURLTool(toolSend),
        deployToVercel:  makeDeployTool(toolSend),
      },
      stopWhen: stepCountIs(20),
    });

    let deployUrl: string | null = null;
    let previewUrl: string | null = null;

    for await (const chunk of fullStream) {
      if (chunk.type === "tool-result") {
        const output = (chunk as unknown as { output: Record<string, unknown> }).output;
        if (typeof output?.url === "string") {
          if (output.url.includes("vercel.app")) deployUrl = output.url;
          else previewUrl = output.url;
        }
        if (output?.error) {
          send({ type: "deploy_error", message: String(output.error) });
        }
      }
    }

    const url = deployUrl ?? previewUrl;

    // Wire lead capture into the deployed page isn't needed for a Vite app —
    // LeadForm.tsx posts to /api/leads which we resolve in the sandbox.
    // For now emit a minimal html sentinel so the UI knows the build finished.
    send({
      type: "complete",
      html: `<!-- Vite app deployed: ${url} -->`,
      url,
      summary: `Builder shipped ${content.businessName} as a full Vite app.`,
      projectId: project.id,
    });

    return { html: "", url, summary: `Builder shipped ${content.businessName}.`, model: buildModel, projectId: project.id };
  } finally {
    clearActiveSandbox();
  }
}

// ─── Legacy one-shot update (kept for product_update task type) ───────────────

async function runLegacyUpdate({
  content, brief, existingHtml, buildModel, project, send,
}: {
  content: SiteContent;
  brief: string;
  existingHtml: string;
  buildModel: string;
  project: { id: string; public_key: string };
  send: (e: BuilderEvent) => void;
}) {
  const { textStream } = streamText({
    model: gateway(buildModel),
    prompt: `You are Builder — a senior web designer maintaining an already-generated landing page.

Update the existing page according to the Builder work order. Return the COMPLETE updated raw HTML document, not a diff.

Business: ${content.businessName}
Offer: ${content.offer} (${content.price})
Target customer: ${content.icp}
Builder work order:
${brief}

Existing HTML:
${existingHtml.slice(0, 80_000)}

Requirements:
- Output ONLY raw HTML. No markdown fences, no commentary before or after.
- Preserve the current page structure when it still works.
- Apply the requested update concretely in the visible page copy or layout.
- Keep it self-contained with Tailwind CDN and no external app build step.
- Return a full document from <!DOCTYPE html> through </html>.`,
  });

  let raw = "";
  for await (const delta of textStream) {
    raw += delta;
    send({ type: "log", stream: "stdout", text: delta });
  }

  const fence = raw.match(/```(?:html)?\s*([\s\S]*?)```/i);
  let html = (fence ? fence[1] : raw).trim();
  if (!html.toLowerCase().includes("<html")) html = existingHtml;

  html = injectCapture(html, project.id, project.public_key);
  send({ type: "html", html });
  send({ type: "phase", phase: "deploying", text: "Deploying updated page…" });

  send({
    type: "complete",
    html,
    url: null,
    summary: `Builder updated ${content.businessName} from the approved work order.`,
    projectId: project.id,
  });
  return { html, url: null, summary: `Builder updated ${content.businessName}.`, model: buildModel, projectId: project.id };
}
