import {
  readFile,
} from "node:fs/promises";
import {
  join,
} from "node:path";
import {
  NextResponse,
} from "next/server";
import nodemailer from "nodemailer";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  createInitialAuditProspectionMessage,
  createResentInitialAuditProspectionMessage,
  getAuditProspectionMessages,
} from "@/lib/audit-prospection-messages";
import {
  supabaseAdmin,
} from "@/lib/supabase-admin";
export const dynamic =
  "force-dynamic";
export const runtime =
  "nodejs";
export const maxDuration = 60;
type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};
type SendRequestBody = {
  confirmedRecipientEmail?: unknown;
  sendMode?: unknown;
  attachClientReport?: unknown;
};
type ProposalType =
  | "optimization"
  | "optimization_redesign"
  | "redesign"
  | "new_website";
const SIGNATURE_LOGO_CID =
  "lbmedia-signature-logo";
function getBooleanEnv(
  value:
    | string
    | undefined
) {
  return (
    value
      ?.trim()
      .toLowerCase() ===
    "true"
  );
}
function normalizeEmail(
  value:
    | string
    | null
    | undefined
) {
  return (
    value
      ?.trim()
      .toLowerCase() ??
    ""
  );
}
function splitRecipientEmails(
  value:
    | string
    | null
    | undefined
) {
  return (
    value ?? ""
  )
    .split(/[,\n;]+/)
    .map((email) =>
      normalizeEmail(
        email
      )
    )
    .filter(Boolean);
}
function normalizeRecipientEmails(
  value:
    | string
    | null
    | undefined
) {
  return Array.from(
    new Set(
      splitRecipientEmails(
        value
      )
    )
  );
}
function canonicalRecipientEmails(
  value:
    | string
    | null
    | undefined
) {
  return normalizeRecipientEmails(
    value
  )
    .slice()
    .sort()
    .join(",");
}
function isValidEmail(
  value: string
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value
  );
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
function proposalRequiresPdf(
  proposalType: ProposalType
) {
  return (
    proposalType !==
    "optimization"
  );
}
function escapeHtml(
  value: string
) {
  return value
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}
function textToHtml(
  value: string
) {
  return value
    .split(/\r?\n/)
    .map((line) => {
      const trimmed =
        line.trim();
      if (!trimmed) {
        return `<div style="height:12px;"></div>`;
      }
      return `
        <div
          style="
            margin:0 0 10px 0;
          "
        >
          ${escapeHtml(
            line
          )}
        </div>
      `;
    })
    .join("");
}
function getPdfFilename(
  attachmentUrl: string
) {
  try {
    const url =
      new URL(
        attachmentUrl
      );
    const filename =
      url.pathname
        .split("/")
        .filter(Boolean)
        .pop();
    if (
      filename &&
      filename
        .toLowerCase()
        .endsWith(".pdf")
    ) {
      return decodeURIComponent(
        filename
      );
    }
  } catch {
    // Nom de secours ci-dessous.
  }
  return "proposition-lbmedia.pdf";
}
function getSignatureHtml() {
  return `
<table
  role="presentation"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="
    margin-top:26px;
    border-collapse:collapse;
    font-family:
      Arial,
      Helvetica,
      sans-serif;
  "
>
  <tbody>
    <tr>
      <td
        valign="middle"
        style="
          padding:4px 24px 4px 0;
        "
      >
        <img
          src="cid:${SIGNATURE_LOGO_CID}"
          alt="LBMedia"
          width="155"
          style="
            display:block;
            width:155px;
            max-width:155px;
            height:auto;
            border:0;
            outline:none;
            text-decoration:none;
          "
        />
      </td>
      <td
        valign="middle"
        style="
          border-left:2px solid #1683c5;
          padding:4px 0 4px 22px;
        "
      >
        <div
          style="
            margin:0;
            font-size:17px;
            line-height:22px;
            font-weight:700;
            color:#293b50;
          "
        >
          Laurent BARRES
        </div>
        <div
          style="
            margin:2px 0 9px 0;
            font-size:10px;
            line-height:15px;
            font-weight:700;
            letter-spacing:1px;
            color:#1683c5;
          "
        >
          DIRECTEUR
        </div>
        <div
          style="
            margin:0;
            font-size:12px;
            line-height:19px;
            color:#4b5d70;
          "
        >
          <a
            href="tel:+33680061019"
            style="
              color:#4b5d70;
              text-decoration:none;
            "
          >
            06.80.06.10.19
          </a>
        </div>
        <div
          style="
            margin:0;
            font-size:12px;
            line-height:19px;
          "
        >
          <a
            href="mailto:laurent@lbmedia.fr"
            style="
              color:#1683c5;
              text-decoration:none;
            "
          >
            laurent@lbmedia.fr
          </a>
        </div>
        <div
          style="
            margin:0;
            font-size:12px;
            line-height:19px;
          "
        >
          <a
            href="https://www.lbmedia.fr"
            style="
              color:#1683c5;
              text-decoration:none;
            "
          >
            www.lbmedia.fr
          </a>
        </div>
      </td>
    </tr>
  </tbody>
</table>
`.trim();
}
function getTextSignature() {
  return [
    "Laurent BARRES",
    "DIRECTEUR",
    "06.80.06.10.19",
    "laurent@lbmedia.fr",
    "www.lbmedia.fr",
  ].join("\n");
}
function buildHtmlContent(
  emailContent: string
) {
  return `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1"
    />
  </head>
  <body
    style="
      margin:0;
      padding:0;
      background:#ffffff;
      font-family:
        Arial,
        Helvetica,
        sans-serif;
      color:#1e293b;
    "
  >
    <div
      style="
        max-width:640px;
        margin:0;
        padding:24px;
        font-size:15px;
        line-height:1.65;
      "
    >
      ${textToHtml(
        emailContent
      )}
      ${getSignatureHtml()}
    </div>
  </body>
</html>
`.trim();
}

