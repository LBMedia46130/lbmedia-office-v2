import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const GOOGLE_TOKEN_URL =
  "https://oauth2.googleapis.com/token";

const GOOGLE_CALENDAR_EVENTS_URL =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";

type GoogleCalendarConnection = {
  id: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
};

async function refreshAccessToken(
  connection: GoogleCalendarConnection
) {
  const clientId =
    process.env.GOOGLE_CALENDAR_CLIENT_ID;

  const clientSecret =
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET;

  if (
    !clientId ||
    !clientSecret ||
    !connection.refresh_token
  ) {
    throw new Error(
      "Impossible de renouveler la connexion Google Calendar."
    );
  }

  const response = await fetch(
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
        refresh_token:
          connection.refresh_token,
        grant_type: "refresh_token",
      }),
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
        "Impossible de renouveler l’accès à Google Calendar."
    );
  }

  const expiresIn =
    Number(
      result.expires_in ?? 3600
    );

  const expiresAt =
    new Date(
      Date.now() +
        expiresIn * 1000
    ).toISOString();

  const { error } =
    await supabaseAdmin
      .from(
        "google_calendar_connection"
      )
      .update({
        access_token:
          result.access_token,
        expires_at: expiresAt,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", connection.id);

  if (error) {
    throw new Error(
      `Impossible de mettre à jour la connexion Google Calendar : ${error.message}`
    );
  }

  return result.access_token as string;
}

async function getAccessToken(
  connection: GoogleCalendarConnection
) {
  if (
    connection.access_token &&
    connection.expires_at
  ) {
    const expiresAt =
      new Date(
        connection.expires_at
      ).getTime();

    const safetyMargin =
      60 * 1000;

    if (
      Date.now() <
      expiresAt - safetyMargin
    ) {
      return connection.access_token;
    }
  }

  return refreshAccessToken(
    connection
  );
}

export async function GET() {
  try {
    const {
      data: connection,
      error: connectionError,
    } = await supabaseAdmin
      .from(
        "google_calendar_connection"
      )
      .select(
        "id, access_token, refresh_token, expires_at"
      )
      .limit(1)
      .maybeSingle();

    if (connectionError) {
      throw new Error(
        `Impossible de charger la connexion Google Calendar : ${connectionError.message}`
      );
    }

    if (!connection) {
      return NextResponse.json(
        {
          success: true,
          connected: false,
          events: [],
        }
      );
    }

    const accessToken =
      await getAccessToken(
        connection
      );

    const now =
      new Date();

    const future =
      new Date();

    future.setDate(
      future.getDate() + 60
    );

    const params =
      new URLSearchParams({
        timeMin: now.toISOString(),
        timeMax:
          future.toISOString(),
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "100",
      });

    const response =
      await fetch(
        `${GOOGLE_CALENDAR_EVENTS_URL}?${params.toString()}`,
        {
          headers: {
            Authorization:
              `Bearer ${accessToken}`,
          },
          cache: "no-store",
        }
      );

    const result =
      await response.json();

    if (!response.ok) {
      throw new Error(
        result.error?.message ??
          "Impossible de récupérer les événements Google Calendar."
      );
    }

    return NextResponse.json({
      success: true,
      connected: true,
      events:
        result.items ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        connected: false,
        events: [],
        message:
          error instanceof Error
            ? error.message
            : "Une erreur est survenue.",
      },
      {
        status: 500,
      }
    );
  }
}