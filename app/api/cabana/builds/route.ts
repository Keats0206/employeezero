import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/auth";
import { getLatestPageVersion, insertPageVersion } from "@/app/lib/db/persistence";

export const runtime = "nodejs";

// GET /api/cabana/builds — load the latest build/page state
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const latest = await getLatestPageVersion(session.user.email);
  if (!latest) return NextResponse.json({ status: "idle" });

  return NextResponse.json({
    status: latest.deploy_status === "deployed" ? "done" : "idle",
    html: latest.html,
    url: latest.deploy_url,
    projectId: latest.project_id,
    version: latest.version,
    error: latest.deploy_status === "failed" ? "Deploy failed" : undefined,
  });
}

// POST /api/cabana/builds — save a completed build
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: {
    html: string;
    deployUrl?: string | null;
    deployStatus?: string;
    projectId?: string | null;
    updateInstruction?: string | null;
  } = await req.json();

  const row = await insertPageVersion({
    userId: session.user.email,
    html: body.html,
    deployUrl: body.deployUrl,
    deployStatus: body.deployStatus ?? "deployed",
    projectId: body.projectId,
    updateInstruction: body.updateInstruction,
  });

  return NextResponse.json(row);
}
