import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { authOptions } from "@/auth";
import { Avatar } from "@/app/components/Avatar";
import { SignOutButton } from "./SignOutButton";
import { Connections } from "./Connections";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/sign-in?callbackUrl=/settings");

  const name = session.user?.name ?? "Founder";
  const email = session.user?.email ?? "";

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="mx-auto w-full max-w-xl px-6 py-12">
        <Link
          href="/chat"
          className="inline-flex items-center gap-1.5 text-sm text-black/50 transition-colors hover:text-black"
        >
          <ArrowLeft size={15} /> Back to chat
        </Link>

        <h1 className="mt-8 text-3xl font-bold tracking-[-0.03em]">Settings</h1>

        <section className="mt-8 rounded-2xl border border-black/10 p-5">
          <div className="flex items-center gap-4">
            <Avatar seed={email || name} label={name} size={48} />
            <div className="min-w-0">
              <p className="truncate font-semibold">{name}</p>
              {email && <p className="truncate text-sm text-black/50">{email}</p>}
            </div>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-semibold text-black/40">Connections</h2>
          <p className="mt-1 text-sm text-black/50">
            Connect your apps so the crew can act on your behalf — send emails, post updates, and more.
          </p>
          <div className="mt-3 rounded-2xl border border-black/10 px-5">
            <Connections />
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-black/10 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Sign out</p>
              <p className="text-sm text-black/50">End your session on this device.</p>
            </div>
            <SignOutButton />
          </div>
        </section>
      </div>
    </div>
  );
}
