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

Cette image sera présentée commercialement par LBMedia à l'entreprise comme une piste possible d'évolution de son site.

Il s'agit d'un exercice de WEB DESIGN et de restructuration de page.

Il ne s'agit PAS de réinventer l'entreprise, ses locaux, ses produits, ses réalisations ou son environnement réel.

==================================================
RÈGLE ABSOLUE : PRÉSERVER LA RÉALITÉ
==================================================

CETTE RÈGLE EST PRIORITAIRE SUR TOUTES LES AUTRES CONSIGNES.

Toutes les photographies réelles visibles dans la capture constituent des ÉLÉMENTS FACTUELS.

Elles doivent être considérées comme des contenus existants à réutiliser, et NON comme des références permettant de générer de nouvelles images similaires.

Lorsqu'une photographie existante est réutilisée dans la proposition :

- conserve exactement le même lieu ;
- conserve exactement le même bâtiment ;
- conserve exactement la même architecture ;
- conserve exactement les mêmes aménagements ;
- conserve exactement la même piscine, chambre, restaurant, produit, personne, réalisation ou environnement visible ;
- conserve autant que possible le cadrage et le contenu photographique original.

Tu peux :

- recadrer légèrement une photographie existante pour l'intégrer dans une nouvelle mise en page ;
- changer ses dimensions d'affichage ;
- l'utiliser comme image de fond ;
- appliquer un léger voile graphique permettant de rendre du texte lisible ;
- repositionner cette photographie dans la page.

Tu ne dois PAS :

- redessiner la photographie ;
- reconstruire le bâtiment ;
- modifier l'architecture ;
- changer le paysage ;
- inventer une autre piscine ;
- inventer une autre chambre ;
- inventer un autre restaurant ;
- inventer un autre produit ;
- inventer un autre établissement ;
- ajouter des équipements inexistants ;
- embellir artificiellement les lieux ;
- créer une photographie "inspirée" de l'original ;
- remplacer un visuel réel par une image générée qui lui ressemble seulement.

EXEMPLE IMPORTANT :

Si la capture montre la photographie réelle d'un hôtel, la proposition doit montrer CET HÔTEL et cette photographie réelle.

Elle ne doit jamais montrer une interprétation générée de l'hôtel, même si cette interprétation paraît plus belle ou plus moderne.

L'amélioration proposée concerne LE SITE INTERNET.

Elle ne concerne PAS la réalité physique de l'entreprise.

Si tu ne peux pas préserver fidèlement une photographie, préfère ne pas l'utiliser plutôt que d'en inventer une nouvelle version.

==================================================
OBJECTIF
==================================================

Créer une nouvelle présentation du HAUT DE LA PAGE D'ACCUEIL à partir des contenus réels disponibles.

La proposition doit montrer comment le même site pourrait être :

- plus clair ;
- mieux structuré ;
- plus actuel ;
- plus convaincant ;
- plus facile à comprendre ;
- plus efficace commercialement.

L'amélioration doit provenir principalement de :

- la structure de la page ;
- la hiérarchie de l'information ;
- la typographie ;
- les espacements ;
- les proportions ;
- les appels à l'action ;
- la navigation ;
- les blocs de contenu ;
- la mise en valeur des informations ;
- la mise en valeur des photographies existantes ;
- les éléments de réassurance réellement disponibles.

Ne cherche PAS à rendre l'entreprise elle-même plus belle.

Cherche à rendre SON SITE plus efficace pour présenter l'entreprise telle qu'elle est réellement.

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
PRINCIPE DE CONCEPTION
==================================================

La proposition doit matérialiser les recommandations pertinentes de l'audit.

Chaque changement visible doit avoir une raison liée à au moins un de ces objectifs :

- mieux faire comprendre l'activité ;
- mieux présenter l'offre ;
- mieux hiérarchiser les informations ;
- mieux mettre en valeur les contenus existants ;
- mieux guider le visiteur ;
- mieux rassurer ;
- mieux favoriser le contact, la demande ou la réservation lorsqu'ils sont pertinents.

Ne modifie pas un élément uniquement pour donner l'impression que la proposition est différente.

