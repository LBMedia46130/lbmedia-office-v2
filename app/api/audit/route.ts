import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type AuditResult = {
  globalScore: number;
  positioningScore: number;
  conversionScore: number;
  seoScore: number;
  localSeoScore: number;
  geoScore: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  priorities: string[];
};

function normalizeUrl(value: string) {
  const trimmed = value.trim();

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function cleanHtml(html: string) {
  return html
    .replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      " "
    )
    .replace(
      /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
      " "
    )
    .replace(
      /<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi,
      " "
    )
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html: string) {
  const match = html.match(
    /<title[^>]*>([\s\S]*?)<\/title>/i
  );

  return match
    ? cleanHtml(match[1])
    : null;
}

function extractMetaDescription(html: string) {
  const patterns = [
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

function extractHeadings(html: string) {
  const headings: string[] = [];

  const matches = html.matchAll(
    /<(h1|h2|h3)[^>]*>([\s\S]*?)<\/\1>/gi
  );

  for (const match of matches) {
    const text = cleanHtml(match[2]);

    if (text) {
      headings.push(
        `${match[1].toUpperCase()} : ${text}`
      );
    }

    if (headings.length >= 40) {
      break;
    }
  }

  return headings;
}

function extractLinks(html: string) {
  const links: string[] = [];

  const matches = html.matchAll(
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  );

  for (const match of matches) {
    const text = cleanHtml(match[2]);

    if (text) {
      links.push(text);
    }

    if (links.length >= 50) {
      break;
    }
  }

  return links;
}

function hasJsonLd(html: string) {
  return /application\/ld\+json/i.test(html);
}

function hasCanonical(html: string) {
  return /<link[^>]+rel=["']canonical["']/i.test(
    html
  );
}

function hasViewport(html: string) {
  return /<meta[^>]+name=["']viewport["']/i.test(
    html
  );
}

function hasOpenGraph(html: string) {
  return /property=["']og:/i.test(html);
}

function numberBetween0And100(value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(100, Math.round(number))
  );
}

function validateAudit(
  value: unknown
): AuditResult {
  if (
    !value ||
    typeof value !== "object"
  ) {
    throw new Error(
      "Le résultat retourné par l’IA est invalide."
    );
  }

  const data = value as Record<
    string,
    unknown
  >;

  return {
    globalScore: numberBetween0And100(
      data.globalScore
    ),
    positioningScore:
      numberBetween0And100(
        data.positioningScore
      ),
    conversionScore:
      numberBetween0And100(
        data.conversionScore
      ),
    seoScore: numberBetween0And100(
      data.seoScore
    ),
    localSeoScore:
      numberBetween0And100(
        data.localSeoScore
      ),
    geoScore: numberBetween0And100(
      data.geoScore
    ),
    summary:
      typeof data.summary === "string"
        ? data.summary
        : "",
    strengths: Array.isArray(
      data.strengths
    )
      ? data.strengths.filter(
          (
            item
          ): item is string =>
            typeof item === "string"
        )
      : [],
    weaknesses: Array.isArray(
      data.weaknesses
    )
      ? data.weaknesses.filter(
          (
            item
          ): item is string =>
            typeof item === "string"
        )
      : [],
    priorities: Array.isArray(
      data.priorities
    )
      ? data.priorities.filter(
          (
            item
          ): item is string =>
            typeof item === "string"
        )
      : [],
  };
}

export async function POST(
  request: NextRequest
) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        success: false,
        message:
          "La clé OpenAI n’est pas configurée.",
      },
      {
        status: 500,
      }
    );
  }

  try {
    const body = await request.json();

    const rawUrl =
      typeof body.url === "string"
        ? body.url
        : "";

    if (!rawUrl.trim()) {
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

    const url = normalizeUrl(rawUrl);

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json(
        {
          success: false,
          message:
            "L’URL renseignée n’est pas valide.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !["http:", "https:"].includes(
        parsedUrl.protocol
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Seules les adresses HTTP et HTTPS sont acceptées.",
        },
        {
          status: 400,
        }
      );
    }

    const websiteResponse =
      await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; LBMediaOffice/2.1; WebsiteAudit)",
          Accept:
            "text/html,application/xhtml+xml",
        },
        redirect: "follow",
        signal:
          AbortSignal.timeout(15000),
      });

    if (!websiteResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          message: `Le site a répondu avec le code ${websiteResponse.status}.`,
        },
        {
          status: 400,
        }
      );
    }

    const contentType =
      websiteResponse.headers.get(
        "content-type"
      ) ?? "";

    if (
      !contentType.includes("text/html")
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "L’adresse indiquée ne semble pas correspondre à une page web HTML.",
        },
        {
          status: 400,
        }
      );
    }

    const html =
      await websiteResponse.text();

    const title =
      extractTitle(html);

    const metaDescription =
      extractMetaDescription(html);

    const headings =
      extractHeadings(html);

    const linkLabels =
      extractLinks(html);

    const visibleText =
      cleanHtml(html).slice(
        0,
        24000
      );

    if (visibleText.length < 150) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le contenu de cette page est trop limité pour réaliser une analyse pertinente.",
        },
        {
          status: 400,
        }
      );
    }

    const technicalSignals = {
      canonical: hasCanonical(html),
      viewport: hasViewport(html),
      openGraph: hasOpenGraph(html),
      structuredData:
        hasJsonLd(html),
      titlePresent: Boolean(title),
      metaDescriptionPresent:
        Boolean(metaDescription),
      headingCount:
        headings.length,
    };

    const prompt = `
Tu réalises un pré-audit professionnel de site internet pour LBMedia, agence de communication spécialisée notamment dans la création de sites internet, le SEO, la visibilité locale et la communication.

L'objectif n'est PAS de vendre artificiellement une prestation.
Tu dois analyser uniquement ce qui est réellement observable dans les données fournies.

IMPORTANT :
- Ne prétends jamais avoir mesuré ce qui n'a pas été mesuré.
- Tu n'as PAS accès aux Core Web Vitals, PageSpeed Insights, Search Console, Analytics, backlinks, positions Google réelles ou fiche Google Business.
- Si une information manque, n'invente rien.
- L'analyse doit rester utile commercialement, mais crédible et factuelle.
- Le ton doit être professionnel, mature, concret et compréhensible par un dirigeant de PME.
- Ne sois ni excessivement sévère, ni complaisant.

SITE ANALYSÉ :
URL : ${url}

TITRE HTML :
${title ?? "Non trouvé"}

META DESCRIPTION :
${metaDescription ?? "Non trouvée"}

SIGNAUX TECHNIQUES :
${JSON.stringify(
  technicalSignals,
  null,
  2
)}

TITRES DE LA PAGE :
${headings.join("\n") || "Aucun titre détecté"}

TEXTES DES PRINCIPAUX LIENS :
${linkLabels.join(" | ") || "Aucun lien exploitable"}

CONTENU VISIBLE DE LA PAGE :
${visibleText}

Analyse le site selon ces axes :

1. Positionnement
Clarté de l'activité, proposition de valeur, compréhension immédiate de ce que propose l'entreprise et à qui.

2. Conversion
Présence et qualité des appels à l'action, capacité de la page à guider un prospect, éléments de réassurance, prise de contact.

3. SEO
Qualité observable du titre, meta description, structure de titres, contenu éditorial, sémantique et organisation de la page.
Ne mesure pas les performances ni les positions Google.

4. SEO local
Indices visibles permettant d'identifier une implantation géographique, une zone de chalandise ou une activité locale.
Ne prétends pas avoir audité Google Business.

5. GEO / visibilité IA
Capacité du contenu à être compris et cité par des moteurs de recherche et assistants IA : précision des informations, contexte, expertise, structure, explicitation des services, entités, localisation et réponses utiles.

Attribue à chaque axe une note sur 100.
Le score global doit correspondre à une appréciation équilibrée de l'ensemble.

Retourne UNIQUEMENT un objet JSON valide, sans markdown ni commentaire, exactement sous cette forme :

{
  "globalScore": 0,
  "positioningScore": 0,
  "conversionScore": 0,
  "seoScore": 0,
  "localSeoScore": 0,
  "geoScore": 0,
  "summary": "Synthèse de 2 à 4 paragraphes courts.",
  "strengths": [
    "Point fort précis",
    "Point fort précis"
  ],
  "weaknesses": [
    "Point à améliorer précis",
    "Point à améliorer précis"
  ],
  "priorities": [
    "Priorité concrète numéro 1",
    "Priorité concrète numéro 2",
    "Priorité concrète numéro 3"
  ]
}

Pour strengths et weaknesses :
- donne entre 3 et 6 éléments quand les données le permettent.

Pour priorities :
- donne exactement 3 priorités ;
- classe-les par impact business potentiel ;
- formule des actions concrètes et non des généralités.
`.trim();

    const completion =
      await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
          {
            role: "system",
            content:
              "Tu es un consultant senior en stratégie web, UX, SEO et visibilité numérique. Tu travailles pour LBMedia.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: {
          type: "json_object",
        },
      });

    const content =
      completion.choices[0]?.message
        ?.content;

    if (!content) {
      throw new Error(
        "OpenAI n’a retourné aucune analyse."
      );
    }

    let parsedAudit: unknown;

    try {
      parsedAudit =
        JSON.parse(content);
    } catch {
      throw new Error(
        "Impossible de lire le résultat retourné par OpenAI."
      );
    }

    const audit =
      validateAudit(parsedAudit);

    return NextResponse.json({
      success: true,
      url,
      audit,
    });
  } catch (error) {
    console.error(
      "Website audit error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Une erreur est survenue pendant l’analyse du site.",
      },
      {
        status: 500,
      }
    );
  }
}