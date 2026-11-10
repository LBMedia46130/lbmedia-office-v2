import { NextRequest, NextResponse } from "next/server";
import {
  createZohoCreditNoteDraft,
  getAllZohoCreditNotes,
  getZohoCreditNote,
  getZohoInvoice,
  type ZohoCreditNote,
  type ZohoInvoice,
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

function blockingReason(invoice: ZohoInvoice): string | null {
  if (invoice.status === "draft" || invoice.status === "void") {
    return "Une facture brouillon ou annulée ne peut pas être créditée ici.";
  }
  if (!invoice.invoice_number || !invoice.customer_id) {
    return "La facture ne contient pas les identifiants requis.";
  }
  if (!Number.isFinite(invoice.total) || invoice.total <= 0 ||
      !Number.isFinite(invoice.balance) || invoice.balance < 0) {
    return "Les montants de la facture sont invalides.";
  }
  // L'imputation automatique future ne pourra solder une facture déjà réglée en partie.
  if (inCents(invoice.total) !== inCents(invoice.balance)) {
    return "La facture est déjà partiellement ou totalement réglée. Traitement manuel nécessaire.";
  }
  if (invoice.discount || invoice.shipping_charge || invoice.adjustment || invoice.is_inclusive_tax) {
    return "Cette facture comporte une remise globale, des frais, un ajustement ou une TVA incluse : vérification manuelle nécessaire.";
  }
  const lines = invoice.line_items ?? [];
  if (!lines.length) return "La facture ne contient aucune ligne.";
  for (const line of lines) {
    if (!Number.isFinite(line.quantity) || line.quantity <= 0 ||
        !Number.isFinite(line.rate) || line.rate < 0 ||
        !Number.isFinite(line.item_total) || line.item_total < 0 ||
        !line.line_item_id || (!line.item_id && !line.name)) {
      return "Une ligne de la facture ne peut pas être reprise de manière sûre.";
    }
    if (line.discount || line.discount_amount) {
      return "La facture contient une remise sur ligne : contrôle manuel du calcul nécessaire.";
    }
    // On conserve uniquement une taxe identifiée, afin de laisser Zoho la recalculer.
    if (line.tax_percentage && !line.tax_id) {
      return "Une taxe n'a pas d'identifiant Zoho. Vérification manuelle nécessaire.";
    }
  }
  return null;
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
    const reason = blockingReason(invoice);
    if (reason) return errorResponse(reason, 422);

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

    const lines = (invoice.line_items ?? []).map((line) => ({
      item_id: line.item_id,
      invoice_item_id: line.line_item_id,
      name: line.name,
      description: line.description,
      quantity: line.quantity,
      rate: line.rate,
      tax_id: line.tax_id,
    }));

    // Écriture réelle unique. Aucun retry automatique si la réponse Zoho est incertaine.
    creationStarted = true;
    const creditNote = await createZohoCreditNoteDraft({
      customer_id: invoice.customer_id,
      invoice_id: invoice.invoice_id,
      date: parisDate(),
      reference_number: invoice.invoice_number,
      notes: `Facture d'origine : ${invoice.invoice_number}`,
      line_items: lines,
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
