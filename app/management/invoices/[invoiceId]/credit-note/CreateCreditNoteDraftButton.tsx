"use client";

import { useState } from "react";
import Link from "next/link";

type Props = { invoiceId: string; invoiceNumber: string; disabledReason?: string };
type CreateResult = {
  success?: boolean;
  message?: string;
  creditNoteId?: string;
  creditNoteNumber?: string | null;
  amountMatches?: boolean;
};

export default function CreateCreditNoteDraftButton({ invoiceId, invoiceNumber, disabledReason }: Props) {
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CreateResult | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function createDraft() {
    if (busy || submitted || disabledReason || !confirmed) return;
    setBusy(true);
    setSubmitted(true); // Ne jamais relancer automatiquement une écriture dont le résultat est incertain.
    try {
      const response = await fetch("/api/zoho/credit-notes/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId, confirmation: "CREER_BROUILLON_AVOIR_TOTAL" }),
      });
      const data: CreateResult = await response.json();
      setResult({ ...data, success: response.ok && data.success === true });
    } catch {
      setResult({ success: false, message: "Réponse inconnue : vérifie impérativement les avoirs dans Zoho Books avant toute autre tentative." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Création dans Zoho Books</h2>
      <p className="mt-2 text-sm text-slate-600">
        Cette opération crée uniquement un <strong>avoir brouillon</strong> pour la facture {invoiceNumber}.
        Elle n'ouvre pas l'avoir et ne l'affecte pas à la facture.
      </p>
      {disabledReason ? (
        <p role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Création bloquée : {disabledReason}
        </p>
      ) : (
        <>
          <label className="mt-5 flex items-start gap-3 text-sm text-slate-700">
            <input type="checkbox" className="mt-1 h-4 w-4" checked={confirmed} disabled={busy || submitted}
              onChange={(event) => setConfirmed(event.target.checked)} />
            <span>J'ai vérifié la facture et je confirme vouloir créer <strong>un seul brouillon d'avoir</strong> dans Zoho Books.</span>
          </label>
          <button type="button" onClick={createDraft} disabled={!confirmed || busy || submitted}
            className="mt-4 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-blue-700">
            {busy ? "Création en cours…" : "Créer le brouillon d'avoir dans Zoho"}
          </button>
        </>
      )}
      {result && (
        <div role="status" className={`mt-5 rounded-xl border p-4 text-sm ${result.success && result.amountMatches ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
          <p className="font-semibold">{result.message || "Résultat non disponible."}</p>
          {result.creditNoteId && (
            <Link href={`/management/credit-notes/${encodeURIComponent(result.creditNoteId)}`}
              className="mt-2 inline-block font-semibold underline">
              Consulter l'avoir {result.creditNoteNumber || result.creditNoteId}
            </Link>
          )}
          {!result.success && <p className="mt-2">Ne relance pas l'opération sans vérifier dans Zoho Books si un avoir a été créé.</p>}
        </div>
      )}
    </section>
  );
}
