import { gateway, generateObject } from "ai";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 120;

const MODEL = "deepseek/deepseek-v3.2";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const ScoutSchema = z.object({
  pains: z.array(z.string()).length(3).describe("3 specific customer pain statements in the customer's own voice"),
  channels: z.array(z.string()).length(3).describe("3 specific communities or platforms where buyers hang out"),
  competitors: z.array(z.string()).length(2).describe("2 existing solutions or alternatives buyers currently use"),
  keywords: z.array(z.string()).length(4).describe("4 search terms this customer actually types"),
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
  messages: z.array(z.string()).length(3).describe("3 short outreach messages — conversational, not salesy, under 2 sentences each"),
});

const CreatorSchema = z.object({
  hooks: z.array(z.string()).length(3).describe("3 scroll-stopping content hooks in quoted title format"),
  script_opener: z.string().describe("Opening line for a 30-second video script"),
});

const AnalystSchema = z.object({
  recommended_path: z.string().describe("Fastest path to first revenue signal — 1-2 sentences, crew does the work"),
  next_play: z.string().describe("Specific next action the crew takes in the next 24 hours"),
  signals_to_watch: z.array(z.string()).length(3).describe("3 specific signals that mean this is working"),
  verdict: z.enum(["launch", "validate_first", "pivot"]),
});

// ─── Progress lines per agent ─────────────────────────────────────────────────

const PROGRESS: Record<string, string[]> = {
  scout: [
    "Scanning communities for pain patterns…",
    "Identifying where buyers are already gathering…",
    "Extracting recurring frustrations…",
    "Mapping competitor landscape…",
    "Pain clusters identified.",
  ],
  strategist: [
    "Reading Scout's findings…",
    "Designing the simplest possible first offer…",
    "Stress-testing pricing against the pain…",
    "Identifying the highest-leverage channel…",
    "Offer locked.",
  ],
  builder: [
    "Reading Strategist's offer brief…",
    "Drafting outcome-first headline…",
    "Writing pain hook and subheadline…",
    "Generating CTA copy…",
    "Landing page draft ready.",
  ],
  seller: [
    "Building target customer profile…",
    "Identifying best outreach angles…",
    "Drafting message 1 — conversational, no pitch…",
    "Drafting messages 2 and 3…",
    "Outreach batch ready.",
  ],
  creator: [
    "Scanning pain clusters for hook angles…",
    "Generating pattern-interrupt hooks…",
    "Writing hooks 2 and 3…",
    "Drafting video script opener…",
    "Content batch ready.",
  ],
  analyst: [
    "Reviewing all agent outputs…",
    "Assessing market signal strength…",
    "Calculating fastest path to revenue…",
    "Identifying blockers…",
    "Verdict ready.",
  ],
};

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const { idea } = await req.json();
  if (!idea?.trim()) return Response.json({ error: "idea required" }, { status: 400 });

  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(enc.encode("data: " + JSON.stringify(obj) + "\n\n"));

      const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

      async function streamProgress(agentId: string) {
        for (const line of PROGRESS[agentId] ?? []) {
          send({ agent: agentId, type: "progress", text: line });
          await sleep(500 + Math.random() * 400);
        }
      }

      try {
        // ── Scout ─────────────────────────────────────────────────────────────
        const scoutProgress = streamProgress("scout");
        const [scoutResult] = await Promise.all([
          generateObject({
            model: gateway(MODEL),
            schema: ScoutSchema,
            prompt: `You are Scout — a market researcher finding the real pain behind this business idea.

Idea: "${idea}"

Find the real customer pain, where buyers gather, what alternatives exist, and what they search for. Be specific and grounded. Write pain statements in the customer's actual voice.`,
          }),
          scoutProgress,
        ]);
        send({ agent: "scout", type: "done", output: scoutResult.object });

        // ── Strategist ────────────────────────────────────────────────────────
        const strategistProgress = streamProgress("strategist");
        const [strategistResult] = await Promise.all([
          generateObject({
            model: gateway(MODEL),
            schema: StrategistSchema,
            prompt: `You are Strategist — turning a rough idea into the sharpest possible first offer.

Idea: "${idea}"

Market research:
- Customer pains: ${scoutResult.object.pains.join(" | ")}
- Where buyers hang out: ${scoutResult.object.channels.join(", ")}
- Current alternatives: ${scoutResult.object.competitors.join(", ")}

Design the simplest possible first offer to get 3 paying customers this week. Digital delivery preferred. No fulfillment complexity. Price it below the anxiety threshold.`,
          }),
          strategistProgress,
        ]);
        send({ agent: "strategist", type: "done", output: strategistResult.object });

        const s = strategistResult.object;
        const context = `Idea: "${idea}"
Offer: ${s.offer} (${s.price})
Target customer: ${s.icp}
Channel: ${s.channel}
Customer pains: ${scoutResult.object.pains.join(" | ")}`;

        // ── Builder + Seller + Creator (parallel) ─────────────────────────────
        const [builderProgress, sellerProgress, creatorProgress] = [
          streamProgress("builder"),
          streamProgress("seller"),
          streamProgress("creator"),
        ];

        const [builderResult, sellerResult, creatorResult] = await Promise.all([
          generateObject({
            model: gateway(MODEL),
            schema: BuilderSchema,
            prompt: `You are Builder — writing landing page copy that converts.

${context}

Write a hero headline (outcome-focused, under 8 words), a supporting subheadline, a CTA button, and a pain hook sentence. Be direct. No fluff.`,
          }),
          generateObject({
            model: gateway(MODEL),
            schema: SellerSchema,
            prompt: `You are Seller — writing outreach that feels human, not like a pitch.

${context}

Write 3 short outreach messages for people in ${s.channel}. Each under 2 sentences. Sound like a real person who made something useful, not a marketer. No "I hope this finds you well."`,
          }),
          generateObject({
            model: gateway(MODEL),
            schema: CreatorSchema,
            prompt: `You are Creator — writing content hooks that stop the scroll.

${context}
Pains: ${scoutResult.object.pains.join(" | ")}

Write 3 hooks in quoted title format — use curiosity gaps, pattern interrupts, or bold claims. Also write one punchy opening line for a 30-second video.`,
          }),
          builderProgress,
          sellerProgress,
          creatorProgress,
        ]);

        send({ agent: "builder", type: "done", output: builderResult.object });
        send({ agent: "seller", type: "done", output: sellerResult.object });
        send({ agent: "creator", type: "done", output: creatorResult.object });

        // ── Analyst ───────────────────────────────────────────────────────────
        const analystProgress = streamProgress("analyst");
        const [analystResult] = await Promise.all([
          generateObject({
            model: gateway(MODEL),
            schema: AnalystSchema,
            prompt: `You are Analyst — the chief of staff deciding the fastest path to first revenue.

Idea: "${idea}"
Offer: ${s.offer}
Channel: ${s.channel}
First priority from Strategist: ${s.firstPriority}
Goal: ${s.goal}

The crew handles all execution — don't say "you should" or "manually". Say what the crew will do. Be specific. What's the fastest path to a revenue signal? What does the crew do in the next 24 hours?`,
          }),
          analystProgress,
        ]);
        send({ agent: "analyst", type: "done", output: analystResult.object });

        // ── Complete ──────────────────────────────────────────────────────────
        send({
          type: "complete",
          outputs: {
            scout:      scoutResult.object,
            strategist: strategistResult.object,
            builder:    builderResult.object,
            seller:     sellerResult.object,
            creator:    creatorResult.object,
            analyst:    analystResult.object,
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
