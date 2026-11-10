import { NextRequest, NextResponse } from "next/server";
import { openZohoCreditNoteForInvoice } from "@/lib/zoho-books";

export const dynamic = "force-dynamic";

const CONFIRMATION = "OUVRIR_AVOIR_ZOHO";

// Route accessible uniquement aux utilisateurs authentifiés par le proxy Office.
// Ne jamais ajouter cette route aux exemptions CRON_SECRET du proxy.
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "JSON invalide." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ success: false, message: "Données manquantes." }, { status: 400 });
  }
  const data = body as Record<string, unknown>;
  const creditNoteId = typeof data.creditNoteId === "string" ? data.creditNoteId.trim() : "";
  const invoiceId = typeof data.invoiceId === "string" ? data.invoiceId.trim() : "";
  if (!/^\d+$/.test(creditNoteId) || !/^\d+$/.test(invoiceId)) {
    return NextResponse.json({ success: false, message: "Identifiants invalides." }, { status: 400 });
  }
  if (data.confirmation !== CONFIRMATION) {
    return NextResponse.json({ success: false, message: "Confirmation explicite requise." }, { status: 400 });
  }

  try {
    const creditNote = await openZohoCreditNoteForInvoice(creditNoteId, invoiceId);
    return NextResponse.json({
      success: true,
      message: "Avoir ouvert dans Zoho Books, sans imputation ni remboursement.",
      creditNoteId: creditNote.creditnote_id,
      status: creditNote.status,
      total: creditNote.total ?? null,
    });
  } catch (error) {
    console.error("Ouverture d'avoir Zoho :", error);
    return NextResponse.json({
      success: false,
      message: "Ouverture non confirmée. Vérifier le statut dans Zoho Books avant toute nouvelle tentative.",
    }, { status: 409 });
  }
}
