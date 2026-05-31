import { gateway, generateObject } from "ai";
import { z } from "zod";
import { CHEAP_MODEL } from "@/app/lib/cabana-config";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/cabana/ingest — pull an existing site into context for the intake.
// Fetches the homepage plus a couple of obvious linked pages (pricing/about),
// strips them to plain text, and summarizes into a compact brief the Chief of
// Staff uses to propose a crew roster. Fails soft: returns { error } so the
// client can fall back to manual idea entry.

const MAX_TEXT = 8000;
const LINK_HINTS = /(pricing|about|product|features|how-it-works)/i;

// Crude tag-strip → visible text. Good enough to give the model signal; we are
// not trying to render the page, just to read it.
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMeta(html: string): string {
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? "";
  const desc =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1]?.trim() ??
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i)?.[1]?.trim() ??
    "";
  const headings = [...html.matchAll(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi)]
    .map((m) => stripHtml(m[1]))
    .filter(Boolean)
    .slice(0, 12);
  return [title && `Title: ${title}`, desc && `Description: ${desc}`, headings.length && `Headings: ${headings.join(" · ")}`]
    .filter(Boolean)
    .join("\n");
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "CabanaBot/1.0 (+https://cabana.app)" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!type.includes("text/html")) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function sameOriginLinks(html: string, origin: string): string[] {
  const out = new Set<string>();
  for (const m of html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = m[1];
    const text = stripHtml(m[2]);
    if (!LINK_HINTS.test(href) && !LINK_HINTS.test(text)) continue;
    try {
      const abs = new URL(href, origin);
      if (abs.origin === origin) out.add(abs.toString().split("#")[0]);
    } catch {
      /* skip bad href */
    }
  }
  return [...out].slice(0, 2);
}

export async function POST(req: Request) {
  let url: string;
  try {
    ({ url } = await req.json());
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  // Normalize — accept "acme.com" as well as full URLs.
  let target: URL;
  try {
    target = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
  } catch {
    return Response.json({ error: "That doesn't look like a valid URL." }, { status: 400 });
  }

  const home = await fetchPage(target.toString());
  if (!home) {
    return Response.json({ error: "Couldn't reach that site. Try a different URL or start from an idea." }, { status: 200 });
  }

  const pages = [`URL: ${target.toString()}`, extractMeta(home), stripHtml(home).slice(0, MAX_TEXT)];

  // Follow up to 2 obvious sub-pages for richer signal.
  for (const link of sameOriginLinks(home, target.origin)) {
    const sub = await fetchPage(link);
    if (sub) pages.push(`--- ${link} ---`, extractMeta(sub), stripHtml(sub).slice(0, MAX_TEXT / 2));
  }

  const corpus = pages.filter(Boolean).join("\n").slice(0, MAX_TEXT * 2);

  try {
    const { object } = await generateObject({
      model: gateway(CHEAP_MODEL),
      schema: z.object({
        summary: z.string().describe("2-3 sentence plain summary of what this business sells and to whom"),
        offer: z.string().describe("The core product/offer in one line"),
        audience: z.string().describe("Who the site is for — the target customer"),
        inferredIdea: z.string().describe("A one-line internet-business idea statement for this site, like the founder would type"),
      }),
      prompt: `You are reading the scraped content of an existing website. Summarize the real business so a growth team can market it. Do not invent features that aren't supported by the content.\n\nScraped content:\n${corpus}`,
    });
    return Response.json({ ...object, url: target.toString() });
  } catch {
    return Response.json({ error: "Couldn't read that site well enough. Start from an idea instead." }, { status: 200 });
  }
}
