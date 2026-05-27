import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const REPO = process.env.GITHUB_REPO ?? "Keats0206/employeezero";
const MODEL = process.env.ISSUE_MODEL ?? "anthropic/claude-sonnet-4-6";

const EnhancedIssue = z.object({
  title: z.string().describe("Concise, imperative title under 70 chars"),
  body: z.string().describe("Markdown body with sections: Problem, Acceptance Criteria, Suggested Approach, Files to Look At"),
  labels: z.array(z.string()).describe("0-3 labels from: bug, feature, ux, content, infra, agent"),
});

export async function POST(req: Request) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "GITHUB_TOKEN not set" }, { status: 500 });
  }

  const { kind, summary, details, page, userAgent } = await req.json();
  if (!summary || typeof summary !== "string") {
    return NextResponse.json({ error: "summary required" }, { status: 400 });
  }

  const { object } = await generateObject({
    model: MODEL,
    schema: EnhancedIssue,
    prompt: [
      `You are triaging user feedback on employeezero, a Next.js app the user is dogfooding.`,
      `Kind: ${kind ?? "feedback"}`,
      `Page: ${page ?? "unknown"}`,
      `User agent: ${userAgent ?? "unknown"}`,
      `Summary: ${summary}`,
      `Details: ${details ?? "(none)"}`,
      ``,
      `Produce a GitHub issue that an autonomous coding agent could pick up and ship.`,
      `Be concrete. If it's a bug, include repro steps. If it's a feature, include acceptance criteria.`,
      `Reference the page route under "Files to Look At" — guess the likely file path (e.g. app/inbox/InboxPageClient.tsx).`,
    ].join("\n"),
  });

  const res = await fetch(`https://api.github.com/repos/${REPO}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      title: object.title,
      body: `${object.body}\n\n---\n_Filed from app on \`${page ?? "unknown"}\`_`,
      labels: object.labels,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: `GitHub ${res.status}: ${text}` }, { status: 502 });
  }

  const issue = await res.json();
  return NextResponse.json({ url: issue.html_url, number: issue.number, title: object.title });
}
