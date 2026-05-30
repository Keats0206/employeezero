import { neon } from "@neondatabase/serverless";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const sql = neon(url);
  
  console.log("Creating missing tables...");
  
  // Create all Cabana tables
  await sql`
    CREATE TABLE IF NOT EXISTS "cabanas" (
      "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "user_id" text NOT NULL,
      "idea" text NOT NULL,
      "name" text NOT NULL DEFAULT '',
      "status" text NOT NULL DEFAULT 'preview',
      "plan" text NOT NULL DEFAULT 'free',
      "sprint_day" integer NOT NULL DEFAULT 1,
      "revenue_goal" text,
      "current_revenue" integer NOT NULL DEFAULT 0,
      "created_at" timestamp with time zone NOT NULL DEFAULT now()
    )
  `;
  console.log("✓ cabanas");

  await sql`
    CREATE TABLE IF NOT EXISTS "cabanaAgents" (
      "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "cabana_id" text NOT NULL,
      "type" text NOT NULL,
      "name" text NOT NULL,
      "status" text NOT NULL DEFAULT 'queued',
      "created_at" timestamp with time zone NOT NULL DEFAULT now()
    )
  `;
  console.log("✓ cabanaAgents");

  await sql`
    CREATE TABLE IF NOT EXISTS "agentOutputs" (
      "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "cabana_id" text NOT NULL,
      "agent_id" text NOT NULL,
      "type" text NOT NULL,
      "title" text NOT NULL,
      "content_json" text NOT NULL DEFAULT '{}',
      "preview_visible" boolean NOT NULL DEFAULT true,
      "locked" boolean NOT NULL DEFAULT false,
      "status" text NOT NULL DEFAULT 'draft',
      "created_at" timestamp with time zone NOT NULL DEFAULT now()
    )
  `;
  console.log("✓ agentOutputs");

  await sql`
    CREATE TABLE IF NOT EXISTS "landingPages" (
      "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "cabana_id" text NOT NULL,
      "slug" text NOT NULL,
      "sections_json" text NOT NULL DEFAULT '[]',
      "published" boolean NOT NULL DEFAULT false,
      "cta_url" text,
      "created_at" timestamp with time zone NOT NULL DEFAULT now()
    )
  `;
  console.log("✓ landingPages");

  await sql`
    CREATE TABLE IF NOT EXISTS "plays" (
      "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "cabana_id" text NOT NULL,
      "agent_type" text NOT NULL,
      "title" text NOT NULL,
      "description" text NOT NULL DEFAULT '',
      "output" text,
      "status" text NOT NULL DEFAULT 'working',
      "priority" integer NOT NULL DEFAULT 3,
      "created_at" timestamp with time zone NOT NULL DEFAULT now()
    )
  `;
  console.log("✓ plays");

  await sql`
    CREATE TABLE IF NOT EXISTS "signals" (
      "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "cabana_id" text NOT NULL,
      "type" text NOT NULL,
      "value" integer,
      "notes" text,
      "created_at" timestamp with time zone NOT NULL DEFAULT now()
    )
  `;
  console.log("✓ signals");

  await sql`
    CREATE TABLE IF NOT EXISTS "cabanaWorkbenchStates" (
      "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "user_id" text NOT NULL DEFAULT 'demo',
      "idea" text NOT NULL,
      "company_context" text NOT NULL DEFAULT '',
      "sprint_plan" text NOT NULL DEFAULT '',
      "actions_json" text NOT NULL DEFAULT '[]',
      "loop_runs_json" text NOT NULL DEFAULT '[]',
      "signals_json" text NOT NULL DEFAULT '{}',
      "ai_calls_json" text NOT NULL DEFAULT '[]',
      "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
      "created_at" timestamp with time zone NOT NULL DEFAULT now()
    )
  `;
  console.log("✓ cabanaWorkbenchStates");

  await sql`
    CREATE TABLE IF NOT EXISTS "agentRuns" (
      "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "workspace_id" text NOT NULL,
      "thread_id" text,
      "agent_type" text NOT NULL,
      "title" text NOT NULL DEFAULT 'Agent run',
      "status" text NOT NULL DEFAULT 'running',
      "input" text,
      "output" text,
      "steps" text NOT NULL DEFAULT '[]',
      "artifacts" text NOT NULL DEFAULT '[]',
      "error" text,
      "started_at" timestamp with time zone NOT NULL DEFAULT now(),
      "finished_at" timestamp with time zone,
      "created_at" timestamp with time zone NOT NULL DEFAULT now()
    )
  `;
  console.log("✓ agentRuns");

  await sql`
    CREATE TABLE IF NOT EXISTS "llmCalls" (
      "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "workspace_id" text NOT NULL,
      "model_id" text NOT NULL,
      "provider" text,
      "operation" text NOT NULL DEFAULT 'stream',
      "agent_label" text,
      "input_tokens" integer,
      "output_tokens" integer,
      "cached_input_tokens" integer,
      "total_tokens" integer,
      "duration_ms" integer,
      "finish_reason" text,
      "error" text,
      "created_at" timestamp with time zone NOT NULL DEFAULT now()
    )
  `;
  console.log("✓ llmCalls");

  await sql`
    CREATE TABLE IF NOT EXISTS "appProjects" (
      "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "public_key" text NOT NULL DEFAULT gen_random_uuid()::text,
      "cabana_id" text,
      "label" text NOT NULL DEFAULT '',
      "created_at" timestamp with time zone NOT NULL DEFAULT now()
    )
  `;
  console.log("✓ appProjects");

  await sql`
    CREATE TABLE IF NOT EXISTS "businessBriefs" (
      "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "cabana_id" text,
      "user_id" text NOT NULL,
      "content" text NOT NULL DEFAULT '',
      "version" integer NOT NULL DEFAULT 1,
      "created_at" timestamp with time zone NOT NULL DEFAULT now(),
      "updated_at" timestamp with time zone NOT NULL DEFAULT now()
    )
  `;
  console.log("✓ businessBriefs");

  await sql`
    CREATE TABLE IF NOT EXISTS "chatThreads" (
      "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "user_id" text NOT NULL,
      "cabana_id" text,
      "title" text NOT NULL DEFAULT '',
      "messages_json" text NOT NULL DEFAULT '[]',
      "created_at" timestamp with time zone NOT NULL DEFAULT now(),
      "updated_at" timestamp with time zone NOT NULL DEFAULT now()
    )
  `;
  console.log("✓ chatThreads");

  await sql`
    CREATE TABLE IF NOT EXISTS "pageVersions" (
      "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "cabana_id" text,
      "user_id" text NOT NULL,
      "html" text NOT NULL DEFAULT '',
      "deploy_url" text,
      "deploy_error" text,
      "deploy_status" text NOT NULL DEFAULT 'pending',
      "project_id" text,
      "model" text,
      "version" integer NOT NULL DEFAULT 1,
      "update_instruction" text,
      "created_at" timestamp with time zone NOT NULL DEFAULT now()
    )
  `;
  console.log("✓ pageVersions");

  await sql`
    CREATE TABLE IF NOT EXISTS "actions" (
      "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "cabana_id" text,
      "user_id" text NOT NULL,
      "title" text NOT NULL,
      "channel" text NOT NULL DEFAULT 'manual',
      "details" text NOT NULL DEFAULT '',
      "why" text NOT NULL DEFAULT '',
      "status" text NOT NULL DEFAULT 'proposed',
      "risk" text NOT NULL DEFAULT 'low',
      "type" text,
      "agent" text,
      "tool" text,
      "input_json" text NOT NULL DEFAULT '{}',
      "output_json" text NOT NULL DEFAULT '{}',
      "result_url" text,
      "cycle" integer NOT NULL DEFAULT 0,
      "work_order_json" text,
      "created_at" timestamp with time zone NOT NULL DEFAULT now()
    )
  `;
  console.log("✓ actions");

  await sql`
    CREATE TABLE IF NOT EXISTS "appDocuments" (
      "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "project_id" text NOT NULL,
      "collection" text NOT NULL,
      "data" jsonb NOT NULL DEFAULT '{}'::jsonb,
      "created_at" timestamp with time zone NOT NULL DEFAULT now()
    )
  `;
  console.log("✓ appDocuments");

  console.log("\n✅ All tables created!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
