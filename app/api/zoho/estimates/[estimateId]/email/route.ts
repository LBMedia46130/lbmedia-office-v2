import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getZohoEstimateEmailContent,
  sendZohoEstimateEmail,
} from "@/lib/zoho-books";
import { getGammaGeneration } from "@/lib/gamma";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { loadCorrectedGammaPdf } from "@/lib/gamma-pdf";

export const runtime = "nodejs";

const MAX_PDF_BYTES = 15 * 1024 * 1024;

type GammaAttachmentState = {
  gamma_generation_id: string | null;
  gamma_url: string | null;
};

async function loadGammaPdfForEstimate(estimateId: string) {
  const { data, error } = await supabaseAdmin
    .from("estimate_campaign_contexts")
    .select("gamma_generation_id, gamma_url")
    .eq("zoho_estimate_id", estimateId)
    .maybeSingle();

  if (error) {
    throw new Error(`Impossible de vérifier la présentation Gamma : ${error.message}`);
  }
  if (!data) return null; // Ce devis ne possède aucune présentation.

  const state = data as GammaAttachmentState;
  const generationId = state.gamma_generation_id?.trim();
  if (!generationId) {
    if (state.gamma_url?.trim()) {
      throw new Error(
        "Une présentation Gamma existe, mais son identifiant de génération manque. Envoi bloqué pour éviter un devis incomplet."
      );
    }
    return null;
  }

  // Le document corrigé et validé remplace l'export initial de Gamma.
  // Le chemin inclut la génération : une nouvelle présentation n'utilise
  // jamais le PDF corrigé d'une génération précédente.
  const corrected = await loadCorrectedGammaPdf(estimateId, generationId);
  if (corrected) {
    return {
      bytes: corrected,
      filename: `Presentation-LBMedia-${estimateId}.pdf`,
    };
  }

  const generation = await getGammaGeneration(generationId);
  if (generation.status !== "completed" || !generation.exportUrl) {
    throw new Error(
      "La présentation Gamma n'est pas encore exportée en PDF. Envoi annulé : le client ne recevra pas un devis incomplet."
    );
  }

  const exportUrl = new URL(generation.exportUrl);
  if (exportUrl.protocol !== "https:") {
    throw new Error("L'URL du PDF Gamma n'est pas sécurisée.");
  }

  const response = await fetch(exportUrl, {
    cache: "no-store",
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) {
    throw new Error(`Téléchargement du PDF Gamma impossible (HTTP ${response.status}). Envoi annulé.`);
  }

  const declaredSize = Number(response.headers.get("content-length") || "0");
  if (declaredSize > MAX_PDF_BYTES) {
    throw new Error("Le PDF Gamma dépasse 15 Mo. Envoi annulé.");
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > MAX_PDF_BYTES) {
    throw new Error("Le PDF Gamma dépasse 15 Mo. Envoi annulé.");
  }
  const bytes = new Uint8Array(buffer);
  if (
    bytes.length < 5 ||
    bytes[0] !== 0x25 || bytes[1] !== 0x50 ||
    bytes[2] !== 0x44 || bytes[3] !== 0x46 || bytes[4] !== 0x2d
  ) {
    throw new Error("Gamma n'a pas retourné un véritable fichier PDF. Envoi annulé.");
  }

  return {
    bytes,
    filename: `Presentation-LBMedia-${estimateId}.pdf`,
  };
}


type RouteContext = {
  params: Promise<{
    estimateId: string;
  }>;
};

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { estimateId } =
      await context.params;

    const email =
      await getZohoEstimateEmailContent(
        estimateId
      );

    return NextResponse.json({
      ok: true,
      email,
    });
  } catch (error) {
    console.error(
      "Erreur récupération email devis Zoho:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Impossible de récupérer l'email du devis.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { estimateId } =
      await context.params;

    const body =
      (await request.json()) as {
        to_mail_ids?: string[];
        cc_mail_ids?: string[];
        bcc_mail_ids?: string[];
        subject?: string;
        body?: string;
      };

    // Tout préparer et vérifier AVANT d'autoriser l'envoi Zoho.
    const gammaPdf = await loadGammaPdfForEstimate(estimateId);

    await sendZohoEstimateEmail(
      estimateId,
      {
        to_mail_ids:
          body.to_mail_ids ?? [],
        cc_mail_ids:
          body.cc_mail_ids ?? [],
        bcc_mail_ids:
          body.bcc_mail_ids ?? [],
        subject:
          body.subject ?? "",
        body:
          body.body ?? "",
        gammaPdf: gammaPdf ?? undefined,
      }
    );

    return NextResponse.json({
      ok: true,
      gammaAttached: Boolean(gammaPdf),
    });
  } catch (error) {
    console.error(
      "Erreur envoi email devis Zoho:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Impossible d'envoyer l'email du devis.",
      },
      {
        status: 500,
      }
    );
  }
}
