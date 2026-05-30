"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, TreePalm, ArrowRight } from "lucide-react";
import Link from "next/link";

const SURF = "#23b5d3";

type Cabana = {
  id: string;
  idea: string;
  name: string;
  status: string;
  sprint_day: number;
  created_at: string;
};

export default function CabanasPage() {
  const router = useRouter();
  const [cabanas, setCabanas] = useState<Cabana[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/cabana");
        if (res.ok) {
          const data = await res.json();
          setCabanas(data.cabanas ?? []);
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex items-center gap-2 text-black/50">
          <Loader2 size={16} className="animate-spin" style={{ color: SURF }} />
          Loading your cabanas...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-black/10 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ background: `${SURF}1a`, color: SURF }}
            >
              <TreePalm size={20} strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">Cabana</h1>
              <p className="text-xs text-black/40">Your businesses</p>
            </div>
          </div>
          <Link
            href="/chat"
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white transition-colors"
            style={{ background: SURF }}
          >
            <Plus size={16} />
            New Cabana
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {cabanas.length === 0 ? (
          <div className="text-center py-20">
            <div
              className="inline-flex h-14 w-14 items-center justify-center rounded-full mb-5"
              style={{ background: `${SURF}1a`, color: SURF }}
            >
              <TreePalm size={24} strokeWidth={1.75} />
            </div>
            <h2 className="text-2xl font-bold mb-2 tracking-tight">No cabanas yet</h2>
            <p className="text-black/50 text-sm mb-6 max-w-xs mx-auto">
              Start your first one — tell the Chief of Staff an idea and the crew gets to work.
            </p>
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-semibold transition-colors hover:opacity-90"
              style={{ background: "black" }}
            >
              <Plus size={14} />
              Start your first Cabana
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {cabanas.map((cabana) => (
              <button
                key={cabana.id}
                onClick={() => router.push(`/chat?cabana=${cabana.id}`)}
                className="w-full flex items-center justify-between p-5 rounded-2xl border border-black/10 bg-white hover:border-black/25 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold mb-1 truncate">{cabana.name || "Untitled"}</h3>
                  <p className="text-sm text-black/50 truncate mb-2.5">{cabana.idea}</p>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${SURF}1a`, color: SURF }}
                    >
                      Day {cabana.sprint_day} of 7
                    </span>
                    <span
                      className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-black/[0.04] text-black/50 capitalize"
                    >
                      {cabana.status}
                    </span>
                  </div>
                </div>
                <ArrowRight size={16} className="text-black/25 ml-4 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
