"use client";

import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import { ArrowRight, Loader2, TreePalm } from "lucide-react";

const SURF = "#23b5d3";

function SignInForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const params = useSearchParams();
  const router = useRouter();
  const callbackUrl = params.get("callbackUrl") ?? "/chat";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      email: email.trim(),
      redirect: false,
      callbackUrl,
    });
    if (res?.ok) {
      router.push(callbackUrl);
    } else {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div
            className="inline-flex h-14 w-14 items-center justify-center rounded-full mb-5"
            style={{ background: `${SURF}1a`, color: SURF }}
          >
            <TreePalm size={28} strokeWidth={1.75} />
          </div>
          <h1 className="font-bold text-2xl tracking-[-0.03em]">Cabana</h1>
          <p className="text-black/40 text-sm mt-1.5">Sign in to your crew</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full border border-black/10 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-black/30 bg-white transition-colors"
            autoFocus
          />
          {error && <p className="text-xs text-red-500 pl-1">{error}</p>}
          <button
            type="submit"
            disabled={!email.trim() || loading}
            className="w-full bg-black hover:bg-black/80 disabled:opacity-30 text-white font-semibold py-3.5 rounded-full text-sm flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? <><Loader2 size={14} className="animate-spin" /> Signing in...</> : <>Continue <ArrowRight size={14} /></>}
          </button>
        </form>

        <p className="text-xs text-black/30 text-center mt-8">
          No password needed for the demo. Any email works.
        </p>

        {/* What you get strip */}
        <div className="mt-8 rounded-2xl border border-black/10 overflow-hidden">
          {[
            { icon: "🔍", label: "Market research in 2 min" },
            { icon: "📄", label: "Landing page, deployed live" },
            { icon: "📊", label: "Revenue path from day one" },
          ].map((item, i) => (
            <div
              key={item.label}
              className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-black/10" : ""}`}
            >
              <span className="text-sm">{item.icon}</span>
              <span className="text-xs text-black/55">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
