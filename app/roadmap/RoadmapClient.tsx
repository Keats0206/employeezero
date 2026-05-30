"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { useMemo } from "react";

// Lightweight renderer for the roadmap markdown. Only handles:
//   # ## headings, > blockquotes, - [x] / - [ ] checkboxes, plain paragraphs.
// No need for a full AST library for this one file.

type Node =
  | { type: "h1"; text: string }
  | { type: "h2"; id: string; text: string }
  | { type: "quote"; text: string }
  | { type: "checkbox"; checked: boolean; label: string; note?: string }
  | { type: "para"; text: string }
  | { type: "hr" };

function parse(md: string): Node[] {
  const nodes: Node[] = [];
  const lines = md.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trimEnd();

    // blank
    if (line.trim() === "") continue;

    // hr
    if (/^---+\s*$/.test(line.trim())) {
      nodes.push({ type: "hr" });
      continue;
    }

    // headings
    const h1 = line.match(/^# (.+)$/);
    if (h1) { nodes.push({ type: "h1", text: h1[1].trim() }); continue; }
    const h2 = line.match(/^## (.+)$/);
    if (h2) {
      const text = h2[1].trim();
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      nodes.push({ type: "h2", id, text });
      continue;
    }

    // blockquote
    if (line.startsWith(">")) {
      const text = line.replace(/^>\s*/, "").trim();
      // merge consecutive blockquote lines
      if (nodes.length > 0 && nodes[nodes.length - 1].type === "quote") {
        (nodes[nodes.length - 1] as { type: "quote"; text: string }).text += " " + text;
      } else {
        nodes.push({ type: "quote", text });
      }
      continue;
    }

    // checkbox
    const cb = line.match(/^- \[([ xX])\] \*\*(.+?)\*\*(?: · (.+))?$/);
    if (cb) {
      nodes.push({
        type: "checkbox",
        checked: cb[1] !== " ",
        label: cb[2],
        note: cb[3] || undefined,
      });
      continue;
    }

    // paragraph
    nodes.push({ type: "para", text: line.trim() });
  }

  return nodes;
}

export default function RoadmapClient({ source }: { source: string }) {
  const router = useRouter();
  const nodes = useMemo(() => parse(source), [source]);

  // Count checkboxes under each h2 for the sprint summary
  const sections = useMemo(() => {
    const out: { id: string; text: string; done: number; total: number }[] = [];
    let current: (typeof out)[number] | null = null;
    for (const n of nodes) {
      if (n.type === "h2") {
        current = { id: n.id, text: n.text, done: 0, total: 0 };
        out.push(current);
      }
      if (n.type === "checkbox" && current) {
        current.total++;
        if (n.checked) current.done++;
      }
    }
    return out;
  }, [nodes]);

  // Track which h2 we're under for checkbox opacity
  let currentSectionIdx = -1;

  return (
    <div className="min-h-screen bg-[#0d0d0f] text-white font-mono text-sm flex flex-col">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between shrink-0">
        <span className="font-bold tracking-tight text-white/80">cabana</span>
        <div className="flex items-center gap-3">
          <Link href="/ethos" className="text-xs text-white/40 hover:text-white/70 transition-colors">ethos</Link>
          <Link href="/about" className="text-xs text-white/40 hover:text-white/70 transition-colors">about</Link>
          <Link href="/roadmap" className="text-xs text-white">roadmap</Link>
          <span className="text-white/15">|</span>
          <button
            onClick={() => router.push("/sign-in")}
            className="text-xs text-white/50 hover:text-white transition-colors"
          >
            sign in →
          </button>
        </div>
      </div>

      {/* Two-column: nav + content */}
      <div className="flex flex-1 min-h-0">
        {/* Left: sprint nav */}
        <nav className="hidden md:flex flex-col w-48 shrink-0 border-r border-white/8 py-6 px-4 gap-1 overflow-y-auto">
          <span className="text-[10px] uppercase tracking-widest text-white/25 mb-2">sprints</span>
          {sections.map((s, i) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] hover:bg-white/5 transition-colors group"
            >
              <span className="text-white/20">{String(i).padStart(2, "0")}</span>
              <span className="text-white/45 group-hover:text-white/70 truncate flex-1">{s.text.replace(/^\d+\s*—\s*/, "")}</span>
              {s.total > 0 && (
                <span className="text-[9px] text-white/20">
                  {s.done > 0 && <span className="text-emerald-400/50">{s.done}</span>}
                  <span>/{s.total}</span>
                </span>
              )}
            </a>
          ))}
        </nav>

        {/* Right: content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-xl mx-auto px-6 py-12">
            {nodes.map((node, i) => {
              if (node.type === "h1") {
                return (
                  <h1 key={i} className="text-xl font-bold tracking-tight text-white/90 mb-2">
                    {node.text}
                  </h1>
                );
              }

              if (node.type === "h2") {
                currentSectionIdx++;
                const sec = sections[currentSectionIdx];
                const num = String(currentSectionIdx).padStart(2, "0");
                return (
                  <div key={i} id={node.id} className="scroll-mt-8 mt-14 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-white/25">{num}</span>
                      <span className="text-xs font-bold tracking-tight text-white/75">{node.text.replace(/^\d+\s*—\s*/, "")}</span>
                      <span className="flex-1 h-px bg-white/8" />
                      {sec && sec.total > 0 && (
                        <span className="text-[10px] text-white/20">
                          {sec.done > 0 && <span className="text-emerald-400/60">{sec.done}</span>}
                          <span className="text-white/20">/{sec.total}</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              }

              if (node.type === "quote") {
                return (
                  <p key={i} className="text-xs text-white/45 border-l-2 border-white/15 pl-3 my-4 leading-relaxed italic">
                    {node.text}
                  </p>
                );
              }

              if (node.type === "hr") {
                return <hr key={i} className="border-white/8 my-10" />;
              }

              if (node.type === "checkbox") {
                return (
                  <label key={i} className="flex items-start gap-3 cursor-default my-1">
                    <span className={`mt-0.5 w-4 h-4 rounded-[3px] border shrink-0 flex items-center justify-center ${
                      node.checked
                        ? "bg-emerald-500/20 border-emerald-500/40"
                        : "border-white/15 bg-white/[0.03]"
                    }`}>
                      {node.checked && <Check size={10} strokeWidth={3} className="text-emerald-400" />}
                    </span>
                    <div className="min-w-0">
                      <span className={`text-xs font-semibold tracking-tight ${node.checked ? "text-white/80 line-through decoration-white/20" : "text-white/55"}`}>
                        {node.label}
                      </span>
                      {node.note && (
                        <span className={`text-[11px] leading-relaxed ml-1.5 ${node.checked ? "text-white/30" : "text-white/25"}`}>
                          · {node.note}
                        </span>
                      )}
                    </div>
                  </label>
                );
              }

              if (node.type === "para") {
                return (
                  <p key={i} className="text-[11px] text-white/30 leading-relaxed my-2">
                    {node.text}
                  </p>
                );
              }

              return null;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
