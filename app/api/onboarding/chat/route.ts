import { streamText, tool, stepCountIs, convertToModelMessages, type UIMessage } from "ai";
import { z } from "zod";
import { runUserResearch } from "../../../lib/skills/user-research";

export const runtime = "nodejs";
export const maxDuration = 120;

const SYSTEM_PROMPT = `You are the Chief of Staff agent for employeezero — an AI operating system for solo founders.

You are talking to a founder on their first day. Your job in this conversation:
1. Quickly understand what they are building, who it's for, the first concrete thing that needs to ship, and how they want to work with you.
2. Use the user_research tool to validate ICP hunches with REAL evidence (search the web, Reddit, HN). Do this early and visibly — it's how the founder learns the system actually does research.
3. Propose a single first mission: "Nail your ICP." Explain why ICP is always the right v1 mission, then break it into 3–5 concrete tasks the agents will run.
4. End with a clear ask: "Approve this mission and I'll start the first task." Wait for the founder's reply.

Style: terse, founder-tool register. Use the founder's own words where possible. No fluff, no agent-speak, no bulleted lectures. Think like Sam Altman writing a one-on-one note, not a SaaS onboarding flow.

When you call user_research, pick a specific question (e.g. "Where do solo founders building AI tools complain about not knowing their ICP?") and a precise audience. Cite findings inline by referencing the source titles when you discuss them with the founder.

The first mission you propose should always be ICP-focused, structured as:
  - Mission: Nail your ICP in 7 days
  - Why: Without a real ICP, every other agent's output is generic.
  - Tasks (3-5): each one concrete, owned by a named agent (Research Agent, Growth Agent, etc.), with a clear deliverable.

Do not propose the mission until you have asked at least one clarifying question AND run user_research at least once.`;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: "anthropic/claude-sonnet-4-6",
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(8),
    tools: {
      user_research: tool({
        description:
          "Run a real user-research query against the web, Reddit, and Hacker News via Exa. Returns a Perplexity-style synthesis with citations and a confidence score. Use this to validate ICP hunches, find where the audience hangs out, or check whether a problem is real.",
        inputSchema: z.object({
          question: z
            .string()
            .describe(
              "The specific research question. Phrase it the way the audience would phrase it, not in marketing terms."
            ),
          audience: z
            .string()
            .optional()
            .describe(
              "Who the question is about — role, company shape, situation. Be specific."
            ),
          channels: z
            .array(z.enum(["web", "reddit", "hackernews", "twitter"]))
            .optional()
            .describe(
              "Which channels to search. Defaults to web + reddit + hackernews."
            ),
        }),
        execute: async ({ question, audience, channels }) => {
          return runUserResearch({ question, audience, channels });
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
