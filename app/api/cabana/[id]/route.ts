import { requireAuth, unauthorizedResponse } from "@/app/lib/auth-helpers";
import { getCabana, getCabanaOutputs, getCabanaPlays } from "@/app/lib/db/cabana-queries";

export const runtime = "nodejs";

// GET /api/cabana/[id] — load a specific cabana (with ownership check)
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const { id } = await params;

    const cabana = await getCabana(id);

    // Ownership check
    if (!cabana || cabana.user_id !== userId) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    // Load related data
    const [outputs, plays] = await Promise.all([
      getCabanaOutputs(id),
      getCabanaPlays(id),
    ]);

    return Response.json({ cabana, outputs, plays });
  } catch {
    return unauthorizedResponse();
  }
}
