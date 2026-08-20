import { NextResponse } from "next/server";

async function getZohoAccessToken() {
  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Configuration Zoho incomplète.");
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  const response = await fetch(
    "https://accounts.zoho.eu/oauth/v2/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    throw new Error(
      `Impossible d'obtenir un access token Zoho : ${JSON.stringify(data)}`
    );
  }

  return data.access_token as string;
}

export async function GET() {
  try {
    const accessToken = await getZohoAccessToken();

    const response = await fetch(
      "https://www.zohoapis.eu/books/v3/organizations",
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
        },
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok || data.code !== 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Impossible de récupérer les organisations Zoho Books.",
          details: data,
        },
        { status: 500 }
      );
    }

    const organizations = (data.organizations ?? []).map(
      (organization: {
        organization_id?: string;
        name?: string;
        currency_code?: string;
        country?: string;
        time_zone?: string;
      }) => ({
        organization_id: organization.organization_id ?? null,
        name: organization.name ?? null,
        currency_code: organization.currency_code ?? null,
        country: organization.country ?? null,
        time_zone: organization.time_zone ?? null,
      })
    );

    return NextResponse.json({
      success: true,
      organizations,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erreur Zoho Books inconnue.",
      },
      { status: 500 }
    );
  }
}