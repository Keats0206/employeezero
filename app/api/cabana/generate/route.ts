import { gateway, streamObject } from "ai";
import { z } from "zod";
import Exa from "exa-js";
import { AGENT_MODELS, estimateCost, type AgentId } from "@/app/lib/cabana-config";

const exa = new Exa(process.env.EXA_API_KEY);

export const runtime = "nodejs";
export const maxDuration = 120;

// ─── Schemas ─────────────────────────────────────────────────────────────────

const ScoutSchema = z.object({
  pains: z.array(z.string()).min(2).max(4).describe("3 specific customer pain statements in the customer's own voice"),
  channels: z.array(z.string()).min(2).max(4).describe("3 specific communities or platforms where buyers hang out"),
  competitors: z.array(z.string()).min(2).max(3).describe("2 existing solutions or alternatives buyers currently use"),
  keywords: z.array(z.string()).min(3).max(5).describe("4 search terms this customer actually types"),
});

const StrategistSchema = z.object({
  businessName: z.string().describe("Short catchy business name, 2-3 words max"),
  offer: z.string().describe("The specific first offer — concrete format like '$X for Y in Z days'"),
  price: z.string().describe("Price string e.g. '$29 one-time'"),
  channel: z.string().describe("The single best channel to find first buyers"),
  goal: z.string().describe("First milestone e.g. '3 paid orders in 7 days'"),
  icp: z.string().describe("One sentence — the exact target customer"),
  firstPriority: z.string().describe("The single highest-leverage action to take this week"),
});

const BuilderSchema = z.object({
  headline: z.string().describe("Hero headline — outcome-focused, under 8 words"),
  subheadline: z.string().describe("Supporting line, under 15 words"),
  cta: z.string().describe("CTA button text"),
  pain_hook: z.string().describe("One sentence that names the pain this page addresses"),
});

const SellerSchema = z.object({
  messages: z.array(z.string()).min(2).max(4).describe("3 short outreach messages — conversational, not salesy, under 2 sentences each"),
});

const CreatorSchema = z.object({
  hooks: z.array(z.string()).min(2).max(4).describe("3 scroll-stopping content hooks in quoted title format"),
  script_opener: z.string().describe("Opening line for a 30-second video script"),
});

