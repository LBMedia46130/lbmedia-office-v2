import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  updateZohoEstimate,
  type CreateZohoEstimateLineItemInput,
} from "@/lib/zoho-books";

type UpdateEstimateRequestBody = {
  customer_id: string;

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

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { estimateId } =
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

    if (
      !Array.isArray(
        body.line_items
      ) ||
      body.line_items.length === 0
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

    return NextResponse.json({
      success: true,

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