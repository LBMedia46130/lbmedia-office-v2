import {
  NextRequest,
  NextResponse,
} from "next/server";

import OpenAI from "openai";

import {
  getWebsiteAuditById,
  getWebsiteAuditCommercialDiagnosis,
} from "@/lib/website-audits";

import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

export const dynamic =
  "force-dynamic";

export const maxDuration = 60;

const openai =
  new OpenAI({
    apiKey:
      process.env.OPENAI_API_KEY,
  });

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ProposalType =
  | "optimization"
  | "optimization_redesign"
  | "redesign"
  | "new_website";

type GeneratedProspection = {
  salesAngle: string;
  subject: string;
  emailContent: string;
};

function isProposalType(
  value: unknown
): value is ProposalType {
  return (
    value ===
      "optimization" ||
    value ===
      "optimization_redesign" ||
    value ===
      "redesign" ||
    value ===
      "new_website"
  );
}

function getProposalLabel(
  proposalType: ProposalType
): string {
  switch (
    proposalType
  ) {
    case "optimization":
      return "Optimisation du site existant";

    case "optimization_redesign":
      return "Optimisation + refonte";

    case "redesign":
      return "Refonte du site existant";

    case "new_website":
      return "Création d’un nouveau site";
  }
}

function getProposalInstructions(
  proposalType: ProposalType
): string {
  switch (
    proposalType
  ) {
    case "optimization":
      return `
La proposition commerciale choisie est une OPTIMISATION DU SITE EXISTANT.

Tu dois valoriser la base actuelle.

Le message doit faire comprendre que LBMedia ne considère pas qu'il soit nécessaire de repartir de zéro.

Les pistes peuvent porter sur :

- SEO ;
- SEO local ;
- GEO / visibilité IA ;
- contenus ;
- structuration des prestations ;
- conversion ;
- prise de contact.

Tu peux employer des formulations comme :

"Votre site constitue déjà une bonne base."

"Une refonte complète ne me semble pas nécessairement être la priorité."

"Quelques optimisations ciblées pourraient déjà permettre d'améliorer sa visibilité et son efficacité."

Ne propose aucune refonte dans ce scénario.
`.trim();

    case "optimization_redesign":
      return `
La proposition commerciale choisie est OPTIMISATION + REFONTE.

C'est un scénario commercial comportant deux dimensions, mais cette structure doit rester INVISIBLE dans la rédaction du mail.

N'écris jamais :

"Notre proposition se déroule en deux temps."

"Notre proposition comporte deux étapes."

"Notre approche se déroule en deux temps."

"Nous vous proposons dans un premier temps..."

Le prospect doit lire un message naturel, pas la présentation d'une méthodologie commerciale.

PREMIÈRE DIMENSION — OPTIMISATION

Présente d'abord les améliorations réellement justifiées par l'audit :

- SEO ;
- SEO local ;
- GEO / visibilité IA ;
- contenus ;
- structuration des prestations ;
- conversion ;
- prise de contact.

Explique naturellement qu'une optimisation ciblée de l'existant peut déjà produire des améliorations concrètes.

Tu peux écrire par exemple :

"Quelques optimisations ciblées pourraient déjà renforcer la visibilité et l'efficacité du site."

"Une optimisation de la visibilité locale, des contenus et de la prise de contact permettrait déjà de mieux exploiter la base existante."

DEUXIÈME DIMENSION — ÉVOLUTION / REFONTE

Le corps du mail DOIT ensuite contenir explicitement une ouverture vers une évolution plus globale du site.

Cette deuxième dimension est OBLIGATOIRE.

Elle doit s'enchaîner naturellement avec l'optimisation, sans annoncer artificiellement une deuxième étape.

Utilise une transition conversationnelle telle que :

"Et si vous souhaitez aller plus loin..."

"Cela peut aussi être l'occasion d'aller un peu plus loin..."

"Ces améliorations peuvent également être l'occasion de faire évoluer plus largement..."

Si le diagnostic automatique recommande seulement une optimisation, tu ne dois JAMAIS inventer de défaut de design ni affirmer qu'une refonte est nécessaire.

Dans ce cas, présente cette évolution comme une possibilité complémentaire permettant par exemple :

- de faire évoluer la présentation ;
- de mieux hiérarchiser les prestations ;
- de mieux mettre en valeur les différentes activités ;
- de renforcer l'impact commercial du site ;
- d'intégrer les optimisations dans une évolution plus globale.

Tu peux utiliser des formulations naturelles telles que :

"Une optimisation ciblée du site pourrait déjà renforcer sa visibilité et son efficacité sans nécessairement repartir de zéro."

"Et si vous souhaitez aller plus loin, cela peut aussi être l'occasion de faire évoluer la présentation et l'organisation du site afin de mieux mettre en valeur vos différentes prestations."

"Ces améliorations peuvent également être l'occasion de donner davantage d'impact à l'ensemble, sans pour autant tout reprendre depuis zéro."

IMPORTANT :

Le mail final est INCOMPLET s'il ne contient que l'optimisation.

Le mail final est également incorrect s'il présente la refonte comme indispensable alors que l'audit ne le justifie pas.

L'équilibre recherché est :

OPTIMISATION = RÉPONSE IMMÉDIATE AUX CONSTATS

+

REFONTE = OPPORTUNITÉ POUR ALLER PLUS LOIN.

Cette logique doit être perceptible dans le fond, mais ne doit jamais être présentée au prospect comme une mécanique commerciale en "deux temps".
`.trim();

    case "redesign":
      return `
La proposition commerciale choisie est une REFONTE DU SITE EXISTANT.

Le mail doit expliquer avec tact que la base actuelle contient des éléments intéressants mais que l'organisation, la présentation ou le parcours peuvent limiter son efficacité.

Ne critique jamais brutalement le design.

Évite :

"Votre site est dépassé."

"Votre site est vieux."

"Votre site est mal conçu."

Privilégie :

"Le site présente bien votre activité, mais son organisation actuelle ne permet pas toujours de mettre immédiatement en avant les prestations les plus importantes."

"Une évolution plus globale de la présentation pourrait permettre de mieux valoriser l'offre tout en améliorant sa visibilité."

La refonte doit être reliée aux constats réels de l'audit.
`.trim();

    case "new_website":
      return `
La proposition commerciale choisie est la CRÉATION D'UN NOUVEAU SITE.

Présente cette piste avec mesure.

Ne dis jamais :

"Votre site est mauvais."

"Il faut tout refaire."

Explique plutôt que plusieurs limites peuvent toucher simultanément :

- la visibilité ;
- la présentation de l'offre ;
- l'organisation ;
- la conversion ;
- la prise de contact.

Formulation possible :

"Dans ce contexte, repartir sur une base plus actuelle pourrait être plus pertinent qu'une succession de corrections ponctuelles."

Cette recommandation doit rester cohérente avec les constats réellement relevés.
`.trim();
  }
}

