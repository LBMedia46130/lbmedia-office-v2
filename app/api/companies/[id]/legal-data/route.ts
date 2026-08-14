import {
  NextRequest,
  NextResponse,
} from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic =
  "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type LegalDataPayload = {
  siren?: string;
  siret?: string;
  vat_number?: string;

  legal_name?: string;
  legal_form?: string;

  address?: string;
  address_line_2?: string;
  postal_code?: string;
  city?: string;

  ape_code?: string;
  ape_label?: string;

  creation_date?: string;
  employee_range?: string;
};

function normalizeValue(
  value: unknown
): string | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const cleaned =
    value.trim();

  return cleaned || null;
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  const {
    id,
  } = await context.params;

  try {
    const body =
      (await request.json()) as LegalDataPayload;

    const legalData = {
      siren:
        normalizeValue(
          body.siren
        ),

      siret:
        normalizeValue(
          body.siret
        ),

      vat_number:
        normalizeValue(
          body.vat_number
        ),

      legal_name:
        normalizeValue(
          body.legal_name
        ),

      legal_form:
        normalizeValue(
          body.legal_form
        ),

      address:
        normalizeValue(
          body.address
        ),

      address_line_2:
        normalizeValue(
          body.address_line_2
        ),

      postal_code:
        normalizeValue(
          body.postal_code
        ),

      city:
        normalizeValue(
          body.city
        ),

      ape_code:
        normalizeValue(
          body.ape_code
        ),

      ape_label:
        normalizeValue(
          body.ape_label
        ),

      creation_date:
        normalizeValue(
          body.creation_date
        ),

      employee_range:
        normalizeValue(
          body.employee_range
        ),

      legal_data_updated_at:
        new Date().toISOString(),
    };

    const {
      data,
      error,
    } = await supabaseAdmin
      .from("companies")
      .update(legalData)
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Entreprise introuvable.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Erreur import données légales :",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Impossible d’enregistrer les données légales.",
      },
      {
        status: 500,
      }
    );
  }
}