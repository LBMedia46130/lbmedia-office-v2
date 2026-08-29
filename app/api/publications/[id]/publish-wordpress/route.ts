import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getWordPressConfig() {
  const wordpressUrl =
    process.env.WORDPRESS_URL;

  const username =
    process.env.WORDPRESS_USERNAME;

  const appPassword =
    process.env.WORDPRESS_APP_PASSWORD;

  if (
    !wordpressUrl ||
    !username ||
    !appPassword
  ) {
    throw new Error(
      "Configuration WordPress incomplète."
    );
  }

  return {
    wordpressUrl,
    username,
    appPassword,
  };
}

export async function POST(
  _request: Request,
  context: RouteContext
) {
  const { id } = await context.params;

  try {
    const {
      wordpressUrl,
      username,
      appPassword,
    } = getWordPressConfig();

    const {
      data: publication,
      error: publicationError,
    } = await supabaseAdmin
      .from("publications")
      .select("*")
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

    if (
      publication.channel !== "website"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Cette publication n’est pas destinée au site web.",
        },
        {
          status: 400,
        }
      );
    }

    if (!publication.content?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le contenu de l’article est vide.",
        },
        {
          status: 400,
        }
      );
    }

    const authorization =
      Buffer.from(
        `${username}:${appPassword}`
      ).toString("base64");

    const payload = {
      title:
        publication.title ||
        "Actualité LBMedia",
      content:
        publication.content,
      slug:
        publication.slug ||
        undefined,
      excerpt:
        publication.meta_description ||
        undefined,
      status: "draft",
    };

    const hasExistingWordPressPost =
      typeof publication.wordpress_post_id ===
        "number" &&
      publication.wordpress_post_id > 0;

    const endpoint =
      hasExistingWordPressPost
        ? `${wordpressUrl}/wp-json/wp/v2/posts/${publication.wordpress_post_id}`
        : `${wordpressUrl}/wp-json/wp/v2/posts`;

    const wordpressResponse =
      await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Basic ${authorization}`,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      });

    const wordpressData =
      await wordpressResponse.json();

    if (!wordpressResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          message:
            hasExistingWordPressPost
              ? "WordPress a refusé la mise à jour du brouillon."
              : "WordPress a refusé la création du brouillon.",
          status:
            wordpressResponse.status,
          details:
            wordpressData,
        },
        {
          status:
            wordpressResponse.status,
        }
      );
    }

    const wordpressPostId =
      typeof wordpressData.id === "number"
        ? wordpressData.id
        : Number(wordpressData.id);

    const wordpressUrlValue =
      typeof wordpressData.link === "string"
        ? wordpressData.link.trim()
        : "";

    if (
      !Number.isFinite(wordpressPostId) ||
      wordpressPostId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "WordPress a traité le brouillon mais n’a pas retourné d’identifiant exploitable.",
        },
        {
          status: 502,
        }
      );
    }

    if (!wordpressUrlValue) {
      return NextResponse.json(
        {
          success: false,
          message:
            "WordPress a traité le brouillon mais n’a pas retourné son URL.",
          wordpress_post_id:
            wordpressPostId,
        },
        {
          status: 502,
        }
      );
    }

    const now =
      new Date().toISOString();

    const {
      data: updatedPublication,
      error: updateError,
    } = await supabaseAdmin
      .from("publications")
      .update({
        wordpress_post_id:
          wordpressPostId,
        published_url:
          wordpressUrlValue,
        updated_at:
          now,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le brouillon WordPress a été traité mais LBMedia Office n’a pas pu enregistrer ses informations.",
          error:
            updateError.message,
          wordpress_post_id:
            wordpressPostId,
          wordpress_url:
            wordpressUrlValue,
        },
        {
          status: 500,
        }
      );
    }

    let linkedPublicationsUpdated =
      0;

    if (publication.news_id) {
      const {
        data: linkedPublications,
        error: linkedUpdateError,
      } = await supabaseAdmin
        .from("publications")
        .update({
          link_url:
            wordpressUrlValue,
          updated_at:
            now,
        })
        .eq(
          "news_id",
          publication.news_id
        )
        .neq(
          "channel",
          "website"
        )
        .select("id");

      if (linkedUpdateError) {
        return NextResponse.json(
          {
            success: false,
            warning: true,
            message:
              "Le brouillon WordPress a bien été créé et son URL enregistrée, mais Office n’a pas pu transmettre ce lien aux déclinaisons.",
            error:
              linkedUpdateError.message,
            wordpress_post_id:
              wordpressPostId,
            wordpress_url:
              wordpressUrlValue,
            publication:
              updatedPublication,
          },
          {
            status: 500,
          }
        );
      }

      linkedPublicationsUpdated =
        linkedPublications?.length ??
        0;

      const {
        error:
          googleBusinessCtaError,
      } = await supabaseAdmin
        .from("publications")
        .update({
          call_to_action:
            "En savoir plus",
          updated_at:
            now,
        })
        .eq(
          "news_id",
          publication.news_id
        )
        .eq(
          "channel",
          "google_business"
        );

      if (
        googleBusinessCtaError
      ) {
        return NextResponse.json(
          {
            success: false,
            warning: true,
            message:
              "Le lien WordPress a bien été synchronisé avec les déclinaisons, mais Office n’a pas pu mettre à jour le CTA Google Business.",
            error:
              googleBusinessCtaError.message,
            wordpress_post_id:
              wordpressPostId,
            wordpress_url:
              wordpressUrlValue,
            publication:
              updatedPublication,
          },
          {
            status: 500,
          }
        );
      }
    }

    return NextResponse.json({
      success: true,
      action:
        hasExistingWordPressPost
          ? "updated"
          : "created",
      message:
        hasExistingWordPressPost
          ? "Brouillon WordPress mis à jour et lien synchronisé avec les déclinaisons."
          : "Brouillon WordPress créé et lien synchronisé avec les déclinaisons.",
      wordpress_post_id:
        wordpressPostId,
      wordpress_url:
        wordpressUrlValue,
      linked_publications_updated:
        linkedPublicationsUpdated,
      publication:
        updatedPublication,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Impossible de traiter le brouillon WordPress.",
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
