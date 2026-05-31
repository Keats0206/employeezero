"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, TreePalm, ArrowUpRight, Trash2 } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/app/components/Avatar";

const SURF = "#23b5d3";

type Project = {
  id: string;
  idea: string;
  name: string;
  status: string;
  sprint_day: number;
  created_at: string;
};

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await fetch(`/api/cabana/${id}`, { method: "DELETE" });
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch { /* ignore */ } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/cabana");
        if (res.ok) {
          const data = await res.json();
          setProjects(data.cabanas ?? []);
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
          Loading your projects…
        </div>
      </div>
    );
  }

  const empty = projects.length === 0;

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <header className="border-b border-black/10 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ background: `${SURF}1a`, color: SURF }}
            >
              <TreePalm size={18} strokeWidth={1.75} />
            </div>
            <span className="font-bold tracking-tight">Cabana</span>
          </div>
          <Link
            href="/settings"
            aria-label="Settings"
            className="rounded-full ring-offset-2 transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
          >
            <Avatar seed="founder" label="You" size={32} />
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        {empty ? (
          <div className="flex flex-col items-center text-center py-24">
            <div
              className="inline-flex h-14 w-14 items-center justify-center rounded-full mb-5"
              style={{ background: `${SURF}1a`, color: SURF }}
            >
              <TreePalm size={24} strokeWidth={1.75} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-2">Start your first project</h1>
            <p className="text-black/50 text-sm mb-7 max-w-xs">
              Give your Chief of Staff a one-line idea. Your crew takes it from there.
            </p>
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-black text-white text-sm font-semibold transition-opacity hover:opacity-90"
            >
              <Plus size={15} />
              New project
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Your projects</h1>
                <p className="text-sm text-black/40 mt-0.5">
                  {projects.length} {projects.length === 1 ? "project" : "projects"}
                </p>
              </div>
              <Link
                href="/chat"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black text-white text-sm font-semibold transition-opacity hover:opacity-90"
              >
                <Plus size={15} />
                New project
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className="group relative flex flex-col text-left p-5 rounded-2xl border border-black/10 bg-white transition-colors hover:border-black/30"
                >
                  {confirmDelete === p.id ? (
                    <div className="flex flex-col gap-3 h-full justify-center py-4">
                      <p className="text-sm font-medium text-black">Delete &ldquo;{p.name || "Untitled"}&rdquo;?</p>
                      <p className="text-xs text-black/40">This can&apos;t be undone.</p>
                      <div className="flex gap-2 mt-1">
                        <button
                          onClick={() => handleDelete(p.id)}
                          disabled={deleting === p.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500 text-white text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
                        >
                          {deleting === p.id ? <Loader2 size={12} className="animate-spin" /> : null}
                          Delete
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="px-3 py-1.5 rounded-full bg-black/[0.06] text-black/60 text-xs font-semibold hover:bg-black/10 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => router.push(`/chat?cabana=${p.id}`)}
                        className="absolute inset-0 rounded-2xl"
                        aria-label={`Open ${p.name || "Untitled"}`}
                      />
                      <div className="flex items-start justify-between mb-4">
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-full"
                          style={{ background: `${SURF}1a`, color: SURF }}
                        >
                          <TreePalm size={17} strokeWidth={1.75} />
                        </div>
                        <div className="flex items-center gap-1.5 relative z-10">
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDelete(p.id); }}
                            className="opacity-0 group-hover:opacity-100 flex items-center justify-center h-6 w-6 rounded-full text-black/30 hover:text-red-500 hover:bg-red-50 transition-all"
                            aria-label="Delete project"
                          >
                            <Trash2 size={13} />
                          </button>
                          <ArrowUpRight
                            size={16}
                            className="text-black/20 transition-colors group-hover:text-black/50"
                          />
                        </div>
                      </div>
                      <h3 className="font-bold truncate">{p.name || "Untitled"}</h3>
                      <p className="text-sm text-black/50 line-clamp-2 mt-1 mb-4 min-h-[40px]">
                        {p.idea}
                      </p>
                      <div className="mt-auto flex items-center gap-2">
                        <span
                          className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: `${SURF}1a`, color: SURF }}
                        >
                          Day {p.sprint_day} of 7
                        </span>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-black/[0.04] text-black/50 capitalize">
                          {p.status}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
