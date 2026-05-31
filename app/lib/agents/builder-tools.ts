import { tool } from "ai";
import { z } from "zod";
import { gateway, generateObject } from "ai";
import { Sandbox } from "@vercel/sandbox";
import { Writable } from "stream";

let activeSandbox: Sandbox | null = null;

export function getActiveSandbox() { return activeSandbox; }
export function clearActiveSandbox() { activeSandbox = null; }

// ─── Tool: createSandbox ──────────────────────────────────────────────────────

export function makeCreateSandboxTool(onEvent: (e: BuilderToolEvent) => void) {
  return tool({
    description: "Create a Vercel Sandbox — a real Node.js VM where the app will be scaffolded, built, and deployed.",
    inputSchema: z.object({
      reason: z.string().describe("Why you're creating the sandbox"),
    }),
    execute: async () => {
      onEvent({ type: "phase", phase: "sandbox", text: "Spinning up build environment…" });
      const snapshotId = process.env.SANDBOX_SNAPSHOT_ID;
      activeSandbox = await Sandbox.create(
        snapshotId
          ? { source: { type: "snapshot", snapshotId }, timeout: 300_000, ports: [5173] }
          : { runtime: "node22", timeout: 300_000, ports: [5173] }
      );
      const name = activeSandbox.name;
      onEvent({ type: "sandbox_ready", sandboxId: name });
      return { sandboxId: name, status: "ready" };
    },
  });
}

// ─── Tool: generateFiles ──────────────────────────────────────────────────────

const FILE_GEN_MODEL = "anthropic/claude-sonnet-4-6";

export function makeGenerateFilesTool(onEvent: (e: BuilderToolEvent) => void) {
  return tool({
    description: "Generate source files for the Vite+React app and write them to the sandbox. Call to scaffold the project or fix broken files after a build error.",
    inputSchema: z.object({
      paths: z.array(z.string()).describe("File paths to generate, relative to /app (e.g. src/App.tsx)"),
      instruction: z.string().describe("What to build or fix"),
      context: z.string().optional().describe("Additional product context: business name, offer, copy, pains"),
    }),
    execute: async ({ paths, instruction, context }) => {
      if (!activeSandbox) return { error: "No sandbox — call createSandbox first" };

      onEvent({ type: "generating_files", paths, status: "generating" });

      const { object } = await generateObject({
        model: gateway(FILE_GEN_MODEL),
        schema: z.object({
          files: z.array(z.object({
            path: z.string(),
            content: z.string(),
          })),
        }),
        maxOutputTokens: 32000,
        prompt: `You are a senior full-stack engineer generating source files for a Vite + React + TypeScript app.

Task: ${instruction}
${context ? `\nProduct context:\n${context}` : ""}

Generate COMPLETE file contents for these paths:
${paths.map(p => `- ${p}`).join("\n")}

Rules:
- Output complete, working file contents — no truncation, no placeholders
- Use Tailwind CSS (via CDN in index.html, or configure tailwind.config.js if in paths)
- React 18 + TypeScript + Vite 5
- react-router-dom v6 for routing
- All imports must resolve within the generated file set or standard node_modules
- Forms should POST to /api/leads
- Inter font from Google Fonts in index.html
- Choose a strong visual identity: one accent color + neutrals, mobile-first`,
      });

      onEvent({ type: "generating_files", paths, status: "uploading" });

      await activeSandbox.writeFiles(
        object.files.map(f => ({
          path: `/app/${f.path}`,
          content: Buffer.from(f.content),
        }))
      );

      onEvent({ type: "generating_files", paths, status: "done" });
      return { written: object.files.map(f => f.path) };
    },
  });
}

// ─── Tool: runCommand ─────────────────────────────────────────────────────────

