import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllZohoInvoices, getZohoCreditNote, type ZohoInvoice } from "@/lib/zoho-books";
import OpenCreditNoteButton from "./OpenCreditNoteButton";
import ApplyCreditNoteButton from "./ApplyCreditNoteButton";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ creditnoteId: string }> };

function money(value?: number, currency = "EUR") {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(Number(value) || 0);
}
function dateLabel(value?: string) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("fr-FR").format(date);
}
function statusLabel(value?: string) {
  switch (value) {
    case "draft": return "Brouillon";
    case "open": return "Ouvert";
    case "closed": return "Clôturé";
    case "void": return "Annulé";
    default: return value || "—";
  }
}

export default async function CreditNoteDetailPage({ params }: Props) {
  const { creditnoteId } = await params;
  if (!creditnoteId?.trim()) notFound();

  const creditNote = await getZohoCreditNote(creditnoteId).catch((error) => {
    console.error("Impossible de récupérer l'avoir Zoho :", error);
    return null;
  });
  if (!creditNote) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-8"><div className="mx-auto max-w-[1200px]">
        <Link href="/management/credit-notes" className="text-sm font-semibold text-blue-600">← Retour aux avoirs</Link>
        <div role="alert" className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
          Impossible de consulter cet avoir dans Zoho Books. Vérifie son identifiant et les autorisations de lecture.
        </div>
      </div></main>
    );
  }

  const currency = creditNote.currency_code || "EUR";
  const lines = creditNote.line_items || [];
  const invoices = creditNote.invoices || [];
  let originalInvoice: ZohoInvoice | undefined;
  let invoiceLookupError = false;

  // La référence et le client permettent de retrouver la facture d'origine.
  // La route API revérifie impérativement les informations avant toute écriture.
  if (["draft", "open"].includes(creditNote.status || "") && creditNote.reference_number) {
    try {
      const matches = (await getAllZohoInvoices()).filter(
        (invoice) => invoice.invoice_number === creditNote.reference_number &&
          invoice.customer_id === creditNote.customer_id
      );
      if (matches.length === 1) originalInvoice = matches[0];
    } catch (error) {
      console.error("Impossible de retrouver la facture d'origine de l'avoir :", error);
      invoiceLookupError = true;
    }
  }
  const totalMatches = originalInvoice && typeof creditNote.total === "number" &&
    Math.round(creditNote.total * 100) === Math.round(originalInvoice.total * 100);
  const linkedByNote = originalInvoice &&
    creditNote.notes?.includes(`Facture d'origine : ${originalInvoice.invoice_number}`);
  const canOfferOpening = creditNote.status === "draft" && originalInvoice &&
    totalMatches && linkedByNote && creditNote.total !== undefined && creditNote.total > 0;

  const canOfferApplication = creditNote.status === "open" && originalInvoice &&
    linkedByNote && typeof creditNote.balance === "number" && creditNote.balance > 0 &&
    typeof originalInvoice.balance === "number" && originalInvoice.balance > 0 &&
    originalInvoice.status !== "void" && originalInvoice.status !== "draft" &&
    (!creditNote.currency_code || !originalInvoice.currency_code ||
      creditNote.currency_code === originalInvoice.currency_code) &&
    !invoices.some((invoice) => invoice.invoice_id === originalInvoice.invoice_id);
  const maximumApplication = canOfferApplication && originalInvoice
    ? Math.min(creditNote.balance || 0, originalInvoice.balance) : 0;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1200px] px-6 py-8">
        <Link href="/management/credit-notes" className="text-sm font-semibold text-blue-600 hover:text-blue-700">← Retour aux avoirs</Link>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Gestion / Avoirs</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold text-slate-900">Avoir {creditNote.creditnote_number || "sans numéro"}</h1>
          <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">{statusLabel(creditNote.status)}</span>
        </div>
        <p className="mt-2 text-sm text-slate-500">Document synchronisé depuis Zoho Books.</p>

        {canOfferOpening && originalInvoice ? (
          <div className="mt-8">
            <OpenCreditNoteButton
              creditNoteId={creditNote.creditnote_id}
              creditNoteNumber={creditNote.creditnote_number || creditNote.creditnote_id}
              invoiceId={originalInvoice.invoice_id}
              invoiceNumber={originalInvoice.invoice_number}
              totalLabel={money(creditNote.total, currency)}
            />
          </div>
        ) : creditNote.status === "draft" ? (
          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            Ouverture indisponible : {invoiceLookupError
              ? "la recherche de la facture d'origine a échoué."
              : "la facture d'origine, le lien explicite ou l'égalité des montants TTC n'est pas vérifiable."}
            {" "}Aucune opération comptable n'a été exécutée.
          </div>
        ) : null}

        {canOfferApplication && originalInvoice ? (
          <div className="mt-8">
            <ApplyCreditNoteButton
              creditNoteId={creditNote.creditnote_id}
              creditNoteNumber={creditNote.creditnote_number || creditNote.creditnote_id}
              invoiceId={originalInvoice.invoice_id}
              invoiceNumber={originalInvoice.invoice_number}
              amountLabel={money(maximumApplication, currency)}
            />
          </div>
        ) : creditNote.status === "open" ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
            Imputation non proposee : la facture d'origine n'est pas identifiable avec certitude,
            une imputation existe deja, ou aucun solde n'est disponible sur la facture ou l'avoir.
            Un avoir concernant une facture deja payee doit etre traite separement (credit client ou remboursement).
          </div>
        ) : null}

        <section className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Informations de l'avoir</h2>
              <dl className="mt-5 grid gap-5 sm:grid-cols-2">
                <div><dt className="text-xs font-semibold uppercase text-slate-500">Client</dt><dd className="mt-1 text-slate-900">{creditNote.customer_name || "—"}</dd></div>
                <div><dt className="text-xs font-semibold uppercase text-slate-500">Date</dt><dd className="mt-1 text-slate-900">{dateLabel(creditNote.date)}</dd></div>
                <div><dt className="text-xs font-semibold uppercase text-slate-500">Référence</dt><dd className="mt-1 text-slate-900">{creditNote.reference_number || "—"}</dd></div>
                <div><dt className="text-xs font-semibold uppercase text-slate-500">Statut</dt><dd className="mt-1 text-slate-900">{statusLabel(creditNote.status)}</dd></div>
              </dl>
              {creditNote.notes ? <p className="mt-5 whitespace-pre-wrap border-t border-slate-100 pt-5 text-sm text-slate-600">{creditNote.notes}</p> : null}
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <h2 className="px-6 pt-6 text-lg font-semibold text-slate-900">Prestations créditées</h2>
              {lines.length ? (
                <div className="overflow-x-auto"><table className="mt-4 min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>
                    <th className="px-5 py-3">Désignation</th><th className="px-5 py-3 text-right">Qté</th><th className="px-5 py-3 text-right">Prix unitaire</th><th className="px-5 py-3 text-right">Montant ligne</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">{lines.map((line, index) => (
                    <tr key={line.line_item_id || `${line.item_id || "line"}-${index}`}>
                      <td className="px-5 py-4"><span className="font-medium text-slate-900">{line.name || "Prestation"}</span>{line.description ? <p className="mt-1 whitespace-pre-wrap text-slate-500">{line.description}</p> : null}</td>
                      <td className="px-5 py-4 text-right">{line.quantity ?? "—"}</td>
                      <td className="px-5 py-4 text-right">{money(line.rate, currency)}</td>
                      <td className="px-5 py-4 text-right font-semibold">{money(line.item_total, currency)}</td>
                    </tr>
                  ))}</tbody>
                </table></div>
              ) : <p className="p-6 text-sm text-slate-500">Aucune ligne détaillée retournée par Zoho Books.</p>}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Factures associées</h2>
              {invoices.length ? <ul className="mt-4 space-y-3">{invoices.map((invoice) => (
                <li key={invoice.invoice_id} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 text-sm">
                  <Link href={`/management/invoices/${encodeURIComponent(invoice.invoice_id)}`} className="font-semibold text-blue-600 hover:text-blue-700">{invoice.invoice_number || "Consulter la facture"}</Link>
                  <span className="text-slate-600">{typeof invoice.amount === "number" ? money(invoice.amount, currency) : "Montant non précisé"}</span>
                </li>
              ))}</ul> : <p className="mt-3 text-sm text-slate-500">Aucune imputation indiquée dans la réponse Zoho.</p>}
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Montant TTC de l'avoir</p><p className="mt-2 text-3xl font-bold text-slate-900">{money(creditNote.total, currency)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Crédit restant</p><p className="mt-2 text-2xl font-bold text-slate-900">{money(creditNote.balance, currency)}</p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
