import {
  NextResponse,
} from "next/server";

import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

import {
  getZohoContact,
} from "@/lib/zoho-books";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

type ImportZohoRequestBody = {
  contactId?: unknown;
};

type ZohoBillingAddress = {
  address?: string;
  street2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
};

type ZohoCustomField = {
  customfield_id?: string;
  index?: number;

  label?: string;
  api_name?: string;

  value?: unknown;
  value_formatted?: unknown;
};

type ZohoContactWithDetails = Awaited<
  ReturnType<
    typeof getZohoContact
  >
> & {
  billing_address?:
    ZohoBillingAddress;

  custom_fields?:
    ZohoCustomField[];

  [key: string]: unknown;
};

function optionalString(
  value: unknown
): string | null {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const trimmed =
    value.trim();

  return trimmed ||
    null;
}

function normalizeDigits(
  value: unknown
): string | null {
  if (
    typeof value !==
      "string" &&
    typeof value !==
      "number"
  ) {
    return null;
  }

  const digits =
    String(value).replace(
      /\D/g,
      ""
    );

  return digits ||
    null;
}

function normalizeSiret(
  value: unknown
): string | null {
  const digits =
    normalizeDigits(
      value
    );

  if (
    !digits ||
    digits.length !==
      14
  ) {
    return null;
  }

  return digits;
}

function normalizeFieldName(
  value: unknown
): string {
  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  return value
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9]/g,
      ""
    );
}

function getSiretFromCustomFields(
  customFields:
    ZohoCustomField[] | undefined
): string | null {
  if (
    !Array.isArray(
      customFields
    )
  ) {
    return null;
  }

  for (
    const field of
    customFields
  ) {
    const label =
      normalizeFieldName(
        field.label
      );

    const apiName =
      normalizeFieldName(
        field.api_name
      );

    const isSiretField =
      label.includes(
        "siret"
      ) ||
      apiName.includes(
        "siret"
      );

    if (
      !isSiretField
    ) {
      continue;
    }

    const fromValue =
      normalizeSiret(
        field.value
      );

    if (
      fromValue
    ) {
      return fromValue;
    }

    const fromFormattedValue =
      normalizeSiret(
        field.value_formatted
      );

    if (
      fromFormattedValue
    ) {
      return fromFormattedValue;
    }
  }

  return null;
}

function getSiretFromFlatContactFields(
  contact:
    ZohoContactWithDetails
): string | null {
  for (
    const [
      key,
      value,
    ] of Object.entries(
      contact
    )
  ) {
    const normalizedKey =
      normalizeFieldName(
        key
      );

    if (
      !normalizedKey.includes(
        "siret"
      )
    ) {
      continue;
    }

    const normalizedSiret =
      normalizeSiret(
        value
      );

    if (
      normalizedSiret
    ) {
      return normalizedSiret;
    }
  }

  return null;
}

function getZohoSiret(
  contact:
    ZohoContactWithDetails
): string | null {
  /*
   * 1. Cas normal documenté Zoho :
   * custom_fields avec label/value.
   */
  const customFieldSiret =
    getSiretFromCustomFields(
      contact.custom_fields
    );

  if (
    customFieldSiret
  ) {
    return customFieldSiret;
  }

  /*
   * 2. Sécurité :
   * certaines réponses Zoho peuvent
   * également exposer des propriétés
   * dérivées de l'API name :
   * cf_siret, cf_siret_unformatted, etc.
   */
  const flatFieldSiret =
    getSiretFromFlatContactFields(
      contact
    );

  if (
    flatFieldSiret
  ) {
    return flatFieldSiret;
  }

  return null;
}

function getSirenFromSiret(
  siret: string | null
): string | null {
  if (
    !siret ||
    siret.length !== 14
  ) {
    return null;
  }

  return siret.slice(
    0,
    9
  );
}

function getCustomFieldDebugInfo(
  contact:
    ZohoContactWithDetails
) {
  return (
    contact.custom_fields ??
    []
  ).map(
    (field) => ({
      label:
        field.label ??
        null,

      apiName:
        field.api_name ??
        null,

      value:
        field.value ??
        null,

      formattedValue:
        field.value_formatted ??
        null,
    })
  );
}

