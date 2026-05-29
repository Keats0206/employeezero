// Per-subagent abort registry. Keyed by toolCallId so the UI can stop a
// specific subagent run without killing the whole orchestrator stream.

const controllers = new Map<string, AbortController>();

export function register(toolCallId: string): AbortController {
  const existing = controllers.get(toolCallId);
  if (existing) return existing;
  const controller = new AbortController();
  controllers.set(toolCallId, controller);
  return controller;
}

export function unregister(toolCallId: string) {
  controllers.delete(toolCallId);
}

export function abort(toolCallId: string): boolean {
  const controller = controllers.get(toolCallId);
  if (!controller) return false;
  controller.abort(new Error("aborted by user"));
  controllers.delete(toolCallId);
  return true;
}

export function listActive(): string[] {
  return [...controllers.keys()];
}
