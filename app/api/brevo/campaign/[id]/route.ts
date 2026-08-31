import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext
) {
  const { id } = await context.params;

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
      `https://api.brevo.com/v3/emailCampaigns/${id}`,
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

    const campaign =
      data as Record<
        string,
        unknown
      >;

    return NextResponse.json({
      success: true,
      campaign: {
        id:
          campaign.id ?? null,
        name:
          campaign.name ?? null,
        status:
          campaign.status ?? null,
        type:
          campaign.type ?? null,
        createdAt:
          campaign.createdAt ?? null,
        modifiedAt:
          campaign.modifiedAt ?? null,
        subject:
          campaign.subject ?? null,
        templateId:
          campaign.templateId ?? null,
        htmlContent:
          campaign.htmlContent ?? null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Impossible de lire la campagne Brevo.",
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