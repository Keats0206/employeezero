import { Sandbox } from "@vercel/sandbox";
import { gateway, streamText } from "ai";
import { CHEAP_MODEL } from "@/app/lib/cabana-config";

// Stress-test: build on the cheap model too. Swap back to a stronger model for
// production-quality HTML when you're done testing.
export const BUILDER_MODEL = CHEAP_MODEL;

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
  | { type: "phase"; phase: "writing" | "deploying"; text: string }
  | { type: "code"; delta: string }
  | { type: "html"; html: string }
  | { type: "deploy_error"; message: string }
  | { type: "complete"; html: string; url: string | null; summary: string }
  | { type: "error"; message: string };

export function contentFromOutputs(outputs: {
  builder?: {
    headline?: string;
    subheadline?: string;
    cta?: string;
    pain_hook?: string;
  };
  strategist?: {
    offer?: string;
    price?: string;
    businessName?: string;
    icp?: string;
  };
  scout?: {
    pains?: string[];
  };
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

function builderPrompt(c: SiteContent): string {
  return `You are Builder — a senior web designer. Produce a COMPLETE, production-quality single-page landing site as ONE raw, self-contained HTML document.

Business: ${c.businessName}
Offer: ${c.offer} (${c.price})
Target customer: ${c.icp}
Hero headline: ${c.headline}
Subheadline: ${c.subheadline}
CTA: ${c.cta}
Pain hook: ${c.pain_hook}
Customer pains:
${c.pains.map(p => `- ${p}`).join("\n")}

Requirements:
- Output ONLY raw HTML. No markdown fences, no commentary before or after.
- Full document: <!DOCTYPE html> … </html>, lang="en", proper meta + <title>${c.businessName}</title>.
- Self-contained: load Tailwind via <script src="https://cdn.tailwindcss.com"></script> in <head>. No external CSS files.
- Load Inter from Google Fonts and apply it to the body.
- Sections: sticky nav, hero with CTA, a "pains" section addressing each pain, an offer/pricing card, how-it-works or social proof, FAQ, footer ("Built with Cabana").
- Modern, clean, conversion-focused. Real, specific copy — expand beyond the inputs where it helps. Mobile-first responsive.`;
}

function updatePrompt(c: SiteContent, existingHtml: string, updateInstruction: string): string {
  return `You are Builder — a senior web designer maintaining an already-generated landing page.

Update the existing page according to the Builder work order. Return the COMPLETE updated raw HTML document, not a diff.

Business: ${c.businessName}
Offer: ${c.offer} (${c.price})
Target customer: ${c.icp}
Builder work order:
${updateInstruction}

Existing HTML:
${existingHtml}

Requirements:
- Output ONLY raw HTML. No markdown fences, no commentary before or after.
- Preserve the current page structure when it still works.
- Apply the requested update concretely in the visible page copy or layout.
- Keep it self-contained with Tailwind CDN and no external app build step.
- Return a full document from <!DOCTYPE html> through </html>.`;
}

function fallbackHtml(c: SiteContent): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${c.businessName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>body{font-family:'Inter',sans-serif}</style>
</head>
<body class="bg-white text-gray-900">
  <nav class="border-b border-gray-100 px-6 py-4"><div class="max-w-2xl mx-auto flex items-center justify-between"><span class="font-bold text-lg">${c.businessName}</span><a href="#cta" class="bg-violet-600 text-white text-sm font-semibold px-4 py-2 rounded-lg">${c.cta}</a></div></nav>
  <section class="max-w-2xl mx-auto px-6 pt-20 pb-16 text-center"><p class="text-violet-600 text-sm font-medium mb-4">${c.pain_hook}</p><h1 class="text-4xl sm:text-5xl font-extrabold leading-tight mb-6">${c.headline}</h1><p class="text-xl text-gray-500 mb-8">${c.subheadline}</p><a id="cta" href="#" class="inline-block bg-violet-600 text-white font-bold px-8 py-4 rounded-xl text-lg">${c.cta}</a><p class="text-sm text-gray-400 mt-3">${c.price}</p></section>
  <section class="bg-gray-50 py-16 px-6"><div class="max-w-2xl mx-auto"><h2 class="text-2xl font-bold text-center mb-10">Sound familiar?</h2><div class="space-y-4">${c.pains.map(p => `<div class="bg-white rounded-xl p-5 border border-gray-100 flex items-start gap-3"><span class="text-red-400 text-lg mt-0.5">x</span><p class="text-gray-700">${p}</p></div>`).join("")}</div></div></section>
  <section class="py-16 px-6"><div class="max-w-md mx-auto text-center"><h2 class="text-2xl font-bold mb-4">What you get</h2><div class="border border-gray-200 rounded-2xl p-8 text-left"><div class="flex items-center justify-between mb-4"><span class="font-bold">${c.offer}</span><span class="text-2xl font-extrabold text-violet-600">${c.price}</span></div><p class="text-gray-500 text-sm mb-6">Built for ${c.icp}</p><a href="#" class="block w-full bg-violet-600 text-white font-bold py-3 rounded-xl text-center">${c.cta}</a></div></div></section>
  <footer class="border-t border-gray-100 py-8 text-center text-sm text-gray-400"><p>${c.businessName} - Built with Cabana</p></footer>
</body>
</html>`;
}

function stripFences(s: string): string {
  const fence = s.match(/```(?:html)?\s*([\s\S]*?)```/i);
  return (fence ? fence[1] : s).trim();
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "cabana-site";
}

async function deployHtml(html: string, content: SiteContent): Promise<string | null> {
  const snapshotId = process.env.SANDBOX_SNAPSHOT_ID;
  const sandbox = await Sandbox.create(
    snapshotId
      ? { source: { type: "snapshot", snapshotId }, timeout: 120_000 }
      : { runtime: "node22", timeout: 120_000 }
  );
  try {
    if (!snapshotId) {
      await sandbox.runCommand({ cmd: "npm", args: ["install", "-g", "vercel"] });
    }
    await sandbox.runCommand({ cmd: "mkdir", args: ["-p", "/site"] });
    await sandbox.fs.writeFile("/site/index.html", Buffer.from(html));
    const deployResult = await sandbox.runCommand({
      cmd: "vercel",
      args: ["deploy", "--yes", "--name", slugify(content.businessName), "--token", process.env.VERCEL_TOKEN ?? ""],
      cwd: "/site",
    });
    const combined = (await deployResult.stdout()) + "\n" + (await deployResult.stderr());
    return combined.match(/https:\/\/[^\s]+\.vercel\.app/)?.[0] ?? null;
  } finally {
    await sandbox.stop();
  }
}

export async function runBuilderTask({
  content,
  taskType,
  brief,
  existingHtml,
  onEvent,
}: {
  content: SiteContent;
  taskType: BuilderTaskType;
  brief?: string;
  existingHtml?: string;
  onEvent?: (event: BuilderEvent) => void;
}) {
  const send = (event: BuilderEvent) => onEvent?.(event);
  send({ type: "phase", phase: "writing", text: `Builder writing the page with ${BUILDER_MODEL}...` });

  let raw = "";
  const trimmedBrief = brief?.trim() ?? "";
  const shouldUpdate = taskType === "product_update" && existingHtml && trimmedBrief;
  const prompt = shouldUpdate
    ? updatePrompt(content, existingHtml.slice(0, 80_000), trimmedBrief)
    : builderPrompt(content);

  const { textStream } = streamText({ model: gateway(BUILDER_MODEL), prompt });
  for await (const delta of textStream) {
    raw += delta;
    send({ type: "code", delta });
  }

  let html = stripFences(raw);
  if (!html.toLowerCase().includes("<html")) html = fallbackHtml(content);
  send({ type: "html", html });
  send({ type: "phase", phase: "deploying", text: "Publishing to a live URL..." });

  let url: string | null = null;
  try {
    url = await deployHtml(html, content);
  } catch (e) {
    send({ type: "deploy_error", message: e instanceof Error ? e.message : String(e) });
  }

  const summary = shouldUpdate
    ? `Builder updated ${content.businessName} from the approved work order.`
    : `Builder created the first ${content.businessName} landing page.`;
  send({ type: "complete", html, url, summary });
  return { html, url, summary, model: BUILDER_MODEL };
}
