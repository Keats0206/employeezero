"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

export default function AboutPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <Link href="/" className="font-bold text-lg tracking-tight">Cabana</Link>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <Link href="/ethos" className="px-4 py-2 rounded-full hover:bg-black/5 transition-colors">Ethos</Link>
          <Link href="/about" className="px-4 py-2 rounded-full bg-black/5 text-black font-medium">About</Link>
          <button
            onClick={() => router.push("/sign-in")}
            className="ml-1 bg-black text-white px-5 py-2 rounded-full font-medium hover:bg-black/80 transition-colors"
          >
            Sign in
          </button>
        </div>
      </nav>

      <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-16">
        <div className="rounded-3xl overflow-hidden mb-12 border border-black/5">
          <Image
            src="/cabana-illustration.png"
            alt="A cabana on the beach"
            width={1408}
            height={768}
            className="w-full h-auto"
            priority
          />
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold tracking-[-0.03em] mb-6">About Cabana</h1>

        <div className="space-y-5 text-lg text-black/60 leading-relaxed tracking-tight">
          <p>
            Cabana is a quiet place to build something of your own. Drop in an idea
            and a crew of AI agents goes to work — researching the market, sharpening
            the offer, building the page, writing the outreach, and finding the
            fastest path to your first sale.
          </p>
          <p>
            We believe starting an internet business should feel less like a mountain
            and more like a beach hut: small, focused, and yours. You don't need a
            team, a budget, or a runway. You need momentum toward a first paying
            customer — and a crew that handles the parts that usually stall people out.
          </p>
          <p>
            Everything Cabana makes is real. Real pages that deploy live. Real outreach
            you can send. Real signals you can track. No mockups, no someday — just the
            next move toward revenue.
          </p>
        </div>

        <button
          onClick={() => router.push("/")}
          className="mt-12 inline-flex items-center gap-2 bg-black hover:bg-black/80 text-white px-6 py-3.5 rounded-full font-semibold text-sm transition-colors"
        >
          Start building <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
