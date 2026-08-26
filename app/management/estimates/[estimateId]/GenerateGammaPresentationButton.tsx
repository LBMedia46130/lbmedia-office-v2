"use client";

import {
  useState,
} from "react";

type GenerateGammaPresentationButtonProps = {
  estimateId: string;
  estimateNumber: string;
  customerName: string;
};

type GammaGenerationResponse = {
  generationId?: string;
  gammaUrl?: string;
  exportUrl?: string;
  error?: string;
};

export default function GenerateGammaPresentationButton({
  estimateId,
  estimateNumber,
  customerName,
}: GenerateGammaPresentationButtonProps) {
  const [isLoading, setIsLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(
      null
    );

  const [gammaUrl, setGammaUrl] =
    useState<string | null>(
      null
    );

  const [exportUrl, setExportUrl] =
    useState<string | null>(
      null
    );

  async function handleGenerate() {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response =
        await fetch(
          `/api/zoho/estimates/${encodeURIComponent(
            estimateId
          )}/gamma`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
          }
        );

      const data =
        (await response.json()) as GammaGenerationResponse;

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Impossible de générer la présentation."
        );
      }

      if (data.gammaUrl) {
        setGammaUrl(
          data.gammaUrl
        );
      }

      if (data.exportUrl) {
        setExportUrl(
          data.exportUrl
        );
      }

      if (
        !data.gammaUrl &&
        !data.exportUrl
      ) {
        throw new Error(
          "Gamma a terminé la génération mais aucune présentation n'a été retournée."
        );
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Une erreur est survenue pendant la génération."
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (
    gammaUrl ||
    exportUrl
  ) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-sm font-semibold text-emerald-800">
            Présentation générée
          </p>

          <p className="mt-1 text-xs leading-5 text-emerald-700">
            {customerName} · Devis{" "}
            {estimateNumber}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {gammaUrl ? (
            <a
              href={gammaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Voir la présentation
            </a>
          ) : null}

          {exportUrl ? (
            <a
              href={exportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Ouvrir le PDF
            </a>
          ) : null}

          <button
            type="button"
            onClick={
              handleGenerate
            }
            disabled={
              isLoading
            }
            className="inline-flex w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading
              ? "Régénération..."
              : "Régénérer"}
          </button>
        </div>

        {error ? (
          <p className="text-sm leading-5 text-red-600">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={
          handleGenerate
        }
        disabled={
          isLoading
        }
        className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
      >
        {isLoading
          ? "Génération en cours..."
          : "Générer la présentation"}
      </button>

      <p className="mt-3 text-xs leading-5 text-slate-400">
        Devis{" "}
        {estimateNumber}
        {" · "}
        {customerName}
      </p>

      {error ? (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-sm leading-5 text-red-700">
            {error}
          </p>
        </div>
      ) : null}
    </div>
  );
}