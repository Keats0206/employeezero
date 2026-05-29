import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export const WORKSPACE_ID = "local-workspace";
export const LEGACY_WORKSPACE_ID = WORKSPACE_ID;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Add your Neon connection string in Vercel env vars.");
}

const sql = neon(connectionString);

export const db = drizzle(sql, { schema });
export { schema };
