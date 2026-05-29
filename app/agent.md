# Agent System Roster

## Live Product Agents
- Strategist (`strategist`) - Strategy Lead
- Researcher (`researcher`) - Market Lead
- Builder (`builder`) - Engineering Lead
- GTM (`gtm`) - Go-To-Market Operator
- Sales (`sales`) - Sales Operator (currently not live in home view)

## Live Product Agent Skills
- Strategist: framing wedge, sizing ICP, drafting business brief
- Researcher: scanning competitors, mining pain quotes, designing validation experiments
- Builder: checking validation signal, scoping the thinnest build, deploying preview
- GTM: defining GTM thesis, sequencing channels, shipping first campaign sprint
- Sales: sourcing hiring managers, drafting outreach, queueing first sends

## Catalog Agents
- Chief of Staff (COS) (`chief-of-staff-cos`)
- Research Agent (`research-agent`)
- Growth Agent (`growth-agent`)
- Sales Agent (`sales-agent`)
- Product Agent (`product-agent`)
- Engineering Agent (`engineering-agent`)
- Design Agent (`design-agent`)
- Finance/Ops Agent (`finance-ops-agent`)

## Catalog Agent Starter Tools
- Chief of Staff (COS): `tasks.create`, `inbox.create_decision`, `memory.write`, `agents.reprioritize`
- Research Agent: `web.search`, `web.fetch`, `crm.read`, `notes.write`
- Growth Agent: `gmail.draft`, `campaigns.create`, `analytics.read`, `docs.write`
- Sales Agent: `crm.read`, `crm.write`, `gmail.draft`, `call_log.write`
- Product Agent: `docs.write`, `tasks.create`, `experiments.create`, `memory.read`
- Engineering Agent: `github.read`, `github.write`, `ci.run`, `deploy.preview`
- Design Agent: `figma.read`, `docs.write`, `experiments.create`, `feedback.cluster`
- Finance/Ops Agent: `billing.read`, `spend.read`, `sheets.write`, `risk.report`

## GTM Agent Recommended Skill Pack
- ICP + segment builder
- Positioning + message matrix
- Cold outbound composer (email + LinkedIn)
- Social content drafting
- Landing page copy drafting
- 2-week experiment planner
- Weekly reporting summarizer

## Operating Cadence
- Default route for new startup ideas: Strategy -> Research.
- Builder should run after a specific website/UI request or after a validation gate clears.
- Every sprint should name the riskiest assumption, the smallest customer-facing test, and the evidence threshold required before product scope expands.
