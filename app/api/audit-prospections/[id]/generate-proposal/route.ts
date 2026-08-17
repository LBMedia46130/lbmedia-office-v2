import {
  NextResponse,
} from "next/server";

import {
  getWebsiteAuditById,
} from "@/lib/website-audits";

import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

import {
  updateAuditProspection,
} from "@/lib/audit-prospections";

export const dynamic =
  "force-dynamic";

export const maxDuration = 180;

const OPENAI_IMAGE_EDIT_URL =
  "https://api.openai.com/v1/images/edits";

const BUCKET =
  "audit-prospection-assets";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type OpenAIImageEditResponse = {
  data?: Array<{
    b64_json?: string;
  }>;

  error?: {
    message?: string;
    type?: string;
    code?: string | null;
  };
};

export async function POST(
  _request: Request,
  context: RouteContext
) {
  if (
    !process.env.OPENAI_API_KEY
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "La clé API OpenAI n'est pas configurée.",
      },
      {
        status: 500,
      }
    );
  }

  try {
    const { id } =
      await context.params;

    const {
      data: prospection,
      error: prospectionError,
    } = await supabaseAdmin
      .from(
        "audit_prospections"
      )
      .select(
        `
          id,
          company_id,
          website_audit_id,
          before_image_url,
          after_image_url
        `
      )
      .eq(
        "id",
        id
      )
      .maybeSingle();

    if (prospectionError) {
      throw new Error(
        prospectionError.message
      );
    }

    if (!prospection) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Prospection introuvable.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      !prospection.before_image_url
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Importez d'abord la capture du site actuel.",
        },
        {
          status: 400,
        }
      );
    }

    const audit =
      await getWebsiteAuditById(
        prospection.website_audit_id
      );

    if (!audit) {
      return NextResponse.json(
        {
          success: false,
          message:
            "L'audit associé est introuvable.",
        },
        {
          status: 404,
        }
      );
    }

    const {
      data: company,
      error: companyError,
    } = await supabaseAdmin
      .from("companies")
      .select(
        `
          id,
          name,
          legal_name,
          website,
          city,
          sector,
          business_description
        `
      )
      .eq(
        "id",
        prospection.company_id
      )
      .maybeSingle();

    if (companyError) {
      throw new Error(
        companyError.message
      );
    }

    if (!company) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Entreprise introuvable.",
        },
        {
          status: 404,
        }
      );
    }

    const beforeResponse =
      await fetch(
        prospection.before_image_url,
        {
          cache:
            "no-store",
        }
      );

    if (!beforeResponse.ok) {
      throw new Error(
        "Impossible de récupérer la capture du site actuel."
      );
    }

    const beforeBytes =
      await beforeResponse.arrayBuffer();

    const beforeContentType =
      beforeResponse.headers.get(
        "content-type"
      ) ??
      "image/png";

    const prompt = `
À partir de la capture du site fournie, crée une PROJECTION VISUELLE D'AMÉLIORATION de sa page d'accueil.

Cette image sera présentée commercialement par LBMedia à l'entreprise comme une piste possible d'évolution.

IMPORTANT :
il ne s'agit PAS de reproduire toute la page visible dans la capture.

Il faut créer une projection lisible et convaincante du HAUT DE LA PAGE D'ACCUEIL :
- header / navigation ;
- zone d'accroche principale ;
- premiers contenus ou services importants ;
- premiers éléments de réassurance ou de conversion pertinents.

La projection doit ressembler à une véritable capture d'écran desktop d'un site web professionnel.

==================================================
ENTREPRISE
==================================================

Nom :
${company.name}

Raison sociale :
${company.legal_name ?? "Non renseignée"}

Site :
${company.website ?? audit.website_url}

Ville :
${company.city ?? "Non renseignée"}

Secteur :
${company.sector ?? "Non renseigné"}

Description :
${company.business_description ?? "Non renseignée"}

==================================================
CONSTATS ISSUS DE L'AUDIT
==================================================

Synthèse :
${audit.summary}

Points forts :
${
  audit.strengths.length
    ? audit.strengths
        .map(
          (item) =>
            `- ${item}`
        )
        .join("\n")
    : "- Aucun renseigné"
}

Points perfectibles :
${
  audit.weaknesses.length
    ? audit.weaknesses
        .map(
          (item) =>
            `- ${item}`
        )
        .join("\n")
    : "- Aucun renseigné"
}

Priorités :
${
  audit.priorities.length
    ? audit.priorities
        .map(
          (item) =>
            `- ${item}`
        )
        .join("\n")
    : "- Aucune renseignée"
}

==================================================
OBJECTIF DE LA PROJECTION
==================================================

Ne te contente PAS de déplacer légèrement les blocs existants.

Propose une évolution visuelle réellement perceptible et commercialement intéressante.

Le prospect doit pouvoir regarder l'image et comprendre immédiatement :

"Mon site pourrait être plus clair, plus actuel et mieux mettre en valeur mon activité."

Travaille particulièrement :

- la hiérarchie des informations ;
- l'impact du premier écran ;
- les respirations ;
- la taille et le rôle des différents blocs ;
- la lisibilité ;
- la mise en valeur des contenus importants ;
- les appels à l'action lorsqu'ils sont pertinents ;
- les éléments de confiance réellement disponibles ;
- la compréhension immédiate de l'activité ;
- la qualité perçue de l'entreprise.

Le résultat doit être sensiblement plus moderne et mieux structuré que l'original.

Il doit montrer une vraie direction créative.

==================================================
FIDÉLITÉ À L'ENTREPRISE
==================================================

La capture fournie reste la référence de marque.

Le résultat doit être immédiatement reconnaissable comme une évolution du site de CETTE entreprise.

Conserve autant que possible :

- le vrai logo visible dans la capture ;
- le nom de l'entreprise ;
- ses couleurs caractéristiques ;
- son univers graphique ;
- les photographies pertinentes déjà présentes ;
- les éléments éditoriaux réellement visibles ;
- la nature exacte de son activité.

Tu peux faire évoluer :

- la disposition ;
- les proportions ;
- les espacements ;
- les fonds ;
- la hiérarchie ;
- la typographie ;
- les cartes et encadrés ;
- la présentation de la navigation ;
- la mise en scène des visuels ;
- la structure du premier écran.

Tu as donc une vraie liberté de DESIGN tout en restant fidèle à l'IDENTITÉ.

==================================================
CONTENU
==================================================

Utilise uniquement des informations établies par :

1. la capture du site ;
2. les informations sur l'entreprise fournies ci-dessus ;
3. les constats de l'audit.

N'invente aucune nouvelle activité ou promesse commerciale.

Lorsque les vrais textes sont lisibles, conserve-les ou utilise-les comme base.

Tu peux raccourcir une formulation pour rendre la projection visuellement crédible, à condition de ne pas changer son sens.

Si un texte précis n'est pas lisible, utilise un traitement graphique sobre plutôt que d'inventer une affirmation.

==================================================
INTERDICTIONS ABSOLUES
==================================================

N'invente jamais :

- un nouveau logo ;
- une nouvelle marque ;
- une nouvelle activité ;
- de nouveaux services non établis ;
- de faux clients ;
- de faux témoignages ;
- de faux avis ;
- de faux partenaires ;
- de fausses références ;
- de faux chiffres ;
- de faux prix ;
- de faux résultats ;
- de fausses récompenses.

Ne remplace pas sans raison les photographies caractéristiques du site par des images génériques.

Ne transforme pas automatiquement le site en startup technologique.

Ne lui applique pas arbitrairement une palette bleue.

Ne crée pas une maquette générique qui pourrait appartenir à n'importe quelle entreprise.

==================================================
DIRECTION GRAPHIQUE
==================================================

La projection doit être :

- professionnelle ;
- contemporaine ;
- élégante ;
- crédible ;
- plus aérée ;
- visuellement plus forte ;
- réaliste ;
- adaptée à une vraie entreprise française.

Le design peut être nettement meilleur que l'original.

La fidélité à l'entreprise ne signifie PAS fidélité à la mise en page actuelle.

L'objectif est une évolution visible, pas une simple copie nettoyée.

==================================================
CADRAGE
==================================================

IMPORTANT :

Ne cherche PAS à faire entrer toute la page d'accueil dans l'image.

Concentre la projection sur environ les 1 à 2 premiers écrans desktop du site.

Les éléments doivent être suffisamment grands pour être lisibles dans une présentation commerciale.

La projection doit occuper tout le visuel.

Pas de navigateur autour.
Pas d'ordinateur.
Pas de téléphone.
Pas de mockup posé dans un décor.

L'image doit ressembler directement à une capture d'écran du site amélioré.

==================================================
RÉSULTAT
==================================================

Produis UNE seule image horizontale représentant cette projection.

Aucun logo LBMedia.
Aucune mention LBMedia.
Aucun texte "avant".
Aucun texte "après".
Aucun commentaire.
Aucune annotation.
Aucun cadre de présentation.

Uniquement la projection du site amélioré.
`.trim();

    const formData =
      new FormData();

    formData.append(
      "model",
      "gpt-image-2"
    );

    formData.append(
      "prompt",
      prompt
    );

    formData.append(
      "size",
      "1536x1024"
    );

    formData.append(
      "quality",
      "medium"
    );

    formData.append(
      "image[]",
      new Blob(
        [
          beforeBytes,
        ],
        {
          type:
            beforeContentType,
        }
      ),
      getInputFileName(
        beforeContentType
      )
    );

    const imageResponse =
      await fetch(
        OPENAI_IMAGE_EDIT_URL,
        {
          method:
            "POST",

          headers: {
            Authorization:
              `Bearer ${process.env.OPENAI_API_KEY}`,
          },

          body:
            formData,
        }
      );

    const rawResponse =
      await imageResponse.text();

    let result:
      OpenAIImageEditResponse;

    try {
      result =
        JSON.parse(
          rawResponse
        ) as OpenAIImageEditResponse;
    } catch {
      throw new Error(
        `OpenAI a retourné une réponse inattendue (HTTP ${imageResponse.status}).`
      );
    }

    if (
      !imageResponse.ok
    ) {
      throw new Error(
        result.error?.message ??
          `OpenAI a refusé la génération (HTTP ${imageResponse.status}).`
      );
    }

    const imageBase64 =
      result.data?.[0]
        ?.b64_json;

    if (!imageBase64) {
      throw new Error(
        "OpenAI n'a retourné aucune proposition visuelle exploitable."
      );
    }

    const imageBuffer =
      Buffer.from(
        imageBase64,
        "base64"
      );

    const fileName =
      `${company.id}/${id}/proposal-${Date.now()}.png`;

    const {
      error: uploadError,
    } = await supabaseAdmin
      .storage
      .from(BUCKET)
      .upload(
        fileName,
        imageBuffer,
        {
          contentType:
            "image/png",

          cacheControl:
            "3600",

          upsert:
            false,
        }
      );

    if (uploadError) {
      throw new Error(
        `Impossible d'enregistrer la proposition : ${uploadError.message}`
      );
    }

    const {
      data: publicUrlData,
    } = supabaseAdmin
      .storage
      .from(BUCKET)
      .getPublicUrl(
        fileName
      );

    const imageUrl =
      publicUrlData.publicUrl;

    if (!imageUrl) {
      throw new Error(
        "Impossible de récupérer l'URL de la proposition."
      );
    }

    const updated =
      await updateAuditProspection(
        id,
        {
          afterImageUrl:
            imageUrl,

          attachmentUrl:
            null,
        }
      );

    return NextResponse.json({
      success: true,

      message:
        "Proposition visuelle générée.",

      image_url:
        imageUrl,

      prospection:
        updated,
    });
  } catch (error) {
    console.error(
      "Audit prospection proposal generation error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Pénélope n'a pas pu générer la proposition visuelle.",
      },
      {
        status: 500,
      }
    );
  }
}

function getInputFileName(
  mimeType: string
) {
  if (
    mimeType.includes(
      "jpeg"
    ) ||
    mimeType.includes(
      "jpg"
    )
  ) {
    return "site-actuel.jpg";
  }

  if (
    mimeType.includes(
      "webp"
    )
  ) {
    return "site-actuel.webp";
  }

  return "site-actuel.png";
}