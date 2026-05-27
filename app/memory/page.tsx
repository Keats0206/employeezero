import { getArtifacts, getMemories } from "../lib/db/queries";
import type { Artifact, Memory } from "../lib/types";
import MemoryClient from "./MemoryClient";
import { artifacts as fixtureArtifacts, memories as fixtureMemories } from "../lib/fixtures";

export const dynamic = "force-dynamic";

export default async function MemoryPage() {
  let memories: unknown[] = [];
  let artifacts: unknown[] = [];
  try {
    [memories, artifacts] = await Promise.all([getMemories(), getArtifacts()]);
  } catch {
    memories = fixtureMemories;
    artifacts = fixtureArtifacts;
  }
  return (
    <MemoryClient
      memories={memories as unknown as Memory[]}
      artifacts={artifacts as unknown as Artifact[]}
    />
  );
}
