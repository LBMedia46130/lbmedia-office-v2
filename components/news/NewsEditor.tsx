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
      className="space-y-6"
    >
      <section className="overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-violet-50 shadow-sm">
        <div className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex max-w-2xl items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                <PenelopeIcon />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
                  Pénélope
                </p>

                <h3 className="mt-1 text-lg font-bold text-slate-950">
                  {penelopeTitle}
                </h3>

                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {penelopeDescription}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={
                  generateArticle
                }
                disabled={isBusy}
                className="rounded-xl border border-indigo-200 bg-white px-5 py-3 text-sm font-semibold text-indigo-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
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
                className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPreparingCommunication
                  ? "Création des déclinaisons..."
                  : "Préparer les déclinaisons"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
        <SectionHeader
          eyebrow="Rédaction"
          title="Article"
          description="Le contenu principal qui servira de référence à toutes les déclinaisons."
          tone="blue"
          icon={<ArticleIcon />}
        />

        <div className="grid gap-5 p-6">
          <div className="grid gap-5 lg:grid-cols-[1fr_220px]">
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
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:opacity-60"
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
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:opacity-60"
              >
                {statusOptions.map(
                  (option) => (
                    <option
                      key={
                        option.value
                      }
                      value={
                        option.value
                      }
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          {status ===
          "scheduled" ? (
            <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700">
                  <CalendarIcon />
                </div>

                <div className="flex-1">
                  <label
                    htmlFor="scheduledAt"
                    className="block text-sm font-bold text-cyan-950"
                  >
                    Date et heure de
                    publication
                    WordPress
                  </label>

                  <p className="mt-1 text-xs leading-5 text-cyan-700">
                    Cette date sera
                    également utilisée
                    par le planning
                    éditorial.
                  </p>

                  <input
                    id="scheduledAt"
                    type="datetime-local"
                    value={
                      scheduledAt
                    }
                    onChange={(
                      event
                    ) =>
                      setScheduledAt(
                        event.target
                          .value
                      )
                    }
                    disabled={isBusy}
                    className="mt-3 w-full rounded-xl border border-cyan-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 disabled:opacity-60"
                  />
                </div>
              </div>
            </div>
          ) : null}

          <div>
            <div className="flex items-center justify-between gap-4">
              <label
                htmlFor="content"
                className="block text-sm font-semibold text-slate-900"
              >
                Contenu de
                l’article
              </label>

              <span className="text-xs text-slate-400">
                {
                  content.trim()
                    .length
                }{" "}
                caractères
              </span>
            </div>

            <textarea
              id="content"
              value={content}
              onChange={(event) =>
                setContent(
                  event.target.value
                )
              }
              rows={18}
              disabled={isBusy}
              className="mt-2 w-full resize-y rounded-xl border border-slate-300 bg-slate-50/40 px-4 py-4 text-sm leading-7 text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="sourceUrl"
              className="block text-sm font-semibold text-slate-900"
            >
              Lien associé
            </label>

            <p className="mt-1 text-xs text-slate-500">
              Source ou page
              éventuellement associée
              à cette actualité.
            </p>

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
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:opacity-60"
            />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
        <SectionHeader
          eyebrow="Référencement"
          title="SEO / GEO"
          description="Les éléments préparés pour WordPress, Rank Math et la visibilité du contenu."
          tone="emerald"
          icon={<SearchIcon />}
        />

        <div className="grid gap-5 p-6">
          <div className="grid gap-5 md:grid-cols-2">
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
                value={
                  focusKeyword
                }
                onChange={(event) =>
                  setFocusKeyword(
                    event.target.value
                  )
                }
                disabled={isBusy}
                placeholder="Ex. communication locale"
                className="mt-2 w-full rounded-xl border border-emerald-200 bg-emerald-50/30 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50 disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="secondaryKeywords"
                className="block text-sm font-semibold text-slate-900"
              >
                Mots-clés
                secondaires
              </label>

              <input
                id="secondaryKeywords"
                type="text"
                value={
                  secondaryKeywords
                }
                onChange={(event) =>
                  setSecondaryKeywords(
                    event.target.value
                  )
                }
                disabled={isBusy}
                placeholder="Séparés par des virgules"
                className="mt-2 w-full rounded-xl border border-emerald-200 bg-emerald-50/30 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50 disabled:opacity-60"
              />
            </div>
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
              className="mt-2 w-full rounded-xl border border-emerald-200 bg-emerald-50/30 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50 disabled:opacity-60"
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
              className="mt-2 w-full rounded-xl border border-emerald-200 bg-emerald-50/30 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50 disabled:opacity-60"
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-4">
              <label
                htmlFor="metaDescription"
                className="block text-sm font-semibold text-slate-900"
              >
                Meta description
              </label>

              <span className="text-xs text-slate-400">
                {
                  metaDescription
                    .length
                }{" "}
                caractères
              </span>
            </div>

            <textarea
              id="metaDescription"
              value={
                metaDescription
              }
              onChange={(event) =>
                setMetaDescription(
                  event.target.value
                )
              }
              rows={3}
              disabled={isBusy}
              className="mt-2 w-full resize-y rounded-xl border border-emerald-200 bg-emerald-50/30 px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50 disabled:opacity-60"
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
              className="mt-2 w-full rounded-xl border border-emerald-200 bg-emerald-50/30 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50 disabled:opacity-60"
            />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-sky-200 bg-white shadow-sm">
        <SectionHeader
          eyebrow="Illustration"
          title="Visuel de l’article"
          description="Génère et vérifie le visuel éditorial qui accompagnera le contenu."
          tone="sky"
          icon={<ImageIcon />}
          action={
            <button
              type="button"
              onClick={
                generateVisual
              }
              disabled={isBusy}
              className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGeneratingVisual
                ? "Génération du visuel..."
                : imageUrl.trim()
                  ? "Regénérer le visuel"
                  : "Générer le visuel"}
            </button>
          }
        />

        <div className="p-6">
          {imageUrl.trim() ? (
            <div className="overflow-hidden rounded-2xl border border-sky-100 bg-slate-50 shadow-sm">
              <img
                src={imageUrl}
                alt={
                  imageAlt.trim() ||
                  "Visuel de l’article"
                }
                className="h-auto w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex min-h-52 items-center justify-center rounded-2xl border border-dashed border-sky-200 bg-sky-50/50 px-6 text-center">
              <div>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                  <ImageIcon />
                </div>

                <p className="mt-3 text-sm font-semibold text-slate-800">
                  Aucun visuel
                  généré
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Pénélope peut
                  préparer
                  l’illustration à
                  partir de
                  l’article.
                </p>
              </div>
            </div>
          )}

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
              className="mt-2 w-full rounded-xl border border-sky-200 bg-sky-50/30 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-50 disabled:opacity-60"
            />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm">
        <SectionHeader
          eyebrow="Publication"
          title="WordPress"
          description="Prépare le brouillon sur lbmedia.fr ou publie l’article lorsqu’il est validé."
          tone="violet"
          icon={<WordPressIcon />}
        />

        <div className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-violet-100 bg-violet-50/50 p-5">
            <div>
              <p className="text-sm font-bold text-slate-900">
                {hasWordPressPost
                  ? "Article WordPress déjà créé"
                  : "Article non envoyé vers WordPress"}
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                {hasWordPressPost
                  ? "Tu peux mettre à jour le brouillon avec les dernières modifications de LBMedia Office."
                  : "Commence par créer un brouillon WordPress avant sa publication définitive."}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={
                  sendToWordPressDraft
                }
                disabled={isBusy}
                className="rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPublishingWordPressDraft
                  ? "Envoi vers WordPress..."
                  : hasWordPressPost
                    ? "Mettre à jour le brouillon"
                    : "Envoyer en brouillon"}
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
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPublishingWordPressLive
                    ? "Publication..."
                    : "Publier sur WordPress"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700 shadow-sm">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700 shadow-sm">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <button
          type="button"
          onClick={handleDelete}
          disabled={isBusy}
          className="rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isDeleting
            ? "Suppression..."
            : "Supprimer"}
        </button>

        <button
          type="submit"
          disabled={isBusy}
          className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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

