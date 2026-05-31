import { gateway, streamText, stepCountIs, tool, convertToModelMessages, NoSuchToolError, type UIMessage } from "ai";
import { z } from "zod";
import { crewTools, pickCrew, proposeRosterTool } from "@/app/lib/agents/crew-tools";
import { CHEAP_MODEL, AGENT_ORDER, type AgentId } from "@/app/lib/cabana-config";
import { requireAuth, upgradeRequiredResponse, unauthorizedResponse } from "@/app/lib/auth-helpers";
import { getSubscription, isSubscriptionActive } from "@/app/lib/db/subscription-queries";

export const runtime = "nodejs";
export const maxDuration = 120;

const SYSTEM = `You are the Chief of Staff for Cabana — an AI crew that turns a one-line internet business idea into a real, validated, go-to-market business.

═══ HARD RULES — these override everything below ═══
1. NEVER reply with a list of questions. Not numbered, not bulleted. If you catch yourself writing "before we build, I need a few things…", STOP — assume the answers instead.
2. When something is missing, DECIDE it. Make up a sensible default, state it in one short line ("Assuming a PGA-certified coach + video swing reviews — say so if not"), and keep going.
3. At most ONE short question per reply, and only if a sharp operator literally could not proceed. Default to zero questions. When you DO ask your one question — or present any either/or choice — use the ask_founder tool to render tappable options instead of writing the question as plain text.
4. Keep replies tight — a few sentences. Light formatting. No walls of bold text. Let the desk show the detailed crew output; your job is the headline + the next move.
5. When the founder gives an idea or says "build it", run the crew and act. Don't stall to confirm.
══════════════════════════════════════════════════


You talk to the founder in a single chat. You are the only one they talk to. Behind you is a crew of 6 specialist agents you orchestrate as tools:
- scout — market research (pains, channels, competitors, keywords)
- strategist — offer design (name, offer, price, ICP, channel, first priority)
- builder — SUGGESTS landing page ideas (concept, angle, sections, headline options). It does NOT write final copy or build/deploy.
- seller — outreach messages
- creator — content hooks + video script
- analyst — revenue path + signals to watch

How you operate — you are PROACTIVE and AUTONOMOUS, not a chatbot:
- DECIDE AND ACT. The founder hired you to run this, not to fill out forms. When given an idea or a goal, immediately run the relevant specialists — scout, then strategist, then builder, seller, creator, analyst as the situation calls for — back to back in one turn. Don't ask permission to do work. Just do it and show the results.
- MAKE ASSUMPTIONS INSTEAD OF ASKING. If a detail is missing (coach bio, delivery format, CTA style, founding-member cap, testimonials, etc.), pick a sensible default, state it in one short line ("Assuming X — tell me if you'd rather Y"), and keep moving. Never block progress on a questionnaire. Asking a pile of questions is a failure.
- Almost never ask the founder a question. The bar is: would a sharp chief of staff genuinely be unable to proceed without this? If not, decide it yourself. At most ONE crisp question per turn, and only when truly blocked.
- Pass each tool a specific task with the business context it needs — agents only see the task string you give them, not the chat. Fill in details from the brief and your own judgment.
- Synthesize, don't dump. Turn raw crew output into a tight founder-facing recommendation: what it means and what's happening next.

The ONE gate — build & deploy:
- You never build or deploy on your own. But don't gate it behind questions either. When the page is ready to build, prep EVERYTHING yourself (concept, angle, headline options, all copy decisions — assume defaults for anything missing), then end with a single go-ahead: "Ready to build — say go or hit Build the site." The founder triggers the build with one word or one click. That's the only approval you need — not a list of prerequisites.
- Only file request_landing_page_deploy after the founder says go. Never claim a page was built or went live, and never pretend outreach/content was actually sent or published.

The Business Brief is your long-term memory — it persists across sessions, unlike this chat. Read it before deciding. Whenever you learn something durable (offer, ICP, a result, a decision, an assumption you locked in), update it with update_business_brief: return the COMPLETE revised markdown, fold the new fact in, keep the section headings, keep it tight. Do this proactively — don't wait to be told.

When the founder gives you an idea, don't reply with questions — run the crew and come back with a plan. Move fast toward a first revenue signal.

═══ TOOL DISCIPLINE ═══
To run the crew, call the specialist tools (scout, strategist, seller, creator, analyst, builder) DIRECTLY — each one in its own tool call. There is NO "run_crew", "start_crew", "activate_crew", or any orchestration/meta tool. NEVER call a tool that is not explicitly in your tool list. To activate the whole crew, just call each specialist tool yourself in one turn.`;

const briefTool = tool({
  description:
    "Revise the Business Brief — your long-term memory of this business. Pass the COMPLETE updated markdown document (read the current brief, fold in what you learned, keep section headings, keep it tight). Use whenever a durable fact about the business changes.",
  inputSchema: z.object({
    content: z.string().describe("The full revised brief as markdown, with section headings"),
  }),
  async execute({ content }) {
    // The client persists the brief; the tool just confirms the revision so the
    // chat stream carries the new content out to the desk.
    return { content, note: "Business brief updated." };
  },
});

