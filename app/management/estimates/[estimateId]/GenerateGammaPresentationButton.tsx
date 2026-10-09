"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

type PresentationType =
  | "radio"
  | "web";

type GenerateGammaPresentationButtonProps = {
  estimateId: string;
  estimateNumber: string;
  customerName: string;
  initialGenerationId?: string | null;
  initialGammaUrl?: string | null;
  initialGeneratedAt?: string | null;
  initialPresentationType?: PresentationType | null;
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
  presentationType?: PresentationType;
  error?: string | null;
};

const POLLING_INTERVAL =
  5000;

function getPresentationLabel(
  type: PresentationType | null
) {
  if (type === "radio") {
    return "Radio";
  }

  if (type === "web") {
    return "Web";
  }

  return null;
}

export default function GenerateGammaPresentationButton({
  estimateId,
  estimateNumber,
  customerName,
  initialGenerationId = null,
  initialGammaUrl = null,
  initialGeneratedAt = null,
  initialPresentationType = null,
}: GenerateGammaPresentationButtonProps) {
  const [
    generationId,
    setGenerationId,
  ] = useState<string | null>(
    initialGenerationId
  );

  const [
    status,
    setStatus,
  ] = useState<GammaStatus>(
    initialGammaUrl
      ? "completed"
      : initialGenerationId
        ? "pending"
        : "idle"
  );

  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );

  const [
    gammaUrl,
    setGammaUrl,
  ] = useState<string | null>(
    initialGammaUrl
  );

  const [
    exportUrl,
    setExportUrl,
  ] = useState<string | null>(
    null
  );

  const [
    presentationType,
    setPresentationType,
  ] = useState<PresentationType | null>(
    initialPresentationType
  );

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
      (status !== "pending" &&
        status !== "processing")
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
  }, [generationId, status]);

  async function handleGenerate(
    type: PresentationType
  ) {
    if (
      status === "starting" ||
      status === "pending" ||
      status === "processing"
    ) {
      return;
    }

    setPresentationType(type);
    setStatus("starting");
    setError(null);
    setGammaUrl(null);
    setExportUrl(null);
    setGenerationId(null);

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
            body: JSON.stringify({
              action:
                "generate",
              presentationType:
                type,
            }),
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

      if (!data.generationId) {
        throw new Error(
          "Gamma n'a pas retourné d'identifiant de génération."
        );
      }

      setGenerationId(
        data.generationId
      );
      setStatus("pending");

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
      setStatus("failed");
    }
  }

  const generatedAtLabel =
    initialGeneratedAt
      ? new Intl.DateTimeFormat(
          "fr-FR",
          {
            dateStyle: "short",
            timeStyle: "short",
          }
        ).format(
          new Date(
            initialGeneratedAt
          )
        )
      : null;

  const isGenerating =
    status === "starting" ||
    status === "pending" ||
    status === "processing";

  const presentationLabel =
    getPresentationLabel(
      presentationType
    );

  return (
    <div className="space-y-3">
      {status === "completed" ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-sm font-semibold text-emerald-800">
            Présentation {presentationLabel ? `${presentationLabel} ` : ""}générée
          </p>
          <p className="mt-1 text-xs leading-5 text-emerald-700">
            {customerName}
            {" · "}
            Devis {estimateNumber}
          </p>
          {generatedAtLabel ? (
            <p className="mt-1 text-xs text-emerald-700">
              Dernière génération : {generatedAtLabel}
            </p>
          ) : null}
        </div>
      ) : null}

      {gammaUrl ? (
        <a
          href={gammaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Ouvrir dans Gamma
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

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() =>
            handleGenerate(
              "radio"
            )
          }
          disabled={isGenerating}
          className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
        >
          Générer Gamma Radio
        </button>

        <button
          type="button"
          onClick={() =>
            handleGenerate(
              "web"
            )
          }
          disabled={isGenerating}
          className="inline-flex w-full items-center justify-center rounded-xl border border-blue-600 bg-white px-4 py-2.5 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
        >
          Générer Gamma Web
        </button>
      </div>

      {isGenerating ? (
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
          <p className="text-sm font-medium text-blue-700">
            Génération Gamma {presentationLabel ? presentationLabel : ""} en cours…
          </p>
          <p className="mt-1 text-xs leading-5 text-blue-600">
            Office vérifie automatiquement l’avancement.
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-sm leading-5 text-red-700">
            {error}
          </p>
        </div>
      ) : null}

      <p className="text-xs leading-5 text-slate-400">
        Devis {estimateNumber}
        {" · "}
        {customerName}
      </p>
    </div>
  );
}
