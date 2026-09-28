"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type WeeklyTopic = {
  title: string;
  angle: string;
  reason: string;
};

export default function WeeklyTopics() {
  const router = useRouter();

  const [topics, setTopics] =
    useState<WeeklyTopic[]>([]);

  const [isGenerating, setIsGenerating] =
    useState(false);

  const [isCreating, setIsCreating] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [customTopic, setCustomTopic] =
    useState("");

  const [isCustomTopicOpen, setIsCustomTopicOpen] =
    useState(false);

  async function generateTopics() {
    setIsGenerating(true);
    setTopics([]);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(
        "/api/penelope/weekly-topics",
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
            "Impossible de préparer les sujets."
        );
      }

      setTopics(
        result.topics ?? []
      );

      setMessage(
        "Voici trois propositions pour la prochaine communication LBMedia."
      );
    } catch (
      generationError
    ) {
      setError(
        generationError instanceof
          Error
          ? generationError.message
          : "Une erreur est survenue."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function createNewsFromTopic(
    topic: WeeklyTopic
  ) {
    setIsCreating(
      topic.title
    );

    setMessage(
      "Pénélope prépare l’actualité..."
    );

    setError(null);

    try {
      /*
       * 1. Création de l'actualité
       * avec le brief retenu.
       */
      const brief = [
        "Angle proposé :",
        topic.angle,
        "",
        "Pourquoi ce sujet :",
        topic.reason,
      ].join("\n");

      const createResponse =
        await fetch(
          "/api/news",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              title: topic.title,
              content: brief,
              status: "draft",
            }),
          }
        );

      const createResult =
        await createResponse.json();

      if (
        !createResponse.ok ||
        !createResult.success
      ) {
        throw new Error(
          createResult.message ??
            "Impossible de créer l’actualité."
        );
      }

      const newsId =
        createResult.news?.id;

      if (!newsId) {
        throw new Error(
          "L’actualité a été créée mais son identifiant est introuvable."
        );
      }

      /*
       * 2. Rédaction automatique
       * de l'article complet par
       * Pénélope.
       */
      setMessage(
        "Pénélope rédige l’actualité..."
      );

      const generateResponse =
        await fetch(
          `/api/news/${newsId}/generate-article`,
          {
            method: "POST",
          }
        );

      const generateResult =
        await generateResponse.json();

      if (
        !generateResponse.ok ||
        !generateResult.success
      ) {
        throw new Error(
          generateResult.message ??
            "L’actualité a été créée mais Pénélope n’a pas pu la rédiger."
        );
      }

      /*
       * 3. Ouverture de
       * l'actualité prête à relire.
       */
      setMessage(
        "Actualité rédigée. Ouverture..."
      );

      router.push(
        `/news/${newsId}`
      );
    } catch (
      creationError
    ) {
      setMessage(null);

      setError(
        creationError instanceof Error
          ? creationError.message
          : "Une erreur est survenue."
      );

      setIsCreating(null);
    }
  }

  async function chooseTopic(
    topic: WeeklyTopic
  ) {
    await createNewsFromTopic(
      topic
    );
  }

  async function submitCustomTopic() {
    const title =
      customTopic.trim();

    if (!title) {
      setError(
        "Indique le sujet que tu veux confier à Pénélope."
      );
      return;
    }

    setTopics([]);
    setMessage(null);
    setError(null);

    await createNewsFromTopic({
      title,
      angle:
        "Développer ce sujet proposé directement par LBMedia en trouvant l’angle éditorial le plus pertinent, concret et accessible pour des dirigeants de TPE et PME.",
      reason:
        "Sujet choisi directement par LBMedia pour sa prochaine communication.",
    });
  }

  const isBusy =
    isGenerating ||
    Boolean(isCreating);

  return (
    <section className="rounded-2xl border border-indigo-200 bg-indigo-50 p-6">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">
            Pénélope
          </p>

          <h2 className="mt-2 text-xl font-bold text-slate-950">
            Préparer la semaine
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Laisse Pénélope te proposer
            trois sujets éditoriaux ou
            confie-lui directement une idée
            que tu veux travailler.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={
              generateTopics
            }
            disabled={isBusy}
            className="rounded-xl bg-indigo-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGenerating
              ? "Pénélope réfléchit..."
              : topics.length > 0
                ? "Proposer 3 autres sujets"
                : "Pénélope me propose des sujets"}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsCustomTopicOpen(
                (value) => !value
              );
              setMessage(null);
              setError(null);
            }}
            disabled={isBusy}
            className="rounded-xl border border-indigo-300 bg-white px-5 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Je propose mon sujet à Pénélope
          </button>
        </div>
      </div>

      {isCustomTopicOpen ? (
        <div className="mt-5 rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm">
          <label
            htmlFor="custom-topic"
            className="text-sm font-bold text-slate-950"
          >
            Quel sujet veux-tu confier à Pénélope ?
          </label>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Donne-lui ton idée comme elle vient. Elle se chargera de la transformer en article LBMedia.
          </p>

          <textarea
            id="custom-topic"
            value={customTopic}
            onChange={(event) =>
              setCustomTopic(
                event.target.value
              )
            }
            disabled={isBusy}
            rows={4}
            placeholder="Ex. : Pour octobre, je voudrais parler de la façon dont les clients utilisent désormais Google mais aussi ChatGPT et les assistants IA pour trouver une entreprise. Faire le lien entre SEO et GEO sans être trop technique."
            className="mt-4 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
          />

          <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setIsCustomTopicOpen(false);
                setCustomTopic("");
                setError(null);
              }}
              disabled={isBusy}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Annuler
            </button>

            <button
              type="button"
              onClick={
                submitCustomTopic
              }
              disabled={
                isBusy ||
                !customTopic.trim()
              }
              className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreating
                ? "Pénélope rédige..."
                : "Confier ce sujet à Pénélope"}
            </button>
          </div>
        </div>
      ) : null}

      {message ? (
        <p className="mt-5 rounded-xl bg-white/70 px-4 py-3 text-sm font-medium text-indigo-800">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}

      {topics.length > 0 ? (
        <div className="mt-6 grid gap-4">
          {topics.map(
            (
              topic,
              index
            ) => (
              <article
                key={`${topic.title}-${index}`}
                className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">
                      Proposition{" "}
                      {index + 1}
                    </p>

                    <h3 className="mt-2 text-lg font-bold text-slate-950">
                      {
                        topic.title
                      }
                    </h3>

                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Angle
                      </p>

                      <p className="mt-1 text-sm leading-6 text-slate-700">
                        {
                          topic.angle
                        }
                      </p>
                    </div>

                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Pourquoi ce
                        sujet
                      </p>

                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {
                          topic.reason
                        }
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      chooseTopic(
                        topic
                      )
                    }
                    disabled={
                      isBusy
                    }
                    className="shrink-0 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isCreating ===
                    topic.title
                      ? "Pénélope rédige..."
                      : "Choisir ce sujet"}
                  </button>
                </div>
              </article>
            )
          )}
        </div>
      ) : null}
    </section>
  );
}