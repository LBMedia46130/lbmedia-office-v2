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

type ProposalType =
  | "optimization"
  | "optimization_redesign"
  | "redesign"
  | "new_website";

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
          proposal_type,
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

    const proposalType =
      normalizeProposalType(
        prospection.proposal_type
      );

    if (
      proposalType ===
      "optimization"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Aucune projection visuelle n’est nécessaire pour une optimisation seule.",
        },
        {
          status: 400,
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
      .from(
        "companies"
      )
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

    const proposalDirection =
      getProposalDirection(
        proposalType
      );

    const sourceUsageRules =
      getSourceUsageRules(
        proposalType
      );

    const prompt = `
À partir de la capture du site fournie, crée une PROJECTION VISUELLE correspondant précisément à l'orientation commerciale suivante.

==================================================
TYPE DE PROPOSITION
==================================================

${proposalDirection}

CETTE ORIENTATION EST PRIORITAIRE.

La différence entre une REFONTE et un NOUVEAU SITE doit être immédiatement perceptible.

==================================================
UTILISATION DE LA CAPTURE SOURCE
==================================================

${sourceUsageRules}

==================================================
OBJECTIF COMMERCIAL DE LA PROJECTION
==================================================

Cette image sera présentée commercialement par LBMedia à l'entreprise comme une piste possible pour son site internet.

Il s'agit exclusivement d'un exercice de WEB DESIGN, de hiérarchisation et de conception VISUELLE.

Il ne s'agit PAS :

- de réinventer l'entreprise ;
- de réinventer ses locaux ;
- de réinventer ses produits ;
- de réinventer ses réalisations ;
- de réinventer son environnement ;
- d'inventer de nouvelles fonctionnalités ;
- d'inventer de nouvelles photographies.

==================================================
RÈGLE ABSOLUE : PRÉSERVER LA RÉALITÉ
==================================================

CETTE RÈGLE EST PRIORITAIRE SUR TOUTES LES AUTRES CONSIGNES.

Toutes les photographies réelles visibles dans la capture constituent des ÉLÉMENTS FACTUELS.

Elles doivent être considérées comme des ASSETS EXISTANTS à réutiliser, et NON comme des références permettant de générer de nouvelles images similaires.

Lorsqu'une photographie existante est réutilisée :

- conserve exactement le même lieu ;
- conserve exactement le même bâtiment ;
- conserve exactement la même architecture ;
- conserve exactement les mêmes aménagements ;
- conserve exactement la même piscine, chambre, restaurant, produit, personne, réalisation ou environnement visible ;
- conserve autant que possible son contenu photographique original.

Tu peux :

- recadrer légèrement une photographie existante ;
- changer ses dimensions d'affichage ;
- l'utiliser comme image de fond ;
- appliquer un léger voile graphique pour rendre du texte lisible ;
- la repositionner librement dans la nouvelle composition.

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
- remplacer un visuel réel par une image générée ressemblante.

L'amélioration concerne LE SITE INTERNET.

Elle ne concerne PAS la réalité physique de l'entreprise.

Si tu ne peux pas préserver fidèlement une photographie, préfère ne pas l'utiliser.

==================================================
RÈGLE ABSOLUE : AUCUNE PHOTOGRAPHIE INVENTÉE
==================================================

Toute photographie affichée dans la proposition doit correspondre à une photographie RÉELLEMENT ET CLAIREMENT VISIBLE dans la capture source.

Cela concerne notamment :

- les photographies principales ;
- les photographies secondaires ;
- les vignettes ;
- les cartes illustrées ;
- les galeries ;
- les images de chambres ;
- les images de restaurants ;
- les images de plats ;
- les images de piscines ;
- les images de bâtiments ;
- les images de produits ;
- les images de réalisations ;
- les images de collaborateurs ;
- les portraits ;
- les images d'événements ;
- les paysages ;
- les images utilisées en arrière-plan.

NE GÉNÈRE JAMAIS une photographie pour compléter graphiquement une section.

NE DÉDUIS JAMAIS l'apparence d'un élément qui n'est pas visible dans la capture.

La logique métier n'est jamais une preuve visuelle.

==================================================
QUE FAIRE SI UNE PHOTO MANQUE ?
==================================================

Si la nouvelle composition nécessiterait normalement une photographie mais qu'aucune photographie réelle correspondante n'est disponible :

NE CRÉE PAS CETTE PHOTOGRAPHIE.

Utilise à la place :

- un bloc typographique élégant ;
- un titre ;
- une courte description ;
- une icône simple ;
- un pictogramme sobre ;
- un aplat de couleur ;
- une forme graphique ;
- une ligne ;
- une séparation ;
- davantage d'espace blanc ;
- une carte sans photographie.

Tu peux également simplifier ou supprimer la section.

UNE ZONE SANS PHOTO EST TOUJOURS PRÉFÉRABLE À UNE FAUSSE PHOTO.

==================================================
PROPOSITION VISUELLE UNIQUEMENT
==================================================

La proposition doit montrer une DIRECTION GRAPHIQUE et éditoriale.

Elle ne doit PAS simuler le fonctionnement complet du futur site.

N'invente et n'affiche AUCUN nouveau module fonctionnel.

INTERDICTIONS :

- aucun formulaire de réservation ;
- aucun moteur de réservation ;
- aucun sélecteur de dates ;
- aucun calendrier ;
- aucun champ arrivée / départ ;
- aucun sélecteur du nombre de personnes ;
- aucun formulaire de contact ;
- aucun formulaire de demande de devis ;
- aucun calculateur ;
- aucun configurateur ;
- aucun moteur de recherche interne ;
- aucun espace client ;
- aucun widget fonctionnel ;
- aucun module interactif complexe ;
- aucune interface applicative inventée.

Une action commerciale peut être représentée uniquement par un bouton simple :

- "Réserver" ;
- "Nous contacter" ;
- "Découvrir" ;
- "En savoir plus" ;
- "Demander un devis".

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
IDENTITÉ DE L'ENTREPRISE
==================================================

Le résultat doit être immédiatement reconnaissable comme appartenant à CETTE entreprise.

Conserve :

- le vrai logo visible dans la capture ;
- le vrai nom de l'entreprise ;
- les couleurs de marque réellement identifiables lorsqu'elles sont pertinentes, sauf pour une proposition "Nouveau site" où elles peuvent être librement réinterprétées ;
- les photographies réelles utilisées ;
- la nature exacte de l'activité ;
- les informations commerciales établies.

ATTENTION :

CONSERVER L'IDENTITÉ NE SIGNIFIE PAS CONSERVER LE DESIGN ACTUEL.

Le logo, les photographies et les contenus sont des ASSETS.

La palette actuelle peut être considérée comme un asset pour une évolution ou une refonte.

Pour un NOUVEAU SITE, elle devient seulement une référence possible parmi d'autres.

La composition actuelle de la page n'est PAS un asset.

Le header actuel n'est PAS un asset.

Le hero actuel n'est PAS un asset.

La grille actuelle n'est PAS un asset.

L'ordre actuel des sections n'est PAS un asset.

La navigation actuelle n'est PAS un asset.

${
  proposalType ===
  "new_website"
    ? `
POUR LE NOUVEAU SITE :

Cette distinction est ABSOLUE.

Tu dois conserver l'identité de l'entreprise mais NE PAS reproduire son système de mise en page actuel.

Tu n'es PAS obligé de conserver sa palette de couleurs actuelle.

Tu peux proposer une direction chromatique sensiblement différente si elle est cohérente avec l'activité et le positionnement.

La nouvelle composition doit pouvoir être dessinée sans regarder la disposition actuelle, une fois les assets et les faits identifiés.
`
    : ""
}

==================================================
CONTENU
==================================================

Utilise uniquement des informations établies par :

1. la capture du site ;
2. les informations sur l'entreprise fournies ci-dessus ;
3. les constats de l'audit.

N'invente aucune activité ou promesse commerciale.

Lorsque les vrais textes sont lisibles, conserve-les ou utilise-les comme base.

Tu peux raccourcir une formulation pour améliorer la hiérarchie visuelle sans en changer le sens.

==================================================
ÉLÉMENTS DE CONFIANCE
==================================================

N'utilise que les éléments de confiance réellement visibles ou établis.

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

==================================================
DIRECTION GRAPHIQUE
==================================================

La projection doit être :

- professionnelle ;
- contemporaine ;
- élégante ;
- crédible ;
- aérée ;
- visuellement forte ;
- réaliste ;
- adaptée à une vraie entreprise française.

Le design peut être nettement meilleur que l'original.

${
  proposalType ===
  "new_website"
    ? `
==================================================
LIBERTÉ DE DIRECTION ARTISTIQUE — NOUVEAU SITE
==================================================

Pour un NOUVEAU SITE, les couleurs du site actuel ne constituent PAS une contrainte.

Elles peuvent servir d'inspiration si elles sont pertinentes, mais tu es explicitement autorisé à proposer une palette sensiblement différente.

Le logo réel, les photographies réelles, l'activité et les contenus factuels assurent déjà la continuité avec l'entreprise.

Tu peux donc explorer une direction artistique plus audacieuse et plus contemporaine.

Tu peux notamment :

- introduire une nouvelle couleur dominante ;
- réduire fortement l'importance des couleurs actuelles ;
- utiliser une palette plus sobre, premium, chaleureuse, naturelle ou éditoriale selon l'activité ;
- créer de nouveaux contrastes ;
- utiliser davantage de blanc ou d'espaces neutres ;
- employer des tons profonds ou naturels ;
- choisir une typographie donnant une personnalité très différente au site ;
- faire évoluer radicalement le rapport entre photographie, texte et couleur.

NE CHERCHE PAS systématiquement à reproduire la palette du site actuel.

NE CONSIDÈRE PAS les couleurs actuelles comme faisant nécessairement partie de l'identité intangible de l'entreprise.

En revanche :

- ne modifie pas le logo lui-même ;
- ne recolore pas artificiellement les photographies pour changer la réalité ;
- ne crée pas une direction artistique incohérente avec l'activité ;
- ne cherche pas l'originalité au détriment de la crédibilité commerciale.

La proposition doit pouvoir être PLUS AUDACIEUSE qu'une refonte.

Elle doit montrer au prospect qu'en repartant d'une page blanche, une autre expression visuelle de son entreprise est réellement possible.

Si la meilleure direction artistique conserve certaines couleurs actuelles, tu peux les conserver.

Mais fais-en un CHOIX DE DESIGN et non une conséquence automatique de la capture source.

==================================================
RUPTURE VISUELLE OBLIGATOIRE — NOUVEAU SITE
==================================================

Tu ne réalises PAS une version modernisée de la page fournie.

Tu conçois UNE NOUVELLE PAGE D'ACCUEIL.

Commence mentalement avec UNE TOILE BLANCHE.

Ensuite seulement, réintroduis :

- le logo réel ;
- les photographies réellement disponibles ;
- les informations factuelles ;
- les prestations réellement établies.

LA COMPOSITION DOIT ÊTRE NOUVELLE.

Change obligatoirement plusieurs éléments structurels majeurs :

1. une nouvelle architecture du header ;
2. une nouvelle composition du hero ;
3. une nouvelle hiérarchie typographique ;
4. une nouvelle organisation des contenus après le hero ;
5. un nouveau rythme entre textes, espaces et photographies ;
6. une nouvelle logique de mise en avant des prestations ;
7. une nouvelle position et une nouvelle hiérarchie des appels à l'action ;
8. une palette de couleurs pouvant être sensiblement différente ;
9. un univers graphique général pouvant être réinterprété.

NE CONSERVE PAS :

- la même disposition du header ;
- le même découpage du hero ;
- la même position relative du logo, du titre et de l'image ;
- la même grille principale ;
- la même succession visuelle de sections ;
- les mêmes proportions générales ;
- le même rythme vertical ;
- la même logique de cartes simplement restylées.

Une nouvelle palette appliquée à la même structure NE SUFFIT PAS.

Une nouvelle structure avec exactement les mêmes codes visuels NE SUFFIT PAS NON PLUS.

Il faut une vraie nouvelle direction.

Si quelqu'un place la capture actuelle et la proposition côte à côte, il doit immédiatement voir :

"Même entreprise, mais site conçu autrement."

et NON :

"Même site avec un nouveau design."

La proposition doit donner l'impression qu'un webdesigner a reçu :

- le logo ;
- les photos ;
- les contenus ;
- les objectifs ;

SANS recevoir la maquette ni la palette du site actuel.

C'est exactement l'effet recherché.
`
    : ""
}

==================================================
CADRAGE
==================================================

Ne cherche PAS à faire entrer toute la page d'accueil dans l'image.

Concentre la projection sur environ les 1 à 2 premiers écrans desktop.

Les éléments doivent être suffisamment grands pour être lisibles.

La projection doit occuper tout le visuel.

Pas de navigateur autour.
Pas d'ordinateur.
Pas de téléphone.
Pas de mockup dans un décor.

L'image doit ressembler directement à une capture d'écran du site proposé.

==================================================
VÉRIFICATION AVANT DE PRODUIRE
==================================================

Avant de produire l'image, vérifie mentalement :

1. Ai-je respecté le TYPE DE PROPOSITION ?
2. Ai-je conservé l'identité réelle de l'entreprise ?
3. Chaque photographie utilisée existe-t-elle réellement dans la capture ?
4. Ai-je inventé une photographie ?
5. Ai-je inventé une fonctionnalité ?
6. Cette proposition serait-elle réalisable par LBMedia avec les contenus réels du client ?
7. Le niveau d'évolution correspond-il réellement à ${getProposalShortLabel(
      proposalType
    )} ?
${
  proposalType ===
  "new_website"
    ? `
8. Ai-je réellement commencé par une page blanche ?
9. Le header est-il structurellement différent ?
10. Le hero est-il structurellement différent ?
11. L'ordre et la hiérarchie des contenus sont-ils différents ?
12. Ai-je évité de reproduire la grille et le rythme du site actuel ?
13. Ai-je réellement envisagé une palette différente plutôt que de reprendre automatiquement les couleurs existantes ?
14. La direction artistique est-elle suffisamment distincte d'une simple refonte ?
15. En voyant les deux images côte à côte, dira-t-on "nouveau site" plutôt que "refonte" ?

SI L'UNE DES RÉPONSES 8 À 15 EST NON :

REPENSE LA COMPOSITION ET LA DIRECTION ARTISTIQUE AVANT DE PRODUIRE L'IMAGE.
`
    : ""
}

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
Aucun formulaire.
Aucun calendrier.
Aucun moteur de réservation.
Aucun widget fonctionnel.
AUCUNE photographie qui ne soit pas clairement présente dans la capture source.

Uniquement la projection VISUELLE correspondant à :

${getProposalShortLabel(
  proposalType
)}

${
  proposalType ===
  "new_website"
    ? `
RAPPEL FINAL :

NOUVEAU SITE = NOUVELLE ARCHITECTURE VISUELLE + LIBERTÉ DE DIRECTION ARTISTIQUE.

Utilise la capture comme bibliothèque d'assets et de faits.

NE L'UTILISE PAS comme modèle de mise en page.

NE REPRENDS PAS automatiquement sa palette de couleurs.
`
    : ""
}
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
      `${company.id}/${id}/proposal-${proposalType}-${Date.now()}.png`;

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

      proposalType,

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

function normalizeProposalType(
  value: unknown
): ProposalType {
  if (
    value ===
      "optimization" ||
    value ===
      "optimization_redesign" ||
    value ===
      "redesign" ||
    value ===
      "new_website"
  ) {
    return value;
  }

  return "optimization";
}

function getProposalShortLabel(
  proposalType: Exclude<
    ProposalType,
    "optimization"
  >
) {
  switch (
    proposalType
  ) {
    case "optimization_redesign":
      return "UNE ÉVOLUTION DU SITE ASSOCIANT OPTIMISATION ET REFONTE";

    case "redesign":
      return "UNE REFONTE DU SITE EXISTANT";

    case "new_website":
      return "LA CRÉATION D'UN NOUVEAU SITE";
  }
}

function getSourceUsageRules(
  proposalType: Exclude<
    ProposalType,
    "optimization"
  >
): string {
  if (
    proposalType ===
    "new_website"
  ) {
    return `
La capture actuelle n'est PAS une maquette à modifier.

Elle est uniquement :

- une bibliothèque de photographies réelles ;
- une source pour le logo et le nom ;
- une source pour les textes et informations factuelles ;
- une preuve de l'activité réelle de l'entreprise.

Les couleurs du site actuel ne sont PAS une contrainte.

Elles peuvent être conservées, réduites, réinterprétées ou largement abandonnées au profit d'une nouvelle direction artistique cohérente.

IGNORE COMME RÉFÉRENCE DE DESIGN :

- la structure actuelle ;
- le header actuel ;
- la navigation actuelle ;
- le hero actuel ;
- la grille actuelle ;
- l'ordre des sections ;
- les proportions ;
- les espacements ;
- la position actuelle des photographies ;
- la hiérarchie typographique actuelle ;
- la position actuelle des boutons ;
- la palette actuelle comme contrainte obligatoire.

Tu dois extraire mentalement les ASSETS de la capture, puis concevoir une page neuve.

Imagine que l'on t'a fourni séparément le logo, les photographies et les contenus, mais AUCUNE maquette ni palette imposée.
`.trim();
  }

  if (
    proposalType ===
    "redesign"
  ) {
    return `
La capture actuelle est à la fois :

- une source factuelle ;
- une référence d'identité ;
- une référence permettant de comprendre le site existant.

Pour cette REFONTE, tu peux modifier fortement la structure et la présentation.

Il reste néanmoins pertinent que l'on puisse comprendre qu'il s'agit d'une transformation du site existant.

Tu peux conserver certains repères ou certaines logiques si elles fonctionnent.
`.trim();
  }

  return `
La capture actuelle constitue une base à faire évoluer.

Pour cette proposition OPTIMISATION + REFONTE, conserve une continuité perceptible avec le site actuel.

Améliore nettement la hiérarchie, la lisibilité, la présentation et la mise en valeur des contenus sans donner l'impression d'avoir totalement abandonné la base existante.
`.trim();
}

function getProposalDirection(
  proposalType: Exclude<
    ProposalType,
    "optimization"
  >
) {
  switch (
    proposalType
  ) {
    case "optimization_redesign":
      return `
OPTIMISATION + REFONTE

Le site actuel constitue une base exploitable.

L'objectif n'est PAS de repartir totalement de zéro.

La proposition doit montrer comment le site pourrait évoluer en conservant ce qui fonctionne déjà tout en améliorant nettement :

- la hiérarchie des informations ;
- la clarté des prestations ;
- la lisibilité ;
- la navigation ;
- la mise en valeur des contenus ;
- les appels à l'action ;
- la perception de modernité.

Conserve une continuité visuelle avec l'existant.

La projection doit faire penser :

"Le site actuel pourrait devenir nettement plus efficace et actuel sans nécessairement repartir de zéro."
`.trim();

    case "redesign":
      return `
REFONTE DU SITE EXISTANT

Tu travailles à partir du SITE EXISTANT.

La proposition doit montrer une transformation importante de sa présentation et de son organisation.

Tu peux revoir fortement :

- la composition du haut de page ;
- l'organisation de la navigation ;
- la hiérarchie des contenus ;
- les proportions ;
- la typographie ;
- les espaces ;
- les blocs de présentation ;
- la mise en valeur des prestations ;
- les appels à l'action ;
- la manière de valoriser les photographies existantes.

Mais le raisonnement reste celui d'une REFONTE :

on part de ce qui existe pour le repenser et mieux le présenter.

La projection doit faire penser :

"Voici une nouvelle version, profondément retravaillée, de ce site existant."
`.trim();

    case "new_website":
      return `
NOUVEAU SITE — CONCEPTION À PARTIR D'UNE PAGE BLANCHE

CETTE PROPOSITION DOIT ÊTRE STRUCTURELLEMENT ET ARTISTIQUEMENT DIFFÉRENTE D'UNE REFONTE.

Tu ne dois PAS améliorer la maquette actuelle.

Tu ne dois PAS moderniser simplement sa structure.

Tu ne dois PAS reprendre automatiquement sa palette.

TU DOIS CONCEVOIR UNE NOUVELLE PAGE.

La capture source sert exclusivement à récupérer :

- l'identité réelle ;
- le logo ;
- les photographies existantes ;
- les contenus factuels ;
- les prestations réellement établies.

Une fois ces éléments identifiés, IGNORE LA MISE EN PAGE SOURCE ET SES CODES GRAPHIQUES NON ESSENTIELS.

Pars mentalement d'une page totalement blanche.

Demande-toi :

"Si cette entreprise n'avait aujourd'hui aucun site, quelle architecture ET quelle direction artistique proposerais-je avec ses vrais contenus ?"

Conçois alors une nouvelle architecture éditoriale et graphique.

Tu dois repenser franchement :

- l'architecture du header ;
- la navigation ;
- le hero ;
- la hiérarchie éditoriale ;
- l'ordre des informations ;
- la disposition des blocs ;
- le rythme visuel ;
- les proportions ;
- la typographie ;
- les espaces ;
- les appels à l'action ;
- la manière d'utiliser les photographies réelles ;
- la palette de couleurs ;
- l'univers graphique général.

LE SQUELETTE ET LA DIRECTION ARTISTIQUE DOIVENT ÊTRE NOUVEAUX.

Même entreprise : OUI.

Même logo : OUI.

Mêmes photographies réelles disponibles : OUI.

Même structure : NON.

Même hero : NON.

Même grille : NON.

Même succession de sections : NON.

Même palette obligatoire : NON.

Une simple modernisation graphique est un ÉCHEC.

Une refonte poussée de la structure actuelle est encore un ÉCHEC.

Le résultat attendu est une NOUVELLE CONCEPTION.

La projection doit faire penser :

"Cette entreprise possède maintenant un site conçu aujourd'hui à partir de zéro."

et non :

"Son ancien site a été joliment refait."
`.trim();
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