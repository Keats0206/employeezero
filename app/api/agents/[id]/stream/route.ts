import { getRun, subscribe } from "@/app/lib/agents/runner";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const run = getRun(id);
  if (!run) return new Response("not found", { status: 404 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      send("snapshot", { run });

      if (run.status === "succeeded" || run.status === "failed") {
        controller.close();
        return;
      }

      const unsub = subscribe(id, (payload) => {
        if ("done" in payload) {
          send("done", { status: payload.status });
          unsub();
          controller.close();
        } else {
          send("step", payload);
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
