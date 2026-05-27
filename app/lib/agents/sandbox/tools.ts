import { tool, generateObject, type UIMessageStreamWriter, type UIMessage, type ModelMessage } from "ai";
import { Sandbox } from "@vercel/sandbox";
import z from "zod";
import type { DataPart } from "./data-parts";
import { getRichError } from "./get-rich-error";

type Writer = UIMessageStreamWriter<UIMessage<never, DataPart>>;

const MODEL = process.env.CHAT_MODEL ?? "anthropic/claude-sonnet-4-6";

const createSandbox = (writer: Writer) =>
  tool({
    description:
      "Create a new Vercel Sandbox to run code in. Returns a sandboxId you'll use for subsequent tool calls. Only one sandbox per conversation — reuse it.",
    inputSchema: z.object({
      timeout: z.number().min(600_000).max(2_700_000).optional(),
      ports: z.array(z.number()).max(2).optional(),
    }),
    execute: async ({ timeout, ports }, { toolCallId }) => {
      writer.write({ id: toolCallId, type: "data-create-sandbox", data: { status: "loading" } });
      try {
        const sandbox = await Sandbox.create({ timeout: timeout ?? 600_000, ports });
        const name = sandbox.name;
        writer.write({
          id: toolCallId,
          type: "data-create-sandbox",
          data: { sandboxId: name, status: "done" },
        });
        return `Sandbox created with ID: ${name}. Use this ID for all subsequent tool calls.`;
      } catch (error) {
        const rich = getRichError({ action: "create sandbox", error });
        writer.write({
          id: toolCallId,
          type: "data-create-sandbox",
          data: { status: "error", error: rich.error },
        });
        return rich.message;
      }
    },
  });

const generateFiles = (writer: Writer) =>
  tool({
    description:
      "Generate code files and upload them to the sandbox. Provide the paths you want to create; contents are generated from the conversation context.",
    inputSchema: z.object({
      sandboxId: z.string(),
      paths: z.array(z.string()),
    }),
    execute: async ({ sandboxId, paths }, { toolCallId, messages }) => {
      writer.write({
        id: toolCallId,
        type: "data-generating-files",
        data: { paths, status: "generating" },
      });

      let sandbox: Sandbox;
      try {
        sandbox = await Sandbox.get({ name: sandboxId });
      } catch (error) {
        const rich = getRichError({ action: "get sandbox", args: { sandboxId }, error });
        writer.write({
          id: toolCallId,
          type: "data-generating-files",
          data: { paths, status: "error", error: rich.error },
        });
        return rich.message;
      }

      let files: { path: string; content: string }[];
      try {
        const { object } = await generateObject({
          model: MODEL,
          maxOutputTokens: 64000,
          system:
            "You are a file content generator. Generate files based on the conversation history and provided paths. NEVER generate lock files (pnpm-lock.yaml, package-lock.json, yarn.lock).",
          messages: [
            ...(messages as ModelMessage[]),
            {
              role: "user",
              content: `Generate the content of these files: ${paths.map((p) => `\n - ${p}`).join("")}`,
            },
          ],
          schema: z.object({
            files: z.array(z.object({ path: z.string(), content: z.string() })),
          }),
        });
        files = object.files;
      } catch (error) {
        const rich = getRichError({ action: "generate file contents", args: { paths }, error });
        writer.write({
          id: toolCallId,
          type: "data-generating-files",
          data: { paths, status: "error", error: rich.error },
        });
        return rich.message;
      }

      writer.write({
        id: toolCallId,
        type: "data-generating-files",
        data: { paths: files.map((f) => f.path), status: "uploading" },
      });

      try {
        await sandbox.writeFiles(
          files.map((f) => ({ path: f.path, content: Buffer.from(f.content, "utf8") })),
        );
      } catch (error) {
        const rich = getRichError({ action: "write files", args: { paths }, error });
        writer.write({
          id: toolCallId,
          type: "data-generating-files",
          data: { paths, status: "error", error: rich.error },
        });
        return rich.message;
      }

      writer.write({
        id: toolCallId,
        type: "data-generating-files",
        data: { paths: files.map((f) => f.path), status: "done" },
      });

      return `Generated and uploaded ${files.length} files:\n${files.map((f) => `- ${f.path}`).join("\n")}`;
    },
  });

