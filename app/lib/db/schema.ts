import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  pgEnum,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const taskStatus = pgEnum("task_status", [
  "suggested",
  "approved",
  "in_progress",
  "needs_review",
  "done",
  "rejected",
]);

export const goalStatus = pgEnum("goal_status", ["active", "paused", "done"]);

export const riskLevel = pgEnum("risk_level", ["low", "medium", "high"]);

export const memoryType = pgEnum("memory_type", [
  "company",
  "decision",
  "agent_note",
]);

export const artifactType = pgEnum("artifact_type", [
  "daily_brief",
  "task_plan",
  "decision_memo",
  "prd",
  "github_issue",
  "growth_draft",
  "design_critique",
  "code_review",
  "research_note",
]);

export const approvalStatus = pgEnum("approval_status", [
  "pending",
  "approved",
  "rejected",
  "snoozed",
  "archived",
]);

export const agentRunStatus = pgEnum("agent_run_status", [
  "queued",
  "running",
  "succeeded",
  "failed",
]);

export const decisionType = pgEnum("decision_type", [
  "approval",
  "choice",
  "review",
  "escalation",
  "recommendation",
]);

export const decisionStatus = pgEnum("decision_status", [
  "open",
  "resolved",
  "deferred",
  "rejected",
]);

export const toolRiskLevel = pgEnum("tool_risk_level", ["low", "medium", "high"]);

export const toolRunStatus = pgEnum("tool_run_status", [
  "queued",
  "running",
  "succeeded",
  "failed",
  "blocked",
]);

export const connectorKey = pgEnum("connector_key", [
  "google",
  "github",
  "stripe",
]);

export const connectorStatus = pgEnum("connector_status", [
  "not_connected",
  "connected",
  "error",
]);

const id = () =>
  text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`);

const workspaceId = () =>
  text("workspace_id").notNull().default("default");

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const goals = pgTable("goals", {
  id: id(),
  workspace_id: workspaceId(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  why_it_matters: text("why_it_matters").notNull().default(""),
  success_metric: text("success_metric").notNull().default(""),
  status: goalStatus("status").notNull().default("active"),
  deadline: timestamp("deadline", { withTimezone: true }),
  active: boolean("active").notNull().default(false),
  created_at: createdAt(),
});

export const tasks = pgTable("tasks", {
  id: id(),
  workspace_id: workspaceId(),
  goal_id: text("goal_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  status: taskStatus("status").notNull().default("suggested"),
  priority: integer("priority").notNull().default(3),
  risk_level: riskLevel("risk_level").notNull().default("low"),
  output_type: text("output_type").notNull().default("note"),
  created_at: createdAt(),
});

export const artifacts = pgTable("artifacts", {
  id: id(),
  workspace_id: workspaceId(),
  goal_id: text("goal_id"),
  task_id: text("task_id"),
  type: artifactType("type").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  url: text("url"),
  created_by_agent: text("created_by_agent").notNull().default("system"),
  created_at: createdAt(),
});

export const memories = pgTable("memories", {
  id: id(),
  workspace_id: workspaceId(),
  type: memoryType("type").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  importance: integer("importance").notNull().default(1),
  pinned: boolean("pinned").notNull().default(false),
  created_at: createdAt(),
});

export const agentRuns = pgTable("agent_runs", {
  id: id(),
  workspace_id: workspaceId(),
  agent_type: text("agent_type").notNull(),
  status: agentRunStatus("status").notNull().default("queued"),
  input: text("input"),
  output: text("output"),
  error: text("error"),
  created_at: createdAt(),
});

export const approvals = pgTable("approvals", {
  id: id(),
  workspace_id: workspaceId(),
  task_id: text("task_id"),
  artifact_id: text("artifact_id"),
  action: text("action").notNull(),
  status: approvalStatus("status").notNull().default("pending"),
  notes: text("notes").notNull().default(""),
  created_at: createdAt(),
});

export const decisions = pgTable("decisions", {
  id: id(),
  workspace_id: workspaceId(),
  task_id: text("task_id"),
  agent_id: text("agent_id").notNull(),
  type: decisionType("type").notNull(),
  status: decisionStatus("status").notNull().default("open"),
  title: text("title").notNull(),
  why_it_matters: text("why_it_matters").notNull().default(""),
  recommendation: text("recommendation").notNull().default(""),
  evidence: text("evidence").notNull().default(""),
  created_at: createdAt(),
});

export const toolRegistry = pgTable("tool_registry", {
  id: id(),
  workspace_id: workspaceId(),
  key: text("key").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  input_schema: text("input_schema").notNull().default("{}"),
  risk_level: toolRiskLevel("risk_level").notNull().default("low"),
  requires_approval: boolean("requires_approval").notNull().default(false),
  enabled: boolean("enabled").notNull().default(true),
  created_at: createdAt(),
});

export const agentToolPermissions = pgTable("agent_tool_permissions", {
  id: id(),
  workspace_id: workspaceId(),
  agent_id: text("agent_id").notNull(),
  tool_key: text("tool_key").notNull(),
  allowed: boolean("allowed").notNull().default(true),
  created_at: createdAt(),
});

export const toolRuns = pgTable("tool_runs", {
  id: id(),
  workspace_id: workspaceId(),
  task_id: text("task_id"),
  decision_id: text("decision_id"),
  agent_id: text("agent_id").notNull(),
  tool_key: text("tool_key").notNull(),
  status: toolRunStatus("status").notNull().default("queued"),
  input: text("input").notNull().default("{}"),
  output: text("output"),
  error: text("error"),
  duration_ms: integer("duration_ms"),
  estimated_cost_usd_cents: integer("estimated_cost_usd_cents"),
  requires_approval: boolean("requires_approval").notNull().default(false),
  created_at: createdAt(),
});

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => ({
    compoundKey: primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  })
);

export const connectors = pgTable("connectors", {
  id: id(),
  workspace_id: workspaceId(),
  key: connectorKey("key").notNull(),
  label: text("label").notNull(),
  status: connectorStatus("status").notNull().default("not_connected"),
  scopes: text("scopes").notNull().default(""),
  account_ref: text("account_ref"),
  last_synced_at: timestamp("last_synced_at", { withTimezone: true }),
  last_error: text("last_error"),
  created_at: createdAt(),
});

export const connectorEvents = pgTable("connector_events", {
  id: id(),
  workspace_id: workspaceId(),
  connector_id: text("connector_id").notNull(),
  connector_key: connectorKey("connector_key").notNull(),
  actor_user_id: text("actor_user_id"),
  action: text("action").notNull(),
  status: text("status").notNull(),
  detail: text("detail").notNull().default(""),
  created_at: createdAt(),
});