function toClientLanguage(value: string) {
  const lower = value.toLowerCase();

  if (
    lower.includes("hasexperiencesignal") ||
    lower.includes("hasexpertisesignal")
  ) {
    return "Mieux mettre en avant l’expérience, le savoir-faire et les éléments qui différencient l’entreprise afin de renforcer sa crédibilité auprès des visiteurs, des moteurs de recherche et des assistants IA.";
  }

  if (
    lower.includes("vocabulaire géographique") ||
    (lower.includes("occurrence") &&
      (lower.includes("local") || lower.includes("géograph")))
  ) {
    return "Renforcer les références à la zone d’intervention et aux secteurs desservis afin d’améliorer la visibilité sur les recherches locales pertinentes.";
  }

  if (lower.includes("meta description")) {
    return "Mieux présenter chaque page dans les résultats de recherche afin de donner envie de cliquer et d’aider les moteurs à comprendre son contenu.";
  }

  if (/\bh1\b/i.test(value)) {
    return "Mieux structurer les pages pour permettre aux moteurs de recherche d’identifier immédiatement leur sujet principal.";
  }

  if (
    lower.includes("json-ld") ||
    lower.includes("données structurées") ||
    lower.includes("balisage structuré")
  ) {
    return "Fournir aux moteurs de recherche et aux assistants IA des informations plus précises sur l’entreprise, ses services, sa zone d’intervention et, lorsque c’est pertinent, les avis clients.";
  }

  if (lower.includes("open graph")) {
    return "Améliorer la présentation du site lorsqu’une page est partagée sur les réseaux sociaux afin de renforcer son impact et son image.";
  }

  if (lower.includes("canonique") || lower.includes("canonical")) {
    return "Clarifier pour les moteurs de recherche quelles sont les pages principales à prendre en compte afin d’éviter les ambiguïtés.";
  }

  if (lower.includes("maillage interne")) {
    return "Créer davantage de liens pertinents entre les pages afin de faciliter la navigation des visiteurs et la compréhension du site par les moteurs de recherche.";
  }

  if (
    lower.includes("indexation") ||
    lower.includes("robots.txt") ||
    lower.includes("sitemap")
  ) {
    return "Faciliter l’exploration et la prise en compte des pages importantes du site par les moteurs de recherche.";
  }

  if (
    lower.includes("témoign") ||
    lower.includes("preuve sociale") ||
    lower.includes("avis client")
  ) {
    return "Renforcer les éléments de confiance avec davantage d’avis, de témoignages et de contenus démontrant concrètement l’expérience et le savoir-faire de l’entreprise.";
  }

  if (lower.includes("faq")) {
    return "Ajouter des réponses claires aux questions fréquentes des clients afin d’enrichir le contenu du site et de mieux répondre aux recherches courantes.";
  }

  if (lower.includes("actualités") || lower.includes("blog")) {
    return "Publier régulièrement des contenus utiles autour des services, des besoins clients et de la zone d’intervention pour développer durablement la visibilité du site.";
  }

  let result = value;
  const replacements: [RegExp, string][] = [
    [/\bCTA\b/g, "appels à l’action"],
    [/\bSERP\b/gi, "résultats de recherche"],
    [/\bOpen Graph\b/gi, "présentation sur les réseaux sociaux"],
    [/\bJSON-LD\b/gi, "informations structurées"],
    [/\bLocalBusiness\b/gi, "informations sur l’entreprise locale"],
    [/\bSchema(?:\.org)?\b/gi, "informations structurées"],
    [/\bmeta descriptions?\b/gi, "résumés affichés dans les résultats de recherche"],
    [/\bH1\b/gi, "titre principal de page"],
  ];

  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }

  return result.replace(/\s{2,}/g, " ").trim();
}

function toClientStrength(value: string) {
  const lower = value.toLowerCase();

  if (
    lower.includes("json-ld") ||
    (lower.includes("seo") &&
      (lower.includes("titre") ||
        lower.includes("meta") ||
        lower.includes("canonical") ||
        lower.includes("viewport")))
  ) {
    return "Les principaux fondamentaux techniques du référencement sont bien présents sur les pages analysées.";
  }

  let result = value;
  const replacements: [RegExp, string][] = [
    [/\bCTA(?:s)?\b/g, "appels à l’action"],
    [/\bviewport\b/gi, "adaptation aux écrans mobiles"],
    [/\bbalises canoniques?\b/gi, "indications permettant aux moteurs d’identifier les pages principales"],
    [/\bcanonical(?:es)?\b/gi, "page principale"],
    [/\bmeta descriptions?\b/gi, "résumés affichés dans les résultats de recherche"],
    [/\bH1\b/gi, "titre principal de page"],
    [/\bJSON-LD\b/gi, "informations structurées"],
    [/\bOpen Graph\b/gi, "présentation sur les réseaux sociaux"],
  ];

  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }

  return result.replace(/\s{2,}/g, " ").trim();
}

