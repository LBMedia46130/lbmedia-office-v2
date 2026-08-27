import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

import {
  getWebsiteAuditById,
} from "@/lib/website-audits";

export const dynamic =
  "force-dynamic";

type RouteContext = {
  params: Promise<{
    auditId: string;
  }>;
};

function buildAuditResponse(
  audit: NonNullable<
    Awaited<
      ReturnType<
        typeof getWebsiteAuditById
      >
    >
  >
) {
  const technicalProfile =
    audit.technical_platform ||
    audit.technical_platform_label ||
    audit.technical_confidence ||
    audit.technical_evidence.length >
      0 ||
    audit.optimization_feasibility ||
    audit.redesign_feasibility ||
    audit.new_website_feasibility ||
    audit.migration_likely !==
      null ||
    audit.technical_note
      ? {
          platform:
            audit.technical_platform ??
            "unknown",

          platformLabel:
            audit.technical_platform_label ??
            "À vérifier",

          confidence:
            audit.technical_confidence ??
            "low",

          evidence:
            audit.technical_evidence,

          optimizationFeasibility:
            audit.optimization_feasibility ??
            "verify",

          redesignFeasibility:
            audit.redesign_feasibility ??
            "verify",

          newWebsiteFeasibility:
            audit.new_website_feasibility ??
            "verify",

          migrationLikely:
            audit.migration_likely,

          note:
            audit.technical_note ??
            "La technologie du site doit être vérifiée avant chiffrage.",
        }
      : undefined;

  return {
    success: true,

    savedAuditId:
      audit.id,

    companyId:
      audit.company_id,

    url:
      audit.website_url,

    pagesAnalyzed:
      audit.pages_analyzed,

    analyzedUrls:
      audit.analyzed_urls,

    scoringVersion:
      audit.scoring_version,

    technicalProfile,

    audit: {
      globalScore:
        audit.global_score,

      positioningScore:
        audit.positioning_score,

      conversionScore:
        audit.conversion_score,

      seoScore:
        audit.seo_score,

      localSeoScore:
        audit.local_seo_score,

      geoScore:
        audit.geo_score,

      summary:
        audit.summary,

      strengths:
        audit.strengths,

      weaknesses:
        audit.weaknesses,

      limitations:
        audit.limitations,

      priorities:
        audit.priorities,
    },
  };
}

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const {
      auditId,
    } = await context.params;

    if (
      !auditId ||
      !auditId.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Identifiant de l’audit manquant.",
        },
        {
          status: 400,
        }
      );
    }

    const audit =
      await getWebsiteAuditById(
        auditId
      );

    if (!audit) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Audit introuvable.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(
      buildAuditResponse(
        audit
      )
    );
  } catch (error) {
    console.error(
      "Get website audit error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Impossible de charger l’audit.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const {
      auditId,
    } = await context.params;

    if (
      !auditId ||
      !auditId.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Identifiant de l’audit manquant.",
        },
        {
          status: 400,
        }
      );
    }

    const body =
      await request.json();

    const companyId =
      typeof body.companyId ===
        "string" &&
      body.companyId.trim()
        ? body.companyId.trim()
        : "";

    if (!companyId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Sélectionnez une entreprise.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: audit,
      error: auditError,
    } = await supabaseAdmin
      .from(
        "website_audits"
      )
      .select(
        `
          id,
          company_id
        `
      )
      .eq(
        "id",
        auditId
      )
      .maybeSingle();

    if (auditError) {
      throw new Error(
        auditError.message
      );
    }

    if (!audit) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Audit introuvable.",
        },
        {
          status: 404,
        }
      );
    }

    const {
      data: company,
      error: companyError,
    } = await supabaseAdmin
      .from(
        "companies"
      )
      .select(
        `
          id,
          name
        `
      )
      .eq(
        "id",
        companyId
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

    const {
      error: updateError,
    } = await supabaseAdmin
      .from(
        "website_audits"
      )
      .update({
        company_id:
          companyId,
      })
      .eq(
        "id",
        auditId
      );

    if (updateError) {
      throw new Error(
        updateError.message
      );
    }

    return NextResponse.json({
      success: true,

      auditId,

      companyId,

      companyName:
        company.name,

      previousCompanyId:
        audit.company_id,

      message:
        `Audit rattaché à ${company.name}.`,
    });
  } catch (error) {
    console.error(
      "Attach website audit error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Impossible de rattacher l’audit.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const {
      auditId,
    } = await context.params;

    if (
      !auditId ||
      !auditId.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Identifiant de l’audit manquant.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: audit,
      error: auditError,
    } = await supabaseAdmin
      .from(
        "website_audits"
      )
      .select(
        `
          id,
          company_id
        `
      )
      .eq(
        "id",
        auditId
      )
      .maybeSingle();

    if (auditError) {
      throw new Error(
        auditError.message
      );
    }

    if (!audit) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Audit introuvable.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Sécurité :
     * on ne supprime pas silencieusement
     * une prospection commerciale liée
     * à cet audit.
     */
    const {
      data: linkedProspection,
      error:
        linkedProspectionError,
    } = await supabaseAdmin
      .from(
        "audit_prospections"
      )
      .select(
        `
          id,
          status
        `
      )
      .eq(
        "website_audit_id",
        auditId
      )
      .limit(1)
      .maybeSingle();

    if (
      linkedProspectionError
    ) {
      throw new Error(
        linkedProspectionError.message
      );
    }

    if (
      linkedProspection
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Cet audit possède une prospection associée. Supprimez d’abord la prospection avant de supprimer l’audit.",
        },
        {
          status: 409,
        }
      );
    }

    const {
      error: deleteError,
    } = await supabaseAdmin
      .from(
        "website_audits"
      )
      .delete()
      .eq(
        "id",
        auditId
      );

    if (deleteError) {
      throw new Error(
        deleteError.message
      );
    }

    return NextResponse.json({
      success: true,

      companyId:
        audit.company_id,

      message:
        "Audit supprimé.",
    });
  } catch (error) {
    console.error(
      "Delete website audit error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Impossible de supprimer l’audit.",
      },
      {
        status: 500,
      }
    );
  }
}
