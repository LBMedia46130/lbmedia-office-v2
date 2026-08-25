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

type ZohoContactWithAddress = Awaited<
  ReturnType<
    typeof getZohoContact
  >
> & {
  billing_address?:
    ZohoBillingAddress;
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
     * On recherche d’abord une fiche
     * Office portant déjà cet identifiant
     * Zoho.
     *
     * Si elle est active :
     * le client existe réellement déjà.
     *
     * Si elle est inactive :
     * on la restaurera au lieu de créer
     * une nouvelle fiche.
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
          zoho_contact_id
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
     * Si une ancienne fiche inactive
     * porte déjà ce Zoho ID, on la
     * restaure avec les données actuelles
     * de Zoho Books.
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
            zoho_contact_id
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
          "Client restauré dans LBMedia Office.",

        companyId:
          restoredCompany.id,
      });
    }

    /*
     * Pour une création réelle, on garde
     * la sécurité sur l’adresse email.
     *
     * Seules les fiches actives doivent
     * bloquer l’import.
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
          zoho_contact_id
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