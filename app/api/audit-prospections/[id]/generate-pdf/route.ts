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
  pushGraphicsState,
  popGraphicsState,
  rectangle,
  clip,
  endPath,
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

type ProposalType =
  | "optimization"
  | "optimization_redesign"
  | "redesign"
  | "new_website";

type PdfProposalType =
  Exclude<
    ProposalType,
    "optimization"
  >;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ImageAsset = {
  bytes: Uint8Array;
  mimeType: string;
};

type AuditContent = {
  priorities:
    | string[]
    | null;

  weaknesses:
    | string[]
    | null;

  summary:
    | string
    | null;
};

type ImprovementPoint = {
  title: string;
  description: string;
};

type PdfMessaging = {
  title: string;
  introLine1: string;
  introLine2: string;
  currentLabel: string;
  proposalLabel: string;
  improvementTitle: string;
  improvementIntro: string;
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
          website_audit_id,
          proposal_type,
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

    const proposalType =
      normalizeProposalType(
        prospection.proposal_type
      );

    /*
     * Une optimisation seule
     * ne nécessite volontairement
     * aucun PDF.
     */
    if (
      proposalType ===
      "optimization"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Aucun PDF n’est nécessaire pour une prospection d’optimisation seule.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * La proposition visuelle est
     * toujours nécessaire dès qu'un
     * PDF doit être généré.
     */
    if (
      !prospection.after_image_url
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le visuel de proposition est nécessaire avant de générer le PDF.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Pour une optimisation + refonte
     * ou une refonte, le comparatif
     * nécessite obligatoirement
     * le site actuel.
     *
     * Pour un nouveau site,
     * la capture actuelle est facultative.
     */
    if (
      proposalType !==
        "new_website" &&
      !prospection.before_image_url
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le visuel du site actuel est nécessaire pour générer ce comparatif.",
        },
        {
          status: 400,
        }
      );
    }

    const [
      companyResult,
      auditResult,
    ] = await Promise.all([
      supabaseAdmin
        .from(
          "companies"
        )
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
        .maybeSingle(),

      prospection.website_audit_id
        ? supabaseAdmin
            .from(
              "website_audits"
            )
            .select(
              `
                priorities,
                weaknesses,
                summary
              `
            )
            .eq(
              "id",
              prospection.website_audit_id
            )
            .maybeSingle()
        : Promise.resolve({
            data: null,
            error: null,
          }),
    ]);

    if (
      companyResult.error
    ) {
      throw new Error(
        `Impossible de charger l’entreprise : ${companyResult.error.message}`
      );
    }

    const company =
      companyResult.data;

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

    if (
      auditResult.error
    ) {
      console.warn(
        "Impossible de charger le détail de l’audit pour le PDF :",
        auditResult.error.message
      );
    }

    const audit =
      (auditResult.data ??
        null) as AuditContent | null;

    const improvementPoints =
      buildImprovementPoints(
        audit
      );

    const messaging =
      getPdfMessaging(
        proposalType
      );

    /*
     * Un nouveau site peut être proposé
     * sans capture d'un site existant.
     */
    const hasCurrentVisual =
      Boolean(
        prospection.before_image_url
      );

    const [
      beforeAsset,
      afterAsset,
      logoBytes,
    ] = await Promise.all([
      prospection.before_image_url
        ? fetchImage(
            prospection.before_image_url
          )
        : Promise.resolve(
            null
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
      messaging.title,
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

    page.drawText(
      messaging.introLine1,
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
      messaging.introLine2,
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
     * Zone visuelle.
     *
     * Cas 1 :
     * site actuel + proposition
     * => comparatif deux colonnes.
     *
     * Cas 2 :
     * nouveau site sans visuel actuel
     * => proposition seule et centrée.
     */
    const imageTop =
      height - 205;

    const imageHeight =
      220;

    if (
      hasCurrentVisual &&
      beforeAsset
    ) {
      const leftX =
        42;

      const rightX =
        width / 2 + 10;

      const columnWidth =
        width / 2 - 52;

      page.drawText(
        messaging.currentLabel,
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
        messaging.proposalLabel,
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

      await drawTopCroppedImage(
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
    } else {
      /*
       * Nouveau site sans site actuel :
       * aucune colonne vide,
       * aucune mention "SITE ACTUEL".
       */
      const proposalX =
        110;

      const proposalWidth =
        width - 220;

      page.drawText(
        messaging.proposalLabel,
        {
          x:
            proposalX,
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
        proposalX,
        imageTop -
          imageHeight,
        proposalWidth,
        imageHeight
      );

      await drawContainedImage(
        pdf,
        page,
        afterAsset,
        proposalX + 6,
        imageTop -
          imageHeight +
          6,
        proposalWidth - 12,
        imageHeight - 12
      );
    }

    /*
     * Bloc des améliorations
     */
    const reasonsTop =
      imageTop -
      imageHeight -
      24;

    const reasonsX =
      42;

    const reasonsWidth =
      width - 84;

    const reasonsHeight =
      105;

    page.drawRectangle({
      x:
        reasonsX,
      y:
        reasonsTop -
        reasonsHeight,
      width:
        reasonsWidth,
      height:
        reasonsHeight,
      borderWidth:
        1,
      borderColor:
        rgb(
          0.82,
          0.87,
          0.96
        ),
      color:
        rgb(
          0.965,
          0.98,
          1
        ),
    });

    page.drawText(
      messaging.improvementTitle,
      {
        x:
          reasonsX + 14,
        y:
          reasonsTop - 20,
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

    page.drawText(
      messaging.improvementIntro,
      {
        x:
          reasonsX + 14,
        y:
          reasonsTop - 36,
        size: 8.5,
        font,
        color:
          rgb(
            0.28,
            0.33,
            0.42
          ),
      }
    );

    let bulletY =
      reasonsTop - 53;

    for (
      const point of
      improvementPoints
    ) {
      const fullText =
        `${point.title} - ${point.description}`;

      const lines =
        wrapText(
          fullText,
          font,
          8.2,
          reasonsWidth - 46
        );

      page.drawText(
        "•",
        {
          x:
            reasonsX + 16,
          y:
            bulletY,
          size:
            9,
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

      for (
        const line of
        lines.slice(
          0,
          2
        )
      ) {
        page.drawText(
          line,
          {
            x:
              reasonsX + 29,
            y:
              bulletY,
            size:
              8.2,
            font,
            color:
              rgb(
                0.2,
                0.25,
                0.34
              ),
          }
        );

        bulletY -=
          10;
      }

      bulletY -=
        3;

      if (
        bulletY <
        reasonsTop -
          reasonsHeight +
          12
      ) {
        break;
      }
    }

    /*
     * Mention de bas de page.
     */
    page.drawText(
      "Exemple non contractuel - réflexion réalisée par LBMedia à partir des éléments disponibles et des constats de l'audit.",
      {
        x: 42,
        y: 18,
        size: 8,
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

    /*
     * Le type de proposition est
     * intégré au nom du fichier.
     */
    const storagePath =
      `${company.id}/${id}/proposition-${proposalType}-lbmedia.pdf`;

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
      proposalType,
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

function normalizeProposalType(
  value: unknown
): ProposalType {
  if (
    value ===
      "optimization" ||
    value ===
      "optimization_redesign" ||
    value ===
      "redesign" ||
    value ===
      "new_website"
  ) {
    return value;
  }

  return "optimization";
}

function getPdfMessaging(
  proposalType:
    PdfProposalType
): PdfMessaging {
  switch (
    proposalType
  ) {
    case "optimization_redesign":
      return {
        title:
          "Une évolution possible pour votre site",

        introLine1:
          "Cette proposition illustre une évolution possible du site, en complément des optimisations identifiées lors de l'audit.",

        introLine2:
          "Il ne s'agit pas d'une maquette définitive, mais d'une piste permettant de visualiser une évolution plus globale de sa présentation.",

        currentLabel:
          "SITE ACTUEL",

        proposalLabel:
          "UNE ÉVOLUTION POSSIBLE",

        improvementTitle:
          "CE QUE CETTE ÉVOLUTION POURRAIT APPORTER",

        improvementIntro:
          "Cette piste montre comment les optimisations identifiées pourraient s'intégrer dans une évolution plus globale du site.",
      };

    case "redesign":
      return {
        title:
          "Une piste de refonte pour votre site",

        introLine1:
          "Cette proposition illustre une piste de refonte du site actuel à partir des constats réalisés lors de l'audit.",

        introLine2:
          "Il ne s'agit pas d'une maquette définitive, mais d'un exemple permettant de visualiser une nouvelle organisation et présentation.",

        currentLabel:
          "SITE ACTUEL",

        proposalLabel:
          "PISTE DE REFONTE",

        improvementTitle:
          "CE QU'UNE REFONTE POURRAIT AMÉLIORER",

        improvementIntro:
          "Cette piste illustre comment une refonte pourrait mieux structurer les contenus existants et renforcer l'efficacité du site.",
      };

    case "new_website":
      return {
        title:
          "Une nouvelle approche pour votre présence en ligne",

        introLine1:
          "Cette proposition illustre une direction possible pour un nouveau site construit autour de vos prestations et de vos objectifs.",

        introLine2:
          "Il ne s'agit pas d'une maquette définitive, mais d'une piste permettant de visualiser une nouvelle base de travail.",

        currentLabel:
          "SITE ACTUEL",

        proposalLabel:
          "PROPOSITION DE DIRECTION",

        improvementTitle:
          "CE QU'UN NOUVEAU SITE POURRAIT APPORTER",

        improvementIntro:
          "Cette piste montre comment une nouvelle base pourrait intégrer dès sa conception les principaux enjeux identifiés.",
      };
  }
}

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

async function embedImage(
  pdf: PDFDocument,
  asset: ImageAsset
) {
  if (
    asset.mimeType.includes(
      "png"
    )
  ) {
    return pdf.embedPng(
      asset.bytes
    );
  }

  return pdf.embedJpg(
    asset.bytes
  );
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
    await embedImage(
      pdf,
      asset
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

async function drawTopCroppedImage(
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
    await embedImage(
      pdf,
      asset
    );

  const dimensions =
    image.scale(1);

  const ratio =
    width /
    dimensions.width;

  const drawWidth =
    dimensions.width *
    ratio;

  const drawHeight =
    dimensions.height *
    ratio;

  const drawY =
    y +
    height -
    drawHeight;

  page.pushOperators(
    pushGraphicsState()
  );

  page.pushOperators(
    rectangle(
      x,
      y,
      width,
      height
    )
  );

  page.pushOperators(
    clip()
  );

  page.pushOperators(
    endPath()
  );

  page.drawImage(
    image,
    {
      x,
      y:
        drawY,
      width:
        drawWidth,
      height:
        drawHeight,
    }
  );

  page.pushOperators(
    popGraphicsState()
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

function buildImprovementPoints(
  audit:
    | AuditContent
    | null
): ImprovementPoint[] {
  const sourceText =
    [
      audit?.summary ?? "",
      ...normalizeStringArray(
        audit?.priorities
      ),
      ...normalizeStringArray(
        audit?.weaknesses
      ),
    ]
      .join(" ")
      .toLowerCase();

  const points:
    ImprovementPoint[] = [];

  const hasOffer =
    containsAny(
      sourceText,
      [
        "offre",
        "service",
        "prestation",
        "activité",
        "positionnement",
        "vocabulaire",
        "page dédiée",
        "pages dédiées",
        "contenu",
        "compréhension",
        "hiérarch",
      ]
    );

  const hasTrust =
    containsAny(
      sourceText,
      [
        "avis",
        "témoign",
        "preuve",
        "réassurance",
        "confiance",
        "réalisation",
        "cas client",
        "étude de cas",
        "référence",
        "conversion",
        "contact",
        "réservation",
        "cta",
        "appel à l'action",
        "appel à l’action",
      ]
    );

  const hasSeo =
    containsAny(
      sourceText,
      [
        "seo",
        "référencement",
        "google",
        "canonical",
        "meta description",
        "serp",
        "open graph",
        "twitter card",
        "indexation",
        "schema",
        "donnée structurée",
        "données structurées",
        "balise",
      ]
    );

  const hasLocal =
    containsAny(
      sourceText,
      [
        "local",
        "géolocal",
        "ville",
        "zone",
        "google business",
        "adresse",
        "territoire",
        "proximité",
      ]
    );

  const hasGeo =
    containsAny(
      sourceText,
      [
        "geo",
        "ia",
        "intelligence artificielle",
        "llm",
        "chatgpt",
        "moteur de réponse",
        "moteurs de réponse",
      ]
    );

  const hasMobile =
    containsAny(
      sourceText,
      [
        "mobile",
        "responsive",
        "smartphone",
        "navigation",
        "ergonomie",
        "parcours",
        "lisibilité",
      ]
    );

  if (
    hasOffer
  ) {
    points.push({
      title:
        "Une offre plus facile à comprendre",
      description:
        "mieux organiser et hiérarchiser les informations pour permettre au visiteur d'identifier rapidement les activités et prestations qui l'intéressent.",
    });
  }

  if (
    hasTrust
  ) {
    points.push({
      title:
        "Un parcours plus convaincant",
      description:
        "mieux valoriser les éléments qui rassurent et guider plus naturellement le visiteur vers les actions importantes, comme le contact ou la réservation.",
    });
  }

  if (
    hasMobile
  ) {
    points.push({
      title:
        "Une navigation plus simple",
      description:
        "rendre les informations essentielles plus accessibles et faciliter le parcours des visiteurs, notamment lorsqu'ils consultent le site sur mobile.",
    });
  }

  if (
    hasSeo
  ) {
    points.push({
      title:
        "Une meilleure visibilité sur Google",
      description:
        "renforcer la structure et la présentation des pages importantes afin qu'elles soient plus faciles à comprendre et à valoriser par les moteurs de recherche.",
    });
  }

  if (
    hasLocal
  ) {
    points.push({
      title:
        "Une présence locale mieux valorisée",
      description:
        "mettre davantage en avant la localisation, la zone d'activité et les informations utiles aux personnes qui recherchent cette offre à proximité.",
    });
  }

  if (
    hasGeo
  ) {
    points.push({
      title:
        "Des contenus plus faciles à comprendre par les moteurs et les IA",
      description:
        "structurer plus clairement les informations clés de l'entreprise afin de renforcer leur compréhension et leur capacité à être reprises dans les réponses en ligne.",
    });
  }

  if (
    points.length >= 3
  ) {
    return points.slice(
      0,
      3
    );
  }

  const fallbackPoints:
    ImprovementPoint[] = [
      {
        title:
          "Une présentation plus claire",
        description:
          "hiérarchiser davantage les informations importantes afin que le visiteur comprenne plus rapidement l'activité et les points forts de l'entreprise.",
      },
      {
        title:
          "Une meilleure mise en valeur des contenus existants",
        description:
          "donner davantage de place aux informations et visuels déjà disponibles, sans modifier la réalité de l'entreprise ni inventer de nouveaux éléments.",
      },
      {
        title:
          "Un parcours plus direct",
        description:
          "faciliter l'accès aux informations essentielles et aux actions attendues afin de rendre la consultation du site plus simple et plus efficace.",
      },
    ];

  for (
    const fallback of
    fallbackPoints
  ) {
    if (
      points.length >= 3
    ) {
      break;
    }

    if (
      !points.some(
        (point) =>
          point.title ===
          fallback.title
      )
    ) {
      points.push(
        fallback
      );
    }
  }

  return points.slice(
    0,
    3
  );
}

function containsAny(
  text: string,
  terms: string[]
) {
  return terms.some(
    (term) =>
      text.includes(
        term
      )
  );
}

function normalizeStringArray(
  value:
    | string[]
    | null
    | undefined
) {
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
        "string" &&
      Boolean(
        item.trim()
      )
  );
}

function wrapText(
  text: string,
  font: Awaited<
    ReturnType<
      PDFDocument["embedFont"]
    >
  >,
  size: number,
  maxWidth: number
) {
  const words =
    text.split(
      /\s+/
    );

  const lines:
    string[] = [];

  let currentLine =
    "";

  for (
    const word of
    words
  ) {
    const candidate =
      currentLine
        ? `${currentLine} ${word}`
        : word;

    const candidateWidth =
      font.widthOfTextAtSize(
        candidate,
        size
      );

    if (
      candidateWidth <=
      maxWidth
    ) {
      currentLine =
        candidate;

      continue;
    }

    if (
      currentLine
    ) {
      lines.push(
        currentLine
      );
    }

    currentLine =
      word;
  }

  if (
    currentLine
  ) {
    lines.push(
      currentLine
    );
  }

  return lines;
}