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

const openai = new OpenAI({
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
          recipient_email,
          recipient_name,
          status
        `
      )
      .eq(
        "id",
        id
      )
      .maybeSingle();

    if (prospectionError) {
      throw new Error(
        `Impossible de charger la prospection : ${prospectionError.message}`
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
      error: companyError,
    } = await supabaseAdmin
      .from("companies")
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

    if (companyError) {
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

    const prompt = `
Tu écris un premier email de prise de contact pour LBMedia.

Ce message est destiné à une entreprise dont LBMedia a réellement consulté et pré-audité le site internet.

L'AUDIT EST UNE SOURCE DE RÉFLEXION INTERNE.

Le destinataire ne doit pas avoir l'impression de recevoir un rapport d'audit automatisé.

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
OBSERVATIONS INTERNES ISSUES DU PRÉ-AUDIT
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

LIMITES DU PRÉ-AUDIT :

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
RÈGLE ABSOLUE DE FIABILITÉ
==================================================

Tu ne dois JAMAIS inventer ou extrapoler :

- une activité ;
- un service ;
- une offre ;
- un produit ;
- un type de client ;
- une réalisation ;
- une expertise ;
- un canal de communication ;
- un secteur d'intervention ;
- une zone géographique ;
- un partenariat ;
- une référence client ;
- un témoignage ;
- une campagne ;
- un résultat obtenu.

Tu peux utiliser uniquement ce qui est explicitement présent dans :

- les informations entreprise ;
- la synthèse d'audit ;
- les points forts ;
- les points perfectibles ;
- les priorités ;
- les données réellement observées.

Si une information n'est pas clairement établie, tu ne l'utilises pas.

Tu ne complètes jamais une phrase avec une supposition simplement pour la rendre plus personnalisée.

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

L'angle interne peut être plus direct que le mail.

Il peut mentionner une faiblesse ou un manque réellement observé, car cette information reste interne à LBMedia.

Ne transforme pas automatiquement chaque audit en projet de refonte.

Une optimisation ciblée peut être beaucoup plus pertinente.

==================================================
PHILOSOPHIE DE L'EMAIL
==================================================

Imagine qu'un professionnel de LBMedia a passé quelques minutes sur le site, a remarqué quelque chose d'intéressant et décide d'écrire personnellement au dirigeant.

Ce n'est PAS :

- un rapport d'audit ;
- une campagne emailing ;
- une démonstration d'expertise ;
- une proposition commerciale ;
- une liste de problèmes ;
- un discours de consultant SEO.

Le message doit donner cette impression :

"J'ai regardé votre site. Il y a déjà de bonnes choses. J'ai remarqué une piste qui pourrait être intéressante. J'ai pris le temps d'imaginer quelque chose de concret pour vous."

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
- curieux ;
- respectueux du travail déjà réalisé.

Écris comme une vraie personne.

Privilégie des phrases simples.

Évite le jargon marketing et technique.

==================================================
INTERDICTIONS
==================================================

Ne commence jamais par :

"Je me permets de vous contacter"

"Dans le cadre de notre activité"

"Nous accompagnons..."

"Suite à un audit de votre site"

"Votre site présente plusieurs axes d'amélioration"

Ne parle pas de "score".

Ne donne aucune note.

Ne parle pas de "pré-audit".

Ne parle pas de "diagnostic".

Ne parle pas de "faiblesses".

Ne parle pas de "problèmes".

Ne parle pas de "leviers".

Évite autant que possible dans le mail :

- conversion ;
- SEO ;
- GEO ;
- réassurance ;
- données structurées ;
- FAQ structurée ;
- optimisation sémantique ;
- parcours utilisateur ;
- CTA.

Ces notions peuvent guider ton raisonnement mais ne doivent pas transformer le mail en rapport technique.

==================================================
FORMULATION POSITIVE DES OBSERVATIONS
==================================================

Dans le mail envoyé au prospect, évite les formulations négatives ou accusatrices.

Évite par exemple :

"Je n'ai pas trouvé..."

"Il manque..."

"Vous n'avez pas..."

"Peu de..."

"Votre site ne..."

"Cette absence limite..."

"Ce point pénalise..."

Transforme autant que possible le constat en opportunité positive.

Exemple :

INTERNE :
"Les témoignages clients sont peu visibles."

À ÉVITER :
"Je n'ai pas repéré de témoignages clients."

À PRIVILÉGIER :
"Je me suis dit que votre expérience et vos réalisations pourraient probablement être encore davantage mises en valeur."

Autre exemple :

INTERNE :
"L'offre manque parfois de clarté."

À ÉVITER :
"Vos services ne sont pas assez clairs."

À PRIVILÉGIER :
"Il y aurait peut-être quelque chose d'intéressant à faire pour rendre certaines prestations encore plus immédiatement compréhensibles."

Le prospect ne doit jamais avoir l'impression que LBMedia cherche à dévaloriser son site pour vendre une prestation.

==================================================
UTILISATION DES OBSERVATIONS
==================================================

Choisis seulement UNE observation principale, éventuellement accompagnée d'un point positif.

Ne récite jamais plusieurs éléments de l'audit.

Transforme l'observation technique en bénéfice compréhensible.

Ne cite dans le mail que des informations réellement établies.

Si le secteur d'activité ou les services ne sont pas suffisamment certains, reste générique plutôt que d'inventer.

Exemple de logique :

INTERNE :
"Les services pourraient être davantage explicités."

EMAIL :
"En parcourant le site, je me suis dit qu'on pourrait probablement rendre certaines prestations encore plus immédiatement compréhensibles pour quelqu'un qui vous découvre."

INTERNE :
"Les preuves clients sont peu visibles."

EMAIL :
"Votre activité est bien présentée, mais je pense qu'on pourrait encore mieux mettre en valeur l'expérience et les réalisations derrière l'entreprise."

==================================================
POSITIONNEMENT COMMERCIAL
==================================================

LBMedia ne doit pas apparaître comme une agence qui cherche à vendre une refonte à tout prix.

Le message peut parfaitement proposer :

- une amélioration ciblée ;
- une évolution de certaines pages ;
- une meilleure mise en valeur de l'existant ;
- une piste graphique ou éditoriale ;
- une optimisation de la visibilité ;
- une réflexion sur la façon dont le site présente l'entreprise.

Ne promets aucun résultat chiffré.

N'affirme jamais qu'une modification "augmentera les contacts".

Utilise plutôt :

"pourrait faciliter..."

"permettrait de mieux..."

"pourrait renforcer..."

"mériterait peut-être..."

"je pense qu'il y aurait quelque chose d'intéressant à faire..."

==================================================
FUTURE PRÉSENTATION VISUELLE
==================================================

LBMedia pourra joindre à terme un petit document montrant visuellement une piste d'amélioration du site.

Pour cette génération, NE DIS PAS qu'une pièce jointe est présente.

En revanche, tu peux préparer naturellement le terrain avec une formulation telle que :

"J'ai d'ailleurs imaginé une piste assez concrète."

ou :

"Plutôt que de vous faire un long discours, j'ai préféré réfléchir à quelque chose de concret."

Uniquement si cela s'intègre naturellement.

==================================================
APPEL À L'ACTION
==================================================

Le but est d'obtenir une réponse, pas de forcer un rendez-vous.

Évite les appels à l'action commerciaux comme :

"Réservez un créneau"

"Êtes-vous disponible 15 minutes ?"

"Souhaitez-vous planifier un rendez-vous ?"

Préfère une ouverture légère :

"Si le sujet vous intéresse, je serais ravi d'en échanger avec vous."

"Si vous êtes curieux de voir ce que j'ai en tête, je peux vous le montrer."

"Si cela vous parle, nous pouvons bien sûr en discuter."

Le tutoiement est interdit.

==================================================
LONGUEUR
==================================================

Environ 100 à 150 mots.

Mieux vaut un email court et crédible qu'un email exhaustif.

==================================================
OBJET
==================================================

L'objet doit sembler avoir été écrit spécialement pour cette entreprise.

Court.

Sobre.

Curieux sans être racoleur.

Il ne doit pas ressembler à une newsletter ou une campagne marketing.

N'invente aucun service ou activité dans l'objet.

INTERDIT :

"Audit de votre site"

"Proposition commerciale"

"3 actions pour..."

"Améliorez..."

"Boostez..."

"Optimisez..."

"Votre visibilité"

"Votre SEO"

==================================================
SIGNATURE
==================================================

Ne génère aucune signature.

LBMedia Office l'ajoutera ultérieurement.

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
              "Tu écris pour LBMedia des prises de contact commerciales très personnalisées. Tu n'inventes jamais une information pour personnaliser un message. Tu transformes les constats négatifs en pistes positives dans le mail destiné au prospect. Le diagnostic brut reste réservé au raisonnement interne.",
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
      error: updateError,
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

    if (updateError) {
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