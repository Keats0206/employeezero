export type WorkStatus =
  | "queued"
  | "running"
  | "waiting"
  | "needs_review"
  | "blocked"
  | "done"
  | "failed";

export type Priority = "high" | "medium" | "low";
export type Risk = "low" | "medium" | "high";

export type InboxType =
  | "approval"
  | "choice"
  | "review"
  | "escalation"
  | "recommendation";

export type DecisionState = "open" | "resolved" | "deferred";

export interface WorkTask {
  id: string;
  title: string;
  agent: string;
  status: WorkStatus;
  priority: Priority;
  linkedGoal: string;
  output: string;
  needsApproval: boolean;
  lastUpdate: string;
  risk: Risk;
  sprint: string;
  customer?: string;
  experiment?: string;
  brief: string;
  plan: string[];
  logs: string[];
  artifacts: string[];
  dependsOn: string[];
  unblocks: string[];
  memoryUpdates: string[];
}

export interface InboxDecision {
  id: string;
  agent: string;
  type: InboxType;
  state: DecisionState;
  title: string;
  whyItMatters: string;
  risk: Risk;
  recommendation: string;
  preview: string;
  evidence: string[];
  options?: string[];
  downstreamImpact: string[];
  blocking: boolean;
  customerFacing: boolean;
  strategic: boolean;
  lowRiskApproval: boolean;
  linkedTaskId?: string;
}

export const SPRINT = {
  name: "Validate Soupcan for vibe coders",
  goal: "Book 5 customer interviews and test 3 landing page angles",
  timebox: "May 27 - June 3",
  success: "5 calls booked, 3+ strong pain signals, 1 clear ICP winner",
};

export const WORK_TASKS: WorkTask[] = [
  {
    id: "wq_0",
    title: "Orchestrate validation sprint execution",
    agent: "Chief of Staff (COS)",
    status: "running",
    priority: "high",
    linkedGoal: "Validation Sprint",
    output: "Execution plan",
    needsApproval: false,
    lastUpdate: "2m ago",
    risk: "low",
    sprint: "Validation Sprint",
    brief:
      "Coordinate Research, Growth, and Design agents; sequence dependencies and escalate founder decisions.",
    plan: [
      "Review active tasks and blockers",
      "Route blocking decisions into Inbox",
      "Reprioritize dependent work daily",
      "Publish end-of-day operator summary",
    ],
    logs: [
      "10:10 AM - Sequenced outbound flow: leads -> copy -> approval -> send",
      "10:21 AM - Escalated landing page angle decision to Inbox",
      "10:41 AM - Unblocked Design by reordering tasks",
    ],
    artifacts: ["cos_daily_operator_brief.md"],
    dependsOn: ["Current sprint objective"],
    unblocks: ["Research, Growth, and Design execution"],
    memoryUpdates: ["Founder decisions are now routed through COS before execution."],
  },
  {
    id: "wq_1",
    title: "Find 100 Lovable users building SaaS apps",
    agent: "Research Agent",
    status: "running",
    priority: "high",
    linkedGoal: "Validation Sprint",
    output: "Lead list",
    needsApproval: false,
    lastUpdate: "12m ago",
    risk: "low",
    sprint: "Validation Sprint",
    customer: "ICP: Lovable builders",
    experiment: "Outbound v1",
    brief:
      "Find 100 potential users actively building with Lovable, Cursor, v0, or Bolt and likely to care about UI quality.",
    plan: [
      "Search X for 'built with Lovable' and UI complaints",
      "Scan Product Hunt/Indie Hackers mentions",
      "Extract names + project links + pain signals",
      "Score and rank leads by relevance",
    ],
    logs: [
      "10:12 AM - Started search for 'Lovable UI redesign'",
      "10:14 AM - Found 18 relevant X profiles",
      "10:18 AM - Added 7 leads to CRM",
      "10:29 AM - Drafting relevance scores",
    ],
    artifacts: [
      "lead_list_vibe_coders_may27.csv",
      "lead_scoring_notes.md",
      "outreach_angle_recommendations.md",
    ],
    dependsOn: ["ICP definition"],
    unblocks: ["Draft cold email sequence", "Run outbound campaign"],
    memoryUpdates: [
      "Lovable users frequently complain outputs look generic/B2B SaaS.",
    ],
  },
  {
    id: "wq_2",
    title: "Draft outreach emails",
    agent: "Growth Agent",
    status: "waiting",
    priority: "high",
    linkedGoal: "Outbound Campaign",
    output: "Draft email",
    needsApproval: false,
    lastUpdate: "9m ago",
    risk: "medium",
    sprint: "Validation Sprint",
    experiment: "Messaging Angle A/B",
    brief: "Write a 3-email sequence once lead list and positioning are ready.",
    plan: [
      "Generate three angle variants",
      "Personalize intro lines",
      "Create follow-up sequence",
    ],
    logs: ["10:35 AM - Waiting on lead list completion"],
    artifacts: ["outbound_sequence_v1.md"],
    dependsOn: ["Find 100 Lovable users building SaaS apps"],
    unblocks: ["Send outbound batch"],
    memoryUpdates: ["Agencies respond better to revenue-oriented copy."],
  },
  {
    id: "wq_3",
    title: "Approve outbound sequence to 50 leads",
    agent: "Growth Agent",
    status: "blocked",
    priority: "high",
    linkedGoal: "Customer Discovery",
    output: "Approval",
    needsApproval: true,
    lastUpdate: "4m ago",
    risk: "high",
    sprint: "Validation Sprint",
    brief: "Awaiting founder approval to send customer-facing emails.",
    plan: ["Collect approval", "Send first 50", "Track replies in 24h"],
    logs: ["10:48 AM - Approval required before sending"],
    artifacts: ["outbound_sequence_v2.md"],
    dependsOn: ["Founder approval"],
    unblocks: ["Monitor replies", "Book interviews"],
    memoryUpdates: [],
  },
  {
    id: "wq_4",
    title: "Review landing page copy variants",
    agent: "Design Agent",
    status: "needs_review",
    priority: "medium",
    linkedGoal: "Landing Page Test",
    output: "Landing page copy",
    needsApproval: true,
    lastUpdate: "16m ago",
    risk: "medium",
    sprint: "Validation Sprint",
    experiment: "LP Angle Test",
    brief: "Three variants complete and ready for founder choice.",
    plan: ["Generate A/B/C variants", "Map to ICP", "Recommend one"],
    logs: [
      "10:20 AM - Created variant A",
      "10:27 AM - Created variant B",
      "10:32 AM - Recommended variant B",
    ],
    artifacts: ["landing_variant_a.md", "landing_variant_b.md", "landing_variant_c.md"],
    dependsOn: [],
    unblocks: ["Deploy landing page", "Run traffic test"],
    memoryUpdates: ["Non-designers react best to 'make it look real' framing."],
  },
  {
    id: "wq_5",
    title: "Analyze 12 customer replies",
    agent: "Research Agent",
    status: "done",
    priority: "medium",
    linkedGoal: "Validation Sprint",
    output: "Analysis",
    needsApproval: false,
    lastUpdate: "1h ago",
    risk: "low",
    sprint: "Validation Sprint",
    brief: "Summarize pain signals from first outbound batch replies.",
    plan: ["Cluster replies", "Tag signals", "Recommend ICP"],
    logs: ["09:40 AM - Completed synthesis with pain clusters"],
    artifacts: ["reply_analysis_may27.md"],
    dependsOn: [],
    unblocks: ["Adjust outreach targeting"],
    memoryUpdates: ["6/12 replies mention generic AI-generated UI."],
  },
];

