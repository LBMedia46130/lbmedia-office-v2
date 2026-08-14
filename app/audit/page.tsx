"use client";

import { FormEvent, useState } from "react";

type AuditResult = {
  globalScore: number;
  positioningScore: number;
  conversionScore: number;
  seoScore: number;
  localSeoScore: number;
  geoScore: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  priorities: string[];
};

export default function AuditPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] =
    useState(false);
  const [error, setError] =
    useState<string | null>(null);
  const [result, setResult] =
    useState<AuditResult | null>(null);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError(null);
    setResult(null);

    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setError(
        "Veuillez renseigner l’URL du site à analyser."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/audit",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            url: trimmedUrl,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ??
            "Impossible d’analyser ce site."
        );
      }

      setResult(data.audit);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-600">
            LBMedia Office
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Audit de site
          </h1>

          <p className="mt-2 max-w-3xl text-slate-600">
            Analysez rapidement la
            présence web d’une entreprise
            et identifiez ses principales
            opportunités d’amélioration.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="website-url"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                URL du site
              </label>

              <input
                id="website-url"
                type="url"
                value={url}
                onChange={(event) =>
                  setUrl(event.target.value)
                }
                placeholder="https://www.exemple.fr"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Analyse en cours..."
                  : "Analyser le site"}
              </button>
            </div>
          </form>
        </section>

        {!result && !loading && (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <h2 className="text-lg font-semibold text-slate-900">
              Aucun audit lancé
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Saisissez l’adresse d’un site
              pour lancer une première
              analyse.
            </p>
          </section>
        )}

        {loading && (
          <section className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

            <p className="font-medium text-slate-700">
              Analyse du site en cours...
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Lecture du contenu et
              préparation du diagnostic.
            </p>
          </section>
        )}

        {result && (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <ScoreCard
                label="Score global"
                score={result.globalScore}
                highlighted
              />

              <ScoreCard
                label="Positionnement"
                score={
                  result.positioningScore
                }
              />

              <ScoreCard
                label="Conversion"
                score={
                  result.conversionScore
                }
              />

              <ScoreCard
                label="SEO"
                score={result.seoScore}
              />

              <ScoreCard
                label="SEO local"
                score={
                  result.localSeoScore
                }
              />

              <ScoreCard
                label="GEO / IA"
                score={result.geoScore}
              />
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                Synthèse
              </h2>

              <p className="mt-4 whitespace-pre-line leading-7 text-slate-700">
                {result.summary}
              </p>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <AuditList
                title="Points forts"
                items={result.strengths}
              />

              <AuditList
                title="Points à améliorer"
                items={result.weaknesses}
              />
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                Priorités LBMedia
              </h2>

              <ol className="mt-5 space-y-4">
                {result.priorities.map(
                  (priority, index) => (
                    <li
                      key={`${priority}-${index}`}
                      className="flex gap-4"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                        {index + 1}
                      </div>

                      <p className="pt-1 text-slate-700">
                        {priority}
                      </p>
                    </li>
                  )
                )}
              </ol>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function ScoreCard({
  label,
  score,
  highlighted = false,
}: {
  label: string;
  score: number;
  highlighted?: boolean;
}) {
  const safeScore = Math.max(
    0,
    Math.min(100, score)
  );

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm ${
        highlighted
          ? "border-blue-200 bg-blue-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-600">
            {label}
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {safeScore}
            <span className="text-base font-medium text-slate-400">
              {" "}
              / 100
            </span>
          </p>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-blue-600 transition-all"
          style={{
            width: `${safeScore}%`,
          }}
        />
      </div>
    </div>
  );
}

function AuditList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900">
        {title}
      </h2>

      <ul className="mt-5 space-y-3">
        {items.map((item, index) => (
          <li
            key={`${item}-${index}`}
            className="flex gap-3 text-slate-700"
          >
            <span className="mt-1 text-blue-600">
              •
            </span>

            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}