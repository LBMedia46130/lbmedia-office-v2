import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import OfficeShell from "@/components/layout/OfficeShell";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LBMedia Office",
  description: "Pilotage et écosystème LBMedia",
};

function formatTodayDate() {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(new Date());
}

function formatCurrentTime() {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(new Date()).replace(":", "h").replace(":", "m");
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-slate-50 text-slate-950">
        <OfficeShell initialDate={formatTodayDate()} initialTime={formatCurrentTime()}>
          {children}
        </OfficeShell>
      </body>
    </html>
  );
}