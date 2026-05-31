import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/auth";
import { getOrCreateThread, getThreadMessages, saveThreadMessages, clearThread } from "@/app/lib/db/persistence";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cabanaId = searchParams.get("cabana") ?? null;

  const messagesJson = await getThreadMessages(session.user.email, cabanaId);
  let messages: unknown[] = [];
  try { messages = JSON.parse(messagesJson); } catch { /* empty */ }

  return NextResponse.json({ messages });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cabanaId = searchParams.get("cabana") ?? null;

  const { messages } = await req.json();
  await saveThreadMessages(session.user.email, JSON.stringify(messages ?? []), cabanaId);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cabanaId = searchParams.get("cabana") ?? null;

  await clearThread(session.user.email, cabanaId);
  return NextResponse.json({ ok: true });
}
