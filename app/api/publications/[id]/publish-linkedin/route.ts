import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type LinkedInPublication = {
  id: string;
  news_id: string | null;
  channel: string;
  content: string;
  link_url: string | null;
  image_url: string | null;
  image_alt: string | null;
  status: string;
  published_at: string | null;
};

type LinkedInConnection = {
  access_token: string;
  expires_at: string | null;
  organization_urn: string | null;
  organization_name: string | null;
};

type LinkedInImageInitResponse = {
  value?: {
    uploadUrl?: string;
    image?: string;
  };
};

type LinkedInImageStatusResponse = {
  status?: string;
};

const LINKEDIN_VERSION =
  "202608";

const LINKEDIN_API_BASE =
  "https://api.linkedin.com/rest";

async function readResponse(
  response: Response
) {
  const rawResponse =
    await response.text();

  if (!rawResponse) {
    return null;
  }

  try {
    return JSON.parse(
      rawResponse
    ) as unknown;
  } catch {
    return rawResponse;
  }
}

function wait(
  milliseconds: number
) {
  return new Promise<void>(
    (resolve) => {
      setTimeout(
        resolve,
        milliseconds
      );
    }
  );
}

function buildLinkedInHeaders(
  accessToken: string
) {
  return {
    Authorization:
      `Bearer ${accessToken}`,
    "LinkedIn-Version":
      LINKEDIN_VERSION,
    "X-Restli-Protocol-Version":
      "2.0.0",
    "Content-Type":
      "application/json",
  };
}

