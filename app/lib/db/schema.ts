import { boolean, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const now = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

// --- Auth tables ---

export const users = pgTable("users", {
  id: id(),
  name: text("name"),
  email: text("email"),
  emailVerified: timestamp("emailVerified", { withTimezone: true }),
  image: text("image"),
});

export const accounts = pgTable("accounts", {
  id: id(),
  userId: text("userId").notNull(),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
});

export const sessions = pgTable("sessions", {
  id: id(),
  sessionToken: text("sessionToken").notNull(),
  userId: text("userId").notNull(),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable("verificationTokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

// Back-compat aliases
export const usersTable = users;
export const accountsTable = accounts;
export const sessionsTable = sessions;
export const verificationTokensTable = verificationTokens;

// --- Cabana core tables ---

export const cabanas = pgTable("cabanas", {
  id: id(),
  user_id: text("user_id").notNull(),
  idea: text("idea").notNull(),
  name: text("name").notNull().default(""),
  status: text("status").notNull().default("preview"), // preview | active | paused | completed
  plan: text("plan").notNull().default("free"), // free | sprint | pro
  // JSON array of enabled AgentId values. Empty "[]" = roster not yet approved
  // (the intake gate). Set once the founder approves the proposed crew.
  enabled_agents: text("enabled_agents").notNull().default("[]"),
  // Set when the cabana was started by importing an existing website.
  source_url: text("source_url"),
  // The AgentMail inbox outreach for this cabana sends from, so inbound replies
  // (via the webhook) map back to the right business. Set on first send.
  agentmail_inbox: text("agentmail_inbox"),
  sprint_day: integer("sprint_day").notNull().default(1),
  revenue_goal: text("revenue_goal"),
  current_revenue: integer("current_revenue").notNull().default(0),
  created_at: now(),
});

export const cabanaAgents = pgTable("cabana_agents", {
  id: id(),
  cabana_id: text("cabana_id").notNull(),
  type: text("type").notNull(), // scout | strategist | builder | seller | creator | analyst
  name: text("name").notNull(),
  status: text("status").notNull().default("queued"), // queued | working | done | error
  created_at: now(),
});

export const agentOutputs = pgTable("agent_outputs", {
  id: id(),
  cabana_id: text("cabana_id").notNull(),
  agent_id: text("agent_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  content_json: text("content_json").notNull().default("{}"),
  preview_visible: boolean("preview_visible").notNull().default(true),
  locked: boolean("locked").notNull().default(false),
  status: text("status").notNull().default("draft"), // draft | approved | rejected
  created_at: now(),
});

export const landingPages = pgTable("landing_pages", {
  id: id(),
  cabana_id: text("cabana_id").notNull(),
  slug: text("slug").notNull(),
  sections_json: text("sections_json").notNull().default("[]"),
  published: boolean("published").notNull().default(false),
  cta_url: text("cta_url"),
  created_at: now(),
});

export const plays = pgTable("plays", {
  id: id(),
  cabana_id: text("cabana_id").notNull(),
  agent_type: text("agent_type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  output: text("output"),
  status: text("status").notNull().default("working"), // working | needs_approval | approved | done | rejected
  priority: integer("priority").notNull().default(3),
  created_at: now(),
});

export const signals = pgTable("signals", {
  id: id(),
  cabana_id: text("cabana_id").notNull(),
  type: text("type").notNull(), // page_view | cta_click | signup | outreach_sent | reply | interested_lead | call_booked | payment_click | sale | revenue
  value: integer("value"),
  notes: text("notes"),
  created_at: now(),
});

export const cabanaWorkbenchStates = pgTable("cabana_workbench_states", {
  id: id(),
  user_id: text("user_id").notNull().default("demo"),
  idea: text("idea").notNull(),
  company_context: text("company_context").notNull().default(""),
  sprint_plan: text("sprint_plan").notNull().default(""),
  actions_json: text("actions_json").notNull().default("[]"),
  loop_runs_json: text("loop_runs_json").notNull().default("[]"),
  signals_json: text("signals_json").notNull().default("{}"),
  ai_calls_json: text("ai_calls_json").notNull().default("[]"),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  created_at: now(),
});

// --- Shared infra tables (kept from original) ---

export const agentRuns = pgTable("agent_runs", {
  id: id(),
  workspace_id: text("workspace_id").notNull(),
  thread_id: text("thread_id"),
  agent_type: text("agent_type").notNull(),
  title: text("title").notNull().default("Agent run"),
  status: text("status").notNull().default("running"),
  input: text("input"),
  output: text("output"),
  steps: text("steps").notNull().default("[]"),
  artifacts: text("artifacts").notNull().default("[]"),
  error: text("error"),
  started_at: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finished_at: timestamp("finished_at", { withTimezone: true }),
  created_at: now(),
});

export const approvals = pgTable("approvals", {
  id: id(),
  workspace_id: text("workspace_id").notNull(),
  task_id: text("task_id"),
  status: text("status").notNull().default("open"),
  action: text("action").notNull(),
  notes: text("notes"),
  created_at: now(),
});

// Artifacts table removed — was legacy, never used in Cabana system

export const llmCalls = pgTable("llm_calls", {
  id: id(),
  workspace_id: text("workspace_id").notNull(),
  model_id: text("model_id").notNull(),
  provider: text("provider"),
  operation: text("operation").notNull().default("stream"),
  agent_label: text("agent_label"),
  input_tokens: integer("input_tokens"),
  output_tokens: integer("output_tokens"),
  cached_input_tokens: integer("cached_input_tokens"),
  total_tokens: integer("total_tokens"),
  duration_ms: integer("duration_ms"),
  finish_reason: text("finish_reason"),
  error: text("error"),
  created_at: now(),
});

// --- Generated-app data (centralized, schemaless) ---
// Each business Cabana ships gets one project here. Generated apps write
// arbitrary documents into it via the public ingestion API; Cabana owns the
// store, so the CoS + analytics can read across every project. This is the
// "Cabana owns the infra" model — schemaless on purpose.

export const appProjects = pgTable("app_projects", {
  id: id(),
  // Public, write-only key baked into the generated page and sent on ingest.
  public_key: text("public_key").notNull().$defaultFn(() => crypto.randomUUID()),
  // Loose link back to the cabana that owns this project (prototype-friendly:
  // not a hard FK, since the chat flow doesn't always create a cabana yet).
  cabana_id: text("cabana_id"),
  label: text("label").notNull().default(""),
  created_at: now(),
});

// --- Persistence layer (Sprint 1: Make memory real) ---
// Replaces localStorage seams with durable DB storage. Each table maps to one
// of the four prototype storage points: brief, chat, build, actions.

export const businessBriefs = pgTable("business_briefs", {
  id: id(),
  cabana_id: text("cabana_id"), // loose link — may not exist yet during onboarding
  user_id: text("user_id").notNull(),
  content: text("content").notNull().default(""),
  version: integer("version").notNull().default(1),
  created_at: now(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chatThreads = pgTable("chat_threads", {
  id: id(),
  user_id: text("user_id").notNull(),
  cabana_id: text("cabana_id"),
  title: text("title").notNull().default(""),
  // Full UIMessage[] array serialized as JSON. The AI SDK's useChat manages
  // message IDs, parts, tool states, etc. internally — we store the entire
  // array as one blob so rehydration is a simple parse, preserving structure
  // that a normalized per-message table would lose (tool-call IDs, streaming
  // states, part ordering across multi-step turns).
  messages_json: text("messages_json").notNull().default("[]"),
  created_at: now(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pageVersions = pgTable("page_versions", {
  id: id(),
  cabana_id: text("cabana_id"),
  user_id: text("user_id").notNull(),
  html: text("html").notNull().default(""),
  deploy_url: text("deploy_url"),
  deploy_error: text("deploy_error"),
  deploy_status: text("deploy_status").notNull().default("pending"), // pending | deployed | failed
  project_id: text("project_id"),
  model: text("model"),
  version: integer("version").notNull().default(1),
  update_instruction: text("update_instruction"),
  created_at: now(),
});

export const actions = pgTable("actions", {
  id: id(),
  cabana_id: text("cabana_id"),
  user_id: text("user_id").notNull(),
  title: text("title").notNull(),
  channel: text("channel").notNull().default("manual"),
  details: text("details").notNull().default(""),
  why: text("why").notNull().default(""),
  status: text("status").notNull().default("proposed"), // proposed | needs_approval | approved | running | done | failed | canceled
  risk: text("risk").notNull().default("low"), // low | medium | high
  type: text("type"), // manual | builder_work_order
  agent: text("agent"),
  tool: text("tool"),
  input_json: text("input_json").notNull().default("{}"),
  output_json: text("output_json").notNull().default("{}"),
  result_url: text("result_url"),
  cycle: integer("cycle").notNull().default(0),
  // Builder work order details — null for non-builder actions.
  work_order_json: text("work_order_json"), // { task_type, brief, reason, requires_approval, status }
  created_at: now(),
});

export const userSubscriptions = pgTable("user_subscriptions", {
  id: id(),
  user_id: text("user_id").notNull().unique(),
  stripe_customer_id: text("stripe_customer_id"),
  stripe_subscription_id: text("stripe_subscription_id"),
  status: text("status").notNull().default("none"), // none | trialing | active | canceled | past_due | unpaid
  plan: text("plan").notNull().default("starter"), // starter | pro
  current_period_end: timestamp("current_period_end", { withTimezone: true }),
  trial_ends_at: timestamp("trial_ends_at", { withTimezone: true }),
  credits_remaining: integer("credits_remaining").notNull().default(0),
  created_at: now(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const appDocuments = pgTable("app_documents", {
  id: id(),
  project_id: text("project_id").notNull(),
  // Logical bucket within a project, e.g. "leads", "orders", "signups".
  collection: text("collection").notNull(),
  // The document — any shape the generated app sends.
  data: jsonb("data").notNull().default({}),
  created_at: now(),
});

// Ad / referral attribution captured at the start of onboarding (?ref=, ?utm_*)
// and committed once the visitor signs in. Forwarded to Stripe checkout metadata
// so paid conversions can be attributed back to a source.
export const userAttribution = pgTable("user_attribution", {
  id: id(),
  user_id: text("user_id").notNull().unique(),
  referral_code: text("referral_code"),
  utm_source: text("utm_source"),
  utm_medium: text("utm_medium"),
  utm_campaign: text("utm_campaign"),
  landing_path: text("landing_path"),
  created_at: now(),
});
