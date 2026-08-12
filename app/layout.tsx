import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
} from "next/font/google";

import AppSidebar from "@/components/layout/AppSidebar";

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
    "Pilotage et écosystème LBMedia",
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
        <div className="min-h-screen lg:flex">
          <AppSidebar />

          <main className="min-w-0 flex-1 lg:ml-64">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}