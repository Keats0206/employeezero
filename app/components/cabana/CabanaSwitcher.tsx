"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, TreePalm } from "lucide-react";

const SURF = "#23b5d3";

type Cabana = {
  id: string;
  name: string;
  idea: string;
};

type Props = {
  cabanaId: string | null;
};

export function CabanaSwitcher({ cabanaId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [cabanas, setCabanas] = useState<Cabana[]>([]);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Lazy-load cabanas on first open
  useEffect(() => {
    if (!open || loaded) return;
    fetch("/api/cabana")
      .then((r) => r.json())
      .then((d) => { setCabanas(d.cabanas ?? []); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [open, loaded]);

  const current = cabanas.find((c) => c.id === cabanaId);
  const label = current?.name || (cabanaId ? "Loading…" : "New conversation");

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 group"
      >
        <span className="font-bold tracking-tight">Cabana</span>
        <span className="text-black/30">/</span>
        <span className="text-sm text-black/60 group-hover:text-black/80 transition-colors max-w-[160px] truncate">
          {label}
        </span>
        <ChevronDown
          size={13}
          className={`text-black/30 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-black/10 rounded-2xl shadow-lg overflow-hidden z-50">
          {!loaded ? (
            <div className="px-4 py-3 text-xs text-black/40">Loading…</div>
          ) : cabanas.length === 0 ? (
            <div className="px-4 py-3 text-xs text-black/40">No cabanas yet</div>
          ) : (
            <ul>
              {cabanas.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => { setOpen(false); router.push(`/chat?cabana=${c.id}`); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-black/[0.03] transition-colors text-left"
                  >
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                      style={{ background: `${SURF}1a`, color: SURF }}
                    >
                      <TreePalm size={13} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{c.name || "Untitled"}</p>
                      <p className="text-xs text-black/40 truncate">{c.idea}</p>
                    </div>
                    {c.id === cabanaId && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ background: SURF }} />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-black/10">
            <button
              onClick={() => { setOpen(false); router.push("/chat"); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-black/[0.03] transition-colors text-left"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/[0.04]">
                <Plus size={13} className="text-black/50" />
              </div>
              <span className="text-sm font-medium text-black/60">New Cabana</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
