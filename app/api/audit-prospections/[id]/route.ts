import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  deleteAuditProspection,
  updateAuditProspection,
} from "@/lib/audit-prospections";

export const dynamic =
  "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateBody = {
  recipientEmail?: unknown;
  subject?: unknown;
  emailContent?: unknown;
};

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } =
      await context.params;

    const body =
      (await request.json()) as UpdateBody;

    const recipientEmail =
      typeof body.recipientEmail ===
      "string"
        ? body.recipientEmail.trim()
        : "";

    const subject =
      typeof body.subject ===
      "string"
        ? body.subject.trim()
        : "";

    const emailContent =
      typeof body.emailContent ===
      "string"
        ? body.emailContent.trim()
        : "";

    if (!recipientEmail) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le destinataire est obligatoire.",
        },
        {
          status: 400,
        }
      );
    }

    if (!subject) {
      return NextResponse.json(
        {
          success: false,
          message:
            "L’objet du mail est obligatoire.",
        },
        {
          status: 400,
        }
      );
    }

    if (!emailContent) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le contenu du mail est obligatoire.",
        },
        {
          status: 400,
        }
      );
    }

    const prospection =
      await updateAuditProspection(
        id,
        {
          recipientEmail,
          subject,
          emailContent,
          status: "ready",
        }
      );

    return NextResponse.json({
      success: true,
      prospection,
    });
  } catch (error) {
    console.error(
      "Audit prospection update error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Impossible d’enregistrer la prospection.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } =
      await context.params;

    await deleteAuditProspection(
      id
    );

    return NextResponse.json({
      success: true,
      message:
        "Prospection supprimée.",
    });
  } catch (error) {
    console.error(
      "Audit prospection delete error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Impossible de supprimer la prospection.",
      },
      {
        status: 500,
      }
    );
  }
}