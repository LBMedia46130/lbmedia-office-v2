"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type Props = {
  estimateId: string;
  estimateNumber: string;
};

export default function ConvertEstimateToInvoiceButton({
  estimateId,
  estimateNumber,
}: Props) {
  const router =
    useRouter();

  const [
    converting,
    setConverting,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(
    null
  );

  async function handleConvert() {
    if (converting) {
      return;
    }

    const confirmed =
      window.confirm(
        `Transformer le devis ${estimateNumber} en facture ?\n\nLa facture sera créée directement dans Zoho Books.`
      );

    if (!confirmed) {
      return;
    }

    setConverting(true);
    setErrorMessage(null);

    try {
      const response =
        await fetch(
          `/api/zoho/estimates/${estimateId}/convert-to-invoice`,
          {
            method: "POST",
          }
        );

      const result =
        (await response.json()) as {
          success?: boolean;
          error?: string;
          invoice?: {
            invoice_id?: string;
            invoice_number?: string;
          };
        };

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
            "Impossible de transformer le devis en facture."
        );
      }

      if (
        !result.invoice?.invoice_id
      ) {
        throw new Error(
          "La facture a été créée mais son identifiant n'a pas été retourné."
        );
      }

      router.push(
        `/management/invoices/${result.invoice.invoice_id}`
      );

      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de transformer le devis en facture."
      );

      setConverting(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleConvert}
        disabled={converting}
        className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {converting
          ? "Création de la facture..."
          : "Transformer en facture"}
      </button>

      {errorMessage ? (
        <p className="mt-2 max-w-sm text-sm font-medium text-red-600">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}