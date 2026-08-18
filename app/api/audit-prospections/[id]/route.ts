import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  deleteAuditProspection,
  updateAuditProspection,
  type AuditProspectionStatus,
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

  status?: unknown;
  followUpAt?: unknown;
  repliedAt?: unknown;
};

const allowedStatuses: AuditProspectionStatus[] =
  [
    "draft",
    "ready",
    "sent",
    "follow_up",
    "replied",
  ];

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const {
      id,
    } =
      await context.params;

    const body =
      (await request.json()) as UpdateBody;

    const isEmailUpdate =
      body.recipientEmail !==
        undefined ||
      body.subject !==
        undefined ||
      body.emailContent !==
        undefined;

    const isFollowUpUpdate =
      body.status !==
        undefined ||
      body.followUpAt !==
        undefined ||
      body.repliedAt !==
        undefined;

    if (
      !isEmailUpdate &&
      !isFollowUpUpdate
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Aucune modification à enregistrer.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ÉDITION DU MAIL
     *
     * Lorsqu'on modifie le
     * destinataire, l'objet ou le
     * contenu, les trois champs
     * doivent être présents et
     * valides.
     */
    if (isEmailUpdate) {
      const recipientEmail =
        typeof body
          .recipientEmail ===
        "string"
          ? body
              .recipientEmail
              .trim()
          : "";

      const subject =
        typeof body.subject ===
        "string"
          ? body.subject.trim()
          : "";

      const emailContent =
        typeof body
          .emailContent ===
        "string"
          ? body
              .emailContent
              .trim()
          : "";

      if (
        !recipientEmail
      ) {
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

      if (
        !emailContent
      ) {
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
            status:
              "ready",
          }
        );

      return NextResponse.json({
        success: true,
        prospection,
      });
    }

    /*
     * SUIVI COMMERCIAL
     *
     * Ici, on ne touche pas au
     * contenu du mail déjà envoyé.
     */
    const updateInput: {
      status?: AuditProspectionStatus;
      followUpAt?:
        | string
        | null;
      repliedAt?:
        | string
        | null;
    } = {};

    if (
      body.status !==
      undefined
    ) {
      if (
        typeof body.status !==
          "string" ||
        !allowedStatuses.includes(
          body.status as AuditProspectionStatus
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Le statut de prospection est invalide.",
          },
          {
            status: 400,
          }
        );
      }

      updateInput.status =
        body.status as AuditProspectionStatus;
    }

    if (
      body.followUpAt !==
      undefined
    ) {
      if (
        body.followUpAt !==
          null &&
        typeof body
          .followUpAt !==
          "string"
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "La date de relance est invalide.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        typeof body
          .followUpAt ===
        "string"
      ) {
        const date =
          new Date(
            body.followUpAt
          );

        if (
          Number.isNaN(
            date.getTime()
          )
        ) {
          return NextResponse.json(
            {
              success: false,
              message:
                "La date de relance est invalide.",
            },
            {
              status: 400,
            }
          );
        }

        updateInput.followUpAt =
          date.toISOString();
      } else {
        updateInput.followUpAt =
          null;
      }
    }

    if (
      body.repliedAt !==
      undefined
    ) {
      if (
        body.repliedAt !==
          null &&
        typeof body
          .repliedAt !==
          "string"
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "La date de réponse est invalide.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        typeof body
          .repliedAt ===
        "string"
      ) {
        const date =
          new Date(
            body.repliedAt
          );

        if (
          Number.isNaN(
            date.getTime()
          )
        ) {
          return NextResponse.json(
            {
              success: false,
              message:
                "La date de réponse est invalide.",
            },
            {
              status: 400,
            }
          );
        }

        updateInput.repliedAt =
          date.toISOString();
      } else {
        updateInput.repliedAt =
          null;
      }
    }

    const prospection =
      await updateAuditProspection(
        id,
        updateInput
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
    const {
      id,
    } =
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