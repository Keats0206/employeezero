import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../app/lib/db";
import { goals, tasks, artifacts, memories, approvals, agentRuns } from "../app/lib/db/schema";

async function main() {
  console.log("Wiping all data…");
  await db.delete(approvals);
  await db.delete(agentRuns);
  await db.delete(memories);
  await db.delete(artifacts);
  await db.delete(tasks);
  await db.delete(goals);
  console.log("✓ Database is empty. Onboarding will seed it via Claude.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .then(() => process.exit(0));
