"use client";

import { useRouter } from "next/navigation";
import {
  FormEvent,
  useState,
} from "react";

import type {
  PublicationChannel,
} from "@/lib/news";

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
  {
    value: "brevo",
    label: "Brevo",
    description:
      "Créer une newsletter indépendante.",
  },
];

export default function StandalonePublicationCreateForm() {
  const router =
    useRouter();

  const [
    channel,
    setChannel,
  ] = useState<PublicationChannel>(
    "linkedin"
  );

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
  ] = useState<string | null>(
    null
  );

  function handleChannelChange(
    nextChannel: PublicationChannel
  ) {
    setChannel(nextChannel);
    setTopics([]);
    setError(null);
  }

  async function handleGenerateTopics() {
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

  async function handleSubmit(
    event: FormEvent
  ) {
    event.preventDefault();

    const cleanTitle =
      title.trim();

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
              channel,
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
    channelOptions.find(
      (option) =>
        option.value ===
        channel
    );

  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div>
        <label
          htmlFor="channel"
          className="block text-sm font-semibold text-slate-900"
        >
          Support
        </label>

        <select
          id="channel"
          value={channel}
          onChange={(
            event
          ) =>
            handleChannelChange(
              event.target
                .value as PublicationChannel
            )
          }
          disabled={
            isSubmitting ||
            isGeneratingTopics
          }
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-950 disabled:opacity-60"
        >
          {channelOptions.map(
            (option) => (
              <option
                key={
                  option.value
                }
                value={
                  option.value
                }
              >
                {
                  option.label
                }
              </option>
            )
          )}
        </select>

        <p className="mt-2 text-sm text-slate-500">
          {
            currentChannel?.description
          }
        </p>
      </div>

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
                  currentChannel?.label
                }
              </span>{" "}
              en tenant compte de
              l&apos;historique éditorial
              de LBMedia.
            </p>
          </div>

          <button
            type="button"
            onClick={
              handleGenerateTopics
            }
            disabled={
              isGeneratingTopics ||
              isSubmitting
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
            {topics.map(
              (
                topic,
                index
              ) => {
                const isSelected =
                  title ===
                  topic.title;

                return (
                  <button
                    key={`${topic.title}-${index}`}
                    type="button"
                    onClick={() =>
                      handleSelectTopic(
                        topic
                      )
                    }
                    disabled={
                      isSubmitting
                    }
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      isSelected
                        ? "border-blue-400 bg-white ring-2 ring-blue-100"
                        : "border-blue-100 bg-white hover:border-blue-300 hover:shadow-sm"
                    } disabled:opacity-60`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                        {index +
                          1}
                      </div>

                      <div>
                        <p className="font-semibold leading-6 text-slate-950">
                          {
                            topic.title
                          }
                        </p>

                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {
                            topic.angle
                          }
                        </p>

                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          <span className="font-semibold text-slate-600">
                            Pourquoi ce sujet :
                          </span>{" "}
                          {
                            topic.reason
                          }
                        </p>
                      </div>
                    </div>
                  </button>
                );
              }
            )}
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
            isGeneratingTopics
          }
          className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting
            ? "Création..."
            : "Créer la publication"}
        </button>
      </div>
    </form>
  );
}