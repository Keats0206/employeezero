import Exa from "exa-js";
import { generateObject } from "ai";
import { z } from "zod";

/**
 * User Research skill — a reusable primitive used by:
 *  - the CoS chat during onboarding (validate ICP hunches in real time)
 *  - the canvas (refresh assumption confidence + sources)
 *  - the Research Agent (scheduled or queued tasks in Mission Control)
 *
 * Input: a question + optional audience/segment.
 * Output: a Perplexity-style { synthesis, sources, confidence } block.
 * Sources use the same shape rendered by app/canvas/page.tsx so findings
 * can flow directly into canvas assumptions without translation.
 */

export const ResearchSourceSchema = z.object({
  label: z.string(),
  detail: z.string(),
  href: z.string().optional(),
  date: z.string(),
});
export type ResearchSource = z.infer<typeof ResearchSourceSchema>;

export const ResearchResultSchema = z.object({
  question: z.string(),
  synthesis: z
    .string()
    .describe(
      "A Perplexity-style paragraph synthesizing the findings. Use inline [1][2] citation markers matching the source order."
    ),
  confidence: z
    .number()
    .min(0)
    .max(100)
    .describe(
      "0–100 confidence that the synthesis is well-supported. Lower when sources thin/contradictory."
    ),
  sources: z.array(ResearchSourceSchema),
  recommendation: z
    .string()
    .optional()
    .describe("Optional next-step recommendation grounded in the findings."),
});
export type ResearchResult = z.infer<typeof ResearchResultSchema>;

export interface ResearchInput {
  question: string;
  audience?: string;
  /** Where to look. Defaults to a mix of web + community sources. */
  channels?: Array<"web" | "reddit" | "hackernews" | "twitter">;
  /** Hard cap on raw results pulled before synthesis. Defaults to 12. */
  maxResults?: number;
}

const DEFAULT_CHANNELS: NonNullable<ResearchInput["channels"]> = [
  "web",
  "reddit",
  "hackernews",
];

const CHANNEL_DOMAINS: Record<string, string[] | undefined> = {
  reddit: ["reddit.com"],
  hackernews: ["news.ycombinator.com"],
  twitter: ["twitter.com", "x.com"],
  web: undefined,
};

interface ExaResult {
  title?: string;
  url: string;
  text?: string;
  publishedDate?: string;
  author?: string;
}

function getClient() {
  const key = process.env.EXA_API_KEY;
  if (!key) throw new Error("EXA_API_KEY is not set");
  return new Exa(key);
}

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function truncate(s: string, n: number): string {
  if (!s) return "";
  return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…";
}

async function searchChannel(
  exa: ReturnType<typeof getClient>,
  channel: NonNullable<ResearchInput["channels"]>[number],
  query: string,
  numResults: number
): Promise<ExaResult[]> {
  const includeDomains = CHANNEL_DOMAINS[channel];
  const res = await exa.searchAndContents(query, {
    numResults,
    type: "auto",
    text: { maxCharacters: 800 },
    ...(includeDomains ? { includeDomains } : {}),
  });
  // exa-js returns { results: [...] }
  // We narrow loosely — Exa's typings vary across versions.
  const results = (res as unknown as { results: ExaResult[] }).results ?? [];
  return results;
}

export async function runUserResearch(
  input: ResearchInput
): Promise<ResearchResult> {
  const channels = input.channels ?? DEFAULT_CHANNELS;
  const maxResults = input.maxResults ?? 12;
  const perChannel = Math.max(2, Math.ceil(maxResults / channels.length));

  const query = input.audience
    ? `${input.question} — audience: ${input.audience}`
    : input.question;

  const exa = getClient();
  const settled = await Promise.allSettled(
    channels.map((c) => searchChannel(exa, c, query, perChannel))
  );

  const raw: ExaResult[] = [];
  for (const s of settled) if (s.status === "fulfilled") raw.push(...s.value);

  // Dedup by URL, cap to maxResults, prefer items with text.
  const seen = new Set<string>();
  const deduped = raw
    .filter((r) => {
      if (!r.url || seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    })
    .sort((a, b) => (b.text?.length ?? 0) - (a.text?.length ?? 0))
    .slice(0, maxResults);

  if (deduped.length === 0) {
    return {
      question: input.question,
      synthesis:
        "No usable web results came back for this query. Try narrowing the audience or rephrasing in the language the audience would actually use.",
      confidence: 0,
      sources: [],
    };
  }

  const sourcesForModel = deduped.map((r, i) => ({
    n: i + 1,
    title: r.title ?? r.url,
    url: r.url,
    date: r.publishedDate,
    snippet: truncate(r.text ?? "", 600),
  }));

  const { object } = await generateObject({
    model: "anthropic/claude-sonnet-4-6",
    schema: ResearchResultSchema,
    system: `You are a user-research analyst. You read raw search results and produce a tight, evidence-backed synthesis for a startup founder.

Rules:
- Cite EVERY claim inline with [n] markers that map to the numbered sources you were given.
- Prefer quotes and concrete numbers over generalities.
- If sources disagree, say so — do not paper over it.
- Confidence reflects how well the sources support the synthesis. Thin/contradictory sources → low confidence.
- Keep synthesis to 3–5 sentences. Founder-tool register: terse, no fluff, no agent-speak.
- The "sources" array you return must mirror the numbered sources in order, using:
    label: page/post title
    detail: 1-sentence snippet of why it matters
    href: the URL
    date: short date like "May 24" (use "—" if unknown)
- If a clear next step exists, set "recommendation".`,
    prompt: `Question: ${input.question}
${input.audience ? `Audience: ${input.audience}\n` : ""}
Numbered sources (cite as [n]):
${sourcesForModel
  .map(
    (s) =>
      `[${s.n}] ${s.title}\nURL: ${s.url}\nDate: ${s.date ?? "unknown"}\nSnippet: ${s.snippet}`
  )
  .join("\n\n")}

Produce the synthesis with inline [n] citations, a confidence score, the sources array, and (if warranted) a recommendation.`,
  });

  // Defensive: ensure each returned source carries an href when available.
  const sources = object.sources.map((s, i) => ({
    ...s,
    href: s.href ?? sourcesForModel[i]?.url,
    date: s.date || fmtDate(sourcesForModel[i]?.date),
  }));

  return { ...object, sources };
}
