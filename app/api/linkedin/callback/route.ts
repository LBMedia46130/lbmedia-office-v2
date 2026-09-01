import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

export const dynamic =
  "force-dynamic";

const LINKEDIN_TOKEN_URL =
  "https://www.linkedin.com/oauth/v2/accessToken";

const LINKEDIN_REDIRECT_URI =
  "https://lbmedia-office-v2.vercel.app/api/linkedin/callback";

type LinkedInTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

function redirectWithStateCleanup(
  request: NextRequest,
  path: string
) {
  const response =
    NextResponse.redirect(
      new URL(
        path,
        request.url
      )
    );

  response.cookies.set(
    "linkedin_oauth_state",
    "",
    {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    }
  );

  return response;
}

export async function GET(
  request: NextRequest
) {
  const clientId =
    process.env.LINKEDIN_CLIENT_ID;

  const clientSecret =
    process.env.LINKEDIN_CLIENT_SECRET;

  if (
    !clientId ||
    !clientSecret
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "La configuration LinkedIn est incomplète.",
      },
      {
        status: 500,
      }
    );
  }

  const searchParams =
    request.nextUrl.searchParams;

  const error =
    searchParams.get(
      "error"
    );

  if (error) {
    const errorDescription =
      searchParams.get(
        "error_description"
      );

    return redirectWithStateCleanup(
      request,
      `/?linkedin_error=${encodeURIComponent(
        errorDescription ||
          error
      )}`
    );
  }

  const code =
    searchParams.get(
      "code"
    );

  const returnedState =
    searchParams.get(
      "state"
    );

  const storedState =
    request.cookies.get(
      "linkedin_oauth_state"
    )?.value;

  if (
    !returnedState ||
    !storedState ||
    returnedState !==
      storedState
  ) {
    return redirectWithStateCleanup(
      request,
      "/?linkedin_error=invalid_state"
    );
  }

  if (!code) {
    return redirectWithStateCleanup(
      request,
      "/?linkedin_error=missing_code"
    );
  }

  try {
    const tokenResponse =
      await fetch(
        LINKEDIN_TOKEN_URL,
        {
          method:
            "POST",
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
          },
          body:
            new URLSearchParams({
              grant_type:
                "authorization_code",
              code,
              client_id:
                clientId,
              client_secret:
                clientSecret,
              redirect_uri:
                LINKEDIN_REDIRECT_URI,
            }),
          cache: "no-store",
        }
      );

    const tokenResult =
      await tokenResponse.json() as
        LinkedInTokenResponse;

    if (
      !tokenResponse.ok ||
      !tokenResult.access_token
    ) {
      throw new Error(
        tokenResult.error_description ??
          tokenResult.error ??
          "Impossible de récupérer le jeton LinkedIn."
      );
    }

    const expiresIn =
      Number(
        tokenResult.expires_in ??
          5184000
      );

    const expiresAt =
      new Date(
        Date.now() +
          expiresIn * 1000
      ).toISOString();

    const {
      data:
        existingConnection,
      error:
        existingError,
    } = await supabaseAdmin
      .from(
        "linkedin_connection"
      )
      .select(
        "id, refresh_token"
      )
      .limit(1)
      .maybeSingle();

    if (existingError) {
      throw new Error(
        `Impossible de vérifier la connexion LinkedIn : ${existingError.message}`
      );
    }

    const refreshToken =
      tokenResult.refresh_token ??
      existingConnection
        ?.refresh_token ??
      null;

    const connectionData = {
      access_token:
        tokenResult.access_token,
      refresh_token:
        refreshToken,
      expires_at:
        expiresAt,
      scope:
        tokenResult.scope ??
        null,
      token_type:
        tokenResult.token_type ??
        "Bearer",
      updated_at:
        new Date().toISOString(),
    };

    if (
      existingConnection
    ) {
      const {
        error:
          updateError,
      } = await supabaseAdmin
        .from(
          "linkedin_connection"
        )
        .update(
          connectionData
        )
        .eq(
          "id",
          existingConnection.id
        );

      if (
        updateError
      ) {
        throw new Error(
          `Impossible d’enregistrer la connexion LinkedIn : ${updateError.message}`
        );
      }
    } else {
      const {
        error:
          insertError,
      } = await supabaseAdmin
        .from(
          "linkedin_connection"
        )
        .insert({
          ...connectionData,
          organization_urn:
            null,
          organization_name:
            null,
        });

      if (
        insertError
      ) {
        throw new Error(
          `Impossible d’enregistrer la connexion LinkedIn : ${insertError.message}`
        );
      }
    }

    return redirectWithStateCleanup(
      request,
      "/?linkedin_connected=1"
    );
  } catch (
    callbackError
  ) {
    const message =
      callbackError instanceof Error
        ? callbackError.message
        : "Une erreur est survenue.";

    return redirectWithStateCleanup(
      request,
      `/?linkedin_error=${encodeURIComponent(
        message
      )}`
    );
  }
}
