"use server";

import { revalidatePath } from "next/cache";

import { supabaseAdmin } from "@/lib/supabase-admin";

export type ContactActionResult = {
  success: boolean;
  message: string;
};

function optionalValue(
  formData: FormData,
  field: string
): string | null {
  const value =
    formData.get(field);

  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const trimmed =
    value.trim();

  return trimmed.length > 0
    ? trimmed
    : null;
}

export async function createCompanyContact(
  companyId: string,
  formData: FormData
): Promise<ContactActionResult> {
  const firstName =
    formData.get("first_name");

  const lastName =
    formData.get("last_name");

  if (
    typeof firstName !== "string" ||
    !firstName.trim()
  ) {
    return {
      success: false,
      message:
        "Le prénom est obligatoire.",
    };
  }

  if (
    typeof lastName !== "string" ||
    !lastName.trim()
  ) {
    return {
      success: false,
      message:
        "Le nom est obligatoire.",
    };
  }

  const isPrimary =
    formData.get("is_primary") ===
    "on";

  if (isPrimary) {
    const { error: resetError } =
      await supabaseAdmin
        .from("company_contacts")
        .update({
          is_primary: false,
        })
        .eq(
          "company_id",
          companyId
        );

    if (resetError) {
      console.error(
        resetError
      );

      return {
        success: false,
        message:
          "Impossible de mettre à jour le contact principal.",
      };
    }
  }

  const { error } =
    await supabaseAdmin
      .from("company_contacts")
      .insert({
        company_id: companyId,
        first_name:
          firstName.trim(),
        last_name:
          lastName.trim(),
        job_title:
          optionalValue(
            formData,
            "job_title"
          ),
        email:
          optionalValue(
            formData,
            "email"
          ),
        phone:
          optionalValue(
            formData,
            "phone"
          ),
        mobile:
          optionalValue(
            formData,
            "mobile"
          ),
        is_primary:
          isPrimary,
      });

  if (error) {
    console.error(error);

    return {
      success: false,
      message:
        "Impossible d’ajouter le contact.",
    };
  }

  revalidatePath(
    `/companies/${companyId}`
  );

  return {
    success: true,
    message: "",
  };
}

export async function updateCompanyContact(
  companyId: string,
  contactId: string,
  formData: FormData
): Promise<ContactActionResult> {
  const firstName =
    formData.get("first_name");

  const lastName =
    formData.get("last_name");

  if (
    typeof firstName !== "string" ||
    !firstName.trim()
  ) {
    return {
      success: false,
      message:
        "Le prénom est obligatoire.",
    };
  }

  if (
    typeof lastName !== "string" ||
    !lastName.trim()
  ) {
    return {
      success: false,
      message:
        "Le nom est obligatoire.",
    };
  }

  const isPrimary =
    formData.get("is_primary") ===
    "on";

  if (isPrimary) {
    const { error: resetError } =
      await supabaseAdmin
        .from("company_contacts")
        .update({
          is_primary: false,
        })
        .eq(
          "company_id",
          companyId
        )
        .neq("id", contactId);

    if (resetError) {
      console.error(
        resetError
      );

      return {
        success: false,
        message:
          "Impossible de mettre à jour le contact principal.",
      };
    }
  }

  const { error } =
    await supabaseAdmin
      .from("company_contacts")
      .update({
        first_name:
          firstName.trim(),
        last_name:
          lastName.trim(),
        job_title:
          optionalValue(
            formData,
            "job_title"
          ),
        email:
          optionalValue(
            formData,
            "email"
          ),
        phone:
          optionalValue(
            formData,
            "phone"
          ),
        mobile:
          optionalValue(
            formData,
            "mobile"
          ),
        is_primary:
          isPrimary,
      })
      .eq("id", contactId)
      .eq(
        "company_id",
        companyId
      );

  if (error) {
    console.error(error);

    return {
      success: false,
      message:
        "Impossible de modifier le contact.",
    };
  }

  revalidatePath(
    `/companies/${companyId}`
  );

  return {
    success: true,
    message: "",
  };
}

export async function deleteCompanyContact(
  companyId: string,
  contactId: string
): Promise<ContactActionResult> {
  const { error } =
    await supabaseAdmin
      .from("company_contacts")
      .delete()
      .eq("id", contactId)
      .eq(
        "company_id",
        companyId
      );

  if (error) {
    console.error(error);

    return {
      success: false,
      message:
        "Impossible de supprimer le contact.",
    };
  }

  revalidatePath(
    `/companies/${companyId}`
  );

  return {
    success: true,
    message: "",
  };
}