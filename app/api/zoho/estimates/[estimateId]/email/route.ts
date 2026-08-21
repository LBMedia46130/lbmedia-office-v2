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

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { estimateId } =
      await context.params;

    const email =
      await getZohoEstimateEmailContent(
        estimateId
      );

    return NextResponse.json({
      ok: true,
      email,
    });
  } catch (error) {
    console.error(
      "Erreur récupération email devis Zoho:",
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
          body.to_mail_ids ?? [],
        cc_mail_ids:
          body.cc_mail_ids ?? [],
        bcc_mail_ids:
          body.bcc_mail_ids ?? [],
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