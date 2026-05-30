# Cabana Product Roadmap

> **Cabana turns an idea into a live business experiment, then keeps improving it until it gets customers.**

The sequence: persistence → experiments → metrics → CRM → page updates → email → payments → ads → autonomy.

The product organizes around **experiments**, not websites. Every feature answers: what experiment is this part of, what metric does it move, what did we learn, what should Cabana do next.

---

## 00 — Core objects

Define the product architecture around 7 standard objects before adding more integrations.

- [x] **Cabana** — business container · name, founder, niche, goal, brand vibe, status
- [ ] **BusinessBrief** — long-term memory · idea, offer, ICP, positioning, constraints, CoS summary
- [ ] **Experiment** — unit of progress · hypothesis, offer, channel, goal metric, result, decision
- [ ] **ProductPage** — deployed site · URL, HTML version, copy, form schema, deployment status
- [ ] **Lead** — lightweight CRM · name, email, source, status, score, next follow-up
- [ ] **Action** — AI task queue · title, agent, risk, approval, tool, status, result
- [ ] **MetricEvent** — analytics spine · page_view, form_submit, CTA_click, email_sent, payment

---

## 01 — Make memory real

Turn the prototype into a product. Everything persists to DB, not localStorage.

- [ ] Business Brief in DB · one active brief per Cabana, version history, CoS auto-saves
- [ ] Brief version restore · restore previous version, diff view of what changed
- [ ] Chat history in DB · threads, messages, tool calls, agent outputs — linked to Cabana
- [ ] Build state in DB · current page HTML, deploy URL, logs, version number, rollback points
- [ ] Action queue in DB · statuses: proposed → needs_approval → approved → running → done → failed
- [ ] Action retry + risk labels · retry failed actions, risk tags per action, approval buttons in Desk

---

## 02 — Experiment system

Move from "Cabana built me a page" to "Cabana is running a business test."

- [ ] Experiments table · hypothesis, audience, offer, channel, page, campaign, goal metric
- [ ] CoS experiment creation tool · CoS proposes, founder approves, experiment gets its own scorecard
- [ ] Experiment lifecycle · draft → approved → building → live → running → reviewing → complete
- [ ] Launch experiment flow · Scout validates → Strategist positions → Builder builds → Seller campaigns → Analyst sets metrics
- [ ] Experiment scorecard UI · hypothesis, goal, current result, confidence, CoS recommendation: continue / pivot / kill / scale
- [ ] Link everything to experiment · Brief, ProductPage, Leads, Actions, Metrics all point at active experiment

---

## 03 — Metrics and analytics

Cabana can see what is happening on generated pages.

- [ ] Tracking script on generated pages · page_view, CTA_click, form_start, form_submit, checkout_click, outbound, source, UTM, session
- [ ] MetricEvents table · event type, value, page ID, experiment ID, timestamp
- [ ] Metrics dashboard in Desk · visitors, conversion rate, leads, CTA clicks, top source, experiment progress
- [ ] Daily event aggregation + trends · conversion funnel, leads by source, campaign performance
- [ ] Analyst metrics review · daily/weekly summary, what changed, what's broken, next action — auto-creates actions from insights

---

## 04 — Lightweight CRM

Leads become business opportunities, not random form submissions.

- [ ] Leads table · name, email, phone, company, message, source, status, score, next follow-up
- [ ] Leads tab in Desk · list view, detail panel, statuses: new → contacted → replied → interested → booked → customer → lost
- [ ] Lead scoring · score by completeness, ICP fit, source, urgency; recommend next action
- [ ] Draft reply button · Seller drafts a reply to the lead, founder approves
- [ ] Follow-up reminders · auto-create follow-up action after X days of no reply

---

## 05 — Page editing & versioning

Cabana can update the product repeatedly, not just build once.

- [ ] Page versioning · store every deployed HTML, edit instruction, agent, timestamp, preview URL, rollback
- [ ] Update my page flow · user says "make it more premium" → CoS routes to Builder → update plan → approve → deploy
- [ ] Instruction-based section editing · click a section, say the edit, Builder updates just that section, preview diff, approve
- [ ] Page blocks system · store page as JSON blocks (hero, proof, problem, benefits, pricing, FAQ, form) — regenerate/reorder individually

---

## 06 — Gmail drafts

First external action bridge. Safest automation to start with.

- [x] Arcade Gmail connection check · verify connection before offering email actions
- [ ] Create Gmail drafts tool · Seller drafts outreach, CoS asks for approval, creates 5–10 drafts, links to leads/actions
- [ ] Email sending with approval · send tool, user approval required, 5 emails at first then 25/day, log sends
- [ ] Reply monitoring · search Gmail for replies, match to campaign, update lead status, extract objections, create follow-up action
- [ ] Follow-up drafts · detect no-reply after X days, draft follow-up; detect interest, draft response; detect objection, draft rebuttal

