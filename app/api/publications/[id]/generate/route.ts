import OpenAI from "openai";
import { NextResponse } from "next/server";

import { getLbmediaContext } from "@/lib/lbmedia-context";
import type {
  PublicationChannel,
} from "@/lib/news";
import { supabaseAdmin } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type GeneratedPublication = {
  title?: string;
  content: string;
  slug?: string;
  seo_title?: string;
  meta_description?: string;
  subject?: string;
  preview_text?: string;
  call_to_action?: string;
  link_url?: string;
  hashtags?: string;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const channelInstructions: Record<
  PublicationChannel,
  string
> = {
  website: `
Le canal "website" sert uniquement de publication technique WordPress.

Si tu dois générer ce contenu :
- conserve le fond et le ton éditorial de l'actualité source ;
- ne transforme pas l'article en checklist ou en résumé ;
- garde une structure naturelle d'article.

Retourne :
- title : titre éditorial naturel ;
- content : article complet ;
- slug : slug court et lisible ;
- seo_title : titre SEO naturel ;
- meta_description : méta-description concise et humaine.
`,

  brevo: `
Tu prépares une newsletter Brevo.

OBJECTIF

La newsletter ne doit PAS résumer intégralement l'article.

Elle doit :
- éveiller l'intérêt ;
- rappeler rapidement le problème ou l'enjeu ;
- donner 1 ou 2 idées fortes seulement ;
- donner envie de lire l'article complet ou de contacter LBMedia.

STYLE

- ton direct, naturel et professionnel ;
- plus personnel qu'un article de blog ;
- paragraphes courts ;
- pas de longue liste ;
- pas de reprise mécanique des intertitres de l'article ;
- évite les formules commerciales agressives ;
- évite les objets trop publicitaires.

STRUCTURE CONSEILLÉE

- courte accroche ;
- 2 à 4 paragraphes ;
- éventuellement une courte liste si elle apporte vraiment quelque chose ;
- fin naturelle avec invitation à découvrir le sujet ou à échanger.

Retourne :
- subject : objet d'email court, naturel et incitatif sans être racoleur ;
- preview_text : préheader complémentaire ;
- content : contenu complet de l'email.

Le contenu doit pouvoir être utilisé directement dans Brevo après relecture.
`,

  google_business: `
Tu prépares une publication Google Business Profile.

OBJECTIF

Le lecteur doit comprendre en quelques secondes :
- le sujet ;
- pourquoi cela peut le concerner ;
- ce qu'il peut faire ensuite.

Le texte ne doit PAS être un résumé miniature de tout l'article.

Choisis un seul angle fort issu du contenu source.

STYLE

- très clair ;
- concis ;
- local et concret lorsque le sujet le permet ;
- professionnel ;
- sans jargon ;
- sans longue liste ;
- sans succession d'étapes ;
- sans hashtags ;
- sans introduction inutile.

Le texte doit rester suffisamment court pour être confortable à lire sur une fiche Google Business.

Retourne :
- content : publication Google Business concise et directement exploitable ;
- call_to_action : appel à l'action très court, par exemple "En savoir plus", "Découvrir nos conseils", "Nous contacter".

Ne crée aucun lien : le lien sera géré séparément par LBMedia Office.
`,

  linkedin: `
Tu prépares un post LinkedIn pour LBMedia.

OBJECTIF

Le post doit apporter un point de vue, une observation ou une réflexion professionnelle utile à un dirigeant de TPE ou PME.

Ne résume PAS mécaniquement le contenu source.

Choisis une seule idée forte et développe-la comme une véritable publication LinkedIn autonome.

SIGNATURE ÉDITORIALE LINKEDIN LBMEDIA

LinkedIn est le support sur lequel la communication LBMedia peut être la plus incarnée.

LBMedia doit y parler comme une entreprise portée par une personne expérimentée qui connaît concrètement les réalités de la communication et des entreprises.

Le lecteur doit avoir l'impression de lire une réflexion issue du terrain, et non le contenu générique d'une agence de communication.

Lorsque le sujet s'y prête, tu peux utiliser ponctuellement la première personne du singulier.

Le "je" peut notamment servir à introduire :
- une observation professionnelle ;
- un constat issu de l'expérience ;
- une réflexion personnelle ;
- une conviction professionnelle ;
- une question que l'expérience amène naturellement à se poser.

Exemples de tonalité possibles :
- "Je vois encore régulièrement..."
- "Avec le recul..."
- "C'est une question qui revient souvent..."
- "Ce qui me frappe parfois..."
- "Au fil des années, une chose reste vraie..."

Ces exemples indiquent une tonalité.
Ne les reproduis pas systématiquement.

Le "je" n'est PAS obligatoire.

Utilise-le uniquement lorsqu'il rend la publication plus naturelle et plus crédible.

Une publication peut parfaitement rester rédigée avec "on" ou de manière neutre lorsque le sujet s'y prête mieux.

IMPORTANT

N'invente jamais :
- une anecdote personnelle ;
- une rencontre avec un client ;
- une conversation ;
- une expérience précise ;
- un résultat obtenu ;
- un chiffre ;
- une situation vécue ;
- une opinion personnelle qui n'est pas soutenue par le contenu ou le contexte LBMedia.

Tu peux donner une tonalité personnelle à une observation générale, mais tu ne dois jamais fabriquer une histoire pour rendre le post plus humain.

TON

Le ton LinkedIn LBMedia doit être :
- mature ;
- expérimenté ;
- professionnel ;
- humain ;
- accessible ;
- posé ;
- concret ;
- naturel.

Il peut parfois être légèrement complice ou souriant lorsque le sujet le permet.

Il ne doit jamais devenir :
- professoral ;
- donneur de leçons ;
- prétentieux ;
- artificiellement inspirant ;
- excessivement commercial ;
- familier ;
- caricatural.

STYLE

- accroche naturelle ;
- phrases assez courtes ;
- paragraphes courts et aérés ;
- rythme agréable à lire sur LinkedIn ;
- très peu de listes ;
- pas de structure "1 / 2 / 3" sauf nécessité réelle ;
- pas d'émojis systématiques ;
- pas d'accumulation de questions ;
- pas de succession de phrases artificiellement courtes destinées uniquement à créer du rythme ;
- pas de jargon marketing ;
- pas de grandes promesses ;
- pas de discours commercial direct.

ÉVITER LES CLICHÉS LINKEDIN

Évite notamment :
- "Et vous ?";
- "Qu'en pensez-vous ?";
- "Dans un monde où...";
- "À l'ère du digital...";
- "La clé du succès...";
- "Il est temps de...";
- "Plus que jamais...";
- "Game changer";
- les fausses révélations ;
- les accroches volontairement mystérieuses ;
- les conclusions artificiellement conçues pour provoquer des commentaires.

Le post peut se terminer par une question si elle découle naturellement de la réflexion, mais ce n'est jamais une obligation.

POSITIONNEMENT

LBMedia ne cherche pas à donner des leçons.

Le post doit plutôt :
- partager une observation ;
- apporter un éclairage ;
- remettre en question une idée reçue ;
- faire réfléchir sur une pratique ;
- montrer l'expérience et le recul de LBMedia ;
- apporter un conseil réellement utile.

Lorsqu'un sujet concerne les sites internet, le SEO, la communication, la radio ou la visibilité d'une entreprise, privilégie l'expérience concrète et les enjeux métier plutôt qu'une démonstration technique.

DÉCLINAISON D'UN ARTICLE

Si le post provient d'une actualité ou d'un article LBMedia :
- ne résume pas l'article ;
- choisis un angle particulièrement adapté à LinkedIn ;
- le post doit pouvoir être compris sans avoir lu l'article ;
- il peut naturellement donner envie d'aller plus loin ;
- évite les formulations du type "Dans notre nouvel article, nous expliquons..." sauf si elles sont réellement utiles.

PUBLICATION INDÉPENDANTE

Si le post est indépendant :
- traite le sujet ou le brief comme le point de départ d'une réflexion LinkedIn ;
- développe une publication complète ;
- ne fais aucune référence à un article inexistant ;
- conserve les faits disponibles ;
- apporte surtout un angle et une voix.

HASHTAGS

Ajoute seulement 2 à 4 hashtags maximum.

Ils doivent être réellement pertinents et lisibles.

Évite les séries de hashtags génériques.

Retourne :
- content : post LinkedIn complet ;
- hashtags : hashtags séparés par des espaces.
`,

  facebook: `
Tu prépares une publication Facebook pour la page LBMedia.

OBJECTIF

Le post doit être accessible immédiatement à un dirigeant de petite entreprise.

Il peut être plus conversationnel que LinkedIn, mais doit rester professionnel.

Ne résume PAS mécaniquement tout le contenu source.

Choisis un angle simple :
- une question concrète ;
- une erreur fréquente ;
- un conseil utile ;
- une situation que les entreprises locales rencontrent réellement.

STYLE

- naturel ;
- chaleureux sans être familier ;
- paragraphes courts ;
- peu ou pas de listes ;
- pas de jargon ;
- pas de hashtag obligatoire ;
- pas de formule marketing exagérée ;
- pas de longue démonstration.

La publication doit fonctionner seule dans le fil Facebook.

Retourne :
- content : publication Facebook complète et directement exploitable.
`,
};

function getText(
  value: unknown
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed || null;
}

export async function POST(
  _request: Request,
  context: RouteContext
) {
  const { id } = await context.params;

  if (!process.env.OPENAI_API_KEY) {
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

  const {
    data: publication,
    error: publicationError,
  } = await supabaseAdmin
    .from("publications")
    .select(`
      *,
      news (
        title,
        content,
        source_url
      )
    `)
    .eq("id", id)
    .maybeSingle();

  if (publicationError) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Impossible de charger la publication.",
        error:
          publicationError.message,
      },
      {
        status: 500,
      }
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

  const channel =
    publication.channel as PublicationChannel;

  const newsRelation = Array.isArray(
    publication.news
  )
    ? publication.news[0]
    : publication.news;

  const isStandalone =
    !publication.news_id;

  if (
    isStandalone &&
    channel === "website"
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Une publication WordPress doit être rattachée à une actualité.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    !newsRelation &&
    !isStandalone
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "L'actualité source est introuvable.",
      },
      {
        status: 404,
      }
    );
  }

  if (
    isStandalone &&
    !publication.title?.trim() &&
    !publication.content?.trim()
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Indique un sujet ou un brief avant de demander à Pénélope de rédiger la publication.",
      },
      {
        status: 400,
      }
    );
  }

  const lbmediaContext =
    getLbmediaContext();

  const sourceContent =
    newsRelation
      ? `
Cette publication est une déclinaison d'une actualité LBMedia existante.

Titre de l'actualité :
${newsRelation.title}

Article de référence :
${newsRelation.content || "Aucun contenu détaillé."}

Lien associé :
${newsRelation.source_url || "Aucun lien"}
`
      : `
Cette publication est indépendante.

Elle n'est rattachée à aucun article du site LBMedia.

Tu dois rédiger directement une publication pour le canal demandé à partir du sujet ou du brief fourni ci-dessous.

Sujet :
${publication.title || "Aucun titre distinct."}

Brief ou contenu de départ :
${publication.content || "Aucun contenu détaillé."}

Lien associé :
${publication.link_url || "Aucun lien"}

IMPORTANT :
- ne fais aucune référence à un article source qui n'existe pas ;
- ne demande pas au lecteur de lire un article complet ;
- transforme le brief en véritable publication autonome ;
- respecte strictement les informations disponibles dans le brief ;
- n'invente aucun fait absent du brief.
`;

  try {
    const response =
      await openai.responses.create({
        model: "gpt-5-mini",

        instructions: `
Tu travailles pour LBMedia.

Voici la connaissance éditoriale permanente de LBMedia :

${lbmediaContext}

Tu dois préparer un contenu pour un support de communication précis.

Le contenu peut être :
- soit une déclinaison d'une actualité LBMedia existante ;
- soit une publication indépendante créée directement pour ce support.

PRINCIPE ESSENTIEL

Une publication adaptée à un canal n'est PAS un résumé automatique.

Chaque support a :
- son propre usage ;
- son propre rythme ;
- son propre niveau de détail ;
- son propre objectif.

Tu dois sélectionner ou développer l'angle le plus adapté au canal demandé à partir du contenu source fourni.

RÈGLES COMMUNES

- écris en français ;
- respecte strictement les informations du contenu source ;
- n'invente aucun fait, chiffre, étude ou résultat ;
- écris un contenu directement exploitable ;
- adopte le ton LBMedia ;
- évite le jargon ;
- évite les formulations génériques ;
- évite les listes si elles ne sont pas nécessaires ;
- n'ajoute aucune explication sur ton travail.

PUBLICATION INDÉPENDANTE

Lorsque le contenu source indique qu'il s'agit d'une publication indépendante :
- considère le titre et le contenu fournis comme un brief éditorial ;
- rédige une véritable publication autonome ;
- ne suppose jamais qu'un article de blog existe ;
- ne parle pas de "notre article", "cet article", "lire la suite" ou équivalent sauf si le brief le demande explicitement ;
- n'invente pas de lien vers le site ;
- conserve uniquement les faits réellement présents dans le brief.

DÉCLINAISON D'UNE ACTUALITÉ

Lorsque le contenu source contient une actualité existante :
- utilise cette actualité comme référence ;
- sélectionne l'angle le plus pertinent pour le canal ;
- évite de recopier les mêmes phrases ;
- évite de reprendre mécaniquement les intertitres de l'article.

INSTRUCTIONS SPÉCIFIQUES AU CANAL

${channelInstructions[channel]}

Retourne exclusivement un objet JSON valide.
N'utilise aucun bloc Markdown.
`,

        input: sourceContent,

        text: {
          format: {
            type: "json_schema",
            name: "publication",
            strict: true,
            schema: {
              type: "object",
              properties: {
                title: {
                  type: [
                    "string",
                    "null",
                  ],
                },
                content: {
                  type: "string",
                },
                slug: {
                  type: [
                    "string",
                    "null",
                  ],
                },
                seo_title: {
                  type: [
                    "string",
                    "null",
                  ],
                },
                meta_description: {
                  type: [
                    "string",
                    "null",
                  ],
                },
                subject: {
                  type: [
                    "string",
                    "null",
                  ],
                },
                preview_text: {
                  type: [
                    "string",
                    "null",
                  ],
                },
                call_to_action: {
                  type: [
                    "string",
                    "null",
                  ],
                },
                link_url: {
                  type: [
                    "string",
                    "null",
                  ],
                },
                hashtags: {
                  type: [
                    "string",
                    "null",
                  ],
                },
              },

              required: [
                "title",
                "content",
                "slug",
                "seo_title",
                "meta_description",
                "subject",
                "preview_text",
                "call_to_action",
                "link_url",
                "hashtags",
              ],

              additionalProperties: false,
            },
          },
        },
      });

    const rawOutput =
      response.output_text.trim();

    if (!rawOutput) {
      throw new Error(
        "OpenAI n'a retourné aucun contenu."
      );
    }

    const generated =
      JSON.parse(
        rawOutput
      ) as GeneratedPublication;

    if (!generated.content?.trim()) {
      throw new Error(
        "Le contenu généré est vide."
      );
    }

    const updateData: Record<
      string,
      string | null
    > = {
      content:
        generated.content.trim(),
      updated_at:
        new Date().toISOString(),
    };

    if (channel === "website") {
      updateData.title =
        getText(generated.title);

      updateData.slug =
        getText(generated.slug);

      updateData.seo_title =
        getText(
          generated.seo_title
        );

      updateData.meta_description =
        getText(
          generated.meta_description
        );
    }

    if (channel === "brevo") {
      updateData.subject =
        getText(
          generated.subject
        );

      updateData.preview_text =
        getText(
          generated.preview_text
        );
    }

    if (
      channel === "google_business"
    ) {
      updateData.call_to_action =
        getText(
          generated.call_to_action
        );
    }

    if (channel === "linkedin") {
      updateData.hashtags =
        getText(
          generated.hashtags
        );
    }

    if (newsRelation?.source_url) {
      updateData.link_url =
        newsRelation.source_url;
    }

    const {
      data: updatedPublication,
      error: updateError,
    } = await supabaseAdmin
      .from("publications")
      .update(updateData)
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) {
      throw new Error(
        updateError.message
      );
    }

    return NextResponse.json({
      success: true,
      publication:
        updatedPublication,
    });
  } catch (error) {
    console.error(
      "Publication generation error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          isStandalone
            ? "Impossible de générer la publication."
            : "Impossible de générer la déclinaison.",
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