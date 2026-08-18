import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

export type AuditProspectionMessageType =
  | "initial"
  | "follow_up";

export type AuditProspectionMessage = {
  id: string;

  audit_prospection_id: string;

  message_type:
    AuditProspectionMessageType;

  sequence_number: number;

  recipient_email: string;

  subject: string;

  email_content: string;

  html_content: string | null;

  attachment_url: string | null;

  smtp_message_id: string | null;

  sent_at: string;

  created_at: string;
};

type CreateAuditProspectionMessageInput = {
  auditProspectionId: string;

  messageType:
    AuditProspectionMessageType;

  sequenceNumber?: number;

  recipientEmail: string;

  subject: string;

  emailContent: string;

  htmlContent?: string | null;

  attachmentUrl?: string | null;

  smtpMessageId?: string | null;

  sentAt?: string;
};

const auditProspectionMessageSelect = `
  id,
  audit_prospection_id,
  message_type,
  sequence_number,
  recipient_email,
  subject,
  email_content,
  html_content,
  attachment_url,
  smtp_message_id,
  sent_at,
  created_at
`;

export async function getAuditProspectionMessages(
  auditProspectionId: string
): Promise<
  AuditProspectionMessage[]
> {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from(
      "audit_prospection_messages"
    )
    .select(
      auditProspectionMessageSelect
    )
    .eq(
      "audit_prospection_id",
      auditProspectionId
    )
    .order(
      "sent_at",
      {
        ascending: true,
      }
    );

  if (error) {
    throw new Error(
      `Impossible de charger l’historique des messages de prospection : ${error.message}`
    );
  }

  return (
    data ?? []
  ) as AuditProspectionMessage[];
}

export async function getLatestAuditProspectionMessage(
  auditProspectionId: string
): Promise<
  AuditProspectionMessage | null
> {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from(
      "audit_prospection_messages"
    )
    .select(
      auditProspectionMessageSelect
    )
    .eq(
      "audit_prospection_id",
      auditProspectionId
    )
    .order(
      "sent_at",
      {
        ascending: false,
      }
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Impossible de charger le dernier message de prospection : ${error.message}`
    );
  }

  if (!data) {
    return null;
  }

  return data as AuditProspectionMessage;
}

export async function getAuditProspectionMessageById(
  messageId: string
): Promise<
  AuditProspectionMessage | null
> {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from(
      "audit_prospection_messages"
    )
    .select(
      auditProspectionMessageSelect
    )
    .eq(
      "id",
      messageId
    )
    .maybeSingle();

  if (error) {
    throw new Error(
      `Impossible de charger le message de prospection : ${error.message}`
    );
  }

  if (!data) {
    return null;
  }

  return data as AuditProspectionMessage;
}

export async function getNextFollowUpSequenceNumber(
  auditProspectionId: string
): Promise<number> {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from(
      "audit_prospection_messages"
    )
    .select(
      `
        sequence_number
      `
    )
    .eq(
      "audit_prospection_id",
      auditProspectionId
    )
    .eq(
      "message_type",
      "follow_up"
    )
    .order(
      "sequence_number",
      {
        ascending: false,
      }
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Impossible de déterminer le numéro de la prochaine relance : ${error.message}`
    );
  }

  if (!data) {
    return 1;
  }

  return (
    Number(
      data.sequence_number
    ) + 1
  );
}

export async function createAuditProspectionMessage(
  input: CreateAuditProspectionMessageInput
): Promise<
  AuditProspectionMessage
> {
  const recipientEmail =
    input.recipientEmail.trim();

  const subject =
    input.subject.trim();

  const emailContent =
    input.emailContent.trim();

  if (!recipientEmail) {
    throw new Error(
      "Le destinataire du message de prospection est obligatoire."
    );
  }

  if (!subject) {
    throw new Error(
      "L’objet du message de prospection est obligatoire."
    );
  }

  if (!emailContent) {
    throw new Error(
      "Le contenu du message de prospection est obligatoire."
    );
  }

  const sequenceNumber =
    input.sequenceNumber ??
    (input.messageType ===
    "initial"
      ? 1
      : await getNextFollowUpSequenceNumber(
          input.auditProspectionId
        ));

  const sentAt =
    input.sentAt ??
    new Date().toISOString();

  const {
    data,
    error,
  } = await supabaseAdmin
    .from(
      "audit_prospection_messages"
    )
    .insert({
      audit_prospection_id:
        input.auditProspectionId,

      message_type:
        input.messageType,

      sequence_number:
        sequenceNumber,

      recipient_email:
        recipientEmail,

      subject,

      email_content:
        emailContent,

      html_content:
        input.htmlContent ??
        null,

      attachment_url:
        input.attachmentUrl ??
        null,

      smtp_message_id:
        input.smtpMessageId ??
        null,

      sent_at:
        sentAt,
    })
    .select(
      auditProspectionMessageSelect
    )
    .single();

  if (error) {
    throw new Error(
      `Impossible d’archiver le message de prospection : ${error.message}`
    );
  }

  return data as AuditProspectionMessage;
}

export async function createInitialAuditProspectionMessage(
  input: Omit<
    CreateAuditProspectionMessageInput,
    | "messageType"
    | "sequenceNumber"
  >
): Promise<
  AuditProspectionMessage
> {
  return createAuditProspectionMessage(
    {
      ...input,

      messageType:
        "initial",

      sequenceNumber:
        1,
    }
  );
}

export async function createFollowUpAuditProspectionMessage(
  input: Omit<
    CreateAuditProspectionMessageInput,
    | "messageType"
    | "sequenceNumber"
  >
): Promise<
  AuditProspectionMessage
> {
  const sequenceNumber =
    await getNextFollowUpSequenceNumber(
      input.auditProspectionId
    );

  return createAuditProspectionMessage(
    {
      ...input,

      messageType:
        "follow_up",

      sequenceNumber,
    }
  );
}

export async function deleteAuditProspectionMessages(
  auditProspectionId: string
): Promise<void> {
  const {
    error,
  } = await supabaseAdmin
    .from(
      "audit_prospection_messages"
    )
    .delete()
    .eq(
      "audit_prospection_id",
      auditProspectionId
    );

  if (error) {
    throw new Error(
      `Impossible de supprimer l’historique des messages de prospection : ${error.message}`
    );
  }
}