import Link from "next/link";

import type {
  PublicationChannel,
  PublicationStatus,
} from "@/lib/news";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type DashboardPublication = {
  id: string;
  news_id: string | null;
  channel: PublicationChannel;
  title: string | null;
  content: string;
  status: PublicationStatus;
  scheduled_at: string | null;
  published_at: string | null;
  news:
    | {
        title: string;
      }
    | {
        title: string;
      }[]
    | null;
};

type DashboardNews = {
  id: string;
  title: string;
  content: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type DashboardTone =
  | "amber"
  | "cyan"
  | "emerald";

const channelLabels: Record<
  PublicationChannel,
  string
> = {
  website: "Actualité / WordPress",
  brevo: "Brevo",
  google_business: "Google Business",
  linkedin: "LinkedIn",
  facebook: "Facebook",
};

function getNewsTitle(
  relation: DashboardPublication["news"]
) {
  if (Array.isArray(relation)) {
    return relation[0]?.title ?? "Actualité";
  }

  return relation?.title ?? "Actualité";
}

function getPublicationHref(
  publication: DashboardPublication
) {
  if (publication.news_id) {
    return `/news/${publication.news_id}`;
  }

  return `/publications/${publication.id}`;
}

function getParisDateKey(value: Date) {
  const parts =
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Paris",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(value);

  const year =
    parts.find(
      (part) => part.type === "year"
    )?.value ?? "";

  const month =
    parts.find(
      (part) => part.type === "month"
    )?.value ?? "";

  const day =
    parts.find(
      (part) => part.type === "day"
    )?.value ?? "";

  return `${year}-${month}-${day}`;
}

function isToday(value: string | null) {
  if (!value) {
    return false;
  }

  return (
    getParisDateKey(new Date(value)) ===
    getParisDateKey(new Date())
  );
}

function formatTime(value: string | null) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      timeZone: "Europe/Paris",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(new Date(value));
}

export default async function HomePage() {
  const [
    newsResult,
    publicationsResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("news")
      .select("*")
      .order("updated_at", {
        ascending: false,
      }),

    supabaseAdmin
      .from("publications")
      .select(`
        id,
        news_id,
        channel,
        title,
        content,
        status,
        scheduled_at,
        published_at,
        news (
          title
        )
      `)
      .order("updated_at", {
        ascending: false,
      }),
  ]);

  if (newsResult.error) {
    throw new Error(
      `Impossible de charger les actualités : ${newsResult.error.message}`
    );
  }

  if (publicationsResult.error) {
    throw new Error(
      `Impossible de charger les publications : ${publicationsResult.error.message}`
    );
  }

  const news =
    (newsResult.data ?? []) as DashboardNews[];

  const publications =
    (publicationsResult.data ??
      []) as DashboardPublication[];

  const toPrepare =
    news.filter(
      (item) =>
        item.status === "draft" &&
        !item.content.trim()
    );

  const readyToSchedule =
    publications.filter(
      (publication) =>
        publication.status === "ready"
    );

  const today =
    publications
      .filter(
        (publication) =>
          publication.status ===
            "scheduled" &&
          isToday(
            publication.scheduled_at
          )
      )
      .sort((a, b) =>
        (
          a.scheduled_at ?? ""
        ).localeCompare(
          b.scheduled_at ?? ""
        )
      );

  const failed =
    publications.filter(
      (publication) =>
        publication.status ===
        "failed"
    );

  const publishedCount =
    publications.filter(
      (publication) =>
        publication.status ===
        "published"
    ).length;

  const attentionCount =
    toPrepare.length +
    readyToSchedule.length +
    failed.length;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
            LBMedia Office V2
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Tableau de bord
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Vue d’ensemble de l’activité
            LBMedia et accès rapide aux
            actions importantes.
          </p>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <DashboardCard
            label="À traiter"
            value={attentionCount}
            description="Éléments qui demandent ton attention."
            tone="amber"
          />

          <DashboardCard
            label="Aujourd’hui"
            value={today.length}
            description="Publications prévues aujourd’hui."
            tone="cyan"
          />

          <DashboardCard
            label="Publiées"
            value={publishedCount}
            description="Publications déjà diffusées."
            tone="emerald"
          />
        </section>

        {failed.length > 0 ? (
          <section className="mt-8 rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-rose-50 p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700">
                  Attention
                </p>

                <h2 className="mt-2 text-xl font-bold text-red-950">
                  Publications à corriger
                </h2>

                <p className="mt-1 text-sm text-red-800">
                  {failed.length}{" "}
                  publication
                  {failed.length > 1
                    ? "s ont"
                    : " a"}{" "}
                  rencontré un problème.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {failed.map(
                (publication) => (
                  <PublicationAction
                    key={publication.id}
                    publication={
                      publication
                    }
                    tone="error"
                  />
                )
              )}
            </div>
          </section>
        ) : null}

        <section className="mt-8 rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 via-sky-50 to-white p-6 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-500" />

                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
                  Aujourd’hui
                </p>
              </div>

              <h2 className="mt-2 text-xl font-bold text-slate-950">
                Publications prévues
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                Ce qui doit partir
                aujourd’hui.
              </p>
            </div>

            <span className="rounded-full border border-cyan-200 bg-white px-3 py-1.5 text-sm font-semibold text-cyan-800 shadow-sm">
              {today.length}{" "}
              publication
              {today.length > 1
                ? "s"
                : ""}
            </span>
          </div>

          {today.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-cyan-200 bg-white/80 px-6 py-10 text-center">
              <p className="font-semibold text-slate-900">
                Rien à publier
                aujourd’hui
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Le planning est libre
                pour aujourd’hui.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-3">
              {today.map(
                (publication) => (
                  <PublicationAction
                    key={publication.id}
                    publication={
                      publication
                    }
                    showTime
                  />
                )
              )}
            </div>
          )}
        </section>

        <div className="pb-10" />
      </div>
    </main>
  );
}

