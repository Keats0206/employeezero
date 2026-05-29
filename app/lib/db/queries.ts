import { desc, eq } from "drizzle-orm";
import { db } from ".";
import { approvals, artifacts, agentRuns } from "./schema";

export async function getApprovals(cabanaId: string) {
  return db
    .select()
    .from(approvals)
    .where(eq(approvals.workspace_id, cabanaId))
    .orderBy(desc(approvals.created_at));
}

export async function getArtifacts(cabanaId: string) {
  return db
    .select()
    .from(artifacts)
    .where(eq(artifacts.workspace_id, cabanaId))
    .orderBy(desc(artifacts.created_at));
}

export async function getAgentRuns(cabanaId: string) {
  return db
    .select()
    .from(agentRuns)
    .where(eq(agentRuns.workspace_id, cabanaId))
    .orderBy(desc(agentRuns.created_at));
}