Ne cherche pas la différence pour la différence.

Le résultat doit pouvoir être réellement reproduit ensuite dans un site WordPress / Elementor à partir des contenus existants de l'entreprise.

Évite donc les effets graphiques impossibles, artificiels ou purement conceptuels.

==================================================
FIDÉLITÉ À L'IDENTITÉ
==================================================

La capture fournie est la référence de marque ET la référence factuelle.

Le résultat doit être immédiatement reconnaissable comme une évolution du site de CETTE entreprise.

Conserve :

- le vrai logo visible dans la capture ;
- le vrai nom de l'entreprise ;
- les couleurs caractéristiques pertinentes ;
- l'univers graphique pertinent ;
- les photographies réelles utilisées dans la proposition ;
- la nature exacte de l'activité ;
- les informations commerciales établies.

Tu peux faire évoluer :

- la disposition ;
- les proportions ;
- les espacements ;
- les fonds graphiques ;
- la hiérarchie ;
- la typographie ;
- les cartes ;
- les encadrés ;
- la navigation ;
- les boutons ;
- la présentation des contenus ;
- la manière dont les photographies existantes sont mises en valeur.

LIBERTÉ DE DESIGN : OUI.

LIBERTÉ D'INVENTER LA RÉALITÉ DE L'ENTREPRISE : NON.

==================================================
CONTENU
==================================================

Utilise uniquement des informations établies par :

1. la capture du site ;
2. les informations sur l'entreprise fournies ci-dessus ;
3. les constats de l'audit.

N'invente aucune nouvelle activité ou promesse commerciale.

Lorsque les vrais textes sont lisibles, conserve-les ou utilise-les comme base.

Tu peux raccourcir une formulation pour améliorer la hiérarchie visuelle, à condition de ne jamais changer son sens.

Si un texte précis n'est pas lisible, utilise un traitement graphique sobre plutôt que d'inventer une affirmation.

==================================================
ÉLÉMENTS DE CONFIANCE
==================================================

N'utilise que les éléments de confiance réellement visibles ou établis dans les informations fournies.

N'invente jamais :

- de faux avis ;
- de fausses notes ;
- de faux témoignages ;
- de faux labels ;
- de faux partenaires ;
- de fausses récompenses ;
- de faux chiffres ;
- de faux résultats ;
- de faux clients ;
- de fausses références ;
- de faux prix.

Si un élément de réassurance n'est pas établi, ne l'affiche pas.

==================================================
INTERDICTIONS ABSOLUES
==================================================

N'invente jamais :

- un nouveau logo ;
- une nouvelle marque ;
- une nouvelle activité ;
- de nouveaux services non établis ;
- un nouveau bâtiment ;
- un nouvel établissement ;
- de nouveaux locaux ;
- un nouveau produit ;
- une nouvelle réalisation ;
- une nouvelle photographie présentée comme réelle.

Ne transforme pas automatiquement le site en startup technologique.

Ne lui applique pas arbitrairement une palette bleue.

Ne crée pas une maquette générique qui pourrait appartenir à n'importe quelle entreprise.

Ne fais pas croire que LBMedia propose de transformer physiquement l'entreprise.

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

L'objectif est de montrer comment LES MÊMES CONTENUS et LES MÊMES VISUELS peuvent être mieux présentés.

==================================================
CADRAGE
==================================================

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
VÉRIFICATION AVANT DE PRODUIRE
==================================================

Avant de produire l'image, vérifie mentalement :

1. Ai-je conservé l'identité réelle de l'entreprise ?
2. Les photographies que j'utilise correspondent-elles réellement à celles de la capture ?
3. Ai-je inventé ou modifié un bâtiment, un lieu, un produit ou une réalisation ?
4. Les changements portent-ils principalement sur le DESIGN DU SITE ?
5. Les changements répondent-ils réellement aux constats de l'audit ?
6. Cette proposition serait-elle réalisable par LBMedia avec les contenus réels du client ?

Si une photographie risque d'être réinterprétée ou inventée, ne l'utilise pas.

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

Uniquement la projection du site amélioré, construite à partir de la réalité visuelle de l'entreprise.
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