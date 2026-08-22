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

type GeneratedProspection = {
  salesAngle: string;
  subject: string;
  emailContent: string;
};

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
  _request: NextRequest,
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

    const prompt = `
Tu écris un premier email de prise de contact pour LBMedia.

LBMedia a réellement parcouru le site internet de l'entreprise et réalisé une analyse interne.

Cette analyse a ensuite été transformée en diagnostic commercial afin de déterminer la prestation la plus pertinente.

La recommandation n'est donc PAS choisie à l'avance.

Elle peut être :

- optimisation du site existant ;
- refonte du site existant ;
- création d'un nouveau site.

Tu dois respecter la recommandation fournie ci-dessous.

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
DIAGNOSTIC COMMERCIAL LBMEDIA
==================================================

RECOMMANDATION PRINCIPALE :

${recommendation.label}

TYPE INTERNE :

${recommendation.type}

JUSTIFICATION :

${commercialDiagnosis.commercial_summary}

DESCRIPTION DE LA RECOMMANDATION :

${recommendation.description}

VISIBILITÉ :

${commercialDiagnosis.visibility_score}/100

EFFICACITÉ DU SITE :

${commercialDiagnosis.website_effectiveness_score}/100

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
RÈGLE ESSENTIELLE
==================================================

Le mail doit partir des CONSTATS réellement observés.

Il ne doit jamais partir d'une prestation que LBMedia souhaite vendre.

Le raisonnement est :

CONSTATS
→ CONSÉQUENCES POSSIBLES
→ RECOMMANDATION ADAPTÉE

La prestation proposée doit donc être cohérente avec :

"${recommendation.label}"

Ne propose JAMAIS une refonte si la recommandation est une optimisation.

Ne propose JAMAIS un nouveau site si la recommandation est une refonte ou une optimisation.

Ne minimise pas non plus les problèmes si la recommandation indique qu'un nouveau site serait plus pertinent.

==================================================
OBJECTIF DU PREMIER EMAIL
==================================================

Le destinataire doit comprendre trois choses :

1. LBMedia a réellement regardé son site.
2. Deux ou trois points précis semblent pouvoir être améliorés.
3. Une piste adaptée à son cas peut être envisagée.

Le message ne doit PAS ressembler à un rapport technique.

Le mail doit être humain, simple et compréhensible par un dirigeant non spécialiste.

==================================================
UTILISATION DES FAIBLESSES
==================================================

Choisis seulement 2 ou 3 faiblesses pertinentes.

Privilégie celles qui ont une conséquence commerciale facile à comprendre.

Exemples :

FAIBLESSE INTERNE :
"Signal local incomplet et vocabulaire géographique limité."

FORMULATION EMAIL :
"Votre activité est bien présentée, mais certaines informations pourraient être davantage structurées pour aider votre site à ressortir sur les recherches réalisées dans votre secteur géographique."

---

FAIBLESSE INTERNE :
"Absence de pages services dédiées."

FORMULATION EMAIL :
"Certaines prestations gagneraient à disposer de contenus plus clairement identifiés afin d'être mieux comprises aussi bien par les visiteurs que par les moteurs de recherche."

---

FAIBLESSE INTERNE :
"Coordonnées de contact non détectées comme exploitables."

FORMULATION EMAIL :
"Quelques ajustements pourraient également rendre la prise de contact plus immédiate pour un visiteur intéressé."

==================================================
SEO / SEO LOCAL / GEO-IA
==================================================

Contrairement à l'ancien modèle de prospection, il est désormais possible de parler de visibilité.

Mais reste SIMPLE.

Tu peux employer naturellement :

- référencement ;
- visibilité sur Google ;
- recherches locales ;
- visibilité locale ;
- moteurs de recherche ;
- assistants basés sur l'intelligence artificielle ;
- outils d'IA ;
- contenus.

Évite le jargon technique.

Ne parle pas de :

- canonical ;
- schema.org ;
- SERP ;
- balises JSON-LD ;
- données structurées ;
- CTA ;
- Core Web Vitals ;
- Open Graph.

Transforme toujours ces notions en bénéfices compréhensibles.

==================================================
CAS : OPTIMISATION
==================================================

Si la recommandation est :

"Optimisation du site existant"

Le message doit valoriser le site existant.

Il doit clairement faire comprendre que LBMedia ne considère PAS qu'il faut repartir de zéro.

Exemples d'idées :

"Votre site constitue déjà une bonne base."

"Une refonte complète ne me semble pas nécessairement être la priorité."

"Quelques optimisations ciblées pourraient déjà permettre..."

"Il y aurait notamment quelque chose à faire sur la visibilité locale et la manière dont certaines prestations sont structurées."

==================================================
CAS : REFONTE
==================================================

Si la recommandation est :

"Refonte du site existant"

Le mail doit expliquer avec tact que le site possède des éléments intéressants mais que sa structure ou sa présentation limite aujourd'hui son efficacité.

Ne critique jamais brutalement le design.

Évite :

"Votre site est dépassé."

"Votre site est vieux."

"Votre site est mal conçu."

Privilégie :

"Le site présente bien votre activité, mais son organisation actuelle ne permet pas toujours de mettre immédiatement en avant les prestations les plus importantes."

"Une évolution plus globale de la présentation pourrait permettre..."

==================================================
CAS : NOUVEAU SITE
==================================================

Si la recommandation est :

"Création d’un nouveau site"

Le mail doit présenter cette idée comme une conclusion logique.

Ne dis jamais :

"Votre site est mauvais."

"Il faut tout refaire."

Privilégie :

"Les différents points relevés touchent à la fois la visibilité, la présentation de l'offre et le parcours de prise de contact. Dans ce contexte, repartir sur une base plus actuelle pourrait être plus pertinent qu'une succession de corrections ponctuelles."

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
- respectueux.

Écris comme une vraie personne de LBMedia qui a pris le temps de regarder le site.

Pas comme un consultant.

Pas comme une IA.

Pas comme un commercial agressif.

==================================================
DÉBUT DU MAIL
==================================================

Ne commence jamais par :

"Je me permets de vous contacter"

"Suite à un audit de votre site"

"Dans le cadre de notre activité"

"Nous accompagnons..."

"Votre site présente plusieurs problèmes"

Privilégie une entrée naturelle du type :

"Bonjour,

J'ai récemment pris le temps de parcourir le site de [Entreprise]."

Puis un constat positif réel.

==================================================
OBJET
==================================================

L'objet doit rester simple, humain et peu commercial.

Privilégie :

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
Une pièce jointe existe.

Tu peux l'annoncer dans le mail UNIQUEMENT si cela est cohérent avec la recommandation et le document joint.

Ne suppose pas automatiquement qu'il s'agit d'une projection graphique de refonte.

Utilise une formulation générique telle que :

"Je vous joins une courte synthèse pour illustrer plus concrètement ces quelques constats."

ou :

"J'ai résumé ces quelques pistes dans le document joint."

Ne dis pas :

"Je peux vous la montrer."

"Je peux vous l'envoyer."

Le document est déjà joint.
`
    : `
Aucune pièce jointe n'est disponible.

Ne prétends pas qu'un document est joint.

Le mail doit fonctionner parfaitement sans pièce jointe.
`
}

