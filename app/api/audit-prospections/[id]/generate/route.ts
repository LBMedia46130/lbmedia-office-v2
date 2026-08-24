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
==================================================
ANGLE NARRATIF : AMÉLIORER CE QUI EXISTE
==================================================

La proposition choisie est une OPTIMISATION DU SITE EXISTANT.

IDÉE CENTRALE DU MAIL :

"Votre site constitue une base exploitable. Plusieurs améliorations ciblées pourraient maintenant lui permettre d'être plus visible et plus efficace."

Le mail doit partir de l'EXISTANT et de ses qualités.

Il doit donner le sentiment qu'il n'est absolument pas nécessaire de refaire le site pour obtenir des améliorations intéressantes.

Les constats de l'audit doivent conduire naturellement vers quelques actions ciblées, par exemple :

- améliorer le référencement ;
- renforcer la visibilité locale ;
- mieux structurer certaines pages ;
- mieux présenter les prestations ;
- enrichir ou clarifier certains contenus ;
- faciliter la prise de contact ;
- mieux préparer les contenus à la recherche via les assistants IA.

IMPORTANT :

Le mail doit clairement rassurer sur la conservation du site actuel.

Une formulation de ce type doit apparaître naturellement :

"Votre site constitue déjà une base intéressante et plusieurs optimisations pourraient être apportées sans remettre en cause l'ensemble."

ou une formulation équivalente.

INTERDICTIONS :

- ne parle pas de refonte ;
- ne parle pas de nouveau site ;
- ne parle pas de repartir sur une nouvelle base ;
- ne suggère pas qu'une évolution graphique globale serait nécessaire.

CONCLUSION COMMERCIALE :

La discussion proposée porte sur les améliorations prioritaires qui pourraient être apportées AU SITE ACTUEL.
`.trim();

    case "optimization_redesign":
      return `
==================================================
ANGLE NARRATIF : OPTIMISER, PUIS OUVRIR LE CHAMP
==================================================

La proposition choisie est OPTIMISATION + REFONTE.

IDÉE CENTRALE DU MAIL :

"Des optimisations concrètes sont possibles sur le site actuel, mais ces améliorations peuvent aussi être l'occasion d'envisager une évolution plus globale de sa présentation."

Le mail doit commencer par les améliorations objectivement identifiées lors de l'audit.

Il doit montrer qu'il existe des leviers immédiatement exploitables concernant par exemple :

- visibilité Google ;
- référencement local ;
- contenus ;
- présentation des prestations ;
- parcours ;
- prise de contact.

PUIS le mail doit changer légèrement de perspective.

Après avoir évoqué ces optimisations, ouvre explicitement une seconde possibilité :

profiter de ces améliorations pour faire évoluer plus largement la présentation et l'organisation du site.

Cette ouverture est importante mais elle ne doit jamais faire croire que la refonte est indispensable.

Une idée équivalente à celle-ci doit apparaître :

"Ces optimisations pourraient être réalisées sur le site actuel. Elles peuvent aussi être l'occasion, si vous souhaitez aller plus loin, de faire évoluer plus globalement sa présentation et la manière dont vos prestations sont mises en valeur."

IMPORTANT :

Le site actuel reste une base possible.

La refonte est une OPPORTUNITÉ COMPLÉMENTAIRE.

Le mail doit être perceptiblement différent de l'angle "Optimisation" :

- Optimisation = on améliore l'existant.
- Optimisation + refonte = on peut améliorer l'existant ET profiter de ces travaux pour aller plus loin.

Ne présente jamais cela comme un plan artificiel "en deux étapes" ou "en deux temps".
`.trim();

    case "redesign":
      return `
==================================================
ANGLE NARRATIF : REPENSER LA PRÉSENTATION DU SITE
==================================================

La proposition choisie est une REFONTE DU SITE EXISTANT.

IDÉE CENTRALE DU MAIL :

"Les contenus et l'activité sont là, mais une nouvelle organisation du site permettrait de mieux les mettre en valeur et de traiter plus globalement les enjeux identifiés."

Contrairement à l'angle Optimisation, le mail ne doit PAS être construit autour d'une liste de petites corrections à apporter.

Pars des constats de l'audit pour montrer qu'ils touchent plusieurs dimensions du site :

- compréhension de l'offre ;
- visibilité ;
- organisation ;
- hiérarchie ;
- valorisation des prestations ;
- parcours vers le contact.

Le raisonnement commercial doit être :

plutôt que de traiter chaque sujet séparément, une évolution plus globale du site permettrait de les travailler de manière cohérente.

Une idée de ce type doit apparaître clairement :

