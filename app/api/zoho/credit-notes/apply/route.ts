import { NextRequest, NextResponse } from "next/server";
import {
  applyZohoCreditNoteToInvoice,
  getZohoCreditNote,
  getZohoCreditNoteAppliedInvoices,
  getZohoInvoice,
} from "@/lib/zoho-books";

export const dynamic = "force-dynamic";
const CONFIRMATION = "IMPUTER_AVOIR_ZOHO";

function failure(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

// Route protegee par le proxy Supabase d'Office. Ne pas exempter du proxy.
// Aucun retry automatique : en cas de resultat incertain, relire Zoho.
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return failure("Corps JSON invalide.", 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return failure("Donnees manquantes.", 400);
  }

  const data = body as Record<string, unknown>;
  const creditNoteId = typeof data.creditNoteId === "string" ? data.creditNoteId.trim() : "";
  const invoiceId = typeof data.invoiceId === "string" ? data.invoiceId.trim() : "";
  if (!/^\d+$/.test(creditNoteId) || !/^\d+$/.test(invoiceId)) {
    return failure("Identifiants Zoho invalides.", 400);
  }
  if (data.confirmation !== CONFIRMATION) {
    return failure("Confirmation explicite manquante.", 400);
  }

  let writeStarted = false;
  try {
    const [credit, invoice] = await Promise.all([
      getZohoCreditNote(creditNoteId),
      getZohoInvoice(invoiceId),
    ]);
    if (credit.status !== "open") return failure("L'avoir doit etre ouvert dans Zoho.", 409);
    if (credit.customer_id !== invoice.customer_id) return failure("Clients differents.", 409);
    if (credit.reference_number !== invoice.invoice_number ||
        !credit.notes?.includes(`Facture d'origine : ${invoice.invoice_number}`)) {
      return failure("Le rattachement de cet avoir a cette facture n'est pas confirme.", 409);
    }
    if (credit.currency_code && invoice.currency_code && credit.currency_code !== invoice.currency_code) {
      return failure("Devises incompatibles.", 409);
    }
    if (["void", "draft"].includes(invoice.status)) {
      return failure("Cette facture ne peut pas recevoir un avoir.", 409);
    }
    if (typeof credit.balance !== "number" || !Number.isFinite(credit.balance) ||
        typeof invoice.balance !== "number" || !Number.isFinite(invoice.balance)) {
      return failure("Soldes Zoho indisponibles.", 409);
    }
    const creditCents = Math.round(credit.balance * 100);
    const invoiceCents = Math.round(invoice.balance * 100);
    if (creditCents <= 0) return failure("Cet avoir n'a plus de credit disponible.", 409);
    if (invoiceCents <= 0) return failure("Cette facture est deja reglee : aucune imputation possible.", 409);

    // Ne pas imputer automatiquement un avoir qui a deja ete utilise sur cette facture.
    const existing = await getZohoCreditNoteAppliedInvoices(creditNoteId);
    if (existing.some((entry) => entry.invoice_id === invoiceId)) {
      return failure("Cet avoir comporte deja une imputation sur cette facture. Verifier Zoho avant de poursuivre.", 409);
    }

    const amountCents = Math.min(creditCents, invoiceCents);
    if (amountCents <= 0) return failure("Montant a imputer invalide.", 409);

    writeStarted = true;
    const { creditNote, invoice: updatedInvoice } = await applyZohoCreditNoteToInvoice(
      creditNoteId,
      invoiceId,
      amountCents / 100
    );
    const applied = await getZohoCreditNoteAppliedInvoices(creditNoteId);
    const recorded = applied.some((entry) => entry.invoice_id === invoiceId);
    if (!recorded) {
      return failure("Zoho a repondu, mais l'imputation n'est pas encore verifiable. Controle manuel obligatoire.", 502);
    }
    return NextResponse.json({
      success: true,
      message: "Imputation confirmee dans Zoho Books.",
      amountApplied: amountCents / 100,
      creditNoteId: creditNote.creditnote_id,
      creditNoteStatus: creditNote.status,
      creditBalance: creditNote.balance ?? null,
      invoiceId: updatedInvoice.invoice_id,
      invoiceBalance: updatedInvoice.balance,
    });
  } catch (error) {
    console.error("Imputation avoir Zoho :", error);
    return failure(
      writeStarted
        ? "Resultat d'imputation incertain : verifier les imputations dans Zoho avant toute nouvelle tentative."
        : "Verification Zoho impossible : aucune imputation n'a ete lancee par cette requete.",
      502
    );
  }
}
