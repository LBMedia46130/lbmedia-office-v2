import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  getAllZohoCreditNotes,
  getZohoCreditNote,
  getZohoInvoice,
  type ZohoCreditNote,
  type ZohoInvoice,
} from "@/lib/zoho-books";

export const dynamic = "force-dynamic";

// Cette route ne crée, n'ouvre, n'annule et n'impute AUCUN avoir.
// Elle ne supprime jamais le verrou : elle conserve une trace de refus vérifié.
// La protection utilisateur OFFICE_ALLOWED_USER_ID du proxy.ts reste obligatoire.
const LOCK_TABLE = "zoho_credit_note_creation_locks";
const CONFIRMATION = "CONFIRMER_REFUS_ZOHO_SANS_AVOIR";

type LockRow = {
  invoice_id: string;
  invoice_number: string;
  status: string;
  credit_note_id: string | null;
};

type Body = { invoiceId?: unknown; confirmation?: unknown };

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

function linkedToInvoice(note: ZohoCreditNote, invoice: ZohoInvoice) {
  return Boolean(
    note.invoices?.some((item) => item.invoice_id === invoice.invoice_id) ||
    note.reference_number === invoice.invoice_number ||
    note.notes?.includes(`Facture d'origine : ${invoice.invoice_number}`) ||
    note.line_items?.some((line) =>
      (line as typeof line & { invoice_id?: string }).invoice_id === invoice.invoice_id
    )
  );
}

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return jsonError("Corps JSON invalide.", 400);
  }

  const invoiceId = typeof body.invoiceId === "string" ? body.invoiceId.trim() : "";
  if (!/^\d+$/.test(invoiceId)) return jsonError("Identifiant de facture invalide.", 400);
  if (body.confirmation !== CONFIRMATION) {
    return jsonError("Confirmation explicite de résolution manquante.", 400);
  }

  // Ne jamais résoudre un verrou récent, ou un verrou portant déjà un avoir.
  const { data: lock, error: lockError } = await supabaseAdmin
    .from(LOCK_TABLE)
    .select("invoice_id, invoice_number, status, credit_note_id, updated_at")
    .eq("invoice_id", invoiceId)
    .maybeSingle();

  if (lockError) return jsonError("Impossible de consulter le verrou Supabase.", 502);
  if (!lock) return jsonError("Aucun verrou trouvé pour cette facture.", 404);

  const record = lock as LockRow & { updated_at: string };
  if (record.status !== "uncertain" || record.credit_note_id) {
    return jsonError("Seul un verrou incertain sans identifiant d'avoir peut être résolu.", 409);
  }
  const updatedMs = new Date(record.updated_at).getTime();
  if (!Number.isFinite(updatedMs) || Date.now() - updatedMs < 10 * 60_000) {
    return jsonError("Résolution prématurée : attendre au moins dix minutes après l'incident.", 409);
  }

  try {
    const invoice = await getZohoInvoice(invoiceId);
    if (invoice.invoice_number !== record.invoice_number) {
      return jsonError("Le numéro de facture ne correspond pas au verrou.", 409);
    }

    // Échec de lecture = aucune résolution. La liste et chaque détail doivent répondre.
    const notes = await getAllZohoCreditNotes();
    const customerNotes = notes.filter((note) => note.customer_id === invoice.customer_id);
    const details = await Promise.all(customerNotes.map((note) => getZohoCreditNote(note.creditnote_id)));
    const matches = details.filter((note) => linkedToInvoice(note, invoice));
    if (matches.length) {
      return NextResponse.json({
        success: false,
        message: "Un avoir associé a été trouvé dans Zoho. Résolution refusée ; contrôle manuel obligatoire.",
        creditNoteIds: matches.map((note) => note.creditnote_id),
      }, { status: 409 });
    }

    // Seul ce changement est effectué, avec journal dans la même transaction SQL.
    const { data: resolved, error: rpcError } = await supabaseAdmin.rpc(
      "resolve_zoho_credit_note_refusal",
      {
        p_invoice_id: invoiceId,
        p_invoice_number: invoice.invoice_number,
        p_reason: "Vérification manuelle confirmée, puis recherche exhaustive des avoirs du client dans Zoho : aucune correspondance. Refus API observé précédemment.",
      }
    );
    if (rpcError) throw new Error(rpcError.message);
    if (resolved !== true) {
      return jsonError("Le verrou a changé pendant la vérification. Aucune résolution effectuée.", 409);
    }
    return NextResponse.json({
      success: true,
      invoiceId,
      status: "rejected",
      message: "Refus enregistré et historisé. Le verrou est conservé : aucune nouvelle création n'est autorisée automatiquement.",
      creditNoteCreated: false,
    });
  } catch (error) {
    console.error("Réconciliation de verrou Zoho impossible", {
      invoiceId,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    });
    return jsonError("Vérification Zoho ou Supabase incomplète. Verrou inchangé.", 502);
  }
}
