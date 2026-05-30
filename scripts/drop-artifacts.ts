import { neon } from "@neondatabase/serverless";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const sql = neon(url);
  
  await sql`DROP TABLE IF EXISTS artifacts CASCADE`;
  console.log("✓ Dropped artifacts table");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
