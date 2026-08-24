import Link from "next/link";

import PageBanner from "@/components/dashboard/PageBanner";
import WeeklyTopics from "@/components/penelope/WeeklyTopics";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type StandalonePublication = {
  id: string;
  title: string | null;
  content: string;
  channel: string;
  status: string;
  created_at: string;
  scheduled_at: string | null;
  published_at: string | null;
};

export default async function NewsPage() {
  const [
    newsResult,
    postsResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("news")
      .select("*")
      .order("created_at", {
        ascending: false,
      }),

    supabaseAdmin
      .from("publications")
      .select(`
        id,
        title,
        content,
        channel,
        status,
        created_at,
        scheduled_at,
        published_at
      `)
      .is("news_id", null)
      .order("created_at", {
        ascending: false,
      }),
  ]);

  if (newsResult.error) {
    throw new Error(
      `Impossible de charger les actualités : ${newsResult.error.message}`
    );
  }

  if (postsResult.error) {
    throw new Error(
      `Impossible de charger les posts : ${postsResult.error.message}`
    );
  }

  const news =
    newsResult.data ?? [];

  const posts =
    (postsResult.data ??
      []) as StandalonePublication[];

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
          description="Crée, rédige et prépare les actualités et publications LBMedia avant leur diffusion sur les différents supports."
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

        <div className="mt-8">
          <WeeklyTopics />
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

        <section className="mt-8 rounded-2xl border border-violet-100 bg-gradient-to-br from-white via-violet-50/20 to-blue-50/30 p-5 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4 px-1 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />

                <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700">
                  Publications
                </p>
              </div>

              <h2 className="mt-2 text-xl font-bold text-slate-950">
                Posts indépendants
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Historique des posts
                créés directement pour
                LinkedIn, Facebook et
                les autres supports.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="rounded-full border border-violet-200 bg-white px-3 py-1.5 text-sm font-semibold text-violet-700 shadow-sm">
                {posts.length}{" "}
                post
                {posts.length > 1
                  ? "s"
                  : ""}
              </span>

              <Link
                href="/publications/new"
                className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 transition hover:border-violet-300 hover:bg-violet-100"
              >
                + Nouveau post
              </Link>
            </div>
          </div>

          {posts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-violet-200 bg-white/70 px-6 py-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                <PostIcon />
              </div>

              <h3 className="mt-4 text-base font-bold text-slate-950">
                Aucun post indépendant
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Les posts créés
                directement depuis
                LBMedia Office
                apparaîtront ici.
              </p>

              <Link
                href="/publications/new"
                className="mt-5 inline-flex rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
              >
                Créer un post
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {posts.map(
                (post) => (
                  <PostCard
                    key={post.id}
                    post={post}
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
              {formatDateTime(
                item.created_at
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

function PostCard({
  post,
}: {
  post: StandalonePublication;
}) {
  const accent =
    getStatusAccent(
      post.status
    );

  const displayTitle =
    post.title?.trim() ||
    getPostTitle(
      post.content
    );

  const dateInfo =
    getPostDateInfo(post);

  return (
    <Link
      href={`/publications/${post.id}`}
      className={`group relative overflow-hidden rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${accent.border}`}
    >
      <span
        className={`absolute inset-y-0 left-0 w-1 ${accent.bar}`}
      />

      <div className="flex items-start justify-between gap-6 pl-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <ChannelBadge
              channel={
                post.channel
              }
            />

            <StatusBadge
              status={
                post.status
              }
            />

            <p className="text-xs font-medium text-slate-400">
              {dateInfo.label}{" "}
              {formatDateTime(
                dateInfo.value
              )}
            </p>
          </div>

          <h3 className="mt-3 text-lg font-bold text-slate-950 transition group-hover:text-violet-700">
            {displayTitle}
          </h3>

          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
            {post.content ||
              "Aucun contenu rédigé pour le moment."}
          </p>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition group-hover:bg-violet-50 group-hover:text-violet-600">
          <ArrowIcon />
        </div>
      </div>
    </Link>
  );
}

function getPostTitle(
  content: string
) {
  const firstLine =
    content
      .split(/\r?\n/)
      .map((line) =>
        line.trim()
      )
      .find(Boolean);

  if (firstLine) {
    return firstLine.slice(
      0,
      120
    );
  }

  return "Post sans titre";
}

function getPostDateInfo(
  post: StandalonePublication
) {
  if (
    post.status ===
      "published" &&
    post.published_at
  ) {
    return {
      label: "Publiée le",
      value:
        post.published_at,
    };
  }

  if (
    post.status ===
      "scheduled" &&
    post.scheduled_at
  ) {
    return {
      label: "Planifiée pour le",
      value:
        post.scheduled_at,
    };
  }

  return {
    label: "Créée le",
    value:
      post.created_at,
  };
}

function formatDateTime(
  value: string
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone:
        "Europe/Paris",
    }
  ).format(date);
}

function ChannelBadge({
  channel,
}: {
  channel: string;
}) {
  const labels: Record<
    string,
    string
  > = {
    linkedin: "LinkedIn",
    facebook: "Facebook",
    google_business:
      "Google Business",
    brevo: "Brevo",
    website: "Site web",
  };

  const classes: Record<
    string,
    string
  > = {
    linkedin:
      "bg-sky-50 text-sky-700 ring-sky-200",

    facebook:
      "bg-blue-50 text-blue-700 ring-blue-200",

    google_business:
      "bg-emerald-50 text-emerald-700 ring-emerald-200",

    brevo:
      "bg-orange-50 text-orange-700 ring-orange-200",

    website:
      "bg-violet-50 text-violet-700 ring-violet-200",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
        classes[channel] ??
        "bg-slate-100 text-slate-600 ring-slate-200"
      }`}
    >
      {labels[channel] ??
        channel}
    </span>
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
    failed: "Échec",
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

    failed:
      "bg-red-50 text-red-700 ring-red-200",
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

    case "failed":
      return {
        border:
          "border-red-100 hover:border-red-200",
        bar: "bg-red-400",
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

function PostIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d="M5 5h14v11H8l-3 3V5Z" />
      <path d="M8 9h8" />
      <path d="M8 12h5" />
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