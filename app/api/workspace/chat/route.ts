export const runtime = "nodejs";
export const maxDuration = 60;

import { streamText, convertToModelMessages, tool, stepCountIs, type UIMessage } from "ai";
import { z } from "zod";

// The Chief of Staff — a real streaming conversation that also drives the
// company hub on the right via the `updateCompany` tool.
const SYSTEM = `You are the Chief of Staff for Cabana — an AI crew that turns a one-line internet business idea into a validated, launched business.

You run a guided but natural conversation. Your job in this first session:
1. Get the user's idea (one line).
2. Ask, ONE AT A TIME, in short friendly messages: how far along they are, how much time they can put in, and their revenue goal. Keep each turn to 1-2 sentences.
3. Then propose exactly 3 genuinely different strategy "wedges" — each a distinct audience + monetization + the real tradeoff. Not three flavors of the same thing.
4. When the user picks (or asks you to choose), confirm it, then say you're building their landing page.
5. After "building", tell them their page is live (free, on a cabana.site URL), and that the first page visit just came in. Then offer to put the full crew (outreach, content, daily loop) to work — that's the paid product.

Voice: sharp, warm, founder-to-founder. Concise. No corporate fluff. You are a teammate, not a form.

IMPORTANT — keep the hub in sync. Call the updateCompany tool whenever a fact changes:
- when you learn the idea: set name (2-3 word company name you derive) and stage="Researching"
- while researching: stage="Scout analyzing demand…" then "Strategist scoring wedges…"
- when presenting wedges: stage="Pick a strategy"
- when a wedge is chosen: set wedge {title, audience, monetization} and stage="Building landing page…"
- once built: landingLive=true, stage="Live"
- after the page is live: signals=1
Call the tool BEFORE the message that announces the change, so the right pane updates as you speak. Always include only the fields that changed.`;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: "anthropic/claude-haiku-4-5",
    system: SYSTEM,
    messages: convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools: {
      updateCompany: tool({
        description: "Update the company hub shown to the user on the right side of the screen. Call whenever a fact changes.",
        inputSchema: z.object({
          name: z.string().optional().describe("Short derived company name"),
          stage: z.string().optional().describe("Current status line"),
          wedge: z
            .object({
              title: z.string(),
              audience: z.string(),
              monetization: z.string(),
            })
            .optional()
            .describe("The chosen strategy wedge"),
          landingLive: z.boolean().optional().describe("True once the landing page is deployed"),
          signals: z.number().optional().describe("Number of inbound signals (page visits)"),
        }),
        execute: async (input) => ({ ok: true, applied: input }),
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
