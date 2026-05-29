import { neon } from "@neondatabase/serverless";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const sql = neon(url);
  const rows = (await sql`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `) as { tablename: string }[];
  if (rows.length === 0) {
    console.log("No tables in public schema.");
    return;
  }
  const names = rows.map((r) => `"${r.tablename}"`).join(", ");
  console.log("Dropping:", names);
  await sql.query(`DROP TABLE IF EXISTS ${names} CASCADE`);
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
