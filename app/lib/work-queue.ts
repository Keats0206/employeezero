export type QueueStatus = "Queued" | "In progress" | "Done" | "Blocked";

export type QueueTask = {
  id: string;
  title: string;
  agent: string;
  status: QueueStatus;
  needsApproval: boolean;
  progress: number;
  elapsed: string;
  credits: number;
  logs: string[];
};

export const WORK_QUEUE_TASKS: QueueTask[] = [
  {
    id: "wq_1",
    title: "Build lead list of 100 vibe coders",
    agent: "Sales",
    status: "Done",
    needsApproval: false,
    progress: 100,
    elapsed: "14m 10s",
    credits: 38,
    logs: [
      "[10:02:11] Pulled target channels: X, Reddit, Discord",
      "[10:05:02] Expanded candidate handles from keyword graph",
      "[10:09:33] Deduplicated list to 127",
      "[10:14:10] Scored and trimmed final list to 100",
    ],
  },
  {
    id: "wq_2",
    title: "Draft cold outreach sequence",
    agent: "Growth",
    status: "Done",
    needsApproval: true,
    progress: 100,
    elapsed: "11m 44s",
    credits: 31,
    logs: [
      "[10:22:08] Generated 3 hook variants",
      "[10:25:19] Wrote first-touch + follow-up sequence",
      "[10:30:11] Added objection handling snippets",
      "[10:33:52] Marked for founder approval",
    ],
  },
  {
    id: "wq_3",
    title: "Generate landing page v2",
    agent: "Design",
    status: "In progress",
    needsApproval: true,
    progress: 64,
    elapsed: "08m 32s",
    credits: 27,
    logs: [
      "[10:40:03] Selected positioning angle: clarity over hype",
      "[10:43:19] Drafted hero + social proof section",
      "[10:46:28] Running CTA copy A/B generation",
      "[10:48:35] Waiting on image direction signal",
    ],
  },
  {
    id: "wq_4",
    title: "Analyze 12 customer replies",
    agent: "Research",
    status: "Done",
    needsApproval: false,
    progress: 100,
    elapsed: "09m 17s",
    credits: 33,
    logs: [
      "[11:05:05] Ingested inbound replies",
      "[11:08:40] Clustered themes: trust, setup time, ROI proof",
      "[11:11:07] Tagged urgency and buying intent",
      "[11:14:22] Output summary ready",
    ],
  },
  {
    id: "wq_5",
    title: "Create GitHub PR for new hero copy",
    agent: "Engineering",
    status: "Done",
    needsApproval: true,
    progress: 100,
    elapsed: "12m 08s",
    credits: 29,
    logs: [
      "[11:20:31] Updated hero copy in UI component",
      "[11:23:09] Ran build and snapshot checks",
      "[11:27:50] Opened PR with context + screenshots",
      "[11:32:39] Awaiting merge approval",
    ],
  },
];
