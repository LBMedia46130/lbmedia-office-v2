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
    auditId: string;
  }>;
};

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