import { gateway, generateObject, tool } from "ai";
import { z } from "zod";
import { CHEAP_MODEL, AGENT_ORDER, type AgentId } from "@/app/lib/cabana-config";
import { runSellerOutreach, type SellerCtx } from "./seller-tools";
import { getCabanaSignals } from "@/app/lib/db/cabana-queries";

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

// The six specialist tools, keyed by AgentId. Used directly in operating mode
// (filtered by the approved roster — see pickCrew) and never during intake.
const CREW: Record<AgentId, ReturnType<typeof runAgent>> = {
  scout: runAgent("scout"),
  strategist: runAgent("strategist"),
  builder: runAgent("builder"),
  seller: runAgent("seller"),
  creator: runAgent("creator"),
  analyst: runAgent("analyst"),
};

// The real Seller: instead of drafting throwaway text, it finds real prospects
// (Apollo), drafts personalized messages, and queues them to the Actions tab for
// approval before anything sends. Needs user/cabana context to attribute the
// queued actions, so it's built per-request rather than as a static tool.
function makeSellerTool(ctx: SellerCtx) {
  return tool({
    description:
      "Run the seller agent: find real first buyers, draft personalized outreach, and QUEUE it for the founder's approval (nothing sends without approval). Pass a task describing who to reach and the offer.",
    inputSchema: z.object({
      task: z.string().describe("Who to reach and what to say, including business context"),
    }),
    async execute({ task }) {
      return runSellerOutreach(task, ctx);
    },
  });
}

// The grounded Analyst: reads the cabana's real captured signals (outreach
// replies, leads) and bases its read on them instead of inventing them.
function makeAnalystTool(ctx: SellerCtx) {
  return tool({
    description: `Run the analyst agent: ${AGENT_BRIEF.analyst}. It reads the business's REAL captured signals before recommending. Pass a task describing what to assess.`,
    inputSchema: z.object({
      task: z.string().describe("What to assess, with business context"),
    }),
    async execute({ task }) {
      let signalBlock = "No real signals captured yet — base your read on the plan and be explicit that validation is still pending.";
      if (ctx.cabanaId) {
        try {
          const rows = await getCabanaSignals(ctx.cabanaId);
          if (rows.length > 0) {
            signalBlock = rows
              .slice(0, 15)
              .map((s) => `- ${s.type}${s.notes ? `: ${s.notes}` : ""}`)
              .join("\n");
          }
        } catch { /* fall back to the default */ }
      }
      const { object } = await generateObject({
        model: gateway(CHEAP_MODEL),
        schema: AnalystSchema,
        prompt: `You are Cabana's analyst agent. ${AGENT_BRIEF.analyst}.

REAL captured signals for this business (use these as primary evidence — do not invent traction):
${signalBlock}

Task: ${task}

Ground your verdict and next play in the real signals above.`,
      });
      return object;
    },
  });
}

// Return only the crew tools the founder approved. The CoS in operating mode
// gets exactly this set, so a disabled agent is simply not callable. When a
// request context is supplied, the Seller and Analyst are upgraded to their
// real, data-backed versions.
export function pickCrew(
  enabled: AgentId[],
  ctx?: SellerCtx,
): Partial<Record<AgentId, ReturnType<typeof runAgent>>> {
  const set = new Set(enabled);
  const picked = Object.fromEntries(
    (Object.entries(CREW) as [AgentId, ReturnType<typeof runAgent>][]).filter(([id]) => set.has(id)),
  );
  if (ctx && set.has("seller")) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    picked.seller = makeSellerTool(ctx) as any;
  }
  if (ctx && set.has("analyst")) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    picked.analyst = makeAnalystTool(ctx) as any;
  }
  return picked;
}

// Intake-only. The CoS analyzes the idea/imported site and proposes which crew
// to enable. The client renders the result as an interactive approval card and
// persists the founder's final selection (see RosterCard in /chat). This is a
// passthrough — it just carries the proposal out on the stream.
export const proposeRosterTool = tool({
  description:
    "Propose the crew roster for this business. Call this exactly once during intake after analyzing the idea (and imported site, if any). List ONLY the agents worth enabling, each with a one-line reason. The founder will approve or adjust before the crew runs.",
  inputSchema: z.object({
    summary: z.string().describe("1-2 sentence read on the business and the plan"),
    roster: z
      .array(
        z.object({
          agent: z.enum(AGENT_ORDER),
          reason: z.string().describe("One short line on why this agent earns a slot"),
        }),
      )
      .min(1)
      .describe("The agents to enable, highest-leverage first"),
    note: z.string().describe("One short line framing the next step for the founder"),
  }),
  async execute({ summary, roster, note }) {
    return { summary, roster, note };
  },
});

export const crewTools = {
  ...CREW,

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
