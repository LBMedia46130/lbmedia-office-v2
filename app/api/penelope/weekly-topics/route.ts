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
Les propositions sont destinées à des posts LinkedIn de LBMedia, une agence locale qui accompagne des TPE/PME.

Un sujet doit intéresser un dirigeant qui souhaite améliorer sa communication, son site internet ou sa visibilité, et non un spécialiste du marketing.

Choisis une situation quotidienne, un problème commercial précis, une observation métier ou une idée simple qui aide à décider.

Évite les sujets abstraits sur le leadership, les processus de vente, les ressources humaines, les scripts d'appel ou les outils de suivi, sauf lien direct et démontrable avec une prestation LBMedia.

Pas de théories artificielles, de faux paradoxes, de formules à la mode, de comparaisons forcées ni de titres en forme de slogans.

Un bon sujet LinkedIn doit pouvoir donner lieu à un post autonome, concret, d'environ 700 à 1 200 caractères. Il n'a pas besoin d'être provocateur ou de prendre systématiquement le contrepied d'une idée reçue.

Préserve un ton professionnel, naturel, accessible et ancré dans les préoccupations des entreprises locales.
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

- écris en français, de façon naturelle, avec des titres compréhensibles au premier coup d'œil ;
- retourne exactement 3 propositions pour préserver la compatibilité avec Office ;
- sélectionne les idées POUR leur utilité et leur pertinence, pas pour leur originalité à tout prix ;
- public cible : artisans, commerçants, indépendants et dirigeants de petites et moyennes entreprises, en particulier dans le Lot ;
- périmètre prioritaire : création et refonte de sites internet, visibilité Google (SEO), visibilité dans les réponses des IA (GEO), publicité radio locale RFM Lot, communication locale et complémentarité radio / web ;
- pour chaque idée, vérifie intérieurement qu'un client potentiel de LBMedia pourrait se reconnaître dans le problème et que LBMedia possède une compétence réelle pour y répondre ;
- écarte les sujets seulement liés de loin au marketing (recrutement, numéros de téléphone, CRM, management, parcours commercial théorique) sans rapport direct avec l'offre LBMedia ;
- propose 3 angles éditoriaux réellement distincts, idéalement sur des domaines d'expertise différents ; ne propose pas 3 reformulations d'une même idée ;
- compare les idées à l'historique sur TOUS les supports : écarte les thèmes traités récemment sous un angle similaire, y compris s'ils ont changé de titre ;
- les publications au statut draft, ready ou scheduled indiquent un sujet déjà prévu, pas une publication diffusée ; tiens-en compte pour éviter les doublons sans prétendre qu'il a déjà été publié ;
- les brouillons multisupports peuvent représenter un seul thème éditorial : ne les compte pas comme plusieurs thèmes distincts ;
- privilégie des sujets pratiques, facilement illustrables par un exemple concret, sans inventer d'exemple client réel ;
- tu peux proposer un sujet d'actualité seulement si les éléments factuels nécessaires sont présents dans le contexte fourni : ne prétends pas avoir recherché les dernières nouvelles ;
- bannis les titres artificiels, pompeux, dramatisés, mystérieux ou prétendument provocateurs ;
- bannis le jargon, les anglicismes inutiles et les expressions de consultant ;
- ne répète pas systématiquement "dirigeants", "TPE/PME" ou "LBMedia" dans les titres ;
- ne force pas un argument commercial dans chaque idée : la pertinence pour les clients passe avant l'autopromotion ;
- si les trois idées les plus évidentes ont déjà été traitées, explore d'autres problèmes concrets dans les domaines d'expertise de LBMedia au lieu de chercher des sujets éloignés du métier.

EXEMPLES DE STYLE — À NE PAS RECOPIER AUTOMATIQUEMENT

Naturel : "Un site internet peut être joli et ne générer aucun contact" ; "Une campagne radio a besoin de répétition pour être mémorisée" ; "Votre entreprise est-elle facile à trouver sur Google ?".
À éviter : "Faites des objections clients la matière première de votre communication" ; "Le dirigeant doit garder la main sur le message" ; "Mieux vaut être utile dans une ville que visible partout".
Ces exemples illustrent le niveau de simplicité attendu ; ne propose pas ces thèmes s'ils figurent déjà dans l'historique.

MÉTHODE DE SÉLECTION

Réfléchis d'abord à plusieurs problèmes réels rencontrés par des entreprises locales, élimine ceux qui ont déjà été traités, puis retiens seulement les trois idées les plus pertinentes et distinctes. Ne raconte pas cette réflexion dans ta réponse.

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
- angle : un BRIEF rédactionnel de 1 à 3 phrases courtes (ce qu'il faudra expliquer et quel exemple ou conseil utiliser), PAS un texte final à publier, PAS une suite de consignes abstraites ou un plan d'article ;
- reason : une justification courte (1 phrase) expliquant la pertinence réelle pour les clients de LBMedia, en mentionnant l'éventuel risque de répétition seulement s'il est utile.

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