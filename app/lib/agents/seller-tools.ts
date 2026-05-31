// Seller — real outreach, not just drafted text.
//
// Pipeline (deterministic orchestration around real APIs, so it's reliable):
//   1. Derive Apollo search filters + a value prop from the task + brief (LLM).
//   2. Apollo: search candidates, then reveal an email for the top few.
//   3. Draft a personalized message per prospect (LLM, one batched call).
//   4. Queue each as an action (status: needs_approval) — nothing sends until the
//      founder approves in the Actions tab. Send happens in the approve executor.
//
// Degrades gracefully: with no Apollo key (or no matches), it falls back to
// channel discovery via Exa and queues founder-sendable drafts instead.

import { gateway, generateObject } from "ai";
import { z } from "zod";
import Exa from "exa-js";
import { CHEAP_MODEL } from "@/app/lib/cabana-config";
import { searchPeople, enrichEmail, apolloEnabled, type ApolloProspect } from "@/app/lib/apollo";
import { insertAction } from "@/app/lib/db/persistence";

const exa = new Exa(process.env.EXA_API_KEY);

const MAX_PROSPECTS = 5;

export type SellerCtx = { userId: string; cabanaId: string | null; brief?: string };

export type QueuedOutreach = {
  name: string;
  title?: string;
  organization?: string;
  channel: "email" | "manual";
  hasContact: boolean;
  preview: string;
};

export type SellerResult = {
  mode: "prospects" | "drafts";
  queued: number;
  prospects: QueuedOutreach[];
  note: string;
};

const PlanSchema = z.object({
  titles: z.array(z.string()).describe("Job titles of the ideal buyer, e.g. 'Head of Growth'"),
  seniorities: z.array(z.string()).describe("Apollo seniorities: any of c_suite, vp, director, manager, senior, entry, owner, founder"),
  keywords: z.string().describe("Free-text keywords describing the buyer / their company"),
  locations: z.array(z.string()).describe("Locations to target, or empty for anywhere"),
  valueProp: z.string().describe("One-sentence value proposition for the cold message"),
  subject: z.string().describe("A short, non-salesy email subject line"),
});

const DraftsSchema = z.object({
  messages: z.array(
    z.object({
      subject: z.string(),
      text: z.string().describe("2-3 sentence personalized message, conversational, not salesy"),
    }),
  ),
});

// Run the full outreach pipeline for one Seller invocation.
export async function runSellerOutreach(task: string, ctx: SellerCtx): Promise<SellerResult> {
  const briefBlock = ctx.brief?.trim() ? `\n\nBusiness brief:\n${ctx.brief.trim()}` : "";

  // 1. Derive search plan + value prop.
  const { object: plan } = await generateObject({
    model: gateway(CHEAP_MODEL),
    schema: PlanSchema,
    prompt: `You are Cabana's Seller agent planning outbound outreach.

Task: ${task}${briefBlock}

Produce Apollo people-search filters to find the ideal first buyers, plus a tight value proposition and a non-salesy subject line. Prefer specific, realistic job titles.`,
  });

  // 2. Find + enrich real prospects (when Apollo is available).
  const prospects: ApolloProspect[] = [];
  if (apolloEnabled()) {
    const found = await searchPeople({
      titles: plan.titles,
      keywords: plan.keywords,
      seniorities: plan.seniorities,
      locations: plan.locations,
      perPage: 10,
    });
    for (const p of found) {
      if (prospects.length >= MAX_PROSPECTS) break;
      const email = p.email ?? (await enrichEmail(p));
      if (email) prospects.push({ ...p, email });
    }
  }

  // ── Path A: real prospects with emails → personalized, queued for send ──────
  if (prospects.length > 0) {
    const { object: drafts } = await generateObject({
      model: gateway(CHEAP_MODEL),
      schema: DraftsSchema,
      prompt: `Write a short cold outreach email for each prospect below. Conversational, specific, not salesy, 2-3 sentences. Lead with their context, then the value prop.

Value prop: ${plan.valueProp}${briefBlock}

Prospects (write one message each, in order):
${prospects.map((p, i) => `${i + 1}. ${p.name}${p.title ? `, ${p.title}` : ""}${p.organization ? ` at ${p.organization}` : ""}`).join("\n")}`,
    });

    const queued: QueuedOutreach[] = [];
    for (let i = 0; i < prospects.length; i++) {
      const p = prospects[i];
      const msg = drafts.messages[i] ?? { subject: plan.subject, text: plan.valueProp };
      await insertAction({
        userId: ctx.userId,
        cabanaId: ctx.cabanaId,
        title: `Email ${p.name}${p.organization ? ` (${p.organization})` : ""}`,
        channel: "email",
        agent: "seller",
        tool: "agentmail",
        risk: "low",
        status: "needs_approval",
        why: `Outreach to a matched prospect — ${plan.valueProp}`,
        details: msg.text,
        inputJson: JSON.stringify({ to: p.email, subject: msg.subject || plan.subject, text: msg.text }),
      });
      queued.push({
        name: p.name,
        title: p.title,
        organization: p.organization,
        channel: "email",
        hasContact: true,
        preview: msg.text,
      });
    }

    return {
      mode: "prospects",
      queued: queued.length,
      prospects: queued,
      note: `Queued ${queued.length} personalized email${queued.length === 1 ? "" : "s"} — approve in the Actions tab to send.`,
    };
  }

  // ── Path B: no contacts → discover channels via Exa, queue founder-send drafts ─
  let channels: string[] = [];
  try {
    const res = await exa.searchAndContents(`${plan.keywords} community forum where buyers gather`, {
      numResults: 4,
      type: "neural",
      useAutoprompt: true,
      text: { maxCharacters: 120 },
    });
    channels = res.results.map((r) => r.title || r.url).filter(Boolean).slice(0, 4);
  } catch {
    channels = [];
  }

  const { object: drafts } = await generateObject({
    model: gateway(CHEAP_MODEL),
    schema: DraftsSchema,
    prompt: `Write ${Math.max(channels.length, 3)} short outreach messages the founder can post or send by hand to find first buyers. Conversational, helpful, not salesy.

Value prop: ${plan.valueProp}${briefBlock}
${channels.length ? `Target communities: ${channels.join(", ")}` : ""}`,
  });

  const queued: QueuedOutreach[] = [];
  for (let i = 0; i < drafts.messages.length; i++) {
    const msg = drafts.messages[i];
    const channelName = channels[i] ?? "your channels";
    await insertAction({
      userId: ctx.userId,
      cabanaId: ctx.cabanaId,
      title: `Outreach draft for ${channelName}`,
      channel: "manual",
      agent: "seller",
      risk: "low",
      status: "needs_approval",
      why: `Founder-send draft — ${plan.valueProp}`,
      details: msg.text,
      inputJson: JSON.stringify({ subject: msg.subject, text: msg.text, channel: channelName }),
    });
    queued.push({
      name: channelName,
      channel: "manual",
      hasContact: false,
      preview: msg.text,
    });
  }

  return {
    mode: "drafts",
    queued: queued.length,
    prospects: queued,
    note: apolloEnabled()
      ? `No matched contacts this round — queued ${queued.length} drafts to send by hand. Approve in the Actions tab.`
      : `Queued ${queued.length} outreach drafts to send by hand. Approve in the Actions tab.`,
  };
}