---

## 07 — Stripe & payments

Turn interest into revenue.

- [ ] Stripe connection · user connects their own Stripe account, store account ID, test/live mode
- [ ] Create checkout link · CoS recommends pricing → founder approves → create product + price + checkout link → add to page → track clicks
- [ ] Stripe webhooks · checkout.session.completed, payment_intent.succeeded, subscription events → create customer record, add revenue metric
- [ ] Revenue dashboard · revenue, customers, conversion rate, MRR, total sales, revenue by experiment, CoS summary

---

## 08 — Google Ads draft mode

Cabana can create and manage small validation ad tests.

- [ ] Google Ads OAuth connection · account selection, spend permissions, connection status in Settings
- [ ] Campaign drafting · Strategist picks type, Seller writes copy, Analyst sets budget, Builder ensures page is ready, CoS presents draft
- [ ] Launch approved test · explicit approval, budget cap, create campaign + ad group + ads + keywords, default $10/day for 3 days
- [ ] Pull Google Ads metrics · impressions, clicks, CTR, CPC, spend, conversions, cost/lead, keyword performance — linked to experiment
- [ ] Ads optimization recommendations · Analyst reviews, flags poor keywords, suggests copy/budget/page changes, creates approval actions

---

## 09 — Optimization loop

The product becomes an operator — reads metrics, acts on them, learns.

- [ ] Conversion-based page updates · Analyst detects weak CTA/leads/checkout → suggests update → Builder creates variant → track before/after
- [ ] A/B testing lite · create page variant, split traffic 50/50, track conversion by variant, Analyst picks winner, founder approves
- [ ] Weekly operator loop · review metrics → review leads → identify bottleneck → propose next experiment → update page → draft campaign → track → summarize → update Brief → queue next

---

## 10 — Social & content automation

Cabana can drive attention, not just email/ads.

- [ ] X draft/post via Arcade · Creator drafts, CoS explains purpose, user approves, post or schedule, pull engagement metrics
- [ ] Reddit drafts · Scout finds subreddits, Creator drafts value-first posts, bias toward drafting not auto-posting
- [ ] Content calendar · 7-day calendar linked to experiment, status: draft → approved → posted → performed, Analyst reviews resonance

---

## 11 — Workbench & operating system

The user opens Cabana and knows exactly what the business needs next.

- [ ] Home dashboard · active experiment, live page URL, latest metrics, latest leads, pending approvals, next action, revenue
- [ ] Approval center · all pending approvals grouped by risk (low: copy edits, medium: email drafts, high: ad spend/payments), batch approve, edit before approve
- [ ] Business timeline · chronological: brief created → experiment launched → page live → first lead → first email → first reply → first payment → page updated

---

## 12 — Automation guardrails

Cabana can act more autonomously without scaring users.

- [ ] Permissions system · per-Cabana toggles: can draft? send emails? post to X? spend ad budget? update site? change pricing? reply to leads? — levels: never / ask / allow within limits / fully allow
- [ ] Budget & action limits · max emails/day, max ad spend/day+month, allowed geos/channels, auto-pause on poor performance, emergency stop button
- [ ] Automation modes · Manual (recommend only) → Assisted (draft + approve) → Autopilot Lite (act within limits) → Autopilot (run playbooks, report back)

---

## 13 — Playbooks

Make Cabana repeatably good at specific business types.

- [ ] Local lead gen playbook · niche selector, local landing page, Google Maps sourcing, cold email drafts, lead tracking, follow-ups, call booking CTA
- [ ] AI service agency playbook · pick niche + AI offer, generate demo page + case study proof, draft outreach, create proposal + Stripe checkout
- [ ] Digital product playbook · pick pain, create product concept, generate page + deliverable PDF/template, create checkout, track purchases
- [ ] Affiliate microsite playbook · pick niche, generate content plan + microsite, add affiliate links, track outbound clicks, recommend SEO updates

---

## 14 — Production quality

Make it reliable enough that users trust it with real work.

- [x] AI call logging + /dev inspector · session token tracking, cost display, per-agent streams
- [ ] Test runner + unit/integration tests · agent tools, deploy, lead capture, email draft creation
- [ ] Error logging + tool call retries · failed action recovery, admin inspector
- [ ] Billing for Cabana itself · Free: 1 Cabana, 1 page, limited runs. Starter $29–49. Builder $99. Operator $199–299 with automations.
- [ ] Upgrade moments · paywall after Brief is complete, before live deploy, before Gmail drafts, after first lead, before custom domain/Stripe

---

The weekly operator loop — the actual "Employee Zero" promise:

review metrics → review leads → identify bottleneck → propose next experiment → update page → draft campaign → track results → summarize learning → update Brief → queue next actions.
