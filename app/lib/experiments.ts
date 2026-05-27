export type ExperimentStatus = "draft" | "running" | "paused" | "completed" | "failed";

export type Experiment = {
  id: string;
  name: string;
  hypothesis: string;
  owner: string;
  channel: string;
  status: ExperimentStatus;
  successMetric: string;
  target: string;
  progress: number;
  confidence: number;
  startedAt: string;
  endsAt: string;
};

export const EXPERIMENTS: Experiment[] = [
  {
    id: "exp_1",
    name: "Lovable Outbound v1",
    hypothesis: "Personalized founder outreach will book at least 5 interviews in 7 days.",
    owner: "Growth Agent",
    channel: "Email",
    status: "running",
    successMetric: "Interview booking rate",
    target: ">= 10%",
    progress: 62,
    confidence: 71,
    startedAt: "2026-05-27T09:00:00.000Z",
    endsAt: "2026-06-03T17:00:00.000Z",
  },
  {
    id: "exp_2",
    name: "Landing Page Angle Test",
    hypothesis: "Angle B will outperform Angle A by at least 20% CTR.",
    owner: "Design Agent",
    channel: "Web",
    status: "running",
    successMetric: "CTR uplift",
    target: ">= 20%",
    progress: 44,
    confidence: 58,
    startedAt: "2026-05-27T10:00:00.000Z",
    endsAt: "2026-06-02T17:00:00.000Z",
  },
  {
    id: "exp_3",
    name: "Agency Segment Prioritization",
    hypothesis: "Agency founders produce higher quality call conversions than indie hackers.",
    owner: "Research Agent",
    channel: "Outbound",
    status: "draft",
    successMetric: "Qualified call rate",
    target: ">= 1.5x baseline",
    progress: 12,
    confidence: 49,
    startedAt: "2026-05-28T09:00:00.000Z",
    endsAt: "2026-06-05T17:00:00.000Z",
  },
];
