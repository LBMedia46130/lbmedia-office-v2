import Link from "next/link";

import LiveDateTimeBanner from "@/components/dashboard/LiveDateTimeBanner";
import WeeklyTopics from "@/components/penelope/WeeklyTopics";
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

  const todayDate =
    formatTodayDate();

  const currentTime =
    formatCurrentTime();

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <LiveDateTimeBanner
          initialDate={todayDate}
          initialTime={currentTime}
        />

        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
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
          />

          <DashboardCard
            label="Aujourd’hui"
            value={today.length}
            description="Publications prévues aujourd’hui."
          />

          <DashboardCard
            label="Publiées"
            value={publishedCount}
            description="Publications déjà diffusées."
          />
        </section>

        {failed.length > 0 ? (
          <section className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6">
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

        <div className="mt-8 grid gap-8 xl:grid-cols-[1.35fr_0.65fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                  Pénélope
                </p>

                <h2 className="mt-2 text-2xl font-bold text-slate-950">
                  Préparer la semaine
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Préparer les prochains
                  sujets éditoriaux
                  LBMedia.
                </p>
              </div>

              <Link
                href="/news"
                className="text-sm font-semibold text-blue-700 transition hover:text-blue-900"
              >
                Voir les actualités →
              </Link>
            </div>

            <div className="mt-6">
              <WeeklyTopics />
            </div>
          </section>

          <section className="rounded-2xl border border-blue-900 bg-gradient-to-b from-blue-950 to-slate-950 p-6 text-white shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
              Écosystème LBMedia
            </p>

            <h2 className="mt-2 text-xl font-bold">
              Modules
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Le dashboard V2
              accueillera
              progressivement les
              différents outils métier
              LBMedia.
            </p>

            <div className="mt-6 space-y-3">
              <ModuleItem
                label="Éditorial"
                status="Actif"
              />

              <ModuleItem
                label="Planning"
                status="Actif"
              />

              <ModuleItem
                label="Autres modules"
                status="À venir"
              />
            </div>
          </section>
        </div>

        <section className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                Aujourd’hui
              </p>

              <h2 className="mt-2 text-xl font-bold text-slate-950">
                Publications prévues
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                Ce qui doit partir
                aujourd’hui.
              </p>
            </div>

            <span className="text-sm font-semibold text-slate-600">
              {today.length}{" "}
              publication
              {today.length > 1
                ? "s"
                : ""}
            </span>
          </div>

          {today.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-blue-200 bg-white/70 px-6 py-10 text-center">
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
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-4xl font-bold tracking-tight text-blue-700">
        {value}
      </p>

      <p className="mt-3 text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function ModuleItem({
  label,
  status,
}: {
  label: string;
  status: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-blue-900/70 bg-blue-950/40 px-4 py-3">
      <span className="text-sm font-semibold text-slate-200">
        {label}
      </span>

      <span className="rounded-full bg-blue-900/60 px-2.5 py-1 text-xs font-semibold text-blue-200">
        {status}
      </span>
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
      className={`block rounded-2xl border p-5 shadow-sm transition hover:shadow-md ${
        tone === "error"
          ? "border-red-200 bg-white hover:border-red-300"
          : "border-slate-200 bg-white hover:border-blue-200"
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