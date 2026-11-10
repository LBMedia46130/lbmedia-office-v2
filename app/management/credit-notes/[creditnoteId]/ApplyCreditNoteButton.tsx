"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  creditNoteId: string;
  creditNoteNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  amountLabel: string;
};

export default function ApplyCreditNoteButton({
  creditNoteId, creditNoteNumber, invoiceId, invoiceNumber, amountLabel,
}: Props) {
  const router = useRouter();
  const [phrase, setPhrase] = useState("");
  const [pending, setPending] = useState(false);
  const [finished, setFinished] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function apply() {
    if (pending || finished || phrase.trim() !== "IMPUTER") return;
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/zoho/credit-notes/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          creditNoteId,
          invoiceId,
          confirmation: "IMPUTER_AVOIR_ZOHO",
        }),
      });
      const result: { success?: boolean; message?: string } = await response.json();
      if (!response.ok || result.success !== true) {
        setMessage(result.message || "Imputation non confirmee : verifier Zoho avant toute nouvelle tentative.");
        return;
      }
      setFinished(true);
      setMessage("Imputation confirmee par Zoho Books. Les soldes vont etre actualises.");
      router.refresh();
    } catch {
      setMessage("Reponse indisponible : verifier Zoho avant toute nouvelle tentative.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Imputer cet avoir a sa facture</h2>
      <p className="mt-2 text-sm text-slate-700">
        Avoir {creditNoteNumber} · Facture {invoiceNumber} · Montant maximal a imputer : {amountLabel}.
        Le montant effectivement impute sera le plus petit entre le credit disponible et le solde du.
        Cette operation modifie les soldes dans Zoho Books. Elle ne declenche aucun remboursement.
      </p>
      <label htmlFor="confirmation-imputation-avoir" className="mt-4 block text-sm font-semibold text-slate-800">
        Pour confirmer, saisir IMPUTER
      </label>
      <div className="mt-2 flex flex-wrap gap-3">
        <input
          id="confirmation-imputation-avoir"
          className="min-w-[180px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          value={phrase}
          onChange={(event) => setPhrase(event.target.value)}
          autoComplete="off"
          disabled={pending || finished}
        />
        <button
          type="button"
          className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={pending || finished || phrase.trim() !== "IMPUTER"}
          onClick={apply}
        >
          {pending ? "Verification Zoho…" : "Confirmer l'imputation"}
        </button>
      </div>
      {message && <p role="status" className="mt-3 text-sm font-medium text-slate-800">{message}</p>}
    </section>
  );
}
