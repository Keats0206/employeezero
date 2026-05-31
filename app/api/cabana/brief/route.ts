import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/auth";
import { getActiveBrief, upsertBrief } from "@/app/lib/db/persistence";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cabanaId = searchParams.get("cabana") ?? null;

  const brief = await getActiveBrief(session.user.email, cabanaId);
  return NextResponse.json({
    content: brief?.content ?? "",
    updatedAt: brief?.updated_at ? new Date(brief.updated_at).getTime() : null,
    version: brief?.version ?? 0,
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cabanaId = searchParams.get("cabana") ?? null;

  const { content }: { content: string } = await req.json();
  if (typeof content !== "string") return NextResponse.json({ error: "content required" }, { status: 400 });

  const brief = await upsertBrief(session.user.email, content, cabanaId);
  return NextResponse.json({
    content: brief.content,
    updatedAt: new Date(brief.updated_at).getTime(),
    version: brief.version,
  });
}
