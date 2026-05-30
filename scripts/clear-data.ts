import { neon } from "@neondatabase/serverless";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const sql = neon(url);
  
  console.log("Clearing all data from tables (keeping schema)...");
  
  // Order matters — delete child tables first to avoid FK violations
  const tables = [
    "agentRuns",
    "approvals", 
    "artifacts",
    "llmCalls",
    "appDocuments",
    "signals",
    "plays",
    "agentOutputs",
    "cabanaAgents",
    "landingPages",
    "cabanaWorkbenchStates",
    "actions",
    "pageVersions",
    "chatThreads",
    "businessBriefs",
    "cabanas",
    "sessions",
    "accounts",
    "verificationTokens",
    // Keep users table so you can still sign in
  ];
  
  for (const table of tables) {
    try {
      await sql.query(`TRUNCATE TABLE "${table}" CASCADE`);
      console.log(`✓ Cleared ${table}`);
    } catch (err) {
      console.log(`⚠ Skipped ${table} (doesn't exist or error):`, (err as Error).message);
    }
  }
  
  console.log("Done! Tables kept, data cleared.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
