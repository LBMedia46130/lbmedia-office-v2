import {
  NextResponse,
} from "next/server";

import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

export const dynamic =
  "force-dynamic";

const GOOGLE_TOKEN_URL =
  "https://oauth2.googleapis.com/token";

const GOOGLE_ACCOUNTS_URL =
  "https://mybusinessaccountmanagement.googleapis.com/v1/accounts";

const GOOGLE_BUSINESS_INFORMATION_URL =
  "https://mybusinessbusinessinformation.googleapis.com/v1";

const GOOGLE_MY_BUSINESS_V4_URL =
  "https://mybusiness.googleapis.com/v4";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type GoogleBusinessConnection = {
  id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string;
};

type GoogleBusinessAccount = {
  name: string;
  accountName?: string;
};

type GoogleBusinessLocation = {
  name: string;
  title?: string;
};

type GoogleLocalPost = {
  name?: string;
  summary?: string;
  searchUrl?: string;
  state?: string;
  createTime?: string;
};

type GoogleErrorResponse = {
  error?: {
    message?: string;
    status?: string;
  };
};

type GoogleBusinessPublication = {
  id: string;
  news_id: string | null;
  channel: string;
  content: string;
  link_url: string | null;
  call_to_action: string | null;
  image_url: string | null;
  status: string;
  published_at: string | null;
};

async function refreshAccessToken(
  connection: GoogleBusinessConnection
) {
  const clientId =
    process.env.GOOGLE_BUSINESS_CLIENT_ID;

  const clientSecret =
    process.env.GOOGLE_BUSINESS_CLIENT_SECRET;

  if (
    !clientId ||
    !clientSecret
  ) {
    throw new Error(
      "La configuration Google Business Profile est incomplète."
    );
  }

  if (
    !connection.refresh_token
  ) {
    throw new Error(
      "Aucun refresh token Google Business Profile n’est disponible. Reconnectez le compte Google."
    );
  }

  const response =
    await fetch(
      GOOGLE_TOKEN_URL,
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },

        body:
          new URLSearchParams({
            client_id:
              clientId,

            client_secret:
              clientSecret,

            refresh_token:
              connection.refresh_token,

            grant_type:
              "refresh_token",
          }),

        cache:
          "no-store",
      }
    );

  const result =
    await response.json();

  if (
    !response.ok ||
    !result.access_token
  ) {
    throw new Error(
      result.error_description ??
        result.error ??
        "Impossible de renouveler l’accès Google Business Profile."
    );
  }

  const expiresAt =
    new Date(
      Date.now() +
        Number(
          result.expires_in ??
          3600
        ) *
          1000
    ).toISOString();

  const {
    error:
      updateError,
  } = await supabaseAdmin
    .from(
      "google_business_connection"
    )
    .update({
      access_token:
        result.access_token,

      expires_at:
        expiresAt,

      token_type:
        result.token_type ??
        null,

      scope:
        result.scope ??
        null,

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      connection.id
    );

  if (
    updateError
  ) {
    throw new Error(
      `Impossible de mettre à jour la connexion Google Business Profile : ${updateError.message}`
    );
  }

  return result.access_token as string;
}

async function getAccessToken(
  connection: GoogleBusinessConnection
) {
  const expiresAt =
    new Date(
      connection.expires_at
    ).getTime();

  if (
    Number.isFinite(
      expiresAt
    ) &&
    expiresAt >
      Date.now() +
        60_000
  ) {
    return connection.access_token;
  }

  return refreshAccessToken(
    connection
  );
}

