import { gateway, streamObject } from "ai";
import Exa from "exa-js";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.STRATEGIST_MODEL ?? "glm-4.5";

const BriefSchema = z.object({
  wedge: z.object({
    user: z.string().describe("The specific user we're targeting first"),
    pain: z.string().describe("The painful job-to-be-done"),
    summary: z.string().describe("One crisp sentence combining user + pain"),
  }),
  icp: z.string().describe("Concrete buyer profile (role, company stage, size)"),
  monetization: z.string().describe("How revenue flows — pricing + mechanism"),
  firstPriority: z.string().describe("The single highest-leverage validation action this week"),
  reasoning: z.string().describe("1-2 sentences on why this wedge over alternatives"),
});

export type StrategistBrief = z.infer<typeof BriefSchema>;
export type StrategistSource = { title: string; url: string; snippet?: string };

type PostBody = {
  idea: string;
  priorBrief?: StrategistBrief | null;
  instruction?: string;
};

export async function POST(req: Request) {
  const { idea, priorBrief, instruction }: PostBody = await req.json();
  if (!idea?.trim()) {
    return Response.json({ error: "idea required" }, { status: 400 });
  }

  const isRefinement = Boolean(priorBrief && instruction?.trim());

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(enc.encode(JSON.stringify(obj) + "\n"));

      try {
        send({
          type: "phase",
          value: "searching",
          label: isRefinement
            ? "Re-checking market signal via Exa…"
            : "Calling Exa for real market signal…",
        });

        const query = isRefinement
          ? `market landscape and demand signals for: ${idea}. specifically: ${instruction}`
          : `market landscape, competitors, and recent demand signals for: ${idea}`;

        const exa = new Exa(process.env.EXA_API_KEY);
        const search = await exa.searchAndContents(query, {
          numResults: 6,
          type: "auto",
          text: { maxCharacters: 1200 },
        });
        const sources: StrategistSource[] = search.results.map((r) => ({
          title: r.title ?? r.url,
          url: r.url,
          snippet: (r.text ?? "").slice(0, 400),
        }));

        send({ type: "sources", value: sources });
        send({
          type: "phase",
          value: "drafting",
          label: isRefinement
            ? `Refining brief with ${MODEL}…`
            : `Streaming brief from ${MODEL}…`,
        });

        const sourcesBlock = sources
          .map((s, i) => `[${i + 1}] ${s.title}\n${s.url}\n${s.snippet ?? ""}`)
          .join("\n\n");

        const refinementBlock = isRefinement
          ? `

You previously produced this brief:
${JSON.stringify(priorBrief, null, 2)}

The founder is now asking you to refine it with this instruction:
"${instruction}"

Produce a revised brief. Keep what still holds. Change only what the instruction calls for, and the downstream implications. Do not regress to vagueness.`
          : "";

        const result = streamObject({
          model: gateway(MODEL),
          schema: BriefSchema,
          system: `You are the Strategist on employeezero — an AI founding team that operates like a YC startup. Your job is to turn a founder's idea into a sharp, opinionated business brief grounded in real market signal.

Rules:
- Pick ONE wedge. The sharpest user × pain, not a list.
- Treat the brief as an experiment thesis, not a build plan.
- firstPriority must be a customer-validation action, sales test, interview sprint, smoke test, or concierge test.
- Do not recommend building product until the riskiest assumption has a cheap validation path.
- Be concrete: name roles, company stages, dollar amounts. No hedging.
- Prefer brief, declarative sentences. No filler.
- Use the sources to ground claims, but don't list them — they're shown separately.`,
          prompt: `Founder idea:
"${idea}"

Real-world signal from web search:
${sourcesBlock}${refinementBlock}

Produce the business brief.`,
        });

        for await (const partial of result.partialObjectStream) {
          send({ type: "partial", value: partial });
        }

        const final = await result.object;
        send({ type: "done", value: final });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        send({ type: "error", value: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
