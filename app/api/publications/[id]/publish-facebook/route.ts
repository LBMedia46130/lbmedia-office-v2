import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type FacebookPublication = {
  id: string;
  news_id: string | null;
  channel: string;
  content: string;
  link_url: string | null;
  image_url: string | null;
  status: string;
  published_at: string | null;
};

export async function POST(
  _request: Request,
  context: RouteContext
) {
  const { id } = await context.params;

  const pageId =
    process.env.META_PAGE_ID;

  const accessToken =
    process.env.META_PAGE_ACCESS_TOKEN;

  if (!pageId || !accessToken) {
    return NextResponse.json(
      {
        success: false,
        message:
          "La configuration Meta est incomplète.",
      },
      {
        status: 500,
      }
    );
  }

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
        content,
        link_url,
        image_url,
        status,
        published_at
      `)
      .eq("id", id)
      .maybeSingle();

    if (publicationError) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Impossible de charger la publication Facebook.",
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

    const facebookPublication =
      publication as FacebookPublication;

    if (
      facebookPublication.channel !==
      "facebook"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Cette publication n'est pas destinée à Facebook.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      facebookPublication.status ===
      "published"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Cette publication Facebook est déjà marquée comme publiée.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      facebookPublication.status !==
        "ready" &&
      facebookPublication.status !==
        "scheduled"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "La publication Facebook doit d'abord être validée.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !facebookPublication.content?.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le contenu Facebook est vide.",
        },
        {
          status: 400,
        }
      );
    }

    let newsImageUrl:
      | string
      | null = null;

    if (
      !facebookPublication.image_url &&
      facebookPublication.news_id
    ) {
      const {
        data: news,
        error: newsError,
      } = await supabaseAdmin
        .from("news")
        .select(`
          id,
          image_url
        `)
        .eq(
          "id",
          facebookPublication.news_id
        )
        .maybeSingle();

      if (newsError) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Impossible de charger le visuel associé à l'actualité.",
            error:
              newsError.message,
          },
          {
            status: 500,
          }
        );
      }

      newsImageUrl =
        news?.image_url?.trim() ||
        null;
    }

    const messageParts = [
      facebookPublication.content.trim(),
    ];

    if (
      facebookPublication.link_url?.trim()
    ) {
      messageParts.push(
        facebookPublication.link_url.trim()
      );
    }

    const message =
      messageParts.join("\n\n");

    const imageUrl =
      facebookPublication.image_url?.trim() ||
      newsImageUrl ||
      null;

    let metaData: unknown = null;

    if (imageUrl) {
      const body =
        new URLSearchParams();

      body.set(
        "url",
        imageUrl
      );

      body.set(
        "caption",
        message
      );

      body.set(
        "access_token",
        accessToken
      );

      const response = await fetch(
        `https://graph.facebook.com/v26.0/${pageId}/photos`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
          },
          body: body.toString(),
          cache: "no-store",
        }
      );

      const rawResponse =
        await response.text();

      try {
        metaData = rawResponse
          ? JSON.parse(
              rawResponse
            )
          : null;
      } catch {
        metaData =
          rawResponse;
      }

      if (!response.ok) {
        console.error(
          "Facebook photo publication failed",
          {
            status:
              response.status,
            metaData,
          }
        );

        return NextResponse.json(
          {
            success: false,
            message:
              "Meta a refusé la publication Facebook avec visuel.",
            status:
              response.status,
            details:
              metaData,
          },
          {
            status:
              response.status,
          }
        );
      }
    } else {
      const body =
        new URLSearchParams();

      body.set(
        "message",
        message
      );

      body.set(
        "access_token",
        accessToken
      );

      const response = await fetch(
        `https://graph.facebook.com/v26.0/${pageId}/feed`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
          },
          body: body.toString(),
          cache: "no-store",
        }
      );

      const rawResponse =
        await response.text();

      try {
        metaData = rawResponse
          ? JSON.parse(
              rawResponse
            )
          : null;
      } catch {
        metaData =
          rawResponse;
      }

      if (!response.ok) {
        console.error(
          "Facebook publication failed",
          {
            status:
              response.status,
            metaData,
          }
        );

        return NextResponse.json(
          {
            success: false,
            message:
              "Meta a refusé la publication Facebook.",
            status:
              response.status,
            details:
              metaData,
          },
          {
            status:
              response.status,
          }
        );
      }
    }

    const data =
      metaData as {
        id?: string;
        post_id?: string;
      } | null;

    const facebookPostId =
      typeof data?.post_id ===
      "string"
        ? data.post_id
        : typeof data?.id ===
            "string"
          ? data.id
          : null;

    const publishedUrl =
      facebookPostId
        ? `https://www.facebook.com/${facebookPostId.replace(
            "_",
            "/posts/"
          )}`
        : null;

    const publishedAt =
      new Date().toISOString();

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
          publishedUrl,
        scheduled_at:
          null,
        updated_at:
          publishedAt,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le post a été publié sur Facebook, mais LBMedia Office n'a pas pu enregistrer son statut.",
          error:
            updateError.message,
          facebook_post_id:
            facebookPostId,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        imageUrl
          ? "Publication Facebook avec visuel effectuée."
          : "Publication Facebook effectuée.",
      facebook_post_id:
        facebookPostId,
      publication:
        updatedPublication,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Impossible de publier sur Facebook.",
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