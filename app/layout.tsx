import type { Metadata } from "next";
import Link from "next/link";
import {
  Geist,
  Geist_Mono,
} from "next/font/google";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LBMedia Office V2",
  description:
    "Pilotage éditorial et publications LBMedia",
};

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-50 text-slate-950">
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
            <Link
              href="/"
              className="flex items-center gap-3"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white">
                LB
              </div>

              <div>
                <p className="text-sm font-bold tracking-tight text-slate-950">
                  LBMedia Office V2
                </p>

                <p className="text-xs text-slate-500">
                  Pilotage éditorial
                </p>
              </div>
            </Link>

            <nav
              aria-label="Navigation principale"
              className="flex items-center gap-2"
            >
              <Link
                href="/"
                className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
              >
                Pilotage
              </Link>

              <Link
                href="/news"
                className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
              >
                Actualités
              </Link>

              <Link
                href="/planning"
                className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
              >
                Planning
              </Link>

              <Link
                href="/publications/new"
                className="ml-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
              >
                + Nouveau post
              </Link>

              <Link
                href="/news/new"
                className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                + Nouvelle actualité
              </Link>
            </nav>
          </div>
        </header>

        {children}
      </body>
    </html>
  );
}