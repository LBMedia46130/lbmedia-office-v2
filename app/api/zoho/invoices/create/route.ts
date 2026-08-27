import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getCompanyById,
  updateCompany,
} from "@/lib/companies";

import {
  createZohoContact,
  createZohoInvoice,
  type CreateZohoInvoiceLineItemInput,
} from "@/lib/zoho-books";

type CreateInvoiceRequestBody = {
  company_id: string;

  date?: string;
  due_date?: string;
  reference_number?: string;
  notes?: string;
  terms?: string;

  line_items: CreateZohoInvoiceLineItemInput[];
};

function cleanOptionalString(
  value: unknown
): string | undefined {
  if (
    typeof value !== "string"
  ) {
    return undefined;
  }

  const trimmed =
    value.trim();

  return trimmed
    ? trimmed
    : undefined;
}

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      (await request.json()) as CreateInvoiceRequestBody;

    if (
      !body.company_id ||
      typeof body.company_id !==
        "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "L’entreprise est obligatoire.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Array.isArray(
        body.line_items
      ) ||
      body.line_items.length ===
        0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "La facture doit contenir au moins une ligne.",
        },
        {
          status: 400,
        }
      );
    }

    const company =
      await getCompanyById(
        body.company_id
      );

    if (!company) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Entreprise introuvable dans LBMedia Office.",
        },
        {
          status: 404,
        }
      );
    }

    let zohoContactId =
      company.zoho_contact_id;

    let zohoContactCreated =
      false;

    if (!zohoContactId) {
      const contact =
        await createZohoContact({
          contact_name:
            company.name,

          company_name:
            company.legal_name ??
            company.name,

          email:
            company.email ??
            undefined,

          phone:
            company.phone ??
            undefined,

          billing_address: {
            address:
              company.address ??
              undefined,

            street2:
              company.address_line_2 ??
              undefined,

            city:
              company.city ??
              undefined,

            state:
              company.state ??
              undefined,

            zip:
              company.postal_code ??
              undefined,

            country:
              company.country ??
              "France",
          },
        });

      zohoContactId =
        contact.contact_id;

      zohoContactCreated =
        true;

      await updateCompany(
        company.id,
        {
          name:
            company.name,

          legal_name:
            company.legal_name,

          email:
            company.email,

          phone:
            company.phone,

          website:
            company.website,

          logo_url:
            company.logo_url,

          linkedin_url:
            company.linkedin_url,

          facebook_url:
            company.facebook_url,

          address:
            company.address,

          address_line_2:
            company.address_line_2,

          postal_code:
            company.postal_code,

          city:
            company.city,

          state:
            company.state,

          country:
            company.country,

          customer_number:
            company.customer_number,

          siren:
            company.siren,

          siret:
            company.siret,

          vat_number:
            company.vat_number,

          legal_form:
            company.legal_form,

          ape_code:
            company.ape_code,

          ape_label:
            company.ape_label,

          creation_date:
            company.creation_date,

          employee_range:
            company.employee_range,

          legal_data_updated_at:
            company.legal_data_updated_at,

          notes:
            company.notes,

          zoho_contact_id:
            zohoContactId,

          is_active:
            company.is_active,

          relationship_status:
            company.relationship_status,

          pipeline_stage:
            company.pipeline_stage,

          sector:
            company.sector,

          business_description:
            company.business_description,

          target_audience:
            company.target_audience,

          geographic_area:
            company.geographic_area,

          tone_of_voice:
            company.tone_of_voice,

          communication_style:
            company.communication_style,

          services:
            company.services,

          products:
            company.products,

          strengths:
            company.strengths,

          values:
            company.values,

          seo_keywords:
            company.seo_keywords,

          geo_keywords:
            company.geo_keywords,

          competitors:
            company.competitors,

          preferred_channels:
            company.preferred_channels,

          publication_frequency:
            company.publication_frequency,

          editorial_objectives:
            company.editorial_objectives,

          ai_instructions:
            company.ai_instructions,

          ai_do_not:
            company.ai_do_not,

          brand_story:
            company.brand_story,
        }
      );
    }

    const invoice =
      await createZohoInvoice({
        customer_id:
          zohoContactId,

        date:
          cleanOptionalString(
            body.date
          ),

        due_date:
          cleanOptionalString(
            body.due_date
          ),

        reference_number:
          cleanOptionalString(
            body.reference_number
          ),

        notes:
          cleanOptionalString(
            body.notes
          ),

        terms:
          cleanOptionalString(
            body.terms
          ),

        line_items:
          body.line_items,
      });

    return NextResponse.json(
      {
        success: true,

        zoho_contact_created:
          zohoContactCreated,

        zoho_contact_id:
          zohoContactId,

        invoice: {
          invoice_id:
            invoice.invoice_id,

          invoice_number:
            invoice.invoice_number,

          customer_id:
            invoice.customer_id,

          customer_name:
            invoice.customer_name,

          status:
            invoice.status,

          date:
            invoice.date,

          due_date:
            invoice.due_date,

          total:
            invoice.total,

          balance:
            invoice.balance,

          currency_code:
            invoice.currency_code ??
            "EUR",
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Erreur inconnue pendant la création de la facture.",
      },
      {
        status: 500,
      }
    );
  }
}
