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

export const maxDuration = 60;

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
          cache: "no-store",
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
À partir de la capture fournie, crée une PROPOSITION VISUELLE D'AMÉLIORATION de cette page web.

Il s'agit d'une piste de réflexion réalisée par LBMedia pour montrer au prospect ce que certaines améliorations pourraient donner visuellement.

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
OBJECTIF
==================================================

Améliore visuellement la page existante EN CONSERVANT SON IDENTITÉ.

La proposition doit donner l'impression d'une évolution professionnelle et crédible du site actuel, pas d'un nouveau site inventé pour une autre entreprise.

Utilise l'audit pour décider des améliorations pertinentes.

Il peut s'agir par exemple de :

- mieux hiérarchiser le contenu ;
- rendre la proposition de valeur plus immédiatement compréhensible ;
- rendre les services ou prestations plus visibles ;
- mieux mettre en valeur l'expérience, les références ou les éléments de confiance lorsqu'ils existent réellement ;
- améliorer les appels à l'action ;
- rendre la page plus claire, moderne et structurée ;
- améliorer la lisibilité ;
- mieux organiser les différentes sections.

==================================================
FIDÉLITÉ AU SITE EXISTANT
==================================================

La capture originale est la référence principale.

CONSERVER autant que possible :

- le nom de l'entreprise ;
- son identité graphique ;
- son univers de marque ;
- ses couleurs caractéristiques ;
- ses photographies et visuels existants lorsqu'ils sont visibles ;
- son logo lorsqu'il apparaît dans la capture ;
- la nature réelle de son activité ;
- les éléments importants déjà présents.

NE PAS inventer :

- un nouveau logo ;
- une nouvelle entreprise ;
- de nouveaux services ;
- de fausses références ;
- de faux clients ;
- de faux témoignages ;
- de fausses statistiques ;
- de faux prix ;
- de nouvelles activités non établies ;
- de nouveaux visuels sans rapport avec l'entreprise.

==================================================
DIRECTION GRAPHIQUE
==================================================

La proposition doit être :

- professionnelle ;
- contemporaine ;
- crédible ;
- élégante ;
- claire ;
- adaptée à une vraie PME ou entreprise française ;
- plus structurée que la version actuelle sans devenir une maquette générique de startup.

Évite les effets excessifs, le style futuriste et les interfaces SaaS génériques.

Ne transforme pas automatiquement la page en site minimaliste blanc et bleu.

Respecte au maximum la personnalité visuelle déjà présente dans la capture.

==================================================
TEXTE
==================================================

Conserve prioritairement les vrais textes visibles dans la capture lorsqu'ils sont lisibles.

Tu peux raccourcir ou réorganiser un texte pour améliorer la hiérarchie visuelle.

N'invente jamais une information commerciale.

Si un texte précis n'est pas suffisamment lisible dans la capture, préfère une zone graphique crédible plutôt qu'une affirmation inventée.

==================================================
RÉSULTAT ATTENDU
==================================================

Produis une seule image montrant la page d'accueil améliorée.

Elle doit pouvoir être présentée à côté de la capture originale sous la mention :

"Une piste possible"

Ce n'est PAS une maquette définitive.

C'est une projection visuelle suffisamment réaliste pour permettre au prospect de comprendre immédiatement la direction proposée par LBMedia.

Aucun logo LBMedia.
Aucune mention LBMedia.
Aucun avant/après dans l'image.
Aucun cadre de présentation.
Uniquement la proposition de page web elle-même.
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
      "image",
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
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${process.env.OPENAI_API_KEY}`,
          },

          body:
            formData,
        }
      );

    const result =
      await imageResponse.json() as
        OpenAIImageEditResponse;

    if (
      !imageResponse.ok
    ) {
      throw new Error(
        result.error?.message ??
          "OpenAI n'a pas pu générer la proposition."
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