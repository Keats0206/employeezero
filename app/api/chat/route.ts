import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { sandboxTools } from "@/app/lib/agents/sandbox/tools";

export const runtime = "nodejs";
export const maxDuration = 300;

const MODEL = process.env.CHAT_MODEL ?? "anthropic/claude-sonnet-4-6";

const SYSTEM = `You are the operator inside employeezero — an autonomous CEO-in-a-box that builds and runs projects on behalf of its user.

You have access to a Vercel Sandbox where you can create files, run commands, and expose live preview URLs. Use these tools to actually build and ship things, not just describe them.

CRITICAL RULES:
1. NEVER regenerate files that already exist unless the user explicitly asks.
2. If an error occurs, analyze it before retrying — don't blindly regenerate everything.
3. Track what you've done in the conversation; don't repeat operations.
4. Prefer Next.js 16+ for new projects.
5. Config files: next.config.js or next.config.mjs (NEVER next.config.ts).
6. Always make UIs visually sleek, modern, and responsive.
7. To start dev server: \`pnpm run dev\` (port 3000 by default). NEVER \`pnpm run dev -- -p 3000\`.
8. Only one sandbox per conversation — reuse it.
9. Expose port 3000 when creating the sandbox if you'll run a web server.

Be direct and concise. Push back when the user is vague. Take action proactively when intent is clear.`;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  return createUIMessageStreamResponse({
    stream: createUIMessageStream({
      originalMessages: messages,
      execute: async ({ writer }) => {
        const result = streamText({
          model: MODEL,
          system: SYSTEM,
          messages: await convertToModelMessages(messages),
          stopWhen: stepCountIs(20),
          tools: sandboxTools(writer),
          onError: (e) => console.error("chat error", e),
        });
        result.consumeStream();
        writer.merge(result.toUIMessageStream({ sendReasoning: true, sendStart: false }));
      },
    }),
  });
}
