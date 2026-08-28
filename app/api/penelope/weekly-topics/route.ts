import OpenAI from "openai";
import { NextResponse } from "next/server";

import { getLbmediaContext } from "@/lib/lbmedia-context";
import {
  publicationChannels,
  type PublicationChannel,
} from "@/lib/news";
import { supabaseAdmin } from "@/lib/supabase-admin";

type WeeklyTopic = {
  title: string;
  angle: string;
  reason: string;
};

type WeeklyTopicsResponse = {
  topics: WeeklyTopic[];
};

type WeeklyTopicsRequest = {
  channel?: PublicationChannel;
};

type RecentNewsItem = {
  title: string;
  content: string | null;
  status: string;
  created_at: string;
};

type RecentStandalonePublication = {
  title: string | null;
  content: string;
  channel: string;
  status: string;
  created_at: string;
};

type EditorialHistoryItem = {
  published_at: string | null;
  channel: string;
  title: string;
  summary: string | null;
  source_url: string | null;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const channelTopicInstructions: Record<
  PublicationChannel,
  string
> = {
  website: `
Les propositions sont destinées à devenir de véritables actualités ou articles publiés sur lbmedia.fr.

Propose des sujets suffisamment riches pour justifier un article de fond.

L'angle peut être pédagogique, analytique ou pratique, mais doit rester concret et utile aux entreprises.
`,

  brevo: `
Les propositions sont destinées à une newsletter Brevo indépendante.

Cherche des sujets qui peuvent créer un intérêt immédiat dans un email.

L'angle doit pouvoir être traité de manière concise et donner envie au lecteur de poursuivre la réflexion ou de contacter LBMedia.

Évite les sujets qui nécessitent un article très long pour être compris.
`,

  google_business: `
Les propositions sont destinées à être PUBLIÉES SUR la fiche Google Business Profile de LBMedia.

POINT ESSENTIEL

Google Business Profile est ici le SUPPORT de publication, pas le SUJET à traiter.

Ne propose donc pas automatiquement des contenus qui parlent :
- de Google Business Profile ;
- de la gestion d'une fiche Google ;
- des avis Google ;
- des photos d'une fiche Google ;
- de la manière de publier sur Google ;
- de checklists Google Business.

Ces thèmes restent possibles uniquement s'ils sont réellement pertinents au regard de la mémoire éditoriale et de l'activité de LBMedia, mais ils ne doivent bénéficier d'aucune priorité particulière simplement parce que le support demandé est Google Business.

Cherche d'abord des sujets issus des ACTIVITÉS et de l'EXPERTISE de LBMedia, par exemple :
- sites internet et performance commerciale ;
- SEO et visibilité dans Google ;
- GEO / visibilité dans les réponses des IA ;
- communication et visibilité des TPE/PME ;
- radio et RFM lorsque le sujet est pertinent ;
- complémentarité entre différents leviers de communication ;
- conseils concrets liés aux problématiques réellement rencontrées par les entreprises.

Le choix des sujets doit aussi tenir compte de l'historique éditorial fourni afin d'éviter les répétitions.

FORMAT ATTENDU

Chaque proposition doit pouvoir devenir une publication Google Business courte, publique et immédiatement compréhensible par un dirigeant de TPE ou PME.

Privilégie :
- un problème concret ;
- une observation utile ;
- un conseil simple ;
- une idée forte ;
- un angle qui peut donner envie d'en savoir plus ou de contacter LBMedia.

Évite :
- les sujets trop théoriques ;
- les plans d'article complexes ;
- les longues méthodes ;
- les checklists ;
- les tutoriels sur l'utilisation du support Google Business lui-même ;
- les titres construits artificiellement autour de "Google Business".

Les trois propositions doivent porter sur des sujets réellement différents.
`,

  linkedin: `
Les propositions sont destinées à des posts LinkedIn indépendants.

IMPORTANT

Ne propose PAS des sujets d'articles de blog.

Ne propose PAS :
- de checklist ;
- de guide complet ;
- de tutoriel ;
- de méthode en plusieurs étapes ;
- de titre du type "5 conseils pour..." ;
- de titre du type "7 erreurs à éviter..." ;
- de plan exhaustif ;
- de sujet qui invite naturellement à écrire un mini-article.

Cherche plutôt UNE idée forte pouvant donner lieu à une réflexion LinkedIn autonome.

Une bonne proposition LinkedIn doit pouvoir :
- partager une observation issue du métier ;
- remettre en question une idée reçue ;
- apporter du recul sur une pratique ;
- poser une vraie question professionnelle ;
- mettre en lumière un problème souvent mal abordé ;
- défendre une conviction professionnelle cohérente avec LBMedia ;
- faire réfléchir un dirigeant de TPE ou PME.

Le titre doit annoncer cette idée forte, pas un plan de contenu.

L'angle doit rester volontairement resserré.

Il doit donner suffisamment de matière pour rédiger un post LinkedIn d'environ 800 à 1 400 caractères, mais pas davantage.

Si un sujet pourrait être traité en cinq points, choisis plutôt LE point le plus intéressant et construis la proposition autour de celui-ci.

Privilégie le point de vue et l'expérience métier à l'exhaustivité.

Le lecteur doit pouvoir sentir derrière le sujet une entreprise expérimentée qui connaît les réalités de la communication, et non une agence qui cherche simplement un nouveau sujet de blog.
`,

  facebook: `
Les propositions sont destinées à des publications Facebook indépendantes.

Cherche des sujets simples, concrets et immédiatement accessibles.

Privilégie :
- une question rencontrée par les petites entreprises ;
- une erreur fréquente ;
- une observation concrète ;
- un conseil simple ;
- un sujet local lorsque cela est pertinent.

Évite les sujets trop techniques et les plans d'article exhaustifs.
`,
};

function cleanExcerpt(
  value: string | null,
  maxLength = 320
) {
  if (!value?.trim()) {
    return "Aucun contenu";
  }

  return value
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

function formatDate(
  value: string | null
) {
  if (!value) {
    return "Date inconnue";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Date inconnue";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      timeZone:
        "Europe/Paris",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(date);
}

export async function POST(
  request: Request
) {
  if (
    !process.env.OPENAI_API_KEY
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

  let body: WeeklyTopicsRequest =
    {};

  try {
    body =
      await request.json();
  } catch {
    body = {};
  }

  const requestedChannel =
    body.channel ??
    "linkedin";

  if (
    !publicationChannels.includes(
      requestedChannel
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Le support demandé est invalide.",
      },
      {
        status: 400,
      }
    );
  }

  const channel =
    requestedChannel as PublicationChannel;

  try {
    const [
      recentNewsResult,
      recentStandaloneResult,
      editorialHistoryResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("news")
        .select(
          "title, content, status, created_at"
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        )
        .limit(30),

      supabaseAdmin
        .from("publications")
        .select(
          "title, content, channel, status, created_at"
        )
        .is(
          "news_id",
          null
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        )
        .limit(30),

      supabaseAdmin
        .from(
          "editorial_history"
        )
        .select(
          "published_at, channel, title, summary, source_url"
        )
        .order(
          "published_at",
          {
            ascending: false,
            nullsFirst: false,
          }
        )
        .limit(100),
    ]);

    if (
      recentNewsResult.error
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Impossible de consulter les actualités récentes.",
          error:
            recentNewsResult
              .error.message,
        },
        {
          status: 500,
        }
      );
    }

    if (
      recentStandaloneResult.error
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Impossible de consulter les posts récents.",
          error:
            recentStandaloneResult
              .error.message,
        },
        {
          status: 500,
        }
      );
    }

    if (
      editorialHistoryResult.error
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Impossible de consulter l’historique éditorial.",
          error:
            editorialHistoryResult
              .error.message,
        },
        {
          status: 500,
        }
      );
    }

    const recentNews =
      (recentNewsResult.data ??
        []) as RecentNewsItem[];

    const recentStandalone =
      (recentStandaloneResult.data ??
        []) as RecentStandalonePublication[];

    const editorialHistory =
      (editorialHistoryResult.data ??
        []) as EditorialHistoryItem[];

    const recentNewsText =
      recentNews.length > 0
        ? recentNews
            .map(
              (
                item,
                index
              ) => {
                return [
                  `${index + 1}. ${item.title}`,
                  "Type : actualité / article LBMedia Office",
                  `Date : ${formatDate(
                    item.created_at
                  )}`,
                  `Statut : ${item.status}`,
                  `Résumé : ${cleanExcerpt(
                    item.content
                  )}`,
                ].join("\n");
              }
            )
            .join("\n\n")
        : "Aucune actualité récente dans LBMedia Office.";

    const standaloneText =
      recentStandalone.length >
      0
        ? recentStandalone
            .map(
              (
                item,
                index
              ) => {
                return [
                  `${index + 1}. ${
                    item.title ||
                    "Post sans titre"
                  }`,
                  `Type : post indépendant ${item.channel}`,
                  `Date : ${formatDate(
                    item.created_at
                  )}`,
                  `Statut : ${item.status}`,
                  `Résumé : ${cleanExcerpt(
                    item.content
                  )}`,
                ].join("\n");
              }
            )
            .join("\n\n")
        : "Aucun post indépendant récent dans LBMedia Office.";

    const importedHistoryText =
      editorialHistory.length >
      0
        ? editorialHistory
            .map(
              (
                item,
                index
              ) => {
                const lines = [
                  `${index + 1}. ${item.title}`,
                  `Support : ${item.channel}`,
                  `Date de publication : ${formatDate(
                    item.published_at
                  )}`,
                  `Résumé : ${cleanExcerpt(
                    item.summary
                  )}`,
                ];

                if (
                  item.source_url
                ) {
                  lines.push(
                    `Lien : ${item.source_url}`
                  );
                }

                return lines.join(
                  "\n"
                );
              }
            )
            .join("\n\n")
        : "Aucun historique éditorial antérieur n’a encore été importé.";

    const lbmediaContext =
      getLbmediaContext();

    const response =
      await openai.responses.create({
        model: "gpt-5-mini",

        instructions: `
Tu es Pénélope, l'assistante éditoriale de LBMedia.

Voici la connaissance éditoriale permanente de LBMedia :

${lbmediaContext}

Ta mission est de proposer des sujets réellement pertinents pour la prochaine communication de LBMedia.

SUPPORT DEMANDÉ

${channel}

Les propositions doivent être pensées dès le départ pour ce support.

Tu disposes de plusieurs sources d'historique :
- les actualités créées directement dans LBMedia Office ;
- les posts indépendants créés directement dans LBMedia Office ;
- l'historique éditorial antérieur importé dans LBMedia Office.

Tu dois considérer l'ensemble de ces sources comme la mémoire éditoriale de LBMedia.

RÈGLES GÉNÉRALES

- écris en français ;
- propose exactement 3 sujets ;
- tiens compte de l'identité, des activités, du positionnement et du public de LBMedia ;
- analyse les thèmes déjà traités dans l'ensemble de l'historique fourni ;
- évite de proposer un sujet déjà traité récemment sous un angle trop proche ;
- tiens compte du fait qu'un thème peut avoir déjà été traité sur un autre support ;
- si un thème mérite d'être repris, trouve un angle clairement différent ;
- les trois propositions doivent être différentes les unes des autres ;
- privilégie des sujets evergreen ou réellement utiles aux entreprises ;
- reste proche des activités réelles de LBMedia ;
- évite le jargon marketing ;
- évite les titres racoleurs ;
- évite les formulations génériques ;
- n'invente aucune actualité, étude, chiffre ou tendance récente ;
- ne prétends pas disposer d'informations que le contexte ne fournit pas.

ADAPTATION AU SUPPORT

${channelTopicInstructions[channel]}

TEMPORALITÉ ÉDITORIALE

- donne davantage de poids aux contenus les plus récents ;
- un sujet traité récemment doit généralement être évité ;
- un sujet plus ancien peut être repris s'il présente un nouvel angle réellement utile ;
- évite les répétitions éditoriales même lorsque les titres sont différents ;
- cherche aussi les thèmes importants pour LBMedia qui n'ont pas été abordés récemment.

Pour chaque proposition :

- title : titre ou idée éditoriale adaptée au support demandé ;
- angle : ce que la publication doit réellement expliquer, observer ou défendre ;
- reason : pourquoi ce sujet est pertinent dans la ligne éditoriale LBMedia et pourquoi il convient au support demandé.

Retourne exclusivement un objet JSON valide.
N'utilise aucun bloc Markdown.
`,

        input: `
Voici la mémoire éditoriale actuellement connue.

SUPPORT À PRÉPARER

${channel}

ACTUALITÉS RÉCENTES CRÉÉES DANS LBMEDIA OFFICE

${recentNewsText}

POSTS INDÉPENDANTS RÉCENTS CRÉÉS DANS LBMEDIA OFFICE

${standaloneText}

HISTORIQUE ÉDITORIAL ANTÉRIEUR IMPORTÉ

${importedHistoryText}

À partir de la connaissance LBMedia, du support demandé et de l'ensemble de cette mémoire éditoriale, propose maintenant 3 sujets spécifiquement adaptés à ${channel}.
`,

        text: {
          format: {
            type: "json_schema",
            name:
              "weekly_topics",
            strict: true,
            schema: {
              type: "object",
              properties: {
                topics: {
                  type:
                    "array",
                  minItems: 3,
                  maxItems: 3,
                  items: {
                    type:
                      "object",
                    properties: {
                      title: {
                        type:
                          "string",
                      },
                      angle: {
                        type:
                          "string",
                      },
                      reason: {
                        type:
                          "string",
                      },
                    },
                    required: [
                      "title",
                      "angle",
                      "reason",
                    ],
                    additionalProperties:
                      false,
                  },
                },
              },
              required: [
                "topics",
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
        "Pénélope n'a retourné aucune proposition."
      );
    }

    const result =
      JSON.parse(
        rawOutput
      ) as WeeklyTopicsResponse;

    if (
      !Array.isArray(
        result.topics
      ) ||
      result.topics.length !==
        3
    ) {
      throw new Error(
        "Les propositions retournées sont invalides."
      );
    }

    return NextResponse.json({
      success: true,
      topics:
        result.topics,
    });
  } catch (error) {
    console.error(
      "Weekly topics generation error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Pénélope n'a pas pu préparer les sujets.",
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