"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

export type CompanyActionResult = {
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

export async function createCompany(
  formData: FormData
): Promise<CompanyActionResult> {
  const name =
    formData.get("name");

  if (
    typeof name !== "string" ||
    !name.trim()
  ) {
    return {
      success: false,
      message:
        "Le nom de l’entreprise est obligatoire.",
    };
  }

  const {
    data,
    error,
  } = await supabaseAdmin
    .from("companies")
    .insert({
      name: name.trim(),
      legal_name:
        optionalValue(
          formData,
          "legal_name"
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
      website:
        optionalValue(
          formData,
          "website"
        ),
      postal_code:
        optionalValue(
          formData,
          "postal_code"
        ),
      city:
        optionalValue(
          formData,
          "city"
        ),
      is_active:
        true,
      relationship_status:
        "prospect",
      pipeline_stage:
        "new",
    })
    .select("id")
    .single();

  if (
    error ||
    !data
  ) {
    console.error(
      error
    );

    return {
      success: false,
      message:
        "Impossible d’enregistrer l’entreprise.",
    };
  }

  revalidatePath(
    "/companies"
  );

  redirect(
    `/companies/${data.id}`
  );
}

/**
 * Supprime définitivement une entreprise
 * de LBMedia Office.
 *
 * Les relations sont gérées par les
 * contraintes de la base :
 *
 * CASCADE :
 * - audit_prospections
 * - company_contacts
 * - opportunities
 *
 * SET NULL :
 * - estimate_campaign_contexts
 * - website_audits
 *
 * Aucun appel Zoho n'est effectué ici.
 * Les devis et factures Zoho sont conservés.
 */
export async function deleteCompany(
  id: string
): Promise<CompanyActionResult> {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from(
      "companies"
    )
    .delete()
    .eq(
      "id",
      id
    )
    .select(
      `
        id,
        name
      `
    )
    .maybeSingle();

  if (
    error
  ) {
    console.error(
      "Company deletion failed:",
      error
    );

    return {
      success: false,
      message:
        "Impossible de supprimer l’entreprise.",
    };
  }

  if (
    !data
  ) {
    return {
      success: false,
      message:
        "Entreprise introuvable.",
    };
  }

  revalidatePath(
    "/companies"
  );

  redirect(
    "/companies"
  );
}