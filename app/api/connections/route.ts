import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/auth";
import { getArcade, ARCADE_PROVIDERS, arcadeUserId } from "@/app/lib/arcade";

export const runtime = "nodejs";

// GET /api/connections — list each provider with its current connection status
// for the signed-in user. Status comes from Arcade's auth.status check.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = arcadeUserId(session.user.email);

  const arcade = getArcade();

  const connections = await Promise.all(
    ARCADE_PROVIDERS.map(async (p) => {
      try {
        const res = await arcade.auth.start(userId, p.id, { scopes: p.scopes });
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          connected: res.status === "completed",
          // If not yet connected, Arcade returns an OAuth url to open.
          authUrl: res.status === "completed" ? null : res.url ?? null,
        };
      } catch {
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          connected: false,
          authUrl: null,
        };
      }
    })
  );

  return NextResponse.json({ connections });
}
