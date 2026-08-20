import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const accountsServer =
    searchParams.get("accounts-server") || "https://accounts.zoho.eu";

  if (error) {
    return NextResponse.json(
      {
        error: "Autorisation Zoho refusée ou interrompue.",
        details: error,
      },
      { status: 400 }
    );
  }

  if (!code) {
    return NextResponse.json(
      {
        error: "Code d'autorisation Zoho absent.",
      },
      { status: 400 }
    );
  }

  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  const redirectUri = process.env.ZOHO_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      {
        error: "Configuration Zoho incomplète.",
      },
      { status: 500 }
    );
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
  });

  const tokenResponse = await fetch(
    `${accountsServer}/oauth/v2/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      cache: "no-store",
    }
  );

  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok || tokenData.error) {
    return NextResponse.json(
      {
        error: "Impossible d'obtenir les jetons Zoho.",
        details: tokenData,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Connexion Zoho Books autorisée avec succès.",
    api_domain: tokenData.api_domain ?? null,
    expires_in: tokenData.expires_in ?? null,
  });
}