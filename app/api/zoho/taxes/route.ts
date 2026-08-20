import { NextResponse } from "next/server";

import {
  getZohoTaxes,
} from "@/lib/zoho-books";

export async function GET() {
  try {
    const taxes =
      await getZohoTaxes();

    return NextResponse.json({
      success: true,
      count: taxes.length,
      taxes: taxes.map((tax) => ({
        tax_id:
          tax.tax_id,
        tax_name:
          tax.tax_name,
        tax_percentage:
          tax.tax_percentage,
        tax_type:
          tax.tax_type ?? null,
        tax_specific_type:
          tax.tax_specific_type ?? null,
        is_value_added:
          tax.is_value_added ?? null,
        is_default_tax:
          tax.is_default_tax ?? null,
      })),
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
      {
        status: 500,
      }
    );
  }
}