import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.ZOHO_CLIENT_ID;
  const redirectUri = process.env.ZOHO_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      {
        error:
          "Configuration Zoho incomplète : ZOHO_CLIENT_ID ou ZOHO_REDIRECT_URI manquant.",
      },
      { status: 500 }
    );
  }

  const scopes = [
    "ZohoBooks.contacts.ALL",
    "ZohoBooks.estimates.ALL",
    "ZohoBooks.invoices.ALL",
    "ZohoBooks.creditnotes.ALL",
    "ZohoBooks.customerpayments.ALL",
    "ZohoBooks.settings.READ",
  ].join(",");

  const params = new URLSearchParams({
    scope: scopes,
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    access_type: "offline",
    prompt: "consent",
  });

  const authorizationUrl =
    `https://accounts.zoho.eu/oauth/v2/auth?${params.toString()}`;

  return NextResponse.redirect(authorizationUrl);
}