import { Sandbox } from "@vercel/sandbox";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

export const runtime = "nodejs";
export const maxDuration = 300;

// ─── Vite template ───────────────────────────────────────────────────────────

function buildViteTemplate(content: {
  headline: string;
  subheadline: string;
  cta: string;
  pain_hook: string;
  offer: string;
  price: string;
  businessName: string;
  icp: string;
  pains: string[];
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${content.businessName}</title>
  <link rel="stylesheet" href="/style.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
</head>
<body class="bg-white text-gray-900">

  <!-- Nav -->
  <nav class="border-b border-gray-100 px-6 py-4">
    <div class="max-w-2xl mx-auto flex items-center justify-between">
      <span class="font-bold text-lg">${content.businessName}</span>
      <a href="#cta" class="bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
        ${content.cta}
      </a>
    </div>
  </nav>

  <!-- Hero -->
  <section class="max-w-2xl mx-auto px-6 pt-20 pb-16 text-center">
    <p class="text-violet-600 text-sm font-medium mb-4">${content.pain_hook}</p>
    <h1 class="text-4xl sm:text-5xl font-extrabold leading-tight mb-6">
      ${content.headline}
    </h1>
    <p class="text-xl text-gray-500 mb-8 leading-relaxed">
      ${content.subheadline}
    </p>
    <a id="cta" href="#" class="inline-block bg-violet-600 hover:bg-violet-700 text-white font-bold px-8 py-4 rounded-xl text-lg transition-colors">
      ${content.cta}
    </a>
    <p class="text-sm text-gray-400 mt-3">${content.price} · No commitment required</p>
  </section>

  <!-- Pain points -->
  <section class="bg-gray-50 py-16 px-6">
    <div class="max-w-2xl mx-auto">
      <h2 class="text-2xl font-bold text-center mb-10">Sound familiar?</h2>
      <div class="space-y-4">
        ${content.pains.map(pain => `
        <div class="bg-white rounded-xl p-5 border border-gray-100 flex items-start gap-3">
          <span class="text-red-400 text-lg mt-0.5">✗</span>
          <p class="text-gray-700">${pain}</p>
        </div>`).join("")}
      </div>
    </div>
  </section>

  <!-- Offer -->
  <section class="py-16 px-6">
    <div class="max-w-md mx-auto text-center">
      <h2 class="text-2xl font-bold mb-4">What you get</h2>
      <div class="border border-gray-200 rounded-2xl p-8 text-left">
        <div class="flex items-center justify-between mb-4">
          <span class="font-bold text-lg">${content.offer}</span>
          <span class="text-2xl font-extrabold text-violet-600">${content.price}</span>
        </div>
        <p class="text-gray-500 text-sm mb-6">Built for ${content.icp}</p>
        <a href="#" class="block w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-xl text-center transition-colors">
          ${content.cta}
        </a>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
    <p>${content.businessName} · Built with Cabana</p>
  </footer>

</body>
</html>`;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const { outputs } = await req.json();

  if (!outputs?.builder || !outputs?.strategist) {
    return Response.json({ error: "builder and strategist outputs required" }, { status: 400 });
  }

  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(enc.encode("data: " + JSON.stringify(obj) + "\n\n"));

      try {
        const snapshotId = process.env.SANDBOX_SNAPSHOT_ID;
        send({ type: "progress", text: snapshotId ? "Booting sandbox…" : "Spinning up build sandbox…" });

        const sandbox = await Sandbox.create(
          snapshotId
            ? { source: { type: "snapshot", snapshotId }, timeout: 120_000 }
            : { runtime: "node22", timeout: 120_000 }
        );

        // If no snapshot, install tools first
        if (!snapshotId) {
          send({ type: "progress", text: "Installing build tools (one-time)…" });
          await sandbox.runCommand({ cmd: "npm", args: ["install", "-g", "vite", "vercel"] });
        }

        send({ type: "progress", text: "Generating landing page code…" });

        // Use claude-sonnet to optionally enhance the template
        // (falls back to template if model unavailable)
        let html = buildViteTemplate({
          headline: outputs.builder.headline,
          subheadline: outputs.builder.subheadline,
          cta: outputs.builder.cta,
          pain_hook: outputs.builder.pain_hook,
          offer: outputs.strategist.offer,
          price: outputs.strategist.price,
          businessName: outputs.strategist.businessName,
          icp: outputs.strategist.icp,
          pains: outputs.scout?.pains ?? [],
        });

        send({ type: "progress", text: "Writing files to sandbox…" });

        await sandbox.runCommand({ cmd: "mkdir", args: ["-p", "/app"] });

        await sandbox.fs.writeFile("/app/index.html", Buffer.from(html));

        await sandbox.fs.writeFile("/app/package.json", Buffer.from(JSON.stringify({
          name: "cabana-site",
          version: "1.0.0",
          scripts: { build: "vite build" },
          devDependencies: { vite: "^5.0.0", tailwindcss: "^4.0.0", "@tailwindcss/vite": "^4.0.0" },
        }, null, 2)));

        await sandbox.fs.writeFile("/app/vite.config.js", Buffer.from(`
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  root: '.',
  build: { outDir: 'dist' },
  plugins: [tailwindcss()],
});
`));

        await sandbox.fs.writeFile("/app/style.css", Buffer.from(`
@import "tailwindcss";
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
body { font-family: 'Inter', sans-serif; }
`));

        send({ type: "progress", text: "Installing dependencies…" });
        await sandbox.runCommand({ cmd: "npm", args: ["install"], cwd: "/app" });

        send({ type: "progress", text: "Building site…" });
        await sandbox.runCommand({ cmd: "npx", args: ["vite", "build"], cwd: "/app" });

        send({ type: "progress", text: "Deploying to Vercel…" });

        const deployResult = await sandbox.runCommand({
          cmd: "vercel",
          args: ["deploy", "--prebuilt", "--yes", "--token", process.env.VERCEL_TOKEN ?? ""],
          cwd: "/app/dist",
        });

        const deployOutput = await deployResult.stdout();
        const urlMatch = deployOutput.match(/https:\/\/[^\s]+\.vercel\.app/);
        const deployUrl = urlMatch?.[0] ?? null;

        await sandbox.stop();

        if (deployUrl) {
          send({ type: "complete", url: deployUrl, html });
        } else {
          send({ type: "error", message: "Deploy succeeded but no URL found", raw: deployOutput });
        }

      } catch (err) {
        send({ type: "error", message: err instanceof Error ? err.message : String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
