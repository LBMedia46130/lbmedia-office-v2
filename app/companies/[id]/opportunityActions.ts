"use server";

import { revalidatePath } from "next/cache";

import { supabaseAdmin } from "@/lib/supabase-admin";

export type OpportunityActionResult = {
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

  const trimmedValue =
    value.trim();

  return trimmedValue.length > 0
    ? trimmedValue
    : null;
}

function optionalNumber(
  formData: FormData,
  field: string
): number | null {
  const value =
    formData.get(field);

  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return null;
  }

  const parsedValue =
    Number(value);

  return Number.isFinite(
    parsedValue
  )
    ? parsedValue
    : null;
}

export async function createOpportunity(
  companyId: string,
  formData: FormData
): Promise<OpportunityActionResult> {
  const title =
    formData.get("title");

  if (
    typeof title !== "string" ||
    !title.trim()
  ) {
    return {
      success: false,
      message:
        "Le titre de l’opportunité est obligatoire.",
    };
  }

  const probabilityValue =
    optionalNumber(
      formData,
      "probability"
    ) ?? 0;

  const probability =
    Math.min(
      100,
      Math.max(
        0,
        probabilityValue
      )
    );

  const { error } =
    await supabaseAdmin
      .from("opportunities")
      .insert({
        company_id: companyId,
        title: title.trim(),
        description:
          optionalValue(
            formData,
            "description"
          ),
        status:
          optionalValue(
            formData,
            "status"
          ) ?? "new",
        value:
          optionalNumber(
            formData,
            "value"
          ),
        probability,
        expected_close_date:
          optionalValue(
            formData,
            "expected_close_date"
          ),
        source:
          optionalValue(
            formData,
            "source"
          ),
        updated_at:
          new Date().toISOString(),
      });

  if (error) {
    console.error(error);

    return {
      success: false,
      message:
        "Impossible d’enregistrer l’opportunité.",
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

export async function updateOpportunity(
  companyId: string,
  opportunityId: string,
  formData: FormData
): Promise<OpportunityActionResult> {
  const title =
    formData.get("title");

  if (
    typeof title !== "string" ||
    !title.trim()
  ) {
    return {
      success: false,
      message:
        "Le titre de l’opportunité est obligatoire.",
    };
  }

  const probabilityValue =
    optionalNumber(
      formData,
      "probability"
    ) ?? 0;

  const probability =
    Math.min(
      100,
      Math.max(
        0,
        probabilityValue
      )
    );

  const { error } =
    await supabaseAdmin
      .from("opportunities")
      .update({
        title:
          title.trim(),
        description:
          optionalValue(
            formData,
            "description"
          ),
        status:
          optionalValue(
            formData,
            "status"
          ) ?? "new",
        value:
          optionalNumber(
            formData,
            "value"
          ),
        probability,
        expected_close_date:
          optionalValue(
            formData,
            "expected_close_date"
          ),
        source:
          optionalValue(
            formData,
            "source"
          ),
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        opportunityId
      )
      .eq(
        "company_id",
        companyId
      );

  if (error) {
    console.error(error);

    return {
      success: false,
      message:
        "Impossible de modifier l’opportunité.",
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

export async function deleteOpportunity(
  companyId: string,
  opportunityId: string
): Promise<OpportunityActionResult> {
  const { error } =
    await supabaseAdmin
      .from("opportunities")
      .delete()
      .eq(
        "id",
        opportunityId
      )
      .eq(
        "company_id",
        companyId
      );

  if (error) {
    console.error(error);

    return {
      success: false,
      message:
        "Impossible de supprimer l’opportunité.",
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