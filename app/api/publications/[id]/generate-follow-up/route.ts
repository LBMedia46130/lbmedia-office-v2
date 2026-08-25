import OpenAI from "openai";
import { NextResponse } from "next/server";

import { getLbmediaContext } from "@/lib/lbmedia-context";
import { supabaseAdmin } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type FollowUpResponse = {
  follow_up_text: string;
};

const openai =
  new OpenAI({
    apiKey:
      process.env.OPENAI_API_KEY,
  });

export async function POST(
  _request: Request,
  context: RouteContext
) {
  const { id } =
    await context.params;

  if (
    !process.env
      .OPENAI_API_KEY
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
    const {
      data: publication,
      error:
        publicationError,
    } = await supabaseAdmin
      .from("publications")
      .select(
        "id, channel, title, content, follow_up_text"
      )
      .eq("id", id)
      .maybeSingle();

    if (
      publicationError
    ) {
      throw new Error(
        publicationError.message
      );
    }

    if (!publication) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Publication introuvable.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      publication.channel !==
      "linkedin"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "La génération de relance est actuellement réservée aux posts LinkedIn.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !publication.content?.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le post LinkedIn doit être rédigé avant de générer une relance.",
        },
        {
          status: 400,
        }
      );
    }

    const lbmediaContext =
      getLbmediaContext();

    const response =
      await openai.responses.create({
        model: "gpt-5-mini",

        instructions: `
Tu es Pénélope, l'assistante éditoriale de LBMedia.

Voici le contexte permanent de LBMedia :

${lbmediaContext}

Ta mission est de rédiger une phrase de relance pour un post LinkedIn déjà publié.

Cette relance sera utilisée quelques jours après la publication initiale, généralement sous forme de commentaire permettant de remettre naturellement le post en avant.

RÈGLES GÉNÉRALES

- écris en français ;
- produis une seule relance ;
- reste courte : une ou deux phrases maximum ;
- adopte un ton naturel, professionnel et humain ;
- donne envie de réagir ou de réfléchir sans être racoleur ;
- privilégie une question pertinente lorsque cela fonctionne naturellement ;
- ne résume pas simplement le post ;
- ne répète pas mot pour mot une phrase déjà présente dans le post ;
- ne commence pas par "Petit rappel", "Pour rappel" ou une formulation artificielle de ce type ;
- pas de hashtags ;
- pas d'émojis sauf s'ils sont réellement utiles ;
- pas de lien ;
- pas de formule commerciale agressive ;
- évite les banalités du type "Et vous, qu'en pensez-vous ?" si une question plus précise peut être formulée ;
- reste cohérent avec le style éditorial LBMedia.

RÈGLES MÉTIER RADIO

Lorsque le post concerne la radio, une campagne radio, une fréquence de diffusion, une durée de campagne ou un plan média :

- ne crée jamais toi-même un nombre de spots, une fréquence de diffusion, une durée de campagne ou un rythme de diffusion qui n'est pas explicitement présent dans le post ;
- ne propose pas de scénarios chiffrés arbitraires comme "1 spot par jour", "3 spots par jour", "une semaine intense", "10 passages", etc. ;
- ne présente jamais comme "intense", "forte", "massive" ou "soutenue" une pression publicitaire sans donnée réelle permettant de le justifier ;
- ne compare pas artificiellement une campagne courte et une campagne longue à partir de chiffres inventés ;
- ne donne pas de recommandation de médiaplanning précise si les données nécessaires ne sont pas disponibles ;
- rappelle si nécessaire que l'efficacité radio dépend notamment de la répétition, de la cohérence, de la couverture et de la durée de présence, sans inventer de seuil ou de volume ;
- formule plutôt une question ou une réflexion sur la régularité, la répétition, la cohérence du message ou l'inscription dans la durée ;
- si le post contient déjà des chiffres, tu peux les reprendre uniquement s'ils sont explicitement présents et sans les déformer.

EXEMPLE DE BON ANGLE POUR UNE RELANCE RADIO

"En radio, ce n'est pas seulement le nombre de spots qui compte : c'est leur répétition, leur répartition et la durée de présence. Et votre communication s'inscrit-elle vraiment dans la durée ?"

Cet exemple sert uniquement à comprendre le niveau de cohérence attendu. Ne le recopie pas systématiquement.

Retourne exclusivement un objet JSON valide.
N'utilise aucun bloc Markdown.
`,

        input: `
TITRE DU POST

${
  publication.title ||
  "Sans titre"
}

POST LINKEDIN

${publication.content}

Rédige maintenant une phrase de relance courte, naturelle et cohérente pour remettre ce post en avant quelques jours après sa publication.

Si le sujet concerne la radio, n'invente aucune fréquence, aucun nombre de spots et aucune durée de campagne qui ne figurent pas explicitement dans le post.
`,

        text: {
          format: {
            type:
              "json_schema",
            name:
              "linkedin_follow_up",
            strict: true,
            schema: {
              type: "object",
              properties: {
                follow_up_text: {
                  type:
                    "string",
                },
              },
              required: [
                "follow_up_text",
              ],
              additionalProperties:
                false,
            },
          },
        },
      });

    const rawOutput =
      response.output_text.trim();

    if (!rawOutput) {
      throw new Error(
        "Pénélope n'a retourné aucune relance."
      );
    }

    const result =
      JSON.parse(
        rawOutput
      ) as FollowUpResponse;

    const followUpText =
      result.follow_up_text?.trim();

    if (!followUpText) {
      throw new Error(
        "La relance générée est vide."
      );
    }

    const {
      data:
        updatedPublication,
      error: updateError,
    } = await supabaseAdmin
      .from("publications")
      .update({
        follow_up_text:
          followUpText,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (updateError) {
      throw new Error(
        updateError.message
      );
    }

    if (
      !updatedPublication
    ) {
      throw new Error(
        "Impossible d'enregistrer la relance."
      );
    }

    return NextResponse.json({
      success: true,
      publication:
        updatedPublication,
    });
  } catch (error) {
    console.error(
      "LinkedIn follow-up generation error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Pénélope n'a pas pu générer la relance LinkedIn.",
        error:
          error instanceof Error
            ? error.message
            : "Erreur inconnue",
      },
      {
        status: 500,
      }
    );
  }
}