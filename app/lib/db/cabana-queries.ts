import { db } from "./index";
import { cabanas, agentOutputs, plays, signals } from "./schema";
import { eq, desc } from "drizzle-orm";
import type { AgentOutputs } from "@/app/lib/cabana-config";

export async function createCabana(userId: string, idea: string, outputs: AgentOutputs) {
  const name = outputs.strategist?.businessName ?? idea.split(" ").slice(-2).join(" ");

  const [cabana] = await db
    .insert(cabanas)
    .values({
      user_id: userId,
      idea,
      name,
      status: "active",
      plan: "free",
      sprint_day: 1,
    })
    .returning();

  // Save initial agent outputs
  const outputEntries = Object.entries(outputs) as [string, unknown][];
  for (const [agentType, output] of outputEntries) {
    if (!output) continue;
    await db.insert(agentOutputs).values({
      cabana_id: cabana.id,
      agent_id: agentType,
      type: agentType,
      title: `${agentType} initial output`,
      content_json: JSON.stringify(output),
      preview_visible: true,
      locked: false,
      status: "draft",
    });
  }

  // Seed initial plays from analyst output
  const analyst = outputs.analyst;
  if (analyst?.next_play) {
    await db.insert(plays).values({
      cabana_id: cabana.id,
      agent_type: "analyst",
      title: analyst.next_play,
      description: analyst.recommended_path ?? "",
      status: "working",
      priority: 1,
    });
  }

  if (outputs.builder) {
    await db.insert(plays).values({
      cabana_id: cabana.id,
      agent_type: "builder",
      title: "Publish landing page",
      description: "Crew built the page — approve to make it live.",
      output: outputs.builder.headline,
      status: "working",
      priority: 2,
    });
  }

  if (outputs.seller) {
    await db.insert(plays).values({
      cabana_id: cabana.id,
      agent_type: "seller",
      title: "Send outreach batch",
      description: "Seller drafted 10 messages. Copy and send to your channel.",
      output: outputs.seller.messages[0],
      status: "working",
      priority: 3,
    });
  }

  return cabana;
}

export async function getCabana(cabanaId: string) {
  const [cabana] = await db
    .select()
    .from(cabanas)
    .where(eq(cabanas.id, cabanaId))
    .limit(1);
  return cabana ?? null;
}

export async function getUserCabanas(userId: string) {
  return db
    .select()
    .from(cabanas)
    .where(eq(cabanas.user_id, userId))
    .orderBy(desc(cabanas.created_at));
}

export async function getCabanaOutputs(cabanaId: string) {
  const rows = await db
    .select()
    .from(agentOutputs)
    .where(eq(agentOutputs.cabana_id, cabanaId))
    .orderBy(desc(agentOutputs.created_at));

  const outputs: AgentOutputs = {};
  for (const row of rows) {
    const type = row.type as keyof AgentOutputs;
    if (!(type in outputs)) {
      try {
        (outputs as Record<string, unknown>)[type] = JSON.parse(row.content_json);
      } catch { /* skip */ }
    }
  }
  return outputs;
}

export async function getCabanaPlays(cabanaId: string) {
  return db
    .select()
    .from(plays)
    .where(eq(plays.cabana_id, cabanaId))
    .orderBy(plays.priority, desc(plays.created_at));
}

export async function getCabanaSignals(cabanaId: string) {
  return db
    .select()
    .from(signals)
    .where(eq(signals.cabana_id, cabanaId))
    .orderBy(desc(signals.created_at));
}

export async function logSignal(cabanaId: string, type: string, value = 1, notes?: string) {
  return db.insert(signals).values({ cabana_id: cabanaId, type, value, notes });
}

export async function updatePlayStatus(playId: string, status: string) {
  return db.update(plays).set({ status }).where(eq(plays.id, playId));
}
