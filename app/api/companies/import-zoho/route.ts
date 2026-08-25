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
  label?: string;
  api_name?: string;
  value?: unknown;
};

type ZohoContactWithAddress = Awaited<
  ReturnType<
    typeof getZohoContact
  >
> & {
  billing_address?:
    ZohoBillingAddress;

  custom_fields?:
    ZohoCustomField[];
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

function getCustomFieldValue(
  customFields:
    ZohoCustomField[] | undefined,
  names: string[]
): unknown {
  if (
    !Array.isArray(
      customFields
    )
  ) {
    return null;
  }

  const normalizedNames =
    names.map(
      (name) =>
        name
          .trim()
          .toLocaleLowerCase(
            "fr-FR"
          )
          .replace(
            /[\s_-]+/g,
            ""
          )
    );

  for (
    const field of
    customFields
  ) {
    const candidates =
      [
        field.label,
        field.api_name,
      ]
        .filter(
          (
            value
          ): value is string =>
            typeof value ===
            "string"
        )
        .map(
          (value) =>
            value
              .trim()
              .toLocaleLowerCase(
                "fr-FR"
              )
              .replace(
                /[\s_-]+/g,
                ""
              )
        );

    const matches =
      candidates.some(
        (candidate) =>
          normalizedNames.includes(
            candidate
          )
      );

    if (
      matches
    ) {
      return field.value;
    }
  }

  return null;
}

function getZohoSiret(
  contact:
    ZohoContactWithAddress
): string | null {
  const customFieldValue =
    getCustomFieldValue(
      contact.custom_fields,
      [
        "Siret",
        "SIRET",
        "CF.Siret",
        "CF Siret",
      ]
    );

  return normalizeSiret(
    customFieldValue
  );
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

    /*
     * Recherche d'une éventuelle
     * fiche Office déjà liée au
     * contact Zoho.
     */
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
      rawContact as ZohoContactWithAddress;

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

    /*
     * Données légales Zoho.
     *
     * Le SIRET est stocké dans
     * un champ personnalisé Zoho
     * ("Siret" / "CF.Siret").
     */
    const zohoSiret =
      getZohoSiret(
        contact
      );

    const zohoSiren =
      getSirenFromSiret(
        zohoSiret
      );

    /*
     * Si une ancienne fiche inactive
     * existe, on la restaure et on
     * actualise ses données depuis
     * Zoho Books.
     */
    if (
      existingCompany &&
      !existingCompany.is_active
    ) {
      const {
        data:
          restoredCompany,
        error:
          restoreError,
      } = await supabaseAdmin
        .from(
          "companies"
        )
        .update({
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
           * Si Zoho renvoie un nouveau
           * SIRET, il devient la valeur
           * de référence.
           *
           * Sinon on conserve la valeur
           * déjà présente dans Office.
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
        })
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
          "Client restauré et actualisé depuis Zoho Books.",

        companyId:
          restoredCompany.id,
      });
    }

    /*
     * Pour une création réelle,
     * une fiche Office active avec
     * la même adresse email bloque
     * l'import.
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
        "Client restauré dans LBMedia Office.",

      companyId:
        createdCompany.id,
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