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
    value === "optimization" ||
    value === "optimization_redesign" ||
    value === "redesign" ||
    value === "new_website"
  );
}

function requiresProposalPdf(
  proposalType: ProposalType
): boolean {
  return (
    proposalType ===
      "optimization_redesign" ||
    proposalType ===
      "redesign" ||
    proposalType ===
      "new_website"
  );
}

function getProposalLabel(
  proposalType: ProposalType
): string {
  switch (proposalType) {
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
  switch (proposalType) {
    case "optimization":
      return `
==================================================
ANGLE : AMÉLIORER LE SITE ACTUEL
==================================================

Le mail doit défendre une idée simple :

LE SITE ACTUEL CONSTITUE UNE BONNE BASE ET PEUT ÊTRE AMÉLIORÉ SANS ÊTRE REFAIT.

Après l'introduction personnalisée, entre directement dans cette logique.

Choisis seulement quelques améliorations réellement utiles parmi les constats disponibles.

Traduis-les en bénéfices compréhensibles :

- meilleure visibilité sur Google ;
- meilleure présence dans les recherches locales ;
- contenus plus clairs ;
- prestations mieux comprises ;
- parcours plus simple ;
- prise de contact facilitée ;
- meilleure adaptation aux nouveaux usages de recherche.

Ne restitue pas techniquement l'audit.

Le prospect doit comprendre :

"Mon site peut être plus performant sans avoir besoin d'être refait."

Une formulation naturelle équivalente à celle-ci doit apparaître :

"Votre site constitue déjà une bonne base et quelques optimisations ciblées pourraient permettre d'en améliorer la visibilité et l'efficacité sans remettre en cause l'ensemble."

INTERDIT :

- refonte ;
- nouveau site ;
- page blanche ;
- nouvelle base ;
- évolution globale de la présentation.

La conclusion doit ouvrir une discussion autour des améliorations prioritaires du SITE ACTUEL.
`.trim();

    case "optimization_redesign":
      return `
==================================================
ANGLE : AMÉLIORER L'EXISTANT ET MONTRER JUSQU'OÙ IL PEUT ÉVOLUER
==================================================

Le mail doit défendre cette idée :

LE SITE ACTUEL PEUT DÉJÀ ÊTRE OPTIMISÉ, MAIS CES AMÉLIORATIONS PEUVENT AUSSI ÊTRE L'OCCASION DE FAIRE ÉVOLUER PLUS LARGEMENT SA PRÉSENTATION.

Après l'introduction personnalisée, commence par les enjeux réellement identifiés :

- visibilité ;
- référencement local ;
- contenus ;
- compréhension des prestations ;
- parcours ;
- prise de contact.

Ne transforme pas cela en liste.

Explique naturellement qu'il existe des optimisations concrètes à apporter au site actuel.

Ensuite, ouvre le raisonnement :

ces améliorations peuvent aussi être l'occasion de faire évoluer plus globalement la présentation et l'organisation du site afin de mieux valoriser l'activité.

Le prospect doit comprendre :

"Je peux améliorer mon site actuel, et je peux aussi profiter de ces améliorations pour le faire évoluer davantage."

IMPORTANT :

La refonte n'est jamais présentée comme obligatoire.

Elle est une possibilité complémentaire.

Ne présente jamais la démarche comme :

"étape 1 / étape 2"

ou :

"en deux temps".

Le raisonnement doit rester naturel.
`.trim();

    case "redesign":
      return `
==================================================
ANGLE : REPENSER LE SITE EXISTANT
==================================================

Le mail doit défendre une idée claire :

LES CONTENUS ET L'IDENTITÉ EXISTENT, MAIS UNE NOUVELLE PRÉSENTATION ET UNE NOUVELLE ORGANISATION POURRAIENT MIEUX LES VALORISER.

Après l'introduction personnalisée, ne déroule PAS une série de corrections SEO ou techniques.

Regroupe les constats utiles en quelques enjeux compréhensibles :

- mieux raconter l'activité ;
- mieux mettre en valeur le savoir-faire ;
- rendre l'offre plus immédiatement compréhensible ;
- mieux rassurer ;
- renforcer la visibilité ;
- guider plus naturellement vers la prise de contact.

Puis fais découler la refonte de ce constat global.

Une idée équivalente doit apparaître naturellement :

"Plutôt que de traiter ces différents points séparément, il pourrait être intéressant de repenser plus globalement la présentation et l'organisation du site, tout en conservant votre identité et les contenus qui fonctionnent déjà."

Le prospect doit comprendre :

"On ne me propose pas de jeter mon site. On me montre comment son contenu pourrait être beaucoup mieux présenté."

IMPORTANT :

Ne transforme pas la refonte en accumulation d'optimisations.

Ne parle pas de page blanche.

Ne présente pas cela comme la création d'un nouveau site à partir de zéro.

INTERDIT :

"Votre site est vieux."

"Votre site est dépassé."

"Votre site est mal conçu."

"Il faut tout refaire."
`.trim();

    case "new_website":
      return `
==================================================
ANGLE : IMAGINER LE SITE À PARTIR D'UNE PAGE BLANCHE
==================================================

CET ANGLE DOIT ÊTRE NETTEMENT DIFFÉRENT DE LA REFONTE.

Le mail doit défendre cette idée :

PLUTÔT QUE D'ADAPTER L'ORGANISATION ACTUELLE, ON PEUT SE DEMANDER COMMENT LE SITE SERAIT CONÇU AUJOURD'HUI SI L'ON REPARTAIT D'UNE PAGE BLANCHE.

Cette idée doit arriver TRÈS TÔT dans le développement commercial.

Ne commence surtout pas par énumérer plusieurs optimisations du site actuel avant de proposer finalement un nouveau site.

Après une courte introduction personnalisée et un point positif réel, fais rapidement apparaître la réflexion sur une nouvelle conception.

Le raisonnement doit être :

1. l'entreprise possède une activité, une identité et des contenus réels ;
2. les usages du web et les enjeux de visibilité ont évolué ;
3. plutôt que d'ajouter progressivement des éléments à l'organisation actuelle, il peut être intéressant d'imaginer une nouvelle base conçue directement autour des objectifs actuels.

Le nouveau site peut notamment être pensé dès le départ autour :

- des prestations ;
- du savoir-faire ;
- de la clientèle ;
- de la zone géographique ;
- de la visibilité Google ;
- des recherches locales ;
- des nouveaux usages de recherche et des assistants IA ;
- de la confiance ;
- de la prise de contact.

ATTENTION :

Ces éléments sont des OBJECTIFS DE CONCEPTION.

Ne les transforme pas en catalogue d'anomalies du site actuel.

Une idée équivalente doit apparaître naturellement :

"En parcourant votre site, je me suis demandé s'il ne serait pas intéressant de repartir d'une page blanche et d'imaginer aujourd'hui un site construit dès le départ autour de vos prestations, de votre visibilité et de la prise de contact."

ou :

"Plutôt que d'ajouter progressivement de nouveaux éléments au site actuel, une autre piste serait d'imaginer une nouvelle base conçue directement autour de vos enjeux actuels."

Le prospect doit comprendre :

"On me propose d'imaginer ce que serait mon site s'il était conçu aujourd'hui."

CE N'EST PAS :

- une optimisation ;
- une modernisation ;
- une refonte plus poussée ;
- une série de corrections.

C'EST UNE NOUVELLE CONCEPTION.

Ne dénigre jamais le site actuel pour justifier cette proposition.
`.trim();
  }
}

function validateGeneratedProspection(
  value: unknown
): GeneratedProspection {
  if (
    !value ||
    typeof value !== "object"
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
    typeof data.salesAngle === "string"
      ? data.salesAngle.trim()
      : "";

  const subject =
    typeof data.subject === "string"
      ? data.subject.trim()
      : "";

  const emailContent =
    typeof data.emailContent === "string"
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

function containsForbiddenInternalLanguage(
  email: string
): boolean {
  return hasAny(
    email,
    [
      "analyse automatique",
      "diagnostic automatique",
      "recommandation automatique",
      "score de visibilité",
      "score d'efficacité",
      "priorités d'action internes",
      "faiblesses visibilité",
      "faiblesses du site",
    ]
  );
}

function containsArtificialProposalHeading(
  email: string
): boolean {
  const normalized =
    normalizeText(email);

  return (
    normalized.includes(
      "creation d'un nouveau site :"
    ) ||
    normalized.includes(
      "creation d’un nouveau site :"
    ) ||
    normalized.includes(
      "nouveau site :"
    ) ||
    normalized.includes(
      "refonte :"
    ) ||
    normalized.includes(
      "optimisation :"
    ) ||
    normalized.includes(
      "optimisation + refonte :"
    )
  );
}

function containsFutureAttachmentOffer(
  email: string
): boolean {
  return hasAny(
    email,
    [
      "je peux vous envoyer",
      "je peux vous l'envoyer",
      "je peux vous la montrer",
      "je peux vous montrer",
      "je peux vous transmettre",
      "je pourrais vous envoyer",
      "je pourrais vous montrer",
      "je pourrais vous transmettre",
    ]
  );
}

function mentionsAttachmentAlreadyPresent(
  email: string
): boolean {
  return hasAny(
    email,
    [
      "piece jointe",
      "document joint",
      "document en piece jointe",
      "vous trouverez en piece jointe",
      "jointe a ce message",
      "joint a ce message",
      "projection jointe",
      "piste jointe",
    ]
  );
}

function matchesProposalType(
  generated: GeneratedProspection,
  proposalType: ProposalType,
  expectsAttachment: boolean
): boolean {
  const email =
    generated.emailContent;

  if (
    containsForbiddenInternalLanguage(
      email
    )
  ) {
    return false;
  }

  if (
    containsArtificialProposalHeading(
      email
    )
  ) {
    return false;
  }

  if (
    expectsAttachment &&
    containsFutureAttachmentOffer(
      email
    )
  ) {
    return false;
  }

  if (
    expectsAttachment &&
    !mentionsAttachmentAlreadyPresent(
      email
    )
  ) {
    return false;
  }

  if (
    proposalType === "optimization"
  ) {
    const hasOptimization =
      hasAny(
        email,
        [
          "optimisation",
          "optimisations",
          "ameliorations ciblees",
          "ajustements",
          "site actuel",
          "sans remettre en cause",
        ]
      );

    const hasForbiddenBroaderProposal =
      hasAny(
        email,
        [
          "nouveau site",
          "page blanche",
          "nouvelle base",
          "refonte",
          "repenser globalement",
        ]
      );

    return (
      hasOptimization &&
      !hasForbiddenBroaderProposal
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
          "site actuel",
        ]
      );

    const hasEvolution =
      hasAny(
        email,
        [
          "faire evoluer",
          "evolution plus globale",
          "evolution globale",
          "refonte",
          "repenser plus globalement",
          "presentation et l'organisation",
          "presentation et organisation",
        ]
      );

    return (
      hasOptimization &&
      hasEvolution
    );
  }

  if (
    proposalType === "redesign"
  ) {
    const hasRedesign =
      hasAny(
        email,
        [
          "refonte",
          "repenser plus globalement",
          "repenser la presentation",
          "repenser l'organisation",
          "evolution plus globale",
          "evolution globale",
          "presentation et l'organisation",
          "presentation et organisation",
        ]
      );

    const looksLikeNewWebsite =
      hasAny(
        email,
        [
          "repartir d'une page blanche",
          "repartir d’une page blanche",
          "nouvelle conception",
          "nouveau site pense des le depart",
        ]
      );

    return (
      hasRedesign &&
      !looksLikeNewWebsite
    );
  }

  const hasNewWebsite =
    hasAny(
      email,
      [
        "nouveau site",
        "nouvelle base",
        "page blanche",
        "nouvelle conception",
        "pense des le depart",
        "concu des le depart",
        "repartir d'une page blanche",
        "repartir d’une page blanche",
      ]
    );

  return hasNewWebsite;
}

function getCorrectionInstruction(
  proposalType: ProposalType,
  expectsAttachment: boolean
): string {
  const commonCorrection = `
Le message précédent doit être réécrit.

RÈGLES ABSOLUES :

- ne mentionne jamais une "analyse automatique" ;
- ne mentionne jamais un "diagnostic automatique" ;
- ne révèle jamais le fonctionnement interne de LBMedia Office ;
- ne restitue pas les détails techniques bruts de l'audit ;
- traduis les constats techniques en enjeux simples et commerciaux ;
- n'utilise aucun intertitre du type "Refonte :", "Optimisation :" ou "Création d'un nouveau site :" dans le corps du mail ;
- le mail doit ressembler à un message personnel, pas à un rapport.
${
  expectsAttachment
    ? `
- lors de l'envoi, un PDF correspondant à cette proposition SERA JOINT au mail ;
- rédige donc le message comme si cette pièce jointe était déjà présente ;
- mentionne naturellement cette pièce jointe ;
- ne dis jamais que tu peux l'envoyer, la transmettre ou la montrer plus tard.
`
    : `
- cette proposition ne comporte aucun PDF ;
- ne mentionne aucune pièce jointe.
`
}
`.trim();

  switch (
    proposalType
  ) {
    case "optimization":
      return `
${commonCorrection}

ANGLE À RESPECTER :

Le site actuel constitue une bonne base.

Le mail doit proposer quelques optimisations ciblées permettant d'améliorer sa visibilité et son efficacité SANS le refaire.

Ne parle ni de refonte, ni de nouveau site, ni de page blanche.
`.trim();

    case "optimization_redesign":
      return `
${commonCorrection}

ANGLE À RESPECTER :

Le site actuel peut être optimisé.

Ces optimisations peuvent aussi être l'occasion, si le prospect souhaite aller plus loin, de faire évoluer plus globalement la présentation et l'organisation du site.

Les deux idées doivent être présentes naturellement.

La refonte n'est pas obligatoire.
`.trim();

    case "redesign":
      return `
${commonCorrection}

ANGLE À RESPECTER :

Ne rédige pas un catalogue de petites optimisations.

Pars de quelques enjeux réels et explique qu'ils pourraient être traités de manière cohérente en repensant plus globalement la présentation et l'organisation du site.

Il s'agit d'une REFONTE DU SITE EXISTANT.

Les contenus, l'identité et les éléments utiles sont conservés.

Ne parle pas de repartir d'une page blanche.
`.trim();

    case "new_website":
      return `
${commonCorrection}

ANGLE À RESPECTER :

Le message précédent reste trop proche d'une refonte ou d'un catalogue d'optimisations.

La notion de NOUVELLE CONCEPTION doit apparaître très tôt.

Après une courte introduction personnalisée, introduis rapidement l'idée :

plutôt que d'ajouter progressivement de nouveaux éléments au site actuel, il peut être intéressant d'imaginer ce que serait aujourd'hui un site conçu à partir d'une page blanche autour des prestations, de la visibilité et de la prise de contact.

Ne présente PAS d'abord une série d'optimisations avant d'ajouter "nouveau site" à la fin.

Le nouveau site constitue le raisonnement central du mail.
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
        "Tu écris pour LBMedia des prises de contact commerciales sobres, naturelles et personnalisées, à la première personne du singulier. Le prospect ne doit jamais savoir qu'un diagnostic ou une analyse automatique existe. Les données d'audit servent uniquement de matière interne. Traduis-les en enjeux simples et compréhensibles. La proposition commerciale choisie doit déterminer tout le raisonnement du message, pas seulement une phrase ajoutée à la fin. N'utilise jamais d'intertitres artificiels comme « Refonte : », « Optimisation : » ou « Création d'un nouveau site : ». Le mail doit ressembler à un message réellement écrit après avoir parcouru le site.",
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

    const shouldInvalidateVisualAssets =
      proposalTypeChanged ||
      proposalType ===
        "optimization";

    const expectsAttachment =
      requiresProposalPdf(
        proposalType
      );

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

    const recommendation =
      commercialDiagnosis
        .recommendation;

    const differsFromRecommendation =
      proposalType !==
      recommendation.type;

    const prompt = `
Tu écris un premier email de prise de contact pour LBMedia.

LBMedia a réellement parcouru le site internet de l'entreprise.

Les informations ci-dessous proviennent d'une analyse INTERNE.

Elles servent uniquement à t'aider à comprendre le site.

==================================================
CONFIDENTIALITÉ DU PROCESSUS INTERNE
==================================================

NE RÉVÈLE JAMAIS au prospect :

- qu'une analyse automatique a été réalisée ;
- qu'un diagnostic automatique existe ;
- qu'un score a été calculé ;
- qu'une recommandation automatique existe ;
- que les constats proviennent d'une IA ;
- qu'il existe des catégories internes de faiblesses ;
- qu'il existe des priorités d'action internes.

Ne dis jamais :

"J'ai réalisé une analyse automatique."

"Notre diagnostic montre..."

"L'audit automatique..."

"Votre score..."

"Selon notre analyse automatique..."

Le prospect doit simplement sentir que son site a été réellement parcouru et compris.

==================================================
RÈGLE ABSOLUE
==================================================

Les constats internes constituent la vérité factuelle.

La proposition commerciale choisie détermine L'ANGLE DU MAIL.

Tu ne dois jamais inventer ou amplifier un défaut afin de justifier cette proposition.

En revanche, tu ne dois PAS écrire un mail générique sur les améliorations puis ajouter la proposition choisie dans le dernier paragraphe.

L'angle choisi doit structurer tout le développement commercial.

==================================================
RÈGLE DE TRADUCTION COMMERCIALE
==================================================

NE RESTITUE PAS LES DONNÉES TECHNIQUES BRUTES.

Par exemple, évite dans un premier contact les formulations du type :

- "meta description" ;
- "schema LocalBusiness" ;
- "données structurées" ;
- "score GEO" ;
- "balises" ;
- "H1" ;
- "robots.txt" ;
- "sitemap" ;
- "description anglaise en français".

Traduis-les en enjeux compréhensibles.

Par exemple :

un problème de données locales peut devenir :

"renforcer la visibilité dans les recherches locales".

un problème de structure SEO peut devenir :

"mieux structurer certains contenus pour les moteurs de recherche".

un problème lié au GEO peut devenir :

"mieux préparer les contenus aux nouveaux usages de recherche et aux assistants IA".

Le mail doit parler des bénéfices, pas restituer un rapport technique.

==================================================
COHÉRENCE DE LA VOIX
==================================================

Le mail est écrit à la première personne du singulier.

Utilise "je".

Ne bascule pas vers "nous".

Évite :

"Nous pouvons..."

"Nous vous proposons..."

"Notre proposition..."

"Notre approche..."

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

Cible :
${company.target_audience ?? "Non renseignée"}

Zone géographique :
${company.geographic_area ?? "Non renseignée"}

==================================================
DIAGNOSTIC INTERNE — NE PAS NOMMER DANS LE MAIL
==================================================

Recommandation interne :

${recommendation.label}

Justification interne :

${commercialDiagnosis.commercial_summary}

Visibilité :

${commercialDiagnosis.visibility_score}/100

Efficacité du site :

${commercialDiagnosis.website_effectiveness_score}/100

==================================================
PROPOSITION COMMERCIALE CHOISIE
==================================================

${proposalLabel}

La proposition choisie ${
      differsFromRecommendation
        ? "diffère volontairement de la recommandation interne."
        : "correspond à la recommandation interne."
    }

${
  differsFromRecommendation
    ? `
Cette différence ne doit jamais conduire à inventer des défauts.

Conserve les constats réels mais construis le raisonnement autour de l'orientation commerciale choisie.
`
    : ""
}

==================================================
ANGLE NARRATIF OBLIGATOIRE
==================================================

${proposalInstructions}

==================================================
CONSTATS INTERNES — VISIBILITÉ
==================================================

${formatList(
  commercialDiagnosis
    .weaknesses
    .visibility
)}

==================================================
CONSTATS INTERNES — SITE
==================================================

${formatList(
  commercialDiagnosis
    .weaknesses
    .website
)}

==================================================
ENJEUX INTERNES
==================================================

${formatList(
  commercialDiagnosis
    .main_issues
)}

==================================================
PRIORITÉS INTERNES
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
UTILISATION DES CONSTATS
==================================================

Sélectionne seulement les éléments réellement utiles à l'angle commercial.

Ne cherche pas à montrer au prospect tout ce que l'analyse a détecté.

Deux ou trois observations bien intégrées valent mieux qu'une liste exhaustive.

Transforme toujours les observations en prose naturelle.

N'utilise jamais les mots :

"faiblesse :"

"problème :"

"conséquence :"

"diagnostic :"

"score :"

==================================================
STRUCTURE DU MESSAGE
==================================================

1. "Bonjour,"
2. Une entrée personnalisée montrant que le site a réellement été parcouru.
3. Un élément positif réel.
4. Le développement correspondant directement à l'ANGLE NARRATIF choisi.
5. Lorsque pertinent, la présentation naturelle du document joint.
6. Une conclusion légère.

IMPORTANT :

Ne mets AUCUN intertitre dans le corps du mail.

INTERDIT notamment :

"Optimisation :"

"Refonte :"

"Création d'un nouveau site :"

"Notre proposition :"

"Quelques pistes :"

Le mail doit être constitué de paragraphes naturels.

==================================================
PIÈCE JOINTE
==================================================

${
  expectsAttachment
    ? `
Cette proposition commerciale comporte OBLIGATOIREMENT un PDF.

Le PDF peut ne pas encore avoir été généré techniquement au moment où tu rédiges ce texte.

Cela n'a aucune importance :

AU MOMENT DE L'ENVOI AU PROSPECT, LE PDF SERA JOINT.

Tu dois donc rédiger le mail comme si le document était déjà joint.

Tu dois mentionner naturellement cette pièce jointe.

Ne dis JAMAIS :

"Je peux vous l'envoyer."

"Je peux vous la montrer."

"Je peux vous transmettre une proposition."

"Je peux vous envoyer quelques pistes."

"Je pourrais vous envoyer..."

Le prospect recevra le mail ET le document ensemble.

Adapte la présentation du PDF à l'angle choisi :

${
  proposalType ===
  "optimization_redesign"
    ? `
Présente-le comme une piste concrète permettant d'illustrer jusqu'où le site pourrait évoluer.

Par exemple :

"Pour rendre cette idée plus concrète, j'ai imaginé une piste d'évolution que vous trouverez en pièce jointe."
`
    : proposalType ===
      "redesign"
      ? `
Présente-le comme une piste de refonte illustrative.

Par exemple :

"Pour rendre cette idée plus concrète, j'ai imaginé une piste de refonte que vous trouverez en pièce jointe. Il ne s'agit évidemment pas d'une maquette définitive, mais simplement d'une façon d'illustrer ce que pourrait apporter une nouvelle présentation."
`
      : `
Présente-le comme une première direction permettant d'illustrer ce que pourrait être une nouvelle conception.

Par exemple :

"Pour rendre cette réflexion plus concrète, j'ai imaginé une première direction visuelle que vous trouverez en pièce jointe. Elle ne constitue évidemment pas une maquette définitive, mais permet d'illustrer ce que pourrait donner cette nouvelle approche."
`
}
`
    : `
Cette proposition porte uniquement sur l'optimisation du site existant.

AUCUN PDF ne sera joint.

Ne mentionne aucune pièce jointe.

Ne propose pas non plus d'envoyer ultérieurement une maquette ou une projection.
`
}

==================================================
OBJET
==================================================

Objet court, humain et peu commercial.

Quelques exemples :

"Quelques pistes pour le site de ${company.name}"

"Une idée pour le site de ${company.name}"

"À propos du site de ${company.name}"

"Une piste pour ${company.name}"

Évite :

"Audit de votre site"

"Proposition commerciale"

"Optimisation SEO"

"Refonte de votre site"

"Création de votre nouveau site"

==================================================
CONCLUSION
==================================================

Le but est d'ouvrir une discussion.

Ne force pas un rendez-vous.

${
  expectsAttachment
    ? `
Le document sera déjà joint au mail.

Ne propose donc jamais de l'envoyer, de le transmettre ou de le montrer.

La conclusion doit inviter uniquement à échanger autour de la piste présentée.
`
    : `
Aucun document n'accompagne ce mail.

La conclusion doit inviter à échanger autour des optimisations possibles.
`
}

Tu peux utiliser une formulation naturelle du type :

"Si cette piste retient votre attention, je serais ravi d'en échanger avec vous."

Adapte légèrement la conclusion au contenu du mail.

==================================================
LONGUEUR
==================================================

Environ 140 à 200 mots.

==================================================
SIGNATURE
==================================================

Ne génère aucune signature.

==================================================
FORMAT
==================================================

Retourne UNIQUEMENT :

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
        proposalType,
        expectsAttachment
      )
    ) {
      generated =
        await generateWithOpenAI(
          prompt,
          getCorrectionInstruction(
            proposalType,
            expectsAttachment
          )
        );
    }

    if (
      !matchesProposalType(
        generated,
        proposalType,
        expectsAttachment
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