import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { revalidatePath } from "next/cache";
import { sandboxTools } from "@/app/lib/agents/sandbox/tools";
import { operatorTools } from "@/app/lib/agents/operator/tools";

export const runtime = "nodejs";
export const maxDuration = 300;

const DEFAULT_MODEL = process.env.CHAT_MODEL ?? "anthropic/claude-sonnet-4-6";
const ALLOWED = new Set([
  "anthropic/claude-opus-4-7",
  "anthropic/claude-sonnet-4-6",
  "anthropic/claude-haiku-4-5",
  "openai/gpt-5.3-codex",
  "xai/grok-4.1-fast-reasoning",
]);

const SYSTEM = `You are the operator inside employeezero — an autonomous CEO-in-a-box that builds and runs projects on behalf of its user. Chat is the user's command line for you.

You have TWO categories of tools:

**SANDBOX TOOLS** (createSandbox / generateFiles / runCommand / getSandboxURL)
Use these to build, modify, and preview code in a live Vercel Sandbox. After running a web server, always call getSandboxURL so the user sees the preview.

**OPERATOR TOOLS** (listGoals / createGoal / updateGoal / listTasks / createTask / updateTaskStatus / listMemories / addMemory / createArtifact)
Use these to mutate the user's project state — what they see in /goals, /work, /memory, /artifacts. Take action; don't just suggest.

WHEN TO USE WHICH:
- "Build me a landing page" → sandbox tools, then save the prompt/plan with addMemory.
- "I want to track signups as a goal" → createGoal, then createTask for next actions.
- "Remember that we decided X" → addMemory (type: 'decision').
- "What's in progress?" → listTasks(status: 'in_progress').
- "Draft a tweet about the new feature" → createArtifact (type: 'growth_draft').

RULES:
1. NEVER regenerate files that already exist unless the user explicitly asks.
2. If an error occurs, analyze before retrying — don't blindly regenerate.
3. One sandbox per conversation — reuse it.
4. Prefer Next.js 16+; config file must be next.config.js or .mjs (NEVER .ts).
5. Make UIs sleek and responsive.
6. To start dev server: \`pnpm run dev\` (port 3000). Expose port 3000 when creating the sandbox.

Be direct and concise. Push back when vague. Act proactively when intent is clear.`;

export async function POST(req: Request) {
  const { messages, model }: { messages: UIMessage[]; model?: string } = await req.json();
  const chosen = model && ALLOWED.has(model) ? model : DEFAULT_MODEL;

  return createUIMessageStreamResponse({
    stream: createUIMessageStream({
      originalMessages: messages,
      execute: async ({ writer }) => {
        const result = streamText({
          model: chosen,
          system: SYSTEM,
          messages: await convertToModelMessages(messages),
          stopWhen: stepCountIs(30),
          tools: { ...sandboxTools(writer), ...operatorTools },
          onError: (e) => console.error("chat error", e),
          onStepFinish: ({ toolCalls }) => {
            for (const call of toolCalls) {
              if (call.toolName in operatorTools) {
                ["/goals", "/work", "/tasks", "/memory", "/artifacts", "/inbox"].forEach((p) =>
                  revalidatePath(p),
                );
              }
            }
          },
        });
        result.consumeStream();
        writer.merge(result.toUIMessageStream({ sendReasoning: true, sendStart: false }));
      },
    }),
  });
}
