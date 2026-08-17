"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type DeleteAuditProspectionButtonProps = {
  prospectionId: string;
};

export default function DeleteAuditProspectionButton({
  prospectionId,
}: DeleteAuditProspectionButtonProps) {
  const router =
    useRouter();

  const [
    isDeleting,
    setIsDeleting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  async function handleDelete() {
    const confirmed =
      window.confirm(
        "Supprimer cette prospection après audit ? Les visuels et le PDF associés seront également supprimés."
      );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response =
        await fetch(
          `/api/audit-prospections/${prospectionId}`,
          {
            method:
              "DELETE",
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
            "Impossible de supprimer la prospection."
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
      setIsDeleting(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={
          handleDelete
        }
        disabled={
          isDeleting
        }
        className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isDeleting
          ? "Suppression..."
          : "Supprimer la prospection"}
      </button>

      {error ? (
        <p className="mt-2 text-sm font-semibold text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}