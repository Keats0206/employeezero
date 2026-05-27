export type AgentProfile = {
  id: string;
  name: string;
  summary: string;
  responsibilities: string[];
  defaultOutputs: string[];
  starterTools: string[];
};

export const AGENT_CATALOG: AgentProfile[] = [
  {
    id: "chief-of-staff-cos",
    name: "Chief of Staff (COS)",
    summary: "Orchestrates cross-agent execution, dependency sequencing, and founder decision routing.",
    responsibilities: [
      "Translate sprint goals into coordinated multi-agent task plans",
      "Manage dependencies, priorities, and blocker escalation",
      "Route approvals/choices into Inbox with clear recommendations",
    ],
    defaultOutputs: ["Daily Operator Brief", "Execution Plan", "Decision Packet"],
    starterTools: ["tasks.create", "inbox.create_decision", "memory.write", "agents.reprioritize"],
  },
  {
    id: "research-agent",
    name: "Research Agent",
    summary: "Runs customer discovery research, pain mining, and evidence synthesis.",
    responsibilities: [
      "Analyze Reddit/X/forum conversations for pain signals",
      "Collect and cluster customer language",
      "Summarize evidence gaps before build",
    ],
    defaultOutputs: ["Problem Brief", "Evidence Log", "Opportunity Map"],
    starterTools: ["web.search", "web.fetch", "crm.read", "notes.write"],
  },
  {
    id: "growth-agent",
    name: "Growth Agent",
    summary: "Builds messaging, channels, and campaign experiments for traction.",
    responsibilities: [
      "Draft positioning and channel strategy",
      "Create launch and funnel experiments",
      "Track response and conversion hypotheses",
    ],
    defaultOutputs: ["Messaging Matrix", "GTM Sprint Plan", "Channel Experiments"],
    starterTools: ["gmail.draft", "campaigns.create", "analytics.read", "docs.write"],
  },
  {
    id: "sales-agent",
    name: "Sales Agent",
    summary: "Creates outreach flows, qualification scripts, and follow-up sequences.",
    responsibilities: [
      "Generate ICP-targeted outreach copy",
      "Create qualification and objection-handling scripts",
      "Define follow-up cadence",
    ],
    defaultOutputs: ["Outreach Sequence", "Call Script", "Objection Bank"],
    starterTools: ["crm.read", "crm.write", "gmail.draft", "call_log.write"],
  },
  {
    id: "product-agent",
    name: "Product Agent",
    summary: "Turns insights into product hypotheses, specs, and validation plans.",
    responsibilities: [
      "Translate discovery into product hypotheses",
      "Scope minimal experiments",
      "Maintain assumption-to-feature traceability",
    ],
    defaultOutputs: ["Hypothesis Backlog", "PRD Draft", "Experiment Spec"],
    starterTools: ["docs.write", "tasks.create", "experiments.create", "memory.read"],
  },
  {
    id: "engineering-agent",
    name: "Engineering Agent",
    summary: "Ships implementation tasks, integrations, and prototype infrastructure.",
    responsibilities: [
      "Implement scoped product changes",
      "Wire integrations and automation hooks",
      "Harden runtime and deployment paths",
    ],
    defaultOutputs: ["Code PR", "Integration Patch", "Deployment Notes"],
    starterTools: ["github.read", "github.write", "ci.run", "deploy.preview"],
  },
  {
    id: "design-agent",
    name: "Design Agent",
    summary: "Designs user flows, UX copy, and high-conversion interface variants.",
    responsibilities: [
      "Design key user flows and layout options",
      "Draft UX and conversion copy",
      "Run design critique loops",
    ],
    defaultOutputs: ["Wireframe Spec", "UX Copy Set", "Design Critique"],
    starterTools: ["figma.read", "docs.write", "experiments.create", "feedback.cluster"],
  },
  {
    id: "finance-ops-agent",
    name: "Finance/Ops Agent",
    summary: "Models unit economics, runway impact, and operational constraints.",
    responsibilities: [
      "Estimate CAC/LTV and burn implications",
      "Model scenario-level runway impact",
      "Flag operational bottlenecks",
    ],
    defaultOutputs: ["Unit Economics Snapshot", "Runway Model", "Ops Risk Memo"],
    starterTools: ["billing.read", "spend.read", "sheets.write", "risk.report"],
  },
];
