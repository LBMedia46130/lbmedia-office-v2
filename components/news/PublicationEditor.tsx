"use client";

import {
  useEffect,
  useState,
} from "react";

import type {
  Publication,
  PublicationChannel,
  PublicationStatus,
} from "@/lib/news";

type PublicationEditorProps = {
  publication: Publication;
  label: string;
};

function toLocalDateTimeValue(
  value: string | null
) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
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

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date.toISOString();
}

export default function PublicationEditor({
  publication,
  label,
}: PublicationEditorProps) {
  const [title, setTitle] =
    useState(
      publication.title ?? ""
    );

  const [content, setContent] =
    useState(
      publication.content
    );

  const [status, setStatus] =
    useState<PublicationStatus>(
      publication.status
    );

  const [
    scheduledAt,
    setScheduledAt,
  ] = useState(
    toLocalDateTimeValue(
      publication.scheduled_at
    )
  );

  const [slug, setSlug] =
    useState(
      publication.slug ?? ""
    );

  const [
    seoTitle,
    setSeoTitle,
  ] = useState(
    publication.seo_title ?? ""
  );

  const [
    metaDescription,
    setMetaDescription,
  ] = useState(
    publication.meta_description ??
      ""
  );

  const [
    imageUrl,
    setImageUrl,
  ] = useState(
    publication.image_url ?? ""
  );

  const [subject, setSubject] =
    useState(
      publication.subject ?? ""
    );

  const [
    previewText,
    setPreviewText,
  ] = useState(
    publication.preview_text ??
      ""
  );

  const [
    callToAction,
    setCallToAction,
  ] = useState(
    publication.call_to_action ??
      ""
  );

  const [
    linkUrl,
    setLinkUrl,
  ] = useState(
    publication.link_url ?? ""
  );

  const [
    hashtags,
    setHashtags,
  ] = useState(
    publication.hashtags ?? ""
  );

  const [
    brevoSendApprovedAt,
    setBrevoSendApprovedAt,
  ] = useState(
    publication.brevo_send_approved_at
  );

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  const [
    isGenerating,
    setIsGenerating,
  ] = useState(false);

  const [
    isGeneratingVisual,
    setIsGeneratingVisual,
  ] = useState(false);

  const [
    isChangingStatus,
    setIsChangingStatus,
  ] = useState(false);

  const [
    isCreatingBrevoDraft,
    setIsCreatingBrevoDraft,
  ] = useState(false);

  const [
    isApprovingBrevoSend,
    setIsApprovingBrevoSend,
  ] = useState(false);

  const [
    isPublishingFacebook,
    setIsPublishingFacebook,
  ] = useState(false);

  const [
    isMarkingGoogleBusinessPublished,
    setIsMarkingGoogleBusinessPublished,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState<
    string | null
  >(null);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const channel =
    publication.channel as PublicationChannel;

  const supportsVisual =
    channel === "linkedin" ||
    channel === "facebook";

  useEffect(() => {
    syncFields(publication);
  }, [publication]);

  function buildUpdatePayload(
    nextStatus: PublicationStatus = status,
    nextScheduledAt:
      | string
      | null = scheduledAt
  ) {
    return {
      title,
      content,
      status: nextStatus,
      scheduled_at:
        nextStatus === "scheduled"
          ? toIsoDateTime(
              nextScheduledAt ?? ""
            )
          : null,
      slug,
      seo_title: seoTitle,
      meta_description:
        metaDescription,
      image_url:
        imageUrl || null,
      subject,
      preview_text:
        previewText,
      call_to_action:
        callToAction,
      link_url: linkUrl,
      hashtags,
    };
  }

  async function updatePublication(
    nextStatus: PublicationStatus,
    nextScheduledAt:
      | string
      | null = scheduledAt
  ) {
    const response =
      await fetch(
        `/api/publications/${publication.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            buildUpdatePayload(
              nextStatus,
              nextScheduledAt
            )
          ),
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
          "Impossible d’enregistrer."
      );
    }

    syncFields(
      result.publication
    );

    return result.publication as Publication;
  }

  async function savePublication() {
    if (
      status === "scheduled" &&
      !scheduledAt
    ) {
      setMessage(null);
      setError(
        "Choisis une date et une heure de publication."
      );

      return;
    }

    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      await updatePublication(
        status,
        scheduledAt
      );

      setMessage(
        "Modifications enregistrées."
      );
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

  async function validatePublication() {
    if (!content.trim()) {
      setMessage(null);
      setError(
        "Le contenu doit être renseigné avant validation."
      );

      return;
    }

    setIsChangingStatus(true);
    setMessage(null);
    setError(null);

    try {
      await updatePublication(
        "ready",
        null
      );

      setScheduledAt("");

      setMessage(
        `${label} validé. La publication est prête.`
      );
    } catch (validationError) {
      setError(
        validationError instanceof Error
          ? validationError.message
          : "Une erreur est survenue."
      );
    } finally {
      setIsChangingStatus(false);
    }
  }

  async function retryFailedPublication() {
    if (!content.trim()) {
      setMessage(null);
      setError(
        "Le contenu doit être renseigné avant de relancer la publication."
      );

      return;
    }

    setIsChangingStatus(true);
    setMessage(null);
    setError(null);

    try {
      await updatePublication(
        "ready",
        null
      );

      setScheduledAt("");

      setMessage(
        `${label} est de nouveau prête à être planifiée ou publiée.`
      );
    } catch (retryError) {
      setError(
        retryError instanceof Error
          ? retryError.message
          : "Une erreur est survenue."
      );
    } finally {
      setIsChangingStatus(false);
    }
  }

  async function returnToDraft() {
    setIsChangingStatus(true);
    setMessage(null);
    setError(null);

    try {
      await updatePublication(
        "draft",
        null
      );

      setScheduledAt("");

      setMessage(
        `${label} repassé en brouillon.`
      );
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : "Une erreur est survenue."
      );
    } finally {
      setIsChangingStatus(false);
    }
  }

  async function schedulePublication() {
    if (!scheduledAt) {
      setMessage(null);
      setError(
        "Choisis une date et une heure avant de planifier."
      );

      return;
    }

    setIsChangingStatus(true);
    setMessage(null);
    setError(null);

    try {
      await updatePublication(
        "scheduled",
        scheduledAt
      );

      setMessage(
        `${label} planifié pour le ${formatDateTime(
          scheduledAt
        )}.`
      );
    } catch (scheduleError) {
      setError(
        scheduleError instanceof Error
          ? scheduleError.message
          : "Une erreur est survenue."
      );
    } finally {
      setIsChangingStatus(false);
    }
  }

  async function cancelSchedule() {
    setIsChangingStatus(true);
    setMessage(null);
    setError(null);

    try {
      await updatePublication(
        "ready",
        null
      );

      setScheduledAt("");

      setMessage(
        `Planification de ${label} annulée. La publication reste prête.`
      );
    } catch (scheduleError) {
      setError(
        scheduleError instanceof Error
          ? scheduleError.message
          : "Une erreur est survenue."
      );
    } finally {
      setIsChangingStatus(false);
    }
  }

  async function generatePublication() {
    const confirmed =
      content.trim().length ===
        0 ||
      window.confirm(
        `Le contenu actuel de ${label} sera remplacé par une nouvelle proposition. Continuer ?`
      );

    if (!confirmed) {
      return;
    }

    setIsGenerating(true);
    setMessage(null);
    setError(null);

    try {
      const response =
        await fetch(
          `/api/publications/${publication.id}/generate`,
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
            "Impossible de générer le contenu."
        );
      }

      syncFields(
        result.publication
      );

      setMessage(
        "Nouvelle proposition générée et enregistrée."
      );
    } catch (
      generationError
    ) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Une erreur est survenue."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function generateVisual() {
    if (!supportsVisual) {
      return;
    }

    if (!content.trim()) {
      setMessage(null);
      setError(
        "Le contenu du post doit être renseigné avant de générer un visuel."
      );

      return;
    }

    const confirmed =
      !imageUrl ||
      window.confirm(
        "Le visuel actuel sera remplacé par une nouvelle proposition. Continuer ?"
      );

    if (!confirmed) {
      return;
    }

    setIsGeneratingVisual(true);
    setMessage(null);
    setError(null);

    try {
      await updatePublication(
        status,
        scheduledAt
      );

      const response =
        await fetch(
          `/api/publications/${publication.id}/generate-visual`,
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

      if (
        result.publication
      ) {
        syncFields(
          result.publication
        );
      } else if (
        result.image_url
      ) {
        setImageUrl(
          result.image_url
        );
      }

      setMessage(
        imageUrl
          ? "Nouveau visuel généré et enregistré."
          : "Visuel généré et enregistré."
      );
    } catch (
      visualError
    ) {
      setError(
        visualError instanceof Error
          ? visualError.message
          : "Une erreur est survenue."
      );
    } finally {
      setIsGeneratingVisual(false);
    }
  }

  async function saveBrevoBeforeDraft() {
    await updatePublication(
      status,
      scheduledAt
    );
  }

  async function saveFacebookBeforePublish() {
    await updatePublication(
      status,
      scheduledAt
    );
  }

  async function createBrevoDraft() {
    if (
      status !== "ready" &&
      status !== "scheduled"
    ) {
      setMessage(null);
      setError(
        "Valide d’abord la newsletter avant de créer le brouillon Brevo."
      );

      return;
    }

    const confirmed =
      window.confirm(
        "Créer maintenant un brouillon de campagne Brevo avec cette newsletter ? Aucun email ne sera envoyé."
      );

    if (!confirmed) {
      return;
    }

    setIsCreatingBrevoDraft(
      true
    );

    setMessage(null);
    setError(null);

    try {
      await saveBrevoBeforeDraft();

      const response =
        await fetch(
          `/api/publications/${publication.id}/create-brevo-draft`,
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
            "Impossible de créer le brouillon Brevo."
        );
      }

      if (
        result.publication
      ) {
        syncFields(
          result.publication
        );
      }

      setMessage(
        `Brouillon Brevo créé${
          result.brevo_campaign_id
            ? ` — campagne n°${result.brevo_campaign_id}`
            : ""
        }.`
      );
    } catch (brevoError) {
      setError(
        brevoError instanceof Error
          ? brevoError.message
          : "Une erreur est survenue."
      );
    } finally {
      setIsCreatingBrevoDraft(
        false
      );
    }
  }

  async function approveBrevoSend() {
    if (channel !== "brevo") {
      return;
    }

    if (status !== "scheduled") {
      setMessage(null);
      setError(
        "La newsletter doit être planifiée avant d’autoriser son envoi."
      );

      return;
    }

    if (
      !publication.brevo_campaign_id
    ) {
      setMessage(null);
      setError(
        "Crée d’abord le brouillon Brevo."
      );

      return;
    }

    const confirmed =
      window.confirm(
        "Autoriser explicitement l’envoi de cette campagne Brevo à la liste newsletter à la date planifiée ?"
      );

    if (!confirmed) {
      return;
    }

    setIsApprovingBrevoSend(true);
    setMessage(null);
    setError(null);

    try {
      const approvedAt =
        new Date().toISOString();

      const response =
        await fetch(
          `/api/publications/${publication.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              brevo_send_approved_at:
                approvedAt,
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
            "Impossible d’autoriser l’envoi Brevo."
        );
      }

      syncFields(
        result.publication
      );

      setMessage(
        "Envoi Brevo explicitement autorisé."
      );
    } catch (approvalError) {
      setError(
        approvalError instanceof Error
          ? approvalError.message
          : "Une erreur est survenue."
      );
    } finally {
      setIsApprovingBrevoSend(
        false
      );
    }
  }

  async function markGoogleBusinessPublished() {
    if (channel !== "google_business") {
      return;
    }

    if (
      status !== "ready" &&
      status !== "scheduled"
    ) {
      setMessage(null);
      setError(
        "Valide d’abord la publication Google Business."
      );

      return;
    }

    const confirmed =
      window.confirm(
        "Confirmer que ce contenu a bien été publié manuellement sur la fiche Google Business LBMedia ?"
      );

    if (!confirmed) {
      return;
    }

    setIsMarkingGoogleBusinessPublished(
      true
    );

    setMessage(null);
    setError(null);

    try {
      await updatePublication(
        "published",
        scheduledAt
      );

      setMessage(
        "Publication Google Business marquée comme publiée."
      );
    } catch (
      googleBusinessError
    ) {
      setError(
        googleBusinessError instanceof Error
          ? googleBusinessError.message
          : "Une erreur est survenue."
      );
    } finally {
      setIsMarkingGoogleBusinessPublished(
        false
      );
    }
  }

  async function publishFacebook() {
    if (
      status !== "ready" &&
      status !== "scheduled"
    ) {
      setMessage(null);
      setError(
        "Valide d’abord la publication Facebook avant de la publier."
      );

      return;
    }

    const confirmed =
      window.confirm(
        "Publier maintenant ce contenu sur la page Facebook LBMedia ? Cette action le rendra visible publiquement."
      );

    if (!confirmed) {
      return;
    }

    setIsPublishingFacebook(
      true
    );

    setMessage(null);
    setError(null);

    try {
      await saveFacebookBeforePublish();

      const response =
        await fetch(
          `/api/publications/${publication.id}/publish-facebook`,
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
            "Impossible de publier sur Facebook."
        );
      }

      if (
        result.publication
      ) {
        syncFields(
          result.publication
        );
      }

      setMessage(
        imageUrl
          ? "Publication Facebook avec visuel effectuée."
          : "Publication Facebook effectuée."
      );
    } catch (
      facebookError
    ) {
      setError(
        facebookError instanceof Error
          ? facebookError.message
          : "Une erreur est survenue."
      );
    } finally {
      setIsPublishingFacebook(
        false
      );
    }
  }

  function syncFields(
    updatedPublication: Publication
  ) {
    setTitle(
      updatedPublication.title ??
        ""
    );

    setContent(
      updatedPublication.content ??
        ""
    );

    setStatus(
      updatedPublication.status
    );

    setScheduledAt(
      toLocalDateTimeValue(
        updatedPublication.scheduled_at
      )
    );

    setSlug(
      updatedPublication.slug ??
        ""
    );

    setSeoTitle(
      updatedPublication.seo_title ??
        ""
    );

    setMetaDescription(
      updatedPublication.meta_description ??
        ""
    );

    setImageUrl(
      updatedPublication.image_url ??
        ""
    );

    setSubject(
      updatedPublication.subject ??
        ""
    );

    setPreviewText(
      updatedPublication.preview_text ??
        ""
    );

    setCallToAction(
      updatedPublication.call_to_action ??
        ""
    );

    setLinkUrl(
      updatedPublication.link_url ??
        ""
    );

    setHashtags(
      updatedPublication.hashtags ??
        ""
    );

    setBrevoSendApprovedAt(
      updatedPublication.brevo_send_approved_at
    );
  }

  const isBusy =
    isSaving ||
    isGenerating ||
    isGeneratingVisual ||
    isChangingStatus ||
    isCreatingBrevoDraft ||
    isApprovingBrevoSend ||
    isPublishingFacebook ||
    isMarkingGoogleBusinessPublished;

  const canEdit =
    status !== "published";

  const canPlan =
    status === "ready";

  const theme =
    getChannelTheme(
      channel
    );

  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${theme.border}`}
    >
      <div
        className={`border-b p-5 ${theme.header}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${theme.icon}`}
            >
              <ChannelIcon
                channel={
                  channel
                }
              />
            </div>

            <div>
              <p
                className={`text-xs font-bold uppercase tracking-[0.18em] ${theme.eyebrow}`}
              >
                {getChannelEyebrow(
                  channel
                )}
              </p>

              <h3 className="mt-1 text-xl font-bold text-slate-950">
                {label}
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                {getChannelDescription(
                  channel
                )}
              </p>
            </div>
          </div>

          <StatusBadge
            status={status}
          />
        </div>
      </div>

      <div className="p-5">
        {status === "ready" ? (
          <StatusPanel
            tone="emerald"
            title="Contenu validé"
            description="Cette déclinaison est prête à être planifiée ou publiée."
          />
        ) : null}

        {status === "scheduled" ? (
          <StatusPanel
            tone="cyan"
            title="Publication planifiée"
            description={
              scheduledAt
                ? `Prévue le ${formatDateTime(
                    scheduledAt
                  )}.`
                : "Une date de publication doit être définie."
            }
          />
        ) : null}

        {channel === "brevo" &&
        status === "scheduled" ? (
          brevoSendApprovedAt ? (
            <StatusPanel
              tone="emerald"
              title="Envoi Brevo autorisé"
              description="Cette campagne peut être envoyée par le scheduler à l’heure prévue."
            />
          ) : (
            <StatusPanel
              tone="amber"
              title="Envoi Brevo non autorisé"
              description="La campagne est planifiée, mais le scheduler ne doit pas l’envoyer tant que tu ne l’as pas autorisée explicitement."
            />
          )
        ) : null}

        {status === "published" ? (
          <StatusPanel
            tone="slate"
            title="Publication effectuée"
            description="Cette déclinaison est marquée comme publiée."
          />
        ) : null}

        {status === "failed" ? (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="text-sm font-bold text-red-900">
              Publication en échec
            </p>

            <p className="mt-1 text-sm leading-6 text-red-700">
              Le contenu n’a pas été publié. Tu peux le remettre en attente puis le replanifier.
            </p>

            <button
              type="button"
              onClick={
                retryFailedPublication
              }
              disabled={isBusy}
              className="mt-4 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isChangingStatus
                ? "Remise en attente..."
                : "Réessayer"}
            </button>
          </div>
        ) : null}

        {canPlan ? (
          <section className="mb-5 rounded-2xl border border-cyan-200 bg-cyan-50/60 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
                <CalendarIcon />
              </div>

              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-700">
                  Planification
                </p>

                <label className="mt-1 block text-sm font-bold text-slate-900">
                  Date et heure de publication
                </label>

                <div className="mt-3 flex flex-wrap gap-3">
                  <input
                    type="datetime-local"
                    value={
                      scheduledAt
                    }
                    onChange={(event) =>
                      setScheduledAt(
                        event.target.value
                      )
                    }
                    disabled={isBusy}
                    className="min-w-64 flex-1 rounded-xl border border-cyan-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100 disabled:opacity-50"
                  />

                  <button
                    type="button"
                    onClick={
                      schedulePublication
                    }
                    disabled={
                      isBusy ||
                      !scheduledAt
                    }
                    className="rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isChangingStatus
                      ? "Planification..."
                      : "Planifier"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Actions
              </p>

              <p className="mt-1 text-sm text-slate-600">
                Génération, validation et diffusion de cette déclinaison.
              </p>
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              {channel === "brevo" &&
              (status === "ready" ||
                status ===
                  "scheduled") ? (
                <button
                  type="button"
                  onClick={
                    createBrevoDraft
                  }
                  disabled={isBusy}
                  className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-semibold text-orange-700 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCreatingBrevoDraft
                    ? "Création dans Brevo..."
                    : "Créer le brouillon dans Brevo"}
                </button>
              ) : null}

              {channel === "brevo" &&
              status === "scheduled" &&
              !brevoSendApprovedAt ? (
                <button
                  type="button"
                  onClick={
                    approveBrevoSend
                  }
                  disabled={
                    isBusy ||
                    !publication.brevo_campaign_id
                  }
                  className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isApprovingBrevoSend
                    ? "Autorisation..."
                    : "Autoriser l’envoi Brevo"}
                </button>
              ) : null}

              {channel ===
                "google_business" &&
              (status === "ready" ||
                status ===
                  "scheduled") ? (
                <button
                  type="button"
                  onClick={
                    markGoogleBusinessPublished
                  }
                  disabled={isBusy}
                  className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isMarkingGoogleBusinessPublished
                    ? "Enregistrement..."
                    : "Marquer comme publié"}
                </button>
              ) : null}

              {channel === "facebook" &&
              (status === "ready" ||
                status ===
                  "scheduled") ? (
                <button
                  type="button"
                  onClick={
                    publishFacebook
                  }
                  disabled={isBusy}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPublishingFacebook
                    ? "Publication Facebook..."
                    : "Publier maintenant"}
                </button>
              ) : null}

              {status === "draft" ? (
                <button
                  type="button"
                  onClick={
                    generatePublication
                  }
                  disabled={isBusy}
                  className="rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isGenerating
                    ? "Génération..."
                    : "Générer avec l’IA"}
                </button>
              ) : null}

              {status === "draft" ? (
                <button
                  type="button"
                  onClick={
                    validatePublication
                  }
                  disabled={
                    isBusy ||
                    !content.trim()
                  }
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isChangingStatus
                    ? "Validation..."
                    : "Valider"}
                </button>
              ) : null}

              {status === "ready" ? (
                <button
                  type="button"
                  onClick={
                    returnToDraft
                  }
                  disabled={isBusy}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Repasser en brouillon
                </button>
              ) : null}

              {status ===
              "scheduled" ? (
                <button
                  type="button"
                  onClick={
                    cancelSchedule
                  }
                  disabled={isBusy}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Annuler la planification
                </button>
              ) : null}

              {status === "failed" ? (
                <button
                  type="button"
                  onClick={
                    returnToDraft
                  }
                  disabled={isBusy}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Repasser en brouillon
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <section
          className={`mt-5 rounded-2xl border p-5 ${theme.content}`}
        >
          <div className="mb-5">
            <p
              className={`text-xs font-bold uppercase tracking-[0.16em] ${theme.eyebrow}`}
            >
              Contenu
            </p>

            <h4 className="mt-1 text-lg font-bold text-slate-950">
              {getContentTitle(
                channel
              )}
            </h4>
          </div>

          <div className="grid gap-5">
            {channel === "brevo" ? (
              <>
                <div className="grid gap-5 md:grid-cols-2">
                  <Field
                    label="Objet de l’email"
                    value={subject}
                    onChange={
                      setSubject
                    }
                    disabled={
                      !canEdit ||
                      isBusy
                    }
                    tone={
                      theme.fieldTone
                    }
                  />

                  <Field
                    label="Préheader"
                    value={
                      previewText
                    }
                    onChange={
                      setPreviewText
                    }
                    disabled={
                      !canEdit ||
                      isBusy
                    }
                    tone={
                      theme.fieldTone
                    }
                  />
                </div>

                <TextArea
                  label="Contenu de la newsletter"
                  value={content}
                  onChange={
                    setContent
                  }
                  rows={12}
                  disabled={
                    !canEdit ||
                    isBusy
                  }
                  tone={
                    theme.fieldTone
                  }
                />

                <Field
                  label="Lien"
                  value={linkUrl}
                  onChange={
                    setLinkUrl
                  }
                  placeholder="https://..."
                  disabled={
                    !canEdit ||
                    isBusy
                  }
                  tone={
                    theme.fieldTone
                  }
                />
              </>
            ) : null}

            {channel ===
            "google_business" ? (
              <>
                <TextArea
                  label="Texte Google Business"
                  value={content}
                  onChange={
                    setContent
                  }
                  rows={8}
                  disabled={
                    !canEdit ||
                    isBusy
                  }
                  tone={
                    theme.fieldTone
                  }
                />

                <div className="grid gap-5 md:grid-cols-2">
                  <Field
                    label="Appel à l’action"
                    value={
                      callToAction
                    }
                    onChange={
                      setCallToAction
                    }
                    placeholder="En savoir plus"
                    disabled={
                      !canEdit ||
                      isBusy
                    }
                    tone={
                      theme.fieldTone
                    }
                  />

                  <Field
                    label="Lien"
                    value={linkUrl}
                    onChange={
                      setLinkUrl
                    }
                    placeholder="https://..."
                    disabled={
                      !canEdit ||
                      isBusy
                    }
                    tone={
                      theme.fieldTone
                    }
                  />
                </div>
              </>
            ) : null}

            {channel ===
            "linkedin" ? (
              <>
                <TextArea
                  label="Post LinkedIn"
                  value={content}
                  onChange={
                    setContent
                  }
                  rows={10}
                  disabled={
                    !canEdit ||
                    isBusy
                  }
                  tone={
                    theme.fieldTone
                  }
                />

                <div className="grid gap-5 md:grid-cols-2">
                  <Field
                    label="Hashtags"
                    value={hashtags}
                    onChange={
                      setHashtags
                    }
                    placeholder="#communication #marketing"
                    disabled={
                      !canEdit ||
                      isBusy
                    }
                    tone={
                      theme.fieldTone
                    }
                  />

                  <Field
                    label="Lien"
                    value={linkUrl}
                    onChange={
                      setLinkUrl
                    }
                    placeholder="https://..."
                    disabled={
                      !canEdit ||
                      isBusy
                    }
                    tone={
                      theme.fieldTone
                    }
                  />
                </div>
              </>
            ) : null}

            {channel ===
            "facebook" ? (
              <>
                <TextArea
                  label="Post Facebook"
                  value={content}
                  onChange={
                    setContent
                  }
                  rows={10}
                  disabled={
                    !canEdit ||
                    isBusy
                  }
                  tone={
                    theme.fieldTone
                  }
                />

                <Field
                  label="Lien"
                  value={linkUrl}
                  onChange={
                    setLinkUrl
                  }
                  placeholder="https://..."
                  disabled={
                    !canEdit ||
                    isBusy
                  }
                  tone={
                    theme.fieldTone
                  }
                />
              </>
            ) : null}
          </div>
        </section>

        {supportsVisual ? (
          <section className="mt-5 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50/70 via-white to-sky-50/60 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-600">
                  Visuel
                </p>

                <h4 className="mt-1 text-lg font-bold text-slate-950">
                  Visuel du post
                </h4>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                  Pénélope génère une illustration éditoriale LBMedia à partir du contenu de la publication.
                </p>
              </div>

              {canEdit ? (
                <button
                  type="button"
                  onClick={
                    generateVisual
                  }
                  disabled={
                    isBusy ||
                    !content.trim()
                  }
                  className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isGeneratingVisual
                    ? "Génération du visuel..."
                    : imageUrl
                      ? "Régénérer le visuel"
                      : "Générer le visuel"}
                </button>
              ) : null}
            </div>

            {imageUrl ? (
              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
                <img
                  src={imageUrl}
                  alt=""
                  className="aspect-[3/2] w-full object-cover"
                />
              </div>
            ) : (
              <div className="mt-5 flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-violet-200 bg-white/80 px-6 py-10 text-center">
                <div>
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                    <ImageIcon />
                  </div>

                  <p className="mt-3 text-sm font-bold text-slate-900">
                    Aucun visuel généré
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Le visuel sera créé à partir du texte du post.
                  </p>
                </div>
              </div>
            )}
          </section>
        ) : null}

        {message ? (
          <p className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700">
            {message}
          </p>
        ) : null}

        {error ? (
          <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
            {error}
          </p>
        ) : null}

        {canEdit ? (
          <div className="mt-5 flex justify-end border-t border-slate-200 pt-5">
            <button
              type="button"
              onClick={
                savePublication
              }
              disabled={isBusy}
              className={`rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${theme.saveButton}`}
            >
              {isSaving
                ? "Enregistrement..."
                : "Enregistrer"}
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  placeholder?: string;
  disabled?: boolean;
  tone?: string;
};

function Field({
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
  tone = "border-slate-300 focus:border-blue-500 focus:ring-blue-50",
}: FieldProps) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </label>

      <input
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        placeholder={
          placeholder
        }
        disabled={disabled}
        className={`mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ${tone}`}
      />
    </div>
  );
}

type TextAreaProps = {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  rows: number;
  disabled?: boolean;
  tone?: string;
};

function TextArea({
  label,
  value,
  onChange,
  rows,
  disabled = false,
  tone = "border-slate-300 focus:border-blue-500 focus:ring-blue-50",
}: TextAreaProps) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
          {label}
        </label>

        <span className="text-xs text-slate-400">
          {
            value.trim().length
          }{" "}
          caractères
        </span>
      </div>

      <textarea
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        rows={rows}
        disabled={disabled}
        className={`mt-2 w-full resize-y rounded-xl border bg-white px-4 py-4 text-sm leading-7 text-slate-950 outline-none transition focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ${tone}`}
      />
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: PublicationStatus;
}) {
  const styles: Record<
    PublicationStatus,
    string
  > = {
    draft:
      "border-slate-200 bg-white text-slate-600",
    ready:
      "border-amber-200 bg-amber-50 text-amber-700",
    scheduled:
      "border-cyan-200 bg-cyan-50 text-cyan-700",
    published:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
    failed:
      "border-red-200 bg-red-50 text-red-700",
  };

  const labels: Record<
    PublicationStatus,
    string
  > = {
    draft: "Brouillon",
    ready: "Prête",
    scheduled: "Planifiée",
    published: "Publiée",
    failed: "Échec",
  };

  return (
    <span
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function StatusPanel({
  tone,
  title,
  description,
}: {
  tone:
    | "emerald"
    | "cyan"
    | "amber"
    | "slate";
  title: string;
  description: string;
}) {
  const styles = {
    emerald:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
    cyan:
      "border-cyan-200 bg-cyan-50 text-cyan-700",
    amber:
      "border-amber-200 bg-amber-50 text-amber-700",
    slate:
      "border-slate-200 bg-slate-50 text-slate-600",
  };

  return (
    <div
      className={`mb-5 rounded-2xl border p-4 ${styles[tone]}`}
    >
      <p className="text-sm font-bold">
        {title}
      </p>

      <p className="mt-1 text-sm leading-6 opacity-90">
        {description}
      </p>
    </div>
  );
}

function formatDateTime(
  value: string
) {
  const date = new Date(value);

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
    }
  ).format(date);
}

function getChannelDescription(
  channel: PublicationChannel
) {
  const descriptions: Record<
    PublicationChannel,
    string
  > = {
    website:
      "Article de référence publié sur lbmedia.fr.",
    brevo:
      "Newsletter ou email préparé pour Brevo.",
    google_business:
      "Publication courte pour la fiche Google Business.",
    linkedin:
      "Publication professionnelle destinée à LinkedIn.",
    facebook:
      "Publication destinée à la page Facebook.",
  };

  return descriptions[channel];
}

function getChannelEyebrow(
  channel: PublicationChannel
) {
  const labels: Record<
    PublicationChannel,
    string
  > = {
    website: "Site Web",
    brevo: "Email marketing",
    google_business:
      "Visibilité locale",
    linkedin:
      "Réseau professionnel",
    facebook:
      "Réseau social",
  };

  return labels[channel];
}

function getContentTitle(
  channel: PublicationChannel
) {
  const labels: Record<
    PublicationChannel,
    string
  > = {
    website:
      "Article WordPress",
    brevo:
      "Newsletter Brevo",
    google_business:
      "Publication Google Business",
    linkedin:
      "Publication LinkedIn",
    facebook:
      "Publication Facebook",
  };

  return labels[channel];
}

function getChannelTheme(
  channel: PublicationChannel
) {
  const themes = {
    website: {
      border:
        "border-violet-200",
      header:
        "border-violet-100 bg-gradient-to-r from-violet-50 to-white",
      content:
        "border-violet-100 bg-violet-50/30",
      icon:
        "bg-violet-100 text-violet-700",
      eyebrow:
        "text-violet-600",
      fieldTone:
        "border-violet-200 focus:border-violet-500 focus:ring-violet-50",
      saveButton:
        "bg-violet-600 hover:bg-violet-700",
    },

    brevo: {
      border:
        "border-orange-200",
      header:
        "border-orange-100 bg-gradient-to-r from-orange-50 to-white",
      content:
        "border-orange-100 bg-orange-50/30",
      icon:
        "bg-orange-100 text-orange-700",
      eyebrow:
        "text-orange-600",
      fieldTone:
        "border-orange-200 focus:border-orange-500 focus:ring-orange-50",
      saveButton:
        "bg-orange-600 hover:bg-orange-700",
    },

    google_business: {
      border:
        "border-emerald-200",
      header:
        "border-emerald-100 bg-gradient-to-r from-emerald-50 to-white",
      content:
        "border-emerald-100 bg-emerald-50/30",
      icon:
        "bg-emerald-100 text-emerald-700",
      eyebrow:
        "text-emerald-600",
      fieldTone:
        "border-emerald-200 focus:border-emerald-500 focus:ring-emerald-50",
      saveButton:
        "bg-emerald-600 hover:bg-emerald-700",
    },

    linkedin: {
      border:
        "border-sky-200",
      header:
        "border-sky-100 bg-gradient-to-r from-sky-50 to-white",
      content:
        "border-sky-100 bg-sky-50/30",
      icon:
        "bg-sky-100 text-sky-700",
      eyebrow:
        "text-sky-600",
      fieldTone:
        "border-sky-200 focus:border-sky-500 focus:ring-sky-50",
      saveButton:
        "bg-sky-600 hover:bg-sky-700",
    },

    facebook: {
      border:
        "border-blue-200",
      header:
        "border-blue-100 bg-gradient-to-r from-blue-50 to-white",
      content:
        "border-blue-100 bg-blue-50/30",
      icon:
        "bg-blue-100 text-blue-700",
      eyebrow:
        "text-blue-600",
      fieldTone:
        "border-blue-200 focus:border-blue-500 focus:ring-blue-50",
      saveButton:
        "bg-blue-600 hover:bg-blue-700",
    },
  };

  return themes[channel];
}

function ChannelIcon({
  channel,
}: {
  channel: PublicationChannel;
}) {
  if (
    channel === "brevo"
  ) {
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
          y="5"
          width="18"
          height="14"
          rx="2"
        />
        <path d="m4 7 8 6 8-6" />
      </svg>
    );
  }

  if (
    channel ===
    "google_business"
  ) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path d="M4 10h16" />
        <path d="m5 10 1-5h12l1 5" />
        <path d="M6 10v9h12v-9" />
        <path d="M9 19v-5h6v5" />
      </svg>
    );
  }

  if (
    channel === "linkedin"
  ) {
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
          y="3"
          width="18"
          height="18"
          rx="3"
        />
        <path d="M8 10v7" />
        <path d="M8 7.5v.01" />
        <path d="M12 17v-4a3 3 0 0 1 6 0v4" />
        <path d="M12 10v7" />
      </svg>
    );
  }

  if (
    channel === "facebook"
  ) {
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
        <path d="M13.5 8H12a2 2 0 0 0-2 2v8" />
        <path d="M8 13h6" />
      </svg>
    );
  }

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

      <path d="m4 17 4.5-4.5 3.5 3 2.5-2.5L20 18" />
    </svg>
  );
}