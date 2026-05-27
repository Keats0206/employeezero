import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { db, WORKSPACE_ID } from "../../lib/db";
import { goals, memories } from "../../lib/db/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

const OnboardingSchema = z.object({
  goal: z.object({
    title: z.string().describe("Short, action-oriented goal title — ≤ 80 chars"),
    why_it_matters: z.string().describe("1-2 sentences. The reason this is the right first goal."),
    success_metric: z.string().describe("A concrete metric the founder will know they hit"),
    deadline_days: z.number().int().min(7).max(30).describe("Days from today, between 7 and 30"),
  }),
  memories: z
    .array(
      z.object({
        title: z.string().describe("Short title"),
        content: z.string().describe("The fact, in the founder's voice"),
        importance: z.union([z.literal(1), z.literal(2), z.literal(3)]),
      })
    )
    .min(3)
    .max(6)
    .describe(
      "Company memories that capture what's being built, who it's for, founder context, and any constraints."
    ),
});

const SYSTEM_PROMPT = `You are the onboarding agent for employeezero — a founder cockpit.

The founder just answered a few questions about what they're building. Your job:
1. Synthesize a single first goal that's small, concrete, and shippable in 1-3 weeks.
2. Extract 3-6 company memories that the system should permanently know. These are stable facts, not tasks.

Style: terse, founder-tool register. Use the founder's own words where possible. No fluff, no agent-speak.

The first goal should be the SMALLEST thing that, if done, proves the product can exist. Not the ambitious vision.`;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { building, audience, first_milestone, notes } = body as {
    building: string;
    audience: string;
    first_milestone: string;
    notes?: string;
  };

  if (!building || !audience || !first_milestone) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const prompt = `Founder answers:

WHAT THEY'RE BUILDING:
${building}

WHO IT'S FOR:
${audience}

FIRST MILESTONE (next 2 weeks):
${first_milestone}

${notes ? `HOW THEY WORK / WHAT TO AVOID:\n${notes}\n` : ""}

Today is ${new Date().toDateString()}.

Produce the first goal and the company memories.`;

  const { object } = await generateObject({
    model: "anthropic/claude-haiku-4-5",
    schema: OnboardingSchema,
    system: SYSTEM_PROMPT,
    prompt,
  });

  const deadline = new Date();
  deadline.setDate(deadline.getDate() + object.goal.deadline_days);

  const [insertedGoal] = await db
    .insert(goals)
    .values({
      workspace_id: WORKSPACE_ID,
      title: object.goal.title,
      description: object.goal.why_it_matters,
      why_it_matters: object.goal.why_it_matters,
      success_metric: object.goal.success_metric,
      status: "active",
      deadline,
      active: true,
    })
    .returning();

  await db.insert(memories).values(
    object.memories.map((m) => ({
      workspace_id: WORKSPACE_ID,
      type: "company" as const,
      title: m.title,
      content: m.content,
      importance: m.importance,
      pinned: m.importance === 3,
    }))
  );

  return NextResponse.json({
    ok: true,
    goal_id: insertedGoal.id,
    memory_count: object.memories.length,
  });
}
