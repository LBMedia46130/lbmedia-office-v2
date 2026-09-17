import Link from "next/link";
import type {
  PublicationChannel,
  PublicationStatus,
} from "@/lib/news";
import {
  getAuditProspections,
  type AuditProspection,
} from "@/lib/audit-prospections";
import {
  getCompanies,
  type Company,
} from "@/lib/companies";
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
type CommercialAction = {
  prospection: AuditProspection;
  company: Company | null;
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
function formatDate(value: string | null) {
  if (!value) {
    return "";
  }
  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      timeZone: "Europe/Paris",
      day: "numeric",
      month: "short",
    }
  ).format(new Date(value));
}
function isDue(value: string | null) {
  if (!value) {
    return false;
  }
  return new Date(value).getTime() <= Date.now();
}
export default async function HomePage() {
  const [
    newsResult,
    publicationsResult,
    prospections,
    companies,
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
    getAuditProspections(),
    getCompanies(),
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
  const companiesById =
    new Map(
      companies.map((company) => [
        company.id,
        company,
      ])
    );
  const failed =
    publications.filter(
      (publication) =>
        publication.status ===
        "failed"
    );
  const dueFollowUps =
    prospections
      .filter(
        (prospection) =>
          prospection.status ===
            "follow_up" &&
          isDue(
            prospection.follow_up_at
          )
      )
      .map((prospection) => ({
        prospection,
        company:
          companiesById.get(
            prospection.company_id
          ) ?? null,
      }))
      .sort((a, b) =>
        (
          a.prospection.follow_up_at ??
          ""
        ).localeCompare(
          b.prospection.follow_up_at ??
          ""
        )
      );
  const upcomingFollowUps =
    prospections
      .filter(
        (prospection) =>
          prospection.status ===
            "follow_up" &&
          Boolean(
            prospection.follow_up_at
          ) &&
          !isDue(
            prospection.follow_up_at
          )
      )
      .map((prospection) => ({
        prospection,
        company:
          companiesById.get(
            prospection.company_id
          ) ?? null,
      }))
      .sort((a, b) =>
        (
          a.prospection.follow_up_at ??
          ""
        ).localeCompare(
          b.prospection.follow_up_at ??
          ""
        )
      )
      .slice(0, 5);
  const upcomingPublications =
    publications
      .filter(
        (publication) =>
          publication.status ===
            "scheduled" &&
          Boolean(
            publication.scheduled_at
          ) &&
          new Date(
            publication.scheduled_at as string
          ).getTime() >= Date.now()
      )
      .sort((a, b) =>
        (
          a.scheduled_at ?? ""
        ).localeCompare(
          b.scheduled_at ?? ""
        )
      )
      .slice(0, 5);
  const activeProspections =
    prospections.filter(
      (prospection) =>
        prospection.status === "sent" ||
        prospection.status === "follow_up"
    ).length;
  const repliesCount =
    prospections.filter(
      (prospection) =>
        prospection.status ===
          "replied"
    ).length;
  const attentionCount =
    toPrepare.length +
    readyToSchedule.length +
    failed.length +
    dueFollowUps.length;
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
            LBMedia Office
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Tableau de bord
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Les actions à mener et les
            prochaines échéances LBMedia.
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
            label="Prospections en cours"
            value={activeProspections}
            description="Prospections envoyées ou en cours de relance."
            tone="cyan"
          />
          <DashboardCard
            label="Réponses reçues"
            value={repliesCount}
            description="Prospections ayant reçu une réponse."
            tone="emerald"
          />
        </section>
        <section className="mt-8 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-yellow-50 to-white p-6 shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                    À faire
                  </p>
                </div>
                <h2 className="mt-2 text-xl font-bold text-slate-950">
                  Actions en attente
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Uniquement ce qui nécessite
                  une action maintenant.
                </p>
              </div>
              <span className="rounded-full border border-amber-200 bg-white px-3 py-1.5 text-sm font-semibold text-amber-800 shadow-sm">
                {attentionCount}{" "}
                élément
                {attentionCount > 1
                  ? "s"
                  : ""}
              </span>
            </div>
            {attentionCount === 0 ? (
              <div className="mt-5 rounded-xl border border-dashed border-amber-200 bg-white/80 px-6 py-8 text-center">
                <p className="font-semibold text-slate-900">
                  Rien à traiter
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Aucune action urgente pour le moment.
                </p>
              </div>
            ) : (
            <div className="mt-5 grid gap-3">
              {dueFollowUps.map(
                (action) => (
                  <CommercialActionCard
                    key={action.prospection.id}
                    action={action}
                    due
                  />
                )
              )}
              {toPrepare.map(
                (item) => (
                  <NewsAction
                    key={item.id}
                    news={item}
                  />
                )
              )}
              {readyToSchedule.map(
                (publication) => (
                  <PublicationAction
                    key={publication.id}
                    publication={
                      publication
                    }
                    actionLabel="Prête à planifier"
                  />
                )
              )}
              {failed.map(
                (publication) => (
                  <PublicationAction
                    key={publication.id}
                    publication={
                      publication
                    }
                    actionLabel="À corriger"
                    tone="error"
                  />
                )
              )}
            </div>
            )}
          </section>
        <section className="mt-8 rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 via-sky-50 to-white p-6 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-500" />
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
                  Prochainement
                </p>
              </div>
              <h2 className="mt-2 text-xl font-bold text-slate-950">
                Prochaines échéances
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Les prochaines relances et
                publications programmées.
              </p>
            </div>
          </div>
          {upcomingFollowUps.length === 0 &&
          upcomingPublications.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-cyan-200 bg-white/80 px-6 py-8 text-center">
              <p className="font-semibold text-slate-900">
                Aucune échéance programmée
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Rien de prévu prochainement.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-3">
              {upcomingFollowUps.map(
                (action) => (
                  <CommercialActionCard
                    key={action.prospection.id}
                    action={action}
                  />
                )
              )}
              {upcomingPublications.map(
                (publication) => (
                  <PublicationAction
                    key={publication.id}
                    publication={publication}
                    showDateTime
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
function CommercialActionCard({
  action,
  due = false,
}: {
  action: CommercialAction;
  due?: boolean;
}) {
  const { prospection, company } =
    action;
  return (
    <Link
      href={`/companies/${prospection.company_id}`}
      className={`block rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        due
          ? "border-amber-200 hover:border-amber-300"
          : "border-slate-200 hover:border-cyan-300"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p
            className={`text-xs font-bold uppercase tracking-wide ${
              due
                ? "text-amber-700"
                : "text-blue-700"
            }`}
          >
            {due
              ? "Relance à faire"
              : "Relance commerciale"}
          </p>
          <h3 className="mt-2 font-semibold text-slate-950">
            {company?.name ?? "Entreprise"}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {prospection.subject ??
              "Prospection après audit de site"}
          </p>
        </div>
        <div className="shrink-0 text-right">
          {prospection.follow_up_at ? (
            <p className="text-sm font-bold text-slate-950">
              {due &&
              isToday(
                prospection.follow_up_at
              )
                ? "Aujourd’hui"
                : formatDate(
                    prospection.follow_up_at
                  )}
            </p>
          ) : null}
          <p
            className={`mt-1 text-xs font-semibold ${
              due
                ? "text-amber-700"
                : "text-blue-700"
            }`}
          >
            Ouvrir →
          </p>
        </div>
      </div>
    </Link>
  );
}
function NewsAction({
  news,
}: {
  news: DashboardNews;
}) {
  return (
    <Link
      href={`/news/${news.id}`}
      className="block rounded-2xl border border-amber-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
            Actualité à préparer
          </p>
          <h3 className="mt-2 font-semibold text-slate-950">
            {news.title ||
              "Actualité sans titre"}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Le brouillon ne contient
            encore aucun contenu.
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-semibold text-amber-700">
            Ouvrir →
          </p>
        </div>
      </div>
    </Link>
  );
}
function PublicationAction({
  publication,
  showDateTime = false,
  tone = "default",
  actionLabel,
}: {
  publication: DashboardPublication;
  showDateTime?: boolean;
  tone?: "default" | "error";
  actionLabel?: string;
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
          : actionLabel
            ? "border-amber-200 bg-white hover:border-amber-300"
            : "border-slate-200 bg-white hover:border-cyan-300"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p
            className={`text-xs font-bold uppercase tracking-wide ${
              tone === "error"
                ? "text-red-700"
                : actionLabel
                  ? "text-amber-700"
                  : "text-blue-700"
            }`}
          >
            {actionLabel
              ? `${actionLabel} · ${
                  channelLabels[
                    publication.channel
                  ]
                }`
              : channelLabels[
                  publication.channel
                ]}
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
          {showDateTime &&
          publication.scheduled_at ? (
            <>
              <p className="text-sm font-bold text-slate-950">
                {isToday(
                  publication.scheduled_at
                )
                  ? "Aujourd’hui"
                  : formatDate(
                      publication.scheduled_at
                    )}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {formatTime(
                  publication.scheduled_at
                )}
              </p>
            </>
          ) : null}
          <p
            className={`mt-1 text-xs font-semibold ${
              tone === "error"
                ? "text-red-700"
                : actionLabel
                  ? "text-amber-700"
                  : "text-blue-700"
            }`}
          >
            Ouvrir →
          </p>
        </div>
      </div>
    </Link>
  );
}
