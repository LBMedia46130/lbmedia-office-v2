import { NextResponse } from "next/server";

export async function GET() {
  const apiKey =
    process.env.BREVO_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        message:
          "La clé API Brevo n'est pas configurée.",
      },
      {
        status: 500,
      }
    );
  }

  try {
    const response = await fetch(
      "https://api.brevo.com/v3/account",
      {
        method: "GET",
        headers: {
          accept:
            "application/json",
          "api-key":
            apiKey,
        },
        cache:
          "no-store",
      }
    );

    const rawResponse =
      await response.text();

    let data: unknown = null;

    try {
      data = rawResponse
        ? JSON.parse(rawResponse)
        : null;
    } catch {
      data = rawResponse;
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          status:
            response.status,
          details:
            data,
        },
        {
          status:
            response.status,
        }
      );
    }

    const account =
      data as {
        organization_id?: string;
        user_id?: number;
        companyName?: string;
        email?: string;
        firstName?: string;
        lastName?: string;
      };

    return NextResponse.json({
      success: true,
      account: {
        organization_id:
          account.organization_id ??
          null,
        user_id:
          account.user_id ??
          null,
        companyName:
          account.companyName ??
          null,
        email:
          account.email ??
          null,
        firstName:
          account.firstName ??
          null,
        lastName:
          account.lastName ??
          null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Impossible de lire le compte Brevo.",
        error:
          error instanceof Error
            ? error.message
            : "Erreur inconnue",
      },
      {
        status: 500,
      }
    );
  }
}