export function makeRunCommandTool(onEvent: (e: BuilderToolEvent) => void) {
  return tool({
    description: "Run a shell command in the sandbox. Use detached=true for long-running processes like dev servers.",
    inputSchema: z.object({
      cmd: z.string(),
      args: z.array(z.string()).optional(),
      cwd: z.string().optional(),
      detached: z.boolean().optional(),
      reason: z.string().describe("Why you're running this command"),
    }),
    execute: async ({ cmd, args: cmdArgs = [], cwd = "/app", detached = false }) => {
      if (!activeSandbox) return { error: "No sandbox" };

      const label = `${cmd} ${cmdArgs.join(" ")}`.trim();
      onEvent({ type: "run_command", cmd: label, cwd, status: "running" });

      const stdoutLines: string[] = [];
      const stderrLines: string[] = [];

      const stdout = new Writable({
        write(chunk: Buffer, _enc: string, cb: () => void) {
          const line = chunk.toString();
          stdoutLines.push(line);
          onEvent({ type: "log", stream: "stdout", text: line.trim() });
          cb();
        },
      });
      const stderr = new Writable({
        write(chunk: Buffer, _enc: string, cb: () => void) {
          const line = chunk.toString();
          stderrLines.push(line);
          onEvent({ type: "log", stream: "stderr", text: line.trim() });
          cb();
        },
      });

      if (detached) {
        await activeSandbox.runCommand({ cmd, args: cmdArgs, cwd, detached: true, stdout, stderr });
        onEvent({ type: "run_command", cmd: label, cwd, status: "detached" });
        return { status: "detached" };
      }

      const result = await activeSandbox.runCommand({ cmd, args: cmdArgs, cwd, stdout, stderr });
      const { exitCode } = result;
      onEvent({ type: "run_command", cmd: label, cwd, status: exitCode === 0 ? "done" : "error" });

      return {
        exitCode,
        stdout: stdoutLines.join("").slice(-3000),
        stderr: stderrLines.join("").slice(-3000),
        success: exitCode === 0,
      };
    },
  });
}

// ─── Tool: getSandboxURL ──────────────────────────────────────────────────────

export function makeGetSandboxURLTool(onEvent: (e: BuilderToolEvent) => void) {
  return tool({
    description: "Get the public preview URL for the Vite dev server running in the sandbox (port 5173).",
    inputSchema: z.object({
      port: z.number().optional(),
    }),
    execute: async ({ port = 5173 }) => {
      if (!activeSandbox) return { error: "No sandbox" };
      const url = activeSandbox.domain(port);
      onEvent({ type: "preview_url", url });
      return { url };
    },
  });
}

// ─── Tool: deployToVercel ─────────────────────────────────────────────────────

export function makeDeployTool(onEvent: (e: BuilderToolEvent) => void) {
  return tool({
    description: "Build the Vite app and deploy it to a permanent Vercel URL. Call after the dev preview is verified.",
    inputSchema: z.object({
      name: z.string().describe("Deployment name slug, e.g. 'acme-waitlist'"),
    }),
    execute: async ({ name }) => {
      if (!activeSandbox) return { error: "No sandbox" };
      onEvent({ type: "phase", phase: "deploying", text: "Building and deploying to Vercel…" });

      const buildResult = await activeSandbox.runCommand({ cmd: "npm", args: ["run", "build"], cwd: "/app" });
      const buildStdout = await buildResult.stdout();
      const buildStderr = await buildResult.stderr();
      if (buildResult.exitCode !== 0) {
        onEvent({ type: "log", stream: "stderr", text: buildStderr.slice(-2000) });
        return { error: "Build failed", stderr: buildStderr.slice(-2000) };
      }

      const deployResult = await activeSandbox.runCommand({
        cmd: "vercel",
        args: ["deploy", "--prebuilt", "--yes", "--name", name, "--token", process.env.VERCEL_TOKEN ?? ""],
        cwd: "/app",
      });
      const combined = (await deployResult.stdout()) + "\n" + (await deployResult.stderr());
      const deployUrl = combined.match(/https:\/\/[^\s]+\.vercel\.app/)?.[0] ?? null;

      if (deployUrl) onEvent({ type: "deployed", url: deployUrl });
      return { url: deployUrl, buildOutput: buildStdout.slice(-1000) };
    },
  });
}

// ─── Event types ──────────────────────────────────────────────────────────────

export type BuilderToolEvent =
  | { type: "phase"; phase: string; text: string }
  | { type: "sandbox_ready"; sandboxId: string }
  | { type: "generating_files"; paths: string[]; status: "generating" | "uploading" | "done" }
  | { type: "run_command"; cmd: string; cwd: string; status: "running" | "done" | "error" | "detached" }
  | { type: "log"; stream: "stdout" | "stderr"; text: string }
  | { type: "preview_url"; url: string }
  | { type: "deployed"; url: string }
  | { type: "error"; message: string };