==================================================
FIN DU MAIL
==================================================

Le but est uniquement d'ouvrir une discussion.

Privilégie une fin légère :

"Si ces quelques pistes retiennent votre attention, je serais ravi d'en échanger avec vous."

"Si cette approche vous semble pertinente, je serais ravi d'en discuter avec vous."

"Si vous souhaitez que je vous explique plus précisément ce que j'ai relevé, nous pouvons bien sûr en échanger."

Ne force jamais un rendez-vous.

Ne demande pas une disponibilité de 15 minutes.

==================================================
LONGUEUR
==================================================

Environ 130 à 190 mots.

Le message peut être plus court si le contenu est naturellement complet.

Il ne doit jamais devenir un mini-audit.

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

L'angle commercial ne sera PAS envoyé au prospect.

Il doit résumer :

- le problème principal identifié ;
- la recommandation ;
- le bénéfice commercial potentiel.

Il doit être très concret.

Exemple :

"Le site est globalement sain mais sa visibilité locale est insuffisamment travaillée. Proposer une optimisation SEO local / GEO et quelques ajustements de conversion plutôt qu'une refonte."

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
              "Tu écris pour LBMedia des prises de contact commerciales sobres et personnalisées à partir d'un véritable diagnostic de site. Tu respectes impérativement la recommandation commerciale fournie : optimisation, refonte ou nouveau site. Tu transformes les observations techniques en conséquences simples et compréhensibles pour un dirigeant.",
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