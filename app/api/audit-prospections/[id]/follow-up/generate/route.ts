import {
  NextRequest,
  NextResponse,
} from "next/server";

import OpenAI from "openai";

import {
  getAuditProspectionById,
} from "@/lib/audit-prospections";

import {
  getAuditProspectionMessages,
} from "@/lib/audit-prospection-messages";

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

type GeneratedFollowUp = {
  subject: string;
  emailContent: string;
};

function validateGeneratedFollowUp(
  value: unknown
): GeneratedFollowUp {
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
    !subject ||
    !emailContent
  ) {
    throw new Error(
      "La relance générée est incomplète."
    );
  }

  return {
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

    const prospection =
      await getAuditProspectionById(
        id
      );

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

    if (
      prospection.status ===
      "replied"
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Cette prospection est déjà marquée comme ayant reçu une réponse.",
        },
        {
          status: 409,
        }
      );
    }

    if (
      !prospection.sent_at
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Aucun premier envoi n’est enregistré pour cette prospection.",
        },
        {
          status: 409,
        }
      );
    }

    const messages =
      await getAuditProspectionMessages(
        prospection.id
      );

    const sentMessages =
      messages.filter(
        (message) =>
          Boolean(
            message.sent_at
          )
      );

    /*
     * Les anciennes prospections envoyées avant la création
     * de audit_prospection_messages peuvent ne pas avoir
     * d'entrée dans cette nouvelle table.
     *
     * Dans ce cas, on utilise la photographie sent_*
     * déjà enregistrée dans audit_prospections.
     */
    const latestMessage =
      sentMessages.length > 0
        ? sentMessages[
            sentMessages.length -
              1
          ]
        : null;

    const previousSubject =
      latestMessage
        ?.subject ??
      prospection.sent_subject ??
      prospection.subject ??
      "";

    const previousEmailContent =
      latestMessage
        ?.email_content ??
      prospection.sent_email_content ??
      prospection.email_content ??
      "";

    if (
      !previousSubject ||
      !previousEmailContent
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Impossible de retrouver le message précédemment envoyé.",
        },
        {
          status: 409,
        }
      );
    }

    const previousFollowUps =
      messages.filter(
        (message) =>
          message.message_type ===
          "follow_up"
      );

    const followUpNumber =
      previousFollowUps.length +
      1;

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
          website,
          city,
          sector
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
Tu écris une relance commerciale pour LBMedia.

Il ne s'agit PAS d'un premier contact.

LBMedia a déjà envoyé un email personnalisé à cette entreprise après avoir consulté son site internet et préparé une projection visuelle.

La relance doit être naturelle, courte et discrète.

==================================================
ENTREPRISE
==================================================

Nom :
${company.name}

Raison sociale :
${company.legal_name ?? "Non renseignée"}

Site :
${company.website ?? "Non renseigné"}

Ville :
${company.city ?? "Non renseignée"}

Secteur :
${company.sector ?? "Non renseigné"}

==================================================
RELANCE
==================================================

Numéro de cette relance :
${followUpNumber}

==================================================
DERNIER MESSAGE RÉELLEMENT ENVOYÉ
==================================================

Objet :

${previousSubject}

Message :

${previousEmailContent}

==================================================
OBJECTIF
==================================================

Le destinataire a déjà reçu le message précédent.

Ne répète donc PAS :
- l'analyse du site ;
- les arguments du premier email ;
- les points forts du site ;
- les pistes d'amélioration en détail ;
- le contenu de la projection.

La relance sert uniquement à remettre naturellement le précédent message dans le fil de ses priorités.

Elle doit donner l'impression d'un vrai suivi humain.

==================================================
TON
==================================================

Le ton doit être :

- humain ;
- professionnel ;
- cordial ;
- très naturel ;
- léger ;
- non insistant ;
- non commercial au sens agressif.

Écris comme une vraie personne qui reprend contact quelques jours après son premier message.

Pas comme une IA.

Pas comme une séquence automatisée.

