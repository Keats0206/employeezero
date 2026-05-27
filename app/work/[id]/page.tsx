import { notFound } from "next/navigation";
import TaskDetailClient from "./TaskDetailClient";
import { WORK_TASKS } from "../../lib/prototype";

export const dynamic = "force-dynamic";

export default async function WorkTaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = WORK_TASKS.find((t) => t.id === id);
  if (!task) notFound();
  return <TaskDetailClient task={task} />;
}
