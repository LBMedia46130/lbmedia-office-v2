import Link from "next/link";

import PageBanner from "@/components/dashboard/PageBanner";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const {
    data: news,
    error,
  } = await supabaseAdmin
    .from("news")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `Impossible de charger les actualités : ${error.message}`
    );
  }

  const draftCount =
    news.filter(
      (item) =>
        item.status === "draft"
    ).length;

  const readyCount =
    news.filter(
      (item) =>
        item.status === "ready"
    ).length;

  const scheduledCount =
    news.filter(
      (item) =>
        item.status === "scheduled"
    ).length;

  const publishedCount =
    news.filter(
      (item) =>
        item.status === "published"
    ).length;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <PageBanner
          eyebrow="Module éditorial"
          title="Actualités"
          description="Crée, rédige et prépare les actualités LBMedia avant leur diffusion sur les différents supports."
        />

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <MiniCounter
              label="Brouillons"
              value={draftCount}
              tone="slate"
            />

            <MiniCounter
              label="Prêtes"
              value={readyCount}
              tone="amber"
            />

            <MiniCounter
              label="Planifiées"
              value={scheduledCount}
              tone="cyan"
            />

            <MiniCounter
              label="Publiées"
              value={publishedCount}
              tone="emerald"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/news/new"
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              + Nouvelle actualité
            </Link>

            <Link
              href="/publications/new"
              className="rounded-xl border border-violet-200 bg-violet-50 px-5 py-3 text-sm font-semibold text-violet-700 transition hover:border-violet-300 hover:bg-violet-100"
            >
              + Nouveau post
            </Link>
          </div>
        </div>

        {news.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-blue-200 bg-gradient-to-br from-blue-50 via-white to-cyan-50 px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
              <NewsIcon />
            </div>

            <h2 className="mt-5 text-lg font-bold text-slate-950">
              Aucune actualité
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Commence par créer la
              première actualité
              LBMedia.
            </p>

            <Link
              href="/news/new"
              className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Créer une actualité
            </Link>
          </div>
        ) : (
          <section className="mt-8 rounded-2xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/20 to-cyan-50/30 p-5 shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-4 px-1 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />

                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
                    Contenus
                  </p>
                </div>

                <h2 className="mt-2 text-xl font-bold text-slate-950">
                  Toutes les actualités
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Retrouve les sujets
                  éditoriaux LBMedia et
                  leur état
                  d’avancement.
                </p>
              </div>

              <span className="rounded-full border border-blue-200 bg-white px-3 py-1.5 text-sm font-semibold text-blue-700 shadow-sm">
                {news.length}{" "}
                actualité
                {news.length > 1
                  ? "s"
                  : ""}
              </span>
            </div>

            <div className="grid gap-4">
              {news.map(
                (item) => (
                  <NewsCard
                    key={item.id}
                    item={item}
                  />
                )
              )}
            </div>
          </section>
        )}

        <div className="pb-10" />
      </div>
    </main>
  );
}

function NewsCard({
  item,
}: {
  item: {
    id: string;
    title: string;
    content: string | null;
    status: string;
    created_at: string;
  };
}) {
  const accent =
    getStatusAccent(
      item.status
    );

  return (
    <Link
      href={`/news/${item.id}`}
      className={`group relative overflow-hidden rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${accent.border}`}
    >
      <span
        className={`absolute inset-y-0 left-0 w-1 ${accent.bar}`}
      />

      <div className="flex items-start justify-between gap-6 pl-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge
              status={
                item.status
              }
            />

            <p className="text-xs font-medium text-slate-400">
              Créée le{" "}
              {new Intl.DateTimeFormat(
                "fr-FR",
                {
                  dateStyle:
                    "medium",
                  timeStyle:
                    "short",
                }
              ).format(
                new Date(
                  item.created_at
                )
              )}
            </p>
          </div>

          <h2 className="mt-3 text-lg font-bold text-slate-950 transition group-hover:text-blue-700">
            {item.title}
          </h2>

          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
            {item.content ||
              "Aucun contenu rédigé pour le moment."}
          </p>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition group-hover:bg-blue-50 group-hover:text-blue-600">
          <ArrowIcon />
        </div>
      </div>
    </Link>
  );
}

function MiniCounter({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone:
    | "slate"
    | "amber"
    | "cyan"
    | "emerald";
}) {
  const styles = {
    slate:
      "border-slate-200 bg-white text-slate-600",

    amber:
      "border-amber-200 bg-amber-50 text-amber-700",

    cyan:
      "border-cyan-200 bg-cyan-50 text-cyan-700",

    emerald:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
  };

  const dots = {
    slate: "bg-slate-400",
    amber: "bg-amber-400",
    cyan: "bg-cyan-500",
    emerald: "bg-emerald-500",
  };

  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold shadow-sm ${styles[tone]}`}
    >
      <span
        className={`h-2 w-2 rounded-full ${dots[tone]}`}
      />

      <span>
        {label}
      </span>

      <span className="font-bold">
        {value}
      </span>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const labels: Record<
    string,
    string
  > = {
    draft: "Brouillon",
    ready: "Prête",
    scheduled: "Planifiée",
    published: "Publiée",
  };

  const classes: Record<
    string,
    string
  > = {
    draft:
      "bg-slate-100 text-slate-600 ring-slate-200",

    ready:
      "bg-amber-50 text-amber-700 ring-amber-200",

    scheduled:
      "bg-cyan-50 text-cyan-700 ring-cyan-200",

    published:
      "bg-emerald-50 text-emerald-700 ring-emerald-200",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
        classes[status] ??
        "bg-slate-100 text-slate-600 ring-slate-200"
      }`}
    >
      {labels[status] ??
        status}
    </span>
  );
}

function getStatusAccent(
  status: string
) {
  switch (status) {
    case "ready":
      return {
        border:
          "border-amber-100 hover:border-amber-200",
        bar: "bg-amber-400",
      };

    case "scheduled":
      return {
        border:
          "border-cyan-100 hover:border-cyan-200",
        bar: "bg-cyan-500",
      };

    case "published":
      return {
        border:
          "border-emerald-100 hover:border-emerald-200",
        bar: "bg-emerald-500",
      };

    default:
      return {
        border:
          "border-slate-200 hover:border-blue-200",
        bar: "bg-slate-300",
      };
  }
}

function NewsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-7 w-7"
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

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}