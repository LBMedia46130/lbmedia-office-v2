"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavigationItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

function DashboardIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="3"
        width="7"
        height="7"
        rx="1"
      />
      <rect
        x="14"
        y="3"
        width="7"
        height="7"
        rx="1"
      />
      <rect
        x="3"
        y="14"
        width="7"
        height="7"
        rx="1"
      />
      <rect
        x="14"
        y="14"
        width="7"
        height="7"
        rx="1"
      />
    </svg>
  );
}

function NewsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="3"
        width="16"
        height="18"
        rx="2"
      />
      <path d="M8 7h8" />
      <path d="M8 11h8" />
      <path d="M8 15h5" />
    </svg>
  );
}

function PlanningIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="16"
        rx="2"
      />
      <path d="M16 3v4" />
      <path d="M8 3v4" />
      <path d="M3 10h18" />
    </svg>
  );
}

function CompaniesIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 21v-5h6v5" />
      <path d="M9 9h.01" />
      <path d="M15 9h.01" />
      <path d="M9 12h.01" />
      <path d="M15 12h.01" />
    </svg>
  );
}

const navigation: NavigationItem[] = [
  {
    label: "Tableau de bord",
    href: "/",
    icon: <DashboardIcon />,
  },
  {
    label: "Actualités",
    href: "/news",
    icon: <NewsIcon />,
  },
  {
    label: "Planning",
    href: "/planning",
    icon: <PlanningIcon />,
  },
  {
    label: "Entreprises",
    href: "/companies",
    icon: <CompaniesIcon />,
  },
];

export default function AppSidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") {
      return pathname === "/";
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-slate-950 text-white">
      <div className="border-b border-white/10 px-6 py-7">
        <Link
          href="/"
          className="block"
        >
          <img
            src="/brand/lbmedia-logo.png"
            alt="LBMedia"
            className="h-auto w-36"
          />
        </Link>

        <div className="mt-5 flex items-center gap-2 text-xs font-medium text-slate-400">
          <span>LBMedia Office</span>

          <span className="rounded-md bg-blue-500/20 px-2 py-0.5 font-bold text-blue-300">
            V2
          </span>
        </div>
      </div>

      <div className="flex-1 px-4 py-6">
        <p className="px-2 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
          Navigation
        </p>

        <nav className="mt-4 space-y-1">
          {navigation.map((item) => {
            const active =
              isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition",
                  active
                    ? "bg-white/10 text-white"
                    : "text-slate-300 hover:bg-white/5 hover:text-white",
                ].join(" ")}
              >
                <span
                  className={
                    active
                      ? "text-blue-400"
                      : "text-slate-400"
                  }
                >
                  {item.icon}
                </span>

                <span>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4">
        <div className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3">
          <p className="text-xs font-semibold text-slate-200">
            LBMedia Office V2
          </p>

          <p className="mt-1 text-[10px] text-slate-500">
            Environnement de développement
          </p>
        </div>
      </div>
    </aside>
  );
}