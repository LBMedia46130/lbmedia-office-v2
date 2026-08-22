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

Le mail doit valoriser la base actuelle.

Il doit expliquer que des améliorations ciblées peuvent être apportées sans remettre en cause l'ensemble du site.

Les pistes peuvent concerner :

- SEO ;
- SEO local ;
- GEO / visibilité IA ;
- contenus ;
- structuration des prestations ;
- conversion ;
- prise de contact.

Le corps du mail doit clairement proposer une OPTIMISATION.

Il ne doit proposer ni refonte ni nouveau site.
`.trim();

    case "optimization_redesign":
      return `
La proposition commerciale choisie est OPTIMISATION + REFONTE.

Le mail doit contenir DEUX DIMENSIONS visibles mais intégrées naturellement au texte.

1. OPTIMISATION

Explique que des optimisations ciblées peuvent déjà améliorer :

- la visibilité ;
- les contenus ;
- la présentation des prestations ;
- la prise de contact ;
- l'efficacité commerciale.

2. ÉVOLUTION / REFONTE

Le mail doit ensuite ouvrir explicitement la possibilité d'aller plus loin avec une évolution plus globale de la présentation ou de l'organisation du site.

Cette seconde dimension est OBLIGATOIRE.

Si l'audit recommande uniquement une optimisation, ne prétends jamais qu'une refonte est nécessaire.

Présente-la comme une possibilité complémentaire.

Par exemple :

"Quelques optimisations ciblées pourraient déjà renforcer la visibilité et l'efficacité du site."

Puis naturellement :

"Et si vous souhaitez aller plus loin, cela peut aussi être l'occasion de faire évoluer plus globalement sa présentation et son organisation afin de mieux mettre en valeur vos différentes prestations."

Ne présente jamais cette logique comme une proposition "en deux temps".

Le mail doit rester naturel.
`.trim();

    case "redesign":
      return `
La proposition commerciale choisie est une REFONTE DU SITE EXISTANT.

C'est cette orientation qui doit apparaître clairement dans le corps du mail.

Même si le diagnostic automatique recommande seulement une optimisation, LBMedia souhaite ici proposer une évolution plus globale du site.

IMPORTANT :

Tu ne dois pas inventer de défauts.

Tu dois partir des constats réels et expliquer qu'ils pourraient être traités dans le cadre d'une évolution plus globale de la présentation, de l'organisation et de la mise en valeur des prestations.

Le mail doit clairement contenir une idée équivalente à :

"Une évolution plus globale du site pourrait permettre de travailler ces différents points de manière cohérente, tout en faisant évoluer sa présentation et la manière dont vos prestations sont mises en valeur."

ou :

"Plutôt que de traiter ces différents points séparément, il pourrait être intéressant de profiter de ces améliorations pour faire évoluer plus largement la présentation et l'organisation du site."

Le mot "refonte" n'est pas obligatoire.

En revanche, l'idée d'une ÉVOLUTION GLOBALE DU SITE est obligatoire.

Le mail est incorrect s'il se limite à proposer quelques optimisations ponctuelles.

Ne critique jamais brutalement le site.

Ne dis jamais :

"Votre site est vieux."

"Votre site est dépassé."

"Votre site est mal conçu."

La refonte doit être présentée comme une opportunité d'amélioration globale, pas comme une sanction.
`.trim();

    case "new_website":
      return `
La proposition commerciale choisie est la CRÉATION D'UN NOUVEAU SITE.

Cette orientation doit apparaître clairement dans le corps du mail.

Même si le diagnostic automatique est moins sévère, LBMedia souhaite ici ouvrir la possibilité de repartir sur une nouvelle base.

IMPORTANT :

Tu ne dois jamais inventer de défauts pour justifier cette proposition.

Tu dois distinguer :

- les constats objectifs issus de l'audit ;
- la possibilité commerciale de repartir sur une base plus actuelle pour aller plus loin.

Le mail doit obligatoirement contenir une idée équivalente à :

"Si vous souhaitez aller plus loin, il pourrait également être intéressant d'envisager un nouveau site, pensé dès le départ autour de vos prestations, de votre visibilité et de la prise de contact."

ou :

