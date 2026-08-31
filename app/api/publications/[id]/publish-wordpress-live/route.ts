import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type WordPressResponse = {
  id?: number;
  link?: string;
  date_gmt?: string;
  code?: string;
  message?: string;
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
    wordpressUrl:
      wordpressUrl.replace(/\/+$/, ""),
    username,
    appPassword,
  };
}

function getAuthorization(
  username: string,
  appPassword: string
) {
  return `Basic ${Buffer.from(
    `${username}:${appPassword}`
  ).toString("base64")}`;
}

function formatExternalError(
  data: unknown
) {
  if (typeof data === "string") {
    return data;
  }

  try {
    return JSON.stringify(data);
  } catch {
    return "Réponse WordPress illisible.";
  }
}

export async function POST(
  _request: Request,
  context: RouteContext
) {
  const { id } =
    await context.params;

  try {
    const {
      data: publication,
      error: publicationError,
    } = await supabaseAdmin
      .from("publications")
      .select(`
        id,
        news_id,
        channel,
        wordpress_post_id
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

    if (
      publication.channel !==
      "website"
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

    if (
      !publication.wordpress_post_id
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Aucun brouillon WordPress n’existe pour cette actualité.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      wordpressUrl,
      username,
      appPassword,
    } = getWordPressConfig();

    const authorization =
      getAuthorization(
        username,
        appPassword
      );

    const wordpressResponse =
      await fetch(
        `${wordpressUrl}/wp-json/wp/v2/posts/${publication.wordpress_post_id}`,
        {
          method: "POST",
          headers: {
            Authorization:
              authorization,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            status: "publish",
          }),
          cache: "no-store",
        }
      );

    const rawResponse =
      await wordpressResponse.text();

    let wordpressData:
      WordPressResponse | string | null =
      null;

    if (rawResponse) {
      try {
        wordpressData =
          JSON.parse(
            rawResponse
          ) as WordPressResponse;
      } catch {
        wordpressData =
          rawResponse;
      }
    }

    if (!wordpressResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          message:
            `WordPress a refusé la publication (${wordpressResponse.status}) : ${formatExternalError(
              wordpressData
            )}`,
        },
        {
          status:
            wordpressResponse.status,
        }
      );
    }

    const data =
      typeof wordpressData ===
        "object" &&
      wordpressData !== null
        ? wordpressData
        : null;

    const publishedAt =
      data?.date_gmt
        ? new Date(
            `${data.date_gmt}Z`
          ).toISOString()
        : new Date().toISOString();

    const publishedUrl =
      typeof data?.link === "string"
        ? data.link.trim()
        : "";

    const {
      data: updatedPublication,
      error: updateError,
    } = await supabaseAdmin
      .from("publications")
      .update({
        status: "published",
        published_at:
          publishedAt,
        published_url:
          publishedUrl || null,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json(
        {
          success: false,
          message:
            "L’article a été publié sur WordPress, mais Office n’a pas pu enregistrer son nouveau statut.",
          error:
            updateError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (publication.news_id) {
      const {
        error: newsUpdateError,
      } = await supabaseAdmin
        .from("news")
        .update({
          status: "published",
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          publication.news_id
        );

      if (newsUpdateError) {
        return NextResponse.json(
          {
            success: false,
            warning: true,
            message:
              "L’article est publié sur WordPress et Office, mais le statut de l’actualité n’a pas pu être synchronisé.",
            error:
              newsUpdateError.message,
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
      message:
        "Article publié sur WordPress.",
      wordpress_post_id:
        publication.wordpress_post_id,
      wordpress_url:
        publishedUrl || null,
      publication:
        updatedPublication,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Impossible de publier l’article sur WordPress.",
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