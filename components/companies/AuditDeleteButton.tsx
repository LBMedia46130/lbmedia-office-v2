"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type AuditDeleteButtonProps = {
  auditId: string;
  companyId: string;
};

export default function AuditDeleteButton({
  auditId,
  companyId,
}: AuditDeleteButtonProps) {
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
    if (isDeleting) {
      return;
    }

    const confirmed =
      window.confirm(
        "Supprimer définitivement cet audit ?\n\nCette action est irréversible."
      );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response =
        await fetch(
          `/api/audit/${auditId}`,
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
            "Impossible de supprimer l’audit."
        );
      }

      router.push(
        `/companies/${companyId}`
      );

      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Une erreur est survenue."
      );

      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={
          handleDelete
        }
        disabled={
          isDeleting
        }
        className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isDeleting
          ? "Suppression..."
          : "Supprimer l’audit"}
      </button>

      {error ? (
        <p className="max-w-sm text-right text-xs font-medium leading-5 text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}