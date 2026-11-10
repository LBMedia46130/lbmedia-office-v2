"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  creditNoteId: string;
  creditNoteNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  totalLabel: string;
};

export default function OpenCreditNoteButton({ creditNoteId, creditNoteNumber, invoiceId, invoiceNumber, totalLabel }: Props) {
  const router = useRouter();
  const [phrase, setPhrase] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  async function openCreditNote() {
    if (phrase.trim() !== "OUVRIR" || pending || finished) return;
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/zoho/credit-notes/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ creditNoteId, invoiceId, confirmation: "OUVRIR_AVOIR_ZOHO" }),
      });
      const data: { success?: boolean; message?: string } = await response.json();
      if (!response.ok || data.success !== true) {
        setMessage(data.message || "Ouverture non confirmée : vérifier le statut dans Zoho avant toute nouvelle tentative.");
        return;
      }
      setFinished(true);
      setMessage("Zoho confirme l'ouverture de l'avoir. Aucune facture n'a été imputée.");
      router.refresh();
    } catch {
      setMessage("Réponse indisponible : vérifier le statut dans Zoho avant toute nouvelle tentative.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Ouvrir cet avoir dans Zoho</h2>
      <p className="mt-2 text-sm text-slate-700">
        Avoir {creditNoteNumber} · Facture {invoiceNumber} · {totalLabel}.
        Cette action modifie le statut comptable de l'avoir. Elle ne l'affecte pas à la facture et ne déclenche aucun remboursement.
      </p>
      <label htmlFor="confirmation-ouverture-avoir" className="mt-4 block text-sm font-semibold text-slate-800">
        Pour confirmer, saisir OUVRIR
      </label>
      <div className="mt-2 flex flex-wrap gap-3">
        <input
          id="confirmation-ouverture-avoir"
          className="min-w-[180px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          value={phrase}
          onChange={(event) => setPhrase(event.target.value)}
          autoComplete="off"
          disabled={pending || finished}
        />
        <button
          type="button"
          className="rounded-xl bg-amber-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={phrase.trim() !== "OUVRIR" || pending || finished}
          onClick={openCreditNote}
        >
          {pending ? "Vérification Zoho…" : "Confirmer l'ouverture"}
        </button>
      </div>
      {message && <p role="status" className="mt-3 text-sm font-medium text-slate-800">{message}</p>}
    </section>
  );
}