function DashboardCard({
  label,
  value,
  description,
  tone,
}: {
  label: string;
  value: number;
  description: string;
  tone: DashboardTone;
}) {
  const styles: Record<
    DashboardTone,
    {
      card: string;
      label: string;
      value: string;
      dot: string;
    }
  > = {
    amber: {
      card:
        "border-amber-200 bg-gradient-to-br from-white to-amber-50",
      label:
        "text-amber-700",
      value:
        "text-amber-700",
      dot:
        "bg-amber-400",
    },

    cyan: {
      card:
        "border-cyan-200 bg-gradient-to-br from-white to-cyan-50",
      label:
        "text-cyan-700",
      value:
        "text-cyan-700",
      dot:
        "bg-cyan-500",
    },

    emerald: {
      card:
        "border-emerald-200 bg-gradient-to-br from-white to-emerald-50",
      label:
        "text-emerald-700",
      value:
        "text-emerald-700",
      dot:
        "bg-emerald-500",
    },
  };

  const style =
    styles[tone];

  return (
    <div
      className={`rounded-2xl border p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${style.card}`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 rounded-full ${style.dot}`}
        />

        <p
          className={`text-sm font-semibold ${style.label}`}
        >
          {label}
        </p>
      </div>

      <p
        className={`mt-3 text-4xl font-bold tracking-tight ${style.value}`}
      >
        {value}
      </p>

      <p className="mt-3 text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function PublicationAction({
  publication,
  showTime = false,
  tone = "default",
}: {
  publication: DashboardPublication;
  showTime?: boolean;
  tone?: "default" | "error";
}) {
  const newsTitle =
    getNewsTitle(
      publication.news
    );

  const isStandalone =
    !publication.news_id;

  const displayTitle =
    publication.channel ===
    "website"
      ? newsTitle
      : publication.title ||
        (isStandalone
          ? "Publication"
          : newsTitle);

  return (
    <Link
      href={getPublicationHref(
        publication
      )}
      className={`block rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        tone === "error"
          ? "border-red-200 bg-white hover:border-red-300"
          : "border-slate-200 bg-white hover:border-cyan-300"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
            {
              channelLabels[
                publication.channel
              ]
            }
          </p>

          <h3 className="mt-2 font-semibold text-slate-950">
            {displayTitle}
          </h3>

          {!isStandalone &&
          publication.channel !==
            "website" ? (
            <p className="mt-1 text-sm text-slate-500">
              {newsTitle}
            </p>
          ) : null}

          {isStandalone ? (
            <p className="mt-1 text-xs font-medium text-slate-400">
              Publication indépendante
            </p>
          ) : null}
        </div>

        <div className="shrink-0 text-right">
          {showTime &&
          publication.scheduled_at ? (
            <p className="text-xl font-bold text-slate-950">
              {formatTime(
                publication.scheduled_at
              )}
            </p>
          ) : null}

          <p className="mt-1 text-xs font-semibold text-blue-700">
            Ouvrir →
          </p>
        </div>
      </div>
    </Link>
  );
}