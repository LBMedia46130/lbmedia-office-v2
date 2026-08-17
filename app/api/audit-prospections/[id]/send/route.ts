import {
  NextResponse,
} from "next/server";

import nodemailer from "nodemailer";

import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

export const maxDuration = 60;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getBooleanEnv(
  value:
    | string
    | undefined
) {
  return (
    value
      ?.trim()
      .toLowerCase() ===
    "true"
  );
}

function escapeHtml(
  value: string
) {
  return value
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}

function textToHtml(
  value: string
) {
  return value
    .split(/\r?\n/)
    .map((line) => {
      const trimmed =
        line.trim();

      if (!trimmed) {
        return `<div style="height:12px;"></div>`;
      }

      return `
        <div
          style="
            margin:0 0 10px 0;
          "
        >
          ${escapeHtml(
            line
          )}
        </div>
      `;
    })
    .join("");
}

function getPdfFilename(
  attachmentUrl: string
) {
  try {
    const url =
      new URL(
        attachmentUrl
      );

    const filename =
      url.pathname
        .split("/")
        .filter(Boolean)
        .pop();

    if (
      filename &&
      filename
        .toLowerCase()
        .endsWith(".pdf")
    ) {
      return decodeURIComponent(
        filename
      );
    }
  } catch {
    // Nom de secours ci-dessous.
  }

  return "proposition-lbmedia.pdf";
}

export async function POST(
  _request: Request,
  context: RouteContext
) {
  try {
    const smtpHost =
      process.env
        .OVH_SMTP_HOST
        ?.trim();

    const smtpPort =
      Number(
        process.env
          .OVH_SMTP_PORT ??
          "587"
      );

    const smtpSecure =
      getBooleanEnv(
        process.env
          .OVH_SMTP_SECURE
      );

    const smtpUser =
      process.env
        .OVH_SMTP_USER
        ?.trim();

    const smtpPassword =
      process.env
        .OVH_SMTP_PASSWORD;

    const smtpFromName =
      process.env
        .OVH_SMTP_FROM_NAME
        ?.trim() ||
      "Laurent Barrès - LBMedia";

    if (
      !smtpHost ||
      !smtpUser ||
      !smtpPassword
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "La configuration SMTP OVH est incomplète.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      !Number.isFinite(
        smtpPort
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le port SMTP OVH est invalide.",
        },
        {
          status: 500,
        }
      );
    }

    const { id } =
      await context.params;

    const {
      data:
        prospection,
      error:
        prospectionError,
    } = await supabaseAdmin
      .from(
        "audit_prospections"
      )
      .select(
        `
          id,
          company_id,
          website_audit_id,
          status,
          recipient_email,
          recipient_name,
          subject,
          email_content,
          attachment_url,
          sent_at
        `
      )
      .eq(
        "id",
        id
      )
      .maybeSingle();

    if (
      prospectionError
    ) {
      throw new Error(
        `Impossible de charger la prospection : ${prospectionError.message}`
      );
    }

    if (!prospection) {
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
      prospection.status ===
      "sent"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Cette prospection a déjà été envoyée.",
        },
        {
          status: 409,
        }
      );
    }

    const recipientEmail =
      prospection
        .recipient_email
        ?.trim();

    const recipientName =
      prospection
        .recipient_name
        ?.trim();

    const subject =
      prospection
        .subject
        ?.trim();

    const emailContent =
      prospection
        .email_content
        ?.trim();

    const attachmentUrl =
      prospection
        .attachment_url
        ?.trim();

    if (!recipientEmail) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Aucune adresse e-mail destinataire n'est renseignée.",
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
            "L'objet de l'e-mail est vide.",
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
            "Le contenu de l'e-mail est vide.",
        },
        {
          status: 400,
        }
      );
    }

    if (!attachmentUrl) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Aucun PDF n'est associé à cette prospection.",
        },
        {
          status: 400,
        }
      );
    }

    const attachmentResponse =
      await fetch(
        attachmentUrl,
        {
          cache:
            "no-store",
        }
      );

    if (
      !attachmentResponse.ok
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Impossible de récupérer le PDF à joindre.",
        },
        {
          status: 502,
        }
      );
    }

    const attachmentBuffer =
      Buffer.from(
        await attachmentResponse.arrayBuffer()
      );

    if (
      attachmentBuffer.length ===
      0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le PDF à joindre est vide.",
        },
        {
          status: 400,
        }
      );
    }

    const transporter =
      nodemailer.createTransport({
        host:
          smtpHost,

        port:
          smtpPort,

        secure:
          smtpSecure,

        auth: {
          user:
            smtpUser,

          pass:
            smtpPassword,
        },

        tls: {
          minVersion:
            "TLSv1.2",
        },
      });

    const recipient =
      recipientName
        ? `"${recipientName.replaceAll(
            '"',
            '\\"'
          )}" <${recipientEmail}>`
        : recipientEmail;

    const htmlContent = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
  </head>

  <body
    style="
      margin:0;
      padding:0;
      background:#ffffff;
      font-family:
        Arial,
        Helvetica,
        sans-serif;
      color:#1e293b;
    "
  >
    <div
      style="
        max-width:640px;
        margin:0 auto;
        padding:24px;
        font-size:15px;
        line-height:1.65;
      "
    >
      ${textToHtml(
        emailContent
      )}
    </div>
  </body>
