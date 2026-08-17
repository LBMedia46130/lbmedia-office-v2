import {
  NextRequest,
  NextResponse,
} from "next/server";

import OpenAI from "openai";

import {
  getWebsiteAuditById,
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

    const prompt = `
Tu écris un premier email de prise de contact pour LBMedia.

Ce message est destiné à une entreprise dont LBMedia a réellement consulté le site internet et réalisé une analyse interne.

L'analyse sert uniquement à guider la réflexion de LBMedia.

Le destinataire ne doit JAMAIS avoir l'impression de recevoir :
- un rapport automatisé ;
- un audit technique ;
- une campagne de prospection générique ;
- un argumentaire commercial standard.

L'email doit donner l'impression qu'une personne de LBMedia a réellement regardé le site, remarqué une possibilité intéressante et pris le temps de préparer une petite projection visuelle personnalisée.

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
OBSERVATIONS INTERNES
==================================================

Site :
${audit.website_url}

Pages analysées :
${audit.pages_analyzed}

Score global :
${audit.global_score}/100

Positionnement :
${audit.positioning_score}/100

Conversion :
${audit.conversion_score}/100

SEO :
${audit.seo_score}/100

SEO local :
${audit.local_seo_score}/100

GEO / IA :
${audit.geo_score}/100

SYNTHÈSE :

${audit.summary}

POINTS FORTS :

${
  audit.strengths.length
    ? audit.strengths
        .map(
          (item) =>
            `- ${item}`
        )
        .join("\n")
    : "- Aucun élément renseigné"
}

POINTS PERFECTIBLES :

${
  audit.weaknesses.length
    ? audit.weaknesses
        .map(
          (item) =>
            `- ${item}`
        )
        .join("\n")
    : "- Aucun élément renseigné"
}

PRIORITÉS :

${
  audit.priorities.length
    ? audit.priorities
        .map(
          (item) =>
            `- ${item}`
        )
        .join("\n")
    : "- Aucune priorité renseignée"
}

LIMITES DE L'ANALYSE :

${
  audit.limitations.length
    ? audit.limitations
        .map(
          (item) =>
            `- ${item}`
        )
        .join("\n")
    : "- Aucune limitation renseignée"
}

==================================================
PIÈCE JOINTE
==================================================

Une projection visuelle est ${
      hasAttachment
        ? "DÉJÀ PRÉSENTE et sera jointe à cet email."
        : "prévue mais n'est pas encore disponible au moment de cette génération."
    }

${
  hasAttachment
    ? `
Le mail DOIT clairement annoncer que cette projection est jointe.

Le destinataire doit comprendre qu'il peut la consulter immédiatement.

Utilise naturellement une formulation comme :

"J'ai préparé une petite projection visuelle pour illustrer concrètement cette idée. Vous la trouverez en pièce jointe."

ou une formulation équivalente.

INTERDICTION ABSOLUE :

Ne jamais écrire :
- "je peux vous la montrer" ;
- "je peux vous envoyer une proposition" ;
- "si vous êtes curieux de voir ce que j'ai en tête" ;
- "je pourrais vous montrer" ;
- toute formulation laissant entendre que le document n'est pas encore joint.

Le document EST joint.
`
    : `
Ne prétends pas qu'une pièce jointe est présente.

Tu peux simplement indiquer qu'une piste concrète a été imaginée, sans promettre qu'elle est jointe.
`
}

==================================================
CE QUE TU DOIS PRODUIRE
==================================================

1. Un angle commercial INTERNE à LBMedia.
2. Un objet d'email.
3. Un email de premier contact.

==================================================
ANGLE COMMERCIAL
==================================================

L'angle commercial ne sera pas envoyé au prospect.

Il doit expliquer simplement à LBMedia :

- pourquoi ce prospect mérite d'être contacté ;
- quelle amélioration principale semble pertinente ;
- quel bénéfice potentiel peut être évoqué.

Choisis UN SEUL angle principal.

Ne transforme pas automatiquement chaque analyse en projet de refonte.

Une optimisation ciblée ou une meilleure présentation de l'existant peut être beaucoup plus pertinente.

==================================================
PHILOSOPHIE DE L'EMAIL
==================================================

Le mail doit être SIMPLE.

Il doit suivre cette logique :

1. Bonjour.
2. Expliquer naturellement que le site a été parcouru.
3. Commencer par un constat positif réel.
4. Évoquer UNE possibilité d'amélioration de manière simple.
5. Expliquer qu'une projection visuelle a été préparée.
6. Préciser qu'il s'agit seulement d'une piste de réflexion, pas d'une maquette définitive.
7. Terminer par une invitation très légère à échanger si cette approche retient l'attention.

Le mail ne doit PAS expliquer tout l'audit.

Le PDF montre une piste.

L'email donne simplement envie de regarder le PDF et éventuellement de répondre.

==================================================
TON DE RÉFÉRENCE
==================================================

Le ton doit être :

- humain ;
- professionnel ;
- naturel ;
- cordial ;
- sobre ;
- personnalisé ;
- calme ;
- respectueux du travail déjà réalisé.

Écris comme une vraie personne.

Pas comme un consultant.

Pas comme un commercial agressif.

Pas comme une IA.

Utilise des phrases simples et fluides.

==================================================
STRUCTURE DE RÉFÉRENCE
==================================================

La structure idéale ressemble à ceci :

"Bonjour,

J'ai récemment parcouru le site de [Entreprise] et pris le temps de regarder la manière dont [activité / offre] y est présentée.

[Constat positif réel et court.]

Je pense néanmoins qu'une présentation différente pourrait permettre de mieux mettre en valeur [UNE idée principale] et de rendre l'offre plus immédiatement lisible pour quelqu'un qui découvre l'entreprise.

Plutôt que de vous adresser un long discours, j'ai préparé une petite projection visuelle pour illustrer concrètement cette idée. Vous la trouverez en pièce jointe.

Il ne s'agit bien sûr pas d'une maquette définitive, simplement d'une piste de réflexion réalisée à partir de votre site actuel.

Si cette approche retient votre attention, je serais ravi d'en échanger avec vous."

IMPORTANT :

Ce texte est une RÉFÉRENCE DE TON ET DE STRUCTURE.

Ne le copie pas mot pour mot pour toutes les entreprises.

Adapte naturellement :
- le premier paragraphe ;
- le point positif ;
- la piste d'amélioration ;
- quelques formulations.

En revanche, conserve la sobriété et la logique générale.

==================================================
UTILISATION DES OBSERVATIONS
==================================================

Choisis seulement UNE idée principale issue de l'analyse.

Éventuellement, mentionne UN point positif.

Ne récite jamais plusieurs faiblesses ou plusieurs recommandations.

Ne fais jamais une liste technique.

Transforme les constats techniques en bénéfices compréhensibles.

Exemple :

INTERNE :
"Les services sont présents mais insuffisamment hiérarchisés."

EMAIL :
"Je pense qu'une présentation différente pourrait permettre de rendre les différentes prestations plus immédiatement lisibles pour quelqu'un qui découvre l'entreprise."

Exemple :

INTERNE :
"Les éléments de confiance sont peu visibles."

EMAIL :
"Il y aurait probablement quelque chose d'intéressant à faire pour mieux mettre en valeur l'expérience et les éléments qui rassurent un nouveau visiteur."

==================================================
CE QU'IL FAUT ÉVITER
==================================================

Ne commence jamais par :

"Je me permets de vous contacter"

"Dans le cadre de notre activité"

"Nous accompagnons..."

"Suite à un audit de votre site"

"Votre site présente plusieurs axes d'amélioration"

Ne parle jamais de :

- score ;
- note ;
- pré-audit ;
- diagnostic ;
- faiblesses ;
- problèmes ;
- leviers.

Évite dans le mail :

- conversion ;
- SEO ;
- GEO ;
- réassurance ;
- données structurées ;
- FAQ structurée ;
- optimisation sémantique ;
- parcours utilisateur ;
- CTA ;
- SERP ;
- canonical ;
- Open Graph.

Ces notions peuvent guider ton raisonnement interne mais ne doivent pas apparaître dans un premier mail commercial sauf nécessité exceptionnelle.

==================================================
NE PAS SURCHARGER LA PERSONNALISATION
==================================================

Ne cherche pas à prouver que tu connais tout de l'entreprise.

Évite les longues énumérations du type :

"votre hôtel 4 étoiles, votre restaurant gastronomique, votre spa, vos mariages, vos séminaires..."

Cela donne rapidement l'impression d'un texte construit automatiquement à partir du site.

Une ou deux références naturelles suffisent.

Le destinataire doit sentir que le site a été regardé, pas qu'il a été aspiré par un robot.

==================================================
OBJET DE L'EMAIL
==================================================

L'objet doit être :

- simple ;
- humain ;
- personnalisé ;
- court ;
- légèrement curieux ;
- non commercial.

PRIVILÉGIE fortement la structure :

"Une idée pour le site de [Nom de l'entreprise]"

Exemples acceptables :

"Une idée pour le site du Domaine de Beaulieu"

"Une idée pour votre site"

"Une piste pour le site de [Entreprise]"

L'objet ne doit pas essayer de vendre.

INTERDIT :

"Audit de votre site"

"Proposition commerciale"

"3 actions pour..."

"Améliorez..."

"Boostez..."

"Optimisez..."

"Votre visibilité"

"Votre SEO"

"Refonte de votre site"

"Votre site peut faire mieux"

==================================================
PARAGRAPHE SUR LA PROJECTION
==================================================

${
  hasAttachment
    ? `
Le mail doit comporter un paragraphe très proche dans l'esprit de :

"Plutôt que de vous adresser un long discours, j'ai préparé une petite projection visuelle pour illustrer concrètement cette idée. Vous la trouverez en pièce jointe."

Tu peux légèrement adapter cette formulation.

Mais les deux informations doivent être présentes :

1. une projection visuelle a été préparée ;
2. elle est en pièce jointe.
`
    : `
Une projection n'est pas encore jointe.

Ne mentionne donc pas explicitement de pièce jointe.
`
}

==================================================
CADRAGE DE LA PROJECTION
==================================================

Le mail doit préciser brièvement que le document n'est PAS une proposition définitive.

Formulation recommandée :

"Il ne s'agit bien sûr pas d'une maquette définitive, simplement d'une piste de réflexion réalisée à partir de votre site actuel."

Tu peux adapter légèrement.

Ne parle jamais de BAT.

Ne prétends pas que le futur site ressemblera nécessairement à cette projection.

==================================================
FIN DU MAIL
==================================================

La fin doit être cohérente avec le fait que le destinataire vient de recevoir la projection.

PRIVILÉGIE :

"Si cette approche retient votre attention, je serais ravi d'en échanger avec vous."

ou :

"Si cette piste vous semble intéressante, je serais ravi d'en discuter avec vous."

ou une formulation équivalente, naturelle et légère.

INTERDIT EN FIN DE MAIL :

"Je peux vous la montrer."

"Je peux vous envoyer la proposition."

"Souhaitez-vous voir la proposition ?"

"Si vous êtes curieux de voir ce que j'ai en tête..."

Le prospect a déjà le document.

==================================================
APPEL À L'ACTION
==================================================

Le but est uniquement d'ouvrir la discussion.

Ne force jamais un rendez-vous.

INTERDIT :

"Réservez un créneau"

"Êtes-vous disponible 15 minutes ?"

"Souhaitez-vous planifier un rendez-vous ?"

"Quand seriez-vous disponible ?"

Laisse simplement au destinataire la possibilité de répondre.

==================================================
LONGUEUR
==================================================

Environ 110 à 160 mots.

Le mail doit rester rapide à lire.

Il peut être légèrement plus court si le message est naturellement complet.

==================================================
SIGNATURE
==================================================

Ne génère aucune signature.

LBMedia Office l'ajoutera lors de l'envoi.

Ne termine pas par :

"Cordialement"

"Bien cordialement"

"À bientôt"

La signature d'envoi gérera cette partie.

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
              "Tu écris pour LBMedia des prises de contact commerciales très personnalisées et sobres. Le message doit sembler réellement écrit après consultation du site. Lorsqu'une projection est jointe, le mail doit clairement annoncer la pièce jointe et ne jamais proposer de montrer ultérieurement ce que le destinataire possède déjà.",
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