export const INBOX_DECISIONS: InboxDecision[] = [
  {
    id: "in_1",
    agent: "Chief of Staff (COS)",
    type: "approval",
    state: "open",
    title: "Approve outbound sequence to 50 Lovable users",
    whyItMatters: "Blocks Growth Agent from starting discovery campaign.",
    risk: "high",
    recommendation:
      "Approve. The sequence is personalized, low-volume, and asks for feedback.",
    preview:
      "Hey Sarah - saw you built with Lovable. Did the UI feel production-ready or need manual polish?",
    evidence: [
      "50 leads match ICP",
      "31 have recent Lovable/Bolt activity",
      "14 mention UI/design pain",
    ],
    downstreamImpact: [
      "Unlock 42 outbound emails",
      "Start reply monitoring task",
      "Feed insights into next sprint messaging",
    ],
    blocking: true,
    customerFacing: true,
    strategic: false,
    lowRiskApproval: false,
    linkedTaskId: "wq_3",
  },
  {
    id: "in_2",
    agent: "Chief of Staff (COS)",
    type: "choice",
    state: "open",
    title: "Choose landing page positioning angle",
    whyItMatters: "Design Agent cannot launch A/B test without final angle.",
    risk: "medium",
    recommendation: "Pick Variant B: 'Make your AI app look real'.",
    preview: "Variant A: one idea, four directions. Variant B: make it look real.",
    evidence: [
      "6/9 interviews mention generic UI",
      "3 users said they need it to look real before sharing",
      "Competitors focus on generation, not polish",
    ],
    options: [
      "A. Design polish for vibe coders",
      "B. Make your AI app look real",
      "C. Your AI design copilot",
    ],
    downstreamImpact: [
      "Deploy page variant",
      "Update outbound messaging",
      "Report conversion in 48h",
    ],
    blocking: true,
    customerFacing: true,
    strategic: true,
    lowRiskApproval: false,
    linkedTaskId: "wq_4",
  },
  {
    id: "in_3",
    agent: "Chief of Staff (COS)",
    type: "recommendation",
    state: "open",
    title: "Shift outreach to agencies this week",
    whyItMatters: "Could increase booking rate during current sprint.",
    risk: "low",
    recommendation:
      "Accept recommendation and route 70% of outreach to agency founders.",
    preview: "Agencies showed 2.1x higher response quality than indie hackers.",
    evidence: [
      "12-reply sample",
      "Higher urgency scores in agency segment",
      "Revenue-oriented message fit is stronger",
    ],
    downstreamImpact: ["Adjust lead scoring", "Regenerate email variants"],
    blocking: false,
    customerFacing: false,
    strategic: true,
    lowRiskApproval: true,
    linkedTaskId: "wq_2",
  },
];
