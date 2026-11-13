import { NextRequest, NextResponse } from "next/server";
import { getGammaGeneration } from "@/lib/gamma";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  assertGammaPdf, GAMMA_PDF_BUCKET, GAMMA_PDF_MAX_BYTES,
  gammaPdfPath, getEstimateGammaId, loadCorrectedGammaPdf,
} from "@/lib/gamma-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ estimateId: string }> };

async function current(estimateId: string) {
  const generationId = await getEstimateGammaId(estimateId);
  if (!generationId) throw new Error("Aucune présentation Gamma associée à ce devis.");
  return generationId;
}

export async function GET(request: NextRequest, context: Context) {
  try {
    const { estimateId } = await context.params;
    const generationId = await current(estimateId);
    const corrected = await loadCorrectedGammaPdf(estimateId, generationId);
    if (request.nextUrl.searchParams.get("download") !== "1") {
      return NextResponse.json({ corrected: Boolean(corrected), generationId });
    }

    let bytes = corrected;
    if (!bytes) {
      const generation = await getGammaGeneration(generationId);
      if (generation.status !== "completed" || !generation.exportUrl) {
        throw new Error("Le PDF Gamma original n'est pas disponible.");
      }
      const url = new URL(generation.exportUrl);
      if (url.protocol !== "https:") throw new Error("Adresse Gamma non sécurisée.");
      const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(25000) });
      if (!response.ok) throw new Error(`Téléchargement Gamma impossible (${response.status}).`);
      if (Number(response.headers.get("content-length") || "0") > GAMMA_PDF_MAX_BYTES)
        throw new Error("Le PDF dépasse 15 Mo.");
      bytes = new Uint8Array(await response.arrayBuffer());
      assertGammaPdf(bytes);
    }
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Presentation-LBMedia-${estimateId}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "PDF indisponible." }, { status: 400 });
  }
}

export async function PUT(request: NextRequest, context: Context) {
  try {
    const { estimateId } = await context.params;
    const generationId = await current(estimateId);
    // Refuser tout import pendant une génération inachevée.
    const generation = await getGammaGeneration(generationId);
    if (generation.status !== "completed") throw new Error("Attendez la fin de la génération Gamma.");
    const declaredLength = Number(request.headers.get("content-length") || "0");
    if (declaredLength > GAMMA_PDF_MAX_BYTES + 100_000)
      return NextResponse.json({ error: "Fichier trop volumineux." }, { status: 413 });
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.type !== "application/pdf")
      throw new Error("Sélectionnez un fichier PDF.");
    if (file.size > GAMMA_PDF_MAX_BYTES) throw new Error("Le PDF dépasse 15 Mo.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    assertGammaPdf(bytes);
    // Recontrôler la génération courante avant la modification persistante.
    if (await current(estimateId) !== generationId)
      throw new Error("Une nouvelle présentation a été générée. Rechargez la page.");
    const { error } = await supabaseAdmin.storage.from(GAMMA_PDF_BUCKET)
      .upload(gammaPdfPath(estimateId, generationId), Buffer.from(bytes), {
        contentType: "application/pdf", cacheControl: "0", upsert: true,
      });
    if (error) throw new Error(`Enregistrement impossible : ${error.message}`);
    return NextResponse.json({ ok: true, generationId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Import impossible." }, { status: 400 });
  }
}
