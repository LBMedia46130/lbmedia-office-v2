import { NextResponse } from "next/server";

import * as XLSX from "xlsx";

import { supabaseAdmin } from "@/lib/supabase-admin";

type ZohoRow = Record<
  string,
  unknown
>;

type ExistingCompany = {
  id: string;
  name: string;
  email: string | null;
  customer_number: string | null;
  zoho_contact_id: string | null;
};

type CompanyPayload = {
  id?: string;

  name: string;
  legal_name: string | null;

  email: string | null;
  phone: string | null;
  website: string | null;

  address: string | null;
  address_line_2: string | null;
  postal_code: string | null;
  city: string | null;
  state: string | null;
  country: string | null;

  customer_number: string | null;
  siret: string | null;
  notes: string | null;
  zoho_contact_id: string | null;

  is_active: boolean;
  relationship_status: "client";
  pipeline_stage: "client";
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

function nullableValue(
  value: unknown
): string | null {
  const cleaned =
    cleanValue(value);

  return cleaned || null;
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

function getSiret(
  row: ZohoRow
) {
  return (
    nullableValue(row["CF.Siret"]) ??
    nullableValue(row["SIRET"]) ??
    null
  );
}

function isActiveStatus(
  value: unknown
) {
  return (
    normalizeText(
      cleanValue(value)
    ) === "active"
  );
}

function hasRealPersonName(
  firstName: string,
  lastName: string
) {
  return Boolean(
    firstName.trim() ||
      lastName.trim()
  );
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
      .select(
        "id, name, email, customer_number, zoho_contact_id"
      );

    if (existingError) {
      throw new Error(
        `Impossible de vérifier les entreprises existantes : ${existingError.message}`
      );
    }

    const existingCompanies =
      (existingData ??
        []) as ExistingCompany[];

    const byCustomerNumber =
      new Map<
        string,
        ExistingCompany
      >();

    const byZohoId =
      new Map<
        string,
        ExistingCompany
      >();

    const byName =
      new Map<
        string,
        ExistingCompany
      >();

    const byEmail =
      new Map<
        string,
        ExistingCompany
      >();

    for (
      const company of
      existingCompanies
    ) {
      if (
        company.customer_number
      ) {
        byCustomerNumber.set(
          company.customer_number,
          company
        );
      }

      if (
        company.zoho_contact_id
      ) {
        byZohoId.set(
          company.zoho_contact_id,
          company
        );
      }

      byName.set(
        normalizeText(
          company.name
        ),
        company
      );

      if (company.email) {
        byEmail.set(
          normalizeEmail(
            company.email
          ),
          company
        );
      }
    }

    const companiesToUpdate:
      CompanyPayload[] = [];

    const companiesToInsert:
      CompanyPayload[] = [];

    let invalid = 0;

    for (const row of rows) {
      const companyName =
        cleanValue(
          row["Company Name"]
        ) ||
        cleanValue(
          row["Display Name"]
        ) ||
        cleanValue(
          row["Contact Name"]
        );

      if (!companyName) {
        invalid += 1;
        continue;
      }

      const customerNumber =
        cleanValue(
          row["Customer Number"]
        );

      const zohoContactId =
        cleanValue(
          row["Contact ID"]
        );

      const email =
        cleanValue(
          row["EmailID"]
        );

      const normalizedName =
        normalizeText(
          companyName
        );

      const normalizedEmail =
        email
          ? normalizeEmail(
              email
            )
          : "";

      const existing =
        (customerNumber
          ? byCustomerNumber.get(
              customerNumber
            )
          : undefined) ??
        (zohoContactId
          ? byZohoId.get(
              zohoContactId
            )
          : undefined) ??
        byName.get(
          normalizedName
        ) ??
        (normalizedEmail
          ? byEmail.get(
              normalizedEmail
            )
          : undefined);

      const payload:
        CompanyPayload = {
        name: companyName,

        legal_name: null,

        email:
          email || null,

        phone:
          nullableValue(
            row["Billing Phone"]
          ) ??
          nullableValue(
            row["Phone"]
          ),

        website:
          nullableValue(
            row["Website"]
          ),

        address:
          nullableValue(
            row["Billing Address"]
          ),

        address_line_2:
          nullableValue(
            row["Billing Street2"]
          ),

        postal_code:
          nullableValue(
            row["Billing Code"]
          ),

        city:
          nullableValue(
            row["Billing City"]
          ),

        state:
          nullableValue(
            row["Billing State"]
          ),

        country:
          nullableValue(
            row["Billing Country"]
          ),

        customer_number:
          customerNumber ||
          null,

        siret:
          getSiret(row),

        notes:
          nullableValue(
            row["Notes"]
          ),

        zoho_contact_id:
          zohoContactId ||
          null,

        is_active:
          isActiveStatus(
            row["Status"]
          ),

        relationship_status:
          "client",

        pipeline_stage:
          "client",
      };

      if (existing) {
        companiesToUpdate.push({
          ...payload,
          id: existing.id,
        });
      } else {
        companiesToInsert.push(
          payload
        );
      }
    }

    /*
     * Mise à jour en bloc des sociétés
     * déjà connues.
     */
    if (
      companiesToUpdate.length >
      0
    ) {
      const {
        error: updateError,
      } = await supabaseAdmin
        .from("companies")
        .upsert(
          companiesToUpdate,
          {
            onConflict: "id",
          }
        );

      if (updateError) {
        throw new Error(
          `Impossible de mettre à jour les clients existants : ${updateError.message}`
        );
      }
    }

    /*
     * Ajout des nouveaux clients.
     */
    if (
      companiesToInsert.length >
      0
    ) {
      const {
        error: insertError,
      } = await supabaseAdmin
        .from("companies")
        .insert(
          companiesToInsert
        );

      if (insertError) {
        throw new Error(
          `Impossible d’ajouter les nouveaux clients : ${insertError.message}`
        );
      }
    }

    /*
     * On recharge les entreprises après
     * synchronisation pour rattacher les
     * contacts principaux.
     */
    const {
      data: syncedCompanies,
      error: syncReadError,
    } = await supabaseAdmin
      .from("companies")
      .select(
        "id, name, email, customer_number, zoho_contact_id"
      );

    if (syncReadError) {
      throw new Error(
        `Impossible de relire les entreprises synchronisées : ${syncReadError.message}`
      );
    }

    const syncedByCustomer =
      new Map<
        string,
        ExistingCompany
      >();

    const syncedByName =
      new Map<
        string,
        ExistingCompany
      >();

    for (
      const company of
      (syncedCompanies ??
        []) as ExistingCompany[]
    ) {
      if (
        company.customer_number
      ) {
        syncedByCustomer.set(
          company.customer_number,
          company
        );
      }

      syncedByName.set(
        normalizeText(
          company.name
        ),
        company
      );
    }

    let contactsCreated = 0;
    let contactsUpdated = 0;

    for (const row of rows) {
      const firstName =
        cleanValue(
          row["First Name"]
        );

      const lastName =
        cleanValue(
          row["Last Name"]
        );

      if (
        !hasRealPersonName(
          firstName,
          lastName
        )
      ) {
        continue;
      }

      const companyName =
        cleanValue(
          row["Company Name"]
        ) ||
        cleanValue(
          row["Display Name"]
        );

      const customerNumber =
        cleanValue(
          row["Customer Number"]
        );

      const company =
        (customerNumber
          ? syncedByCustomer.get(
              customerNumber
            )
          : undefined) ??
        syncedByName.get(
          normalizeText(
            companyName
          )
        );

      if (!company) {
        continue;
      }

      const primaryContactId =
        cleanValue(
          row[
            "Primary Contact ID"
          ]
        ) ||
        cleanValue(
          row["Contact ID"]
        );

      let existingContact:
        | {
            id: string;
          }
        | null = null;

      if (primaryContactId) {
        const {
          data,
          error,
        } = await supabaseAdmin
          .from(
            "company_contacts"
          )
          .select("id")
          .eq(
            "zoho_contact_id",
            primaryContactId
          )
          .maybeSingle();

        if (error) {
          throw new Error(
            `Impossible de vérifier un contact Zoho : ${error.message}`
          );
        }

        existingContact = data;
      }

      const contactPayload = {
        company_id:
          company.id,

        first_name:
          firstName ||
          "Contact",

        last_name:
          lastName || "",

        job_title:
          nullableValue(
            row["Designation"]
          ),

        email:
          nullableValue(
            row["EmailID"]
          ),

        phone:
          nullableValue(
            row["Phone"]
          ),

        mobile:
          nullableValue(
            row["MobilePhone"]
          ),

        is_primary: true,

        zoho_contact_id:
          primaryContactId ||
          null,
      };

      /*
       * Un seul contact principal
       * par entreprise.
       */
      const {
        error: resetError,
      } = await supabaseAdmin
        .from(
          "company_contacts"
        )
        .update({
          is_primary: false,
        })
        .eq(
          "company_id",
          company.id
        );

      if (resetError) {
        throw new Error(
          `Impossible de préparer le contact principal : ${resetError.message}`
        );
      }

      if (existingContact) {
        const {
          error:
            contactUpdateError,
        } = await supabaseAdmin
          .from(
            "company_contacts"
          )
          .update(
            contactPayload
          )
          .eq(
            "id",
            existingContact.id
          );

        if (
          contactUpdateError
        ) {
          throw new Error(
            `Impossible de mettre à jour un contact : ${contactUpdateError.message}`
          );
        }

        contactsUpdated += 1;
      } else {
        const {
          error:
            contactInsertError,
        } = await supabaseAdmin
          .from(
            "company_contacts"
          )
          .insert(
            contactPayload
          );

        if (
          contactInsertError
        ) {
          throw new Error(
            `Impossible d’ajouter un contact : ${contactInsertError.message}`
          );
        }

        contactsCreated += 1;
      }
    }

    return NextResponse.json({
      success: true,

      message:
        "Synchronisation Zoho terminée.",

      updated:
        companiesToUpdate.length,

      created:
        companiesToInsert.length,

      invalid,

      contacts_created:
        contactsCreated,

      contacts_updated:
        contactsUpdated,
    });
  } catch (error) {
    console.error(
      "Zoho companies sync error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Impossible de synchroniser les clients Zoho.",
      },
      {
        status: 500,
      }
    );
  }
}