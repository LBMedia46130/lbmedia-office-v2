import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getZohoEstimateEmailContent,
  sendZohoEstimateEmail,
} from "@/lib/zoho-books";

type RouteContext = {
  params: Promise<{
    estimateId: string;
  }>;
};

type ZohoTokenResponse = {
  access_token?: string;
  error?: string;
};

async function getRawZohoEstimateEmail(
  estimateId: string
) {
  const clientId =
    process.env.ZOHO_CLIENT_ID;

  const clientSecret =
    process.env.ZOHO_CLIENT_SECRET;

  const refreshToken =
    process.env.ZOHO_REFRESH_TOKEN;

  const organizationId =
    process.env.ZOHO_ORGANIZATION_ID;

  if (
    !clientId ||
    !clientSecret ||
    !refreshToken ||
    !organizationId
  ) {
    throw new Error(
      "Configuration Zoho Books incomplète."
    );
  }

  const tokenBody =
    new URLSearchParams({
      grant_type:
        "refresh_token",
      client_id:
        clientId,
      client_secret:
        clientSecret,
      refresh_token:
        refreshToken,
    });

  const tokenResponse =
    await fetch(
      "https://accounts.zoho.eu/oauth/v2/token",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body: tokenBody,
        cache: "no-store",
      }
    );

  const tokenData =
    (await tokenResponse.json()) as ZohoTokenResponse;

  if (
    !tokenResponse.ok ||
    !tokenData.access_token
  ) {
    throw new Error(
      `Impossible d'obtenir le token Zoho : ${
        tokenData.error ||
        tokenResponse.statusText
      }`
    );
  }

  const url =
    new URL(
      `https://www.zohoapis.eu/books/v3/estimates/${encodeURIComponent(
        estimateId
      )}/email`
    );

  url.searchParams.set(
    "organization_id",
    organizationId
  );

  const response =
    await fetch(
      url,
      {
        method: "GET",
        headers: {
          Authorization:
            `Zoho-oauthtoken ${tokenData.access_token}`,
        },
        cache: "no-store",
      }
    );

  const raw =
    await response.json();

  return {
    http_status:
      response.status,
    http_ok:
      response.ok,
    data:
      raw,
  };
}

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { estimateId } =
      await context.params;

    const [raw, email] =
      await Promise.all([
        getRawZohoEstimateEmail(
          estimateId
        ),
        getZohoEstimateEmailContent(
          estimateId
        ),
      ]);

    return NextResponse.json({
      ok: true,
      estimateId,
      raw,
      email,
    });
  } catch (error) {
    console.error(
      "Erreur diagnostic email devis Zoho:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Impossible de récupérer l'email du devis.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { estimateId } =
      await context.params;

    const body =
      (await request.json()) as {
        to_mail_ids?: string[];
        cc_mail_ids?: string[];
        bcc_mail_ids?: string[];
        subject?: string;
        body?: string;
      };

    await sendZohoEstimateEmail(
      estimateId,
      {
        to_mail_ids:
          body.to_mail_ids ??
          [],
        cc_mail_ids:
          body.cc_mail_ids ??
          [],
        bcc_mail_ids:
          body.bcc_mail_ids ??
          [],
        subject:
          body.subject ?? "",
        body:
          body.body ?? "",
      }
    );

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error(
      "Erreur envoi email devis Zoho:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Impossible d'envoyer l'email du devis.",
      },
      {
        status: 500,
      }
    );
  }
}