const runCommand = (writer: Writer) =>
  tool({
    description:
      "Run a command in the sandbox. Each command runs in a fresh shell — no persistent cwd. Use relative or absolute paths instead of cd.",
    inputSchema: z.object({
      sandboxId: z.string(),
      command: z.string(),
      args: z.array(z.string()).optional(),
      sudo: z.boolean().optional(),
      wait: z.boolean(),
    }),
    execute: async ({ sandboxId, command, args = [], sudo, wait }, { toolCallId }) => {
      writer.write({
        id: toolCallId,
        type: "data-run-command",
        data: { sandboxId, command, args, status: "executing" },
      });

      let sandbox: Sandbox;
      try {
        sandbox = await Sandbox.get({ name: sandboxId });
      } catch (error) {
        const rich = getRichError({ action: "get sandbox", args: { sandboxId }, error });
        writer.write({
          id: toolCallId,
          type: "data-run-command",
          data: { sandboxId, command, args, status: "error", error: rich.error },
        });
        return rich.message;
      }

      let cmd;
      try {
        cmd = await sandbox.runCommand({ cmd: command, args, sudo, detached: true });
      } catch (error) {
        const rich = getRichError({ action: "run command", args: { sandboxId, command }, error });
        writer.write({
          id: toolCallId,
          type: "data-run-command",
          data: { sandboxId, command, args, status: "error", error: rich.error },
        });
        return rich.message;
      }

      const commandId = (cmd as unknown as { cmdId: string }).cmdId;

      if (!wait) {
        writer.write({
          id: toolCallId,
          type: "data-run-command",
          data: { sandboxId, commandId, command, args, status: "running" },
        });
        return `Started \`${command} ${args.join(" ")}\` in background (commandId: ${commandId}).`;
      }

      writer.write({
        id: toolCallId,
        type: "data-run-command",
        data: { sandboxId, commandId, command, args, status: "waiting" },
      });

      try {
        const done = await cmd.wait();
        const [stdout, stderr] = await Promise.all([done.stdout(), done.stderr()]);
        writer.write({
          id: toolCallId,
          type: "data-run-command",
          data: {
            sandboxId,
            commandId,
            command,
            args,
            status: "done",
            exitCode: done.exitCode,
          },
        });
        return `\`${command} ${args.join(" ")}\` exited ${done.exitCode}.\nstdout:\n\`\`\`\n${stdout}\n\`\`\`\nstderr:\n\`\`\`\n${stderr}\n\`\`\``;
      } catch (error) {
        const rich = getRichError({ action: "wait for command", args: { sandboxId, commandId }, error });
        writer.write({
          id: toolCallId,
          type: "data-run-command",
          data: { sandboxId, commandId, command, args, status: "error", error: rich.error },
        });
        return rich.message;
      }
    },
  });

const getSandboxURL = (writer: Writer) =>
  tool({
    description: "Get the public preview URL for a running service on a port inside the sandbox.",
    inputSchema: z.object({
      sandboxId: z.string(),
      port: z.number(),
    }),
    execute: async ({ sandboxId, port }, { toolCallId }) => {
      writer.write({ id: toolCallId, type: "data-get-sandbox-url", data: { status: "loading" } });
      const sandbox = await Sandbox.get({ name: sandboxId });
      const url = sandbox.domain(port);
      writer.write({
        id: toolCallId,
        type: "data-get-sandbox-url",
        data: { url, status: "done" },
      });
      return { url };
    },
  });

export function sandboxTools(writer: Writer) {
  return {
    createSandbox: createSandbox(writer),
    generateFiles: generateFiles(writer),
    runCommand: runCommand(writer),
    getSandboxURL: getSandboxURL(writer),
  };
}
