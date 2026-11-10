import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  createZohoCreditNoteDraft,
  getAllZohoCreditNotes,
  getZohoCreditNote,
  getZohoInvoice,
  prepareZohoCreditNoteLines,
  type ZohoCreditNote,
  type ZohoInvoice,
  ZohoBooksApiError,
} from "@/lib/zoho-books";

export const dynamic = "force-dynamic";

// IMPORTANT : cette route ne crée qu'un BROUILLON, sans ouverture ni imputation.
// Le proxy Office doit toujours protéger /api/zoho/credit-notes/create.
// Installer la table SQL associée AVANT de déployer cette route.
// Aucun verrou n'est effacé automatiquement : une réponse Zoho perdue peut
// masquer un avoir réellement créé. Le déblocage exige une vérification humaine.

type CreateRequest = { invoiceId?: unknown; confirmation?: unknown };
type LockRow = {
  invoice_id: string;
  invoice_number: string;
  status: "pending" | "created" | "uncertain";
  credit_note_id: string | null;
};

const CONFIRMATION = "CREER_BROUILLON_AVOIR_TOTAL";
const LOCK_TABLE = "zoho_credit_note_creation_locks";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

function inCents(value: number): number {
  return Math.round(value * 100);
}

function parisDate(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
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

/** L'unicité de invoice_id est imposée en base et fonctionne entre instances Vercel. */
async function acquireCreationLock(invoice: ZohoInvoice) {
  const { error } = await supabaseAdmin.from(LOCK_TABLE).insert({
    invoice_id: invoice.invoice_id,
    invoice_number: invoice.invoice_number,
    status: "pending",
  });
  if (!error) return { acquired: true as const };

  // 23505 = violation de l'unicité PostgreSQL : une autre requête est déjà passée.
  if (error.code === "23505") {
    const { data, error: readError } = await supabaseAdmin
      .from(LOCK_TABLE)
      .select("invoice_id, invoice_number, status, credit_note_id")
      .eq("invoice_id", invoice.invoice_id)
      .maybeSingle();
    if (readError) throw new Error(`Verrou existant, mais lecture impossible : ${readError.message}`);
    return { acquired: false as const, previous: (data ?? null) as LockRow | null };
  }

  // Une table manquante ou une erreur Supabase ne doit jamais permettre une écriture Zoho.
  throw new Error(`Verrou de création indisponible : ${error.message}`);
}

async function updateLock(invoiceId: string, status: "created" | "uncertain", creditNoteId?: string) {
  const { error } = await supabaseAdmin
    .from(LOCK_TABLE)
    .update({
      status,
      credit_note_id: creditNoteId ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("invoice_id", invoiceId);
  if (error) throw new Error(`Impossible de mettre à jour le verrou de création : ${error.message}`);
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
  let lockAcquired = false;
  try {
    const invoice = await getZohoInvoice(invoiceId);
    const preparation = prepareZohoCreditNoteLines(invoice);
    if (preparation.blockingReason) return errorResponse(preparation.blockingReason, 422);

    // Premier contrôle des éventuels avoirs existants, exclusivement en lecture.
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

    // Deux appels simultanés peuvent passer le contrôle précédent.
    // INSERT avec clé primaire invoice_id : une seule requête prend le verrou.
    const lock = await acquireCreationLock(invoice);
    if (!lock.acquired) {
      return NextResponse.json({
        success: false,
        message: lock.previous?.status === "created"
          ? "Une création d'avoir est déjà enregistrée pour cette facture. Vérifie l'avoir existant dans Zoho."
          : "Une création d'avoir est en cours ou son résultat est incertain. Vérifie Zoho avant toute autre tentative.",
        creditNoteId: lock.previous?.credit_note_id ?? null,
      }, { status: 409 });
    }
    lockAcquired = true;

    // Diagnostic comptable sans nom de client, commentaires ni informations OAuth.
    // Montants et structures uniquement pour diagnostiquer le code Zoho 6.
    console.info("Avoir Zoho - payload comptable avant création", {
      invoiceId: invoice.invoice_id,
      invoiceNumber: invoice.invoice_number,
      invoiceTotal: invoice.total,
      currency: invoice.currency_code ?? "EUR",
      lines: preparation.lines.map((line, index) => ({
        position: index + 1,
        quantity: line.quantity,
        rate: line.rate,
        discount: line.discount ?? null,
        hasItemId: Boolean(line.item_id),
        hasInvoiceItemId: Boolean(line.invoice_item_id),
        hasTaxId: Boolean(line.tax_id),
      })),
    });

    // Une seule écriture Zoho. Ne JAMAIS faire de retry automatique.
    creationStarted = true;
    const creditNote = await createZohoCreditNoteDraft({
      customer_id: invoice.customer_id,
      invoice_id: invoice.invoice_id,
      date: parisDate(),
      reference_number: invoice.invoice_number,
      notes: `Facture d'origine : ${invoice.invoice_number}`,
      line_items: preparation.lines,
    });

    // Le verrou reste en place, même si la comparaison des montants échoue.
    await updateLock(invoiceId, "created", creditNote.creditnote_id);
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
    const explicitZohoRejection = creationStarted && error instanceof ZohoBooksApiError;
    console.error("Création brouillon avoir Zoho :", {
      invoiceId,
      explicitZohoRejection,
      zohoCode: error instanceof ZohoBooksApiError ? error.zohoCode : null,
      httpStatus: error instanceof ZohoBooksApiError ? error.httpStatus : null,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    });
    if (lockAcquired) {
      try {
        await updateLock(invoiceId, "uncertain");
      } catch (lockError) {
        console.error("Échec du marquage du verrou comme incertain :", lockError);
      }
    }
    if (explicitZohoRejection) {
      // Refus formel de Zoho : distinct d'un timeout. Le verrou reste conservé
      // pour empêcher tout nouvel essai sans réconciliation humaine.
      return errorResponse(
        `Zoho Books a refusé le brouillon (code ${error.zohoCode ?? error.httpStatus}). Aucune nouvelle tentative avant vérification dans Zoho. Verrou conservé par sécurité.`,
        422
      );
    }
    return errorResponse(
      creationStarted
        ? "Résultat de création incertain : un avoir a peut-être été créé dans Zoho. Vérifier Zoho et le journal Supabase avant toute nouvelle tentative."
        : "Contrôle préalable impossible ou verrou de création indisponible : aucune création Zoho n'a été lancée par cette requête.",
      502
    );
  }
}
