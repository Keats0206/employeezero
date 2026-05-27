import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SideNav } from "./components/TopNav";
import { ChatPanel } from "./components/ChatPanel";
import { DevAgentation } from "./components/DevAgentation";
import { ReportButton } from "./components/ReportButton";
import { Providers } from "./providers";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "employeezero",
  description: "The system that helps build the system.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full bg-white text-zinc-900">
        <Providers>
          <div className="flex h-screen w-screen overflow-hidden">
            <SideNav />
            <main className="flex flex-1 flex-col overflow-auto">
              <div className="w-full px-8 py-8">{children}</div>
            </main>
            <aside className="w-[420px] shrink-0 border-l border-zinc-200">
              <ChatPanel />
            </aside>
          </div>
          <DevAgentation />
          <ReportButton />
        </Providers>
      </body>
    </html>
  );
}