function toClientSummary(value: string) {
  const lower = value.toLowerCase();
  const parts: string[] = [];

  if (
    lower.includes("agence") ||
    lower.includes("coordonn") ||
    lower.includes("service")
  ) {
    parts.push(
      "Le site présente correctement l’activité et permet de comprendre les principaux services proposés."
    );
  } else {
    parts.push(
      "Le site dispose de bases utiles pour présenter l’activité et accompagner les visiteurs."
    );
  }

  if (
    lower.includes("meta") ||
    lower.includes("h1") ||
    lower.includes("seo") ||
    lower.includes("index")
  ) {
    parts.push(
      "Sa visibilité dans les moteurs de recherche peut toutefois être renforcée grâce à une structure de pages plus claire et à une meilleure présentation des contenus dans les résultats."
    );
  }

  if (
    lower.includes("json") ||
    lower.includes("structur") ||
    lower.includes("ia") ||
    lower.includes("open graph")
  ) {
    parts.push(
      "Des informations plus précises sur l’entreprise, ses services et sa zone d’intervention aideraient également Google et les assistants IA à mieux identifier et valoriser l’activité."
    );
  }

  if (
    lower.includes("témoign") ||
    lower.includes("avis") ||
    lower.includes("preuve") ||
    lower.includes("contenu")
  ) {
    parts.push(
      "Enfin, davantage de contenus utiles et de preuves de confiance permettraient de renforcer la crédibilité du site et son potentiel de conversion."
    );
  }

  return parts.length === 1 ? toClientLanguage(value) : parts.join(" ");
}

function sanitizePdfText(value: string) {
  return value
    .replaceAll("’", "'")
    .replaceAll("“", '"')
    .replaceAll("”", '"')
    .replaceAll("–", "-")
    .replaceAll("—", "-")
    .replaceAll("•", "-")
    .replaceAll("·", "-")
    .replace(/\s+/g, " ")
    .trim();
}

function wrapPdfText(
  text: string,
  font: { widthOfTextAtSize: (text: string, size: number) => number },
  size: number,
  maxWidth: number
) {
  const words = sanitizePdfText(text).split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }

  if (line) lines.push(line);
  return lines;
}

