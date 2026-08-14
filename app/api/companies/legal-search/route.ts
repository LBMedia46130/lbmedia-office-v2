import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API_URL =
  "https://recherche-entreprises.api.gouv.fr/search";

function cleanValue(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function buildVatNumber(siren: string) {
  const normalizedSiren =
    siren.replace(/\D/g, "");

  if (normalizedSiren.length !== 9) {
    return "";
  }

  const numericSiren =
    Number(normalizedSiren);

  if (!Number.isFinite(numericSiren)) {
    return "";
  }

  const key =
    (12 + 3 * (numericSiren % 97)) % 97;

  return `FR${String(key).padStart(
    2,
    "0"
  )}${normalizedSiren}`;
}

export async function GET(
  request: NextRequest
) {
  const searchParams =
    request.nextUrl.searchParams;

  const query =
    cleanValue(
      searchParams.get("q")
    );

  const postalCode =
    cleanValue(
      searchParams.get(
        "postal_code"
      )
    );

  if (!query) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Le terme de recherche est obligatoire.",
      },
      {
        status: 400,
      }
    );
  }

  try {
    const params =
      new URLSearchParams({
        q: query,
        per_page: "10",
      });

    const numericQuery =
      query.replace(/\D/g, "");

    const isDirectSearch =
      numericQuery.length === 9 ||
      numericQuery.length === 14;

    if (
      postalCode &&
      !isDirectSearch
    ) {
      params.set(
        "code_postal",
        postalCode
      );
    }

    const response =
      await fetch(
        `${API_URL}?${params.toString()}`,
        {
          headers: {
            Accept:
              "application/json",
          },
          cache: "no-store",
        }
      );

    if (!response.ok) {
      throw new Error(
        `API Recherche d'entreprises : ${response.status}`
      );
    }

    const data =
      await response.json();

    const results =
      Array.isArray(data.results)
        ? data.results
        : [];

    const companies =
      results.map(
        (company: any) => {
          const siege =
            company.siege ?? {};

          const siren =
            cleanValue(
              company.siren
            );

          const siret =
            cleanValue(
              siege.siret
            );

          const legalName =
            cleanValue(
              company.nom_complet
            ) ||
            cleanValue(
              company.nom_raison_sociale
            );

          const address =
            cleanValue(
              siege.adresse
            );

          const city =
            cleanValue(
              siege.libelle_commune
            );

          const resultPostalCode =
            cleanValue(
              siege.code_postal
            );

          const apeCode =
            cleanValue(
              company.activite_principale
            );

          const apeLabel =
            cleanValue(
              company.libelle_activite_principale
            );

          const legalForm =
            cleanValue(
              company.nature_juridique
            ) ||
            cleanValue(
              company.libelle_nature_juridique
            );

          const creationDate =
            cleanValue(
              company.date_creation
            );

          const employeeRange =
            cleanValue(
              company.tranche_effectif_salarie
            );

          return {
            siren,
            siret,
            vat_number:
              buildVatNumber(
                siren
              ),
            legal_name:
              legalName,
            legal_form:
              legalForm,
            address,
            postal_code:
              resultPostalCode,
            city,
            ape_code:
              apeCode,
            ape_label:
              apeLabel,
            creation_date:
              creationDate,
            employee_range:
              employeeRange,
          };
        }
      );

    return NextResponse.json({
      success: true,
      total:
        data.total_results ??
        companies.length,
      results: companies,
    });
  } catch (error) {
    console.error(
      "Erreur legal-search:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Impossible de récupérer les données légales de l'entreprise.",
      },
      {
        status: 500,
      }
    );
  }
}