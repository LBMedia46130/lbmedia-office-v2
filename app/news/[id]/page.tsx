import Link from "next/link";
import { notFound } from "next/navigation";

import PageBanner from "@/components/dashboard/PageBanner";
import DeclinationTabs from "@/components/news/DeclinationTabs";
import NewsEditor from "@/components/news/NewsEditor";

import type {
  Publication,
  PublicationChannel,
} from "@/lib/news";

import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type NewsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const allChannels: {
  key: PublicationChannel;
  label: string;
}[] = [
  {
    key: "website",
    label: "Site Web",
  },
  {
    key: "brevo",
    label: "Brevo",
  },
  {
    key: "google_business",
    label: "Google Business",
  },
  {
    key: "linkedin",
    label: "LinkedIn",
  },
  {
    key: "facebook",
    label: "Facebook",
  },
];

export default async function NewsPage({
  params,
}: NewsPageProps) {
  const { id } = await params;

  const {
    data: news,
    error: newsError,
  } = await supabaseAdmin
    .from("news")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (newsError) {
    throw new Error(
      `Impossible de charger l’actualité : ${newsError.message}`
    );
  }

  if (!news) {
    notFound();
  }

  const {
    data: existingPublications,
    error: publicationsError,
  } = await supabaseAdmin
    .from("publications")
    .select("*")
    .eq("news_id", id);

  if (publicationsError) {
    throw new Error(
      `Impossible de charger les déclinaisons : ${publicationsError.message}`
    );
  }

  const existingChannels = new Set(
    (existingPublications ?? []).map(
      (publication) =>
        publication.channel
    )
  );

  const missingPublications =
    allChannels
      .filter(
        (channel) =>
          !existingChannels.has(
            channel.key
          )
      )
      .map((channel) => ({
        news_id: id,
        channel: channel.key,
        title:
          channel.key === "website"
            ? news.title
            : null,
        content: "",
        status: "draft",
      }));

  if (
    missingPublications.length > 0
  ) {
    const { error: upsertError } =
      await supabaseAdmin
        .from("publications")
        .upsert(
          missingPublications,
          {
            onConflict:
              "news_id,channel",
            ignoreDuplicates: true,
          }
        );

    if (upsertError) {
      throw new Error(
        `Impossible de préparer les déclinaisons : ${upsertError.message}`
      );
    }
  }

  const {
    data: publications,
    error: finalError,
  } = await supabaseAdmin
    .from("publications")
    .select("*")
    .eq("news_id", id)
    .order("created_at", {
      ascending: true,
    });

  if (finalError) {
    throw new Error(
      `Impossible de charger les déclinaisons : ${finalError.message}`
    );
  }

  const publicationList =
    (publications ?? []) as Publication[];

  const websitePublication =
    publicationList.find(
      (publication) =>
        publication.channel ===
        "website"
    );

  if (!websitePublication) {
    throw new Error(
      "La passerelle WordPress est introuvable."
    );
  }

  const publicationTargets =
    publicationList.map(
      (publication) => ({
        id: publication.id,
        channel:
          publication.channel,
      })
    );

  const declinations =
    publicationList.filter(
      (publication) =>
        publication.channel !==
        "website"
    );

  const readyCount =
    declinations.filter(
      (publication) =>
        publication.status ===
        "ready"
    ).length;

  const scheduledCount =
    declinations.filter(
      (publication) =>
        publication.status ===
        "scheduled"
    ).length;

  const publishedCount =
    declinations.filter(
      (publication) =>
        publication.status ===
        "published"
    ).length;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <PageBanner
          eyebrow="Module éditorial"
          title={
            news.title ||
            "Actualité"
          }
          description="Prépare l’article principal LBMedia puis ses déclinaisons pour les différents supports."
        />

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/news"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-blue-700"
          >
            <span aria-hidden="true">
              ←
            </span>

            Retour aux actualités
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <StatusSummary
              label="Prêtes"
              value={readyCount}
              className="border-amber-200 bg-amber-50 text-amber-700"
            />

            <StatusSummary
              label="Planifiées"
              value={
                scheduledCount
              }
              className="border-cyan-200 bg-cyan-50 text-cyan-700"
            />

            <StatusSummary
              label="Publiées"
              value={
                publishedCount
              }
              className="border-emerald-200 bg-emerald-50 text-emerald-700"
            />
          </div>
        </div>

        <section className="mt-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <ArticleIcon />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                Article de référence
              </p>

              <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
                Contenu principal
              </h2>
            </div>
          </div>

          <NewsEditor
            news={news}
            publications={
              publicationTargets
            }
            websitePublication={
              websitePublication
            }
          />
        </section>

        <section className="mt-12 pb-12">
          <div className="rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-cyan-50 p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                  <DiffusionIcon />
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">
                    Diffusion
                  </p>

                  <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
                    Déclinaisons
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                    Retrouve ici les
                    versions adaptées de
                    l’actualité pour
                    Brevo, Google
                    Business, LinkedIn et
                    Facebook.
                  </p>
                </div>
              </div>

              <div className="rounded-full border border-violet-200 bg-white px-4 py-2 text-xs font-bold text-violet-700 shadow-sm">
                {
                  declinations.length
                }{" "}
                supports
              </div>
            </div>

            <div className="mt-6">
              <DeclinationTabs
                publications={
                  declinations
                }
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatusSummary({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${className}`}
    >
      <span className="h-2 w-2 rounded-full bg-current opacity-80" />

      <span>
        {label}
      </span>

      <span className="font-bold">
        {value}
      </span>
    </div>
  );
}

function ArticleIcon() {
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

      <path d="M8 8h8" />
      <path d="M8 12h8" />
      <path d="M8 16h5" />
    </svg>
  );
}

function DiffusionIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="2"
      />

      <path d="M7.8 7.8a6 6 0 0 0 0 8.4" />
      <path d="M16.2 7.8a6 6 0 0 1 0 8.4" />
      <path d="M4.9 4.9a10 10 0 0 0 0 14.2" />
      <path d="M19.1 4.9a10 10 0 0 1 0 14.2" />
    </svg>
  );
}