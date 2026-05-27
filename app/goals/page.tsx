import { redirect } from "next/navigation";
import type { Artifact, Goal, Memory, Task } from "../lib/types";
import GoalsClient from "./GoalsClient";
import { store } from "../lib/state";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const goals = store.goals;
  const tasks = store.tasks;
  const artifacts = store.artifacts;
  const memories = store.memories;
  if (goals.length === 0) redirect("/onboarding");
  return (
    <GoalsClient
      goals={goals as unknown as Goal[]}
      tasks={tasks as unknown as Task[]}
      artifacts={artifacts as unknown as Artifact[]}
      memories={memories as unknown as Memory[]}
    />
  );
}
