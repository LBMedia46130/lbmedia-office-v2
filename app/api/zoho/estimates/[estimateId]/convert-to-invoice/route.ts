import {
  NextResponse,
} from "next/server";

import {
  createZohoInvoiceFromEstimate,
  getZohoEstimate,
} from "@/lib/zoho-books";

type RouteContext = {
  params: Promise<{
    estimateId: string;
  }>;
};

export async function POST(
  _request: Request,
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

    /*
     * On relit d'abord le devis dans Zoho.
     * La conversion n'est autorisée depuis
     * Office que pour un devis accepté.
     */
    const estimate =
      await getZohoEstimate(
        estimateId
      );

    if (
      estimate.status !==
      "accepted"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Seul un devis accepté peut être transformé en facture.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * Zoho Books effectue lui-même
     * la conversion native devis → facture.
     */
    const invoice =
      await createZohoInvoiceFromEstimate(
        estimateId
      );

    return NextResponse.json({
      success: true,

      estimate: {
        estimate_id:
          estimate.estimate_id,

        estimate_number:
          estimate.estimate_number,
      },

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
            : "Erreur inconnue pendant la transformation du devis en facture.",
      },
      {
        status: 500,
      }
    );
  }
}