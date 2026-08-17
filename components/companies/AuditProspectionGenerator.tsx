"use client";

import {
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

type AuditProspectionGeneratorProps = {
  prospectionId: string;
};

export default function AuditProspectionGenerator({
  prospectionId,
}: AuditProspectionGeneratorProps) {
  const router =
    useRouter();

  const [
    isGenerating,
    setIsGenerating,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);

    try {
      const response =
        await fetch(
          `/api/audit-prospections/${prospectionId}/generate`,
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
            "Impossible de générer la prospection."
        );
      }

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue."
      );
    } finally {
      setIsGenerating(
        false
      );
    }
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
        className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isGenerating
          ? "Génération en cours..."
          : "Générer la prospection"}
      </button>

      {error ? (
        <p className="mt-3 text-sm font-medium text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}