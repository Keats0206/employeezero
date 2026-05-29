import { gateway, generateObject, tool } from "ai";
import { z } from "zod";
import { CHEAP_MODEL } from "@/app/lib/cabana-config";

// ─── The crew as tools ──────────────────────────────────────────────────────
// Each of the 6 Cabana agents is exposed to the Chief of Staff as a callable
// tool. The CoS (the chat brain) decides which to invoke and with what task;
// each tool runs that agent for real against its own schema + model and returns
// the structured artifact. The Builder is intentionally draft-only — it never
// deploys. Deploy stays an approval-gated action outside this loop (see
// app/api/cabana/deploy/route.ts and the "CoS never auto-deploys" rule).

const ScoutSchema = z.object({
  pains: z.array(z.string()).describe("Specific customer pain statements in the customer's own voice"),
  channels: z.array(z.string()).describe("Communities or platforms where buyers actually hang out"),
  competitors: z.array(z.string()).describe("Existing solutions or alternatives buyers use today"),
  keywords: z.array(z.string()).describe("Search terms this customer actually types"),
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
  concept: z.string().describe("One-paragraph idea for what the landing page should be — the overall concept and what it must accomplish"),
  angle: z.string().describe("The positioning angle the page should lead with"),
  sections: z.array(z.string()).describe("The sections the page should include, in order (e.g. 'Hero with pain hook', 'How it works', 'Pricing')"),
  headline_options: z.array(z.string()).describe("A few candidate hero headlines for the founder to choose from"),
  open_questions: z.array(z.string()).describe("What the founder needs to decide or provide before this can be built"),
});

const SellerSchema = z.object({
  messages: z.array(z.string()).describe("Short outreach messages — conversational, not salesy, under 2 sentences each"),
});

const CreatorSchema = z.object({
  hooks: z.array(z.string()).describe("Scroll-stopping content hooks in quoted title format"),
  script_opener: z.string().describe("Opening line for a 30-second video script"),
});

const AnalystSchema = z.object({
  recommended_path: z.string().describe("Fastest path to first revenue signal — 1-2 sentences"),
  next_play: z.string().describe("Specific next action to take in the next 24 hours"),
  signals_to_watch: z.array(z.string()).describe("Specific signals that mean this is working"),
  verdict: z.enum(["launch", "validate_first", "pivot"]),
});

const AGENT_SCHEMAS = {
  scout: ScoutSchema,
  strategist: StrategistSchema,
  builder: BuilderSchema,
  seller: SellerSchema,
  creator: CreatorSchema,
  analyst: AnalystSchema,
} as const;

const AGENT_BRIEF: Record<keyof typeof AGENT_SCHEMAS, string> = {
  scout: "market research — surface real customer pains, channels, competitors, and keywords",
  strategist: "offer design — name the business, define the offer, price, ICP, channel, and first priority",
  builder: "landing page ideas — SUGGEST what the page should be: concept, angle, sections, headline options, and open questions. Do NOT write final copy or build/deploy anything. This is a proposal for the founder to react to",
  seller: "outreach — write conversational, non-salesy messages to reach first buyers",
  creator: "content — write scroll-stopping hooks and a short video script opener",
  analyst: "revenue path — recommend the fastest path to a revenue signal, the next play, and signals to watch",
};

function runAgent(agent: keyof typeof AGENT_SCHEMAS) {
  return tool({
    description: `Run the ${agent} agent: ${AGENT_BRIEF[agent]}. Pass a specific task describing what you need this agent to produce given the current business state.`,
    inputSchema: z.object({
      task: z.string().describe("Concrete instruction for this agent, including any business context it needs"),
    }),
    async execute({ task }) {
      const { object } = await generateObject({
        // Stress-test: all agents share the cheap model. Swap CHEAP_MODEL for
        // AGENT_MODELS[agent] to restore per-role model assignment.
        model: gateway(CHEAP_MODEL),
        schema: AGENT_SCHEMAS[agent],
        prompt: `You are Cabana's ${agent} agent. ${AGENT_BRIEF[agent]}.

Run this task for real and produce a usable artifact. Do not claim that external publishing, sending, or sales happened — you are creating the concrete work product for the founder to review.

Task: ${task}`,
      });
      return object;
    },
  });
}

export const crewTools = {
  scout: runAgent("scout"),
  strategist: runAgent("strategist"),
  builder: runAgent("builder"),
  seller: runAgent("seller"),
  creator: runAgent("creator"),
  analyst: runAgent("analyst"),

  // Approval-gated. The CoS cannot deploy directly — it can only file a work
  // order describing the deploy for the founder to approve.
  request_landing_page_deploy: tool({
    description:
      "File a work order to deploy or update the landing page. This does NOT deploy — it queues a deploy for founder approval. ONLY call this after you have presented the build idea AND the founder has explicitly said yes to proceeding. Never call it preemptively.",
    inputSchema: z.object({
      task_type: z.enum(["new_site", "product_update"]).describe("new_site if no page exists yet, otherwise product_update"),
      title: z.string().describe("Short title for the work order"),
      brief: z.string().describe("What the page should say / what to change"),
      reason: z.string().describe("Why this deploy should happen now"),
    }),
    async execute({ task_type, title, brief, reason }) {
      return {
        work_order: {
          agent: "builder" as const,
          task_type,
          title,
          brief,
          reason,
          requires_approval: true as const,
          status: "pending_approval" as const,
        },
        note: "Work order filed. Awaiting founder approval before deploy.",
      };
    },
  }),
};
