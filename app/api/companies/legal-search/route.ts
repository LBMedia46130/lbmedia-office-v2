import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API_URL =
  "https://recherche-entreprises.api.gouv.fr/search";

const LEGAL_FORM_LABELS: Record<string, string> = {
  "1000": "Entrepreneur individuel",
  "1100": "Artisan-commerçant",
  "1200": "Commerçant",
  "1300": "Artisan",
  "5410": "SARL nationale",
  "5485":
    "Société d'exercice libéral à responsabilité limitée",
  "5498": "SARL unipersonnelle",
  "5499": "Société à responsabilité limitée (SARL)",
  "5710": "SAS",
  "5720":
    "Société par actions simplifiée à associé unique (SASU)",
  "6540": "Société civile immobilière (SCI)",
};

const APE_LABELS: Record<string, string> = {
  "73.12Z": "Régie publicitaire de médias",
};

function cleanValue(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function joinParts(
  parts: Array<string | undefined | null>
) {
  return parts
    .map((part) => cleanValue(part))
    .filter(Boolean)
    .join(" ");
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

function getVatNumber(
  company: any,
  siren: string
) {
  const vatList =
    Array.isArray(company.tva)
      ? company.tva
      : [];

  const officialVat =
    vatList
      .map((value: unknown) =>
        cleanValue(value)
      )
      .find(Boolean);

  if (officialVat) {
    return officialVat;
  }

  return buildVatNumber(siren);
}

function buildStreetAddress(
  siege: any
) {
  const streetLine =
    joinParts([
      siege.numero_voie,
      siege.indice_repetition,
      siege.type_voie,
      siege.libelle_voie,
    ]);

  if (streetLine) {
    return streetLine;
  }

  const fullAddress =
    cleanValue(
      siege.adresse
    );

  const postalCode =
    cleanValue(
      siege.code_postal
    );

  const city =
    cleanValue(
      siege.libelle_commune
    );

  let fallback =
    fullAddress;

  if (
    postalCode &&
    city
  ) {
    const suffix =
      `${postalCode} ${city}`;

    if (
      fallback
        .toUpperCase()
        .endsWith(
          suffix.toUpperCase()
        )
    ) {
      fallback =
        fallback
          .slice(
            0,
            -suffix.length
          )
          .trim();
    }
  }

  return fallback;
}

function getLegalForm(
  company: any
) {
  const apiLabel =
    cleanValue(
      company.libelle_nature_juridique
    );

  if (apiLabel) {
    return apiLabel;
  }

  const code =
    cleanValue(
      company.nature_juridique
    );

  if (!code) {
    return "";
  }

  return (
    LEGAL_FORM_LABELS[code] ||
    code
  );
}

function getApeLabel(
  company: any,
  siege: any,
  apeCode: string
) {
  const apiLabel =
    cleanValue(
      company.libelle_activite_principale
    ) ||
    cleanValue(
      siege.libelle_activite_principale
    );

  if (apiLabel) {
    return apiLabel;
  }

  return (
    APE_LABELS[apeCode] ||
    ""
  );
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
      Array.isArray(
        data.results
      )
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
              company.nom_raison_sociale
            ) ||
            cleanValue(
              company.nom_complet
            );

          const address =
            buildStreetAddress(
              siege
            );

          const addressLine2 =
            cleanValue(
              siege.complement_adresse
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
            ) ||
            cleanValue(
              siege.activite_principale
            );

          const apeLabel =
            getApeLabel(
              company,
              siege,
              apeCode
            );

          const legalForm =
            getLegalForm(
              company
            );

          const creationDate =
            cleanValue(
              company.date_creation
            );

          return {
            siren,
            siret,

            vat_number:
              getVatNumber(
                company,
                siren
              ),

            legal_name:
              legalName,

            legal_form:
              legalForm,

            address,

            address_line_2:
              addressLine2,

            postal_code:
              resultPostalCode,

            city,

            ape_code:
              apeCode,

            ape_label:
              apeLabel,

            creation_date:
              creationDate,
          };
        }
      );

    return NextResponse.json({
      success: true,

      total:
        data.total_results ??
        companies.length,

      results:
        companies,
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