import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

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

type LegalDataUpdate = {
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

  legal_data_updated_at: string;
};

/*
 * Certaines fiches de l'Annuaire
 * des Entreprises masquent les
 * informations personnelles d'un
 * entrepreneur individuel.
 *
 * L'API peut alors retourner :
 *
 * [NON-DIFFUSIBLE]
 *
 * ou des valeurs mixtes comme :
 *
 * [NON-DIFFUSIBLE] SAINT-CERE
 *
 * On supprime uniquement le marqueur
 * afin de conserver une éventuelle
 * information réellement exploitable.
 */
function cleanLegalValue(
  value: unknown
): string | null {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const cleaned =
    value
      .replace(
        /\[\s*NON[-\s]?DIFFUSIBLE\s*\]/gi,
        " "
      )
      .replace(
        /\bNON[-\s]?DIFFUSIBLE\b/gi,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .replace(
        /^[\s,;|—–-]+/,
        ""
      )
      .replace(
        /[\s,;|—–-]+$/,
        ""
      )
      .trim();

  return cleaned ||
    null;
}

function addValue(
  target: LegalDataUpdate,
  key:
    | "siren"
    | "siret"
    | "vat_number"
    | "legal_name"
    | "legal_form"
    | "address"
    | "address_line_2"
    | "postal_code"
    | "city"
    | "ape_code"
    | "ape_label"
    | "creation_date"
    | "employee_range",
  value: unknown
) {
  const normalized =
    cleanLegalValue(
      value
    );

  /*
   * Important :
   *
   * Une valeur vide ou masquée
   * n'est PAS envoyée à Supabase.
   *
   * Elle ne peut donc plus écraser
   * une information déjà présente
   * dans la fiche entreprise.
   */
  if (
    normalized
  ) {
    target[key] =
      normalized;
  }
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

    /*
     * Vérification préalable :
     * on s'assure que la fiche existe
     * avant de préparer l'import.
     */
    const {
      data:
        existingCompany,
      error:
        existingCompanyError,
    } = await supabaseAdmin
      .from(
        "companies"
      )
      .select(
        `
          id,
          name,
          legal_name,
          address,
          address_line_2,
          postal_code,
          city
        `
      )
      .eq(
        "id",
        id
      )
      .maybeSingle();

    if (
      existingCompanyError
    ) {
      throw existingCompanyError;
    }

    if (
      !existingCompany
    ) {
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

    const legalData:
      LegalDataUpdate = {
        legal_data_updated_at:
          new Date()
            .toISOString(),
      };

    addValue(
      legalData,
      "siren",
      body.siren
    );

    addValue(
      legalData,
      "siret",
      body.siret
    );

    addValue(
      legalData,
      "vat_number",
      body.vat_number
    );

    addValue(
      legalData,
      "legal_name",
      body.legal_name
    );

    addValue(
      legalData,
      "legal_form",
      body.legal_form
    );

    addValue(
      legalData,
      "address",
      body.address
    );

    addValue(
      legalData,
      "address_line_2",
      body.address_line_2
    );

    addValue(
      legalData,
      "postal_code",
      body.postal_code
    );

    addValue(
      legalData,
      "city",
      body.city
    );

    addValue(
      legalData,
      "ape_code",
      body.ape_code
    );

    addValue(
      legalData,
      "ape_label",
      body.ape_label
    );

    addValue(
      legalData,
      "creation_date",
      body.creation_date
    );

    addValue(
      legalData,
      "employee_range",
      body.employee_range
    );

    const {
      data,
      error,
    } = await supabaseAdmin
      .from(
        "companies"
      )
      .update(
        legalData
      )
      .eq(
        "id",
        id
      )
      .select(
        `
          id,
          name,
          legal_name,
          siren,
          siret,
          vat_number,
          legal_form,
          address,
          address_line_2,
          postal_code,
          city,
          ape_code,
          ape_label,
          creation_date,
          employee_range,
          legal_data_updated_at
        `
      )
      .maybeSingle();

    if (
      error
    ) {
      throw error;
    }

    if (
      !data
    ) {
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

      company:
        data,
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