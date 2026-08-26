import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const BUCKET_NAME =
  "company-logos";

const MAX_FILE_SIZE =
  5 * 1024 * 1024;

const ALLOWED_MIME_TYPES =
  new Set([
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/svg+xml",
  ]);

function getExtensionFromMimeType(
  mimeType: string
) {
  switch (mimeType) {
    case "image/png":
      return "png";

    case "image/jpeg":
      return "jpg";

    case "image/webp":
      return "webp";

    case "image/svg+xml":
      return "svg";

    default:
      return null;
  }
}

async function companyExists(
  companyId: string
) {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from("companies")
    .select("id")
    .eq(
      "id",
      companyId
    )
    .maybeSingle();

  if (error) {
    throw new Error(
      error.message
    );
  }

  return Boolean(data);
}

async function saveLogo(
  companyId: string,
  buffer: ArrayBuffer,
  mimeType: string
) {
  const extension =
    getExtensionFromMimeType(
      mimeType
    );

  if (!extension) {
    throw new Error(
      "Format d’image non pris en charge."
    );
  }

  if (
    buffer.byteLength >
    MAX_FILE_SIZE
  ) {
    throw new Error(
      "Le logo dépasse la taille maximale de 5 Mo."
    );
  }

  const filePath =
    `${companyId}/logo-${Date.now()}.${extension}`;

  const {
    error: uploadError,
  } = await supabaseAdmin
    .storage
    .from(
      BUCKET_NAME
    )
    .upload(
      filePath,
      buffer,
      {
        contentType:
          mimeType,
        cacheControl:
          "3600",
        upsert: false,
      }
    );

  if (uploadError) {
    throw new Error(
      `Impossible d’enregistrer le logo : ${uploadError.message}`
    );
  }

  const {
    data: publicUrlData,
  } = supabaseAdmin
    .storage
    .from(
      BUCKET_NAME
    )
    .getPublicUrl(
      filePath
    );

  const publicUrl =
    publicUrlData
      .publicUrl;

  const {
    error: updateError,
  } = await supabaseAdmin
    .from("companies")
    .update({
      logo_url:
        publicUrl,
    })
    .eq(
      "id",
      companyId
    );

  if (updateError) {
    await supabaseAdmin
      .storage
      .from(
        BUCKET_NAME
      )
      .remove([
        filePath,
      ]);

    throw new Error(
      `Impossible d’associer le logo à l’entreprise : ${updateError.message}`
    );
  }

  return publicUrl;
}

async function downloadRemoteLogo(
  sourceUrl: string
) {
  let parsedUrl: URL;

  try {
    parsedUrl =
      new URL(
        sourceUrl
      );
  } catch {
    throw new Error(
      "L’URL du logo est invalide."
    );
  }

  if (
    parsedUrl.protocol !==
      "https:" &&
    parsedUrl.protocol !==
      "http:"
  ) {
    throw new Error(
      "L’URL du logo doit utiliser HTTP ou HTTPS."
    );
  }

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => {
        controller.abort();
      },
      15000
    );

  try {
    const response =
      await fetch(
        parsedUrl.toString(),
        {
          method: "GET",

          headers: {
            "User-Agent":
              "LBMedia Office/1.0",
            Accept:
              "image/png,image/jpeg,image/webp,image/svg+xml,image/*",
          },

          redirect:
            "follow",

          signal:
            controller.signal,
        }
      );

    if (!response.ok) {
      throw new Error(
        `Le serveur du logo a répondu ${response.status}.`
      );
    }

    const rawContentType =
      response.headers
        .get(
          "content-type"
        )
        ?.split(";")[0]
        ?.trim()
        .toLowerCase() ??
      "";

    if (
      !ALLOWED_MIME_TYPES.has(
        rawContentType
      )
    ) {
      throw new Error(
        "L’adresse trouvée ne pointe pas vers un format de logo accepté."
      );
    }

    const buffer =
      await response.arrayBuffer();

    if (
      buffer.byteLength ===
      0
    ) {
      throw new Error(
        "Le fichier du logo est vide."
      );
    }

    return {
      buffer,
      mimeType:
        rawContentType,
    };
  } finally {
    clearTimeout(
      timeout
    );
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } =
      await context.params;

    if (
      !(await companyExists(
        id
      ))
    ) {
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

    const contentType =
      request.headers
        .get(
          "content-type"
        ) ??
      "";

    let buffer:
      ArrayBuffer;

    let mimeType:
      string;

    if (
      contentType.includes(
        "multipart/form-data"
      )
    ) {
      const formData =
        await request.formData();

      const file =
        formData.get(
          "file"
        );

      if (
        !(file instanceof File)
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Aucun fichier logo n’a été transmis.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        !ALLOWED_MIME_TYPES.has(
          file.type
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Format non pris en charge. Utilise PNG, JPG, WebP ou SVG.",
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
              "Le fichier dépasse 5 Mo.",
          },
          {
            status: 400,
          }
        );
      }

      buffer =
        await file.arrayBuffer();

      mimeType =
        file.type;
    } else {
      const body =
        (await request.json()) as {
          sourceUrl?: unknown;
        };

      const sourceUrl =
        typeof body
          .sourceUrl ===
          "string"
          ? body.sourceUrl.trim()
          : "";

      if (!sourceUrl) {
        return NextResponse.json(
          {
            success: false,
            message:
              "URL du logo manquante.",
          },
          {
            status: 400,
          }
        );
      }

      const downloaded =
        await downloadRemoteLogo(
          sourceUrl
        );

      buffer =
        downloaded.buffer;

      mimeType =
        downloaded.mimeType;
    }

    const logoUrl =
      await saveLogo(
        id,
        buffer,
        mimeType
      );

    return NextResponse.json({
      success: true,
      logoUrl,
    });
  } catch (error) {
    console.error(
      "Company logo error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Impossible d’enregistrer le logo.",
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
    const { id } =
      await context.params;

    const {
      data: company,
      error,
    } = await supabaseAdmin
      .from("companies")
      .select(
        `
          id,
          logo_url
        `
      )
      .eq(
        "id",
        id
      )
      .maybeSingle();

    if (error) {
      throw new Error(
        error.message
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
      .from("companies")
      .update({
        logo_url:
          null,
      })
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
    });
  } catch (error) {
    console.error(
      "Company logo deletion error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Impossible de supprimer le logo.",
      },
      {
        status: 500,
      }
    );
  }
}