"Plutôt que de traiter ces différents points séparément, il pourrait être intéressant de repenser plus globalement la présentation et l'organisation du site afin de mieux valoriser vos prestations tout en intégrant les enjeux de visibilité identifiés."

IMPORTANT :

Une REFONTE signifie ici :

- conserver l'entreprise ;
- conserver ses contenus utiles ;
- conserver son identité pertinente ;
- mais repenser nettement la manière dont le site les présente et les organise.

Le mail doit donner envie de découvrir une AUTRE PRÉSENTATION DU SITE ACTUEL.

Il ne doit pas donner l'impression qu'on propose simplement quelques optimisations SEO.

INTERDICTIONS :

Ne dis jamais :

"Votre site est vieux."

"Votre site est dépassé."

"Votre site est mal conçu."

"Il faut refaire votre site."

Ne transforme jamais la refonte en sanction.

Elle doit apparaître comme une opportunité de mieux exploiter les contenus et l'activité déjà existants.
`.trim();

    case "new_website":
      return `
==================================================
ANGLE NARRATIF : REPARTIR D'UNE PAGE BLANCHE
==================================================

La proposition choisie est la CRÉATION D'UN NOUVEAU SITE.

CET ANGLE DOIT ÊTRE RADICALEMENT DIFFÉRENT DE L'ANGLE REFONTE.

IDÉE CENTRALE DU MAIL :

"Plutôt que d'adapter l'organisation actuelle, une autre piste serait de repartir d'une page blanche et de concevoir aujourd'hui un site directement autour de vos prestations, de votre visibilité et de la prise de contact."

Le mail ne doit PAS présenter cette solution comme une refonte plus importante.

Il s'agit d'une autre logique.

REFONTE :

on repense la présentation et l'organisation du site existant.

NOUVEAU SITE :

on se demande comment le site serait conçu AUJOURD'HUI si l'on repartait d'une page blanche à partir :

- de l'activité réelle de l'entreprise ;
- de ses prestations ;
- de ses priorités ;
- de sa clientèle ;
- de sa zone géographique ;
- des enjeux SEO ;
- du référencement local ;
- de la visibilité dans les moteurs et assistants IA ;
- de la conversion et de la prise de contact.

Le mail doit explicitement introduire cette idée de NOUVELLE CONCEPTION.

Une formulation équivalente à celle-ci doit obligatoirement apparaître :

"Une autre piste serait de repartir d'une page blanche et d'imaginer un nouveau site pensé dès le départ autour de vos prestations, de votre visibilité sur Google et des nouveaux usages de recherche, ainsi que de la prise de contact."

ou :

"Plutôt que de faire évoluer l'organisation actuelle, il pourrait être intéressant d'imaginer ce que serait aujourd'hui un nouveau site conçu dès le départ autour de vos objectifs."

IMPORTANT :

Ne justifie JAMAIS cette proposition en dénigrant le site actuel.

Le raisonnement n'est pas :

"Le site actuel est mauvais, donc il faut le remplacer."

Le raisonnement est :

"Les enjeux identifiés permettent d'imaginer une nouvelle base construite directement autour des objectifs actuels."

Le prospect doit comprendre sans ambiguïté qu'on lui propose de réfléchir à la CRÉATION D'UN NOUVEAU SITE.

INTERDICTIONS :

Ne présente pas cela comme :

- une simple optimisation ;
- une modernisation ;
- une évolution graphique ;
- une grosse refonte ;
- une accumulation de corrections.

Le concept de PAGE BLANCHE / NOUVELLE BASE / NOUVELLE CONCEPTION doit être présent.

La conclusion commerciale doit inviter à découvrir ou échanger autour de cette nouvelle direction.
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
        "repenser plus globalement",
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
      "page blanche",
      "nouvelle conception",
      "repartir d'une page blanche",
      "repartir sur une nouvelle base",
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

Le raisonnement doit être :

"Le site actuel constitue une base exploitable que l'on peut améliorer sans le refaire."

Ne propose ni refonte ni nouveau site.
`.trim();

    case "optimization_redesign":
      return `
Le message précédent ne respecte pas suffisamment l'orientation OPTIMISATION + REFONTE.

Réécris-le.

Le raisonnement doit être clairement différent d'une optimisation seule.

Le corps du mail doit :

1. montrer que des optimisations concrètes sont possibles sur le site existant ;
2. ouvrir ensuite naturellement la possibilité de profiter de ces améliorations pour faire évoluer plus globalement la présentation et l'organisation du site.

La refonte n'est pas obligatoire.

Elle constitue une possibilité complémentaire permettant d'aller plus loin.

N'utilise pas une formulation artificielle du type "notre proposition se déroule en deux temps".
`.trim();

    case "redesign":
      return `
Le message précédent ne fait pas suffisamment apparaître l'orientation REFONTE.

