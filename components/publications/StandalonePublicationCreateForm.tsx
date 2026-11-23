"use client";

import { useRouter } from "next/navigation";
import {
  FormEvent,
  useState,
} from "react";

import type {
  PublicationChannel,
} from "@/lib/news";

type TopicFeedback = "accepted" | "rejected";

type RecordedFeedback = {
  value: TopicFeedback;
  rejectionReason: string | null;
};

type WeeklyTopic = {
  title: string;
  angle: string;
  reason: string;
};

const channelOptions: {
  value: PublicationChannel;
  label: string;
  description: string;
}[] = [
  {
    value: "linkedin",
    label: "LinkedIn",
    description:
      "Créer un post LinkedIn indépendant.",
  },
  {
    value: "facebook",
    label: "Facebook",
    description:
      "Créer une publication Facebook indépendante.",
  },
  {
    value: "google_business",
    label: "Google Business",
    description:
      "Créer une publication pour la fiche Google Business.",
  },
];

export default function StandalonePublicationCreateForm() {
  const router =
    useRouter();

  const [
    channels,
    setChannels,
  ] = useState<PublicationChannel[]>(["linkedin"]);

  // L'API Pénélope attend toujours un seul support.
  const channel: PublicationChannel = channels.includes("linkedin")
    ? "linkedin"
    : channels[0] ?? "linkedin";

  const [
    title,
    setTitle,
  ] = useState("");

  const [
    content,
    setContent,
  ] = useState("");

  const [
    topics,
    setTopics,
  ] = useState<WeeklyTopic[]>(
    []
  );

  const [
    isGeneratingTopics,
    setIsGeneratingTopics,
  ] = useState(false);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  const [feedbackByIndex, setFeedbackByIndex] =
    useState<Record<number, RecordedFeedback>>({});
  const [rejectionReasonByIndex, setRejectionReasonByIndex] =
    useState<Record<number, string>>({});
  const [savingFeedbackIndex, setSavingFeedbackIndex] =
    useState<number | null>(null);
  const [feedbackErrorByIndex, setFeedbackErrorByIndex] =
    useState<Record<number, string>>({});

  function handleChannelChange(nextChannel: PublicationChannel) {
    const isSocial = ["linkedin", "facebook", "google_business"].includes(nextChannel);

    setChannels((current) => {
      if (!isSocial) {
        // Les autres supports ne sont pas proposés dans ce formulaire.
        return [nextChannel];
      }

      const socialSelection = current.filter(
        (value) => ["linkedin", "facebook", "google_business"].includes(value)
      );

      if (socialSelection.includes(nextChannel)) {
        // On doit conserver au moins un support actif.
        return socialSelection.length === 1
          ? socialSelection
          : socialSelection.filter((value) => value !== nextChannel);
      }

      return [...socialSelection, nextChannel];
    });

    setTopics([]);
    setFeedbackByIndex({});
    setRejectionReasonByIndex({});
    setFeedbackErrorByIndex({});
    setError(null);
  }

  async function handleGenerateTopics() {
    setFeedbackByIndex({});
    setRejectionReasonByIndex({});
    setFeedbackErrorByIndex({});
    setIsGeneratingTopics(
      true
    );
    setError(null);

    try {
      const response =
        await fetch(
          "/api/penelope/weekly-topics",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              channel,
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
            "Impossible de préparer les sujets."
        );
      }

      if (
        !Array.isArray(
          result.topics
        ) ||
        result.topics.length ===
          0
      ) {
        throw new Error(
          "Pénélope n'a proposé aucun sujet."
        );
      }

      setTopics(
        result.topics
      );
    } catch (
      generationError
    ) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Une erreur est survenue pendant la génération des sujets."
      );
    } finally {
      setIsGeneratingTopics(
        false
      );
    }
  }

  function handleSelectTopic(
    topic: WeeklyTopic
  ) {
    setTitle(
      topic.title
    );

    setContent(
      topic.angle
    );

    setError(null);
  }

  async function recordFeedback(
    topic: WeeklyTopic,
    index: number,
    feedback: TopicFeedback
  ) {
    if (savingFeedbackIndex !== null || feedbackByIndex[index]) return;

    setSavingFeedbackIndex(index);
    setFeedbackErrorByIndex((current) => ({ ...current, [index]: "" }));

    const rejectionReason =
      feedback === "rejected"
        ? rejectionReasonByIndex[index]?.trim() || null
        : null;

    try {
      const response = await fetch("/api/penelope/topic-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: topic.title,
          angle: topic.angle,
          reason: topic.reason,
          channel,
          feedback,
          rejection_reason: rejectionReason,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message ?? "Impossible d'enregistrer l'évaluation.");
      }

      setFeedbackByIndex((current) => ({
        ...current,
        [index]: { value: feedback, rejectionReason },
      }));

      if (feedback === "accepted") {
        handleSelectTopic(topic);
      }
    } catch (feedbackError) {
      setFeedbackErrorByIndex((current) => ({
        ...current,
        [index]:
          feedbackError instanceof Error
            ? feedbackError.message
            : "Impossible d'enregistrer l'évaluation.",
      }));
    } finally {
      setSavingFeedbackIndex(null);
    }
  }

  async function handleSubmit(
    event: FormEvent
  ) {
    event.preventDefault();

    const cleanTitle =
      title.trim();

    if (channels.length === 0) {
      setError("Sélectionne au moins un support.");
      return;
    }

    if (!cleanTitle) {
      setError(
        "Indique le sujet de la publication."
      );

      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response =
        await fetch(
          "/api/publications",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              channels,
              title:
                cleanTitle,
              content:
                content.trim(),
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
            "Impossible de créer la publication."
        );
      }

      router.push(
        `/publications/${result.publication.id}`
      );

      router.refresh();
    } catch (
      submissionError
    ) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Une erreur est survenue."
      );
    } finally {
      setIsSubmitting(
        false
      );
    }
  }

  const currentChannel =
    channelOptions.find((option) => option.value === channel);
  const isMultiChannel = channels.length > 1;
  const channelLabel = channels
    .map((value) => channelOptions.find((option) => option.value === value)?.label ?? value)
    .join(", ");

  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <fieldset disabled={isSubmitting || isGeneratingTopics}>
        <legend className="block text-sm font-semibold text-slate-900">
          Supports de publication
        </legend>
        <p className="mt-2 text-sm text-slate-500">
          Sélectionne un ou plusieurs supports : LinkedIn, Facebook et Google Business.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {channelOptions.map((option) => {
            const checked = channels.includes(option.value);
            return (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                  checked
                    ? "border-blue-400 bg-blue-50/70"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <input
                  type="checkbox"
                  name="channels"
                  value={option.value}
                  checked={checked}
                  onChange={() => handleChannelChange(option.value)}
                  className="mt-1 h-4 w-4 accent-blue-600"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-900">
                    {option.label}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    {option.description}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        {isMultiChannel ? (
          <p className="mt-3 text-sm font-medium text-blue-700">
            {channels.length} brouillons liés seront créés, un par support sélectionné.
          </p>
        ) : null}
      </fieldset>

      <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
              Pénélope
            </p>

            <h2 className="mt-1 text-base font-semibold text-slate-950">
              Besoin d&apos;une idée ?
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              Pénélope peut proposer
              trois sujets adaptés à{" "}
              <span className="font-semibold">
                {
                  channelLabel
                }
              </span>{" "}
              en tenant compte de
              l&apos;historique éditorial
              de LBMedia. {isMultiChannel ? "Les sujets servent de brief commun aux brouillons sélectionnés. Pénélope utilise actuellement un seul profil de réseau pour les suggestions." : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={
              handleGenerateTopics
            }
            disabled={
              isGeneratingTopics ||
              isSubmitting ||
              savingFeedbackIndex !== null
            }
            className="rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGeneratingTopics
              ? "Pénélope réfléchit..."
              : topics.length > 0
                ? "Proposer 3 autres sujets"
                : "Proposer 3 sujets"}
          </button>
        </div>

        {topics.length > 0 ? (
          <div className="mt-5 space-y-3">
            {topics.map((topic, index) => {
              const isSelected = title === topic.title;
              const recorded = feedbackByIndex[index];
              const saving = savingFeedbackIndex === index;
              const locked = Boolean(recorded) || savingFeedbackIndex !== null ||
                isGeneratingTopics || isSubmitting;

              return (
                <div
                  key={`${topic.title}-${index}`}
                  className={`rounded-xl border bg-white p-4 transition ${
                    isSelected ? "border-blue-400 ring-2 ring-blue-100" : "border-blue-100"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectTopic(topic)}
                    disabled={isSubmitting || isGeneratingTopics || savingFeedbackIndex !== null}
                    className="flex w-full items-start gap-3 text-left disabled:opacity-60"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                      {index + 1}
                    </span>
                    <span className="block min-w-0">
                      <span className="block font-semibold leading-6 text-slate-950">
                        {topic.title}
                      </span>
                      <span className="mt-2 block text-sm leading-6 text-slate-600">
                        {topic.angle}
                      </span>
                      <span className="mt-2 block text-xs leading-5 text-slate-500">
                        <span className="font-semibold text-slate-600">Pourquoi ce sujet : </span>
                        {topic.reason}
                      </span>
                    </span>
                  </button>

                  <div className="mt-4 border-t border-blue-100 pt-3">
                    {recorded ? (
                      <p role="status" className="text-sm font-semibold text-slate-700">
                        {recorded.value === "accepted"
                          ? "✓ Sujet retenu et préférence enregistrée."
                          : "✓ Sujet écarté et préférence enregistrée."}
                      </p>
                    ) : (
                      <>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => recordFeedback(topic, index, "accepted")}
                            disabled={locked}
                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                          >
                            {saving ? "Enregistrement..." : "👍 Je retiens"}
                          </button>
                          <button
                            type="button"
                            onClick={() => recordFeedback(topic, index, "rejected")}
                            disabled={locked}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                          >
                            👎 Pas pertinent
                          </button>
                        </div>
                        <label className="mt-3 block text-xs font-medium text-slate-600" htmlFor={`rejection-reason-${index}`}>
                          Motif de refus (facultatif, à choisir avant « Pas pertinent »)
                        </label>
                        <select
                          id={`rejection-reason-${index}`}
                          value={rejectionReasonByIndex[index] ?? ""}
                          onChange={(event) => setRejectionReasonByIndex((current) => ({
                            ...current,
                            [index]: event.target.value,
                          }))}
                          disabled={locked}
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 disabled:opacity-50"
                        >
                          <option value="">Aucun motif</option>
                          <option value="Déjà traité">Déjà traité</option>
                          <option value="Trop éloigné de LBMedia">Trop éloigné de LBMedia</option>
                          <option value="Trop technique ou trop pratique">Trop technique ou trop pratique</option>
                          <option value="Peu intéressant commercialement">Peu intéressant commercialement</option>
                          <option value="Angle peu original">Angle peu original</option>
                        </select>
                      </>
                    )}
                    {feedbackErrorByIndex[index] ? (
                      <p role="alert" className="mt-2 text-xs text-red-700">
                        {feedbackErrorByIndex[index]}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="mt-6">
        <label
          htmlFor="title"
          className="block text-sm font-semibold text-slate-900"
        >
          Sujet
        </label>

        <input
          id="title"
          type="text"
          value={title}
          onChange={(
            event
          ) =>
            setTitle(
              event.target
                .value
            )
          }
          disabled={
            isSubmitting
          }
          placeholder="Ex. Pourquoi refaire son site ne suffit pas toujours à gagner en visibilité"
          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-950 disabled:opacity-60"
        />

        <p className="mt-2 text-xs leading-5 text-slate-500">
          Choisis une proposition
          de Pénélope ou indique
          directement ton propre
          sujet.
        </p>
      </div>

      <div className="mt-6">
        <label
          htmlFor="content"
          className="block text-sm font-semibold text-slate-900"
        >
          Brief
          <span className="ml-1 font-normal text-slate-400">
            — facultatif
          </span>
        </label>

        <textarea
          id="content"
          value={content}
          onChange={(
            event
          ) =>
            setContent(
              event.target
                .value
            )
          }
          disabled={
            isSubmitting
          }
          placeholder="Ajoute ici un angle, une idée, une information importante ou quelques consignes si nécessaire."
          rows={8}
          className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-slate-950 disabled:opacity-60"
        />
      </div>

      {error ? (
        <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={() =>
            router.push("/")
          }
          disabled={
            isSubmitting ||
            isGeneratingTopics
          }
          className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Annuler
        </button>

        <button
          type="submit"
          disabled={
            isSubmitting ||
            isGeneratingTopics ||
            channels.length === 0
          }
          className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting
            ? "Création..."
            : isMultiChannel
              ? `Créer les ${channels.length} brouillons`
              : "Créer la publication"}
        </button>
      </div>
    </form>
  );
}