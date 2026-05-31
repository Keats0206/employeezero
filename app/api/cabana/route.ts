import { requireAuth, unauthorizedResponse } from "@/app/lib/auth-helpers";
import { createCabana, getUserCabanas } from "@/app/lib/db/cabana-queries";
import type { AgentOutputs } from "@/app/lib/cabana-config";

export const runtime = "nodejs";

// GET /api/cabana — list all user's cabanas
export async function GET() {
  try {
    const { userId } = await requireAuth();
    const cabanas = await getUserCabanas(userId);
    return Response.json({ cabanas });
  } catch {
    return unauthorizedResponse();
  }
}

// POST /api/cabana — create a new cabana
export async function POST(req: Request) {
  try {
    const { userId } = await requireAuth();
    const { idea, outputs }: { idea: string; outputs?: AgentOutputs } = await req.json();
    if (!idea?.trim()) return Response.json({ error: "idea required" }, { status: 400 });

    const cabana = await createCabana(userId, idea, outputs ?? {});
    return Response.json({ cabana });
  } catch {
    return unauthorizedResponse();
  }
}
