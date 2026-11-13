import { supabaseAdmin } from "@/lib/supabase-admin";

export const GAMMA_PDF_BUCKET = "gamma-presentations";
export const GAMMA_PDF_MAX_BYTES = 15 * 1024 * 1024;

export function gammaPdfPath(estimateId: string, generationId: string) {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(estimateId) ||
      !/^[a-zA-Z0-9_-]{1,128}$/.test(generationId)) {
    throw new Error("Identifiant de devis ou de génération invalide.");
  }
  return `${estimateId}/${generationId}.pdf`;
}

export function assertGammaPdf(bytes: Uint8Array) {
  if (bytes.length < 5 || bytes.length > GAMMA_PDF_MAX_BYTES ||
      bytes[0] !== 0x25 || bytes[1] !== 0x50 ||
      bytes[2] !== 0x44 || bytes[3] !== 0x46 || bytes[4] !== 0x2d) {
    throw new Error("Fichier PDF invalide ou supérieur à 15 Mo.");
  }
}

export async function loadCorrectedGammaPdf(estimateId: string, generationId: string) {
  const path = gammaPdfPath(estimateId, generationId);
  const { data, error } = await supabaseAdmin.storage
    .from(GAMMA_PDF_BUCKET).download(path);
  if (error) {
    const status = String((error as { statusCode?: string }).statusCode ?? "");
    if (status === "404" || /not found|does not exist/i.test(error.message)) return null;
    throw new Error(`Lecture du PDF corrigé impossible : ${error.message}`);
  }
  const bytes = new Uint8Array(await data.arrayBuffer());
  assertGammaPdf(bytes);
  return bytes;
}

export async function getEstimateGammaId(estimateId: string) {
  const { data, error } = await supabaseAdmin.from("estimate_campaign_contexts")
    .select("gamma_generation_id").eq("zoho_estimate_id", estimateId).maybeSingle();
  if (error) throw new Error(`Lecture de la présentation impossible : ${error.message}`);
  return (data?.gamma_generation_id as string | null | undefined)?.trim() || null;
}