function validateGeneratedProspection(
  value: unknown
): GeneratedProspection {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    throw new Error(
      "Le résultat retourné par l’IA est invalide."
    );
  }

  const data =
    value as Record<
      string,
      unknown
    >;

  const salesAngle =
    typeof data.salesAngle ===
    "string"
      ? data.salesAngle.trim()
      : "";

  const subject =
    typeof data.subject ===
    "string"
      ? data.subject.trim()
      : "";

  const emailContent =
    typeof data.emailContent ===
    "string"
      ? data.emailContent.trim()
      : "";

  if (
    !salesAngle ||
    !subject ||
    !emailContent
  ) {
    throw new Error(
      "La prospection générée est incomplète."
    );
  }

  return {
    salesAngle,
    subject,
    emailContent,
  };
}

function formatList(
  items: string[]
): string {
  if (
    items.length === 0
  ) {
    return "- Aucun élément prioritaire";
  }

  return items
    .map(
      (item) =>
        `- ${item}`
    )
    .join("\n");
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  if (
    !process.env
      .OPENAI_API_KEY
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "La clé OpenAI n’est pas configurée.",
      },
      {
        status: 500,
      }
    );
  }

  try {
    const { id } =
      await context.params;

    let requestBody:
      | Record<
          string,
          unknown
        >
      | null = null;

    try {
      requestBody =
        await request.json();
    } catch {
      requestBody =
        null;
    }

    const {
      data:
        prospection,
      error:
        prospectionError,
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
          recipient_email,
          recipient_name,
          attachment_url,
          status
        `
      )
      .eq(
        "id",
        id
      )
      .maybeSingle();

    if (
      prospectionError
    ) {
      throw new Error(
        `Impossible de charger la prospection : ${prospectionError.message}`
      );
    }

    if (
      !prospection
    ) {
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

    const audit =
      await getWebsiteAuditById(
        prospection.website_audit_id
      );

    if (!audit) {
      return NextResponse.json(
        {
          success: false,
          message:
            "L’audit associé est introuvable.",
        },
        {
          status: 404,
        }
      );
    }

    const commercialDiagnosis =
      getWebsiteAuditCommercialDiagnosis(
        audit
      );

    const requestedProposalType =
      requestBody
        ?.proposalType;

    let proposalType:
      ProposalType;

    if (
      requestedProposalType !==
      undefined
    ) {
      if (
        !isProposalType(
          requestedProposalType
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Le type de proposition commerciale est invalide.",
          },
          {
            status: 400,
          }
        );
      }

      proposalType =
        requestedProposalType;
    } else if (
      isProposalType(
        prospection.proposal_type
      )
    ) {
      proposalType =
        prospection.proposal_type;
    } else {
      proposalType =
        commercialDiagnosis
          .recommendation
          .type;
    }

    const proposalLabel =
      getProposalLabel(
        proposalType
      );

    const proposalInstructions =
      getProposalInstructions(
        proposalType
      );

    const {
      data: company,
      error:
        companyError,
    } = await supabaseAdmin
      .from(
        "companies"
      )
      .select(
        `
          id,
          name,
          legal_name,
          email,
          website,
          city,
          sector,
          business_description,
          target_audience,
          geographic_area
        `
      )
      .eq(
        "id",
        prospection.company_id
      )
      .maybeSingle();

    if (
      companyError
    ) {
      throw new Error(
        `Impossible de charger l’entreprise : ${companyError.message}`
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

    const hasAttachment =
      Boolean(
        prospection
          .attachment_url
          ?.trim()
      );

    const recommendation =
      commercialDiagnosis
        .recommendation;

    const differsFromRecommendation =
      proposalType !==
      recommendation.type;

    const prompt = `
Tu écris un premier email de prise de contact pour LBMedia.

LBMedia a réellement parcouru le site internet de l'entreprise et réalisé une analyse interne.

Cette analyse a produit un DIAGNOSTIC AUTOMATIQUE.

Ensuite, LBMedia a choisi une PROPOSITION COMMERCIALE à adresser au prospect.

Ces deux notions sont différentes.

==================================================
RÈGLE ABSOLUE
==================================================

Le diagnostic automatique constitue la vérité sur les constats.

La proposition commerciale constitue l'angle choisi pour présenter une solution.

Tu ne dois JAMAIS modifier, amplifier ou inventer des faiblesses afin de justifier la proposition commerciale choisie.

Si la proposition choisie est plus ambitieuse que le diagnostic, tu dois la présenter comme une possibilité ou une manière d'aller plus loin.

==================================================
COHÉRENCE DE LA VOIX
==================================================

Le mail est écrit à la première personne du singulier.

Utilise "je" lorsque l'auteur du mail intervient personnellement.

Ne bascule jamais de "je" vers "nous" au milieu du message.

Évite notamment :

"Nous pouvons..."

"Nous vous proposons..."

"Notre proposition..."

"Notre approche..."

"Notre analyse..."

Préférer selon le contexte :

"Je pense que..."

"Je serais ravi d'en échanger avec vous."

ou une formulation neutre ne nécessitant aucun pronom.

La marque LBMedia peut être mentionnée si nécessaire, mais le message doit conserver la voix naturelle d'une personne qui écrit directement au prospect.

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

Description de l'activité :
${company.business_description ?? "Non renseignée"}

Cible :
${company.target_audience ?? "Non renseignée"}

Zone géographique :
${company.geographic_area ?? "Non renseignée"}

==================================================
DIAGNOSTIC AUTOMATIQUE
==================================================

Recommandation issue de l'audit :

${recommendation.label}

Type :

${recommendation.type}

Justification :

${commercialDiagnosis.commercial_summary}

Description :

${recommendation.description}

Visibilité :

${commercialDiagnosis.visibility_score}/100

Efficacité du site :

${commercialDiagnosis.website_effectiveness_score}/100

==================================================
PROPOSITION COMMERCIALE CHOISIE PAR LBMEDIA
==================================================

${proposalLabel}

Type :

${proposalType}

La proposition choisie ${
      differsFromRecommendation
        ? "EST DIFFÉRENTE de la recommandation automatique."
        : "CORRESPOND à la recommandation automatique."
    }

${
  differsFromRecommendation
    ? `
IMPORTANT :

La différence est volontaire.

Tu dois respecter le choix commercial de LBMedia SANS falsifier le diagnostic.

La formulation doit clairement distinguer :

- ce qui semble nécessaire ;
- ce qui pourrait être envisagé pour aller plus loin.
`
    : ""
}

==================================================
INSTRUCTIONS SPÉCIFIQUES À LA PROPOSITION
==================================================

${proposalInstructions}

==================================================
FAIBLESSES — VISIBILITÉ & ACQUISITION
==================================================

${formatList(
  commercialDiagnosis
    .weaknesses
    .visibility
)}

==================================================
FAIBLESSES — SITE & CONVERSION
==================================================

${formatList(
  commercialDiagnosis
    .weaknesses
    .website
)}

==================================================
ENJEUX PRINCIPAUX
==================================================

${formatList(
  commercialDiagnosis
    .main_issues
)}

==================================================
PRIORITÉS D'ACTION INTERNES
==================================================

${formatList(
  audit.priorities
)}

==================================================
POINTS FORTS DU SITE
==================================================

${formatList(
  audit.strengths
)}

==================================================
OBJECTIF DU PREMIER EMAIL
==================================================

Le destinataire doit comprendre :

1. LBMedia a réellement regardé son site.
2. Le site possède des qualités qu'il faut reconnaître.
3. Deux ou trois améliorations concrètes ont été identifiées.
4. LBMedia propose une approche adaptée à ces constats.

Le message ne doit pas ressembler à un audit ou à un rapport technique.

==================================================
UTILISATION DES FAIBLESSES
==================================================

Choisis seulement 2 ou 3 éléments réellement pertinents.

IMPORTANT :

Les faiblesses sont fournies sous forme de listes uniquement pour ton travail interne.

Dans l'email final, transforme-les en un texte naturel et fluide.

N'utilise PAS une succession de tirets pour énumérer les problèmes.

N'écris PAS :

"conséquence :"

"problème :"

"faiblesse :"

"point faible :"

Ne reproduis pas les formulations techniques de l'audit.

Le prospect doit avoir l'impression de lire le message d'une personne qui a parcouru son site, pas un extrait d'un logiciel d'analyse.

Par exemple, au lieu de :

"Signal local incomplet et vocabulaire géographique limité."

Écris naturellement :

"Certaines informations pourraient être davantage structurées pour aider le site à ressortir sur les recherches réalisées dans votre secteur géographique."

Au lieu de :

"Absence de pages services dédiées."

Écris :

"Vos différentes prestations gagneraient également à être présentées plus distinctement, afin d'être immédiatement compréhensibles pour les visiteurs comme pour les moteurs de recherche."

Au lieu de :

"Coordonnées de contact non détectées comme exploitables."

Écris :

"Quelques ajustements pourraient enfin rendre la prise de contact plus immédiate pour un visiteur intéressé."

Relie les constats entre eux dans un ou deux paragraphes courts.

==================================================
SEO / SEO LOCAL / GEO-IA
==================================================

Il est possible de parler naturellement de visibilité.

Tu peux utiliser :

- référencement ;
- visibilité sur Google ;
- recherches locales ;
- visibilité locale ;
- moteurs de recherche ;
- assistants basés sur l'intelligence artificielle ;
- outils d'IA ;
- contenus.

Évite le jargon.

Ne parle pas de :

- canonical ;
- schema.org ;
- SERP ;
- JSON-LD ;
- CTA ;
- Core Web Vitals ;
- Open Graph.

==================================================
TON
==================================================

Le ton doit être :

- humain ;
- professionnel ;
- naturel ;
- cordial ;
- sobre ;
- personnalisé ;
- calme ;
- respectueux du site existant.

Pas de ton consultant.

Pas de ton commercial agressif.

Pas de formulation ressemblant à une IA.

Le mail ne doit pas exposer la mécanique commerciale utilisée pour le construire.

Évite donc les formulations comme :

"Ma proposition est..."

"Mon approche consiste à..."

"Cette proposition se déroule..."

"Dans un premier temps, je vous propose..."

Présente directement les pistes de façon naturelle.

==================================================
DÉBUT DU MAIL
==================================================

Ne commence jamais par :

"Je me permets de vous contacter"

"Suite à un audit de votre site"

"Dans le cadre de notre activité"

"Nous accompagnons..."

"Votre site présente plusieurs problèmes"

Privilégie :

"Bonjour,

J'ai récemment pris le temps de parcourir le site de [Entreprise]."

Puis un constat positif réel et bref.

==================================================
OBJET
==================================================

L'objet doit être simple et peu commercial.

Exemples :

"Quelques pistes pour le site de [Entreprise]"

"Une idée pour le site de [Entreprise]"

"À propos du site de [Entreprise]"

"Une piste pour votre site"

Évite :

"Audit de votre site"

"Proposition commerciale"

"Optimisation SEO"

"Refonte de votre site"

"Boostez votre visibilité"

==================================================
PIÈCE JOINTE
==================================================

Une pièce jointe est ${
      hasAttachment
        ? "PRÉSENTE."
        : "ABSENTE."
    }

${
  hasAttachment
    ? `
Le document est déjà joint.

Tu peux l'annoncer si cela est cohérent avec son rôle.

Pour une optimisation :

"Je vous joins une courte synthèse pour illustrer plus concrètement ces quelques constats."

Pour optimisation + refonte ou refonte :

Tu peux également évoquer une piste visuelle si le document correspond effectivement à une projection.

Ne dis jamais :

"Je peux vous la montrer."

"Je peux vous l'envoyer."
`
    : `
Aucune pièce jointe n'est disponible.

Ne prétends jamais qu'un document est joint.

Le mail doit fonctionner parfaitement seul.
`
}

==================================================
STRUCTURE DU MAIL
==================================================

Le mail doit suivre une progression naturelle :

1. Bonjour.
2. Une phrase montrant que le site a réellement été parcouru.
3. Un constat positif et sincère sur l'existant.
4. Un ou deux paragraphes courts présentant naturellement les améliorations identifiées.
5. La proposition commerciale choisie, intégrée au texte sans annoncer une méthodologie ou un plan.
6. Une conclusion légère ouvrant la discussion.

Ne transforme jamais les points 4 et 5 en listes à puces.

${
  proposalType ===
  "optimization_redesign"
    ? `
RÈGLE SUPPLÉMENTAIRE OBLIGATOIRE POUR CE MAIL :

Le contenu doit comporter DEUX DIMENSIONS commerciales, mais elles doivent s'enchaîner naturellement.

A. expliquer qu'une optimisation ciblée peut déjà améliorer la visibilité et/ou l'efficacité du site ;

B. ajouter ensuite une phrase ou un court paragraphe indiquant qu'il est également possible d'aller plus loin en faisant évoluer plus globalement la présentation, l'organisation ou la mise en valeur des prestations.

La partie B ne doit jamais disparaître lors de la rédaction.

La partie B ne doit jamais présenter la refonte comme obligatoire.

N'annonce jamais cette progression par une phrase comme :

"Notre proposition se déroule en deux temps."

"Je vous propose deux étapes."

"L'approche comporte deux volets."

"Dans un premier temps, nous..."

Fais simplement suivre l'optimisation par une transition naturelle :

"Et si vous souhaitez aller plus loin..."

"Cela peut aussi être l'occasion..."

"Ces améliorations peuvent également être l'occasion..."

Avant de retourner ton JSON, vérifie explicitement que emailContent contient bien :

- l'optimisation comme réponse concrète aux constats ;
- l'évolution/refonte comme possibilité complémentaire ;
- aucune présentation artificielle en "deux temps" ;
- aucune bascule de "je" vers "nous".

Si l'une de ces conditions n'est pas respectée, réécris emailContent avant de répondre.
`
    : ""
}

==================================================
FIN DU MAIL
==================================================

Le but est d'ouvrir une discussion.

Exemples :

"Si ces quelques pistes retiennent votre attention, je serais ravi d'en échanger avec vous."

"Si cette approche vous semble pertinente, je serais ravi d'en discuter avec vous."

Ne force jamais un rendez-vous.

==================================================
LONGUEUR
==================================================

Environ 130 à 190 mots.

Le message doit rester rapide à lire.

==================================================
SIGNATURE
==================================================

Ne génère aucune signature.

LBMedia Office l'ajoutera lors de l'envoi.

Ne termine pas par :

"Cordialement"

"Bien cordialement"

"À bientôt"

==================================================
ANGLE COMMERCIAL INTERNE
==================================================

L'angle commercial doit résumer :

- le principal constat ;
- la recommandation automatique ;
- le choix commercial retenu ;
- le bénéfice potentiel.

Si le choix est "Optimisation + refonte", indique clairement que l'optimisation répond au besoin immédiat et que la refonte constitue une possibilité complémentaire pour aller plus loin.

==================================================
FORMAT DE SORTIE
==================================================

Retourne UNIQUEMENT cet objet JSON valide :

{
  "salesAngle": "Angle commercial interne en une ou deux phrases.",
  "subject": "Objet naturel et personnalisé",
  "emailContent": "Corps complet du mail sans signature."
}
`.trim();

    const completion =
      await openai.chat.completions.create({
        model:
          "gpt-5-mini",

        messages: [
          {
            role:
              "system",

            content:
              "Tu écris pour LBMedia des prises de contact commerciales sobres, naturelles et personnalisées, à la première personne du singulier. Le diagnostic fourni reste factuel. La proposition commerciale choisie pilote réellement le contenu du message mais ne doit jamais conduire à inventer ou exagérer des défauts du site. Le mail final doit être fluide, ne jamais ressembler à une restitution technique d'audit et ne jamais exposer sa mécanique commerciale.",
          },
          {
            role:
              "user",

            content:
              prompt,
          },
        ],

        response_format: {
          type:
            "json_object",
        },
      });

    const content =
      completion
        .choices[0]
        ?.message
        ?.content;

    if (!content) {
      throw new Error(
        "OpenAI n’a retourné aucune prospection."
      );
    }

    let parsed: unknown;

    try {
      parsed =
        JSON.parse(
          content
        );
    } catch {
      throw new Error(
        "Impossible de lire le résultat retourné par OpenAI."
      );
    }

    const generated =
      validateGeneratedProspection(
        parsed
      );

    const {
      data: updated,
      error:
        updateError,
    } = await supabaseAdmin
      .from(
        "audit_prospections"
      )
      .update({
        proposal_type:
          proposalType,

        sales_angle:
          generated.salesAngle,

        subject:
          generated.subject,

        email_content:
          generated.emailContent,

        status:
          "ready",

        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "id",
        prospection.id
      )
      .select(
        `
          id,
          company_id,
          website_audit_id,
          status,
          proposal_type,
          recipient_email,
          recipient_name,
          subject,
          email_content,
          sales_angle,
          attachment_url,
          sent_at,
          follow_up_at,
          replied_at,
          created_at,
          updated_at
        `
      )
      .single();

    if (
      updateError
    ) {
      throw new Error(
        `Impossible d’enregistrer la prospection générée : ${updateError.message}`
      );
    }

    return NextResponse.json({
      success: true,

      prospection:
        updated,
    });
  } catch (error) {
    console.error(
      "Audit prospection generation error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Une erreur est survenue pendant la génération de la prospection.",
      },
      {
        status: 500,
      }
    );
  }
}