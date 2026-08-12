"use client";

import {
  useState,
  useTransition,
} from "react";

import {
  deleteCompany,
} from "@/app/companies/companyActions";

type DeleteCompanyButtonProps = {
  companyId: string;
  companyName: string;
};

export default function DeleteCompanyButton({
  companyId,
  companyName,
}: DeleteCompanyButtonProps) {
  const [isOpen, setIsOpen] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    isPending,
    startTransition,
  ] = useTransition();

  function handleDelete() {
    setErrorMessage("");

    startTransition(
      async () => {
        const result =
          await deleteCompany(
            companyId
          );

        if (!result.success) {
          setErrorMessage(
            result.message
          );
        }
      }
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() =>
          setIsOpen(true)
        }
        className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
      >
        Supprimer
      </button>

      {isOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm"
            onClick={() => {
              if (!isPending) {
                setIsOpen(false);
              }
            }}
          />

          <div className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-2xl text-red-600">
              !
            </div>

            <h2 className="mt-5 text-xl font-bold text-slate-900">
              Supprimer cette entreprise ?
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              L’entreprise{" "}
              <strong className="font-semibold text-slate-900">
                {companyName}
              </strong>{" "}
              sera définitivement supprimée.
            </p>

            {errorMessage ? (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {errorMessage}
              </div>
            ) : null}

            <div className="mt-7 flex justify-end gap-3">
              <button
                type="button"
                onClick={() =>
                  setIsOpen(false)
                }
                disabled={
                  isPending
                }
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={
                  handleDelete
                }
                disabled={
                  isPending
                }
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending
                  ? "Suppression..."
                  : "Supprimer définitivement"}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}