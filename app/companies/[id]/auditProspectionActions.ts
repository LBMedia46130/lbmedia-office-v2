"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  createAuditProspection,
} from "@/lib/audit-prospections";

export async function prepareAuditProspection(
  companyId: string,
  websiteAuditId: string,
  recipientEmail: string | null
) {
  await createAuditProspection({
    companyId,
    websiteAuditId,
    recipientEmail,
  });

  revalidatePath(
    `/companies/${companyId}`
  );
}