const AnalystSchema = z.object({
  recommended_path: z.string().describe("Fastest path to first revenue signal — 1-2 sentences, crew does the work"),
  next_play: z.string().describe("Specific next action the crew takes in the next 24 hours"),
  signals_to_watch: z.array(z.string()).min(2).max(4).describe("3 specific signals that mean this is working"),
  verdict: z.enum(["launch", "validate_first", "pivot"]),
});

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const { idea } = await req.json();
  if (!idea?.trim()) return Response.json({ error: "idea required" }, { status: 400 });

  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(enc.encode("data: " + JSON.stringify(obj) + "\n\n"));

      // Render a partial object into readable streaming text for the card body.
      function previewText(partial: Record<string, unknown>): string {
        const lines: string[] = [];
        for (const [, value] of Object.entries(partial)) {
          if (value == null) continue;
          if (Array.isArray(value)) {
            for (const v of value) if (v != null) lines.push(`• ${String(v)}`);
          } else {
            lines.push(String(value));
          }
        }
        return lines.join("\n");
      }

      // Per-run accounting, summed across all agents for the complete event.
      const totals = { inputTokens: 0, outputTokens: 0, cost: 0, ms: 0 };

      // Run one agent with REAL token streaming. Emits progress (live text) then
      // done (+stats, +usage/cost/time). Uses the model configured for its role.
      async function runAgent<T extends Record<string, unknown>>(
        agentId: AgentId,
        schema: z.ZodType<T>,
        prompt: string,
        stats: (o: T) => { label: string; value: string }[],
      ): Promise<T> {
        const model = AGENT_MODELS[agentId];
        const t0 = Date.now();
        send({ agent: agentId, type: "start", model });
        try {
          const { partialObjectStream, object, usage } = streamObject({
            model: gateway(model),
            schema,
            prompt,
          });
          for await (const partial of partialObjectStream) {
            send({ agent: agentId, type: "progress", text: previewText(partial as Record<string, unknown>) });
          }
          const final = await object;
          const u = await usage;
          const inputTokens = u?.inputTokens ?? 0;
          const outputTokens = u?.outputTokens ?? 0;
          const cost = estimateCost(model, inputTokens, outputTokens);
          const ms = Date.now() - t0;

          totals.inputTokens += inputTokens;
          totals.outputTokens += outputTokens;
          totals.cost += cost;
          totals.ms += ms; // wall time per agent; note parallel agents overlap

          send({
            agent: agentId, type: "done", output: final, stats: stats(final),
            model, usage: { inputTokens, outputTokens }, cost, ms,
          });
          return final;
        } catch (err) {
          const details = err && typeof err === "object" ? err as {
            text?: string;
            finishReason?: string;
            usage?: unknown;
            cause?: unknown;
            message?: string;
          } : {};

          const repaired = repairAgentOutput(agentId, details.text, schema);
          if (repaired) {
            const ms = Date.now() - t0;
            send({
              agent: agentId,
              type: "done",
              output: repaired,
              stats: stats(repaired),
              model,
              usage: { inputTokens: 0, outputTokens: 0 },
              cost: 0,
              ms,
              repaired: true,
            });
            return repaired;
          }

          send({
            agent: agentId,
            type: "error",
            model,
            message: err instanceof Error ? err.message : String(err),
            raw: details.text,
            finishReason: details.finishReason,
            usage: details.usage,
            cause: details.cause instanceof Error ? details.cause.message : undefined,
          });
          throw err;
        }
      }

      function repairAgentOutput<T extends Record<string, unknown>>(
        agentId: AgentId,
        raw: string | undefined,
        schema: z.ZodType<T>,
      ): T | null {
        if (!raw) return null;
        try {
          const parsed = JSON.parse(raw);
          const wrapped =
            agentId === "seller" && Array.isArray(parsed) ? { messages: parsed } :
            agentId === "creator" && Array.isArray(parsed) ? { hooks: parsed, script_opener: parsed[0] ?? "" } :
            null;

          if (!wrapped) return null;
          const result = schema.safeParse(wrapped);
          return result.success ? result.data : null;
        } catch {
          return null;
        }
      }

      // ── Exa helpers ───────────────────────────────────────────────────────────
      function parseExaSources(blocks: string[]): { title: string; url: string; snippet: string }[] {
        const sources: { title: string; url: string; snippet: string }[] = [];
        for (const block of blocks) {
          for (const line of block.split("\n\n")) {
            const match = line.match(/^\[(.+?)\]\((https?:\/\/[^\)]+)\)\n?([\s\S]*)?$/);
            if (match) {
              sources.push({ title: match[1], url: match[2], snippet: (match[3] ?? "").trim().slice(0, 200) });
            }
          }
        }
        return sources;
      }

      async function exaSearch(query: string, numResults = 5): Promise<string> {
        try {
          const res = await exa.searchAndContents(query, {
            numResults,
            type: "neural",
            useAutoprompt: true,
            text: { maxCharacters: 400 },
          });
          return res.results
            .map(r => `[${r.title}](${r.url})\n${r.text ?? ""}`)
            .join("\n\n");
        } catch {
          return "";
        }
      }

      try {
        const [competitorResults, communityResults, demandResults] = await Promise.all([
          exaSearch(`${idea} competitors alternatives`),
          exaSearch(`${idea} forum community reddit complaints problems`),
          exaSearch(`${idea} customer pain points who buys`),
        ]);
        const exaContext = [
          competitorResults && `## Competitor landscape\n${competitorResults}`,
          communityResults && `## Community discussions\n${communityResults}`,
          demandResults && `## Demand signals\n${demandResults}`,
        ].filter(Boolean).join("\n\n");

        // Surface the raw sources to the client so the user can see them.
        send({ agent: "scout", type: "sources", sources: parseExaSources([competitorResults, communityResults, demandResults]) });

        // ── Scout ─────────────────────────────────────────────────────────────
        const scout = await runAgent("scout", ScoutSchema,
          `You are Scout — a market researcher finding the real pain behind this business idea.

Idea: "${idea}"

Here is real web research pulled before this run — use it as primary source material:

${exaContext}

Based on the above real sources, identify the specific customer pain, where buyers gather, what alternatives exist, and what they search for. Quote or paraphrase real findings. Write pain statements in the customer's actual voice.`,
          o => [
            { label: "Pain clusters", value: String(o.pains.length) },
            { label: "Channels", value: String(o.channels.length) },
            { label: "Keywords", value: String(o.keywords.length) },
          ],
        );

        // ── Strategist ────────────────────────────────────────────────────────
        const s = await runAgent("strategist", StrategistSchema,
          `You are Strategist — turning a rough idea into the sharpest possible first offer.

Idea: "${idea}"

Market research:
- Customer pains: ${scout.pains.join(" | ")}
- Where buyers hang out: ${scout.channels.join(", ")}
- Current alternatives: ${scout.competitors.join(", ")}

Design the simplest possible first offer to get 3 paying customers this week. Digital delivery preferred. No fulfillment complexity. Price it below the anxiety threshold.`,
          o => [
            { label: "Price", value: o.price },
            { label: "Goal", value: o.goal },
          ],
        );

        const context = `Idea: "${idea}"
Offer: ${s.offer} (${s.price})
Target customer: ${s.icp}
Channel: ${s.channel}
Customer pains: ${scout.pains.join(" | ")}`;

        // ── Builder + Seller + Creator (parallel, all streaming live) ──────────
        const [builder, seller, creator] = await Promise.all([
          runAgent("builder", BuilderSchema,
            `You are Builder — writing landing page copy that converts.

${context}

Write a hero headline (outcome-focused, under 8 words), a supporting subheadline, a CTA button, and a pain hook sentence. Be direct. No fluff.`,
            o => [
              { label: "Headline", value: `${o.headline.length} chars` },
              { label: "CTA", value: o.cta },
            ],
          ),
          runAgent("seller", SellerSchema,
            `You are Seller — writing outreach that feels human, not like a pitch.

${context}

Write 3 short outreach messages for people in ${s.channel}. Each under 2 sentences. Sound like a real person who made something useful, not a marketer. No "I hope this finds you well."`,
            o => [
              { label: "Messages", value: String(o.messages.length) },
              { label: "Channel", value: s.channel },
            ],
          ),
          runAgent("creator", CreatorSchema,
            `You are Creator — writing content hooks that stop the scroll.

${context}
Pains: ${scout.pains.join(" | ")}

Write 3 hooks in quoted title format — use curiosity gaps, pattern interrupts, or bold claims. Also write one punchy opening line for a 30-second video.`,
            o => [
              { label: "Hooks", value: String(o.hooks.length) },
              { label: "Script", value: "1 opener" },
            ],
          ),
        ]);

        // ── Analyst ───────────────────────────────────────────────────────────
        const analyst = await runAgent("analyst", AnalystSchema,
          `You are Analyst — the chief of staff deciding the fastest path to first revenue.

Idea: "${idea}"
Offer: ${s.offer}
Channel: ${s.channel}
First priority from Strategist: ${s.firstPriority}
Goal: ${s.goal}

The crew handles all execution — don't say "you should" or "manually". Say what the crew will do. Be specific. What's the fastest path to a revenue signal? What does the crew do in the next 24 hours?`,
          o => [
            { label: "Verdict", value: o.verdict },
            { label: "Signals", value: String(o.signals_to_watch.length) },
          ],
        );

        // ── Complete ──────────────────────────────────────────────────────────
        send({
          type: "complete",
          outputs: { scout, strategist: s, builder, seller, creator, analyst },
          totals: {
            inputTokens: totals.inputTokens,
            outputTokens: totals.outputTokens,
            totalTokens: totals.inputTokens + totals.outputTokens,
            cost: totals.cost,
          },
        });

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
