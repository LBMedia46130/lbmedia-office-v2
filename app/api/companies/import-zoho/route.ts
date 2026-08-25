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

  custom_field_hash?:
    Record<
      string,
      unknown
    >;

  [key: string]:
    unknown;
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
    String(
      value
    ).replace(
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

function isValidLuhn(
  value: string
): boolean {
  if (
    !/^\d+$/.test(
      value
    )
  ) {
    return false;
  }

  let sum = 0;
  let doubleDigit =
    false;

  for (
    let index =
      value.length -
      1;
    index >= 0;
    index -= 1
  ) {
    let digit =
      Number(
        value[index]
      );

    if (
      doubleDigit
    ) {
      digit *= 2;

      if (
        digit > 9
      ) {
        digit -= 9;
      }
    }

    sum += digit;

    doubleDigit =
      !doubleDigit;
  }

  return (
    sum % 10 ===
    0
  );
}

function isLikelySiret(
  value: unknown
): value is string {
  const siret =
    normalizeSiret(
      value
    );

  if (!siret) {
    return false;
  }

  /*
   * La grande majorité des SIRET
   * suivent l'algorithme de Luhn.
   *
   * On accepte également un numéro
   * de 14 chiffres trouvé dans un
   * champ explicitement nommé SIRET,
   * même si Luhn ne passe pas.
   */
  return isValidLuhn(
    siret
  );
}

function getSiretFromNamedValue(
  key: unknown,
  value: unknown
): string | null {
  const normalizedKey =
    normalizeFieldName(
      key
    );

  if (
    !normalizedKey.includes(
      "siret"
    )
  ) {
    return null;
  }

  return normalizeSiret(
    value
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

  /*
   * Première passe :
   * champ explicitement nommé SIRET.
   */
  for (
    const field of
    customFields
  ) {
    const names =
      [
        field.label,
        field.api_name,
      ];

    const isNamedSiret =
      names.some(
        (name) =>
          normalizeFieldName(
            name
          ).includes(
            "siret"
          )
      );

    if (
      !isNamedSiret
    ) {
      continue;
    }

    const valueSiret =
      normalizeSiret(
        field.value
      );

    if (
      valueSiret
    ) {
      return valueSiret;
    }

    const formattedSiret =
      normalizeSiret(
        field.value_formatted
      );

    if (
      formattedSiret
    ) {
      return formattedSiret;
    }
  }

  /*
   * Deuxième passe :
   * Zoho peut renvoyer le champ
   * personnalisé sans son label
   * exploitable.
   *
   * On recherche alors une valeur
   * de 14 chiffres compatible SIRET.
   */
  for (
    const field of
    customFields
  ) {
    const candidates =
      [
        field.value,
        field.value_formatted,
      ];

    for (
      const candidate of
      candidates
    ) {
      const possibleSiret =
        normalizeSiret(
          candidate
        );

      if (
        possibleSiret &&
        isValidLuhn(
          possibleSiret
        )
      ) {
        return possibleSiret;
      }
    }
  }

  return null;
}

function getSiretFromCustomFieldHash(
  customFieldHash:
    Record<
      string,
      unknown
    > | undefined
): string | null {
  if (
    !customFieldHash ||
    typeof customFieldHash !==
      "object"
  ) {
    return null;
  }

  for (
    const [
      key,
      value,
    ] of Object.entries(
      customFieldHash
    )
  ) {
    const namedSiret =
      getSiretFromNamedValue(
        key,
        value
      );

    if (
      namedSiret
    ) {
      return namedSiret;
    }
  }

  return null;
}

function findSiretRecursively(
  value: unknown,
  depth = 0
): string | null {
  if (
    depth > 5 ||
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (
    Array.isArray(
      value
    )
  ) {
    for (
      const item of
      value
    ) {
      const found =
        findSiretRecursively(
          item,
          depth + 1
        );

      if (
        found
      ) {
        return found;
      }
    }

    return null;
  }

  if (
    typeof value !==
      "object"
  ) {
    return null;
  }

  for (
    const [
      key,
      childValue,
    ] of Object.entries(
      value as Record<
        string,
        unknown
      >
    )
  ) {
    const namedSiret =
      getSiretFromNamedValue(
        key,
        childValue
      );

    if (
      namedSiret
    ) {
      return namedSiret;
    }

    const nested =
      findSiretRecursively(
        childValue,
        depth + 1
      );

    if (
      nested
    ) {
      return nested;
    }
  }

  return null;
}

function getZohoSiret(
  contact:
    ZohoContactWithDetails
): string | null {
  /*
   * 1. Format officiel Zoho :
   * custom_fields.
   */
  const fromCustomFields =
    getSiretFromCustomFields(
      contact.custom_fields
    );

  if (
    fromCustomFields
  ) {
    return fromCustomFields;
  }

  /*
   * 2. Variante fréquemment exposée
   * par les API Zoho.
   */
  const fromHash =
    getSiretFromCustomFieldHash(
      contact.custom_field_hash
    );

  if (
    fromHash
  ) {
    return fromHash;
  }

  /*
   * 3. Propriété à plat :
   * cf_siret, siret, etc.
   */
  for (
    const [
      key,
      value,
    ] of Object.entries(
      contact
    )
  ) {
    const namedSiret =
      getSiretFromNamedValue(
        key,
        value
      );

    if (
      namedSiret
    ) {
      return namedSiret;
    }
  }

  /*
   * 4. Dernière sécurité :
   * recherche récursive d'une
   * propriété explicitement liée
   * au SIRET.
   */
  return findSiretRecursively(
    contact
  );
}

function getSirenFromSiret(
  siret: string | null
): string | null {
  if (
    !siret ||
    siret.length !==
      14
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
      index:
        field.index ??
        null,

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

    const zohoSiret =
      getZohoSiret(
        contact
      );

    const zohoSiren =
      getSirenFromSiret(
        zohoSiret
      );

    console.info(
      "Données Zoho contact détaillées JSON",
      JSON.stringify(
        {
          contactId,

          contactName:
            contact.contact_name,

          customFields:
            getCustomFieldDebugInfo(
              contact
            ),

          customFieldHash:
            contact.custom_field_hash ??
            null,

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
      )
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
           * Important :
           *
           * lorsqu'on restaure une fiche,
           * on ne remet plus silencieusement
           * une ancienne donnée légale que
           * Zoho ne nous renvoie pas.
           */
          siret:
            zohoSiret,

          siren:
            zohoSiren,

          vat_number:
            zohoSiret
              ? existingCompany
                  .vat_number
              : null,

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
            : "Client restauré depuis Zoho Books, mais aucun SIRET exploitable n’a été renvoyé par Zoho.",

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

    return NextResponse.json({
      success: true,

      restored:
        false,

      message:
        zohoSiret
          ? "Client importé avec son SIRET Zoho."
          : "Client importé. Aucun SIRET exploitable n’a été renvoyé par Zoho.",

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