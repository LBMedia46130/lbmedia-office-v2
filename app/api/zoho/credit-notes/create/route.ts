import { NextRequest, NextResponse } from "next/server";
import {
  createZohoCreditNoteDraft,
  getAllZohoCreditNotes,
  getZohoCreditNote,
  getZohoInvoice,
  type ZohoCreditNote,
  type ZohoInvoice,
  prepareZohoCreditNoteLines,
} from "@/lib/zoho-books";

export const dynamic = "force-dynamic";

// Ne créer un document comptable qu'après une confirmation explicite.
// Cette route ne transforme PAS le brouillon en avoir ouvert et ne l'impute PAS.
type CreateRequest = {
  invoiceId?: unknown;
  confirmation?: unknown;
};

const CONFIRMATION = "CREER_BROUILLON_AVOIR_TOTAL";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

function inCents(value: number): number {
  return Math.round(value * 100);
}

function parisDate(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (name: string) => parts.find((item) => item.type === name)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function linkedToInvoice(note: ZohoCreditNote, invoice: ZohoInvoice): boolean {
  return Boolean(
    note.invoices?.some((entry) => entry.invoice_id === invoice.invoice_id) ||
    note.reference_number === invoice.invoice_number ||
    note.notes?.includes(`Facture d'origine : ${invoice.invoice_number}`) ||
    note.line_items?.some((line) =>
      (line as typeof line & { invoice_id?: string }).invoice_id === invoice.invoice_id
    )
  );
}

export async function POST(request: NextRequest) {
  let payload: CreateRequest;
  try {
    payload = (await request.json()) as CreateRequest;
  } catch {
    return errorResponse("Corps JSON invalide.", 400);
  }

  const invoiceId = typeof payload.invoiceId === "string" ? payload.invoiceId.trim() : "";
  if (!/^[0-9]+$/.test(invoiceId)) {
    return errorResponse("Identifiant de facture Zoho invalide.", 400);
  }
  if (payload.confirmation !== CONFIRMATION) {
    return errorResponse("Confirmation explicite de création manquante.", 400);
  }

  let creationStarted = false;
  try {
    const invoice = await getZohoInvoice(invoiceId);
    const preparation = prepareZohoCreditNoteLines(invoice);
    if (preparation.blockingReason) return errorResponse(preparation.blockingReason, 422);

    // Vérification en lecture seule : si elle échoue, aucune création n'est autorisée.
    const allNotes = await getAllZohoCreditNotes();
    const customerNotes = allNotes.filter((note) => note.customer_id === invoice.customer_id);
    const detailedNotes = await Promise.all(
      customerNotes.map((note) => getZohoCreditNote(note.creditnote_id))
    );
    const existing = detailedNotes.find((note) => linkedToInvoice(note, invoice));
    if (existing) {
      return NextResponse.json({
        success: false,
        message: `Un avoir semble déjà associé à cette facture (${existing.creditnote_number || existing.creditnote_id}).`,
        creditNoteId: existing.creditnote_id,
      }, { status: 409 });
    }

    // Écriture réelle unique. Aucun retry automatique si la réponse Zoho est incertaine.
    creationStarted = true;
    const creditNote = await createZohoCreditNoteDraft({
      customer_id: invoice.customer_id,
      invoice_id: invoice.invoice_id,
      date: parisDate(),
      reference_number: invoice.invoice_number,
      notes: `Facture d'origine : ${invoice.invoice_number}`,
      line_items: preparation.lines,
    });

    const matchesTotal = typeof creditNote.total === "number" &&
      inCents(creditNote.total) === inCents(invoice.total);

    return NextResponse.json({
      success: true,
      message: matchesTotal
        ? "Avoir brouillon créé dans Zoho Books. Contrôler avant ouverture et affectation."
        : "Avoir brouillon créé, mais montant différent ou indisponible : vérification manuelle obligatoire. Ne pas ouvrir ni affecter.",
      creditNoteId: creditNote.creditnote_id,
      creditNoteNumber: creditNote.creditnote_number ?? null,
      status: creditNote.status ?? null,
      invoiceId: invoice.invoice_id,
      invoiceTotal: invoice.total,
      creditNoteTotal: creditNote.total ?? null,
      amountMatches: matchesTotal,
      applied: false,
    }, { status: 201 });
  } catch (error) {
    console.error("Création brouillon avoir Zoho :", error);
    return errorResponse(
      creationStarted
        ? "La création a peut-être eu lieu dans Zoho malgré l'erreur. Vérifier les avoirs Zoho avant toute nouvelle tentative."
        : "Contrôle de la facture et des avoirs impossible. Aucun avoir n'a été créé par cette requête.",
      502
    );
  }
}
