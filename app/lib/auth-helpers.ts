import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getCabana } from "@/app/lib/db/cabana-queries";

/**
 * Get the authenticated user's ID from the session.
 * Returns the user's ID or email as fallback.
 * Throws if not authenticated.
 */
export async function requireAuth() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }
  
  // Use user.id if available (OAuth), otherwise use email (Credentials)
  const userId = (session.user as { id?: string }).id || session.user.email;
  
  return { userId, session };
}

/**
 * Verify that the authenticated user owns the specified cabana.
 * Returns the cabana if ownership is valid, throws otherwise.
 */
export async function requireCabanaOwnership(cabanaId: string) {
  const { userId } = await requireAuth();
  const cabana = await getCabana(cabanaId);
  
  if (!cabana || cabana.user_id !== userId) {
    throw new Error("Not found");
  }
  
  return { userId, cabana };
}

/**
 * Response helper for unauthorized requests
 */
export function unauthorizedResponse() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * Response helper for not found / unauthorized access
 */
export function notFoundResponse() {
  return Response.json({ error: "Not found" }, { status: 404 });
}

/**
 * Check if a cabana's plan allows a specific feature
 */
export function canUsePaidFeatures(plan: string) {
  return plan === "sprint" || plan === "pro";
}

/**
 * Response helper for upgrade required
 */
export function upgradeRequiredResponse(cabanaId: string) {
  return Response.json({ 
    error: "Upgrade required",
    upgradeUrl: `/upgrade?cabana=${cabanaId}`
  }, { status: 402 }); // 402 Payment Required
}
