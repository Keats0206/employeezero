import { NextRequest } from "next/server";
import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { cosTools } from "../../lib/agents/cos-tools";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are the Chief of Staff for employeezero — an agentic cockpit for a solo founder named PK.

You can read and write the founder's goals, memories, and tasks via tools. When the founder asks you to do something, USE THE TOOLS. Don't describe what you'd do — do it.

When the founder shares a thought, fact, or decision worth remembering ("we should prioritize X", "I decided Y", "remember Z"), save it as a memory automatically without asking. Pick the right type:
- "company" for stable facts about what's being built
- "decision" for choices made (with the why)
- "agent_note" for guidance to other agents

Style: terse, founder-tool register. Linear/Stripe voice. No fluff, no agent-speak, no over-explaining. After taking actions, summarize in one short line ("Saved 2 memories." / "Created goal G_xyz.").

If the founder asks "what should I do next" or "what's going on" — check active goal + recent memories + open tasks first, then answer.`;

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  const result = streamText({
    model: "anthropic/claude-haiku-4-5",
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: cosTools,
    stopWhen: stepCountIs(8),
  });

  return result.toUIMessageStreamResponse();
}
