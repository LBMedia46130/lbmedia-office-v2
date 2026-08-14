import {
  NextRequest,
  NextResponse,
} from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic =
  "force-dynamic";

type SaveAuditBody = {
  companyId?: string | null;
  websiteUrl?: string;

  scoringVersion?: string;

  pagesAnalyzed?: number;
  analyzedUrls?: string[];

  audit?: {
    globalScore?: number;
    positioningScore?: number;
    conversionScore?: number;
    seoScore?: number;
    localSeoScore?: number;
    geoScore?: number;

    summary?: string;

    strengths?: string[];
    weaknesses?: string[];
    limitations?: string[];
    priorities?: string[];
  };
};

function normalizeScore(
  value: unknown
) {
  const score = Number(value);

  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(score)
    )
  );
}

function stringArray(
  value: unknown
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string =>
      typeof item === "string"
  );
}

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      (await request.json()) as SaveAuditBody;

    const websiteUrl =
      typeof body.websiteUrl ===
      "string"
        ? body.websiteUrl.trim()
        : "";

    if (!websiteUrl) {
      return NextResponse.json(
        {
          success: false,
          message:
            "L’URL du site est obligatoire.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !body.audit ||
      typeof body.audit !== "object"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Les données de l’audit sont absentes.",
        },
        {
          status: 400,
        }
      );
    }

    const companyId =
      typeof body.companyId ===
        "string" &&
      body.companyId.trim()
        ? body.companyId.trim()
        : null;

    const scoringVersion =
      typeof body.scoringVersion ===
        "string" &&
      body.scoringVersion.trim()
        ? body.scoringVersion.trim()
        : "1.1";

    const pagesAnalyzed =
      Number.isFinite(
        Number(body.pagesAnalyzed)
      )
        ? Math.max(
            0,
            Math.round(
              Number(
                body.pagesAnalyzed
              )
            )
          )
        : 0;

    const analyzedUrls =
      stringArray(
        body.analyzedUrls
      );

    const summary =
      typeof body.audit.summary ===
      "string"
        ? body.audit.summary.trim()
        : "";

    if (!summary) {
      return NextResponse.json(
        {
          success: false,
          message:
            "La synthèse de l’audit est absente.",
        },
        {
          status: 400,
        }
      );
    }

    const { data, error } =
      await supabaseAdmin
        .from("website_audits")
        .insert({
          company_id: companyId,

          website_url:
            websiteUrl,

          scoring_version:
            scoringVersion,

          pages_analyzed:
            pagesAnalyzed,

          analyzed_urls:
            analyzedUrls,

          global_score:
            normalizeScore(
              body.audit
                .globalScore
            ),

          positioning_score:
            normalizeScore(
              body.audit
                .positioningScore
            ),

          conversion_score:
            normalizeScore(
              body.audit
                .conversionScore
            ),

          seo_score:
            normalizeScore(
              body.audit.seoScore
            ),

          local_seo_score:
            normalizeScore(
              body.audit
                .localSeoScore
            ),

          geo_score:
            normalizeScore(
              body.audit.geoScore
            ),

          summary,

          strengths:
            stringArray(
              body.audit
                .strengths
            ),

          weaknesses:
            stringArray(
              body.audit
                .weaknesses
            ),

          limitations:
            stringArray(
              body.audit
                .limitations
            ),

          priorities:
            stringArray(
              body.audit
                .priorities
            ),
        })
        .select(
          `
            id,
            company_id,
            website_url,
            scoring_version,
            pages_analyzed,
            global_score,
            positioning_score,
            conversion_score,
            seo_score,
            local_seo_score,
            geo_score,
            created_at
          `
        )
        .single();

    if (error) {
      console.error(
        "Save website audit error:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Impossible d’enregistrer l’audit.",
          detail:
            error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      audit: data,
    });
  } catch (error) {
    console.error(
      "Save website audit error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Une erreur est survenue pendant l’enregistrement de l’audit.",
      },
      {
        status: 500,
      }
    );
  }
}