function SectionHeader({
  eyebrow,
  title,
  description,
  tone,
  icon,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  tone:
    | "blue"
    | "emerald"
    | "sky"
    | "violet";
  icon: React.ReactNode;
  action?: React.ReactNode;
}) {
  const tones = {
    blue: {
      wrapper:
        "border-blue-100 bg-gradient-to-r from-blue-50 to-white",
      icon:
        "bg-blue-100 text-blue-700",
      eyebrow:
        "text-blue-600",
    },
    emerald: {
      wrapper:
        "border-emerald-100 bg-gradient-to-r from-emerald-50 to-white",
      icon:
        "bg-emerald-100 text-emerald-700",
      eyebrow:
        "text-emerald-600",
    },
    sky: {
      wrapper:
        "border-sky-100 bg-gradient-to-r from-sky-50 to-white",
      icon:
        "bg-sky-100 text-sky-700",
      eyebrow:
        "text-sky-600",
    },
    violet: {
      wrapper:
        "border-violet-100 bg-gradient-to-r from-violet-50 to-white",
      icon:
        "bg-violet-100 text-violet-700",
      eyebrow:
        "text-violet-600",
    },
  };

  const current =
    tones[tone];

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-5 border-b p-5 ${current.wrapper}`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${current.icon}`}
        >
          {icon}
        </div>

        <div>
          <p
            className={`text-xs font-bold uppercase tracking-[0.18em] ${current.eyebrow}`}
          >
            {eyebrow}
          </p>

          <h3 className="mt-1 text-lg font-bold text-slate-950">
            {title}
          </h3>

          <p className="mt-1 text-sm leading-6 text-slate-600">
            {description}
          </p>
        </div>
      </div>

      {action}
    </div>
  );
}

function PenelopeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M12 3v3" />
      <path d="M12 18v3" />
      <path d="m4.2 4.2 2.1 2.1" />
      <path d="m17.7 17.7 2.1 2.1" />
      <path d="M3 12h3" />
      <path d="M18 12h3" />
      <path d="m4.2 19.8 2.1-2.1" />
      <path d="m17.7 6.3 2.1-2.1" />
      <circle
        cx="12"
        cy="12"
        r="4"
      />
    </svg>
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

function SearchIcon() {
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
        cx="11"
        cy="11"
        r="7"
      />
      <path d="m20 20-4-4" />
      <path d="M8 11h6" />
      <path d="M11 8v6" />
    </svg>
  );
}

function ImageIcon() {
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
        x="3"
        y="4"
        width="18"
        height="16"
        rx="2"
      />
      <circle
        cx="8.5"
        cy="9"
        r="1.5"
      />
      <path d="m21 15-5-5L5 20" />
    </svg>
  );
}

function WordPressIcon() {
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
        r="9"
      />
      <path d="M7 8.5 10.5 17 13 11l2.5 6L18 8.5" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="16"
        rx="2"
      />
      <path d="M16 3v4" />
      <path d="M8 3v4" />
      <path d="M3 10h18" />
    </svg>
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