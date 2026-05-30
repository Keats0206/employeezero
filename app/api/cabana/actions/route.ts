import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/auth";
import { getUserActions, insertAction, updateActionStatus } from "@/app/lib/db/persistence";

export const runtime = "nodejs";

// GET /api/cabana/actions — load all actions for the current user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const list = await getUserActions(session.user.email);
  return NextResponse.json({ actions: list });
}

// POST /api/cabana/actions — create a new action
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: {
    title: string;
    channel?: string;
    details?: string;
    why?: string;
    status?: string;
    risk?: string;
    agent?: string;
    cycle?: number;
  } = await req.json();

  const action = await insertAction({
    userId: session.user.email,
    title: body.title,
    channel: body.channel,
    details: body.details,
    why: body.why,
    status: body.status,
    risk: body.risk,
    agent: body.agent,
    cycle: body.cycle,
  });

  return NextResponse.json(action);
}

// PATCH /api/cabana/actions — update an action's status
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, status, outputJson, resultUrl }: {
    id: string;
    status: string;
    outputJson?: string;
    resultUrl?: string;
  } = await req.json();

  await updateActionStatus(id, status, { outputJson, resultUrl });
  return NextResponse.json({ ok: true });
}
