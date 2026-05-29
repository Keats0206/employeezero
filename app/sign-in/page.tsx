"use client";

import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

function SignInForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const params = useSearchParams();
  const router = useRouter();
  const callbackUrl = params.get("callbackUrl") ?? "/dashboard";

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
        <div className="text-center mb-8">
          <span className="font-bold text-2xl tracking-[-0.03em]">Cabana</span>
          <p className="text-black/40 text-sm mt-2">Sign in to your crew</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full border border-black/10 rounded-full px-5 py-3.5 text-sm focus:outline-none focus:border-black/30 bg-white transition-colors"
            autoFocus
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={!email.trim() || loading}
            className="w-full bg-black hover:bg-black/80 disabled:opacity-30 text-white font-semibold py-3.5 rounded-full text-sm flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? <><Loader2 size={14} className="animate-spin" /> Signing in…</> : <>Continue <ArrowRight size={14} /></>}
          </button>
        </form>

        <p className="text-xs text-black/30 text-center mt-6">
          No password needed for the demo. Any email works.
        </p>
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
