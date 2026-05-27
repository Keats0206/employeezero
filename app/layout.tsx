import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "./components/TopNav";
import { DevAgentation } from "./components/DevAgentation";
import { ReportButton } from "./components/ReportButton";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "employeezero",
  description: "The system that helps build the system.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-white text-zinc-900">
        <Providers>
          <Sidebar />
          <main className="md:pl-56">
            <div className="mx-auto w-full max-w-5xl px-8 py-12">
              {children}
            </div>
          </main>
          <DevAgentation />
          <ReportButton />
        </Providers>
      </body>
    </html>
  );
}
