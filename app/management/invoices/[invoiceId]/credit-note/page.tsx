import CreateCreditNoteDraftButton from "./CreateCreditNoteDraftButton";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getZohoInvoice, getAllZohoCreditNotes, getZohoCreditNote } from "@/lib/zoho-books";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ invoiceId: string }> };
const money = (value: number, currency: string) => new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(value);

export default async function CreditNotePreview({ params }: Props) {
  const { invoiceId } = await params;
  if (!invoiceId?.trim()) notFound();
  const invoice = await getZohoInvoice(invoiceId).catch(() => null);
  if (!invoice) notFound();
  const currency = invoice.currency_code || "EUR";
  let checkError: string | null = null;
  let linked: { creditnote_id: string; creditnote_number?: string }[] = [];
  try {
    const notes = await getAllZohoCreditNotes();
    const sameCustomer = notes.filter(n => n.customer_id === invoice.customer_id);
    const details = await Promise.all(sameCustomer.map(n => getZohoCreditNote(n.creditnote_id)));
    linked = details.filter(n => n.invoices?.some(i => i.invoice_id === invoiceId) ||
      n.line_items?.some(l => (l as {invoice_id?: string}).invoice_id === invoiceId) ||
      n.reference_number === invoice.invoice_number ||
      n.notes?.includes(`Facture d'origine : ${invoice.invoice_number}`))
      .map(n => ({ creditnote_id: n.creditnote_id, creditnote_number: n.creditnote_number }));
  } catch {
    checkError = "Impossible de vérifier tous les avoirs existants dans Zoho. Aucune création ne doit être autorisée tant que ce contrôle échoue.";
  }
  const lines = invoice.line_items || [];
  const hasComplexTotals = Boolean((invoice.shipping_charge || 0) !== 0 || (invoice.adjustment || 0) !== 0 || (invoice.discount || 0) !== 0 || invoice.is_inclusive_tax);
  const cents = (value: number) => Math.round(value * 100);
  const hasLineRisks = lines.length === 0 || lines.some(line =>
    !line.line_item_id || (!line.item_id && !line.name) ||
    !Number.isFinite(line.quantity) || line.quantity <= 0 ||
    !Number.isFinite(line.rate) || line.rate < 0 ||
    !Number.isFinite(line.item_total) || line.item_total < 0 ||
    Boolean(line.discount || line.discount_amount) ||
    Boolean(line.tax_percentage && !line.tax_id)
  );
  const disabledReason = checkError ||
    (linked.length > 0 ? "Un avoir semble déjà associé à cette facture." : null) ||
    (["draft", "void"].includes(invoice.status) ? "La facture est brouillon ou annulée." : null) ||
    (!invoice.invoice_number || !invoice.customer_id ? "Informations obligatoires de la facture manquantes." : null) ||
    (!Number.isFinite(invoice.total) || invoice.total <= 0 || !Number.isFinite(invoice.balance) || invoice.balance < 0 ? "Montants invalides." : null) ||
    (cents(invoice.total) !== cents(invoice.balance) ? "Facture déjà réglée totalement ou partiellement : traitement manuel nécessaire." : null) ||
    (hasComplexTotals ? "Remise globale, TVA incluse, frais ou ajustement : contrôle manuel nécessaire." : null) ||
    (hasLineRisks ? "Certaines lignes nécessitent un contrôle manuel (remises, taxes ou valeurs)." : null) ||
    null;
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-[1100px]">
        <Link href={`/management/invoices/${encodeURIComponent(invoiceId)}`} className="text-sm font-semibold text-blue-600">← Retour à la facture</Link>
        <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-blue-600">Gestion / Factures / Avoir total</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Préparer un avoir total</h1>
        <p className="mt-2 text-sm text-slate-600">Facture {invoice.invoice_number} · {invoice.customer_name}</p>
        <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900">
          Prévisualisation et contrôles avant création. Seul un brouillon sera créé après confirmation explicite ; aucune imputation automatique n'est effectuée à cette étape.
        </div>
        {checkError && <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{checkError}</div>}
        {linked.length > 0 && <div role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">Un ou plusieurs avoirs semblent déjà associés à cette facture : {linked.map(n => n.creditnote_number || n.creditnote_id).join(", ")}. Création à bloquer.</div>}
        {hasComplexTotals && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">Cette facture contient une remise globale, des frais de livraison ou un ajustement. Ces éléments nécessitent une vérification particulière pour obtenir un avoir exactement égal au total.</div>}
        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="p-4">Prestation</th><th className="p-4 text-right">Qté</th><th className="p-4 text-right">Prix unitaire</th><th className="p-4">Remise</th><th className="p-4">Taxe</th><th className="p-4 text-right">Montant ligne</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{lines.map((line, i) => <tr key={line.line_item_id || i}><td className="p-4"><div className="font-semibold">{line.name}</div><div className="text-slate-500">{line.description}</div></td><td className="p-4 text-right">{line.quantity}</td><td className="p-4 text-right">{money(line.rate, currency)}</td><td className="p-4">{line.discount ?? (line.discount_amount ? money(line.discount_amount, currency) : "—")}</td><td className="p-4">{line.tax_name || (line.tax_percentage !== undefined ? `${line.tax_percentage} %` : "—")}</td><td className="p-4 text-right font-semibold">{money(line.item_total, currency)}</td></tr>)}</tbody></table>
        </div>
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6"><p className="text-sm text-slate-500">Montant total de la facture à créditer</p><p className="mt-1 text-3xl font-bold text-slate-900">{money(invoice.total, currency)}</p><p className="mt-2 text-sm text-slate-500">Solde restant dû : {money(invoice.balance, currency)} · Statut : {invoice.status}</p></div>
        <CreateCreditNoteDraftButton invoiceId={invoiceId} invoiceNumber={invoice.invoice_number} disabledReason={disabledReason ?? undefined} />
      </div>
    </main>
  );
}