async function getSingleLocation(
  accessToken: string
) {
  const accountsResponse =
    await fetch(
      GOOGLE_ACCOUNTS_URL,
      {
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
        },
        cache:
          "no-store",
      }
    );

  const accountsResult =
    (await accountsResponse.json()) as
      {
        accounts?: GoogleBusinessAccount[];
      } & GoogleErrorResponse;

  if (
    !accountsResponse.ok
  ) {
    throw new Error(
      accountsResult.error
        ?.message ??
        "Impossible de récupérer les comptes Google Business Profile."
    );
  }

  const accounts =
    accountsResult.accounts ??
    [];

  if (
    accounts.length ===
      0
  ) {
    throw new Error(
      "Aucun compte Google Business Profile accessible."
    );
  }

  const locations:
    Array<{
      account:
        GoogleBusinessAccount;
      location:
        GoogleBusinessLocation;
    }> = [];

  for (
    const account of accounts
  ) {
    if (
      !account.name
    ) {
      continue;
    }

    const params =
      new URLSearchParams({
        readMask:
          "name,title",
        pageSize:
          "100",
      });

    const response =
      await fetch(
        `${GOOGLE_BUSINESS_INFORMATION_URL}/${account.name}/locations?${params.toString()}`,
        {
          headers: {
            Authorization:
              `Bearer ${accessToken}`,
          },
          cache:
            "no-store",
        }
      );

    const result =
      (await response.json()) as
        {
          locations?: GoogleBusinessLocation[];
        } & GoogleErrorResponse;

    if (
      !response.ok
    ) {
      throw new Error(
        result.error
          ?.message ??
          `Impossible de récupérer les établissements du compte ${account.accountName ?? account.name}.`
      );
    }

    for (
      const location of
        result.locations ??
        []
    ) {
      locations.push({
        account,
        location,
      });
    }
  }

  if (
    locations.length ===
      0
  ) {
    throw new Error(
      "Aucun établissement Google Business Profile accessible."
    );
  }

  if (
    locations.length >
      1
  ) {
    throw new Error(
      "Plusieurs établissements Google Business Profile sont accessibles. La sélection de l’établissement doit être ajoutée dans Office avant de publier."
    );
  }

  return locations[0];
}

function buildLocalPostBody(
  publication: GoogleBusinessPublication,
  imageUrl:
    | string
    | null
) {
  const body: {
    languageCode: string;
    summary: string;
    topicType: "STANDARD";
    callToAction?: {
      actionType:
        "LEARN_MORE";
      url: string;
    };
    media?: Array<{
      mediaFormat:
        "PHOTO";
      sourceUrl:
        string;
    }>;
  } = {
    languageCode:
      "fr-FR",

    summary:
      publication.content.trim(),

    topicType:
      "STANDARD",
  };

  const linkUrl =
    publication.link_url
      ?.trim();

  if (
    linkUrl
  ) {
    body.callToAction = {
      actionType:
        "LEARN_MORE",

      url:
        linkUrl,
    };
  }

  if (
    imageUrl
  ) {
    body.media = [
      {
        mediaFormat:
          "PHOTO",

        sourceUrl:
          imageUrl,
      },
    ];
  }

  return body;
}

