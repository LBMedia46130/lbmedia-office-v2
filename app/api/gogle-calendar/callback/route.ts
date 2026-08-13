import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const GOOGLE_TOKEN_URL =
  "https://oauth2.googleapis.com/token";

export async function GET(
  request: NextRequest
) {
  const clientId =
    process.env.GOOGLE_CALENDAR_CLIENT_ID;

  const clientSecret =
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET;

  const redirectUri =
    process.env.GOOGLE_CALENDAR_REDIRECT_URI;

  if (
    !clientId ||
    !clientSecret ||
    !redirectUri
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "La configuration Google Calendar est incomplète.",
      },
      {
        status: 500,
      }
    );
  }

  const searchParams =
    request.nextUrl.searchParams;

  const error =
    searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/calendar?google_error=${encodeURIComponent(
          error
        )}`,
        request.url
      )
    );
  }

  const code =
    searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL(
        "/calendar?google_error=missing_code",
        request.url
      )
    );
  }

  try {
    const tokenResponse =
      await fetch(
        GOOGLE_TOKEN_URL,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            grant_type:
              "authorization_code",
            redirect_uri:
              redirectUri,
          }),
        }
      );

    const tokenResult =
      await tokenResponse.json();

    if (
      !tokenResponse.ok ||
      !tokenResult.access_token
    ) {
      throw new Error(
        tokenResult.error_description ??
          tokenResult.error ??
          "Impossible de récupérer les jetons Google."
      );
    }

    const expiresIn =
      Number(
        tokenResult.expires_in ?? 3600
      );

    const expiresAt =
      new Date(
        Date.now() +
          expiresIn * 1000
      ).toISOString();

    const {
      data: existingConnection,
      error: existingError,
    } = await supabaseAdmin
      .from(
        "google_calendar_connection"
      )
      .select("id, refresh_token")
      .limit(1)
      .maybeSingle();

    if (existingError) {
      throw new Error(
        `Impossible de vérifier la connexion Google Calendar : ${existingError.message}`
      );
    }

    const refreshToken =
      tokenResult.refresh_token ??
      existingConnection?.refresh_token ??
      null;

    if (existingConnection) {
      const { error: updateError } =
        await supabaseAdmin
          .from(
            "google_calendar_connection"
          )
          .update({
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
              null,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            existingConnection.id
          );

      if (updateError) {
        throw new Error(
          `Impossible d’enregistrer la connexion Google Calendar : ${updateError.message}`
        );
      }
    } else {
      const { error: insertError } =
        await supabaseAdmin
          .from(
            "google_calendar_connection"
          )
          .insert({
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
              null,
          });

      if (insertError) {
        throw new Error(
          `Impossible d’enregistrer la connexion Google Calendar : ${insertError.message}`
        );
      }
    }

    return NextResponse.redirect(
      new URL(
        "/calendar?google_connected=1",
        request.url
      )
    );
  } catch (callbackError) {
    const message =
      callbackError instanceof Error
        ? callbackError.message
        : "Une erreur est survenue.";

    return NextResponse.redirect(
      new URL(
        `/calendar?google_error=${encodeURIComponent(
          message
        )}`,
        request.url
      )
    );
  }
}