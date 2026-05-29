import { ToolLoopAgent, tool, gateway, generateObject } from "ai";
import { z } from "zod";
import { db } from "../db";
import { plays, signals, agentOutputs, cabanas } from "../db/schema";
import { eq, desc } from "drizzle-orm";

const MODEL = "deepseek/deepseek-v3.2";

// ─── Agent schemas (same as generate route) ──────────────────────────────────

const ScoutSchema = z.object({
  pains: z.array(z.string()).length(3),
  channels: z.array(z.string()).length(3),
  competitors: z.array(z.string()).length(2),
  keywords: z.array(z.string()).length(4),
});

const StrategistSchema = z.object({
  offer: z.string(),
  price: z.string(),
  channel: z.string(),
  icp: z.string(),
  nextTestIdea: z.string().describe("The next thing to test or improve based on what's been tried"),
});

const BuilderSchema = z.object({
  headline: z.string(),
  subheadline: z.string(),
  cta: z.string(),
  pain_hook: z.string(),
});

const SellerSchema = z.object({
  messages: z.array(z.string()).length(3),
});

const CreatorSchema = z.object({
  hooks: z.array(z.string()).length(3),
  script_opener: z.string(),
});

const AnalystSchema = z.object({
  assessment: z.string().describe("1-2 sentence assessment of current momentum"),
  recommended_path: z.string(),
  next_play: z.string(),
  signals_to_watch: z.array(z.string()).length(3),
  verdict: z.enum(["launch", "double_down", "pivot", "validate_first"]),
});

// ─── Tool: read cabana state ──────────────────────────────────────────────────

async function getCabanaState(cabana_id: string) {
  const [cabana] = await db.select().from(cabanas).where(eq(cabanas.id, cabana_id)).limit(1);
  if (!cabana) throw new Error(`Cabana ${cabana_id} not found`);

  const recentSignals = await db
    .select()
    .from(signals)
    .where(eq(signals.cabana_id, cabana_id))
    .orderBy(desc(signals.created_at))
    .limit(20);

  const recentPlays = await db
    .select()
    .from(plays)
    .where(eq(plays.cabana_id, cabana_id))
    .orderBy(desc(plays.created_at))
    .limit(10);

  const recentOutputs = await db
    .select()
    .from(agentOutputs)
    .where(eq(agentOutputs.cabana_id, cabana_id))
    .orderBy(desc(agentOutputs.created_at))
    .limit(12);

  const signalSummary = recentSignals.reduce((acc, s) => {
    acc[s.type] = (acc[s.type] ?? 0) + (s.value ?? 1);
    return acc;
  }, {} as Record<string, number>);

  const approvedPlays = recentPlays.filter(p => p.status === "approved").map(p => p.title);
  const pendingPlays = recentPlays.filter(p => p.status === "working").map(p => p.title);

  return {
    idea: cabana.idea,
    name: cabana.name,
    sprint_day: cabana.sprint_day,
    signalSummary,
    approvedPlays,
    pendingPlays,
    lastOutputTypes: recentOutputs.map(o => `${o.type} (${o.status})`),
  };
}

// ─── Tool: run individual agents ─────────────────────────────────────────────

async function runAgentTask(
  agentType: string,
  task: string,
  context: { idea: string; signalSummary: Record<string, number>; approvedPlays: string[] }
) {
  const ctx = `Idea: "${context.idea}"
Signal history: ${JSON.stringify(context.signalSummary)}
Previously approved plays: ${context.approvedPlays.join(", ") || "none yet"}
Task: ${task}`;

  switch (agentType) {
    case "scout":
      return generateObject({ model: gateway(MODEL), schema: ScoutSchema, prompt: `You are Scout. ${ctx}\n\nFind fresh pain patterns, channels, and competitors relevant to this task.` });
    case "strategist":
      return generateObject({ model: gateway(MODEL), schema: StrategistSchema, prompt: `You are Strategist. ${ctx}\n\nRefine or update the offer based on signals so far.` });
    case "builder":
      return generateObject({ model: gateway(MODEL), schema: BuilderSchema, prompt: `You are Builder. ${ctx}\n\nUpdate or create landing page copy based on what's working.` });
    case "seller":
      return generateObject({ model: gateway(MODEL), schema: SellerSchema, prompt: `You are Seller. ${ctx}\n\nDraft fresh outreach messages for the next batch. Sound human. No pitch.` });
    case "creator":
      return generateObject({ model: gateway(MODEL), schema: CreatorSchema, prompt: `You are Creator. ${ctx}\n\nGenerate new content hooks based on what's resonating.` });
    case "analyst":
      return generateObject({ model: gateway(MODEL), schema: AnalystSchema, prompt: `You are Analyst, the chief of staff. ${ctx}\n\nAssess momentum and recommend next plays. Crew does the work — don't say "you should".` });
    default:
      throw new Error(`Unknown agent type: ${agentType}`);
  }
}