"Une autre possibilité serait de repartir sur une nouvelle base afin d'intégrer dès le départ ces différents enjeux dans un site plus cohérent et plus directement orienté vers vos objectifs actuels."

Le mail est incorrect s'il se limite à parler d'optimisation ou d'évolution ponctuelle.

La création d'un NOUVEAU SITE doit être identifiable sans ambiguïté.

Ne dis jamais :

"Votre site est mauvais."

"Il faut tout refaire."

"Votre site doit être remplacé."

Présente cette piste comme une possibilité commerciale ambitieuse, pas comme une obligation.
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

function normalizeText(
  value: string
): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    );
}

function hasAny(
  value: string,
  expressions: string[]
): boolean {
  const normalized =
    normalizeText(value);

  return expressions.some(
    (expression) =>
      normalized.includes(
        normalizeText(
          expression
        )
      )
  );
}

function matchesProposalType(
  generated: GeneratedProspection,
  proposalType: ProposalType
): boolean {
  const email =
    generated.emailContent;

  if (
    proposalType ===
    "optimization"
  ) {
    return hasAny(
      email,
      [
        "optimisation",
        "optimisations",
        "ameliorations ciblees",
        "ajustements",
      ]
    );
  }

  if (
    proposalType ===
    "optimization_redesign"
  ) {
    const hasOptimization =
      hasAny(
        email,
        [
          "optimisation",
          "optimisations",
          "ameliorations ciblees",
          "ajustements",
        ]
      );

    const hasRedesign =
      hasAny(
        email,
        [
          "faire evoluer",
          "evolution plus globale",
          "evolution globale",
          "refonte",
          "presentation et l'organisation",
          "presentation et organisation",
        ]
      );

    return (
      hasOptimization &&
      hasRedesign
    );
  }

  if (
    proposalType ===
    "redesign"
  ) {
    return hasAny(
      email,
      [
        "refonte",
        "evolution plus globale",
        "evolution globale",
        "faire evoluer plus largement",
        "faire evoluer le site",
        "presentation et l'organisation",
        "presentation et organisation",
      ]
    );
  }

  return hasAny(
    email,
    [
      "nouveau site",
      "nouvelle base",
      "repartir sur une nouvelle base",
      "repartir sur une base",
      "creer un nouveau site",
      "creation d'un nouveau site",
    ]
  );
}

function getCorrectionInstruction(
  proposalType: ProposalType
): string {
  switch (
    proposalType
  ) {
    case "optimization":
      return `
Le message précédent ne fait pas suffisamment apparaître l'orientation OPTIMISATION.

Réécris-le afin que le prospect comprenne clairement que des optimisations ciblées du site existant sont proposées.

Ne propose ni refonte ni nouveau site.
`.trim();

    case "optimization_redesign":
      return `
Le message précédent ne respecte pas suffisamment l'orientation OPTIMISATION + REFONTE.

Réécris-le.

Le corps du mail doit obligatoirement :

1. proposer des optimisations concrètes du site existant ;
2. ouvrir ensuite clairement la possibilité d'une évolution plus globale de la présentation ou de l'organisation du site.

La deuxième partie doit apparaître dans le mail réellement envoyé.

Elle ne doit pas présenter la refonte comme obligatoire.

N'utilise pas une formulation artificielle du type "notre proposition se déroule en deux temps".
`.trim();

    case "redesign":
      return `
Le message précédent ne fait pas suffisamment apparaître l'orientation REFONTE.

Réécris-le.

Le corps du mail doit clairement ouvrir sur une évolution plus globale du site, de sa présentation et/ou de son organisation.

Il ne doit pas se limiter à quelques optimisations ponctuelles.

Ne falsifie aucun constat de l'audit et ne critique pas brutalement le site.

Présente cette évolution comme une manière cohérente d'aller plus loin.
`.trim();

    case "new_website":
      return `
Le message précédent ne fait pas suffisamment apparaître la proposition de CRÉATION D'UN NOUVEAU SITE.

Réécris-le.

Le corps du mail doit explicitement présenter comme possibilité le fait de repartir sur une nouvelle base ou d'envisager un nouveau site.

Ne dis pas que le site actuel est mauvais.

Ne prétends pas que cette solution est obligatoire.

Mais la possibilité d'un NOUVEAU SITE doit être parfaitement identifiable dans le texte envoyé au prospect.
`.trim();
  }
}

