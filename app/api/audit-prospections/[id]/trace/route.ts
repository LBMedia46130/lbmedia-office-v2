import {
  NextResponse,
} from "next/server";

import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

export const dynamic =
  "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const {
      id,
    } = await context.params;

    const {
      data,
      error,
    } = await supabaseAdmin
      .from(
        "audit_prospections"
      )
      .select(
        `
          id,
          status,
          recipient_email,
          sent_at,
          sent_subject,
          sent_email_content,
          sent_html_content,
          sent_attachment_url,
          smtp_message_id
        `
      )
      .eq(
        "id",
        id
      )
      .maybeSingle();

    if (error) {
      throw new Error(
        `Impossible de charger la trace d’envoi : ${error.message}`
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Prospection introuvable.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      data.status !==
      "sent"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Cette prospection n’a pas encore été envoyée.",
        },
        {
          status: 409,
        }
      );
    }

    return NextResponse.json({
      success: true,
      trace: data,
    });
  } catch (error) {
    console.error(
      "Erreur lecture trace prospection",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Impossible de charger la trace d’envoi.",
      },
      {
        status: 500,
      }
    );
  }
}