Pas comme un logiciel CRM.

==================================================
RELANCE 1
==================================================

S'il s'agit de la première relance, privilégie une logique proche de :

"Bonjour,

Je reviens simplement vers vous concernant le message que je vous avais adressé il y a quelques jours au sujet de votre site.

Je souhaitais simplement savoir si vous aviez eu l'occasion de regarder la petite projection que j'avais préparée.

Si cette piste vous semble intéressante, je serais ravi d'en échanger avec vous."

Cette formulation est une référence de ton.

Ne la copie pas systématiquement mot pour mot.

==================================================
RELANCES SUIVANTES
==================================================

S'il s'agit de la deuxième relance ou d'une relance ultérieure :

- sois encore plus bref ;
- ne reproche jamais l'absence de réponse ;
- ne donne aucun sentiment d'insistance ;
- évite de répéter exactement la relance précédente ;
- laisse très facilement le destinataire ne pas donner suite.

Une relance ultérieure peut simplement rappeler le sujet et laisser la porte ouverte.

==================================================
OBJET
==================================================

Privilégie la continuité avec le premier message.

L'objet doit rester simple.

Tu peux conserver l'objet précédent, éventuellement précédé de :

"Re : "

N'invente pas un nouvel objet commercial ou accrocheur.

INTERDIT :

"Relance"

"Deuxième relance"

"Rappel"

"Urgent"

"Votre projet"

"Votre opportunité"

==================================================
PIÈCE JOINTE
==================================================

Ne prétends PAS qu'une nouvelle projection a été créée.

Le document a déjà été envoyé lors du premier contact.

Tu peux évoquer :

"la petite projection que je vous avais adressée"

ou une formulation équivalente.

Ne dis jamais :

"vous trouverez en pièce jointe"

sauf si une nouvelle pièce jointe est réellement fournie, ce qui n'est pas le cas ici.

==================================================
APPEL À L'ACTION
==================================================

Ne force jamais un rendez-vous.

INTERDIT :

"Êtes-vous disponible 15 minutes ?"

"Quand pouvons-nous nous appeler ?"

"Réservez un créneau"

"Souhaitez-vous planifier un rendez-vous ?"

La seule ambition de cette relance est d'obtenir éventuellement une réponse.

==================================================
LONGUEUR
==================================================

Environ 45 à 90 mots.

Une relance courte est préférable.

==================================================
SIGNATURE
==================================================

Ne génère aucune signature.

LBMedia Office ajoutera automatiquement la signature lors de l'envoi.

Ne termine pas par :

"Cordialement"

"Bien cordialement"

"À bientôt"

==================================================
FORMAT DE SORTIE
==================================================

Retourne UNIQUEMENT cet objet JSON valide :

{
  "subject": "Objet de la relance",
  "emailContent": "Corps complet de la relance sans signature."
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
              "Tu écris pour LBMedia des relances commerciales courtes, humaines et sobres. Le destinataire a déjà reçu un premier message personnalisé. Tu ne répètes jamais l'argumentaire initial et tu n'utilises jamais un ton de séquence commerciale automatisée.",
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
        "OpenAI n’a retourné aucune relance."
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
      validateGeneratedFollowUp(
        parsed
      );

    /*
     * Important :
     * la génération n'écrit RIEN dans l'historique.
     *
     * audit_prospection_messages ne contient que
     * des messages réellement envoyés.
     *
     * La relance générée reste donc un brouillon
     * jusqu'à son envoi effectif.
     */
    return NextResponse.json({
      success: true,

      followUp: {
        number:
          followUpNumber,

        subject:
          generated.subject,

        emailContent:
          generated.emailContent,

        recipientEmail:
          prospection.recipient_email,

        previousMessageId:
          latestMessage?.id ??
          null,
      },
    });
  } catch (error) {
    console.error(
      "Audit prospection follow-up generation error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Une erreur est survenue pendant la génération de la relance.",
      },
      {
        status: 500,
      }
    );
  }
}