Réécris-le en changeant réellement son raisonnement commercial.

Le mail ne doit pas être une liste d'optimisations ponctuelles suivie du mot "refonte".

Pars des constats réels pour expliquer qu'ils pourraient être traités de manière cohérente en repensant plus globalement :

- la présentation ;
- l'organisation ;
- la hiérarchie ;
- la mise en valeur des prestations.

Le lecteur doit comprendre qu'on lui propose de repenser le SITE EXISTANT.

Ne falsifie aucun constat et ne dénigre jamais le site.
`.trim();

    case "new_website":
      return `
Le message précédent reste trop proche d'une proposition de REFONTE.

Réécris-le avec un raisonnement radicalement différent.

Le sujet n'est PAS de faire évoluer plus fortement le site actuel.

Le sujet est :

"Si ce site devait être conçu aujourd'hui à partir d'une page blanche, comment pourrait-il être pensé directement autour des prestations, de la visibilité, des nouveaux usages de recherche et de la prise de contact ?"

Le corps du mail doit explicitement parler :

- d'un NOUVEAU SITE ;
- ou d'une NOUVELLE BASE ;
- ou d'une conception à partir d'une PAGE BLANCHE.

Le prospect doit comprendre sans ambiguïté qu'il s'agit d'une nouvelle conception et non d'une grosse refonte.

Ne critique jamais le site actuel pour justifier cette proposition.
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
        "Tu écris pour LBMedia des prises de contact commerciales sobres, naturelles et personnalisées, à la première personne du singulier. Le diagnostic fourni reste factuel. La proposition commerciale choisie doit déterminer le raisonnement et la construction du message, pas seulement une phrase ajoutée à la fin. Deux types de propositions différents doivent produire deux approches commerciales perceptiblement différentes. Le mail final doit rester fluide, humain et ne jamais ressembler à une restitution technique d'audit.",
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

En revanche, le choix commercial demandé doit réellement déterminer le raisonnement du mail.

Il ne suffit PAS d'écrire un mail générique sur les optimisations puis d'ajouter la proposition choisie dans le dernier paragraphe.

Deux propositions commerciales différentes doivent produire deux messages dont l'approche est perceptiblement différente.

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

Mais le choix commercial doit néanmoins déterminer l'approche du message.

Distingue simplement :

- les constats objectivement établis ;
- l'orientation commerciale choisie pour y répondre.

Ne cherche jamais à rendre le diagnostic plus sévère pour justifier une solution plus ambitieuse.
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
STRUCTURE DU MESSAGE
==================================================

Le mail doit comporter :

1. Bonjour.
2. Une entrée montrant naturellement que le site a réellement été parcouru.
3. Un élément positif réel et personnalisé.
4. Le développement commercial correspondant à l'ANGLE NARRATIF imposé ci-dessus.
5. Une conclusion légère ouvrant la discussion.

IMPORTANT :

Il n'existe PAS de structure de corps de mail commune aux quatre propositions.

L'angle commercial doit influencer la construction même du message, et pas seulement une phrase ajoutée à la fin.

Pour cette génération :

${proposalLabel}

Le lecteur doit pouvoir comprendre l'orientation choisie en lisant le mail, même sans connaître le champ proposal_type.

Deux générations effectuées avec deux types de propositions différents doivent produire des raisonnements commerciaux perceptiblement différents.

==================================================
OBJET
==================================================

L'objet doit être court, humain et peu commercial.

L'objet peut lui aussi varier légèrement selon l'angle choisi.

Exemples possibles :

"Quelques pistes pour le site de ${company.name}"

"Une idée pour le site de ${company.name}"

"À propos du site de ${company.name}"

"Une piste pour ${company.name}"

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

Si tu le mentionnes, décris-le conformément à l'angle choisi :

- Optimisation + refonte : une piste d'évolution possible du site ;
- Refonte : une piste de refonte ou une autre manière d'organiser et présenter le site ;
- Nouveau site : une proposition de direction pour imaginer une nouvelle base ou un nouveau site.

Ne dis jamais :

"Je peux vous l'envoyer."

"Je peux vous la montrer."

Le document est déjà joint.
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

La conclusion doit rester cohérente avec l'angle choisi.

Elle peut proposer d'échanger :

- sur les optimisations prioritaires ;
- sur une évolution possible du site ;
- sur une piste de refonte ;
- sur une nouvelle direction pour le site.

Ne force jamais un rendez-vous.

Évite de terminer systématiquement tous les types de mails par exactement la même phrase.

==================================================
LONGUEUR
==================================================

Environ 140 à 210 mots.

Privilégie la fluidité du raisonnement à une longueur strictement uniforme entre les différents types de proposition.

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