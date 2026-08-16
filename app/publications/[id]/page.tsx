import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";
import { revalidatePath } from "next/cache";

import DeletePublicationButton from "@/components/news/DeletePublicationButton";
import PublicationEditor from "@/components/news/PublicationEditor";

import type {
  Publication,
  PublicationChannel,
} from "@/lib/news";

import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic =
  "force-dynamic";

type PublicationPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const channelLabels: Record<
  PublicationChannel,
  string
> = {
  website:
    "Actualité / WordPress",
  brevo: "Brevo",
  google_business:
    "Google Business",
  linkedin: "LinkedIn",
  facebook: "Facebook",
};

export default async function PublicationPage({
  params,
}: PublicationPageProps) {
  const { id } =
    await params;

  const {
    data,
    error,
  } = await supabaseAdmin
    .from("publications")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Impossible de charger la publication : ${error.message}`
    );
  }

  if (!data) {
    notFound();
  }

  const publication =
    data as Publication;

  if (
    publication.news_id
  ) {
    redirect(
      `/news/${publication.news_id}`
    );
  }

  if (
    publication.channel ===
    "website"
  ) {
    throw new Error(
      "Une publication WordPress doit être rattachée à une actualité."
    );
  }

  async function deletePublication() {
    "use server";

    const {
      data: publicationToDelete,
      error: loadError,
    } = await supabaseAdmin
      .from("publications")
      .select("id, news_id")
      .eq("id", id)
      .maybeSingle();

    if (loadError) {
      throw new Error(
        `Impossible de vérifier la publication : ${loadError.message}`
      );
    }

    if (!publicationToDelete) {
      redirect("/news");
    }

    if (
      publicationToDelete.news_id
    ) {
      throw new Error(
        "Cette publication est rattachée à une actualité et ne peut pas être supprimée depuis cette page."
      );
    }

    const {
      error: deleteError,
    } = await supabaseAdmin
      .from("publications")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw new Error(
        `Impossible de supprimer la publication : ${deleteError.message}`
      );
    }

    revalidatePath("/");
    revalidatePath("/news");
    revalidatePath("/planning");

    redirect("/news");
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <Link
          href="/"
          className="text-sm font-semibold text-slate-600 transition hover:text-slate-950"
        >
          ← Retour au pilotage
        </Link>

        <div className="mt-6">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
            LBMedia Office
          </p>

          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                Publication{" "}
                {
                  channelLabels[
                    publication.channel
                  ]
                }
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Publication indépendante.
                Pénélope peut la rédiger,
                puis tu peux la valider
                et la planifier comme
                les autres contenus.
              </p>
            </div>

            <DeletePublicationButton
              action={
                deletePublication
              }
            />
          </div>
        </div>

        <div className="mt-8">
          <PublicationEditor
            publication={
              publication
            }
            label={
              channelLabels[
                publication.channel
              ]
            }
          />
        </div>
      </div>
    </main>
  );
}