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

      /*
       * Avec ignoreDuplicates, une requête concurrente
       * peut avoir créé la publication entre-temps.
       * Si Supabase ne nous retourne rien, on la relit.
       */
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

Ta mission est de rédiger ou d'améliorer une actualité destinée au site lbmedia.fr et de préparer en même temps ses éléments SEO/GEO.

Règles éditoriales :

- écris en français ;
- conserve un ton professionnel, concret, mature et accessible ;
- parle à des dirigeants de TPE/PME et entreprises locales ;
- évite le jargon marketing et les formulations artificielles ;
- privilégie l'expérience pratique, les exemples concrets et l'utilité ;
- n'invente aucun chiffre, étude, actualité ou tendance récente ;
- évite le remplissage et les répétitions ;
- l'article doit être directement exploitable comme contenu de référence LBMedia ;
- structure le contenu avec une introduction claire puis plusieurs sections utiles ;
- utilise des intertitres explicites dans le texte ;
- termine par une conclusion ou une ouverture naturelle vers l'accompagnement LBMedia ;
- n'écris pas pour satisfaire mécaniquement un outil de score SEO.

Règles SEO/GEO :

- choisis un seul mot-clé principal naturel et cohérent avec le sujet ;
- propose quelques mots-clés secondaires réellement liés au champ lexical ;
- crée un slug court, descriptif, en minuscules et avec des tirets ;
- rédige un SEO title clair et naturel ;
- rédige une meta description concise, utile et engageante ;
- rédige un texte ALT décrivant naturellement le visuel attendu ;
- pense aussi à la compréhension du sujet par les moteurs de recherche et les assistants IA : réponses claires, contexte explicite, vocabulaire précis et informations structurées ;
- ne sur-optimise pas et ne répète pas artificiellement le mot-clé.

Si un brouillon existe déjà, améliore-le plutôt que de repartir inutilement de zéro.

Retourne exclusivement un objet JSON valide.
N'utilise aucun bloc Markdown.
`,

        input: `
Voici le brouillon actuel :

${currentDraft}

Voici l'historique éditorial récent de LBMedia, à utiliser uniquement pour éviter les répétitions trop proches :

${editorialHistory}

Rédige maintenant la version article + SEO/GEO prête à être relue.
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
          generated.image_alt.trim(),
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