async function generateWithOpenAI(
  prompt: string,
  correctionPrompt?: string
): Promise<GeneratedProspection> {
  const messages: {
    role:
      | "system"
      | "user"
      | "assistant";
    content: string;
  }[] = [
    {
      role:
        "system",

      content:
        "Tu écris pour LBMedia des prises de contact commerciales sobres, naturelles et personnalisées, à la première personne du singulier. Le diagnostic fourni reste factuel. La proposition commerciale choisie doit réellement apparaître dans le corps du message sans conduire à inventer ou exagérer des défauts du site. Le mail final doit être fluide, naturel et ne jamais ressembler à une restitution technique d'audit.",
    },
    {
      role:
        "user",

      content:
        prompt,
    },
  ];

  if (
    correctionPrompt
  ) {
    messages.push({
      role:
        "user",

      content:
        correctionPrompt,
    });
  }

  const completion =
    await openai.chat.completions.create({
      model:
        "gpt-5-mini",

      messages,

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

  return validateGeneratedProspection(
    parsed
  );
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
          after_image_url,
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

    const previousProposalType =
      isProposalType(
        prospection.proposal_type
      )
        ? prospection.proposal_type
        : null;

    const proposalTypeChanged =
      previousProposalType !==
      null &&
      previousProposalType !==
        proposalType;

    /*
     * Les assets visuels sont liés
     * au choix commercial.
     *
     * Si l'angle change :
     * - l'ancienne projection visuelle
     *   devient obsolète ;
     * - l'ancien PDF devient obsolète.
     *
     * En optimisation seule :
     * - aucune projection n'est nécessaire ;
     * - aucun PDF ne doit rester associé.
     */
    const shouldInvalidateVisualAssets =
      proposalTypeChanged ||
      proposalType ===
        "optimization";

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

    /*
     * Un ancien PDF ne doit jamais
     * influencer la rédaction si
     * l'angle commercial vient de
     * changer ou si l'on passe en
     * optimisation seule.
     */
    const hasAttachment =
      !shouldInvalidateVisualAssets &&
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

Ensuite, LBMedia a choisi librement une PROPOSITION COMMERCIALE à adresser au prospect.

Le diagnostic et la proposition commerciale sont deux notions différentes.

==================================================
RÈGLE ABSOLUE
==================================================

Le diagnostic automatique constitue la vérité sur les constats.

La proposition commerciale choisie constitue l'orientation du message.

Tu dois respecter LES DEUX.

Tu ne dois jamais inventer ou amplifier un défaut afin de justifier la proposition commerciale.

En revanche, le choix commercial demandé doit réellement apparaître dans le corps du mail.

Un message qui ignore la proposition commerciale choisie est incorrect.

==================================================
COHÉRENCE DE LA VOIX
==================================================

Le mail est écrit à la première personne du singulier.

Utilise "je" lorsqu'une intervention personnelle est nécessaire.

Ne bascule pas de "je" vers "nous".

Évite :

"Nous pouvons..."

"Nous vous proposons..."

"Notre proposition..."

"Notre approche..."

Présente directement les pistes.

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
Cette différence est volontaire.

Le diagnostic ne doit pas être falsifié.

Mais le choix commercial doit néanmoins apparaître clairement dans le message.

Distingue simplement :

- les améliorations objectivement utiles ;
- la solution plus large qui peut être proposée pour aller plus loin.
`
    : ""
}

==================================================
INSTRUCTIONS OBLIGATOIRES POUR CETTE PROPOSITION
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
POINTS FORTS
==================================================

${formatList(
  audit.strengths
)}

==================================================
RÉDACTION DES CONSTATS
==================================================

Choisis seulement deux ou trois éléments réellement pertinents.

Les listes ci-dessus sont uniquement des données internes.

Ne reproduis jamais ces listes dans l'email.

Transforme les observations en paragraphes naturels.

N'utilise pas :

"conséquence :"

"problème :"

"faiblesse :"

"point faible :"

Le prospect doit sentir que son site a été réellement parcouru.

==================================================
SEO / SEO LOCAL / GEO-IA
==================================================

Tu peux parler simplement de :

- référencement ;
- visibilité Google ;
- recherches locales ;
- visibilité locale ;
- moteurs de recherche ;
- assistants basés sur l'intelligence artificielle ;
- contenus.

Évite tout jargon inutile.

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
- respectueux de l'existant.

Pas de ton consultant.

Pas de ton commercial agressif.

==================================================
STRUCTURE
==================================================

Le mail doit comporter :

1. Bonjour.
2. Une phrase montrant que le site a réellement été parcouru.
3. Un constat positif réel.
4. Un ou deux paragraphes courts présentant les améliorations intéressantes.
5. La proposition commerciale choisie.
6. Une conclusion légère.

Le point 5 est obligatoire.

Pour cette génération, la proposition commerciale choisie est :

${proposalLabel}

Le corps du mail doit donc être réellement différent d'un message généré avec une autre proposition commerciale.

==================================================
OBJET
==================================================

L'objet doit être court, humain et peu commercial.

Exemples :

"Quelques pistes pour le site de ${company.name}"

"Une idée pour le site de ${company.name}"

"À propos du site de ${company.name}"

Évite :

"Audit de votre site"

"Proposition commerciale"

"Optimisation SEO"

"Boostez votre visibilité"

==================================================
PIÈCE JOINTE
==================================================

Une pièce jointe compatible avec cette proposition est ${
      hasAttachment
        ? "PRÉSENTE."
        : "ABSENTE."
    }

${
  proposalType ===
  "optimization"
    ? `
Cette prospection porte uniquement sur l'optimisation du site existant.

Aucun PDF n'est nécessaire.

Ne mentionne aucune pièce jointe dans le mail.
`
    : hasAttachment
      ? `
Le document est déjà joint et correspond à l'angle commercial actuel.

Tu peux le mentionner si cela est pertinent.

Ne dis jamais :

"Je peux vous l'envoyer."

"Je peux vous la montrer."
`
      : `
Aucune pièce jointe compatible avec l'angle commercial actuel n'est disponible au moment de la rédaction.

Ne prétends jamais qu'un document est joint.

Le mail doit fonctionner parfaitement seul.

Une projection pourra être générée ensuite dans LBMedia Office avant l'envoi.
`
}

==================================================
FIN
==================================================

Le but est uniquement d'ouvrir une discussion.

Tu peux terminer par :

"Si ces quelques pistes retiennent votre attention, je serais ravi d'en échanger avec vous."

ou une formulation équivalente.

Ne force jamais un rendez-vous.

==================================================
LONGUEUR
==================================================

Environ 130 à 190 mots.

==================================================
SIGNATURE
==================================================

Ne génère aucune signature.

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

    let generated =
      await generateWithOpenAI(
        prompt
      );

    if (
      !matchesProposalType(
        generated,
        proposalType
      )
    ) {
      generated =
        await generateWithOpenAI(
          prompt,
          getCorrectionInstruction(
            proposalType
          )
        );
    }

    if (
      !matchesProposalType(
        generated,
        proposalType
      )
    ) {
      throw new Error(
        `La prospection générée ne respecte pas suffisamment l’angle « ${proposalLabel} ». Merci de relancer la génération.`
      );
    }

    const updatePayload: {
      proposal_type: ProposalType;
      sales_angle: string;
      subject: string;
      email_content: string;
      status: "ready";
      updated_at: string;
      after_image_url?: null;
      attachment_url?: null;
    } = {
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
    };

    /*
     * Invalidation automatique :
     *
     * - changement d'angle :
     *   projection + PDF supprimés
     *   de la prospection ;
     *
     * - optimisation seule :
     *   projection + PDF toujours
     *   supprimés, car inutiles.
     *
     * La capture du site actuel
     * (before_image_url) est conservée :
     * elle pourra resservir si l'on
     * choisit ensuite un autre angle.
     */
    if (
      shouldInvalidateVisualAssets
    ) {
      updatePayload.after_image_url =
        null;

      updatePayload.attachment_url =
        null;
    }

    const {
      data: updated,
      error:
        updateError,
    } = await supabaseAdmin
      .from(
        "audit_prospections"
      )
      .update(
        updatePayload
      )
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
          before_image_url,
          after_image_url,
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

      proposalTypeChanged,

      assetsInvalidated:
        shouldInvalidateVisualAssets,

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