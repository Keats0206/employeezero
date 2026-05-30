import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/auth";
import { getArcade, findProvider, arcadeUserId } from "@/app/lib/arcade";

export const runtime = "nodejs";

// POST /api/connections/:provider — start (or resume) the OAuth flow for one
// provider and return the URL the user should open to authorize, plus the
// current status (already "completed" if they connected before).
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = arcadeUserId(session.user.email);

  const { provider } = await params;
  const cfg = findProvider(provider);
  if (!cfg) return NextResponse.json({ error: "Unknown provider" }, { status: 404 });

  const arcade = getArcade();
  const res = await arcade.auth.start(userId, cfg.id, { scopes: cfg.scopes });

  return NextResponse.json({
    connected: res.status === "completed",
    authUrl: res.url ?? null,
  });
}
