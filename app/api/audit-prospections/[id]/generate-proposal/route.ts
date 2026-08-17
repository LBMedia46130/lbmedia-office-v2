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
À partir de la capture fournie, crée une proposition visuelle d'amélioration de cette page web.

Il s'agit d'une piste de réflexion réalisée par LBMedia pour permettre au prospect de visualiser une évolution possible de son site.

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
PRINCIPE FONDAMENTAL
==================================================

La capture originale est la référence visuelle principale.

Il ne s'agit PAS de créer un nouveau site à partir de zéro.

Il faut proposer une évolution réaliste de la page existante.

Le résultat doit rester immédiatement reconnaissable comme le site de cette entreprise.

==================================================
À CONSERVER
==================================================

Conserve autant que possible :

- le nom de l'entreprise ;
- le logo visible ;
- les couleurs principales ;
- les photographies existantes ;
- l'identité graphique ;
- l'univers de marque ;
- la nature réelle de l'activité ;
- les éléments de contenu importants déjà visibles.

==================================================
À AMÉLIORER
==================================================

Utilise les conclusions de l'audit pour améliorer notamment, lorsque cela est pertinent :

- la hiérarchie visuelle ;
- la compréhension immédiate de l'activité ;
- la présentation des contenus ;
- la visibilité des prestations ;
- la mise en valeur de l'expérience ;
- les éléments de confiance ;
- les appels à l'action ;
- la lisibilité ;
- l'espacement ;
- la structure des sections ;
- la modernité générale de la présentation.

==================================================
INTERDICTIONS
==================================================

N'invente jamais :

- un nouveau logo ;
- une nouvelle marque ;
- un nouveau service ;
- une nouvelle activité ;
- de faux clients ;
- de faux témoignages ;
- de fausses références ;
- de faux chiffres ;
- de faux prix ;
- de faux résultats ;
- de faux partenaires.

Ne remplace pas les photographies existantes par des images génériques si leur conservation est possible.

Ne transforme pas arbitrairement le site en maquette de startup blanche et bleue.

Ne fais pas disparaître l'identité originale simplement pour rendre le design plus moderne.

==================================================
TEXTE
==================================================

Conserve les vrais textes visibles lorsqu'ils sont suffisamment lisibles.

Tu peux :

- mieux les hiérarchiser ;
- les déplacer ;
- raccourcir visuellement certains blocs ;
- améliorer leur présentation.

Si une information n'est pas clairement lisible dans la capture, n'invente pas son contenu.

==================================================
STYLE
==================================================

La nouvelle version doit être :

- professionnelle ;
- contemporaine ;
- claire ;
- élégante ;
- crédible ;
- structurée ;
- réaliste ;
- adaptée à une vraie entreprise française.

L'objectif est une amélioration, pas une révolution graphique.

==================================================
FORMAT
==================================================

Produis une seule proposition visuelle de page web.

Aucun logo LBMedia.
Aucune mention LBMedia.
Aucun texte "avant".
Aucun texte "après".
Aucun cadre de présentation.
Aucune explication extérieure à la page.

Uniquement la proposition de page web améliorée.
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