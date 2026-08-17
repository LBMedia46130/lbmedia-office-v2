import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

import {
  updateAuditProspection,
} from "@/lib/audit-prospections";

export const dynamic =
  "force-dynamic";

export const maxDuration = 60;

const BUCKET =
  "audit-prospection-assets";

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } =
      await context.params;

    const formData =
      await request.formData();

    const file =
      formData.get("file");

    const kind =
      formData.get("kind");

    if (
      !(file instanceof File)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Aucun fichier n’a été transmis.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      kind !== "before" &&
      kind !== "after"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le type de visuel est invalide.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      file.size >
      MAX_FILE_SIZE
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le fichier ne doit pas dépasser 10 Mo.",
        },
        {
          status: 400,
        }
      );
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      !allowedTypes.includes(
        file.type
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Seuls les fichiers JPG, PNG et WebP sont acceptés.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: prospection,
      error: prospectionError,
    } = await supabaseAdmin
      .from(
        "audit_prospections"
      )
      .select(
        `
          id,
          company_id
        `
      )
      .eq(
        "id",
        id
      )
      .maybeSingle();

    if (prospectionError) {
      throw new Error(
        `Impossible de charger la prospection : ${prospectionError.message}`
      );
    }

    if (!prospection) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Prospection introuvable.",
        },
        {
          status: 404,
        }
      );
    }

    const extension =
      getExtension(
        file.type
      );

    const storagePath =
      `${prospection.company_id}/${id}/${kind}.${extension}`;

    const bytes =
      new Uint8Array(
        await file.arrayBuffer()
      );

    const {
      error: uploadError,
    } = await supabaseAdmin
      .storage
      .from(BUCKET)
      .upload(
        storagePath,
        bytes,
        {
          contentType:
            file.type,

          upsert: true,

          cacheControl:
            "3600",
        }
      );

    if (uploadError) {
      throw new Error(
        `Impossible d’enregistrer le visuel : ${uploadError.message}`
      );
    }

    const {
      data: publicUrlData,
    } = supabaseAdmin
      .storage
      .from(BUCKET)
      .getPublicUrl(
        storagePath
      );

    const publicUrl =
      `${publicUrlData.publicUrl}?v=${Date.now()}`;

    const updated =
      await updateAuditProspection(
        id,
        kind === "before"
          ? {
              beforeImageUrl:
                publicUrl,

              attachmentUrl:
                null,
            }
          : {
              afterImageUrl:
                publicUrl,

              attachmentUrl:
                null,
            }
      );

    return NextResponse.json({
      success: true,
      prospection:
        updated,
    });
  } catch (error) {
    console.error(
      "Audit prospection asset upload error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Impossible d’enregistrer le visuel.",
      },
      {
        status: 500,
      }
    );
  }
}

function getExtension(
  mimeType: string
) {
  if (
    mimeType ===
    "image/png"
  ) {
    return "png";
  }

  if (
    mimeType ===
    "image/webp"
  ) {
    return "webp";
  }

  return "jpg";
}