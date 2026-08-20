import { NextResponse } from "next/server";

import {
  getAllZohoEstimates,
} from "@/lib/zoho-books";

export async function GET() {
  try {
    const estimates =
      await getAllZohoEstimates();

    return NextResponse.json({
      success: true,
      count: estimates.length,
      estimates: estimates.map(
        (estimate) => ({
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
            estimate.expiry_date ?? null,
          total:
            estimate.total,
          currency_code:
            estimate.currency_code ?? "EUR",
          reference_number:
            estimate.reference_number ?? null,
        })
      ),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erreur Zoho Books inconnue.",
      },
      { status: 500 }
    );
  }
}