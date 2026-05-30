import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/auth";
import { getOrCreateThread, getThreadMessages, saveThreadMessages, clearThread } from "@/app/lib/db/persistence";

export const runtime = "nodejs";

// GET /api/cabana/chat-history — load messages for the active thread
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const messagesJson = await getThreadMessages(session.user.email);
  let messages: unknown[] = [];
  try {
    messages = JSON.parse(messagesJson);
  } catch { /* empty thread */ }

  return NextResponse.json({ messages });
}

// POST /api/cabana/chat-history — save the full UIMessage[] array
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messages } = await req.json();
  await saveThreadMessages(session.user.email, JSON.stringify(messages ?? []));

  return NextResponse.json({ ok: true });
}

// DELETE /api/cabana/chat-history — clear the thread (new chat)
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await clearThread(session.user.email);
  return NextResponse.json({ ok: true });
}
