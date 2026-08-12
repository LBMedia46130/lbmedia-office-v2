import { NextResponse } from "next/server";

import * as XLSX from "xlsx";

import { supabaseAdmin } from "@/lib/supabase-admin";

type ZohoRow = {
  CONTACT_ID?: unknown;
  Nom?: unknown;
  "Nom de l’entreprise"?: unknown;
  "E-mail"?: unknown;
  "Comptes débiteurs"?: unknown;
};

type ExistingCompany = {
  name: string;
  email: string | null;
};

function cleanValue(
  value: unknown
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();
}

function normalizeText(
  value: string
) {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLocaleLowerCase("fr")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeEmail(
  value: string
) {
  return value
    .trim()
    .toLocaleLowerCase("fr");
}

export async function POST(
  request: Request
) {
  try {
    const formData =
      await request.formData();

    const file =
      formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Aucun fichier n’a été fourni.",
        },
        {
          status: 400,
        }
      );
    }

    const fileName =
      file.name.toLowerCase();

    if (
      !fileName.endsWith(".xlsx") &&
      !fileName.endsWith(".xls")
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le fichier doit être au format Excel .xlsx ou .xls.",
        },
        {
          status: 400,
        }
      );
    }

    const buffer =
      await file.arrayBuffer();

    const workbook =
      XLSX.read(buffer, {
        type: "array",
      });

    const firstSheetName =
      workbook.SheetNames[0];

    if (!firstSheetName) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le fichier Excel ne contient aucune feuille.",
        },
        {
          status: 400,
        }
      );
    }

    const worksheet =
      workbook.Sheets[
        firstSheetName
      ];

    const rows =
      XLSX.utils.sheet_to_json<ZohoRow>(
        worksheet,
        {
          defval: "",
        }
      );

    if (rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le fichier ne contient aucun client à importer.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: existingData,
      error: existingError,
    } = await supabaseAdmin
      .from("companies")
      .select("name, email");

    if (existingError) {
      throw new Error(
        `Impossible de vérifier les entreprises existantes : ${existingError.message}`
      );
    }

    const existingCompanies =
      (existingData ??
        []) as ExistingCompany[];

    const knownNames =
      new Set(
        existingCompanies.map(
          (company) =>
            normalizeText(
              company.name
            )
        )
      );

    const knownEmails =
      new Set(
        existingCompanies
          .map((company) =>
            company.email
              ? normalizeEmail(
                  company.email
                )
              : ""
          )
          .filter(Boolean)
      );

    const newCompanies: {
      name: string;
      email: string | null;
      is_active: boolean;
      relationship_status:
        | "client";
      pipeline_stage:
        | "client";
    }[] = [];

    let skipped = 0;
    let invalid = 0;

    for (const row of rows) {
      const companyName =
        cleanValue(
          row[
            "Nom de l’entreprise"
          ]
        ) ||
        cleanValue(row.Nom);

      const email =
        cleanValue(
          row["E-mail"]
        );

      if (!companyName) {
        invalid += 1;
        continue;
      }

      const normalizedName =
        normalizeText(
          companyName
        );

      const normalizedEmail =
        email
          ? normalizeEmail(email)
          : "";

      const duplicateName =
        knownNames.has(
          normalizedName
        );

      const duplicateEmail =
        normalizedEmail
          ? knownEmails.has(
              normalizedEmail
            )
          : false;

      if (
        duplicateName ||
        duplicateEmail
      ) {
        skipped += 1;
        continue;
      }

      newCompanies.push({
        name: companyName,
        email:
          email || null,
        is_active: true,
        relationship_status:
          "client",
        pipeline_stage:
          "client",
      });

      knownNames.add(
        normalizedName
      );

      if (normalizedEmail) {
        knownEmails.add(
          normalizedEmail
        );
      }
    }

    if (
      newCompanies.length > 0
    ) {
      const { error: insertError } =
        await supabaseAdmin
          .from("companies")
          .insert(
            newCompanies
          );

      if (insertError) {
        throw new Error(
          `Impossible d’importer les clients : ${insertError.message}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      message:
        "Import terminé.",
      created:
        newCompanies.length,
      skipped,
      invalid,
    });
  } catch (error) {
    console.error(
      "Companies import error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Impossible d’importer les clients.",
      },
      {
        status: 500,
      }
    );
  }
}