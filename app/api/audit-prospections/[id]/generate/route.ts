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
Tu prépares un email de prospection commerciale pour LBMedia.

CONTEXTE :

LBMedia accompagne les entreprises dans la création, la refonte et l'optimisation de leur site internet, ainsi que dans leur visibilité sur Google et dans les moteurs et assistants IA.

Cet email fait suite à un pré-audit réel du site internet du prospect.

ENTREPRISE :

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

AUDIT RÉALISÉ :

URL :
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

POINTS FORTS OBSERVÉS :

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

POINTS PERFECTIBLES OBSERVÉS :

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

PRIORITÉS IDENTIFIÉES :

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

OBJECTIF :

Transformer cet audit en une prise de contact commerciale pertinente.

Tu dois produire :

1. Un angle commercial.
2. Un objet d'email.
3. Le corps de l'email.

ANGLE COMMERCIAL :

Choisis UN angle principal.

Il doit être fondé sur un besoin réellement visible dans l'audit et suffisamment important pour justifier une prise de contact.

Ne cherche pas systématiquement à vendre une refonte complète.

Selon le diagnostic, l'approche peut concerner par exemple :

- l'amélioration de la conversion ;
- la clarification du positionnement ;
- l'optimisation SEO ;
- la visibilité locale ;
- la visibilité dans les moteurs et assistants IA ;
- l'amélioration de certaines pages ;
- une optimisation ciblée du site existant.

EMAIL :

Le mail doit ressembler à un véritable email écrit personnellement par un professionnel qui a pris le temps de regarder le site.

Il ne doit surtout pas ressembler à une campagne de prospection automatisée.

TON :

- professionnel ;
- humain ;
- direct ;
- cordial ;
- mature ;
- simple ;
- personnalisé ;
- jamais agressif ;
- jamais alarmiste ;
- jamais condescendant.

IMPORTANT :

Ne commence pas par :
"Je me permets de vous contacter".

Évite également les formulations génériques de prospection telles que :
"Dans le cadre de notre activité..."
"Nous accompagnons de nombreuses entreprises..."
"Votre site présente plusieurs axes d'amélioration..."

Ne fais pas une liste de tous les défauts.

Ne récite pas l'audit.

Ne surcharge pas le mail de vocabulaire SEO ou technique.

Ne prétends jamais avoir mesuré ce qui figure dans les limites du pré-audit.

Ne critique jamais brutalement le travail existant.

Commence plutôt par montrer naturellement que le site a réellement été consulté.

Mentionne un ou deux éléments maximum issus de l'audit.

Tu peux reconnaître un point positif du site lorsqu'il permet d'introduire naturellement l'amélioration proposée.

Le prospect doit comprendre :
- pourquoi LBMedia le contacte ;
- ce qui a attiré notre attention ;
- quel bénéfice concret pourrait être obtenu ;
- pourquoi cela mérite éventuellement une discussion.

Le but du premier email n'est PAS de vendre immédiatement une prestation.

Le but est d'obtenir une réponse ou d'ouvrir une conversation.

PIÈCE JOINTE :

Une présentation visuelle pourra être jointe ultérieurement à cet email.

Ne dis pas qu'une pièce jointe est présente pour le moment.

SIGNATURE :

Ne génère aucune signature.
LBMedia Office ajoutera la signature séparément.

LONGUEUR :

Environ 120 à 180 mots maximum pour le corps du mail.

OBJET :

Court, naturel et non publicitaire.

Évite :
"Audit de votre site"
"Proposition commerciale"
"Améliorez votre visibilité"
"Offre LBMedia"

Retourne UNIQUEMENT cet objet JSON valide :

{
  "salesAngle": "Résumé interne en une ou deux phrases de l'angle commercial choisi.",
  "subject": "Objet de l'email",
  "emailContent": "Corps complet de l'email sans signature."
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
              "Tu es un consultant commercial senior de LBMedia. Tu transformes un diagnostic web réel en prise de contact personnalisée, sobre et crédible. Tu ne fais jamais de prospection agressive et tu n'inventes aucune observation.",
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