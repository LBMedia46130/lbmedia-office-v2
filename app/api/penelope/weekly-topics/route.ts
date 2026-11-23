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
Le support est un article du site LBMedia. La ligne éditoriale reste centrée sur les enjeux de communication, la publicité radio et les sites internet.
Un article peut développer davantage le contexte et les conséquences d'un choix de communication, sans devenir un tutoriel qui enseigne au lecteur à remplacer une agence.
`,
  brevo: `
Le support est une newsletter. Choisis un sujet engageant sur la communication, la radio ou les sites internet, qui donne envie de poursuivre l'échange avec LBMedia.
Évite les recettes détaillées et les guides techniques.
`,
  google_business: `
Le support est la fiche Google Business de LBMedia, pas le thème obligatoire de la publication.
Cherche un message court et accessible sur la communication, la radio ou les sites internet, montrant un enjeu ou une valeur de service.
Ne propose pas systématiquement des conseils pour gérer sa fiche Google, des listes d'actions ou des astuces de référencement.
`,
  linkedin: `
Le support est LinkedIn. Propose une observation professionnelle, un enjeu de visibilité ou une réflexion accessible aux dirigeants d'entreprises locales.
Le texte futur doit pouvoir susciter une prise de conscience ou une discussion, sans ressembler à un cours de marketing, à un tutoriel ni à une publicité insistante.
Évite les titres provocateurs artificiels, les formules de consultant et les méthodes en plusieurs étapes.
`,
  facebook: `
Le support est Facebook. Privilégie des sujets compréhensibles immédiatement, ancrés dans la vie des entreprises locales : image, notoriété, radio de proximité, rôle d'un site internet.
Le ton peut être plus direct et chaleureux, sans donner de recettes de communication à appliquer soi-même.
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

LIGNE ÉDITORIALE PRIORITAIRE

Tu travailles pour la communication de LBMedia, une agence qui accompagne les entreprises locales, et non pour un média de tutoriels marketing.

Les trois piliers éditoriaux sont :
1. COMMUNICATION AU SENS LARGE : image de marque, notoriété, mémorisation, régularité, visibilité locale, cohérence des messages, choix et complémentarité des médias.
2. PUBLICITÉ RADIO : rôle de la radio locale, proximité, impact de la répétition, notoriété, campagnes accessibles aux entreprises locales, association avec le numérique et offre RFM Lot.
3. SITES INTERNET : première impression, confiance, crédibilité, refonte, efficacité commerciale, qualité d'expérience, visibilité sur Google et dans les réponses IA (SEO et GEO comme composantes du web, pas comme une source infinie de sujets techniques).

OBJECTIF COMMERCIAL ET ÉDITORIAL

- Faire prendre conscience d'un enjeu, révéler un besoin ou souligner la valeur d'un accompagnement professionnel.
- Susciter la réflexion et l'envie d'échanger avec LBMedia, sans transformer chaque post en argumentaire de vente.
- Donner au lecteur une information intéressante ou un point de vue, mais PAS un mode d'emploi lui permettant de réaliser lui-même une prestation de LBMedia.
- On peut aborder un phénomène d'actualité de la communication lorsque le contexte fourni en établit les faits ; n'invente pas de nouvelles, d'études ou de chiffres.

RÈGLES DE SÉLECTION

- Réponds en français naturel, sans jargon, effets de manche ni titres racoleurs.
- Retourne exactement trois propositions pour rester compatible avec le formulaire actuel.
- Privilégie une proposition par pilier lorsque l'historique le permet, sans forcer un pilier récemment surexploité.
- Rejette les listes d'astuces, les « X conseils », les « X erreurs à corriger », les checklists, les tutoriels, les scripts, les modèles à copier, les réglages techniques et les méthodes pas à pas.
- Rejette aussi les sujets sans lien clair avec les activités de LBMedia : recrutement, CRM, management, vente ou organisation interne, sauf nécessité directement démontrée par le contexte.
- Ne donne pas dans l'angle les étapes ou solutions détaillées qu'un lecteur pourrait exécuter sans LBMedia.
- Ne force pas les mêmes classiques à chaque génération (importance d'avoir un site, importance de communiquer, répétition radio) : explore de nouveaux éclairages sur les trois piliers.
- Confronte chaque proposition aux actualités, aux posts et à l'historique éditorial, quel que soit le support ; écarte les répétitions proches, même sous un titre différent.
- Un brouillon n'est pas une publication diffusée, mais son sujet est déjà prévu ; les brouillons multisupports peuvent correspondre à un seul thème.
- N'attribue aucune réalisation, expérience client, performance ou statistique à LBMedia sans preuve dans le contexte.
- Un sujet doit pouvoir intéresser un artisan, un commerçant ou un dirigeant de PME sans formation marketing.

EXEMPLES DU TYPE D'ANGLE SOUHAITÉ — NE PAS REPRENDRE SI DÉJÀ TRAITÉS

- « Être connu localement ne signifie pas être le premier auquel on pense » : mémoire de marque et régularité de la communication.
- « La publicité radio n'est pas réservée aux grandes enseignes » : accessibilité et rôle de la publicité de proximité.
- « Un site vieillissant peut desservir une entreprise pourtant excellente » : décalage entre qualité réelle et image numérique.

Il s'agit de prises de conscience et d'enjeux, pas de promesses de résultat, ni de conseils à appliquer soi-même.

ADAPTATION AU SUPPORT

${channelTopicInstructions[channel]}

TEMPORALITÉ ÉDITORIALE

- donne davantage de poids aux contenus les plus récents ;
- un sujet traité récemment doit généralement être évité ;
- un sujet plus ancien peut être repris s'il présente un nouvel angle réellement utile ;
- évite les répétitions éditoriales même lorsque les titres sont différents ;
- cherche aussi les thèmes importants pour LBMedia qui n'ont pas été abordés récemment.

Pour chaque proposition :

- title : un titre court, concret et naturel, de préférence moins de 90 caractères, sans formule publicitaire artificielle ;
- angle : un BRIEF de 1 à 3 phrases sur l'enjeu à développer, la réflexion à susciter et le rapport avec l'expertise de LBMedia ; pas une méthode à suivre, pas des astuces, pas le texte final ;
- reason : une phrase indiquant en quoi le sujet renforce la crédibilité de LBMedia ou peut susciter un besoin de communication, sans promesse commerciale artificielle.

Avant de répondre, vérifie que chaque titre pourrait être compris et jugé intéressant par un artisan ou un commerçant sans formation en marketing.

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