"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { deleteCompanyContact } from "@/app/companies/[id]/contactActions";

type DeleteContactButtonProps = {
  companyId: string;
  contactId: string;
  contactName: string;
};

export default function DeleteContactButton({
  companyId,
  contactId,
  contactName,
}: DeleteContactButtonProps) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function closeModal() {
    if (isPending) {
      return;
    }

    setErrorMessage("");
    setIsOpen(false);
  }

  function handleDelete() {
    setErrorMessage("");

    startTransition(async () => {
      const result = await deleteCompanyContact(
        companyId,
        contactId
      );

      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }

      setIsOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
      >
        Supprimer
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-slate-950/50 backdrop-blur-sm"
            onClick={closeModal}
          />

          <div className="fixed left-1/2 top-1/2 z-[70] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-xl font-bold text-red-600">
              !
            </div>

            <h2 className="mt-5 text-xl font-bold text-slate-900">
              Supprimer ce contact ?
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Le contact{" "}
              <strong className="font-semibold text-slate-900">
                {contactName}
              </strong>{" "}
              sera définitivement supprimé.
            </p>

            {errorMessage && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {errorMessage}
              </div>
            )}

            <div className="mt-7 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                disabled={isPending}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending
                  ? "Suppression..."
                  : "Supprimer définitivement"}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}