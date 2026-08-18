import {
  readFile,
} from "node:fs/promises";

import {
  join,
} from "node:path";

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

type SendRequestBody = {
  confirmedRecipientEmail?: unknown;
};

const SIGNATURE_LOGO_CID =
  "lbmedia-signature-logo";

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

function normalizeEmail(
  value:
    | string
    | null
    | undefined
) {
  return (
    value
      ?.trim()
      .toLowerCase() ??
    ""
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

function getSignatureHtml() {
  return `
<table
  role="presentation"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="
    margin-top:26px;
    border-collapse:collapse;
    font-family:
      Arial,
      Helvetica,
      sans-serif;
  "
>
  <tbody>
    <tr>
      <td
        valign="middle"
        style="
          padding:4px 24px 4px 0;
        "
      >
        <img
          src="cid:${SIGNATURE_LOGO_CID}"
          alt="LBMedia"
          width="155"
          style="
            display:block;
            width:155px;
            max-width:155px;
            height:auto;
            border:0;
            outline:none;
            text-decoration:none;
          "
        />
      </td>

      <td
        valign="middle"
        style="
          border-left:2px solid #1683c5;
          padding:4px 0 4px 22px;
        "
      >
        <div
          style="
            margin:0;
            font-size:17px;
            line-height:22px;
            font-weight:700;
            color:#293b50;
          "
        >
          Laurent BARRES
        </div>

        <div
          style="
            margin:2px 0 9px 0;
            font-size:10px;
            line-height:15px;
            font-weight:700;
            letter-spacing:1px;
            color:#1683c5;
          "
        >
          DIRECTEUR
        </div>

        <div
          style="
            margin:0;
            font-size:12px;
            line-height:19px;
            color:#4b5d70;
          "
        >
          <a
            href="tel:+33680061019"
            style="
              color:#4b5d70;
              text-decoration:none;
            "
          >
            06.80.06.10.19
          </a>
        </div>

        <div
          style="
            margin:0;
            font-size:12px;
            line-height:19px;
          "
        >
          <a
            href="mailto:laurent@lbmedia.fr"
            style="
              color:#1683c5;
              text-decoration:none;
            "
          >
            laurent@lbmedia.fr
          </a>
        </div>

        <div
          style="
            margin:0;
            font-size:12px;
            line-height:19px;
          "
        >
          <a
            href="https://www.lbmedia.fr"
            style="
              color:#1683c5;
              text-decoration:none;
            "
          >
            www.lbmedia.fr
          </a>
        </div>
      </td>
    </tr>
  </tbody>
</table>
`.trim();
}

function getTextSignature() {
  return [
    "Laurent BARRES",
    "DIRECTEUR",
    "06.80.06.10.19",
    "laurent@lbmedia.fr",
    "www.lbmedia.fr",
  ].join("\n");
}

function buildHtmlContent(
  emailContent: string
) {
  return `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1"
    />
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
        margin:0;
        padding:24px;
        font-size:15px;
        line-height:1.65;
      "
    >
      ${textToHtml(
        emailContent
      )}

      ${getSignatureHtml()}
    </div>
  </body>
</html>
`.trim();
}

export async function POST(
  request: Request,
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

    let body:
      | SendRequestBody
      | null = null;

    try {
      body =
        (await request.json()) as SendRequestBody;
    } catch {
      body =
        null;
    }

    const confirmedRecipientEmail =
      typeof body
        ?.confirmedRecipientEmail ===
      "string"
        ? normalizeEmail(
            body.confirmedRecipientEmail
          )
        : "";

    if (
      !confirmedRecipientEmail
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Confirmation du destinataire manquante. Envoi annulé.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      id,
    } = await context.params;

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

    if (
      prospection.status !==
      "ready"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "La prospection n’est pas au statut Prête. Envoi annulé.",
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

    const normalizedStoredRecipient =
      normalizeEmail(
        recipientEmail
      );

    if (
      !recipientEmail
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Aucune adresse e-mail destinataire n'est enregistrée.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      normalizedStoredRecipient !==
      confirmedRecipientEmail
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Sécurité : le destinataire confirmé ne correspond pas au destinataire actuellement enregistré. Aucun email n’a été envoyé.",

          storedRecipientEmail:
            recipientEmail,
        },
        {
          status: 409,
        }
      );
    }

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

    if (
      !subject
    ) {
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

    if (
      !emailContent
    ) {
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

    if (
      !attachmentUrl
    ) {
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

    /*
     * Nouvelle lecture de sécurité juste avant l'envoi.
     *
     * Si une modification concurrente a changé le destinataire
     * ou le contenu entre le chargement initial et l'envoi SMTP,
     * l'envoi est interrompu.
     */
    const {
      data:
        securityCheck,
      error:
        securityCheckError,
    } = await supabaseAdmin
      .from(
        "audit_prospections"
      )
      .select(
        `
          id,
          status,
          recipient_email,
          subject,
          email_content,
          attachment_url,
          sent_at
        `
      )
      .eq(
        "id",
        prospection.id
      )
      .maybeSingle();

    if (
      securityCheckError ||
      !securityCheck
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Impossible de vérifier les informations avant l’envoi. Aucun email n’a été envoyé.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      securityCheck.status ===
        "sent" ||
      securityCheck.sent_at
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Cette prospection est déjà enregistrée comme envoyée.",
        },
        {
          status: 409,
        }
      );
    }

    if (
      securityCheck.status !==
      "ready"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le statut de la prospection a changé. Aucun email n’a été envoyé.",
        },
        {
          status: 409,
        }
      );
    }

    if (
      normalizeEmail(
        securityCheck.recipient_email
      ) !==
      confirmedRecipientEmail
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Sécurité : le destinataire enregistré a changé depuis la confirmation. Aucun email n’a été envoyé.",
        },
        {
          status: 409,
        }
      );
    }

    if (
      securityCheck.subject
        ?.trim() !==
        subject ||
      securityCheck.email_content
        ?.trim() !==
        emailContent ||
      securityCheck.attachment_url
        ?.trim() !==
        attachmentUrl
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Sécurité : le contenu de la prospection a changé avant l’envoi. Rechargez la fiche et vérifiez le message.",
        },
        {
          status: 409,
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

    const signatureLogoPath =
      join(
        process.cwd(),
        "public",
        "brand",
        "lbmedia-logo.png"
      );

    let signatureLogoBuffer:
      | Buffer
      | null = null;

    try {
      signatureLogoBuffer =
        await readFile(
          signatureLogoPath
        );
    } catch (logoError) {
      console.error(
        "Impossible de charger le logo de signature LBMedia",
        logoError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Impossible de charger le logo de la signature LBMedia. Aucun email n’a été envoyé.",
        },
        {
          status: 500,
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

    /*
     * Vérification de la connexion SMTP AVANT l'envoi.
     */
    await transporter.verify();

    const htmlContent =
      buildHtmlContent(
        emailContent
      );

    const textContent =
      `${emailContent}\n\n${getTextSignature()}`;

    const sendResult =
      await transporter.sendMail({
        from: {
          name:
            smtpFromName,

          address:
            smtpUser,
        },

        to:
          recipientName
            ? {
                name:
                  recipientName,

                address:
                  recipientEmail,
              }
            : recipientEmail,

        replyTo:
          smtpUser,

        subject,

        text:
          textContent,

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

          {
            filename:
              "lbmedia-logo.png",

            content:
              signatureLogoBuffer,

            contentType:
              "image/png",

            cid:
              SIGNATURE_LOGO_CID,

            contentDisposition:
              "inline",
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

    const accepted =
      sendResult.accepted.map(
        String
      );

    const wasAccepted =
      accepted.some(
        (acceptedAddress) =>
          normalizeEmail(
            acceptedAddress
          ) ===
          normalizedStoredRecipient
      );

    if (
      !wasAccepted
    ) {
      console.error(
        "SMTP n'a pas accepté le destinataire",
        {
          prospectionId:
            prospection.id,

          recipientEmail,

          accepted:
            sendResult.accepted,

          rejected:
            sendResult.rejected,

          response:
            sendResult.response,
        }
      );

      return NextResponse.json(
        {
          success: false,

          message:
            "Le serveur SMTP n’a pas confirmé l’acceptation du destinataire. Le statut n’a pas été modifié.",

          messageId:
            sendResult.messageId,
        },
        {
          status: 502,
        }
      );
    }

    const sentAt =
      new Date()
        .toISOString();

    /*
     * Archivage de la version EXACTEMENT envoyée.
     *
     * email_content reste le brouillon de travail.
     * Les champs sent_* constituent la photographie figée
     * du message accepté par le serveur SMTP.
     */
    const {
      data:
        updated,
      error:
        updateError,
    } = await supabaseAdmin
      .from(
        "audit_prospections"
      )
      .update({
        status:
          "sent",

        sent_at:
          sentAt,

        sent_subject:
          subject,

        sent_email_content:
          emailContent,

        sent_html_content:
          htmlContent,

        sent_attachment_url:
          attachmentUrl,

        smtp_message_id:
          sendResult.messageId ??
          null,

        updated_at:
          sentAt,
      })
      .eq(
        "id",
        prospection.id
      )
      .eq(
        "status",
        "ready"
      )
      .eq(
        "recipient_email",
        recipientEmail
      )
      .select("*")
      .maybeSingle();

    if (
      updateError ||
      !updated
    ) {
      console.error(
        "E-mail envoyé mais statut non enregistré",
        {
          prospectionId:
            prospection.id,

          messageId:
            sendResult.messageId,

          recipient:
            recipientEmail,

          accepted:
            sendResult.accepted,

          rejected:
            sendResult.rejected,

          response:
            sendResult.response,

          error:
            updateError
              ?.message ??
            "Mise à jour refusée par la vérification de sécurité.",
        }
      );

      return NextResponse.json(
        {
          success: false,

          sent: true,

          message:
            "L'e-mail a été accepté par le serveur SMTP, mais LBMedia Office n'a pas réussi à enregistrer le statut Envoyée. Ne renvoyez pas l'e-mail.",

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

      recipientEmail,

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