export async function POST(
  request: Request
) {
  try {
    let body:
      | ImportZohoRequestBody
      | null = null;

    try {
      body =
        (await request.json()) as ImportZohoRequestBody;
    } catch {
      body =
        null;
    }

    const contactId =
      typeof body
        ?.contactId ===
      "string"
        ? body.contactId.trim()
        : "";

    if (
      !contactId
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Identifiant du client Zoho manquant.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data:
        existingCompany,
      error:
        existingError,
    } = await supabaseAdmin
      .from(
        "companies"
      )
      .select(
        `
          id,
          name,
          email,
          is_active,
          zoho_contact_id,
          siren,
          siret,
          vat_number
        `
      )
      .eq(
        "zoho_contact_id",
        contactId
      )
      .maybeSingle();

    if (
      existingError
    ) {
      throw new Error(
        `Impossible de vérifier les entreprises existantes : ${existingError.message}`
      );
    }

    if (
      existingCompany
        ?.is_active
    ) {
      return NextResponse.json(
        {
          success: false,

          companyId:
            existingCompany.id,

          message:
            `Ce client Zoho est déjà lié à l’entreprise « ${existingCompany.name} » dans Office.`,
        },
        {
          status: 409,
        }
      );
    }

    const rawContact =
      await getZohoContact(
        contactId
      );

    const contact =
      rawContact as ZohoContactWithDetails;

    /*
     * Diagnostic temporaire utile :
     * cela nous montrera dans les logs
     * Vercel exactement quels champs
     * personnalisés Zoho sont renvoyés.
     */
    console.info(
      "Données Zoho contact détaillées",
      {
        contactId,

        contactName:
          contact.contact_name,

        customFields:
          getCustomFieldDebugInfo(
            contact
          ),

        siretLikeProperties:
          Object.entries(
            contact
          )
            .filter(
              ([key]) =>
                normalizeFieldName(
                  key
                ).includes(
                  "siret"
                )
            )
            .map(
              (
                [
                  key,
                  value,
                ]
              ) => ({
                key,
                value,
              })
            ),
      }
    );

    const companyName =
      contact.company_name
        ?.trim() ||
      contact.contact_name
        ?.trim();

    if (
      !companyName
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Le contact Zoho ne possède aucun nom exploitable.",
        },
        {
          status: 400,
        }
      );
    }

    const email =
      optionalString(
        contact.email
      );

    const phone =
      optionalString(
        contact.phone
      ) ||
      optionalString(
        contact.mobile
      );

    const customerNumber =
      optionalString(
        contact.contact_number
      );

    const billingAddress =
      contact.billing_address;

    const address =
      optionalString(
        billingAddress
          ?.address
      );

    const addressLine2 =
      optionalString(
        billingAddress
          ?.street2
      );

    const postalCode =
      optionalString(
        billingAddress
          ?.zip
      );

    const city =
      optionalString(
        billingAddress
          ?.city
      );

    const state =
      optionalString(
        billingAddress
          ?.state
      );

    const country =
      optionalString(
        billingAddress
          ?.country
      );

    const zohoSiret =
      getZohoSiret(
        contact
      );

    const zohoSiren =
      getSirenFromSiret(
        zohoSiret
      );

    console.info(
      "SIRET Zoho détecté",
      {
        contactId,

        zohoSiret,

        zohoSiren,

        previousSiret:
          existingCompany
            ?.siret ??
          null,

        previousSiren:
          existingCompany
            ?.siren ??
          null,
      }
    );

    /*
     * Ancienne fiche inactive :
     * on la restaure et on actualise
     * les données depuis Zoho.
     */
    if (
      existingCompany &&
      !existingCompany.is_active
    ) {
      const updatePayload = {
        name:
          companyName,

        legal_name:
          optionalString(
            contact.company_name
          ),

        email,

        phone,

        address,

        address_line_2:
          addressLine2,

        postal_code:
          postalCode,

        city,

        state,

        country,

        customer_number:
          customerNumber,

        zoho_contact_id:
          contact.contact_id,

        /*
         * Zoho devient la référence
         * lorsque le SIRET est bien
         * détecté.
         */
        siret:
          zohoSiret ??
          existingCompany.siret,

        siren:
          zohoSiren ??
          existingCompany.siren,

        vat_number:
          existingCompany.vat_number,

        is_active:
          true,

        relationship_status:
          "client",

        pipeline_stage:
          "client",
      };

      const {
        data:
          restoredCompany,
        error:
          restoreError,
      } = await supabaseAdmin
        .from(
          "companies"
        )
        .update(
          updatePayload
        )
        .eq(
          "id",
          existingCompany.id
        )
        .select(
          `
            id,
            name,
            zoho_contact_id,
            siren,
            siret
          `
        )
        .single();

      if (
        restoreError ||
        !restoredCompany
      ) {
        throw new Error(
          restoreError
            ? `Impossible de restaurer le client dans Office : ${restoreError.message}`
            : "Impossible de restaurer le client dans Office."
        );
      }

      console.info(
        "Client Zoho réactivé dans Office",
        {
          companyId:
            restoredCompany.id,

          companyName:
            restoredCompany.name,

          zohoContactId:
            restoredCompany.zoho_contact_id,

          siretImported:
            restoredCompany.siret,

          sirenImported:
            restoredCompany.siren,

          zohoSiretDetected:
            zohoSiret,

          addressImported:
            Boolean(
              address ||
              postalCode ||
              city
            ),
        }
      );

      return NextResponse.json({
        success: true,

        restored:
          true,

        message:
          zohoSiret
            ? "Client restauré et SIRET actualisé depuis Zoho Books."
            : "Client restauré depuis Zoho Books. Aucun nouveau SIRET n’a été détecté dans la réponse Zoho.",

        companyId:
          restoredCompany.id,

        legalData: {
          siret:
            restoredCompany.siret,

          siren:
            restoredCompany.siren,

          zohoSiretDetected:
            zohoSiret,
        },
      });
    }

    /*
     * Nouvelle fiche :
     * vérification d'un éventuel
     * doublon actif par email.
     */
    if (
      email
    ) {
      const {
        data:
          possibleDuplicates,
        error:
          duplicateError,
      } = await supabaseAdmin
        .from(
          "companies"
        )
        .select(
          `
            id,
            name,
            email,
            is_active,
            zoho_contact_id
          `
        )
        .ilike(
          "email",
          email
        );

      if (
        duplicateError
      ) {
        throw new Error(
          `Impossible de vérifier les doublons : ${duplicateError.message}`
        );
      }

      const activeDuplicate =
        (
          possibleDuplicates ??
          []
        ).find(
          (company) =>
            company.is_active
        );

      if (
        activeDuplicate
      ) {
        return NextResponse.json(
          {
            success: false,

            companyId:
              activeDuplicate.id,

            message:
              `Une entreprise Office active utilise déjà l’adresse ${email}. Vérifie cette fiche avant d’importer le client Zoho.`,
          },
          {
            status: 409,
          }
        );
      }
    }

    const {
      data:
        createdCompany,
      error:
        createError,
    } = await supabaseAdmin
      .from(
        "companies"
      )
      .insert({
        name:
          companyName,

        legal_name:
          optionalString(
            contact.company_name
          ),

        email,

        phone,

        address,

        address_line_2:
          addressLine2,

        postal_code:
          postalCode,

        city,

        state,

        country,

        customer_number:
          customerNumber,

        zoho_contact_id:
          contact.contact_id,

        siren:
          zohoSiren,

        siret:
          zohoSiret,

        is_active:
          true,

        relationship_status:
          "client",

        pipeline_stage:
          "client",
      })
      .select(
        `
          id,
          name,
          zoho_contact_id,
          siren,
          siret
        `
      )
      .single();

    if (
      createError ||
      !createdCompany
    ) {
      throw new Error(
        createError
          ? `Impossible de restaurer le client dans Office : ${createError.message}`
          : "Impossible de restaurer le client dans Office."
      );
    }

    console.info(
      "Client Zoho restauré dans Office",
      {
        companyId:
          createdCompany.id,

        companyName:
          createdCompany.name,

        zohoContactId:
          createdCompany.zoho_contact_id,

        siretImported:
          createdCompany.siret,

        sirenImported:
          createdCompany.siren,

        zohoSiretDetected:
          zohoSiret,

        addressImported:
          Boolean(
            address ||
            postalCode ||
            city
          ),
      }
    );

    return NextResponse.json({
      success: true,

      restored:
        false,

      message:
        zohoSiret
          ? "Client importé avec son SIRET Zoho."
          : "Client importé. Aucun SIRET n’a été détecté dans la réponse Zoho.",

      companyId:
        createdCompany.id,

      legalData: {
        siret:
          createdCompany.siret,

        siren:
          createdCompany.siren,

        zohoSiretDetected:
          zohoSiret,
      },
    });
  } catch (error) {
    console.error(
      "Erreur restauration client Zoho",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Une erreur est survenue pendant la restauration du client.",
      },
      {
        status: 500,
      }
    );
  }
}