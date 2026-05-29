import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

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

export const artifacts = pgTable("artifacts", {
  id: id(),
  workspace_id: text("workspace_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  url: text("url"),
  created_by_agent: text("created_by_agent").notNull().default("system"),
  created_at: now(),
});

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
