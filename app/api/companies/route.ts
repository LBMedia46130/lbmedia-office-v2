import {
  NextResponse,
} from "next/server";

import {
  getCompanies,
} from "@/lib/companies";

export const dynamic =
  "force-dynamic";

export async function GET() {
  try {
    const companies =
      await getCompanies();

    return NextResponse.json({
      success: true,
      companies: companies.map(
        (company) => ({
          id: company.id,
          name: company.name,
          website:
            company.website,
          relationship_status:
            company.relationship_status,
          is_active:
            company.is_active,
        })
      ),
    });
  } catch (error) {
    console.error(
      "Companies API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Impossible de charger les entreprises.",
      },
      {
        status: 500,
      }
    );
  }
}