export async function POST(
  _request: Request,
  context: RouteContext
) {
  const {
    id,
  } = await context.params;

  try {
    const {
      data:
        publication,
      error:
        publicationError,
    } = await supabaseAdmin
      .from(
        "publications"
      )
      .select(
        `
          id,
          news_id,
          channel,
          content,
          link_url,
          call_to_action,
          image_url,
          status,
          published_at
        `
      )
      .eq(
        "id",
        id
      )
      .maybeSingle();

    if (
      publicationError
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Impossible de charger la publication Google Business.",

          error:
            publicationError.message,
        },
        {
          status:
            500,
        }
      );
    }

    if (
      !publication
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Publication introuvable.",
        },
        {
          status:
            404,
        }
      );
    }

    const googlePublication =
      publication as GoogleBusinessPublication;

    if (
      googlePublication.channel !==
      "google_business"
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Cette publication n'est pas destinée à Google Business Profile.",
        },
        {
          status:
            400,
        }
      );
    }

    if (
      googlePublication.status ===
      "published"
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Cette publication Google Business est déjà marquée comme publiée.",
        },
        {
          status:
            400,
        }
      );
    }

    if (
      googlePublication.status !==
        "ready" &&
      googlePublication.status !==
        "scheduled"
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "La publication Google Business doit d'abord être validée.",
        },
        {
          status:
            400,
        }
      );
    }

    if (
      !googlePublication.content
        ?.trim()
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Le contenu Google Business est vide.",
        },
        {
          status:
            400,
        }
      );
    }

    let newsImageUrl:
      | string
      | null =
      null;

    if (
      !googlePublication.image_url &&
      googlePublication.news_id
    ) {
      const {
        data:
          news,
        error:
          newsError,
      } = await supabaseAdmin
        .from(
          "news"
        )
        .select(
          `
            id,
            image_url
          `
        )
        .eq(
          "id",
          googlePublication.news_id
        )
        .maybeSingle();

      if (
        newsError
      ) {
        return NextResponse.json(
          {
            success:
              false,

            message:
              "Impossible de charger le visuel associé à l'actualité.",

            error:
              newsError.message,
          },
          {
            status:
              500,
          }
        );
      }

      newsImageUrl =
        news?.image_url
          ?.trim() ??
        null;
    }

    const imageUrl =
      googlePublication.image_url
        ?.trim() ||
      newsImageUrl ||
      null;

    const {
      data:
        connection,
      error:
        connectionError,
    } = await supabaseAdmin
      .from(
        "google_business_connection"
      )
      .select(
        `
          id,
          access_token,
          refresh_token,
          expires_at
        `
      )
      .limit(1)
      .maybeSingle();

    if (
      connectionError
    ) {
      throw new Error(
        `Impossible de charger la connexion Google Business Profile : ${connectionError.message}`
      );
    }

    if (
      !connection
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Google Business Profile n’est pas encore connecté.",
        },
        {
          status:
            401,
        }
      );
    }

    const accessToken =
      await getAccessToken(
        connection as GoogleBusinessConnection
      );

    const {
      account,
      location,
    } =
      await getSingleLocation(
        accessToken
      );

    const accountId =
      account.name
        .replace(
          /^accounts\//,
          ""
        );

    const locationId =
      location.name
        .replace(
          /^locations\//,
          ""
        );

    const parent =
      `accounts/${accountId}/locations/${locationId}`;

    const response =
      await fetch(
        `${GOOGLE_MY_BUSINESS_V4_URL}/${parent}/localPosts`,
        {
          method:
            "POST",

          headers: {
            Authorization:
              `Bearer ${accessToken}`,

            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(
              buildLocalPostBody(
                googlePublication,
                imageUrl
              )
            ),

          cache:
            "no-store",
        }
      );

    const result =
      (await response.json()) as
        GoogleLocalPost &
        GoogleErrorResponse;

    if (
      !response.ok
    ) {
      console.error(
        "Google Business publication failed",
        {
          status:
            response.status,

          result,
        }
      );

      return NextResponse.json(
        {
          success:
            false,

          message:
            "Google a refusé la publication Google Business Profile.",

          status:
            response.status,

          details:
            result,
        },
        {
          status:
            response.status,
        }
      );
    }

    const publishedAt =
      new Date().toISOString();

    const publishedUrl =
      result.searchUrl ??
      null;

    const {
      data:
        updatedPublication,
      error:
        updateError,
    } = await supabaseAdmin
      .from(
        "publications"
      )
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
      .eq(
        "id",
        id
      )
      .select(
        "*"
      )
      .single();

    if (
      updateError
    ) {
      return NextResponse.json(
        {
          success:
            false,

          sent:
            true,

          message:
            "La publication a été créée sur Google Business Profile, mais LBMedia Office n'a pas pu enregistrer son statut. Ne republiez pas le contenu.",

          error:
            updateError.message,

          google_post_name:
            result.name ??
            null,

          published_url:
            publishedUrl,
        },
        {
          status:
            500,
        }
      );
    }

    return NextResponse.json({
      success:
        true,

      message:
        imageUrl
          ? "Publication Google Business avec visuel effectuée."
          : "Publication Google Business effectuée.",

      google_post_name:
        result.name ??
        null,

      google_post_state:
        result.state ??
        null,

      published_url:
        publishedUrl,

      publication:
        updatedPublication,
    });
  } catch (
    error
  ) {
    return NextResponse.json(
      {
        success:
          false,

        message:
          "Impossible de publier sur Google Business Profile.",

        error:
          error instanceof Error
            ? error.message
            : "Erreur inconnue",
      },
      {
        status:
          500,
      }
    );
  }
}
