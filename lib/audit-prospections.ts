import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

export type AuditProspectionStatus =
  | "draft"
  | "ready"
  | "sent"
  | "follow_up"
  | "replied";

export type AuditProspection = {
  id: string;
  company_id: string;
  website_audit_id: string;

  status: AuditProspectionStatus;

  recipient_email: string | null;
  recipient_name: string | null;

  subject: string | null;
  email_content: string | null;

  sales_angle: string | null;

  attachment_url: string | null;

  sent_at: string | null;
  follow_up_at: string | null;
  replied_at: string | null;

  created_at: string;
  updated_at: string;
};

type CreateAuditProspectionInput = {
  companyId: string;
  websiteAuditId: string;

  recipientEmail?: string | null;
  recipientName?: string | null;
};

type UpdateAuditProspectionInput = {
  status?: AuditProspectionStatus;

  recipientEmail?: string | null;
  recipientName?: string | null;

  subject?: string | null;
  emailContent?: string | null;

  salesAngle?: string | null;

  attachmentUrl?: string | null;

  sentAt?: string | null;
  followUpAt?: string | null;
  repliedAt?: string | null;
};

export async function getAuditProspectionByAuditId(
  websiteAuditId: string
): Promise<AuditProspection | null> {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from("audit_prospections")
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
        sales_angle,
        attachment_url,
        sent_at,
        follow_up_at,
        replied_at,
        created_at,
        updated_at
      `
    )
    .eq(
      "website_audit_id",
      websiteAuditId
    )
    .maybeSingle();

  if (error) {
    throw new Error(
      `Impossible de charger la prospection liée à l’audit : ${error.message}`
    );
  }

  if (!data) {
    return null;
  }

  return data as AuditProspection;
}

export async function getCompanyAuditProspections(
  companyId: string
): Promise<AuditProspection[]> {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from("audit_prospections")
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
        sales_angle,
        attachment_url,
        sent_at,
        follow_up_at,
        replied_at,
        created_at,
        updated_at
      `
    )
    .eq(
      "company_id",
      companyId
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    );

  if (error) {
    throw new Error(
      `Impossible de charger les prospections de l’entreprise : ${error.message}`
    );
  }

  return (
    data ?? []
  ) as AuditProspection[];
}

export async function createAuditProspection(
  input: CreateAuditProspectionInput
): Promise<AuditProspection> {
  const {
    data: existing,
    error: existingError,
  } = await supabaseAdmin
    .from("audit_prospections")
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
        sales_angle,
        attachment_url,
        sent_at,
        follow_up_at,
        replied_at,
        created_at,
        updated_at
      `
    )
    .eq(
      "website_audit_id",
      input.websiteAuditId
    )
    .maybeSingle();

  if (existingError) {
    throw new Error(
      `Impossible de vérifier la prospection existante : ${existingError.message}`
    );
  }

  if (existing) {
    return existing as AuditProspection;
  }

  const {
    data,
    error,
  } = await supabaseAdmin
    .from("audit_prospections")
    .insert({
      company_id:
        input.companyId,
      website_audit_id:
        input.websiteAuditId,

      recipient_email:
        input.recipientEmail ??
        null,

      recipient_name:
        input.recipientName ??
        null,
    })
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
        sales_angle,
        attachment_url,
        sent_at,
        follow_up_at,
        replied_at,
        created_at,
        updated_at
      `
    )
    .single();

  if (error) {
    throw new Error(
      `Impossible de créer la prospection : ${error.message}`
    );
  }

  return data as AuditProspection;
}

export async function updateAuditProspection(
  prospectionId: string,
  input: UpdateAuditProspectionInput
): Promise<AuditProspection> {
  const payload: Record<
    string,
    unknown
  > = {
    updated_at:
      new Date().toISOString(),
  };

  if (
    input.status !== undefined
  ) {
    payload.status =
      input.status;
  }

  if (
    input.recipientEmail !==
    undefined
  ) {
    payload.recipient_email =
      input.recipientEmail;
  }

  if (
    input.recipientName !==
    undefined
  ) {
    payload.recipient_name =
      input.recipientName;
  }

  if (
    input.subject !== undefined
  ) {
    payload.subject =
      input.subject;
  }

  if (
    input.emailContent !==
    undefined
  ) {
    payload.email_content =
      input.emailContent;
  }

  if (
    input.salesAngle !==
    undefined
  ) {
    payload.sales_angle =
      input.salesAngle;
  }

  if (
    input.attachmentUrl !==
    undefined
  ) {
    payload.attachment_url =
      input.attachmentUrl;
  }

  if (
    input.sentAt !== undefined
  ) {
    payload.sent_at =
      input.sentAt;
  }

  if (
    input.followUpAt !==
    undefined
  ) {
    payload.follow_up_at =
      input.followUpAt;
  }

  if (
    input.repliedAt !==
    undefined
  ) {
    payload.replied_at =
      input.repliedAt;
  }

  const {
    data,
    error,
  } = await supabaseAdmin
    .from("audit_prospections")
    .update(payload)
    .eq(
      "id",
      prospectionId
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
        sales_angle,
        attachment_url,
        sent_at,
        follow_up_at,
        replied_at,
        created_at,
        updated_at
      `
    )
    .single();

  if (error) {
    throw new Error(
      `Impossible de mettre à jour la prospection : ${error.message}`
    );
  }

  return data as AuditProspection;
}