"use client";

import { useRouter } from "next/navigation";
import {
  FormEvent,
  useState,
} from "react";

import type {
  News,
  NewsStatus,
  Publication,
  PublicationChannel,
} from "@/lib/news";

type PublicationTarget = {
  id: string;
  channel: PublicationChannel;
};

type NewsEditorProps = {
  news: News;
  publications: PublicationTarget[];
  websitePublication: Publication;
};

const statusOptions: {
  value: NewsStatus;
  label: string;
}[] = [
  {
    value: "draft",
    label: "Brouillon",
  },
  {
    value: "ready",
    label: "Prête",
  },
  {
    value: "scheduled",
    label: "Planifiée",
  },
  {
    value: "published",
    label: "Publiée",
  },
];

const generationOrder: PublicationChannel[] = [
  "brevo",
  "google_business",
  "linkedin",
  "facebook",
];

function toLocalDateTimeValue(
  value: string | null
) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset =
    date.getTimezoneOffset() *
    60_000;

  return new Date(
    date.getTime() - offset
  )
    .toISOString()
    .slice(0, 16);
}

function toIsoDateTime(
  value: string
) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

export default function NewsEditor({
  news,
  publications,
  websitePublication,
}: NewsEditorProps) {
  const router = useRouter();

  const [title, setTitle] =
    useState(news.title);

  const [content, setContent] =
    useState(news.content);

  const [status, setStatus] =
    useState(news.status);

  const [
    scheduledAt,
    setScheduledAt,
  ] = useState(
    toLocalDateTimeValue(
      websitePublication.scheduled_at
    )
  );

  const [imageUrl, setImageUrl] =
    useState(news.image_url ?? "");

  const [sourceUrl, setSourceUrl] =
    useState(news.source_url ?? "");

  const [focusKeyword, setFocusKeyword] =
    useState(
      websitePublication.focus_keyword ?? ""
    );

  const [
    secondaryKeywords,
    setSecondaryKeywords,
  ] = useState(
    websitePublication.secondary_keywords ?? ""
  );

  const [slug, setSlug] =
    useState(
      websitePublication.slug ?? ""
    );

  const [seoTitle, setSeoTitle] =
    useState(
      websitePublication.seo_title ?? ""
    );

  const [
    metaDescription,
    setMetaDescription,
  ] = useState(
    websitePublication.meta_description ?? ""
  );

  const [imageAlt, setImageAlt] =
    useState(
      websitePublication.image_alt ?? ""
    );

  const [isSaving, setIsSaving] =
    useState(false);

  const [isDeleting, setIsDeleting] =
    useState(false);

  const [
    isPreparingCommunication,
    setIsPreparingCommunication,
  ] = useState(false);

  const [
    isGeneratingArticle,
    setIsGeneratingArticle,
  ] = useState(false);

  const [
    isGeneratingVisual,
    setIsGeneratingVisual,
  ] = useState(false);

  const [
    isPublishingWordPressDraft,
    setIsPublishingWordPressDraft,
  ] = useState(false);

  const [
    isPublishingWordPressLive,
    setIsPublishingWordPressLive,
  ] = useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  function validatePlanning() {
    if (
      status === "scheduled" &&
      !scheduledAt
    ) {
      throw new Error(
        "Choisis une date et une heure de publication."
      );
    }
  }

  async function saveNews() {
    const cleanTitle =
      title.trim();

    if (!cleanTitle) {
      throw new Error(
        "Le titre est obligatoire."
      );
    }

    validatePlanning();

    const response = await fetch(
      `/api/news/${news.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          title: cleanTitle,
          content: content.trim(),
          status,
          image_url:
            imageUrl.trim() || null,
          source_url:
            sourceUrl.trim() || null,
        }),
      }
    );

    const result =
      await response.json();

    if (
      !response.ok ||
      !result.success
    ) {
      throw new Error(
        result.message ??
          "Impossible d’enregistrer l’actualité."
      );
    }

    return result.news;
  }

  async function syncWebsitePublication() {
    validatePlanning();

    const response = await fetch(
      `/api/publications/${websitePublication.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          status,
          link_url:
            sourceUrl.trim() || null,
          focus_keyword:
            focusKeyword.trim() || null,
          secondary_keywords:
            secondaryKeywords.trim() || null,
          slug:
            slug.trim() || null,
          seo_title:
            seoTitle.trim() || null,
          meta_description:
            metaDescription.trim() || null,
          image_alt:
            imageAlt.trim() || null,
          scheduled_at:
            status === "scheduled"
              ? toIsoDateTime(
                  scheduledAt
                )
              : null,
        }),
      }
    );

    const result =
      await response.json();

    if (
      !response.ok ||
      !result.success
    ) {
      throw new Error(
        result.message ??
          "Impossible de préparer l’article pour WordPress."
      );
    }

    return result.publication;
  }

  async function saveEverything() {
    await syncWebsitePublication();
    await saveNews();
  }

  async function handleSubmit(
    event: FormEvent
  ) {
    event.preventDefault();

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      await saveEverything();

      setMessage(
        status === "scheduled"
          ? "Actualité planifiée et enregistrée."
          : "Actualité enregistrée."
      );

      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Une erreur est survenue."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function generateArticle() {
    const confirmed =
      !content.trim() ||
      window.confirm(
        "Pénélope va rédiger ou améliorer l’article actuel et préparer ses éléments SEO/GEO. Le contenu actuel pourra être remplacé. Continuer ?"
      );

    if (!confirmed) {
      return;
    }

    setIsGeneratingArticle(true);
    setMessage(
      "Pénélope rédige et optimise l’article, puis prépare ses éléments SEO/GEO..."
    );
    setError(null);

    try {
      await saveEverything();

      const response = await fetch(
        `/api/news/${news.id}/generate-article`,
        {
          method: "POST",
        }
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ??
            "Impossible de rédiger l’article."
        );
      }

      if (result.news) {
        setTitle(
          result.news.title ?? ""
        );

        setContent(
          result.news.content ?? ""
        );
      }

      if (result.publication) {
        setFocusKeyword(
          result.publication.focus_keyword ??
            ""
        );

        setSecondaryKeywords(
          result.publication.secondary_keywords ??
            ""
        );

        setSlug(
          result.publication.slug ??
            ""
        );

        setSeoTitle(
          result.publication.seo_title ??
            ""
        );

        setMetaDescription(
          result.publication.meta_description ??
            ""
        );

        setImageAlt(
          result.publication.image_alt ??
            ""
        );
      }

      setMessage(
        "Article et éléments SEO/GEO générés. Relis et ajuste avant de préparer les déclinaisons."
      );

      router.refresh();
    } catch (generationError) {
      setMessage(null);

      setError(
        generationError instanceof Error
          ? generationError.message
          : "Une erreur est survenue."
      );
    } finally {
      setIsGeneratingArticle(false);
    }
  }

  async function generatePublication(
    publicationId: string
  ) {
    const response = await fetch(
      `/api/publications/${publicationId}/generate`,
      {
        method: "POST",
      }
    );

    const result =
      await response.json();

    if (
      !response.ok ||
      !result.success
    ) {
      throw new Error(
        result.message ??
          "Impossible de générer une déclinaison."
      );
    }

    return result.publication;
  }

  async function prepareCommunication() {
    if (!title.trim()) {
      setMessage(null);
      setError(
        "Le titre est obligatoire."
      );
      return;
    }

    if (!content.trim()) {
      setMessage(null);
      setError(
        "Rédige d’abord l’actualité avant de préparer ses déclinaisons."
      );
      return;
    }

    const confirmed =
      window.confirm(
        "Préparer les déclinaisons Brevo, Google Business, LinkedIn et Facebook à partir de cette actualité ? Les propositions existantes seront remplacées."
      );

    if (!confirmed) {
      return;
    }

    setIsPreparingCommunication(true);
    setMessage(
      "Pénélope prépare les déclinaisons de l’actualité pour chaque support..."
    );
    setError(null);

    try {
      await saveEverything();

      for (const channel of generationOrder) {
        const target =
          publications.find(
            (publication) =>
              publication.channel ===
              channel
          );

        if (!target) {
          throw new Error(
            `La déclinaison ${getChannelLabel(
              channel
            )} est introuvable.`
          );
        }

        setMessage(
          `Pénélope prépare la déclinaison ${getChannelLabel(
            channel
          )}...`
        );

        await generatePublication(
          target.id
        );
      }

      setMessage(
        "Les déclinaisons Brevo, Google Business, LinkedIn et Facebook sont prêtes."
      );

      router.refresh();
    } catch (preparationError) {
      setMessage(null);

      setError(
        preparationError instanceof Error
          ? preparationError.message
          : "Impossible de préparer les déclinaisons."
      );
    } finally {
      setIsPreparingCommunication(
        false
      );
    }
  }

  async function generateVisual() {
    if (!title.trim()) {
      setMessage(null);
      setError(
        "Le titre est obligatoire avant de générer le visuel."
      );

      return;
    }

    if (!content.trim()) {
      setMessage(null);
      setError(
        "Rédige d’abord l’article avant de générer son visuel."
      );

      return;
    }

    const confirmed =
      !imageUrl.trim() ||
      window.confirm(
        "Un visuel existe déjà pour cette actualité. Le nouveau visuel remplacera son URL dans LBMedia Office. Continuer ?"
      );

    if (!confirmed) {
      return;
    }

    setIsGeneratingVisual(true);
    setMessage(
      "Pénélope génère le visuel éditorial de l’article..."
    );
    setError(null);

    try {
      await saveEverything();

      const response = await fetch(
        `/api/news/${news.id}/generate-visual`,
        {
          method: "POST",
        }
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ??
            "Impossible de générer le visuel."
        );
      }

      const generatedImageUrl =
        result.image_url ??
        result.news?.image_url ??
        "";

      if (!generatedImageUrl) {
        throw new Error(
          "Le visuel a été généré mais son URL n’a pas été retournée."
        );
      }

      setImageUrl(
        generatedImageUrl
      );

      setMessage(
        "Visuel généré et enregistré. Vérifie-le avant utilisation."
      );
    } catch (visualError) {
      setMessage(null);

      setError(
        visualError instanceof Error
          ? visualError.message
          : "Une erreur est survenue."
      );
    } finally {
      setIsGeneratingVisual(false);
    }
  }

  async function sendToWordPressDraft() {
    if (!content.trim()) {
      setMessage(null);
      setError(
        "Le contenu de l’actualité est vide."
      );
      return;
    }

    const confirmed =
      window.confirm(
        "Créer ou mettre à jour le brouillon WordPress avec cette actualité ?"
      );

    if (!confirmed) {
      return;
    }

    setIsPublishingWordPressDraft(true);
    setMessage(null);
    setError(null);

    try {
      await saveEverything();

      const response = await fetch(
        `/api/publications/${websitePublication.id}/publish-wordpress`,
        {
          method: "POST",
        }
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ??
            "Impossible de traiter le brouillon WordPress."
        );
      }

      setMessage(
        result.action === "updated"
          ? "Brouillon WordPress mis à jour."
          : "Brouillon WordPress créé."
      );

      router.refresh();
    } catch (publishError) {
      setError(
        publishError instanceof Error
          ? publishError.message
          : "Une erreur est survenue."
      );
    } finally {
      setIsPublishingWordPressDraft(
        false
      );
    }
  }

  async function publishWordPressLive() {
    const confirmed =
      window.confirm(
        "Publier maintenant cette actualité sur lbmedia.fr ? Cette action la rendra visible publiquement."
      );

    if (!confirmed) {
      return;
    }

    setIsPublishingWordPressLive(true);
    setMessage(null);
    setError(null);

    try {
      const publicationResponse =
        await fetch(
          `/api/publications/${websitePublication.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              title: title.trim(),
              content:
                content.trim(),
              status: "ready",
              scheduled_at: null,
              link_url:
                sourceUrl.trim() ||
                null,
              focus_keyword:
                focusKeyword.trim() ||
                null,
              secondary_keywords:
                secondaryKeywords.trim() ||
                null,
              slug:
                slug.trim() ||
                null,
              seo_title:
                seoTitle.trim() ||
                null,
              meta_description:
                metaDescription.trim() ||
                null,
              image_alt:
                imageAlt.trim() ||
                null,
            }),
          }
        );

      const publicationResult =
        await publicationResponse.json();

      if (
        !publicationResponse.ok ||
        !publicationResult.success
      ) {
        throw new Error(
          publicationResult.message ??
            "Impossible de préparer l’article pour WordPress."
        );
      }

      const newsResponse =
        await fetch(
          `/api/news/${news.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              title:
                title.trim(),
              content:
                content.trim(),
              status: "ready",
              image_url:
                imageUrl.trim() ||
                null,
              source_url:
                sourceUrl.trim() ||
                null,
            }),
          }
        );

      const newsResult =
        await newsResponse.json();

      if (
        !newsResponse.ok ||
        !newsResult.success
      ) {
        throw new Error(
          newsResult.message ??
            "Impossible d’enregistrer l’actualité."
        );
      }

      const response = await fetch(
        `/api/publications/${websitePublication.id}/publish-wordpress-live`,
        {
          method: "POST",
        }
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ??
            "Impossible de publier l’actualité sur WordPress."
        );
      }

      const syncNewsResponse =
        await fetch(
          `/api/news/${news.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              status: "published",
            }),
          }
        );

      const syncNewsResult =
        await syncNewsResponse.json();

      if (
        !syncNewsResponse.ok ||
        !syncNewsResult.success
      ) {
        throw new Error(
          syncNewsResult.message ??
            "L’article est publié mais le statut de l’actualité n’a pas pu être synchronisé."
        );
      }

      setStatus("published");
      setScheduledAt("");

      setMessage(
        "Actualité publiée sur WordPress."
      );

      router.refresh();
    } catch (publishError) {
      setError(
        publishError instanceof Error
          ? publishError.message
          : "Une erreur est survenue."
      );
    } finally {
      setIsPublishingWordPressLive(
        false
      );
    }
  }

  async function handleDelete() {
    const confirmed =
      window.confirm(
        "Supprimer définitivement cette actualité ?"
      );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/news/${news.id}`,
        {
          method: "DELETE",
        }
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ??
            "Impossible de supprimer l’actualité."
        );
      }

      router.push("/news");
      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Une erreur est survenue."
      );

      setIsDeleting(false);
    }
  }

  const isBusy =
    isSaving ||
    isDeleting ||
    isPreparingCommunication ||
    isGeneratingArticle ||
    isGeneratingVisual ||
    isPublishingWordPressDraft ||
    isPublishingWordPressLive;

  const hasWordPressPost =
    Boolean(
      websitePublication.wordpress_post_id
    );

  const penelopeTitle =
    isGeneratingArticle
      ? "Pénélope rédige et optimise l’article"
      : isPreparingCommunication
        ? "Pénélope prépare les déclinaisons"
        : isGeneratingVisual
          ? "Pénélope prépare le visuel"
          : "Préparer la communication";

  const penelopeDescription =
    isGeneratingArticle
      ? "Elle travaille sur l’article principal et prépare ses éléments SEO/GEO."
      : isPreparingCommunication
        ? "Elle adapte l’actualité pour Brevo, Google Business, LinkedIn et Facebook."
        : isGeneratingVisual
          ? "Elle crée une illustration éditoriale à partir du contenu de l’article."
          : "Pénélope peut travailler l’article, ses optimisations et ses déclinaisons pour les différents supports.";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="mb-6 rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-indigo-950">
              {penelopeTitle}
            </p>

            <p className="mt-1 text-sm leading-6 text-indigo-800">
              {penelopeDescription}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={
                generateArticle
              }
              disabled={isBusy}
              className="rounded-xl border border-indigo-300 bg-white px-5 py-3 text-sm font-semibold text-indigo-800 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGeneratingArticle
                ? "Rédaction et optimisation..."
                : "Rédiger / optimiser l’article"}
            </button>

            <button
              type="button"
              onClick={
                prepareCommunication
              }
              disabled={isBusy}
              className="rounded-xl bg-indigo-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPreparingCommunication
                ? "Création des déclinaisons..."
                : "Préparer les déclinaisons"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-5">
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-semibold text-slate-900"
          >
            Titre de l’actualité
          </label>

          <input
            id="title"
            type="text"
            value={title}
            onChange={(event) =>
              setTitle(
                event.target.value
              )
            }
            disabled={isBusy}
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-950 disabled:opacity-60"
          />
        </div>

        <div>
          <label
            htmlFor="status"
            className="block text-sm font-semibold text-slate-900"
          >
            Statut
          </label>

          <select
            id="status"
            value={status}
            onChange={(event) => {
              const nextStatus =
                event.target
                  .value as NewsStatus;

              setStatus(nextStatus);

              if (
                nextStatus !==
                "scheduled"
              ) {
                setScheduledAt("");
              }
            }}
            disabled={isBusy}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-950 disabled:opacity-60"
          >
            {statusOptions.map(
              (option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              )
            )}
          </select>
        </div>

        {status === "scheduled" ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <label
              htmlFor="scheduledAt"
              className="block text-sm font-semibold text-blue-950"
            >
              Date et heure de
              publication WordPress
            </label>

            <p className="mt-1 text-xs leading-5 text-blue-700">
              Cette date sera
              utilisée par le
              planning éditorial.
            </p>

            <input
              id="scheduledAt"
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) =>
                setScheduledAt(
                  event.target.value
                )
              }
              disabled={isBusy}
              className="mt-3 w-full rounded-xl border border-blue-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-blue-700 disabled:opacity-60"
            />
          </div>
        ) : null}

        <div>
          <label
            htmlFor="content"
            className="block text-sm font-semibold text-slate-900"
          >
            Actualité
          </label>

          <textarea
            id="content"
            value={content}
            onChange={(event) =>
              setContent(
                event.target.value
              )
            }
            rows={16}
            disabled={isBusy}
            className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-slate-950 disabled:opacity-60"
          />
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div>
            <p className="text-sm font-semibold text-emerald-950">
              SEO / GEO
            </p>

            <p className="mt-1 text-sm leading-6 text-emerald-800">
              Éléments préparés pour la mise en ligne dans WordPress et Rank Math.
            </p>
          </div>

          <div className="mt-5 grid gap-5">
            <div>
              <label
                htmlFor="focusKeyword"
                className="block text-sm font-semibold text-slate-900"
              >
                Mot-clé principal
              </label>

              <input
                id="focusKeyword"
                type="text"
                value={focusKeyword}
                onChange={(event) =>
                  setFocusKeyword(
                    event.target.value
                  )
                }
                disabled={isBusy}
                placeholder="Ex. communication locale"
                className="mt-2 w-full rounded-xl border border-emerald-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-emerald-700 disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="secondaryKeywords"
                className="block text-sm font-semibold text-slate-900"
              >
                Mots-clés secondaires
              </label>

              <input
                id="secondaryKeywords"
                type="text"
                value={secondaryKeywords}
                onChange={(event) =>
                  setSecondaryKeywords(
                    event.target.value
                  )
                }
                disabled={isBusy}
                placeholder="Séparés par des virgules"
                className="mt-2 w-full rounded-xl border border-emerald-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-emerald-700 disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="slug"
                className="block text-sm font-semibold text-slate-900"
              >
                Slug
              </label>

              <input
                id="slug"
                type="text"
                value={slug}
                onChange={(event) =>
                  setSlug(
                    event.target.value
                  )
                }
                disabled={isBusy}
                placeholder="communication-locale-pme"
                className="mt-2 w-full rounded-xl border border-emerald-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-emerald-700 disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="seoTitle"
                className="block text-sm font-semibold text-slate-900"
              >
                SEO title
              </label>

              <input
                id="seoTitle"
                type="text"
                value={seoTitle}
                onChange={(event) =>
                  setSeoTitle(
                    event.target.value
                  )
                }
                disabled={isBusy}
                className="mt-2 w-full rounded-xl border border-emerald-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-emerald-700 disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="metaDescription"
                className="block text-sm font-semibold text-slate-900"
              >
                Meta description
              </label>

              <textarea
                id="metaDescription"
                value={metaDescription}
                onChange={(event) =>
                  setMetaDescription(
                    event.target.value
                  )
                }
                rows={3}
                disabled={isBusy}
                className="mt-2 w-full resize-y rounded-xl border border-emerald-300 bg-white px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-emerald-700 disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="imageAlt"
                className="block text-sm font-semibold text-slate-900"
              >
                Texte ALT du visuel
              </label>

              <input
                id="imageAlt"
                type="text"
                value={imageAlt}
                onChange={(event) =>
                  setImageAlt(
                    event.target.value
                  )
                }
                disabled={isBusy}
                placeholder="Description utile et naturelle du visuel"
                className="mt-2 w-full rounded-xl border border-emerald-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-emerald-700 disabled:opacity-60"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-sky-950">
                Visuel de l’article
              </p>

              <p className="mt-1 text-sm leading-6 text-sky-800">
                Génère un visuel éditorial à partir de l’article et des éléments SEO/GEO, puis vérifie-le avant utilisation.
              </p>
            </div>

            <button
              type="button"
              onClick={
                generateVisual
              }
              disabled={isBusy}
              className="rounded-xl bg-sky-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGeneratingVisual
                ? "Génération du visuel..."
                : imageUrl.trim()
                  ? "Regénérer le visuel"
                  : "Générer le visuel"}
            </button>
          </div>

          {imageUrl.trim() ? (
            <div className="mt-5 overflow-hidden rounded-xl border border-sky-200 bg-white">
              <img
                src={imageUrl}
                alt={
                  imageAlt.trim() ||
                  "Visuel de l’article"
                }
                className="h-auto w-full object-cover"
              />
            </div>
          ) : null}

          <div className="mt-5">
            <label
              htmlFor="imageUrl"
              className="block text-sm font-semibold text-slate-900"
            >
              URL du visuel
            </label>

            <input
              id="imageUrl"
              type="url"
              value={imageUrl}
              onChange={(event) =>
                setImageUrl(
                  event.target.value
                )
              }
              disabled={isBusy}
              placeholder="https://..."
              className="mt-2 w-full rounded-xl border border-sky-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-700 disabled:opacity-60"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="sourceUrl"
            className="block text-sm font-semibold text-slate-900"
          >
            Lien associé
          </label>

          <input
            id="sourceUrl"
            type="url"
            value={sourceUrl}
            onChange={(event) =>
              setSourceUrl(
                event.target.value
              )
            }
            disabled={isBusy}
            placeholder="https://..."
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-950 disabled:opacity-60"
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <button
          type="button"
          onClick={
            sendToWordPressDraft
          }
          disabled={isBusy}
          className="rounded-xl border border-blue-300 bg-white px-4 py-2.5 text-sm font-semibold text-blue-800 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPublishingWordPressDraft
            ? "Envoi vers WordPress..."
            : hasWordPressPost
              ? "Mettre à jour le brouillon WordPress"
              : "Envoyer vers WordPress en brouillon"}
        </button>

        {hasWordPressPost &&
        websitePublication.status !==
          "published" ? (
          <button
            type="button"
            onClick={
              publishWordPressLive
            }
            disabled={isBusy}
            className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPublishingWordPressLive
              ? "Publication..."
              : "Publier sur WordPress"}
          </button>
        ) : null}
      </div>

      {message ? (
        <div className="mt-6 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-6">
        <button
          type="button"
          onClick={handleDelete}
          disabled={isBusy}
          className="rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isDeleting
            ? "Suppression..."
            : "Supprimer"}
        </button>

        <button
          type="submit"
          disabled={isBusy}
          className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving
            ? "Enregistrement..."
            : status ===
                "scheduled"
              ? "Enregistrer la planification"
              : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}

function getChannelLabel(
  channel: PublicationChannel
) {
  const labels: Record<
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

  return labels[channel];
}