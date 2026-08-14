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
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
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
      <rect x="4" y="3" width="16" height="18" rx="2" />
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
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4" />
      <path d="M8 3v4" />
      <path d="M3 10h18" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4" />
      <path d="M8 3v4" />
      <path d="M3 10h18" />
      <path d="M8 14h2" />
      <path d="M14 14h2" />
      <path d="M8 17h2" />
      <path d="M14 17h2" />
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

function AuditIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M3 3v18h18" />
      <path d="M7 15l4-4 3 3 5-7" />
      <path d="M17 7h2v2" />
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
    label: "Calendrier",
    href: "/calendar",
    icon: <CalendarIcon />,
  },
  {
    label: "Entreprises",
    href: "/companies",
    icon: <CompaniesIcon />,
  },
  {
    label: "Audit de sites",
    href: "/audit",
    icon: <AuditIcon />,
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
    <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-gradient-to-b from-slate-900 via-slate-800 to-blue-950 text-white shadow-xl shadow-slate-950/20">
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

        <div className="mt-5 flex items-center gap-2 text-xs font-medium text-slate-300">
          <span>LBMedia Office</span>

          <span className="rounded-md bg-cyan-400/15 px-2 py-0.5 font-bold text-cyan-300 ring-1 ring-inset ring-cyan-300/20">
            V2
          </span>
        </div>
      </div>

      <div className="flex-1 px-4 py-6">
        <p className="px-2 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
          Navigation
        </p>

        <nav className="mt-4 space-y-1.5">
          {navigation.map((item) => {
            const active =
              isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-200",
                  active
                    ? "bg-gradient-to-r from-blue-500/25 to-cyan-400/10 text-white ring-1 ring-inset ring-white/10 shadow-sm"
                    : "text-slate-300 hover:bg-white/7 hover:text-white",
                ].join(" ")}
              >
                <span
                  className={[
                    "transition-colors",
                    active
                      ? "text-cyan-300"
                      : "text-slate-400 group-hover:text-blue-300",
                  ].join(" ")}
                >
                  {item.icon}
                </span>

                <span>
                  {item.label}
                </span>

                {active ? (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.8)]" />
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4">
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
          <p className="text-xs font-semibold text-slate-100">
            LBMedia Office V2
          </p>

          <p className="mt-1 text-[10px] text-slate-400">
            Environnement de développement
          </p>
        </div>
      </div>
    </aside>
  );
}