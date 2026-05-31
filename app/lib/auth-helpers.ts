import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getCabana } from "@/app/lib/db/cabana-queries";
import { getSubscription, isSubscriptionActive } from "@/app/lib/db/subscription-queries";

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");
  // Always use email as the stable userId
  const userId = session.user.email;
  return { userId, session };
}

export async function requireCabanaOwnership(cabanaId: string) {
  const { userId } = await requireAuth();
  const cabana = await getCabana(cabanaId);
  if (!cabana || cabana.user_id !== userId) throw new Error("Not found");
  return { userId, cabana };
}

export async function requireActiveSubscription(userId: string) {
  const sub = await getSubscription(userId);
  if (!isSubscriptionActive(sub)) throw new Error("Subscription required");
  return sub!;
}

export function unauthorizedResponse() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export function notFoundResponse() {
  return Response.json({ error: "Not found" }, { status: 404 });
}

export function upgradeRequiredResponse() {
  return Response.json({ error: "Upgrade required", upgradeUrl: "/upgrade" }, { status: 402 });
}
