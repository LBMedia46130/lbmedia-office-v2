import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  readFile,
} from "node:fs/promises";

import {
  join,
} from "node:path";

import {
  PDFDocument,
  StandardFonts,
  rgb,
} from "pdf-lib";

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

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } =
      await context.params;

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
          company_id,
          before_image_url,
          after_image_url
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

    if (
      !prospection.before_image_url ||
      !prospection.after_image_url
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Les deux visuels sont nécessaires avant de générer le PDF.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: company,
      error: companyError,
    } = await supabaseAdmin
      .from("companies")
      .select(
        `
          id,
          name,
          website
        `
      )
      .eq(
        "id",
        prospection.company_id
      )
      .maybeSingle();

    if (companyError) {
      throw new Error(
        `Impossible de charger l’entreprise : ${companyError.message}`
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

    const [
      beforeAsset,
      afterAsset,
      logoBytes,
    ] = await Promise.all([
      fetchImage(
        prospection.before_image_url
      ),

      fetchImage(
        prospection.after_image_url
      ),

      loadLbmediaLogo(),
    ]);

    const pdf =
      await PDFDocument.create();

    const font =
      await pdf.embedFont(
        StandardFonts.Helvetica
      );

    const boldFont =
      await pdf.embedFont(
        StandardFonts.HelveticaBold
      );

    const logo =
      await pdf.embedPng(
        logoBytes
      );

    const page =
      pdf.addPage([
        841.89,
        595.28,
      ]);

    const {
      width,
      height,
    } = page.getSize();

    /*
     * Bandeau principal
     */
    page.drawRectangle({
      x: 0,
      y:
        height - 72,
      width,
      height: 72,

      color:
        rgb(
          0.04,
          0.12,
          0.28
        ),
    });

    /*
     * Logo officiel LBMedia
     */
    const logoBoxWidth =
      92;

    const logoBoxHeight =
      34;

    const logoDimensions =
      logo.scale(1);

    const logoRatio =
      Math.min(
        logoBoxWidth /
          logoDimensions.width,
        logoBoxHeight /
          logoDimensions.height
      );

    const logoWidth =
      logoDimensions.width *
      logoRatio;

    const logoHeight =
      logoDimensions.height *
      logoRatio;

    page.drawImage(
      logo,
      {
        x: 42,

        y:
          height -
          36 -
          logoHeight / 2,

        width:
          logoWidth,

        height:
          logoHeight,
      }
    );

    page.drawText(
      "Une piste d'amélioration pour votre site",
      {
        x: 155,

        y:
          height - 41,

        size: 17,

        font:
          boldFont,

        color:
          rgb(
            1,
            1,
            1
          ),
      }
    );

    /*
     * Prospect
     */
    page.drawText(
      company.name,
      {
        x: 42,

        y:
          height - 103,

        size: 18,

        font:
          boldFont,

        color:
          rgb(
            0.08,
            0.12,
            0.2
          ),
      }
    );

    if (
      company.website
    ) {
      page.drawText(
        company.website,
        {
          x: 42,

          y:
            height - 121,

          size: 9,

          font,

          color:
            rgb(
              0.35,
              0.4,
              0.5
            ),
        }
      );
    }

    /*
     * Mention explicative
     */
    page.drawText(
      "L'idée présentée ci-dessous est volontairement illustrative : elle montre une direction possible,",
      {
        x: 42,

        y:
          height - 148,

        size: 9.5,

        font,

        color:
          rgb(
            0.22,
            0.27,
            0.35
          ),
      }
    );

    page.drawText(
      "et non une maquette définitive. L'objectif est simplement de rendre la piste d'amélioration plus concrète.",
      {
        x: 42,

        y:
          height - 162,

        size: 9.5,

        font,

        color:
          rgb(
            0.22,
            0.27,
            0.35
          ),
      }
    );

    /*
     * Comparatif
     */
    const leftX =
      42;

    const rightX =
      width / 2 + 10;

    const columnWidth =
      width / 2 - 52;

    const imageTop =
      height - 205;

    /*
     * Un peu plus haut que la
     * première version afin de
     * mieux valoriser la capture
     * verticale du site actuel.
     */
    const imageHeight =
      305;

    page.drawText(
      "AUJOURD'HUI",
      {
        x:
          leftX,

        y:
          imageTop + 16,

        size: 9,

        font:
          boldFont,

        color:
          rgb(
            0.35,
            0.4,
            0.5
          ),
      }
    );

    page.drawText(
      "UNE PISTE POSSIBLE",
      {
        x:
          rightX,

        y:
          imageTop + 16,

        size: 9,

        font:
          boldFont,

        color:
          rgb(
            0.1,
            0.3,
            0.9
          ),
      }
    );

    drawImageFrame(
      page,
      leftX,
      imageTop -
        imageHeight,
      columnWidth,
      imageHeight
    );

    drawImageFrame(
      page,
      rightX,
      imageTop -
        imageHeight,
      columnWidth,
      imageHeight
    );

    await drawContainedImage(
      pdf,
      page,
      beforeAsset,
      leftX + 6,
      imageTop -
        imageHeight +
        6,
      columnWidth - 12,
      imageHeight - 12
    );

    await drawContainedImage(
      pdf,
      page,
      afterAsset,
      rightX + 6,
      imageTop -
        imageHeight +
        6,
      columnWidth - 12,
      imageHeight - 12
    );

    /*
     * Mention de bas de page
     */
    page.drawText(
      "Ce document constitue un exemple de réflexion réalisé par LBMedia à partir des éléments visibles du site.",
      {
        x: 42,

        y: 28,

        size: 8.5,

        font,

        color:
          rgb(
            0.45,
            0.48,
            0.55
          ),
      }
    );

    const pdfBytes =
      await pdf.save();

    const storagePath =
      `${company.id}/${id}/proposition-lbmedia.pdf`;

    const {
      error: uploadError,
    } = await supabaseAdmin
      .storage
      .from(BUCKET)
      .upload(
        storagePath,
        pdfBytes,
        {
          contentType:
            "application/pdf",

          upsert:
            true,

          cacheControl:
            "3600",
        }
      );

    if (uploadError) {
      throw new Error(
        `Impossible d’enregistrer le PDF : ${uploadError.message}`
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

    const attachmentUrl =
      `${publicUrlData.publicUrl}?v=${Date.now()}`;

    const updated =
      await updateAuditProspection(
        id,
        {
          attachmentUrl,
        }
      );

    return NextResponse.json({
      success: true,

      attachmentUrl,

      prospection:
        updated,
    });
  } catch (error) {
    console.error(
      "Audit prospection PDF generation error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Impossible de générer le PDF.",
      },
      {
        status: 500,
      }
    );
  }
}

type ImageAsset = {
  bytes: Uint8Array;
  mimeType: string;
};

async function loadLbmediaLogo() {
  const logoPath =
    join(
      process.cwd(),
      "public",
      "brand",
      "lbmedia-logo.png"
    );

  try {
    return await readFile(
      logoPath
    );
  } catch {
    throw new Error(
      "Le logo officiel LBMedia est introuvable dans public/brand/lbmedia-logo.png."
    );
  }
}

async function fetchImage(
  url: string
): Promise<ImageAsset> {
  const response =
    await fetch(
      url,
      {
        cache:
          "no-store",
      }
    );

  if (
    !response.ok
  ) {
    throw new Error(
      "Impossible de récupérer l’un des visuels."
    );
  }

  const mimeType =
    response.headers.get(
      "content-type"
    ) ?? "";

  const bytes =
    new Uint8Array(
      await response.arrayBuffer()
    );

  return {
    bytes,
    mimeType,
  };
}

async function drawContainedImage(
  pdf: PDFDocument,
  page: ReturnType<
    PDFDocument["addPage"]
  >,
  asset: ImageAsset,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const image =
    asset.mimeType.includes(
      "png"
    )
      ? await pdf.embedPng(
          asset.bytes
        )
      : await pdf.embedJpg(
          asset.bytes
        );

  const dimensions =
    image.scale(1);

  const ratio =
    Math.min(
      width /
        dimensions.width,

      height /
        dimensions.height
    );

  const drawWidth =
    dimensions.width *
    ratio;

  const drawHeight =
    dimensions.height *
    ratio;

  page.drawImage(
    image,
    {
      x:
        x +
        (width -
          drawWidth) /
          2,

      y:
        y +
        (height -
          drawHeight) /
          2,

      width:
        drawWidth,

      height:
        drawHeight,
    }
  );
}

function drawImageFrame(
  page: ReturnType<
    PDFDocument["addPage"]
  >,
  x: number,
  y: number,
  width: number,
  height: number
) {
  page.drawRectangle({
    x,
    y,
    width,
    height,

    borderWidth: 1,

    borderColor:
      rgb(
        0.82,
        0.85,
        0.9
      ),

    color:
      rgb(
        0.98,
        0.985,
        0.995
      ),
  });
}