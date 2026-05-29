import { contentFromOutputs, runBuilderTask, type BuilderTaskType } from "@/app/lib/agents/builder";
import { BUILD_MODELS } from "@/app/lib/cabana-config";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const { outputs, existingHtml, updateInstruction, taskType, model, projectId } = await req.json();
  const content = contentFromOutputs(outputs ?? {});
  // Only honor a model the founder is actually allowed to pick; otherwise let
  // the builder fall back to its default.
  const buildModel = typeof model === "string" && BUILD_MODELS.includes(model) ? model : undefined;

  if (!content) {
    return Response.json({ error: "builder and strategist outputs required" }, { status: 400 });
  }

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(enc.encode("data: " + JSON.stringify(obj) + "\n\n"));

      try {
        await runBuilderTask({
          content,
          taskType: (taskType as BuilderTaskType | undefined) ?? (existingHtml && updateInstruction ? "product_update" : "new_site"),
          brief: updateInstruction,
          existingHtml,
          model: buildModel,
          projectId: typeof projectId === "string" ? projectId : undefined,
          onEvent: send,
        });
      } catch (err) {
        send({ type: "error", message: err instanceof Error ? err.message : String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
