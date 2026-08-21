import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  updateZohoInvoice,
  type UpdateZohoInvoiceLineItemInput,
} from "@/lib/zoho-books";

type RouteContext = {
  params: Promise<{
    invoiceId: string;
  }>;
};

type UpdateInvoiceRequestBody = {
  customer_id: string;

  date?: string;
  due_date?: string;
  reference_number?: string;
  notes?: string;
  terms?: string;

  line_items:
    UpdateZohoInvoiceLineItemInput[];
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
    const { invoiceId } =
      await context.params;

    if (!invoiceId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Identifiant de facture manquant.",
        },
        {
          status: 400,
        }
      );
    }

    const body =
      (await request.json()) as UpdateInvoiceRequestBody;

    if (
      !body.customer_id ||
      typeof body.customer_id !==
        "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le client est obligatoire.",
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
            "La facture doit contenir au moins une ligne.",
        },
        {
          status: 400,
        }
      );
    }

    const invoice =
      await updateZohoInvoice(
        invoiceId,
        {
          customer_id:
            body.customer_id,

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
        }
      );

    return NextResponse.json({
      success: true,

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
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Erreur inconnue pendant la modification de la facture.",
      },
      {
        status: 500,
      }
    );
  }
}