// Fallback target for hallucinated tool names. The CoS occasionally invents an
// orchestration tool ("run_crew", "start_crew", etc.); without this, that one
// bad call throws NoSuchToolError and takes the whole turn — including the real
// agent calls beside it — down with it. We reroute any unknown tool here so the
// run survives and the model gets a nudge back to the real specialists.
const noopTool = tool({
  description: "Internal fallback. Do not call directly.",
  inputSchema: z.object({}).loose(),
  async execute() {
    return {
      note: "That isn't a real tool. To run the crew, call the specialist agents (scout, strategist, seller, creator, analyst, builder) directly.",
    };
  },
});

const askFounderTool = tool({
  description:
    "Ask the founder ONE decision and render it as a card with tappable options in the chat. Use this for your at-most-one-question-per-turn, or whenever you present a clear either/or choice (which direction, go vs not-yet, etc.). Strongly prefer this over a plain-text question — it's faster for the founder to answer. Keep options to 2-4 short labels.",
  inputSchema: z.object({
    question: z.string().describe("One short, sharp question"),
    options: z.array(z.string()).min(2).max(4).describe("2-4 short tappable answer labels"),
  }),
  async execute({ question, options }) {
    // The client renders this as an interactive Choice card; tapping an option
    // sends that label back as the founder's next message.
    return { question, options };
  },
});

// Intake mode: before any crew runs, the CoS sizes up the business and proposes
// which specialists to enable. The founder approves/adjusts that roster; only
// then does the crew become callable (operating mode).
const INTAKE_SYSTEM = `You are the Chief of Staff for Cabana — an AI crew that turns an internet business into revenue. The founder just started a new business. Your ONE job right now is to propose the crew roster.

Your crew of specialists (enable only the ones that earn their slot):
- scout — market research (pains, channels, competitors, keywords)
- strategist — offer design (name, offer, price, ICP, channel)
- builder — landing-page concept (only when they need a NEW page built)
- seller — outreach messages to first buyers
- creator — content hooks + short video scripts
- analyst — revenue path + signals to watch

Rules:
1. Read the founder's idea — and, if they imported an existing site, the SITE CONTEXT below — and decide the minimal high-leverage roster.
2. IF A SITE WAS IMPORTED: they already have a product and a page. Do NOT enable 'builder' unless they clearly need a brand-new or additional page. Lead with the growth crew (scout, strategist, seller, creator, analyst). This is "market what I already built."
3. IF IT'S A RAW IDEA (no site): include 'builder' so they can get a landing page.
4. Call propose_roster EXACTLY ONCE with each chosen agent + a one-line reason. Do not write the roster as prose, do not run any specialist, do not ask questions. Just propose.`;

export async function POST(req: Request) {
  let userId: string;
  try {
    ({ userId } = await requireAuth());
  } catch {
    return unauthorizedResponse();
  }

  const sub = await getSubscription(userId);
  if (!isSubscriptionActive(sub)) return upgradeRequiredResponse();

  const {
    messages,
    brief,
    enabledAgents,
    sourceContext,
    cabanaId,
  }: {
    messages: UIMessage[];
    brief?: string;
    enabledAgents?: string[];
    sourceContext?: string;
    cabanaId?: string | null;
  } = await req.json();

  const roster = (enabledAgents ?? []).filter((a): a is AgentId =>
    (AGENT_ORDER as readonly string[]).includes(a),
  );
  const intake = roster.length === 0;

  const modelMessages = await convertToModelMessages(messages);

  if (intake) {
    const system = `${INTAKE_SYSTEM}
${sourceContext?.trim() ? `\n═══ SITE CONTEXT (imported existing website) ═══\n${sourceContext.trim()}\n═══════════════════════════════════════════` : ""}`;

    const result = streamText({
      model: gateway(CHEAP_MODEL),
      system,
      messages: modelMessages,
      tools: { propose_roster: proposeRosterTool },
      toolChoice: "required",
      stopWhen: stepCountIs(2),
    });
    return result.toUIMessageStreamResponse();
  }

  const system = `${SYSTEM}

═══ ACTIVE CREW (the founder approved this roster — only these specialists are available) ═══
${roster.join(", ")}
═══════════════════════════════════════════
${sourceContext?.trim() ? `\n═══ SITE CONTEXT (imported existing website) ═══\n${sourceContext.trim()}\n═══════════════════════════════════════════\n` : ""}
═══ CURRENT BUSINESS BRIEF (your memory) ═══
${brief?.trim() || "No business brief yet — this is a brand new business."}
═══════════════════════════════════════════`;

  const result = streamText({
    model: gateway(CHEAP_MODEL),
    system,
    messages: modelMessages,
    tools: {
      ...pickCrew(roster, { userId, cabanaId: cabanaId ?? null, brief }),
      request_landing_page_deploy: crewTools.request_landing_page_deploy,
      update_business_brief: briefTool,
      ask_founder: askFounderTool,
      noop: noopTool,
    },
    // Reroute hallucinated tool names (e.g. "run_crew") to the no-op fallback so
    // one bad call can't error out the real agents running alongside it.
    experimental_repairToolCall: async ({ toolCall, error }) => {
      if (NoSuchToolError.isInstance(error)) {
        return { ...toolCall, toolName: "noop", input: JSON.stringify({}) };
      }
      return null;
    },
    onError: ({ error }) => {
      console.error("cos-chat stream error:", error);
    },
    // Generous budget so the CoS can run the full crew (up to 6 agents + brief
    // update + synthesis) autonomously in a single turn without getting cut off.
    stopWhen: stepCountIs(16),
  });

  return result.toUIMessageStreamResponse();
}
