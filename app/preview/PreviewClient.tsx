"use client";

import { Globe } from "lucide-react";
import { useChatCtx } from "../components/ChatContext";

export default function PreviewClient() {
  const { sandboxUrl } = useChatCtx();

  if (!sandboxUrl) {
    return (
      <div className="flex h-[calc(100vh-12rem)] flex-col items-center justify-center gap-2 text-sm text-zinc-400">
        <Globe size={28} strokeWidth={1.5} />
        <p>No live preview yet.</p>
        <p className="text-xs">Ask the operator to build something — the preview will appear here.</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col">
      <div className="mb-3 flex items-center gap-2 text-xs text-zinc-500">
        <Globe size={12} />
        <a href={sandboxUrl} target="_blank" rel="noreferrer" className="truncate hover:text-zinc-900">
          {sandboxUrl}
        </a>
      </div>
      <iframe
        src={sandboxUrl}
        className="flex-1 rounded-lg border border-zinc-200 bg-white"
        title="Sandbox preview"
      />
    </div>
  );
}
