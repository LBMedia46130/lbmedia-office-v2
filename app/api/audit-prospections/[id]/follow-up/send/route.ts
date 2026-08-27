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
  createFollowUpAuditProspectionMessage,
  getLatestAuditProspectionMessage,
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
  subject?: unknown;
  emailContent?: unknown;
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

    const subject =
      typeof body?.subject ===
      "string"
        ? body.subject.trim()
        : "";

    const emailContent =
      typeof body?.emailContent ===
      "string"
        ? body.emailContent.trim()
        : "";

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

    if (!subject) {
      return NextResponse.json(
        {
          success: false,
          message:
            "L’objet de la relance est obligatoire.",
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
            "Le contenu de la relance est obligatoire.",
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
          sent_at,
          follow_up_at,
          replied_at,
          smtp_message_id
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
      "replied"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Cette prospection est marquée comme ayant reçu une réponse.",
        },
        {
          status: 409,
        }
      );
    }

    if (
      prospection.status !==
      "follow_up"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Cette prospection n’est pas au statut de relance.",
        },
        {
          status: 409,
        }
      );
    }

    if (
      !prospection.sent_at
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Aucun premier envoi n’est enregistré.",
        },
        {
          status: 409,
        }
      );
    }

    if (
      !prospection.follow_up_at
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Aucune date de relance n’est enregistrée.",
        },
        {
          status: 409,
        }
      );
    }

    const followUpTime =
      new Date(
        prospection.follow_up_at
      ).getTime();

    if (
      Number.isNaN(
        followUpTime
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "La date de relance enregistrée est invalide.",
        },
        {
          status: 409,
        }
      );
    }

    if (
      followUpTime >
      Date.now()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "La date de relance n’est pas encore arrivée.",
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

    if (!recipientEmail) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Aucune adresse e-mail destinataire n’est enregistrée.",
        },
        {
          status: 400,
        }
      );
    }

    const recipientEmails =
      normalizeRecipientEmails(
        recipientEmail
      );

    const storedRecipientsCanonical =
      canonicalRecipientEmails(
        recipientEmail
      );

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
            "Sécurité : les destinataires confirmés ne correspondent pas aux destinataires enregistrés. Aucun email n’a été envoyé.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * Historique existant :
     * on l'utilise aussi pour empêcher un double envoi
     * si la relance a déjà été envoyée mais que la fiche
     * n'a pas encore été rafraîchie.
     */
    const latestMessage =
      await getLatestAuditProspectionMessage(
        prospection.id
      );

    if (
      latestMessage &&
      latestMessage.message_type ===
        "follow_up"
    ) {
      const latestMessageTime =
        new Date(
          latestMessage.sent_at
        ).getTime();

      if (
        Number.isFinite(
          latestMessageTime
        ) &&
        latestMessageTime >=
          followUpTime
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Cette relance a déjà été envoyée.",
          },
          {
            status: 409,
          }
        );
      }
    }

    /*
     * Nouvelle lecture juste avant SMTP.
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
          follow_up_at,
          replied_at
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
            "Impossible de vérifier la prospection avant l’envoi. Aucun email n’a été envoyé.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      securityCheck.status !==
      "follow_up" ||
      securityCheck.replied_at
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le suivi de cette prospection a changé. Aucun email n’a été envoyé.",
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
            "Sécurité : les destinataires ont changé avant l’envoi.",
        },
        {
          status: 409,
        }
      );
    }

    if (
      securityCheck.follow_up_at !==
      prospection.follow_up_at
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "La date de relance a été modifiée. Rechargez la fiche avant d’envoyer.",
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

    const threadMessageId =
      latestMessage
        ?.smtp_message_id
        ?.trim() ||
      prospection
        .smtp_message_id
        ?.trim() ||
      null;

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

        /*
         * La relance est rattachée au fil du précédent
         * message lorsque l'identifiant SMTP est disponible.
         */
        inReplyTo:
          threadMessageId ??
          undefined,

        references:
          threadMessageId
            ? [
                threadMessageId,
              ]
            : undefined,

        attachments: [
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
            "audit-prospection-follow-up",

          "X-LBMedia-Prospection-ID":
            prospection.id,

          "X-LBMedia-Company-ID":
            prospection.company_id,

          "X-LBMedia-Audit-ID":
            prospection.website_audit_id,

          "X-LBMedia-Message-Type":
            "follow-up",
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
        "SMTP n'a pas accepté tous les destinataires de la relance",
        {
          prospectionId:
            prospection.id,

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
            )}). La relance n’a pas été archivée.`,

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

    let archivedMessage:
      | Awaited<
          ReturnType<
            typeof createFollowUpAuditProspectionMessage
          >
        >
      | null = null;

    try {
      archivedMessage =
        await createFollowUpAuditProspectionMessage({
          auditProspectionId:
            prospection.id,

          recipientEmail:
            recipientEmails.join(
              ", "
            ),

          subject,

          emailContent,

          htmlContent,

          attachmentUrl:
            null,

          smtpMessageId:
            sendResult.messageId ??
            null,

          sentAt,
        });
    } catch (
      historyError
    ) {
      console.error(
        "Relance envoyée mais historique commercial non créé",
        {
          prospectionId:
            prospection.id,

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

    /*
     * Après l'envoi d'une relance, on prépare automatiquement
     * le prochain point de suivi à J+7.
     *
     * Laurent pourra modifier cette date directement dans
     * le bloc Suivi commercial.
     */
    const nextFollowUpDate =
      new Date(sentAt);

    nextFollowUpDate.setDate(
      nextFollowUpDate.getDate() +
        7
    );

    const nextFollowUpAt =
      nextFollowUpDate.toISOString();

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
          "follow_up",

        follow_up_at:
          nextFollowUpAt,

        updated_at:
          sentAt,
      })
      .eq(
        "id",
        prospection.id
      )
      .eq(
        "status",
        "follow_up"
      )
      .eq(
        "follow_up_at",
        prospection.follow_up_at
      )
      .select("*")
      .maybeSingle();

    if (
      updateError ||
      !updated
    ) {
      console.error(
        "Relance envoyée mais prochaine date de suivi non enregistrée",
        {
          prospectionId:
            prospection.id,

          messageId:
            sendResult.messageId,

          sentAt,

          error:
            updateError
              ?.message ??
            "Mise à jour refusée.",
        }
      );

      return NextResponse.json(
        {
          success: false,

          sent: true,

          archived:
            Boolean(
              archivedMessage
            ),

          message:
            "La relance a été acceptée par le serveur SMTP, mais LBMedia Office n’a pas réussi à enregistrer la prochaine date de suivi. Ne renvoyez pas l’email.",

          messageId:
            sendResult.messageId,

          sentAt,
        },
        {
          status: 500,
        }
      );
    }

    if (!archivedMessage) {
      return NextResponse.json(
        {
          success: false,

          sent: true,

          archived:
            false,

          message:
            "La relance a été envoyée et le suivi a été reprogrammé, mais son archivage détaillé a échoué. Ne renvoyez pas l’email.",

          messageId:
            sendResult.messageId,

          sentAt,

          nextFollowUpAt,
        },
        {
          status: 500,
        }
      );
    }

    console.info(
      "Relance prospection envoyée",
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

        nextFollowUpAt,

        messageId:
          sendResult.messageId,

        sequenceNumber:
          archivedMessage.sequence_number,

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
        "Relance envoyée avec succès.",

      sentAt,

      nextFollowUpAt,

      messageId:
        sendResult.messageId,

      sequenceNumber:
        archivedMessage.sequence_number,

      recipientEmail:
        recipientEmails.join(
          ", "
        ),

      recipientEmails,

      prospection:
        updated,
    });
  } catch (error) {
    console.error(
      "Erreur envoi relance prospection",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Une erreur est survenue pendant l’envoi de la relance.",
      },
      {
        status: 500,
      }
    );
  }
}