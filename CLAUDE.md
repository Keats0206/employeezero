# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Cabana — an AI crew that turns a one-line internet business idea into a validated go-to-market plan, a deployed landing page, and an ongoing execution loop run by a Chief of Staff. Next.js 16 (App Router) + React 19, Tailwind 4, Drizzle ORM on Neon Postgres, NextAuth, and the Vercel AI SDK v6 routed through the AI Gateway.

## Commands

```bash
npm run dev          # next dev — http://localhost:3000
npm run build        # next build
npm run lint         # eslint
npm run db:push      # drizzle-kit push — sync schema.ts to Neon
npm run db:seed      # tsx scripts/seed.ts (loads .env.local)
npm run db:studio    # drizzle-kit studio
```

There is no test runner configured. Dogfood changes against `/dev` (see below).

## The two agent systems

The repo carries two generations of agents. Don't conflate them.

1. **Cabana (current, the home page)** — 6 fixed agents defined in `app/lib/cabana-config.ts`: `scout, strategist, builder, seller, creator, analyst`. This is what `app/page.tsx`, `/preview`, `/dashboard`, and `/dev` drive.
2. **Legacy agent roster** — `app/agent.md`, `app/lib/agent-config.ts`, `app/lib/agents/runner.ts`, and the `/api/agents`, `/api/strategist`, `/api/sprints` routes. Older strategist/researcher/builder/gtm/sales model. Still present; not the current product surface. Prefer the Cabana system for new work unless explicitly touching the legacy flow.

## Cabana architecture

**Single source of truth: `app/lib/cabana-config.ts`.** Agent order, per-agent model assignment (`AGENT_MODELS`), pricing (`MODEL_PRICING` / `estimateCost`), output type shapes (`AgentOutputs`), display metadata, and the beach-palette colors all live here. Touch this file when adding/changing an agent rather than editing call sites.

Per-agent model choice is deliberate: schema-strict agents and the Builder use the stronger model (`claude-sonnet-4-6`), the looser free-text agents stay on `claude-haiku-4-5` for cost. Models are gateway `provider/model` strings — keep using the AI Gateway, not provider-specific packages.

**Three runtime flows:**

- **Generate** (`app/api/cabana/generate/route.ts`) — fans the idea out to the 6 agents in parallel. Each uses `streamObject` against a Zod schema (defined inline in the route). `runtime = "nodejs"`, `maxDuration = 120`. Schemas here use loose `.min/.max` array bounds for resilient streaming.
- **CoS loop** (`app/api/cos/loop/route.ts` → `app/lib/agents/cos-workbench.ts`) — one execution cycle: the Chief of Staff reads current state (outputs, signals, actions, founder brief, sprint plan), decides which specialists to run, mutates the plan, and escalates if blocked. Two modes: `plan_only` (cheap plan movement) and `run_agents` (also produces specialist artifacts). The CoS model is set in `cos-workbench.ts`/`cos.ts` (currently `deepseek/deepseek-v3.2`). Note `cos.ts` defines stricter `.length()` schemas than the generate route — they are intentionally separate.
- **Build & deploy** (`app/api/cabana/deploy/route.ts` → `app/lib/agents/builder.ts`) — the Builder writes landing-page HTML and deploys it to a **Vercel Sandbox** (`@vercel/sandbox`), streaming SSE phase/code/html/complete events. `maxDuration = 300`. Two task types: `new_site` and `product_update` (update is chosen when `existingHtml` + `updateInstruction` are both present).

**`/dev` (`app/dev/page.tsx`)** is the dev-only inspector for all of the above: live per-agent streams, parsed output, model, token usage, estimated cost, timing, the CoS loop runner, the actions queue, and company context. Hidden in production. This is the primary place to verify changes end to end — use it instead of writing tests.

## Data layer

Drizzle + Neon (`app/lib/db/index.ts` exports `db`). `DATABASE_URL` is required at import time — it throws without it. Schema in `app/lib/db/schema.ts` (all `pgTable`). Cabana-specific reads/writes go through `app/lib/db/cabana-queries.ts`; legacy through `queries.ts`. Key Cabana tables: `cabanas`, `cabanaAgents`, `agentOutputs`, `landingPages`, `plays`, `signals`, `cabanaWorkbenchStates`, plus `agentRuns`, `approvals`, `artifacts`, `llmCalls` for observability. There is a single-workspace constant `WORKSPACE_ID = "local-workspace"`. NextAuth tables (`users`, `accounts`, `sessions`, `verificationTokens`) use the Drizzle adapter.

## Brand / design system

Black/white canvas, Turquoise Surf (`#23b5d3`) accent over a beach palette, pill buttons, no shadows — Cash App-inspired. Each agent has an assigned accent hex in `AGENT_COLOR`. Keep new UI consistent with this; don't introduce drop shadows or off-brand colors.

## Env

`.env.local` holds `DATABASE_URL` (Neon) and the AI Gateway / provider keys. Env vars are managed through Vercel (`vercel env`). The seed script reads `.env.local` explicitly.

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
