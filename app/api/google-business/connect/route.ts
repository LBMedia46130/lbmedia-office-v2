import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GOOGLE_AUTH_URL =
  "https://accounts.google.com/o/oauth2/v2/auth";

const GOOGLE_BUSINESS_SCOPE =
  "https://www.googleapis.com/auth/business.manage";

export async function GET() {
  const clientId =
    process.env.GOOGLE_BUSINESS_CLIENT_ID;

  const redirectUri =
    process.env.GOOGLE_BUSINESS_REDIRECT_URI;

  if (
    !clientId ||
    !redirectUri
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "La configuration Google Business Profile est incomplète.",
      },
      {
        status: 500,
      }
    );
  }

  const params =
    new URLSearchParams({
      client_id:
        clientId,

      redirect_uri:
        redirectUri,

      response_type:
        "code",

      scope:
        GOOGLE_BUSINESS_SCOPE,

      access_type:
        "offline",

      prompt:
        "consent",

      include_granted_scopes:
        "true",
    });

  return NextResponse.redirect(
    `${GOOGLE_AUTH_URL}?${params.toString()}`
  );
}
