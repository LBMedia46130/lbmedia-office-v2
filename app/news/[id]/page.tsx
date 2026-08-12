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

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <PageBanner
          eyebrow="Module éditorial"
          title={news.title || "Actualité"}
          description="Prépare l’article principal LBMedia puis ses déclinaisons pour les différents supports."
        />

        <div className="mt-5">
          <Link
            href="/news"
            className="text-sm font-semibold text-slate-500 transition hover:text-slate-950"
          >
            ← Retour aux actualités
          </Link>
        </div>

        <div className="mt-6">
          <NewsEditor
            news={news}
            publications={
              publicationTargets
            }
            websitePublication={
              websitePublication
            }
          />
        </div>

        <section className="mt-10 pb-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              Diffusion
            </p>

            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
              Déclinaisons
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Versions adaptées de
              l’actualité pour chaque
              support de communication.
            </p>
          </div>

          <div className="mt-6">
            <DeclinationTabs
              publications={
                declinations
              }
            />
          </div>
        </section>
      </div>
    </main>
  );
}