import Link from "next/link";

import PageBanner from "@/components/dashboard/PageBanner";

import type {
  PublicationChannel,
  PublicationStatus,
} from "@/lib/news";

import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PlanningPublication = {
  id: string;
  news_id: string | null;
  channel: PublicationChannel;
  title: string | null;
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

const statusLabels: Record<
  PublicationStatus,
  string
> = {
  draft: "Brouillon",
  ready: "Prête",
  scheduled: "Planifiée",
  published: "Publiée",
  failed: "Échec",
};

function getNewsTitle(
  relation: PlanningPublication["news"]
) {
  if (Array.isArray(relation)) {
    return relation[0]?.title ?? "Actualité";
  }

  return relation?.title ?? "Actualité";
}

function getPublicationHref(
  publication: PlanningPublication
) {
  if (publication.news_id) {
    if (
      publication.channel !==
      "website"
    ) {
      return `/news/${publication.news_id}?channel=${publication.channel}`;
    }

    return `/news/${publication.news_id}`;
  }

  return `/publications/${publication.id}`;
}

function formatDate(
  value: string | null
) {
  if (!value) {
    return "Aucune date";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      timeZone: "Europe/Paris",
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(new Date(value));
}

function formatTime(
  value: string | null
) {
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

function getParisDateParts(
  date: Date
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: "Europe/Paris",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).formatToParts(date);

  const year = Number(
    parts.find(
      (part) => part.type === "year"
    )?.value
  );

  const month = Number(
    parts.find(
      (part) => part.type === "month"
    )?.value
  );

  const day = Number(
    parts.find(
      (part) => part.type === "day"
    )?.value
  );

  return {
    year,
    month,
    day,
  };
}

function toCalendarNumber(
  date: Date
) {
  const {
    year,
    month,
    day,
  } = getParisDateParts(date);

  return Date.UTC(
    year,
    month - 1,
    day
  );
}

function getDayDifference(
  value: string
) {
  const today =
    toCalendarNumber(
      new Date()
    );

  const target =
    toCalendarNumber(
      new Date(value)
    );

  return Math.round(
    (target - today) /
      86_400_000
  );
}

function getDaysUntilSunday() {
  const {
    year,
    month,
    day,
  } = getParisDateParts(
    new Date()
  );

  const utcDate =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

  const weekday =
    utcDate.getUTCDay();

  return weekday === 0
    ? 0
    : 7 - weekday;
}

function statusClasses(
  status: PublicationStatus
) {
  switch (status) {
    case "ready":
      return "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200";

    case "scheduled":
      return "bg-cyan-50 text-cyan-700 ring-1 ring-inset ring-cyan-200";

    case "published":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200";

    case "failed":
      return "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

export default async function PlanningPage() {
  const { data, error } =
    await supabaseAdmin
      .from("publications")
      .select(`
        id,
        news_id,
        channel,
        title,
        status,
        scheduled_at,
        published_at,
        news (
          title
        )
      `)
      .in("status", [
        "ready",
        "scheduled",
        "published",
        "failed",
      ])
      .order("scheduled_at", {
        ascending: true,
        nullsFirst: false,
      });

  if (error) {
    throw new Error(
      `Impossible de charger le planning : ${error.message}`
    );
  }

  const publications =
    (data ?? []) as PlanningPublication[];

  const ready =
    publications.filter(
      (publication) =>
        publication.status === "ready"
    );

  const scheduled =
    publications.filter(
      (publication) =>
        publication.status ===
          "scheduled" &&
        Boolean(
          publication.scheduled_at
        )
    );

  const invalidScheduled =
    publications.filter(
      (publication) =>
        publication.status ===
          "scheduled" &&
        !publication.scheduled_at
    );

  const published =
    publications.filter(
      (publication) =>
        publication.status ===
        "published"
    );

  const failed =
    publications.filter(
      (publication) =>
        publication.status ===
        "failed"
    );

  const overdue =
    scheduled.filter(
      (publication) =>
        publication.scheduled_at &&
        getDayDifference(
          publication.scheduled_at
        ) < 0
    );

  const today =
    scheduled.filter(
      (publication) =>
        publication.scheduled_at &&
        getDayDifference(
          publication.scheduled_at
        ) === 0
    );

  const daysUntilSunday =
    getDaysUntilSunday();

  const thisWeek =
    scheduled.filter(
      (publication) => {
        if (
          !publication.scheduled_at
        ) {
          return false;
        }

        const difference =
          getDayDifference(
            publication.scheduled_at
          );

        return (
          difference > 0 &&
          difference <=
            daysUntilSunday
        );
      }
    );

  const later =
    scheduled.filter(
      (publication) => {
        if (
          !publication.scheduled_at
        ) {
          return false;
        }

        const difference =
          getDayDifference(
            publication.scheduled_at
          );

        return (
          difference >
          daysUntilSunday
        );
      }
    );

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <PageBanner
          eyebrow="Organisation"
          title="Planning éditorial"
          description="Visualise immédiatement ce qui doit être publié aujourd’hui, cette semaine et plus tard."
        />

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <Counter
            label="Prêtes à planifier"
            value={ready.length}
            tone="amber"
          />

          <Counter
            label="Planifiées"
            value={scheduled.length}
            tone="cyan"
          />

          <Counter
            label="Publiées"
            value={published.length}
            tone="emerald"
          />
        </section>

        {overdue.length > 0 ? (
          <PlanningSection
            title="En retard"
            description="Ces publications avaient une date prévue qui est maintenant dépassée."
            publications={overdue}
            tone="warning"
          />
        ) : null}

        <PlanningSection
          title="Aujourd’hui"
          description="Publications prévues aujourd’hui."
          publications={today}
          emptyMessage="Rien à publier aujourd’hui."
          tone="today"
        />

        <PlanningSection
          title="Cette semaine"
          description="Publications prévues d’ici dimanche."
          publications={thisWeek}
          emptyMessage="Aucune autre publication prévue cette semaine."
          tone="week"
        />

        <PlanningSection
          title="Plus tard"
          description="Publications déjà programmées pour les semaines suivantes."
          publications={later}
          emptyMessage="Aucune publication planifiée plus tard."
          tone="later"
        />

        <section className="mt-10 rounded-2xl border border-amber-200 bg-amber-50/60 p-6 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />

                <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">
                  À organiser
                </p>
              </div>

              <h2 className="mt-2 text-xl font-bold text-slate-950">
                Prêtes à planifier
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Contenus validés qui
                attendent encore leur
                date de publication.
              </p>
            </div>

            <span className="rounded-full border border-amber-200 bg-white px-3 py-1 text-sm font-semibold text-amber-700 shadow-sm">
              {ready.length}{" "}
              publication
              {ready.length > 1
                ? "s"
                : ""}
            </span>
          </div>

          {ready.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-amber-200 bg-white/80 px-6 py-10 text-center">
              <p className="font-semibold text-slate-950">
                Aucun contenu en attente
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Les contenus marqués
                comme prêts apparaîtront
                ici.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-4">
              {ready.map(
                (publication) => (
                  <PublicationRow
                    key={publication.id}
                    publication={
                      publication
                    }
                  />
                )
              )}
            </div>
          )}
        </section>

        {invalidScheduled.length >
        0 ? (
          <section className="mt-10 rounded-2xl border border-amber-300 bg-amber-50 p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />

              <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">
                Attention
              </p>
            </div>

            <h2 className="mt-2 text-xl font-bold text-amber-950">
              Planification à corriger
            </h2>

            <p className="mt-1 text-sm text-amber-800">
              {
                invalidScheduled.length
              }{" "}
              publication
              {invalidScheduled.length >
              1
                ? "s sont marquées"
                : " est marquée"}{" "}
              comme planifiée
              {invalidScheduled.length >
              1
                ? "s"
                : ""}{" "}
              sans date.
            </p>

            <div className="mt-4 grid gap-3">
              {invalidScheduled.map(
                (publication) => (
                  <PublicationRow
                    key={publication.id}
                    publication={
                      publication
                    }
                  />
                )
              )}
            </div>
          </section>
        ) : null}

        {failed.length > 0 ? (
          <section className="mt-10 rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />

              <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-700">
                À traiter
              </p>
            </div>

            <h2 className="mt-2 text-xl font-bold text-red-950">
              Publications en échec
            </h2>

            <p className="mt-1 text-sm text-red-800">
              {failed.length}{" "}
              publication
              {failed.length > 1
                ? "s nécessitent"
                : " nécessite"}{" "}
              ton attention.
            </p>

            <div className="mt-4 grid gap-3">
              {failed.map(
                (publication) => (
                  <PublicationRow
                    key={publication.id}
                    publication={
                      publication
                    }
                  />
                )
              )}
            </div>
          </section>
        ) : null}

        <section className="mt-10 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />

                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                  Historique
                </p>
              </div>

              <h2 className="mt-2 text-xl font-bold text-slate-950">
                Dernières publications
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Historique récent des
                contenus effectivement
                publiés.
              </p>
            </div>

            <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-sm font-semibold text-emerald-700 shadow-sm">
              {published.length}{" "}
              publication
              {published.length > 1
                ? "s"
                : ""}
            </span>
          </div>

          {published.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-emerald-200 bg-white/80 px-6 py-10 text-center">
              <p className="font-semibold text-slate-950">
                Aucune publication
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-4">
              {published
                .slice()
                .sort((a, b) => {
                  const first =
                    a.published_at ??
                    a.scheduled_at ??
                    "";

                  const second =
                    b.published_at ??
                    b.scheduled_at ??
                    "";

                  return second.localeCompare(
                    first
                  );
                })
                .slice(0, 10)
                .map(
                  (
                    publication
                  ) => (
                    <PublicationRow
                      key={
                        publication.id
                      }
                      publication={
                        publication
                      }
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

function PlanningSection({
  title,
  description,
  publications,
  emptyMessage,
  tone = "default",
}: {
  title: string;
  description: string;
  publications: PlanningPublication[];
  emptyMessage?: string;
  tone?:
    | "default"
    | "warning"
    | "today"
    | "week"
    | "later";
}) {
  const styles = {
    default: {
      section:
        "border-slate-200 bg-white",
      dot: "bg-slate-400",
      eyebrow: "text-slate-500",
      badge:
        "border-slate-200 text-slate-600",
      dashed:
        "border-slate-300",
    },

    warning: {
      section:
        "border-red-200 bg-red-50/70",
      dot: "bg-red-500",
      eyebrow: "text-red-700",
      badge:
        "border-red-200 text-red-700",
      dashed:
        "border-red-200",
    },

    today: {
      section:
        "border-cyan-200 bg-cyan-50/60",
      dot: "bg-cyan-500",
      eyebrow: "text-cyan-700",
      badge:
        "border-cyan-200 text-cyan-700",
      dashed:
        "border-cyan-200",
    },

    week: {
      section:
        "border-blue-200 bg-blue-50/50",
      dot: "bg-blue-500",
      eyebrow: "text-blue-700",
      badge:
        "border-blue-200 text-blue-700",
      dashed:
        "border-blue-200",
    },

    later: {
      section:
        "border-violet-200 bg-violet-50/50",
      dot: "bg-violet-500",
      eyebrow: "text-violet-700",
      badge:
        "border-violet-200 text-violet-700",
      dashed:
        "border-violet-200",
    },
  };

  const current =
    styles[tone];

  const eyebrow =
    tone === "warning"
      ? "Attention"
      : tone === "today"
        ? "Aujourd’hui"
        : tone === "week"
          ? "À venir"
          : tone === "later"
            ? "Prochainement"
            : "Planning";

  return (
    <section
      className={`mt-10 rounded-2xl border p-6 shadow-sm ${current.section}`}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${current.dot}`}
            />

            <p
              className={`text-xs font-bold uppercase tracking-[0.18em] ${current.eyebrow}`}
            >
              {eyebrow}
            </p>
          </div>

          <h2 className="mt-2 text-xl font-bold text-slate-950">
            {title}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {description}
          </p>
        </div>

        <span
          className={`rounded-full border bg-white px-3 py-1 text-sm font-semibold shadow-sm ${current.badge}`}
        >
          {publications.length}{" "}
          publication
          {publications.length > 1
            ? "s"
            : ""}
        </span>
      </div>

      {publications.length === 0 ? (
        <p
          className={`mt-5 rounded-xl border border-dashed bg-white/75 px-5 py-8 text-center text-sm text-slate-500 ${current.dashed}`}
        >
          {emptyMessage ??
            "Aucune publication."}
        </p>
      ) : (
        <div className="mt-5 grid gap-3">
          {publications.map(
            (publication) => (
              <PublicationRow
                key={publication.id}
                publication={
                  publication
                }
                compact
              />
            )
          )}
        </div>
      )}
    </section>
  );
}

function Counter({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone:
    | "amber"
    | "cyan"
    | "emerald";
}) {
  const styles = {
    amber: {
      card:
        "border-amber-200 bg-amber-50/70",
      dot: "bg-amber-400",
      label: "text-amber-700",
      value: "text-amber-700",
    },

    cyan: {
      card:
        "border-cyan-200 bg-cyan-50/70",
      dot: "bg-cyan-500",
      label: "text-cyan-700",
      value: "text-cyan-700",
    },

    emerald: {
      card:
        "border-emerald-200 bg-emerald-50/70",
      dot: "bg-emerald-500",
      label: "text-emerald-700",
      value: "text-emerald-700",
    },
  };

  const current =
    styles[tone];

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm ${current.card}`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 rounded-full ${current.dot}`}
        />

        <p
          className={`text-sm font-semibold ${current.label}`}
        >
          {label}
        </p>
      </div>

      <p
        className={`mt-3 text-3xl font-bold ${current.value}`}
      >
        {value}
      </p>
    </div>
  );
}

function PublicationRow({
  publication,
  compact = false,
}: {
  publication: PlanningPublication;
  compact?: boolean;
}) {
  const newsTitle =
    getNewsTitle(
      publication.news
    );

  const isStandalone =
    !publication.news_id;

  const date =
    publication.status ===
    "published"
      ? publication.published_at ??
        publication.scheduled_at
      : publication.scheduled_at;

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
      className={`group block rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md ${
        compact
          ? "p-4"
          : "p-5"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-slate-950">
              {
                channelLabels[
                  publication.channel
                ]
              }
            </span>

            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(
                publication.status
              )}`}
            >
              {
                statusLabels[
                  publication.status
                ]
              }
            </span>
          </div>

          <h3 className="mt-2 font-semibold text-slate-900">
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
          {publication.status ===
            "scheduled" &&
          date ? (
            <>
              <p className="text-lg font-bold text-slate-950">
                {formatTime(date)}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {formatDate(date)}
              </p>
            </>
          ) : (
            <p className="text-sm font-semibold text-slate-800">
              {formatDate(date)}
            </p>
          )}

          <p className="mt-2 text-xs font-semibold text-blue-500 transition group-hover:text-blue-700">
            Ouvrir →
          </p>
        </div>
      </div>
    </Link>
  );
}