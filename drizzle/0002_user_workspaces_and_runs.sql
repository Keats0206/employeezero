CREATE TABLE "workspaces" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text DEFAULT 'Default workspace' NOT NULL,
	"owner_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'owner' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_runs" ADD COLUMN "thread_id" text;
--> statement-breakpoint
ALTER TABLE "agent_runs" ADD COLUMN "experiment_id" text;
--> statement-breakpoint
ALTER TABLE "agent_runs" ADD COLUMN "tool_call_id" text;
--> statement-breakpoint
ALTER TABLE "agent_runs" ADD COLUMN "title" text DEFAULT 'Agent run' NOT NULL;
--> statement-breakpoint
ALTER TABLE "agent_runs" ADD COLUMN "steps" text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE "agent_runs" ADD COLUMN "artifacts" text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE "agent_runs" ADD COLUMN "started_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "agent_runs" ADD COLUMN "finished_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "chat_threads" ADD COLUMN "experiment_id" text;
