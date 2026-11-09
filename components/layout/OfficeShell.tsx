"use client";

import { usePathname } from "next/navigation";
import AppSidebar from "@/components/layout/AppSidebar";
import LiveDateTimeBanner from "@/components/dashboard/LiveDateTimeBanner";

export default function OfficeShell({ children, initialDate, initialTime }: {
  children: React.ReactNode;
  initialDate: string;
  initialTime: string;
}) {
  const pathname = usePathname();
  if (pathname === "/login") return <main className="min-h-screen">{children}</main>;
  return (
    <div className="min-h-screen lg:flex">
      <AppSidebar />
      <main className="min-w-0 flex-1 pt-16 lg:ml-64 lg:pt-0">
        <div className="mx-auto max-w-7xl px-6 pt-6">
          <LiveDateTimeBanner initialDate={initialDate} initialTime={initialTime} />
        </div>
        {children}
      </main>
    </div>
  );
}