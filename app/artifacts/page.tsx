import { redirect } from "next/navigation";
import { getArtifacts, getGoals } from "../lib/db/queries";
import type { Artifact, Goal } from "../lib/types";
import ArtifactsClient from "./ArtifactsClient";

export const dynamic = "force-dynamic";

export default async function ArtifactsPage() {
  const [artifacts, goals] = await Promise.all([getArtifacts(), getGoals()]);
  if (goals.length === 0) redirect("/onboarding");
  return (
    <ArtifactsClient
      artifacts={artifacts as unknown as Artifact[]}
      goals={goals as unknown as Goal[]}
    />
  );
}
