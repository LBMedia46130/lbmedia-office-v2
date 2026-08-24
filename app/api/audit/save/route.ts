import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

export const dynamic =
  "force-dynamic";

type TechnicalPlatform =
  | "wordpress"
  | "eatbu"
  | "wix"
  | "squarespace"
  | "webflow"
  | "jimdo"
  | "shopify"
  | "prestashop"
  | "custom"
  | "unknown";

type TechnicalConfidence =
  | "high"
  | "medium"
  | "low";

type TechnicalFeasibility =
  | "good"
  | "limited"
  | "verify"
  | "migration_recommended";

type TechnicalProfile = {
  platform: TechnicalPlatform;
  platformLabel: string;
  confidence: TechnicalConfidence;
  evidence: string[];
  optimizationFeasibility: TechnicalFeasibility;
  redesignFeasibility: TechnicalFeasibility;
  newWebsiteFeasibility: TechnicalFeasibility;
  migrationLikely: boolean | null;
  note: string;
};

type SaveAuditBody = {
  companyId?: string | null;
  websiteUrl?: string;

  scoringVersion?: string;

  pagesAnalyzed?: number;
  analyzedUrls?: string[];

  technicalProfile?:
    | TechnicalProfile
    | null;

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
  const score =
    Number(value);

  if (
    !Number.isFinite(
      score
    )
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        score
      )
    )
  );
}

function stringArray(
  value: unknown
): string[] {
  if (
    !Array.isArray(
      value
    )
  ) {
    return [];
  }

  return value.filter(
    (
      item
    ): item is string =>
      typeof item ===
      "string"
  );
}

function isTechnicalPlatform(
  value: unknown
): value is TechnicalPlatform {
  return (
    value === "wordpress" ||
    value === "eatbu" ||
    value === "wix" ||
    value === "squarespace" ||
    value === "webflow" ||
    value === "jimdo" ||
    value === "shopify" ||
    value === "prestashop" ||
    value === "custom" ||
    value === "unknown"
  );
}

function isTechnicalConfidence(
  value: unknown
): value is TechnicalConfidence {
  return (
    value === "high" ||
    value === "medium" ||
    value === "low"
  );
}

function isTechnicalFeasibility(
  value: unknown
): value is TechnicalFeasibility {
  return (
    value === "good" ||
    value === "limited" ||
    value === "verify" ||
    value ===
      "migration_recommended"
  );
}

function normalizeTechnicalProfile(
  value: unknown
): TechnicalProfile | null {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return null;
  }

  const data =
    value as Record<
      string,
      unknown
    >;

  if (
    !isTechnicalPlatform(
      data.platform
    ) ||
    !isTechnicalConfidence(
      data.confidence
    ) ||
    !isTechnicalFeasibility(
      data.optimizationFeasibility
    ) ||
    !isTechnicalFeasibility(
      data.redesignFeasibility
    ) ||
    !isTechnicalFeasibility(
      data.newWebsiteFeasibility
    )
  ) {
    return null;
  }

  const platformLabel =
    typeof data.platformLabel ===
      "string" &&
    data.platformLabel.trim()
      ? data.platformLabel.trim()
      : "À vérifier";

  const note =
    typeof data.note ===
    "string"
      ? data.note.trim()
      : "";

  const migrationLikely =
    typeof data.migrationLikely ===
    "boolean"
      ? data.migrationLikely
      : null;

  return {
    platform:
      data.platform,

    platformLabel,

    confidence:
      data.confidence,

    evidence:
      stringArray(
        data.evidence
      ),

    optimizationFeasibility:
      data.optimizationFeasibility,

    redesignFeasibility:
      data.redesignFeasibility,

    newWebsiteFeasibility:
      data.newWebsiteFeasibility,

    migrationLikely,

    note,
  };
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
      typeof body.audit !==
        "object"
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
        Number(
          body.pagesAnalyzed
        )
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

    const technicalProfile =
      normalizeTechnicalProfile(
        body.technicalProfile
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

    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from(
          "website_audits"
        )
        .insert({
          company_id:
            companyId,

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
              body.audit
                .seoScore
            ),

          local_seo_score:
            normalizeScore(
              body.audit
                .localSeoScore
            ),

          geo_score:
            normalizeScore(
              body.audit
                .geoScore
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

          technical_platform:
            technicalProfile
              ?.platform ??
            null,

          technical_platform_label:
            technicalProfile
              ?.platformLabel ??
            null,

          technical_confidence:
            technicalProfile
              ?.confidence ??
            null,

          technical_evidence:
            technicalProfile
              ?.evidence ??
            [],

          optimization_feasibility:
            technicalProfile
              ?.optimizationFeasibility ??
            null,

          redesign_feasibility:
            technicalProfile
              ?.redesignFeasibility ??
            null,

          new_website_feasibility:
            technicalProfile
              ?.newWebsiteFeasibility ??
            null,

          migration_likely:
            technicalProfile
              ?.migrationLikely ??
            null,

          technical_note:
            technicalProfile
              ?.note ??
            null,
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
            technical_platform,
            technical_platform_label,
            technical_confidence,
            technical_evidence,
            optimization_feasibility,
            redesign_feasibility,
            new_website_feasibility,
            migration_likely,
            technical_note,
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