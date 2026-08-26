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
    estimateId: string;
  }>;
};

type CampaignContextRequestBody = {
  campaign_objective?: unknown;
  customer_id?: unknown;
};

function cleanString(
  value: unknown
) {
  if (
    typeof value !== "string"
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
    } = await context.params;

    const normalizedEstimateId =
      estimateId?.trim();

    if (
      !normalizedEstimateId
    ) {
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
      (await request.json()) as CampaignContextRequestBody;

    const campaignObjective =
      cleanString(
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

    const customerId =
      cleanString(
        body.customer_id
      );

    let companyId:
      | string
      | null = null;

    if (customerId) {
      const {
        data: company,
        error: companyError,
      } = await supabaseAdmin
        .from("companies")
        .select("id")
        .eq(
          "zoho_contact_id",
          customerId
        )
        .maybeSingle();

      if (companyError) {
        console.error(
          "Impossible de retrouver l’entreprise Office :",
          companyError
        );
      }

      companyId =
        company?.id ??
        null;
    }

    const {
      data,
      error,
    } = await supabaseAdmin
      .from(
        "estimate_campaign_contexts"
      )
      .upsert(
        {
          zoho_estimate_id:
            normalizedEstimateId,

          company_id:
            companyId,

          campaign_objective:
            campaignObjective,

          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict:
            "zoho_estimate_id",
        }
      )
      .select(
        `
          zoho_estimate_id,
          campaign_objective,
          updated_at
        `
      )
      .single();

    if (error) {
      throw new Error(
        error.message
      );
    }

    return NextResponse.json({
      success: true,

      campaignContext: {
        zoho_estimate_id:
          data.zoho_estimate_id,

        campaign_objective:
          data.campaign_objective,

        updated_at:
          data.updated_at,
      },
    });
  } catch (error) {
    console.error(
      "Erreur sauvegarde objectif campagne :",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Impossible d’enregistrer l’objectif de la campagne.",
      },
      {
        status: 500,
      }
    );
  }
}