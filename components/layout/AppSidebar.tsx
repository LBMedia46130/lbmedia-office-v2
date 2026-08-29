"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  usePathname,
} from "next/navigation";

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

function ManagementIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M6 2h9l4 4v16H6z" />
      <path d="M14 2v5h5" />
      <path d="M9 12h7" />
      <path d="M9 16h7" />
      <path d="M9 8h2" />
    </svg>
  );
}

function ChevronIcon({
  open,
}: {
  open: boolean;
}) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={[
        "h-4 w-4 transition-transform duration-200",
        open ? "rotate-90" : "",
      ].join(" ")}
      aria-hidden="true"
    >
      <path d="M7 5l5 5-5 5" />
    </svg>
  );
}

const navigationBeforeCompanies: NavigationItem[] = [
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
];

const navigationAfterCompanies: NavigationItem[] = [
  {
    label: "Audit de sites",
    href: "/audit",
    icon: <AuditIcon />,
  },
];

export default function AppSidebar() {
  const pathname = usePathname();

  const companiesSectionActive =
    pathname === "/companies" ||
    pathname.startsWith("/companies/");

  const managementSectionActive =
    pathname === "/management" ||
    pathname.startsWith("/management/");

  const [
    companiesOpen,
    setCompaniesOpen,
  ] = useState(companiesSectionActive);

  const [
    managementOpen,
    setManagementOpen,
  ] = useState(managementSectionActive);

  useEffect(() => {
    if (companiesSectionActive) {
      setCompaniesOpen(true);
    }
  }, [companiesSectionActive]);

  useEffect(() => {
    if (managementSectionActive) {
      setManagementOpen(true);
    }
  }, [managementSectionActive]);

  function isActive(href: string) {
    if (href === "/") {
      return pathname === "/";
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  }

  function isExactActive(href: string) {
    return pathname === href;
  }

  function renderNavigationItem(
    item: NavigationItem
  ) {
    const active = isActive(item.href);

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

        <span>{item.label}</span>

        {active ? (
          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.8)]" />
        ) : null}
      </Link>
    );
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-gradient-to-b from-slate-900 via-slate-800 to-blue-950 text-white shadow-xl shadow-slate-950/20">
      <div className="border-b border-white/10 px-6 py-7 text-center">
        <Link
          href="/"
          className="flex flex-col items-center"
        >
          <img
            src="/brand/lbmedia-logo.png"
            alt="LBMedia"
            className="h-auto w-36"
          />

          <span className="mt-5 text-sm font-semibold text-slate-200">
            LBMedia Office
          </span>
        </Link>
      </div>

      <div className="flex-1 px-4 py-6">
        <p className="px-2 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
          Navigation
        </p>

        <nav className="mt-4 space-y-1.5">
          {navigationBeforeCompanies.map(
            renderNavigationItem
          )}

          <div>
            <button
              type="button"
              onClick={() =>
                setCompaniesOpen(
                  (current) => !current
                )
              }
              className={[
                "group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-200",
                companiesSectionActive
                  ? "bg-gradient-to-r from-blue-500/25 to-cyan-400/10 text-white ring-1 ring-inset ring-white/10 shadow-sm"
                  : "text-slate-300 hover:bg-white/7 hover:text-white",
              ].join(" ")}
              aria-expanded={companiesOpen}
            >
              <span
                className={[
                  "transition-colors",
                  companiesSectionActive
                    ? "text-cyan-300"
                    : "text-slate-400 group-hover:text-blue-300",
                ].join(" ")}
              >
                <CompaniesIcon />
              </span>

              <span>Entreprises</span>

              <span className="ml-auto text-slate-400">
                <ChevronIcon
                  open={companiesOpen}
                />
              </span>
            </button>

            {companiesOpen ? (
              <div className="ml-5 mt-1.5 space-y-1 border-l border-white/10 pl-4">
                <Link
                  href="/companies"
                  className={[
                    "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                    isExactActive("/companies")
                      ? "bg-white/10 text-white"
                      : "text-slate-400 hover:bg-white/5 hover:text-white",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "h-1.5 w-1.5 rounded-full",
                      isExactActive("/companies")
                        ? "bg-cyan-300"
                        : "bg-slate-600",
                    ].join(" ")}
                  />

                  <span>
                    Liste des entreprises
                  </span>
                </Link>

                <Link
                  href="/companies/prospection"
                  className={[
                    "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                    pathname === "/companies/prospection"
                      ? "bg-white/10 text-white"
                      : "text-slate-400 hover:bg-white/5 hover:text-white",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "h-1.5 w-1.5 rounded-full",
                      pathname === "/companies/prospection"
                        ? "bg-cyan-300"
                        : "bg-slate-600",
                    ].join(" ")}
                  />

                  <span>Prospection</span>
                </Link>
              </div>
            ) : null}
          </div>

          {navigationAfterCompanies.map(
            renderNavigationItem
          )}

          <div>
            <button
              type="button"
              onClick={() =>
                setManagementOpen(
                  (current) => !current
                )
              }
              className={[
                "group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-200",
                managementSectionActive
                  ? "bg-gradient-to-r from-blue-500/25 to-cyan-400/10 text-white ring-1 ring-inset ring-white/10 shadow-sm"
                  : "text-slate-300 hover:bg-white/7 hover:text-white",
              ].join(" ")}
              aria-expanded={managementOpen}
            >
              <span
                className={[
                  "transition-colors",
                  managementSectionActive
                    ? "text-cyan-300"
                    : "text-slate-400 group-hover:text-blue-300",
                ].join(" ")}
              >
                <ManagementIcon />
              </span>

              <span>Gestion</span>

              <span className="ml-auto text-slate-400">
                <ChevronIcon
                  open={managementOpen}
                />
              </span>
            </button>

            {managementOpen ? (
              <div className="ml-5 mt-1.5 space-y-1 border-l border-white/10 pl-4">
                <Link
                  href="/management/estimates"
                  className={[
                    "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                    isExactActive(
                      "/management/estimates"
                    )
                      ? "bg-white/10 text-white"
                      : "text-slate-400 hover:bg-white/5 hover:text-white",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "h-1.5 w-1.5 rounded-full",
                      isExactActive(
                        "/management/estimates"
                      )
                        ? "bg-cyan-300"
                        : "bg-slate-600",
                    ].join(" ")}
                  />

                  <span>Devis</span>
                </Link>

                <Link
                  href="/management/invoices"
                  className={[
                    "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                    isExactActive(
                      "/management/invoices"
                    )
                      ? "bg-white/10 text-white"
                      : "text-slate-400 hover:bg-white/5 hover:text-white",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "h-1.5 w-1.5 rounded-full",
                      isExactActive(
                        "/management/invoices"
                      )
                        ? "bg-cyan-300"
                        : "bg-slate-600",
                    ].join(" ")}
                  />

                  <span>Factures</span>
                </Link>
              </div>
            ) : null}
          </div>
        </nav>
      </div>

      <div className="p-4">
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
          <p className="text-xs font-semibold text-slate-100">
            LBMedia Office
          </p>

          <p className="mt-1 text-[10px] text-slate-400">
            Version 2.3.1
          </p>
        </div>
      </div>
    </aside>
  );
}