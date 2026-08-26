"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

type GenerateGammaPresentationButtonProps = {
  estimateId: string;
  estimateNumber: string;
  customerName: string;
};

type GammaStatus =
  | "idle"
  | "starting"
  | "pending"
  | "processing"
  | "completed"
  | "failed";

type GammaGenerationResponse = {
  generationId?: string;
  status?: string;
  gammaUrl?: string | null;
  exportUrl?: string | null;
  error?: string | null;
};

const POLLING_INTERVAL =
  5000;

export default function GenerateGammaPresentationButton({
  estimateId,
  estimateNumber,
  customerName,
}: GenerateGammaPresentationButtonProps) {
  const [
    generationId,
    setGenerationId,
  ] = useState<
    string | null
  >(null);

  const [
    status,
    setStatus,
  ] =
    useState<GammaStatus>(
      "idle"
    );

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const [
    gammaUrl,
    setGammaUrl,
  ] = useState<
    string | null
  >(null);

  const [
    exportUrl,
    setExportUrl,
  ] = useState<
    string | null
  >(null);

  const pollingInProgress =
    useRef(false);

  async function checkGeneration(
    id: string
  ) {
    if (
      pollingInProgress.current
    ) {
      return;
    }

    pollingInProgress.current =
      true;

    try {
      const response =
        await fetch(
          `/api/zoho/estimates/${encodeURIComponent(
            estimateId
          )}/gamma?generationId=${encodeURIComponent(
            id
          )}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

      const data =
        (await response.json()) as GammaGenerationResponse;

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Impossible de vérifier la génération."
        );
      }

      if (
        data.status ===
        "completed"
      ) {
        setGammaUrl(
          data.gammaUrl ??
            null
        );

        setExportUrl(
          data.exportUrl ??
            null
        );

        setStatus(
          "completed"
        );

        return;
      }

      if (
        data.status ===
        "failed"
      ) {
        setStatus(
          "failed"
        );

        setError(
          data.error ||
            "La génération Gamma a échoué."
        );

        return;
      }

      if (
        data.status ===
        "processing"
      ) {
        setStatus(
          "processing"
        );
      } else {
        setStatus(
          "pending"
        );
      }
    } catch (
      caughtError
    ) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Impossible de vérifier la génération."
      );

      setStatus(
        "failed"
      );
    } finally {
      pollingInProgress.current =
        false;
    }
  }

  useEffect(() => {
    if (
      !generationId ||
      (status !==
        "pending" &&
        status !==
          "processing")
    ) {
      return;
    }

    const timer =
      window.setInterval(
        () => {
          void checkGeneration(
            generationId
          );
        },
        POLLING_INTERVAL
      );

    return () => {
      window.clearInterval(
        timer
      );
    };
  }, [
    generationId,
    status,
  ]);

  async function handleGenerate() {
    if (
      status ===
        "starting" ||
      status ===
        "pending" ||
      status ===
        "processing"
    ) {
      return;
    }

    setStatus(
      "starting"
    );

    setError(null);
    setGammaUrl(null);
    setExportUrl(null);
    setGenerationId(
      null
    );

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
            "Impossible de lancer la génération."
        );
      }

      if (
        !data.generationId
      ) {
        throw new Error(
          "Gamma n'a pas retourné d'identifiant de génération."
        );
      }

      setGenerationId(
        data.generationId
      );

      setStatus(
        "pending"
      );

      /*
       * Premier contrôle immédiat.
       * Les suivants seront effectués
       * automatiquement toutes les
       * 5 secondes.
       */
      void checkGeneration(
        data.generationId
      );
    } catch (
      caughtError
    ) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Une erreur est survenue pendant le lancement."
      );

      setStatus(
        "failed"
      );
    }
  }

  const isGenerating =
    status === "starting" ||
    status === "pending" ||
    status ===
      "processing";

  if (
    status ===
    "completed"
  ) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-sm font-semibold text-emerald-800">
            Présentation générée
          </p>

          <p className="mt-1 text-xs leading-5 text-emerald-700">
            {customerName}
            {" · "}
            Devis{" "}
            {estimateNumber}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {gammaUrl ? (
            <a
              href={
                gammaUrl
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Voir la présentation
            </a>
          ) : null}

          {exportUrl ? (
            <a
              href={
                exportUrl
              }
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
            className="inline-flex w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100"
          >
            Régénérer
          </button>
        </div>
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
          isGenerating
        }
        className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
      >
        {status ===
        "starting"
          ? "Lancement..."
          : status ===
              "processing"
            ? "Gamma prépare la présentation..."
            : status ===
                "pending"
              ? "Génération en cours..."
              : "Générer la présentation"}
      </button>

      <p className="mt-3 text-xs leading-5 text-slate-400">
        Devis{" "}
        {estimateNumber}
        {" · "}
        {customerName}
      </p>

      {isGenerating ? (
        <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
          <p className="text-sm font-medium text-blue-700">
            Génération Gamma en
            cours…
          </p>

          <p className="mt-1 text-xs leading-5 text-blue-600">
            Tu peux laisser cette
            page ouverte. Office
            vérifie automatiquement
            l’avancement.
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-sm leading-5 text-red-700">
            {error}
          </p>

          <button
            type="button"
            onClick={
              handleGenerate
            }
            className="mt-2 text-sm font-semibold text-red-700 underline underline-offset-2"
          >
            Réessayer
          </button>
        </div>
      ) : null}
    </div>
  );
}