</html>
`.trim();

    const sendResult =
      await transporter.sendMail({
        from: {
          name:
            smtpFromName,

          address:
            smtpUser,
        },

        to:
          recipient,

        replyTo:
          smtpUser,

        subject,

        text:
          emailContent,

        html:
          htmlContent,

        attachments: [
          {
            filename:
              getPdfFilename(
                attachmentUrl
              ),

            content:
              attachmentBuffer,

            contentType:
              "application/pdf",
          },
        ],

        headers: {
          "X-LBMedia-Office":
            "audit-prospection",

          "X-LBMedia-Prospection-ID":
            prospection.id,

          "X-LBMedia-Company-ID":
            prospection.company_id,

          "X-LBMedia-Audit-ID":
            prospection.website_audit_id,
        },
      });

    const sentAt =
      new Date()
        .toISOString();

    const {
      data: updated,
      error: updateError,
    } = await supabaseAdmin
      .from(
        "audit_prospections"
      )
      .update({
        status:
          "sent",

        sent_at:
          sentAt,

        updated_at:
          sentAt,
      })
      .eq(
        "id",
        prospection.id
      )
      .select("*")
      .single();

    if (
      updateError
    ) {
      console.error(
        "E-mail envoyé mais statut non enregistré",
        {
          prospectionId:
            prospection.id,

          messageId:
            sendResult.messageId,

          accepted:
            sendResult.accepted,

          rejected:
            sendResult.rejected,

          response:
            sendResult.response,

          error:
            updateError.message,
        }
      );

      return NextResponse.json(
        {
          success: false,
          sent: true,

          message:
            "L'e-mail a été envoyé, mais LBMedia Office n'a pas réussi à enregistrer le statut Envoyée. Ne renvoyez pas l'e-mail.",

          messageId:
            sendResult.messageId,
        },
        {
          status: 500,
        }
      );
    }

    console.info(
      "Prospection audit envoyée",
      {
        prospectionId:
          prospection.id,

        companyId:
          prospection.company_id,

        auditId:
          prospection.website_audit_id,

        recipient:
          recipientEmail,

        sentAt,

        messageId:
          sendResult.messageId,

        accepted:
          sendResult.accepted,

        rejected:
          sendResult.rejected,

        response:
          sendResult.response,
      }
    );

    return NextResponse.json({
      success: true,

      message:
        "E-mail envoyé avec succès.",

      messageId:
        sendResult.messageId,

      sentAt,

      prospection:
        updated,
    });
  } catch (error) {
    console.error(
      "Erreur envoi prospection audit",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Une erreur est survenue pendant l'envoi de l'e-mail.",
      },
      {
        status: 500,
      }
    );
  }
}