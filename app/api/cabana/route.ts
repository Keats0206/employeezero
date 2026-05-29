import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { createCabana } from "@/app/lib/db/cabana-queries";
import type { AgentOutputs } from "@/app/lib/cabana-config";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id ?? "demo";

  const { idea, outputs }: { idea: string; outputs: AgentOutputs } = await req.json();
  if (!idea?.trim()) return Response.json({ error: "idea required" }, { status: 400 });

  const cabana = await createCabana(userId, idea, outputs);
  return Response.json({ cabana });
}