async function uploadImageToLinkedIn({
  accessToken,
  organizationUrn,
  imageUrl,
}: {
  accessToken: string;
  organizationUrn: string;
  imageUrl: string;
}) {
  const headers =
    buildLinkedInHeaders(
      accessToken
    );

  const initializeResponse =
    await fetch(
      `${LINKEDIN_API_BASE}/images?action=initializeUpload`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          initializeUploadRequest: {
            owner:
              organizationUrn,
          },
        }),
        cache: "no-store",
      }
    );

  const initializeData =
    await readResponse(
      initializeResponse
    );

  if (
    !initializeResponse.ok
  ) {
    throw new Error(
      `LinkedIn a refusé l'initialisation du visuel : ${
        typeof initializeData ===
        "string"
          ? initializeData
          : JSON.stringify(
              initializeData
            )
      }`
    );
  }

  const imageInit =
    initializeData as
      | LinkedInImageInitResponse
      | null;

  const uploadUrl =
    imageInit?.value
      ?.uploadUrl;

  const imageUrn =
    imageInit?.value
      ?.image;

  if (
    !uploadUrl ||
    !imageUrn
  ) {
    throw new Error(
      "LinkedIn n'a pas retourné les informations nécessaires pour envoyer le visuel."
    );
  }

  const sourceImageResponse =
    await fetch(
      imageUrl,
      {
        method: "GET",
        cache: "no-store",
      }
    );

  if (
    !sourceImageResponse.ok
  ) {
    throw new Error(
      "Impossible de télécharger le visuel avant son envoi à LinkedIn."
    );
  }

  const imageBuffer =
    await sourceImageResponse.arrayBuffer();

  const imageContentType =
    sourceImageResponse.headers.get(
      "content-type"
    ) ||
    "application/octet-stream";

  const uploadResponse =
    await fetch(
      uploadUrl,
      {
        method: "PUT",
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
          "Content-Type":
            imageContentType,
        },
        body:
          imageBuffer,
        cache: "no-store",
      }
    );

  const uploadData =
    await readResponse(
      uploadResponse
    );

  if (
    !uploadResponse.ok
  ) {
    throw new Error(
      `LinkedIn a refusé le visuel : ${
        typeof uploadData ===
        "string"
          ? uploadData
          : JSON.stringify(
              uploadData
            )
      }`
    );
  }

  for (
    let attempt = 0;
    attempt < 6;
    attempt += 1
  ) {
    const statusResponse =
      await fetch(
        `${LINKEDIN_API_BASE}/images/${encodeURIComponent(
          imageUrn
        )}`,
        {
          method: "GET",
          headers,
          cache: "no-store",
        }
      );

    const statusData =
      await readResponse(
        statusResponse
      );

    if (
      statusResponse.ok
    ) {
      const imageStatus =
        statusData as
          | LinkedInImageStatusResponse
          | null;

      if (
        imageStatus?.status ===
        "AVAILABLE"
      ) {
        return imageUrn;
      }

      if (
        imageStatus?.status &&
        imageStatus.status !==
          "WAITING_UPLOAD" &&
        imageStatus.status !==
          "PROCESSING"
      ) {
        throw new Error(
          `LinkedIn n'a pas pu traiter le visuel (statut : ${imageStatus.status}).`
        );
      }
    }

    await wait(500);
  }

  throw new Error(
    "Le visuel a été envoyé à LinkedIn mais n'est pas encore disponible pour publication."
  );
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
      error:
        publicationError,
    } = await supabaseAdmin
      .from("publications")
      .select(`
        id,
        news_id,
        channel,
        content,
        link_url,
        image_url,
        image_alt,
        status,
        published_at
      `)
      .eq("id", id)
      .maybeSingle();

    if (
      publicationError
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Impossible de charger la publication LinkedIn.",
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

    const linkedInPublication =
      publication as
        LinkedInPublication;

    if (
      linkedInPublication.channel !==
      "linkedin"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Cette publication n'est pas destinée à LinkedIn.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      linkedInPublication.status ===
      "published"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Cette publication LinkedIn est déjà marquée comme publiée.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      linkedInPublication.status !==
        "ready" &&
      linkedInPublication.status !==
        "scheduled"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "La publication LinkedIn doit d'abord être validée.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !linkedInPublication.content
        ?.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le contenu LinkedIn est vide.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: connection,
      error:
        connectionError,
    } = await supabaseAdmin
      .from(
        "linkedin_connection"
      )
      .select(`
        access_token,
        expires_at,
        organization_urn,
        organization_name
      `)
      .limit(1)
      .maybeSingle();

    if (
      connectionError
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Impossible de charger la connexion LinkedIn.",
          error:
            connectionError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (!connection) {
      return NextResponse.json(
        {
          success: false,
          message:
            "LinkedIn n'est pas connecté à Office.",
        },
        {
          status: 400,
        }
      );
    }

    const linkedInConnection =
      connection as
        LinkedInConnection;

    if (
      linkedInConnection
        .expires_at &&
      new Date(
        linkedInConnection
          .expires_at
      ).getTime() <= Date.now()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le jeton LinkedIn a expiré. Reconnecte LinkedIn depuis Office.",
        },
        {
          status: 401,
        }
      );
    }

    if (
      !linkedInConnection
        .organization_urn
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "La Page LinkedIn LBMedia n'est pas encore associée à Office.",
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
      !linkedInPublication
        .image_url &&
      linkedInPublication.news_id
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
          linkedInPublication
            .news_id
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
      linkedInPublication
        .content
        .trim(),
    ];

    if (
      linkedInPublication
        .link_url
        ?.trim()
    ) {
      messageParts.push(
        linkedInPublication
          .link_url
          .trim()
      );
    }

    const commentary =
      messageParts.join(
        "\n\n"
      );

    const imageUrl =
      linkedInPublication
        .image_url
        ?.trim() ||
      newsImageUrl ||
      null;

    const headers =
      buildLinkedInHeaders(
        linkedInConnection
          .access_token
      );

    let imageUrn:
      | string
      | null = null;

    if (imageUrl) {
      try {
        imageUrn =
          await uploadImageToLinkedIn({
            accessToken:
              linkedInConnection
                .access_token,
            organizationUrn:
              linkedInConnection
                .organization_urn,
            imageUrl,
          });
      } catch (
        imageError
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              imageError instanceof Error
                ? imageError.message
                : "Impossible d'envoyer le visuel à LinkedIn.",
          },
          {
            status: 502,
          }
        );
      }
    }

    const postPayload: Record<
      string,
      unknown
    > = {
      author:
        linkedInConnection
          .organization_urn,
      commentary,
      visibility:
        "PUBLIC",
      distribution: {
        feedDistribution:
          "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels:
          [],
      },
      lifecycleState:
        "PUBLISHED",
      isReshareDisabledByAuthor:
        false,
    };

    if (imageUrn) {
      postPayload.content = {
        media: {
          id:
            imageUrn,
          altText:
            linkedInPublication
              .image_alt
              ?.trim() ||
            "Visuel de la publication LBMedia",
        },
      };
    }

    const postResponse =
      await fetch(
        `${LINKEDIN_API_BASE}/posts`,
        {
          method: "POST",
          headers,
          body:
            JSON.stringify(
              postPayload
            ),
          cache: "no-store",
        }
      );

    const postData =
      await readResponse(
        postResponse
      );

    if (
      !postResponse.ok
    ) {
      console.error(
        "LinkedIn publication failed",
        {
          status:
            postResponse.status,
          data:
            postData,
          organizationUrn:
            linkedInConnection
              .organization_urn,
          imageUrn,
        }
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "LinkedIn a refusé la publication.",
          status:
            postResponse.status,
          details:
            postData,
        },
        {
          status:
            postResponse.status,
        }
      );
    }

    const linkedInPostId =
      postResponse.headers.get(
        "x-restli-id"
      );

    const publishedUrl =
      linkedInPostId
        ? `https://www.linkedin.com/feed/update/${linkedInPostId}/`
        : null;

    const publishedAt =
      new Date().toISOString();

    const {
      data:
        updatedPublication,
      error: updateError,
    } = await supabaseAdmin
      .from("publications")
      .update({
        status:
          "published",
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
            "Le post a été publié sur LinkedIn, mais LBMedia Office n'a pas pu enregistrer son statut. Ne republie pas le contenu.",
          error:
            updateError.message,
          linkedin_post_id:
            linkedInPostId,
          published_url:
            publishedUrl,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        imageUrn
          ? "Publication LinkedIn avec visuel effectuée."
          : "Publication LinkedIn effectuée.",
      linkedin_post_id:
        linkedInPostId,
      linkedin_image_urn:
        imageUrn,
      publication:
        updatedPublication,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Impossible de publier sur LinkedIn.",
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
