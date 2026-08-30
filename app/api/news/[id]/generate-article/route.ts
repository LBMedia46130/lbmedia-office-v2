import OpenAI from "openai";
import { NextResponse } from "next/server";

import { getLbmediaContext } from "@/lib/lbmedia-context";
import { supabaseAdmin } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type GeneratedArticle = {
  title: string;
  content: string;
  focus_keyword: string;
  secondary_keywords: string;
  slug: string;
  seo_title: string;
  meta_description: string;
  image_alt: string;
};

type WebsitePublication = {
  id: string;
  status: string;
  focus_keyword: string | null;
  secondary_keywords: string | null;
  slug: string | null;
  seo_title: string | null;
  meta_description: string | null;
  image_alt: string | null;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(
  _request: Request,
  context: RouteContext
) {
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

  const { id } = await context.params;

  try {
    const {
      data: news,
      error: newsError,
    } = await supabaseAdmin
      .from("news")
      .select(
        "id, title, content, status, image_url, source_url"
      )
      .eq("id", id)
      .maybeSingle();

    if (newsError) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Impossible de charger l’actualité.",
          error: newsError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (!news) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Actualité introuvable.",
        },
        {
          status: 404,
        }
      );
    }

    if (news.status === "published") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Une actualité déjà publiée ne peut pas être régénérée.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * La publication website existe normalement
     * lorsque l'actualité a déjà été ouverte dans
     * l'éditeur.
     *
     * Lorsqu'une actualité vient directement de
     * Pénélope, elle peut ne pas encore exister.
     * On la crée donc automatiquement si besoin.
     */
    const {
      data: existingWebsitePublication,
      error: publicationError,
    } = await supabaseAdmin
      .from("publications")
      .select(
        "id, status, focus_keyword, secondary_keywords, slug, seo_title, meta_description, image_alt"
      )
      .eq("news_id", id)
      .eq("channel", "website")
      .maybeSingle();

    if (publicationError) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Impossible de charger la publication WordPress.",
          error:
            publicationError.message,
        },
        {
          status: 500,
        }
      );
    }

    let websitePublication =
      existingWebsitePublication as WebsitePublication | null;

    if (!websitePublication) {
      const {
        data: createdWebsitePublication,
        error: creationError,
      } = await supabaseAdmin
        .from("publications")
        .upsert(
          {
            news_id: id,
            channel: "website",
            title: news.title,
            content: news.content ?? "",
            status: "draft",
          },
          {
            onConflict:
              "news_id,channel",
            ignoreDuplicates: true,
          }
        )
        .select(
          "id, status, focus_keyword, secondary_keywords, slug, seo_title, meta_description, image_alt"
        )
        .maybeSingle();

      if (creationError) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Impossible de préparer la publication WordPress.",
            error:
              creationError.message,
          },
          {
            status: 500,
          }
        );
      }

      websitePublication =
        createdWebsitePublication as WebsitePublication | null;

      if (!websitePublication) {
        const {
          data: reloadedWebsitePublication,
          error: reloadError,
        } = await supabaseAdmin
          .from("publications")
          .select(
            "id, status, focus_keyword, secondary_keywords, slug, seo_title, meta_description, image_alt"
          )
          .eq("news_id", id)
          .eq("channel", "website")
          .maybeSingle();

        if (reloadError) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Impossible de charger la publication WordPress préparée.",
              error:
                reloadError.message,
            },
            {
              status: 500,
            }
          );
        }

        websitePublication =
          reloadedWebsitePublication as WebsitePublication | null;
      }
    }

    if (!websitePublication) {
      return NextResponse.json(
        {
          success: false,
          message:
            "La publication WordPress associée n’a pas pu être préparée.",
        },
        {
          status: 500,
        }
      );
    }

    const {
      data: recentNews,
      error: recentNewsError,
    } = await supabaseAdmin
      .from("news")
      .select(
        "title, content, status, created_at"
      )
      .neq("id", id)
      .order("created_at", {
        ascending: false,
      })
      .limit(12);

    if (recentNewsError) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Impossible de consulter l’historique éditorial.",
          error:
            recentNewsError.message,
        },
        {
          status: 500,
        }
      );
    }

    const editorialHistory =
      (recentNews ?? []).length > 0
        ? (recentNews ?? [])
            .map(
              (
                item,
                index
              ) => {
                const excerpt =
                  item.content
                    ?.trim()
                    .replace(
                      /\s+/g,
                      " "
                    )
                    .slice(
                      0,
                      260
                    ) ||
                  "Aucun contenu";

                return [
                  `${index + 1}. ${item.title}`,
                  `Statut : ${item.status}`,
                  `Résumé : ${excerpt}`,
                ].join("\n");
              }
            )
            .join("\n\n")
        : "Aucune actualité précédente.";

    const lbmediaContext =
      getLbmediaContext();

    const currentDraft = [
      `Titre actuel : ${news.title || "Non défini"}`,
      "",
      "Contenu actuel :",
      news.content?.trim() ||
        "Aucun contenu rédigé.",
      "",
      `Mot-clé principal actuel : ${
        websitePublication.focus_keyword ||
        "Non défini"
      }`,
      `Mots-clés secondaires actuels : ${
        websitePublication.secondary_keywords ||
        "Non définis"
      }`,
    ].join("\n");

    const response =
      await openai.responses.create({
        model: "gpt-5-mini",

        instructions: `
Tu es Pénélope, l'assistante éditoriale de LBMedia.

Voici la connaissance éditoriale permanente de LBMedia :

${lbmediaContext}

Ta mission est de rédiger ou d'améliorer une actualité destinée au site lbmedia.fr et de préparer en même temps ses éléments SEO et GEO.

L'objectif prioritaire reste toujours de produire un bon article pour un lecteur humain.
L'optimisation SEO et GEO doit renforcer la qualité, la compréhension et la visibilité du contenu sans rendre la rédaction artificielle.

Règles éditoriales :

- écris en français ;
- conserve un ton professionnel, concret, mature et accessible ;
- parle à des dirigeants de TPE/PME et entreprises locales lorsque le sujet s'y prête ;
- pour les prestations web, SEO ou GEO de LBMedia, ne limite pas artificiellement le propos au Lot ou aux entreprises locales ;
- évite le jargon marketing et les formulations artificielles ;
- privilégie l'expérience pratique, les exemples concrets et l'utilité ;
- n'invente aucun chiffre, étude, actualité ou tendance récente ;
- n'invente aucune expérience, réalisation ou résultat obtenu par LBMedia qui ne figure pas dans le contexte fourni ;
- évite le remplissage et les répétitions ;
- l'article doit être directement exploitable comme contenu de référence LBMedia ;
- structure le contenu avec une introduction claire puis plusieurs sections utiles ;
- le champ content doit utiliser une structure Markdown simple destinée à être convertie ensuite en HTML dans Elementor ;
- n'insère jamais le titre principal de l'article dans content : il est géré séparément par le champ title ;
- utilise obligatoirement "## " au début de chaque intertitre principal afin qu'il soit converti en véritable titre H2 dans WordPress ;
- utilise "### " uniquement lorsqu'un sous-niveau est réellement utile afin qu'il soit converti en H3 ;
- n'utilise jamais "# " dans content ;
- laisse une ligne vide avant et après chaque intertitre ;
- sépare les paragraphes par une ligne vide ;
- utilise "- " pour une liste à puces lorsqu'une liste améliore réellement la lecture ;
- utilise "1. ", "2. ", "3. " pour une liste numérotée lorsqu'un ordre est réellement nécessaire ;
- privilégie le texte rédigé : ne transforme pas l'article en succession de listes ;
- ne laisse jamais un intertitre sous forme de simple phrase isolée : tout intertitre doit commencer par "## " ou "### " ;
- n'utilise pas d'intertitres génériques comme "Introduction", "Développement", "Conclusion", "À retenir" ou "Quelques conseils" ;
- ne produis aucun HTML dans content ;
- ne produis aucun bloc de code Markdown ;
- termine naturellement l'article, avec si pertinent une ouverture vers l'accompagnement LBMedia, sans imposer un intertitre "Conclusion" ;
- n'écris jamais pour satisfaire mécaniquement un outil de score SEO ;
- évite les formulations typiques de contenus SEO génériques comme "dans un monde de plus en plus digital", "à l'ère du numérique", "il est essentiel de" ou toute introduction interchangeable avec des centaines d'autres articles.

Intention de recherche :

Avant de rédiger, identifie mentalement la question principale à laquelle le lecteur cherche une réponse.

L'article doit :
- traiter réellement cette question et ne pas seulement tourner autour du sujet ;
- apporter rapidement au lecteur les premiers éléments de réponse ;
- développer ensuite les explications, conséquences, exemples ou recommandations nécessaires ;
- privilégier les informations utiles à la longueur artificielle ;
- rester cohérent avec l'activité et l'expertise de LBMedia.

Ne mentionne jamais explicitement dans l'article "l'intention de recherche", "le SEO", "le GEO" ou les contraintes de rédaction, sauf lorsque ces notions constituent précisément le sujet traité.

Structure et compréhension :

- chaque grande section doit traiter une idée identifiable ;
- privilégie des intertitres qui annoncent clairement ce que la section va expliquer ;
- lorsqu'une question naturelle correspond au sujet, un intertitre peut être formulé comme cette question, mais ne transforme pas tous les H2 en questions ;
- évite les titres vagues, promotionnels ou purement créatifs qui empêchent de comprendre le contenu de la section ;
- fais en sorte qu'un lecteur puisse comprendre les idées essentielles en parcourant le titre, l'introduction et les H2 ;
- un paragraphe doit autant que possible développer une idée principale clairement identifiable ;
- évite les références ambiguës lorsqu'il est préférable de nommer clairement l'entreprise, le service, la technologie ou le concept concerné.

Règles SEO :

- choisis un seul mot-clé principal naturel et cohérent avec le sujet et avec la recherche qu'un prospect pourrait réellement effectuer ;
- le mot-clé principal doit rester suffisamment précis pour représenter le sujet central de l'article ;
- propose quelques mots-clés secondaires réellement liés au champ lexical et à des formulations complémentaires utiles ;
- n'empile pas des variantes presque identiques du même mot-clé ;
- utilise naturellement le sujet ou le mot-clé principal dans le titre lorsqu'il peut s'y intégrer sans dégrader celui-ci ;
- fais apparaître naturellement le sujet principal dès le début de l'article ;
- utilise le mot-clé principal ou une variante sémantique pertinente dans au moins un H2 lorsque cela est naturel ;
- répartis le vocabulaire associé au sujet dans l'article sans répétition mécanique ;
- ne cherche jamais à atteindre une densité de mot-clé déterminée ;
- ne répète pas artificiellement une expression exacte lorsqu'un synonyme ou une formulation naturelle est préférable ;
- crée un slug court, descriptif, en minuscules et avec des tirets ;
- évite les mots inutiles dans le slug ;
- rédige un SEO title clair, naturel et fidèle au contenu ;
- le SEO title doit donner envie de comprendre le sujet sans recourir au sensationnalisme ;
- rédige une meta description concise, informative et engageante qui résume l'intérêt réel de l'article ; le mot-clé principal exact doit apparaître naturellement au moins une fois dans cette meta description ;
- rédige un texte ALT qui décrit naturellement le visuel attendu et son rapport avec le sujet ;
- ne bourre jamais le texte ALT de mots-clés ;
- Rank Math sera utilisé ensuite comme outil de contrôle : ne dégrade jamais la qualité éditoriale dans le seul but d'anticiper son score.

Maillage interne :

- lorsqu'une page LBMedia fournie dans le contexte correspond directement au sujet de l'article ou à une activité LBMedia abordée dans l'article, insère obligatoirement au moins un lien interne vers cette page dans content ;
- utilise exclusivement les URL LBMedia explicitement fournies dans le contexte permanent ;
- n'invente jamais une URL ou un slug ;
- utilise la syntaxe Markdown [ancre descriptive](URL) ;
- choisis une ancre naturelle et descriptive intégrée à la phrase ;
- n'utilise jamais des ancres comme "cliquez ici", "voir ici" ou "en savoir plus" ;
- privilégie les pages métier ou les ressources directement liées au sujet ;
- ne place pas automatiquement un lien vers la page Contact ;
- ne place pas plusieurs liens vers la même page dans un même article ;
- si aucune page LBMedia disponible ne correspond réellement au sujet, n'invente pas de lien ; dans tous les autres cas, au moins un lien interne pertinent est obligatoire ;
- le maillage doit rester discret et utile au lecteur.

Liens externes :

- un lien externe n'est pas obligatoire dans chaque article ;
- ajoute un lien externe uniquement lorsqu'une source extérieure apporte une information, une définition, une référence officielle ou un complément réellement utile ;
- privilégie les sources officielles, institutionnelles ou faisant autorité sur le sujet ;
- lorsqu'une URL source est fournie avec l'actualité et qu'elle constitue une référence utile et fiable, tu peux l'utiliser ;
- n'invente jamais l'URL précise d'une source que tu ne peux pas déterminer avec certitude à partir des informations fournies ;
- ne crée jamais un lien externe uniquement pour améliorer un score SEO ;
- utilise la syntaxe Markdown [ancre descriptive](URL) ;
- évite de renvoyer vers un concurrent commercial direct de LBMedia lorsqu'une source neutre ou officielle permet de documenter le même point.

Règles GEO et compréhension par les assistants IA :

Le contenu doit être facilement compris, interprété et exploité par un moteur de recherche ou un assistant IA, sans modifier artificiellement le style éditorial.

Pour cela :

- nomme clairement les concepts, entreprises, services et technologies dont tu parles ;
- lorsqu'un concept important peut être mal compris, donne une explication simple et directe avant de développer ;
- lorsqu'une question importante est soulevée par le sujet, donne une réponse identifiable avant d'ajouter les nuances ;
- privilégie les formulations factuelles et précises aux affirmations vagues ;
- explique les relations de cause à effet lorsqu'elles sont importantes pour comprendre le sujet ;
- distingue clairement les notions proches lorsqu'une confusion est possible ;
- apporte du contexte aux informations : indique de quoi l'on parle, pour qui et dans quelle situation ;
- lorsqu'une recommandation est formulée, explique pourquoi elle est pertinente ;
- lorsque plusieurs solutions ou approches existent, explique leurs différences plutôt que de simplement les énumérer ;
- construis des paragraphes suffisamment autonomes pour que leur idée principale reste compréhensible même lorsqu'ils sont lus séparément ;
- évite les pronoms ou formulations ambiguës lorsqu'ils rendent l'information difficile à attribuer ;
- privilégie des phrases pouvant être comprises sans dépendre d'un contexte implicite trop important ;
- ne crée jamais de faux chiffres, citations, études, témoignages ou sources dans le but de renforcer artificiellement l'autorité du contenu ;
- ne prétends jamais que LBMedia est une référence, un leader ou une autorité sans élément factuel fourni ;
- lorsque l'expérience ou le positionnement réel de LBMedia apporte une valeur au sujet, utilise les éléments présents dans le contexte pour apporter un éclairage concret ;
- ne crée pas systématiquement une FAQ : utilise une structure questions-réponses uniquement lorsqu'elle améliore réellement le traitement du sujet ;
- ne rédige jamais des passages uniquement pour "être cité par une IA" : la citabilité doit découler de la précision et de l'utilité du contenu.

SEO et GEO doivent rester complémentaires :

- SEO : aider les moteurs de recherche à identifier précisément le sujet et sa pertinence pour une recherche ;
- GEO : aider les moteurs génératifs et assistants IA à comprendre précisément les informations, leur contexte et les relations entre les concepts ;
- dans les deux cas, la priorité reste de répondre correctement et naturellement au lecteur.

Si un brouillon existe déjà :

- conserve ses bonnes idées, son angle et les informations utiles ;
- améliore sa structure, sa précision et sa couverture du sujet ;
- ne repars pas inutilement de zéro ;
- ne supprime pas une information utile uniquement parce qu'elle ne contient pas le mot-clé principal ;
- corrige les passages trop vagues ou répétitifs ;
- préserve le ton éditorial existant lorsqu'il est déjà satisfaisant.

Exemple de structure attendue dans le champ content :

Paragraphe d'ouverture qui pose clairement le sujet et apporte rapidement les premiers éléments utiles au lecteur.

## Un premier intertitre précis et utile

Un ou plusieurs paragraphes développent cette première idée avec suffisamment de contexte pour être compris sans ambiguïté.

## Un deuxième intertitre précis

Un paragraphe peut introduire une liste lorsque cela apporte réellement quelque chose :

- premier point ;
- deuxième point ;
- troisième point.

### Un sous-angle si nécessaire

Un ou plusieurs paragraphes développent cette sous-partie.

## Une dernière partie utile

Le texte se termine naturellement, sans ajouter artificiellement un intertitre "Conclusion".

Retourne exclusivement un objet JSON valide.
N'utilise aucun bloc Markdown autour du JSON.
`,

        input: `
Voici le brouillon actuel :

${currentDraft}

URL source éventuellement associée à cette actualité :
${news.source_url?.trim() || "Aucune URL source fournie."}

Voici l'historique éditorial récent de LBMedia, à utiliser uniquement pour éviter les répétitions trop proches :

${editorialHistory}

Rédige maintenant la version article + SEO/GEO prête à être relue.

Avant de produire le JSON final, détermine silencieusement :
- le sujet central ;
- l'intention de recherche principale ;
- la réponse essentielle que le lecteur doit obtenir ;
- le mot-clé principal le plus naturel ;
- les notions qui doivent être explicitées pour que l'article soit compris sans ambiguïté ;
- les éventuelles pages LBMedia qui constituent un prolongement réellement utile ;
- si l'URL source fournie mérite réellement d'être citée dans l'article.

N'affiche pas cette analyse dans la réponse.
`,

        text: {
          format: {
            type: "json_schema",
            name: "lbmedia_article",
            strict: true,
            schema: {
              type: "object",
              properties: {
                title: {
                  type: "string",
                },
                content: {
                  type: "string",
                },
                focus_keyword: {
                  type: "string",
                },
                secondary_keywords: {
                  type: "string",
                },
                slug: {
                  type: "string",
                },
                seo_title: {
                  type: "string",
                },
                meta_description: {
                  type: "string",
                },
                image_alt: {
                  type: "string",
                },
              },
              required: [
                "title",
                "content",
                "focus_keyword",
                "secondary_keywords",
                "slug",
                "seo_title",
                "meta_description",
                "image_alt",
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
        "Pénélope n'a retourné aucun article."
      );
    }

    const generated =
      JSON.parse(
        rawOutput
      ) as GeneratedArticle;

    const now =
      new Date().toISOString();

    const {
      data: updatedNews,
      error: updateNewsError,
    } = await supabaseAdmin
      .from("news")
      .update({
        title:
          generated.title.trim(),
        content:
          generated.content.trim(),
        updated_at: now,
      })
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (
      updateNewsError ||
      !updatedNews
    ) {
      throw new Error(
        updateNewsError?.message ||
          "Impossible d'enregistrer l'article généré."
      );
    }

    const {
      data: updatedPublication,
      error: updatePublicationError,
    } = await supabaseAdmin
      .from("publications")
      .update({
        title:
          generated.title.trim(),
        content:
          generated.content.trim(),
        focus_keyword:
          generated.focus_keyword.trim(),
        secondary_keywords:
          generated.secondary_keywords.trim(),
        slug:
          generated.slug.trim(),
        seo_title:
          generated.seo_title.trim(),
        meta_description:
          generated.meta_description.trim(),
        image_alt:
          generated.focus_keyword.trim(),
        updated_at: now,
      })
      .eq(
        "id",
        websitePublication.id
      )
      .select("*")
      .maybeSingle();

    if (
      updatePublicationError ||
      !updatedPublication
    ) {
      throw new Error(
        updatePublicationError?.message ||
          "Impossible d'enregistrer les éléments SEO/GEO."
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Article et éléments SEO/GEO générés.",
      news: updatedNews,
      publication:
        updatedPublication,
    });
  } catch (error) {
    console.error(
      "Article generation error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Pénélope n'a pas pu rédiger l’article.",
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
