import { randomBytes } from "crypto";

import { NextResponse } from "next/server";

const LINKEDIN_AUTH_URL =
  "https://www.linkedin.com/oauth/v2/authorization";

const LINKEDIN_REDIRECT_URI =
  "https://lbmedia-office-v2.vercel.app/api/linkedin/callback";

const LINKEDIN_SCOPES = [
  "w_organization_social",
  "rw_organization_admin",
];

export async function GET() {
  const clientId =
    process.env.LINKEDIN_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      {
        success: false,
        message:
          "LINKEDIN_CLIENT_ID n'est pas configuré.",
      },
      {
        status: 500,
      }
    );
  }

  const state =
    randomBytes(32).toString("hex");

  const authorizationUrl =
    new URL(LINKEDIN_AUTH_URL);

  authorizationUrl.searchParams.set(
    "response_type",
    "code"
  );

  authorizationUrl.searchParams.set(
    "client_id",
    clientId
  );

  authorizationUrl.searchParams.set(
    "redirect_uri",
    LINKEDIN_REDIRECT_URI
  );

  authorizationUrl.searchParams.set(
    "state",
    state
  );

  authorizationUrl.searchParams.set(
    "scope",
    LINKEDIN_SCOPES.join(" ")
  );

  const response =
    NextResponse.redirect(
      authorizationUrl
    );

  response.cookies.set(
    "linkedin_oauth_state",
    state,
    {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60,
    }
  );

  return response;
}
