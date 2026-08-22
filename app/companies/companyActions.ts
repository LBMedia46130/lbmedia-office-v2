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

/*
 * Une entreprise n'est jamais
 * supprimée physiquement depuis
 * LBMedia Office.
 *
 * La suppression depuis l'interface
 * correspond à un archivage :
 * is_active passe à false.
 *
 * Cela permet de conserver :
 * - la fiche CRM ;
 * - le zoho_contact_id ;
 * - les liens avec devis/factures ;
 * - l'historique commercial ;
 * - les données liées à l'entreprise.
 *
 * Aucun appel Zoho n'est effectué ici.
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
    .update({
      is_active:
        false,
    })
    .eq(
      "id",
      id
    )
    .select(
      `
        id,
        name,
        is_active
      `
    )
    .maybeSingle();

  if (
    error
  ) {
    console.error(
      error
    );

    return {
      success: false,
      message:
        "Impossible d’archiver l’entreprise.",
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

  revalidatePath(
    `/companies/${id}`
  );

  redirect(
    "/companies"
  );
}