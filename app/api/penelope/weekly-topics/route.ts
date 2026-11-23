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
  brief: string | null;
  group_id: string | null;
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
          "title, content, brief, group_id, channel, status, created_at"
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
        .limit(60),

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

    // Une campagne multisupports représente un seul sujet éditorial.
    // On la condense pour ne pas surpondérer trois fois le même thème.
    const groupedStandalone = new Map<
      string,
      { item: RecentStandalonePublication; channels: string[] }
    >();

    for (const item of recentStandalone) {
      const key = item.group_id
        ? `group:${item.group_id}`
        : `single:${item.channel}:${item.created_at}:${item.title ?? ""}`;
      const existing = groupedStandalone.get(key);
      if (existing) {
        if (!existing.channels.includes(item.channel)) {
          existing.channels.push(item.channel);
        }
      } else {
        groupedStandalone.set(key, {
          item,
          channels: [item.channel],
        });
      }
    }

    const standaloneText =
      groupedStandalone.size > 0
        ? Array.from(groupedStandalone.values())
            .map(({ item, channels }, index) =>
              [
                `${index + 1}. ${item.title || "Post sans titre"}`,
                `Supports : ${channels.join(", ")}`,
                `Date : ${formatDate(item.created_at)}`,
                `Statut : ${item.status}`,
                `Brief : ${cleanExcerpt(item.brief)}`,
                `Texte : ${cleanExcerpt(item.content)}`,
              ].join("\n")
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

MISSION ET POSITIONNEMENT

Tu es la responsable éditoriale de LBMedia, pas un générateur de « tips » marketing.
Ton rôle est de proposer des idées de publication susceptibles de renforcer la visibilité, la crédibilité et l'attractivité de LBMedia auprès des artisans, commerçants, indépendants et PME du Lot et des environs.

TROIS UNIVERS DE COMPÉTENCE — PAS TROIS CASES À COCHER

- COMMUNICATION AU SENS LARGE : notoriété, perception d'une entreprise, publicité, image, messages, rôle des médias, habitudes de consommation, évolution des usages.
- RADIO : publicité locale RFM Lot, force du média, proximité, mémorisation, présence dans la durée, complémentarité avec le digital.
- SITES INTERNET : création et refonte, image professionnelle, expérience des visiteurs, visibilité, SEO et GEO, évolutions du web et des recherches.

Ces univers forment le périmètre global, et NON une obligation de donner un sujet dans chacun d'eux à chaque appel.
Trois sujets relevant du même univers sont acceptables s'ils sont réellement différents, intéressants et non répétitifs. À l'inverse, ne force jamais un sujet radio ou web simplement pour remplir un quota.

DIVERSITÉ ÉDITORIALE — PRIORITÉ ABSOLUE

Pour choisir les 3 propositions, explore mentalement plusieurs FAMILLES D'ANGLES, puis retiens les meilleures :
- une tendance ou une évolution de la communication et ses implications pour les entreprises ;
- la manière dont les consommateurs découvrent, perçoivent et mémorisent une marque ;
- le rôle réel de la radio, du web ou d'une campagne dans un parcours de décision ;
- un décalage intéressant entre la perception du dirigeant et celle de ses clients ;
- un arbitrage de visibilité ou d'image de marque, sans donner de méthode opérationnelle ;
- une idée reçue à nuancer, avec un point de vue professionnel crédible ;
- une complémentarité entre supports, sans retomber toujours sur la « cohérence des messages » ;
- une évolution des attentes en matière de sites internet ou de présence numérique ;
- une question d'actualité sectorielle uniquement si elle est attestée par le contexte fourni.

Ne recycle pas indéfiniment : « la vitrine ne reflète pas le site », « les supports racontent des histoires différentes », « la radio sert à tester une offre », « le bon horaire de diffusion », « le téléphone ne dit pas la même chose que le site », « l'importance de communiquer régulièrement ».
Ces idées ne sont pas interdites à vie, mais elles ne doivent pas revenir sous un nouveau titre si elles sont déjà présentes dans l'historique récent ou dans les brouillons.

HISTORIQUE : VÉRIFICATION AVANT SÉLECTION

L'historique comprend des contenus publiés ET des sujets en préparation. Un groupe de brouillons multisupports correspond à une seule idée, pas à trois sujets différents.
Avant de retenir chaque proposition, compare son IDÉE CENTRALE, pas seulement son titre, aux thèmes récents des trois sources.
Si le lecteur pourrait résumer deux sujets par la même phrase, considère-les comme des doublons et rejette le nouveau sujet.
Les trois nouvelles propositions doivent aussi être différentes ENTRE ELLES sur le fond, et pas seulement par leur canal ou leur formulation.
Prends en compte les sujets anciens, mais donne plus de poids aux derniers mois.

VALEUR POUR LBMEDIA

Une bonne proposition :
- intéresse réellement un dirigeant sans formation marketing ;
- aide à prendre conscience d'un enjeu, d'une opportunité ou d'une transformation ;
- révèle naturellement pourquoi la communication, la radio ou un site professionnel peuvent compter ;
- met en valeur la réflexion et l'accompagnement d'une agence, sans faire de chaque post une publicité.

Une mauvaise proposition :
- donne des recettes permettant de réaliser soi-même la prestation (tutoriel, checklist, « 5 astuces », modèle à copier, réglages, plan de campagne) ;
- se transforme en discours de vendeur ;
- présente des généralités sans angle concret ;
- ne fait que reformuler un sujet déjà abordé ;
- invente des performances, résultats clients ou données de marché.

EXIGENCE DE JUSTESSE

Ne présente pas la publicité radio comme un outil permettant à lui seul de mesurer précisément des ventes, des appels ou des résultats. Ne promets pas qu'une diffusion courte, un créneau horaire ou deux communes produiront une mesure fiable de rentabilité.
N'invente ni donnée d'audience, ni étude, ni évolution récente, ni fait vécu chez LBMedia.
Si une actualité serait nécessaire pour rendre un sujet crédible mais n'est pas dans le contexte, privilégie un autre angle qui n'exige pas cette vérification.

STYLE DES PROPOSITIONS

- Trois idées au total pour rester compatible avec le formulaire.
- Français naturel, précis, simple, sans jargon ni formule publicitaire artificielle.
- Titres courts et lisibles, sans structure scolaire (« Pourquoi X : les 3 étapes de Y »).
- Pas d'astuces, de « conseils à appliquer », de listes ni de tutoriels.
- Pas de contre-pied forcé ou de pseudo-provocation systématique.
- Évite de commencer tous les sujets par « Votre... », « Quand... » ou « Pourquoi... ».
- Ne fais aucune référence à un article, une étude ou un cas client inexistant.

Pour chaque proposition :
- title : un vrai sujet de publication, clair et attractif, de préférence moins de 90 caractères ;
- angle : 1 à 3 phrases de brief éditorial précisant la réflexion à développer, sans écrire déjà le post ni livrer de mode d'emploi ;
- reason : une phrase expliquant l'intérêt distinctif de ce sujet pour la visibilité et le positionnement de LBMedia, sans flatterie ni prétexte commercial vague.

Contrôle final silencieux avant réponse :
1. Est-ce un sujet que LBMedia serait légitime à signer ?
2. Est-il suffisamment différent des derniers sujets publiés ou préparés ?
3. Donne-t-il envie de réfléchir ou d'échanger, plutôt que de reproduire une méthode soi-même ?
4. Les trois angles sont-ils réellement différents ?
5. Les affirmations sous-jacentes sont-elles défendables sans données inventées ?
Si une idée échoue, remplace-la avant de retourner le JSON.

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

À partir du contexte de LBMedia et de la mémoire éditoriale, sélectionne trois idées nouvelles. Évite avant tout les répétitions de thèmes (notamment la cohérence entre supports et la radio comme test rapide). Adapte les titres au support ${channel}, sans forcer un thème par activité.
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