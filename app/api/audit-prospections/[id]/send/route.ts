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
  createInitialAuditProspectionMessage,
} from "@/lib/audit-prospection-messages";

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

type ProposalType =
  | "optimization"
  | "optimization_redesign"
  | "redesign"
  | "new_website";

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


function splitRecipientEmails(
  value:
    | string
    | null
    | undefined
) {
  return (
    value ?? ""
  )
    .split(/[,\n;]+/)
    .map((email) =>
      normalizeEmail(
        email
      )
    )
    .filter(Boolean);
}

function normalizeRecipientEmails(
  value:
    | string
    | null
    | undefined
) {
  return Array.from(
    new Set(
      splitRecipientEmails(
        value
      )
    )
  );
}

function canonicalRecipientEmails(
  value:
    | string
    | null
    | undefined
) {
  return normalizeRecipientEmails(
    value
  )
    .slice()
    .sort()
    .join(",");
}

function isValidEmail(
  value: string
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value
  );
}

function normalizeProposalType(
  value: unknown
): ProposalType {
  if (
    value ===
      "optimization" ||
    value ===
      "optimization_redesign" ||
    value ===
      "redesign" ||
    value ===
      "new_website"
  ) {
    return value;
  }

  return "optimization";
}

function proposalRequiresPdf(
  proposalType: ProposalType
) {
  return (
    proposalType !==
    "optimization"
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

    const confirmedRecipientValue =
      typeof body
        ?.confirmedRecipientEmail ===
      "string"
        ? body.confirmedRecipientEmail
        : "";

    const confirmedRecipientEmails =
      normalizeRecipientEmails(
        confirmedRecipientValue
      );

    const confirmedRecipientsCanonical =
      canonicalRecipientEmails(
        confirmedRecipientValue
      );

    if (
      confirmedRecipientEmails.length ===
        0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Confirmation des destinataires manquante. Envoi annulé.",
        },
        {
          status: 400,
        }
      );
    }

    const invalidConfirmedRecipient =
      confirmedRecipientEmails.find(
        (email) =>
          !isValidEmail(
            email
          )
      );

    if (
      invalidConfirmedRecipient
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            `Adresse e-mail destinataire invalide : ${invalidConfirmedRecipient}`,
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
          proposal_type,
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

    const proposalType =
      normalizeProposalType(
        prospection.proposal_type
      );

    const requiresPdf =
      proposalRequiresPdf(
        proposalType
      );

    const recipientEmail =
      prospection
        .recipient_email
        ?.trim();

    const recipientEmails =
      normalizeRecipientEmails(
        recipientEmail
      );

    const storedRecipientsCanonical =
      canonicalRecipientEmails(
        recipientEmail
      );

    if (
      recipientEmails.length ===
        0
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

    const invalidStoredRecipient =
      recipientEmails.find(
        (email) =>
          !isValidEmail(
            email
          )
      );

    if (
      invalidStoredRecipient
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            `Adresse e-mail destinataire invalide : ${invalidStoredRecipient}`,
        },
        {
          status: 400,
        }
      );
    }

    if (
      storedRecipientsCanonical !==
      confirmedRecipientsCanonical
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Sécurité : les destinataires confirmés ne correspondent pas aux destinataires actuellement enregistrés. Aucun email n’a été envoyé.",

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

    /*
     * Règle métier définitive :
     *
     * - optimisation seule :
     *   aucune pièce jointe,
     *   même si une ancienne URL
     *   existe encore en base ;
     *
     * - tous les autres angles :
     *   le PDF est obligatoire.
     */
    const storedAttachmentUrl =
      prospection
        .attachment_url
        ?.trim() ||
      null;

    const attachmentUrl =
      requiresPdf
        ? storedAttachmentUrl
        : null;

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
      requiresPdf &&
      !attachmentUrl
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Cette proposition nécessite un PDF. Générez la projection avant l’envoi.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Nouvelle lecture de sécurité juste avant l'envoi.
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
          proposal_type,
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
      canonicalRecipientEmails(
        securityCheck.recipient_email
      ) !==
      confirmedRecipientsCanonical
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Sécurité : les destinataires enregistrés ont changé depuis la confirmation. Aucun email n’a été envoyé.",
        },
        {
          status: 409,
        }
      );
    }

    const securityProposalType =
      normalizeProposalType(
        securityCheck.proposal_type
      );

    if (
      securityProposalType !==
      proposalType
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Sécurité : le type de proposition a changé avant l’envoi. Rechargez la fiche avant de poursuivre.",
        },
        {
          status: 409,
        }
      );
    }

    const securityAttachmentUrl =
      securityCheck
        .attachment_url
        ?.trim() ||
      null;

    if (
      securityCheck.subject
        ?.trim() !==
        subject ||
      securityCheck.email_content
        ?.trim() !==
        emailContent
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

    /*
     * On ne compare la pièce jointe
     * que lorsqu'elle est réellement
     * nécessaire.
     *
     * En optimisation seule, une
     * ancienne attachment_url n'a
     * aucune incidence sur l'envoi.
     */
    if (
      requiresPdf &&
      securityAttachmentUrl !==
        attachmentUrl
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Sécurité : le PDF de la proposition a changé avant l’envoi. Rechargez la fiche et vérifiez la pièce jointe.",
        },
        {
          status: 409,
        }
      );
    }

    let attachmentBuffer:
      | Buffer
      | null = null;

    if (
      requiresPdf &&
      attachmentUrl
    ) {
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

      attachmentBuffer =
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

    await transporter.verify();

    const htmlContent =
      buildHtmlContent(
        emailContent
      );

    const textContent =
      `${emailContent}\n\n${getTextSignature()}`;

    /*
     * Le logo de signature est toujours
     * présent.
     *
     * Le PDF n'est ajouté que lorsque
     * l'angle commercial l'exige.
     */
    const attachments:
      Parameters<
        typeof transporter.sendMail
      >[0]["attachments"] =
      [];

    if (
      requiresPdf &&
      attachmentUrl &&
      attachmentBuffer
    ) {
      attachments.push({
        filename:
          getPdfFilename(
            attachmentUrl
          ),

        content:
          attachmentBuffer,

        contentType:
          "application/pdf",
      });
    }

    attachments.push({
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
    });

    const sendResult =
      await transporter.sendMail({
        from: {
          name:
            smtpFromName,

          address:
            smtpUser,
        },

        to:
          recipientEmails.length ===
            1 &&
          recipientName
            ? {
                name:
                  recipientName,

                address:
                  recipientEmails[0],
              }
            : recipientEmails,

        replyTo:
          smtpUser,

        subject,

        text:
          textContent,

        html:
          htmlContent,

        attachments,

        headers: {
          "X-LBMedia-Office":
            "audit-prospection",

          "X-LBMedia-Prospection-ID":
            prospection.id,

          "X-LBMedia-Company-ID":
            prospection.company_id,

          "X-LBMedia-Audit-ID":
            prospection.website_audit_id,

          "X-LBMedia-Proposal-Type":
            proposalType,
        },
      });

    const accepted =
      sendResult.accepted.map(
        (address) =>
          normalizeEmail(
            String(
              address
            )
          )
      );

    const rejectedRecipients =
      recipientEmails.filter(
        (recipient) =>
          !accepted.includes(
            recipient
          )
      );

    if (
      rejectedRecipients.length >
      0
    ) {
      console.error(
        "SMTP n'a pas accepté tous les destinataires",
        {
          prospectionId:
            prospection.id,

          proposalType,

          recipientEmails,

          rejectedRecipients,

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
            `Le serveur SMTP n’a pas confirmé l’acceptation de tous les destinataires (${rejectedRecipients.join(
              ", "
            )}). Le statut n’a pas été modifié.`,

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
     * Photographie exacte de l'envoi.
     *
     * En optimisation seule,
     * sent_attachment_url est
     * explicitement null.
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

          proposalType,

          messageId:
            sendResult.messageId,

          recipients:
            recipientEmails,

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

    try {
      await createInitialAuditProspectionMessage({
        auditProspectionId:
          prospection.id,

        recipientEmail,

        subject,

        emailContent,

        htmlContent,

        attachmentUrl,

        smtpMessageId:
          sendResult.messageId ??
          null,

        sentAt,
      });
    } catch (
      historyError
    ) {
      console.error(
        "E-mail envoyé et archivé, mais historique commercial non créé",
        {
          prospectionId:
            prospection.id,

          proposalType,

          messageId:
            sendResult.messageId,

          sentAt,

          error:
            historyError instanceof Error
              ? historyError.message
              : historyError,
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

        proposalType,

        pdfAttached:
          requiresPdf,

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

      recipientEmail:
        recipientEmails.join(
          ", "
        ),

      recipientEmails,

      proposalType,

      pdfAttached:
        requiresPdf,

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