// ─── CoS ToolLoopAgent ────────────────────────────────────────────────────────

export const cosAgent = new ToolLoopAgent({
  model: gateway(MODEL),
  instructions: `You are the Chief of Staff for Cabana — an AI crew that builds internet businesses.

Your job each run:
1. Read the cabana's current state (signals, plays, outputs)
2. Assess what's working, what's stalled, what the crew should focus on next
3. Run the 1-3 most valuable agents for this moment
4. Create plays for each output so the user can review them

Rules:
- Don't run agents that have nothing new to do
- If signals are low, prioritize Seller and Creator
- If there's been traction, run Analyst to assess and double down
- Always create at least 1 play per agent you run
- Be decisive — pick the highest-leverage actions, not everything`,

  tools: {
    read_state: tool({
      description: "Read the current state of a Cabana — signals, plays, outputs, and sprint context",
      inputSchema: z.object({
        cabana_id: z.string(),
      }),
      execute: async ({ cabana_id }) => {
        return getCabanaState(cabana_id);
      },
    }),

    run_agent: tool({
      description: "Run a specific agent with a specific task and get its output",
      inputSchema: z.object({
        cabana_id: z.string(),
        agent_type: z.enum(["scout", "strategist", "builder", "seller", "creator", "analyst"]),
        task: z.string().describe("What specifically this agent should focus on this run"),
        idea: z.string(),
        signal_summary: z.record(z.string(), z.number()).optional(),
        approved_plays: z.array(z.string()).optional(),
      }),
      execute: async ({ cabana_id, agent_type, task, idea, signal_summary, approved_plays }) => {
        const result = await runAgentTask(agent_type, task, {
          idea,
          signalSummary: signal_summary ?? {},
          approvedPlays: approved_plays ?? [],
        });

        // Save output to DB
        await db.insert(agentOutputs).values({
          cabana_id,
          agent_id: agent_type,
          type: agent_type,
          title: `${agent_type} run`,
          content_json: JSON.stringify(result.object),
          status: "draft",
          preview_visible: true,
          locked: false,
        });

        return { agent_type, output: result.object };
      },
    }),

    create_play: tool({
      description: "Create a play in the approval queue for the user to review",
      inputSchema: z.object({
        cabana_id: z.string(),
        agent_type: z.enum(["scout", "strategist", "builder", "seller", "creator", "analyst"]),
        title: z.string().describe("Short action title"),
        description: z.string().describe("Why the crew is recommending this — what it will do"),
        output: z.string().optional().describe("Preview of what was generated"),
        priority: z.number().min(1).max(5).default(3),
      }),
      execute: async ({ cabana_id, agent_type, title, description, output, priority }) => {
        await db.insert(plays).values({
          cabana_id,
          agent_type,
          title,
          description,
          output: output ?? null,
          status: "working",
          priority,
        });
        return { created: true, title };
      },
    }),

    advance_sprint_day: tool({
      description: "Increment the sprint day counter for a cabana",
      inputSchema: z.object({ cabana_id: z.string() }),
      execute: async ({ cabana_id }) => {
        const [cabana] = await db.select().from(cabanas).where(eq(cabanas.id, cabana_id)).limit(1);
        if (!cabana) return { error: "not found" };
        const nextDay = (cabana.sprint_day ?? 1) + 1;
        await db.update(cabanas).set({ sprint_day: nextDay }).where(eq(cabanas.id, cabana_id));
        return { sprint_day: nextDay };
      },
    }),
  },
});
