import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
} from "next/font/google";

import LiveDateTimeBanner from "@/components/dashboard/LiveDateTimeBanner";
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

function formatTodayDate() {
  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      timeZone: "Europe/Paris",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  ).format(new Date());
}

function formatCurrentTime() {
  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      timeZone: "Europe/Paris",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }
  )
    .format(new Date())
    .replace(":", "h")
    .replace(":", "m");
}

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  const todayDate =
    formatTodayDate();

  const currentTime =
    formatCurrentTime();

  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-50 text-slate-950">
        <div className="min-h-screen lg:flex">
          <AppSidebar />

          <main className="min-w-0 flex-1 lg:ml-64">
            <div className="mx-auto max-w-7xl px-6 pt-6">
              <LiveDateTimeBanner
                initialDate={todayDate}
                initialTime={currentTime}
              />
            </div>

            {children}
          </main>
        </div>
      </body>
    </html>
  );
}