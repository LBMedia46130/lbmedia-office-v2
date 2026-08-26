import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  updateZohoEstimate,
  type CreateZohoEstimateLineItemInput,
} from "@/lib/zoho-books";

import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

type UpdateEstimateRequestBody = {
  customer_id: string;

  campaign_objective: string;

  date?: string;
  expiry_date?: string;
  reference_number?: string;
  notes?: string;
  terms?: string;

  line_items: CreateZohoEstimateLineItemInput[];
};

type RouteContext = {
  params: Promise<{
    estimateId: string;
  }>;
};

function cleanOptionalString(
  value: unknown
): string | undefined {
  if (
    typeof value !==
    "string"
  ) {
    return undefined;
  }

  const trimmed =
    value.trim();

  return trimmed
    ? trimmed
    : undefined;
}

function cleanRequiredString(
  value: unknown
): string {
  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  return value.trim();
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const {
      estimateId,
    } =
      await context.params;

    if (!estimateId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Identifiant du devis manquant.",
        },
        {
          status: 400,
        }
      );
    }

    const body =
      (await request.json()) as UpdateEstimateRequestBody;

    if (
      !body.customer_id ||
      typeof body.customer_id !==
        "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le client Zoho est obligatoire.",
        },
        {
          status: 400,
        }
      );
    }

    const campaignObjective =
      cleanRequiredString(
        body.campaign_objective
      );

    if (
      !campaignObjective
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "L’objectif de la campagne est obligatoire.",
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
            "Le devis doit contenir au moins une ligne.",
        },
        {
          status: 400,
        }
      );
    }

    const estimate =
      await updateZohoEstimate(
        estimateId,
        {
          customer_id:
            body.customer_id,

          date:
            cleanOptionalString(
              body.date
            ),

          expiry_date:
            cleanOptionalString(
              body.expiry_date
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
        }
      );

    const {
      data:
        company,
      error:
        companyError,
    } = await supabaseAdmin
      .from(
        "companies"
      )
      .select("id")
      .eq(
        "zoho_contact_id",
        body.customer_id
      )
      .maybeSingle();

    if (
      companyError
    ) {
      console.error(
        "Impossible de retrouver l’entreprise Office du devis :",
        companyError
      );
    }

    const {
      error:
        contextError,
    } = await supabaseAdmin
      .from(
        "estimate_campaign_contexts"
      )
      .upsert(
        {
          zoho_estimate_id:
            estimateId,

          company_id:
            company?.id ??
            null,

          campaign_objective:
            campaignObjective,

          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict:
            "zoho_estimate_id",
        }
      );

    let warning:
      string | undefined;

    if (
      contextError
    ) {
      console.error(
        "Impossible d’enregistrer l’objectif de campagne :",
        contextError
      );

      warning =
        "Le devis a été modifié dans Zoho Books, mais l’objectif de campagne n’a pas pu être enregistré dans Office.";
    }

    return NextResponse.json({
      success: true,

      warning,

      estimate: {
        estimate_id:
          estimate.estimate_id,

        estimate_number:
          estimate.estimate_number,

        customer_id:
          estimate.customer_id,

        customer_name:
          estimate.customer_name,

        status:
          estimate.status,

        date:
          estimate.date,

        expiry_date:
          estimate.expiry_date ??
          null,

        total:
          estimate.total,

        currency_code:
          estimate.currency_code ??
          "EUR",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Erreur inconnue pendant la modification du devis.",
      },
      {
        status: 500,
      }
    );
  }
}