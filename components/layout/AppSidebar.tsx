import Image from "next/image";
import Link from "next/link";

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
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
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
      <path d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M8 8h8" />
      <path d="M8 12h8" />
      <path d="M8 16h5" />
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
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <path d="M3 10h18" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
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
];

export default function AppSidebar() {
  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-slate-200 bg-slate-950 text-white lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:border-b-0 lg:border-r lg:border-slate-800">
      <div className="border-b border-slate-800 px-5 py-5">
        <Link href="/" className="block">
          <Image
            src="/brand/lbmedia-logo.png"
            alt="LBMedia"
            width={190}
            height={70}
            priority
            className="h-auto w-full max-w-[190px] object-contain object-left"
          />
        </Link>

        <div className="mt-3 flex items-center gap-2">
          <p className="text-xs font-semibold text-slate-400">
            LBMedia Office
          </p>

          <span className="rounded-md bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-300">
            V2
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-3 py-5">
        <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
          Navigation
        </p>

        <nav
          aria-label="Navigation principale"
          className="space-y-1"
        >
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              <span className="text-slate-400">
                {item.icon}
              </span>

              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="my-5 border-t border-slate-800" />

        <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
          Création
        </p>

        <div className="space-y-2">
          <Link
            href="/news/new"
            className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-slate-100"
          >
            <PlusIcon />
            Nouvelle actualité
          </Link>

          <Link
            href="/publications/new"
            className="flex items-center gap-3 rounded-xl border border-slate-700 px-3 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white"
          >
            <PlusIcon />
            Nouveau post
          </Link>
        </div>

        <div className="mt-auto hidden pt-8 lg:block">
          <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
            <p className="text-xs font-semibold text-slate-300">
              LBMedia Office V2
            </p>

            <p className="mt-1 text-[11px] leading-4 text-slate-500">
              Environnement de développement
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}