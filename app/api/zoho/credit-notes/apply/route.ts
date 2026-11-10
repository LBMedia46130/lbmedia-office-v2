import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  applyZohoCreditNoteToInvoice,
  getZohoCreditNote,
  getZohoCreditNoteAppliedInvoices,
  getZohoInvoice,
} from "@/lib/zoho-books";

export const dynamic = "force-dynamic";

const CONFIRMATION = "IMPUTER_AVOIR_ZOHO";
const LOCK_TABLE = "zoho_credit_note_application_locks";

type ApplicationLock = {
  credit_note_id: string;
  invoice_id: string;
  status: "uncertain" | "confirmed";
  requested_amount: number;
  applied_amount: number | null;
};

function failure(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

function cents(value: number): number {
  return Math.round(value * 100);
}

async function claimApplicationLock(creditNoteId: string, invoiceId: string, amount: number) {
  // INSERT atomique avec PRIMARY KEY credit_note_id : un seul appel peut continuer,
  // meme entre deux instances Vercel. Un verrou existant n'est JAMAIS ecrase.
  const { error } = await supabaseAdmin.from(LOCK_TABLE).insert({
    credit_note_id: creditNoteId,
    invoice_id: invoiceId,
    status: "uncertain", // avant tout appel d'ecriture externe
    requested_amount: amount,
  });
  if (!error) return { acquired: true as const };
  if (error.code === "23505") {
    const { data, error: readError } = await supabaseAdmin
      .from(LOCK_TABLE)
      .select("credit_note_id, invoice_id, status, requested_amount, applied_amount")
      .eq("credit_note_id", creditNoteId)
      .maybeSingle();
    if (readError) throw new Error(`Lecture du verrou impossible : ${readError.message}`);
    return { acquired: false as const, existing: (data ?? null) as ApplicationLock | null };
  }
  throw new Error(`Verrou Supabase indisponible : ${error.message}`);
}

async function updateApplicationLock(creditNoteId: string, fields: {
  status?: "uncertain" | "confirmed";
  applied_amount?: number;
  last_error?: string | null;
}) {
  const { data, error } = await supabaseAdmin
    .from(LOCK_TABLE)
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("credit_note_id", creditNoteId)
    .select("credit_note_id")
    .single();
  if (error || !data) {
    throw new Error(`Mise a jour du verrou impossible : ${error?.message ?? "ligne absente"}`);
  }
}

// Cette route doit rester protegee par le proxy d'authentification Office.
// Ne jamais l'exempter dans proxy.ts. Aucune tentative automatique apres erreur.
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

  let lockAcquired = false;
  let writeStarted = false;
  try {
    const [credit, invoice] = await Promise.all([
      getZohoCreditNote(creditNoteId),
      getZohoInvoice(invoiceId),
    ]);
    if (credit.status !== "open") return failure("L'avoir doit etre ouvert dans Zoho.", 409);
    if (credit.customer_id !== invoice.customer_id) return failure("Clients differents.", 409);
    if (
      credit.reference_number !== invoice.invoice_number ||
      !credit.notes?.includes(`Facture d'origine : ${invoice.invoice_number}`)
    ) {
      return failure("Le rattachement de cet avoir a cette facture n'est pas confirme.", 409);
    }
    if (
      credit.currency_code && invoice.currency_code &&
      credit.currency_code !== invoice.currency_code
    ) return failure("Devises incompatibles.", 409);
    if (["void", "draft"].includes(invoice.status)) {
      return failure("Cette facture ne peut pas recevoir un avoir.", 409);
    }
    if (
      typeof credit.balance !== "number" || !Number.isFinite(credit.balance) ||
      typeof invoice.balance !== "number" || !Number.isFinite(invoice.balance)
    ) return failure("Soldes Zoho indisponibles.", 409);

    const creditCents = cents(credit.balance);
    const invoiceCents = cents(invoice.balance);
    if (creditCents <= 0) return failure("Cet avoir n'a plus de credit disponible.", 409);
    if (invoiceCents <= 0) return failure("Cette facture est deja reglee : aucune imputation possible.", 409);

    const existingApplications = await getZohoCreditNoteAppliedInvoices(creditNoteId);
    if (existingApplications.length > 0) {
      return failure("Cet avoir comporte deja une imputation. Controle manuel requis avant toute nouvelle operation.", 409);
    }

    const amountCents = Math.min(creditCents, invoiceCents);
    if (amountCents <= 0) return failure("Montant a imputer invalide.", 409);
    const amount = amountCents / 100;

    const lock = await claimApplicationLock(creditNoteId, invoiceId, amount);
    if (!lock.acquired) {
      return NextResponse.json({
        success: false,
        message: lock.existing?.status === "confirmed"
          ? "Cette imputation a deja ete confirmee par Office. Consulter Zoho avant toute autre operation."
          : "Une tentative d'imputation existe deja, ou son resultat est incertain. Verifier Zoho et le verrou Supabase.",
      }, { status: 409 });
    }
    lockAcquired = true;

    // Une seule tentative d'ecriture ; jamais de retry implicite.
    writeStarted = true;
    const { creditNote, invoice: updatedInvoice } = await applyZohoCreditNoteToInvoice(
      creditNoteId, invoiceId, amount
    );
    const allocations = await getZohoCreditNoteAppliedInvoices(creditNoteId);
    const matching = allocations.filter(entry => entry.invoice_id === invoiceId);
    const totalRecordedCents = matching.reduce((sum, entry) => {
      const value = entry.amount_applied ?? entry.amount;
      return sum + (typeof value === "number" && Number.isFinite(value) ? cents(value) : 0);
    }, 0);
    if (totalRecordedCents < amountCents) {
      await updateApplicationLock(creditNoteId, {
        last_error: "Imputation non confirmee par la relecture Zoho. Controle manuel obligatoire.",
      });
      return failure("Zoho a repondu, mais le montant impute n'est pas verifiable. Ne pas recommencer.", 502);
    }

    await updateApplicationLock(creditNoteId, { status: "confirmed", applied_amount: amount, last_error: null });
    return NextResponse.json({
      success: true,
      message: "Imputation confirmee dans Zoho Books.",
      amountApplied: amount,
      creditNoteId: creditNote.creditnote_id,
      creditNoteStatus: creditNote.status,
      creditBalance: creditNote.balance ?? null,
      invoiceId: updatedInvoice.invoice_id,
      invoiceBalance: updatedInvoice.balance,
    });
  } catch (error) {
    console.error("Imputation avoir Zoho :", error);
    if (lockAcquired) {
      try {
        await updateApplicationLock(creditNoteId, {
          last_error: writeStarted
            ? "Erreur apres debut de tentative Zoho. Verification manuelle requise."
            : "Erreur apres acquisition du verrou, avant l'appel Zoho.",
        });
      } catch (lockError) {
        console.error("Impossible de tracer le verrou d'imputation :", lockError);
      }
    }
    return failure(
      lockAcquired
        ? "Resultat d'imputation incertain ou interrompu : consulter Zoho et Supabase, ne pas recommencer."
        : "Controle Zoho ou verrou Supabase indisponible : aucune imputation lancee par cette requete.",
      502
    );
  }
}
