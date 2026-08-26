import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

export const dynamic =
  "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type WebEnrichmentPayload = {
  website?: string;
  phone?: string;
  email?: string;
  business_description?: string;
  linkedin_url?: string;
  facebook_url?: string;
};

function normalizeValue(
  value: unknown
): string | null {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const cleaned =
    value.trim();

  return cleaned ||
    null;
}

function normalizeHttpUrl(
  value: unknown
): string | null {
  const normalized =
    normalizeValue(
      value
    );

  if (!normalized) {
    return null;
  }

  try {
    const url =
      new URL(
        normalized
      );

    if (
      url.protocol !==
        "https:" &&
      url.protocol !==
        "http:"
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  const { id } =
    await context.params;

  try {
    const body =
      (await request.json()) as WebEnrichmentPayload;

    const {
      data: company,
      error: companyError,
    } = await supabaseAdmin
      .from("companies")
      .select(
        `
          id,
          website,
          phone,
          email,
          business_description,
          linkedin_url,
          facebook_url
        `
      )
      .eq(
        "id",
        id
      )
      .maybeSingle();

    if (companyError) {
      throw new Error(
        companyError.message
      );
    }

    if (!company) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Entreprise introuvable.",
        },
        {
          status: 404,
        }
      );
    }

    const updates: Record<
      string,
      string
    > = {};

    const website =
      normalizeHttpUrl(
        body.website
      );

    const phone =
      normalizeValue(
        body.phone
      );

    const email =
      normalizeValue(
        body.email
      );

    const businessDescription =
      normalizeValue(
        body.business_description
      );

    const linkedinUrl =
      normalizeHttpUrl(
        body.linkedin_url
      );

    const facebookUrl =
      normalizeHttpUrl(
        body.facebook_url
      );

    if (
      !company.website &&
      website
    ) {
      updates.website =
        website;
    }

    if (
      !company.phone &&
      phone
    ) {
      updates.phone =
        phone;
    }

    if (
      !company.email &&
      email
    ) {
      updates.email =
        email;
    }

    if (
      !company.business_description &&
      businessDescription
    ) {
      updates.business_description =
        businessDescription;
    }

    if (
      !company.linkedin_url &&
      linkedinUrl
    ) {
      updates.linkedin_url =
        linkedinUrl;
    }

    if (
      !company.facebook_url &&
      facebookUrl
    ) {
      updates.facebook_url =
        facebookUrl;
    }

    if (
      Object.keys(
        updates
      ).length ===
      0
    ) {
      return NextResponse.json({
        success: true,
        updated: [],
        message:
          "Aucune donnée vide à compléter.",
      });
    }

    const {
      error: updateError,
    } = await supabaseAdmin
      .from("companies")
      .update(
        updates
      )
      .eq(
        "id",
        id
      );

    if (updateError) {
      throw new Error(
        updateError.message
      );
    }

    return NextResponse.json({
      success: true,

      updated:
        Object.keys(
          updates
        ),
    });
  } catch (error) {
    console.error(
      "Company web enrichment import error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Impossible d’importer les informations publiques.",

        error:
          error instanceof Error
            ? error.message
            : "Erreur inconnue",
      },
      {
        status: 500,
      }
    );
  }
}