async function generateClientReportPdf({
  companyName,
  audit,
  diagnosis,
}: {
  companyName: string;
  audit: any;
  diagnosis: any;
}) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 46;
  const contentWidth = pageWidth - margin * 2;
  const blue = rgb(0.086, 0.435, 0.773);
  const dark = rgb(0.09, 0.13, 0.2);
  const gray = rgb(0.34, 0.39, 0.47);
  const light = rgb(0.95, 0.97, 0.99);

  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const ensureSpace = (needed: number) => {
    if (y - needed < margin) {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  };

  const drawText = (
    value: string,
    options: {
      size?: number;
      font?: typeof regular;
      color?: ReturnType<typeof rgb>;
      indent?: number;
      gapAfter?: number;
      maxWidth?: number;
    } = {}
  ) => {
    const size = options.size ?? 10;
    const font = options.font ?? regular;
    const color = options.color ?? dark;
    const indent = options.indent ?? 0;
    const gapAfter = options.gapAfter ?? 7;
    const maxWidth = options.maxWidth ?? contentWidth - indent;
    const lines = wrapPdfText(value, font, size, maxWidth);
    const lineHeight = size * 1.42;
    ensureSpace(lines.length * lineHeight + gapAfter);
    for (const line of lines) {
      page.drawText(line, {
        x: margin + indent,
        y,
        size,
        font,
        color,
      });
      y -= lineHeight;
    }
    y -= gapAfter;
  };

  const heading = (value: string) => {
    ensureSpace(34);
    y -= 4;
    drawText(value, {
      size: 16,
      font: bold,
      color: dark,
      gapAfter: 10,
    });
  };

  const bulletList = (items: string[]) => {
    for (const item of items) {
      ensureSpace(28);
      page.drawText("-", {
        x: margin + 2,
        y,
        size: 10,
        font: bold,
        color: blue,
      });
      const lines = wrapPdfText(item, regular, 10, contentWidth - 22);
      for (const line of lines) {
        page.drawText(line, {
          x: margin + 18,
          y,
          size: 10,
          font: regular,
          color: dark,
        });
        y -= 14;
      }
      y -= 5;
    }
    y -= 4;
  };

  page.drawRectangle({
    x: 0,
    y: pageHeight - 150,
    width: pageWidth,
    height: 150,
    color: dark,
  });
  page.drawText("LBMedia", {
    x: margin,
    y: pageHeight - 62,
    size: 13,
    font: bold,
    color: blue,
  });
  page.drawText("Audit de visibilité digitale", {
    x: margin,
    y: pageHeight - 91,
    size: 23,
    font: bold,
    color: rgb(1, 1, 1),
  });
  page.drawText(`Compte rendu pour ${sanitizePdfText(companyName)}`, {
    x: margin,
    y: pageHeight - 118,
    size: 11,
    font: regular,
    color: rgb(0.82, 0.86, 0.91),
  });
  y = pageHeight - 180;

  drawText(`Site analysé : ${audit.website_url}`, { size: 9, color: gray, gapAfter: 3 });
  drawText(
    `Périmètre : ${audit.pages_analyzed} ${audit.pages_analyzed > 1 ? "pages analysées" : "page analysée"}`,
    { size: 9, color: gray, gapAfter: 12 }
  );

  page.drawRectangle({
    x: margin,
    y: y - 72,
    width: contentWidth,
    height: 72,
    color: light,
  });
  page.drawText("SCORE GLOBAL", {
    x: margin + 18,
    y: y - 25,
    size: 9,
    font: bold,
    color: gray,
  });
  page.drawText(`${audit.global_score}/100`, {
    x: margin + 18,
    y: y - 52,
    size: 22,
    font: bold,
    color: dark,
  });
  y -= 92;

  heading("Votre site aujourd'hui");
  drawText(toClientSummary(audit.summary), { size: 10, color: gray, gapAfter: 12 });

  heading("Les 5 indicateurs");
  const scores = [
    ["Positionnement", audit.positioning_score],
    ["Conversion", audit.conversion_score],
    ["SEO", audit.seo_score],
    ["SEO local", audit.local_seo_score],
    ["GEO / IA", audit.geo_score],
  ];
  for (const [label, score] of scores) {
    drawText(`${label} : ${score}/100`, { size: 10, font: bold, gapAfter: 3 });
  }
  y -= 6;

  heading("Ce qui fonctionne bien");
  const strengths = (audit.strengths ?? []).slice(0, 4).map(toClientStrength);
  if (strengths.length) bulletList(strengths);
  else drawText("Aucun point fort spécifique n'a été isolé lors de cette analyse.", { color: gray });

  heading("Ce qui mérite d'être amélioré");
  const improvements = (audit.weaknesses ?? []).slice(0, 5).map(toClientLanguage);
  if (improvements.length) bulletList(improvements);
  else drawText("Aucun point d'amélioration prioritaire n'a été identifié.", { color: gray });

  heading("Visibilité Google & IA");
  drawText(
    "La visibilité d'un site ne dépend plus uniquement de son référencement classique. Les moteurs de recherche, les résultats locaux et les assistants utilisant l'intelligence artificielle s'appuient sur la qualité, la précision et la structure des informations disponibles pour comprendre une entreprise, ses prestations et sa zone d'intervention.",
    { color: gray, gapAfter: 10 }
  );

  drawText("Visibilité & acquisition", { font: bold, gapAfter: 5 });
  const visibilityIssues = (diagnosis?.weaknesses?.visibility ?? []).slice(0, 4).map(toClientLanguage);
  if (visibilityIssues.length) bulletList(visibilityIssues);
  else drawText("Les fondamentaux de visibilité relevés lors de l'audit sont globalement satisfaisants.", { color: gray });

  drawText("Site & parcours", { font: bold, gapAfter: 5 });
  const websiteIssues = (diagnosis?.weaknesses?.website ?? []).slice(0, 4).map(toClientLanguage);
  if (websiteIssues.length) bulletList(websiteIssues);
  else drawText("Aucun frein majeur lié au parcours du site n'a été isolé dans cette analyse.", { color: gray });

  drawText(
    "Le score GEO / IA évalue ici les signaux présents sur le site qui facilitent la compréhension de l'entreprise par les moteurs et assistants IA. Il ne constitue pas une mesure de présence effective dans toutes les réponses générées par ces services.",
    { size: 8.5, color: gray, gapAfter: 12 }
  );

  heading("Les actions à privilégier");
  const priorities = (audit.priorities ?? []).slice(0, 3).map(toClientLanguage);
  if (priorities.length) {
    priorities.forEach((priority: string, index: number) => {
      drawText(`${index + 1}. ${priority}`, { size: 10, gapAfter: 7 });
    });
  } else {
    drawText("Aucune priorité spécifique n'a été enregistrée pour cet audit.", { color: gray });
  }

  heading("Et maintenant ?");
  drawText(
    "Cet audit permet d'identifier les principaux leviers d'amélioration du site. LBMedia peut vous accompagner pour définir les actions les plus adaptées à vos objectifs : optimisation du site, amélioration du référencement et de la visibilité locale, renforcement de la présence dans les environnements de recherche et d'IA, ou évolution plus globale du site lorsque cela est pertinent.",
    { color: gray, gapAfter: 8 }
  );
  drawText("LBMedia - Sites internet - SEO - GEO / IA", {
    font: bold,
    color: blue,
    gapAfter: 14,
  });

  drawText(
    "Audit réalisé à partir des éléments accessibles sur le site au moment de l'analyse. Certaines données externes ou privées peuvent nécessiter des vérifications complémentaires.",
    { size: 8, color: gray, gapAfter: 0 }
  );

  const pages = pdf.getPages();
  pages.forEach((currentPage, index) => {
    currentPage.drawText(`LBMedia - Audit de visibilité digitale - ${index + 1}/${pages.length}`, {
      x: margin,
      y: 20,
      size: 7.5,
      font: regular,
      color: rgb(0.55, 0.59, 0.65),
    });
  });

  return Buffer.from(await pdf.save());
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const smtpHost =
      process.env
        .OVH_SMTP_HOST
        ?.trim();
    const smtpPort =
      Number(
        process.env
          .OVH_SMTP_PORT ??
          "587"
      );
    const smtpSecure =
      getBooleanEnv(
        process.env
          .OVH_SMTP_SECURE
      );
    const smtpUser =
      process.env
        .OVH_SMTP_USER
        ?.trim();
    const smtpPassword =
      process.env
        .OVH_SMTP_PASSWORD;
    const smtpFromName =
      process.env
        .OVH_SMTP_FROM_NAME
        ?.trim() ||
      "Laurent Barrès - LBMedia";
    if (
      !smtpHost ||
      !smtpUser ||
      !smtpPassword
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "La configuration SMTP OVH est incomplète.",
        },
        {
          status: 500,
        }
      );
    }
    if (
      !Number.isFinite(
        smtpPort
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le port SMTP OVH est invalide.",
        },
        {
          status: 500,
        }
      );
    }
    let body:
      | SendRequestBody
      | null = null;
    try {
      body =
        (await request.json()) as SendRequestBody;
    } catch {
      body =
        null;
    }
    const sendMode = body?.sendMode === undefined ? "initial" : body.sendMode;
    if (sendMode !== "initial" && sendMode !== "resend") return NextResponse.json({ success: false, message: "Mode d’envoi invalide." }, { status: 400 });
    const isResend = sendMode === "resend";
    const attachClientReport =
      body?.attachClientReport === true;
    const confirmedRecipientValue =
      typeof body
        ?.confirmedRecipientEmail ===
      "string"
        ? body.confirmedRecipientEmail
        : "";
    const confirmedRecipientEmails =
      normalizeRecipientEmails(
        confirmedRecipientValue
      );
    const confirmedRecipientsCanonical =
      canonicalRecipientEmails(
        confirmedRecipientValue
      );
    if (
      confirmedRecipientEmails.length ===
        0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Confirmation des destinataires manquante. Envoi annulé.",
        },
        {
          status: 400,
        }
      );
    }
    const invalidConfirmedRecipient =
      confirmedRecipientEmails.find(
        (email) =>
          !isValidEmail(
            email
          )
      );
    if (
      invalidConfirmedRecipient
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            `Adresse e-mail destinataire invalide : ${invalidConfirmedRecipient}`,
        },
        {
          status: 400,
        }
      );
    }
    const {
      id,
    } = await context.params;
    const {
      data:
        prospection,
      error:
        prospectionError,
    } = await supabaseAdmin
      .from(
        "audit_prospections"
      )
      .select(
        `
          id,
          company_id,
          website_audit_id,
          status,
          proposal_type,
          recipient_email,
          recipient_name,
          subject,
          email_content,
          attachment_url,
          sent_at,
          follow_up_at
        `
      )
      .eq(
        "id",
        id
      )
      .maybeSingle();
    if (
      prospectionError
    ) {
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
    if (isResend) {
      if (!prospection.sent_at) return NextResponse.json({ success: false, message: "Cette prospection n’a pas encore été envoyée. Utilisez l’envoi initial." }, { status: 409 });
      if (prospection.status !== "sent" && prospection.status !== "follow_up") return NextResponse.json({ success: false, message: "Cette prospection ne peut pas être renvoyée dans son état actuel." }, { status: 409 });
      const messages = await getAuditProspectionMessages(prospection.id);
      if (messages.some((item) => item.message_type === "follow_up")) return NextResponse.json({ success: false, message: "Une relance a déjà été envoyée. Le renvoi de l’audit initial n’est plus disponible." }, { status: 409 });
      if (prospection.follow_up_at) {
        const followUpTime = new Date(prospection.follow_up_at).getTime();
        if (Number.isNaN(followUpTime) || followUpTime <= Date.now()) return NextResponse.json({ success: false, message: "La relance programmée est arrivée à échéance. Utilisez l’action de relance." }, { status: 409 });
      }
    } else {
      if (prospection.status === "sent" || prospection.sent_at) return NextResponse.json({ success: false, message: "Cette prospection a déjà été envoyée." }, { status: 409 });
      if (prospection.status !== "ready") return NextResponse.json({ success: false, message: "La prospection n’est pas au statut Prête. Envoi annulé." }, { status: 409 });
    }
    const proposalType =
      normalizeProposalType(
        prospection.proposal_type
      );
    const requiresPdf =
      proposalRequiresPdf(
        proposalType
      );
    const recipientEmail =
      prospection
        .recipient_email
        ?.trim();
    const recipientEmails =
      normalizeRecipientEmails(
        recipientEmail
      );
    const storedRecipientsCanonical =
      canonicalRecipientEmails(
        recipientEmail
      );
    if (
      recipientEmails.length ===
        0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Aucune adresse e-mail destinataire n'est enregistrée.",
        },
        {
          status: 400,
        }
      );
    }
    const invalidStoredRecipient =
      recipientEmails.find(
        (email) =>
          !isValidEmail(
            email
          )
      );
    if (
      invalidStoredRecipient
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            `Adresse e-mail destinataire invalide : ${invalidStoredRecipient}`,
        },
        {
          status: 400,
        }
      );
    }
    if (
      storedRecipientsCanonical !==
      confirmedRecipientsCanonical
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Sécurité : les destinataires confirmés ne correspondent pas aux destinataires actuellement enregistrés. Aucun email n’a été envoyé.",
          storedRecipientEmail:
            recipientEmail,
        },
        {
          status: 409,
        }
      );
    }
    const recipientName =
      prospection
        .recipient_name
        ?.trim();
    const subject =
      prospection
        .subject
        ?.trim();
    const emailContent =
      prospection
        .email_content
        ?.trim();
    const storedAttachmentUrl =
      prospection
        .attachment_url
        ?.trim() ||
      null;
    const attachmentUrl =
      requiresPdf
        ? storedAttachmentUrl
        : null;
    if (
      !subject
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "L'objet de l'e-mail est vide.",
        },
        {
          status: 400,
        }
      );
    }
    if (
      !emailContent
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le contenu de l'e-mail est vide.",
        },
        {
          status: 400,
        }
      );
    }
    if (
      requiresPdf &&
      !attachmentUrl
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Cette proposition nécessite un PDF. Générez la projection avant l’envoi.",
        },
        {
          status: 400,
        }
      );
    }
    let clientReportBuffer:
      | Buffer
      | null = null;
    let clientReportFilename:
      | string
      | null = null;

    if (attachClientReport) {
      const [
        auditResult,
        companyResult,
      ] = await Promise.all([
        supabaseAdmin
          .from("website_audits")
          .select("*")
          .eq(
            "id",
            prospection.website_audit_id
          )
          .maybeSingle(),
        supabaseAdmin
          .from("companies")
          .select("id, name")
          .eq(
            "id",
            prospection.company_id
          )
          .maybeSingle(),
      ]);

      if (
        auditResult.error ||
        !auditResult.data
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Impossible de charger l’audit pour générer le compte rendu client. Aucun email n’a été envoyé.",
          },
          {
            status: 500,
          }
        );
      }

      if (
        companyResult.error ||
        !companyResult.data
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Impossible de charger l’entreprise pour générer le compte rendu client. Aucun email n’a été envoyé.",
          },
          {
            status: 500,
          }
        );
      }

      const auditData =
        auditResult.data as any;

      const visibilityKeywords =
        [
          "seo",
          "local",
          "google",
          "index",
          "meta",
          "h1",
          "json",
          "structur",
          "ia",
          "geo",
          "recherche",
          "sitemap",
          "robots",
        ];

      const visibility: string[] =
        [];
      const website: string[] =
        [];

      for (
        const weakness of
        (auditData.weaknesses ??
          []) as string[]
      ) {
        const lower =
          weakness.toLowerCase();
        if (
          visibilityKeywords.some(
            (keyword) =>
              lower.includes(
                keyword
              )
          )
        ) {
          visibility.push(
            weakness
          );
        } else {
          website.push(
            weakness
          );
        }
      }

      clientReportBuffer =
        await generateClientReportPdf({
          companyName:
            companyResult.data
              .name ||
            "Entreprise",
          audit:
            auditData,
          diagnosis: {
            weaknesses: {
              visibility,
              website,
            },
          },
        });

      const safeCompanyName =
        String(
          companyResult.data
            .name ||
            "client"
        )
          .normalize("NFD")
          .replace(
            /[̀-ͯ]/g,
            ""
          )
          .replace(
            /[^a-zA-Z0-9]+/g,
            "-"
          )
          .replace(
            /^-+|-+$/g,
            ""
          )
          .toLowerCase();

      clientReportFilename =
        `audit-visibilite-${safeCompanyName || "client"}.pdf`;
    }

    const {
      data:
        securityCheck,
      error:
        securityCheckError,
    } = await supabaseAdmin
      .from(
        "audit_prospections"
      )
      .select(
        `
          id,
          status,
          proposal_type,
          recipient_email,
          subject,
          email_content,
          attachment_url,
          sent_at,
          follow_up_at
        `
      )
      .eq(
        "id",
        prospection.id
      )
      .maybeSingle();
    if (
      securityCheckError ||
      !securityCheck
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Impossible de vérifier les informations avant l’envoi. Aucun email n’a été envoyé.",
        },
        {
          status: 500,
        }
      );
    }
    if (isResend) {
      if (!securityCheck.sent_at || (securityCheck.status !== "sent" && securityCheck.status !== "follow_up")) return NextResponse.json({ success: false, message: "Le suivi de cette prospection a changé. Aucun email n’a été envoyé." }, { status: 409 });
      const securityMessages = await getAuditProspectionMessages(prospection.id);
      if (securityMessages.some((item) => item.message_type === "follow_up")) return NextResponse.json({ success: false, message: "Une relance a déjà été envoyée. Aucun renvoi de l’audit initial n’a été effectué." }, { status: 409 });
      if (securityCheck.follow_up_at) {
        const securityFollowUpTime = new Date(securityCheck.follow_up_at).getTime();
        if (Number.isNaN(securityFollowUpTime) || securityFollowUpTime <= Date.now()) return NextResponse.json({ success: false, message: "La relance programmée est arrivée à échéance. Aucun renvoi n’a été effectué." }, { status: 409 });
      }
    } else {
      if (securityCheck.status === "sent" || securityCheck.sent_at) return NextResponse.json({ success: false, message: "Cette prospection est déjà enregistrée comme envoyée." }, { status: 409 });
      if (securityCheck.status !== "ready") return NextResponse.json({ success: false, message: "Le statut de la prospection a changé. Aucun email n’a été envoyé." }, { status: 409 });
    }
    if (
      canonicalRecipientEmails(
        securityCheck.recipient_email
      ) !==
      confirmedRecipientsCanonical
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Sécurité : les destinataires enregistrés ont changé depuis la confirmation. Aucun email n’a été envoyé.",
        },
        {
          status: 409,
        }
      );
    }
    const securityProposalType =
      normalizeProposalType(
        securityCheck.proposal_type
      );
    if (
      securityProposalType !==
      proposalType
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Sécurité : le type de proposition a changé avant l’envoi. Rechargez la fiche avant de poursuivre.",
        },
        {
          status: 409,
        }
      );
    }
    const securityAttachmentUrl =
      securityCheck
        .attachment_url
        ?.trim() ||
      null;
    if (
      securityCheck.subject
        ?.trim() !==
        subject ||
      securityCheck.email_content
        ?.trim() !==
        emailContent
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Sécurité : le contenu de la prospection a changé avant l’envoi. Rechargez la fiche et vérifiez le message.",
        },
        {
          status: 409,
        }
      );
    }
    if (
      requiresPdf &&
      securityAttachmentUrl !==
        attachmentUrl
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Sécurité : le PDF de la proposition a changé avant l’envoi. Rechargez la fiche et vérifiez la pièce jointe.",
        },
        {
          status: 409,
        }
      );
    }
    let attachmentBuffer:
      | Buffer
      | null = null;
    if (
      requiresPdf &&
      attachmentUrl
    ) {
      const attachmentResponse =
        await fetch(
          attachmentUrl,
          {
            cache:
              "no-store",
          }
        );
      if (
        !attachmentResponse.ok
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Impossible de récupérer le PDF à joindre.",
          },
          {
            status: 502,
          }
        );
      }
      attachmentBuffer =
        Buffer.from(
          await attachmentResponse.arrayBuffer()
        );
      if (
        attachmentBuffer.length ===
        0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Le PDF à joindre est vide.",
          },
          {
            status: 400,
          }
        );
      }
    }
    const signatureLogoPath =
      join(
        process.cwd(),
        "public",
        "brand",
        "lbmedia-logo.png"
      );
    let signatureLogoBuffer:
      | Buffer
      | null = null;
    try {
      signatureLogoBuffer =
        await readFile(
          signatureLogoPath
        );
    } catch (logoError) {
      console.error(
        "Impossible de charger le logo de signature LBMedia",
        logoError
      );
      return NextResponse.json(
        {
          success: false,
          message:
            "Impossible de charger le logo de la signature LBMedia. Aucun email n’a été envoyé.",
        },
        {
          status: 500,
        }
      );
    }
    const transporter =
      nodemailer.createTransport({
        host:
          smtpHost,
        port:
          smtpPort,
        secure:
          smtpSecure,
        auth: {
          user:
            smtpUser,
          pass:
            smtpPassword,
        },
        tls: {
          minVersion:
            "TLSv1.2",
        },
      });
    await transporter.verify();
    const htmlContent =
      buildHtmlContent(
        emailContent
      );
    const textContent =
      `${emailContent}\n\n${getTextSignature()}`;
    const attachments:
      Parameters<
        typeof transporter.sendMail
      >[0]["attachments"] =
      [];
    if (
      requiresPdf &&
      attachmentUrl &&
      attachmentBuffer
    ) {
      attachments.push({
        filename:
          getPdfFilename(
            attachmentUrl
          ),
        content:
          attachmentBuffer,
        contentType:
          "application/pdf",
      });
    }
    if (
      attachClientReport &&
      clientReportBuffer &&
      clientReportFilename
    ) {
      attachments.push({
        filename:
          clientReportFilename,
        content:
          clientReportBuffer,
        contentType:
          "application/pdf",
      });
    }

    attachments.push({
      filename:
        "lbmedia-logo.png",
      content:
        signatureLogoBuffer,
      contentType:
        "image/png",
      cid:
        SIGNATURE_LOGO_CID,
      contentDisposition:
        "inline",
    });
    const sendResult =
      await transporter.sendMail({
        from: {
          name:
            smtpFromName,
          address:
            smtpUser,
        },
        to:
          recipientEmails.length ===
            1 &&
          recipientName
            ? {
                name:
                  recipientName,
                address:
                  recipientEmails[0],
              }
            : recipientEmails,
        replyTo:
          smtpUser,
        subject,
        text:
          textContent,
        html:
          htmlContent,
        attachments,
        headers: {
          "X-LBMedia-Office":
            "audit-prospection",
          "X-LBMedia-Prospection-ID":
            prospection.id,
          "X-LBMedia-Company-ID":
            prospection.company_id,
          "X-LBMedia-Audit-ID":
            prospection.website_audit_id,
          "X-LBMedia-Proposal-Type":
            proposalType,
          "X-LBMedia-Client-Report":
            attachClientReport
              ? "attached"
              : "not-attached",
        },
      });
    const accepted =
      sendResult.accepted.map(
        (address) =>
          normalizeEmail(
            String(
              address
            )
          )
      );
    const rejectedRecipients =
      recipientEmails.filter(
        (recipient) =>
          !accepted.includes(
            recipient
          )
      );
    if (
      rejectedRecipients.length >
      0
    ) {
      console.error(
        "SMTP n'a pas accepté tous les destinataires",
        {
          prospectionId:
            prospection.id,
          proposalType,
          recipientEmails,
          rejectedRecipients,
          accepted:
            sendResult.accepted,
          rejected:
            sendResult.rejected,
          response:
            sendResult.response,
        }
      );
      return NextResponse.json(
        {
          success: false,
          message:
            `Le serveur SMTP n’a pas confirmé l’acceptation de tous les destinataires (${rejectedRecipients.join(
              ", "
            )}). Le statut n’a pas été modifié.`,
          messageId:
            sendResult.messageId,
        },
        {
          status: 502,
        }
      );
    }
    const sentAt =
      new Date()
        .toISOString();
    if (isResend) {
      let archivedMessage = null;
      try {
        archivedMessage = await createResentInitialAuditProspectionMessage({ auditProspectionId: prospection.id, recipientEmail: recipientEmails.join(", "), subject, emailContent, htmlContent, attachmentUrl, smtpMessageId: sendResult.messageId ?? null, sentAt });
      } catch (historyError) {
        console.error("Audit renvoyé mais historique commercial non créé", historyError);
        return NextResponse.json({ success: false, sent: true, message: "L’audit a été renvoyé, mais son archivage a échoué. Ne renvoyez pas l’email.", messageId: sendResult.messageId, sentAt }, { status: 500 });
      }
      return NextResponse.json({ success: true, resend: true, message: "Audit renvoyé avec succès. La date de relance reste inchangée.", messageId: sendResult.messageId, sentAt, sequenceNumber: archivedMessage.sequence_number, recipientEmail: recipientEmails.join(", ") });
    }
    const {
      error: auditStatusError,
    } = await supabaseAdmin
      .from(
        "website_audits"
      )
      .update({
        status: "sent",
      })
      .eq(
        "id",
        prospection.website_audit_id
      )
      .neq(
        "status",
        "completed"
      );
    if (auditStatusError) {
      console.error(
        "Prospection envoyée mais statut de l’audit non mis à jour",
        {
          prospectionId:
            prospection.id,
          auditId:
            prospection.website_audit_id,
          error:
            auditStatusError.message,
        }
      );
    }
    const {
      data:
        updated,
      error:
        updateError,
    } = await supabaseAdmin
      .from(
        "audit_prospections"
      )
      .update({
        status:
          "sent",
        sent_at:
          sentAt,
        sent_subject:
          subject,
        sent_email_content:
          emailContent,
        sent_html_content:
          htmlContent,
        sent_attachment_url:
          attachmentUrl,
        smtp_message_id:
          sendResult.messageId ??
          null,
        updated_at:
          sentAt,
      })
      .eq(
        "id",
        prospection.id
      )
      .eq(
        "status",
        "ready"
      )
      .eq(
        "recipient_email",
        recipientEmail
      )
      .select("\\*")
      .maybeSingle();
    if (
      updateError ||
      !updated
    ) {
      console.error(
        "E-mail envoyé mais statut non enregistré",
        {
          prospectionId:
            prospection.id,
          proposalType,
          messageId:
            sendResult.messageId,
          recipients:
            recipientEmails,
          accepted:
            sendResult.accepted,
          rejected:
            sendResult.rejected,
          response:
            sendResult.response,
          error:
            updateError
              ?.message ??
            "Mise à jour refusée par la vérification de sécurité.",
        }
      );
      return NextResponse.json(
        {
          success: false,
          sent: true,
          message:
            "L'e-mail a été accepté par le serveur SMTP, mais LBMedia Office n'a pas réussi à enregistrer le statut Envoyée. Ne renvoyez pas l'e-mail.",
          messageId:
            sendResult.messageId,
        },
        {
          status: 500,
        }
      );
    }
    try {
      await createInitialAuditProspectionMessage({
        auditProspectionId:
          prospection.id,
        recipientEmail,
        subject,
        emailContent,
        htmlContent,
        attachmentUrl,
        smtpMessageId:
          sendResult.messageId ??
          null,
        sentAt,
      });
    } catch (
      historyError
    ) {
      console.error(
        "E-mail envoyé et archivé, mais historique commercial non créé",
        {
          prospectionId:
            prospection.id,
          proposalType,
          messageId:
            sendResult.messageId,
          sentAt,
          error:
            historyError instanceof Error
              ? historyError.message
              : historyError,
        }
      );
    }
    console.info(
      "Prospection audit envoyée",
      {
        prospectionId:
          prospection.id,
        companyId:
          prospection.company_id,
        auditId:
          prospection.website_audit_id,
        proposalType,
        pdfAttached:
          requiresPdf,
        recipient:
          recipientEmail,
        sentAt,
        messageId:
          sendResult.messageId,
        accepted:
          sendResult.accepted,
        rejected:
          sendResult.rejected,
        response:
          sendResult.response,
      }
    );
    return NextResponse.json({
      success: true,
      message:
        "E-mail envoyé avec succès.",
      messageId:
        sendResult.messageId,
      sentAt,
      recipientEmail:
        recipientEmails.join(
          ", "
        ),
      recipientEmails,
      proposalType,
      pdfAttached:
        requiresPdf,
      prospection:
        updated,
    });
  } catch (error) {
    console.error(
      "Erreur envoi prospection audit",
      error
    );
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Une erreur est survenue pendant l'envoi de l'e-mail.",
      },
      {
        status: 500,
      }
    );
  }
}
