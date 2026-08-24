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

    /*
     * Une optimisation seule ne nécessite
     * volontairement aucune projection
     * visuelle.
     */
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

    /*
     * Dans le parcours Audit → Prospection,
     * la capture actuelle reste notre
     * référence factuelle, y compris
     * lorsqu'on propose un nouveau site.
     */
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

    const prompt = `
À partir de la capture du site fournie, crée une PROJECTION VISUELLE correspondant précisément à l'orientation commerciale suivante.

==================================================
TYPE DE PROPOSITION
==================================================

${proposalDirection}

CETTE ORIENTATION EST IMPORTANTE.

La proposition visuelle ne doit pas être identique quel que soit le type de projet.

Elle doit traduire graphiquement le niveau d'évolution demandé tout en respectant strictement la réalité de l'entreprise.

==================================================
OBJECTIF COMMERCIAL DE LA PROJECTION
==================================================

Cette image sera présentée commercialement par LBMedia à l'entreprise comme une piste possible d'évolution de son site.

Il s'agit exclusivement d'un exercice de WEB DESIGN, de hiérarchisation et de restructuration VISUELLE de la page.

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
RÈGLE ABSOLUE : AUCUNE PHOTOGRAPHIE INVENTÉE
==================================================

CETTE RÈGLE S'APPLIQUE À TOUTES LES IMAGES DE LA PROPOSITION, Y COMPRIS AUX PETITES PHOTOGRAPHIES ET AUX VISUELS SECONDAIRES.

Toute photographie affichée dans la proposition doit correspondre à une photographie RÉELLEMENT ET CLAIREMENT VISIBLE dans la capture source fournie.

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

Par exemple :

- si aucune chambre n'est clairement visible dans la capture, n'affiche aucune photographie de chambre ;
- si aucun plat n'est clairement visible dans la capture, n'affiche aucune photographie de plat ;
- si aucun restaurant n'est clairement visible dans la capture, n'invente aucune photographie de restaurant ;
- si aucune équipe n'est visible, n'invente aucun portrait ;
- si aucun produit n'est visible, n'invente aucune photographie de produit ;
- si aucune réalisation n'est visible, n'invente aucune photographie de réalisation.

Même si l'activité de l'entreprise permet logiquement de supposer l'existence de ces éléments, CETTE SUPPOSITION N'AUTORISE PAS LEUR GÉNÉRATION.

Par exemple :

Un hôtel possède probablement des chambres.

Cela ne signifie PAS que tu peux inventer une photographie de chambre.

Un restaurant sert probablement des plats.

Cela ne signifie PAS que tu peux inventer une photographie de plat.

Une entreprise de construction possède probablement des réalisations.

Cela ne signifie PAS que tu peux inventer une photographie de chantier ou de maison.

La logique métier n'est jamais une preuve visuelle.

==================================================
QUE FAIRE SI UNE PHOTO MANQUE ?
==================================================

Si la nouvelle mise en page nécessiterait normalement une photographie mais qu'aucune photographie réelle correspondante n'est clairement disponible dans la capture :

NE CRÉE PAS CETTE PHOTOGRAPHIE.

Utilise à la place, selon ce qui convient au design :

- un bloc typographique élégant ;
- un titre ;
- une courte description ;
- une icône simple et générique ;
- un pictogramme sobre ;
- un aplat de couleur ;
- une forme graphique ;
- une ligne ;
- une séparation ;
- davantage d'espace blanc ;
- une carte sans photographie.

Tu peux également simplifier la section ou la supprimer.

UNE ZONE SANS PHOTO EST TOUJOURS PRÉFÉRABLE À UNE FAUSSE PHOTO.

==================================================
RÈGLE DE RÉUTILISATION DES PHOTOGRAPHIES
==================================================

Ne transforme pas une photographie source en une nouvelle photographie.

Lorsque tu réutilises une photographie visible dans la capture :

- traite-la comme un asset existant ;
- conserve son contenu réel ;
- ne change pas les personnes ;
- ne change pas les objets ;
- ne change pas le bâtiment ;
- ne change pas la décoration ;
- ne change pas le mobilier ;
- ne change pas le paysage ;
- ne change pas les produits ;
- ne change pas les plats ;
- ne change pas les véhicules ;
- ne change pas les équipements.

Une photographie source peut être :

- déplacée ;
- agrandie ;
- réduite ;
- légèrement recadrée ;
- intégrée dans une carte ;
- utilisée en arrière-plan ;
- accompagnée de texte.

Elle ne doit pas être recréée ou réinterprétée.

Si tu n'es pas certain qu'un visuel de la proposition correspond réellement à une photographie présente dans la capture source, SUPPRIME CE VISUEL.

==================================================
RÈGLE ABSOLUE : PROPOSITION VISUELLE UNIQUEMENT
==================================================

La proposition doit montrer une DIRECTION GRAPHIQUE et éditoriale.

Elle ne doit PAS chercher à simuler le fonctionnement complet d'un futur site.

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

Même lorsqu'une fonctionnalité de réservation, de contact ou de demande existe déjà sur le site, NE LA REPRÉSENTE PAS sous la forme d'un formulaire ou d'un widget détaillé dans cette projection.

Si une action commerciale est pertinente, représente-la uniquement par un bouton simple et discret, par exemple :

- "Réserver" ;
- "Nous contacter" ;
- "Découvrir" ;
- "En savoir plus" ;
- "Demander un devis".

N'affiche pas ce qui se passe après le clic.

La proposition doit privilégier :

- la photographie réelle ;
- le message principal ;
- la hiérarchie de l'offre ;
- les contenus essentiels ;
- les éléments de confiance ;
- les appels à l'action simples.

==================================================
RÈGLE DE SOBRIÉTÉ FONCTIONNELLE
==================================================

NE CONÇOIS PAS DE NOUVELLES FONCTIONNALITÉS.

Réorganise et valorise principalement ce qui existe déjà.

Une recommandation présente dans l'audit ne signifie pas qu'elle doit obligatoirement apparaître VISUELLEMENT dans cette proposition.

Par exemple :

- une recommandation SEO peut être importante sans être visible dans la maquette ;
- une amélioration technique peut être importante sans ajouter un module à l'écran ;
- une amélioration de conversion peut être illustrée par une meilleure hiérarchie et un bouton clair, sans créer de formulaire ;
- une amélioration de réservation peut être illustrée par un simple bouton "Réserver", sans afficher un moteur de réservation.

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

La proposition doit matérialiser VISUELLEMENT uniquement les recommandations de l'audit qui peuvent raisonnablement être traduites en amélioration de présentation.

Chaque changement visible doit avoir une raison liée à au moins un de ces objectifs :

- mieux faire comprendre l'activité ;
- mieux présenter l'offre ;
- mieux hiérarchiser les informations ;
- mieux mettre en valeur les contenus existants ;
- mieux guider le visiteur ;
- mieux rassurer ;
- mieux orienter vers une action simple lorsqu'elle est pertinente.

Ne modifie pas un élément uniquement pour donner l'impression que la proposition est différente.

Ne cherche pas la différence pour la différence.

Le résultat doit pouvoir être réellement reproduit ensuite dans un site WordPress / Elementor à partir des contenus existants de l'entreprise.

Évite donc :

- les effets graphiques impossibles ;
- les concepts irréalisables ;
- les interfaces artificielles ;
- les modules fonctionnels inventés ;
- les widgets complexes ;
- les éléments qui monopolisent inutilement l'espace.

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
- les boutons simples ;
- la présentation des contenus ;
- la manière dont les photographies existantes sont mises en valeur.

LIBERTÉ DE DESIGN : OUI.

LIBERTÉ D'INVENTER LA RÉALITÉ DE L'ENTREPRISE : NON.

LIBERTÉ D'INVENTER DES PHOTOGRAPHIES : NON.

LIBERTÉ D'INVENTER DES FONCTIONNALITÉS : NON.

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

L'objectif est de montrer comment les contenus réels peuvent être mieux présentés selon le TYPE DE PROPOSITION défini au début de cette consigne.

La photographie principale doit rester un élément visuel fort lorsqu'elle est pertinente.

Ne masque pas inutilement une belle photographie réelle avec :

- un grand formulaire ;
- une carte massive ;
- un panneau fonctionnel ;
- un widget ;
- un bloc technique.

Pour les sections secondaires :

- utilise une photographie uniquement si cette photographie existe clairement dans la capture source ;
- sinon, privilégie une présentation typographique ou iconographique ;
- ne remplis jamais artificiellement une grille avec des photographies générées ;
- une mise en page sobre avec moins d'images est préférable à une mise en page riche contenant de fausses images.

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

L'image doit ressembler directement à une capture d'écran du site proposé.

==================================================
VÉRIFICATION AVANT DE PRODUIRE
==================================================

Avant de produire l'image, vérifie mentalement :

1. Ai-je bien respecté le TYPE DE PROPOSITION indiqué au début ?
2. Ai-je conservé l'identité réelle de l'entreprise ?
3. CHAQUE photographie utilisée existe-t-elle réellement dans la capture source ?
4. Pour CHAQUE petite vignette photographique, puis-je identifier clairement son équivalent dans la capture source ?
5. Ai-je inventé ou modifié un bâtiment, un lieu, un produit ou une réalisation ?
6. Ai-je inventé une chambre, un plat, un restaurant, une équipe, un produit ou une réalisation simplement parce que l'activité de l'entreprise le suggère ?
7. Ai-je inventé une fonctionnalité ou un module qui n'est pas nécessaire à cette démonstration visuelle ?
8. Un formulaire, calendrier, moteur de réservation ou widget occupe-t-il une partie de la proposition ? Si oui, supprime-le.
9. Les changements portent-ils principalement sur le DESIGN DU SITE ?
10. Les changements répondent-ils réellement aux constats de l'audit ?
11. Cette proposition serait-elle réalisable par LBMedia avec les contenus réels du client ?
12. Le niveau d'évolution visuelle correspond-il réellement à ${getProposalShortLabel(
      proposalType
    )} ?

SI LA RÉPONSE À LA QUESTION 3 OU 4 EST NON OU INCERTAINE :
SUPPRIME LA PHOTOGRAPHIE CONCERNÉE.

Ne la remplace surtout pas par une photographie générée.

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

La proposition doit être construite à partir de la réalité visuelle de l'entreprise et du diagnostic issu de l'audit.
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

    /*
     * Le type de proposition est intégré
     * au nom du fichier.
     *
     * Cela permet de distinguer clairement
     * les différentes orientations générées.
     */
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

    /*
     * Toute nouvelle projection invalide
     * le PDF précédemment généré.
     */
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
- la perception de modernité ;
- la capacité du site à mieux soutenir les optimisations SEO, locales et GEO / IA identifiées dans l'audit.

Le visiteur doit pouvoir reconnaître le site et l'entreprise, mais constater une évolution significative de la présentation.

Conserve une continuité visuelle avec l'existant.

Ne produis pas une rupture complète d'identité.

La projection doit faire penser :

"Le site actuel pourrait devenir nettement plus efficace et actuel sans nécessairement repartir de zéro."
`.trim();

    case "redesign":
      return `
REFONTE DU SITE EXISTANT

La proposition peut faire évoluer beaucoup plus franchement la structure et la présentation du site actuel.

L'objectif est de montrer ce que pourrait apporter une véritable refonte graphique et éditoriale.

Tu peux notamment revoir fortement :

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

La nouvelle présentation doit être nettement différente du site actuel tout en conservant :

- la vraie entreprise ;
- son identité ;
- son logo ;
- ses couleurs pertinentes ;
- ses contenus factuels ;
- ses photographies réelles.

La projection doit faire penser :

"Voici à quoi pourrait ressembler une véritable refonte de ce site."
`.trim();

    case "new_website":
      return `
NOUVEAU SITE

La capture actuelle sert uniquement de SOURCE FACTUELLE et de référence pour l'identité réelle de l'entreprise.

Tu n'es PAS obligé de conserver la structure, la disposition ou l'organisation actuelle du site.

Imagine une nouvelle page d'accueil construite dès le départ autour :

- de la compréhension immédiate de l'activité ;
- des prestations prioritaires ;
- de la visibilité ;
- du référencement ;
- de la visibilité locale lorsque pertinente ;
- de la compréhension par les moteurs et les IA ;
- de la conversion ;
- d'un parcours simple vers le contact.

Tu peux repenser largement :

- le header ;
- la navigation ;
- le hero ;
- la hiérarchie éditoriale ;
- la disposition des blocs ;
- les proportions ;
- la typographie ;
- les espaces ;
- les appels à l'action ;
- la présentation des prestations.

MAIS :

tu dois toujours conserver strictement la réalité de l'entreprise.

La liberté concerne LE SITE, pas l'entreprise elle-même.

N'invente :

- aucune photo ;
- aucun service ;
- aucune activité ;
- aucun produit ;
- aucune réalisation ;
- aucune promesse ;
- aucune fonctionnalité.

Le résultat doit être plus libre qu'une refonte classique.

La projection doit faire penser :

"Si nous concevions aujourd'hui un nouveau site pour cette entreprise à partir de sa réalité et de ses objectifs, voici une direction possible."
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