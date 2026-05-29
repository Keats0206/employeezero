import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-medium text-black/40 mb-6 tracking-tight">
        Your AI crew. One goal: <span className="text-[var(--brand)]">your first sale.</span>
      </p>

      <h1 className="text-6xl sm:text-7xl font-bold tracking-[-0.03em] leading-[0.95] mb-10">
        Cabana
      </h1>

      <Link
        href="/chat"
        className="bg-black text-white text-lg font-semibold px-8 py-4 rounded-full hover:bg-black/80 transition-colors inline-flex items-center gap-2"
      >
        Open chat <ArrowRight size={18} />
      </Link>

      <p className="text-xs text-black/30 mt-8">Private demo</p>
    </div>
  );
}
