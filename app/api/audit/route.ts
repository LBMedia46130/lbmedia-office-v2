import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MAX_PAGES = 8;
const MAX_TEXT_PER_PAGE = 9000;

type PageData = {
  url: string;
  title: string | null;
  metaDescription: string | null;
  headings: string[];
  text: string;
  canonical: boolean;
  viewport: boolean;
  openGraph: boolean;
  structuredData: boolean;
};

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
  limitations: string[];
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

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCharCode(Number(code))
    );
}

function cleanHtml(html: string) {
  return decodeHtmlEntities(
    html
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
  )
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html: string) {
  const match = html.match(
    /<title[^>]*>([\s\S]*?)<\/title>/i
  );

  return match ? cleanHtml(match[1]) : null;
}

function extractMetaDescription(html: string) {
  const metaTags =
    html.match(/<meta\b[^>]*>/gi) ?? [];

  for (const tag of metaTags) {
    if (
      /name\s*=\s*["']description["']/i.test(tag)
    ) {
      const content = tag.match(
        /content\s*=\s*["']([^"']*)["']/i
      );

      if (content?.[1]) {
        return decodeHtmlEntities(
          content[1]
        ).trim();
      }
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

    if (headings.length >= 35) {
      break;
    }
  }

  return headings;
}

function hasJsonLd(html: string) {
  return /application\/ld\+json/i.test(html);
}

function hasCanonical(html: string) {
  return /<link[^>]+rel\s*=\s*["']canonical["']/i.test(
    html
  );
}

function hasViewport(html: string) {
  return /<meta[^>]+name\s*=\s*["']viewport["']/i.test(
    html
  );
}

function hasOpenGraph(html: string) {
  return /property\s*=\s*["']og:/i.test(html);
}

function normalizeComparableHost(hostname: string) {
  return hostname
    .toLowerCase()
    .replace(/^www\./, "");
}

function isSameWebsite(
  first: URL,
  second: URL
) {
  return (
    normalizeComparableHost(first.hostname) ===
    normalizeComparableHost(second.hostname)
  );
}

function cleanDiscoveredUrl(
  href: string,
  baseUrl: URL
) {
  try {
    const candidate = new URL(
      href,
      baseUrl
    );

    if (
      !["http:", "https:"].includes(
        candidate.protocol
      )
    ) {
      return null;
    }

    if (
      !isSameWebsite(candidate, baseUrl)
    ) {
      return null;
    }

    candidate.hash = "";

    for (const key of [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
      "fbclid",
      "gclid",
    ]) {
      candidate.searchParams.delete(key);
    }

    const pathname =
      candidate.pathname.toLowerCase();

    if (
      /\.(jpg|jpeg|png|gif|webp|svg|pdf|zip|rar|mp4|mp3|avi|mov|doc|docx|xls|xlsx|ppt|pptx)$/i.test(
        pathname
      )
    ) {
      return null;
    }

    return candidate.toString();
  } catch {
    return null;
  }
}

function scoreCandidate(url: string) {
  const lower = url.toLowerCase();

  let score = 0;

  const highPriority = [
    "contact",
    "agence",
    "a-propos",
    "about",
    "service",
    "prestation",
    "creation",
    "site-internet",
    "seo",
    "referencement",
    "tarif",
    "prix",
  ];

  const mediumPriority = [
    "actualite",
    "article",
    "blog",
    "realisation",
    "portfolio",
    "reference",
    "client",
    "faq",
  ];

  const lowPriority = [
    "mentions-legales",
    "confidentialite",
    "privacy",
    "cookie",
    "cgv",
    "connexion",
    "login",
  ];

  for (const keyword of highPriority) {
    if (lower.includes(keyword)) {
      score += 20;
    }
  }

  for (const keyword of mediumPriority) {
    if (lower.includes(keyword)) {
      score += 8;
    }
  }

  for (const keyword of lowPriority) {
    if (lower.includes(keyword)) {
      score -= 30;
    }
  }

  const depth = new URL(url).pathname
    .split("/")
    .filter(Boolean).length;

  score -= depth * 2;

  return score;
}

function discoverInternalLinks(
  html: string,
  baseUrl: URL
) {
  const urls = new Set<string>();

  const matches = html.matchAll(
    /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi
  );

  for (const match of matches) {
    const url = cleanDiscoveredUrl(
      match[1],
      baseUrl
    );

    if (url) {
      urls.add(url);
    }
  }

  return [...urls].sort(
    (a, b) =>
      scoreCandidate(b) -
      scoreCandidate(a)
  );
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; LBMediaOffice/2.1; WebsiteAudit)",
      Accept:
        "text/html,application/xhtml+xml",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status}`
    );
  }

  const contentType =
    response.headers.get(
      "content-type"
    ) ?? "";

  if (
    !contentType.includes("text/html")
  ) {
    throw new Error(
      "Contenu non HTML"
    );
  }

  const html = await response.text();

  return {
    html,
    finalUrl: response.url || url,
  };
}

function buildPageData(
  url: string,
  html: string
): PageData {
  return {
    url,
    title: extractTitle(html),
    metaDescription:
      extractMetaDescription(html),
    headings: extractHeadings(html),
    text: cleanHtml(html).slice(
      0,
      MAX_TEXT_PER_PAGE
    ),
    canonical: hasCanonical(html),
    viewport: hasViewport(html),
    openGraph: hasOpenGraph(html),
    structuredData: hasJsonLd(html),
  };
}

function numberBetween0And100(
  value: unknown
) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(number)
    )
  );
}

function getStringArray(
  value: unknown
) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string =>
          typeof item === "string"
      )
    : [];
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
    globalScore:
      numberBetween0And100(
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
    seoScore:
      numberBetween0And100(
        data.seoScore
      ),
    localSeoScore:
      numberBetween0And100(
        data.localSeoScore
      ),
    geoScore:
      numberBetween0And100(
        data.geoScore
      ),
    summary:
      typeof data.summary === "string"
        ? data.summary
        : "",
    strengths: getStringArray(
      data.strengths
    ),
    weaknesses: getStringArray(
      data.weaknesses
    ),
    limitations: getStringArray(
      data.limitations
    ),
    priorities: getStringArray(
      data.priorities
    ).slice(0, 3),
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
    const body =
      await request.json();

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

    const requestedUrl =
      normalizeUrl(rawUrl);

    let requestedParsed: URL;

    try {
      requestedParsed = new URL(
        requestedUrl
      );
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

    const homeFetch =
      await fetchHtml(
        requestedParsed.toString()
      );

    const homeUrl = new URL(
      homeFetch.finalUrl
    );

    const pages: PageData[] = [
      buildPageData(
        homeUrl.toString(),
        homeFetch.html
      ),
    ];

    const discovered =
      discoverInternalLinks(
        homeFetch.html,
        homeUrl
      );

    const candidates =
      discovered.filter(
        (url) =>
          url !== homeUrl.toString()
      );

    for (const candidate of candidates) {
      if (
        pages.length >= MAX_PAGES
      ) {
        break;
      }

      try {
        const fetched =
          await fetchHtml(candidate);

        const finalUrl = new URL(
          fetched.finalUrl
        );

        if (
          !isSameWebsite(
            finalUrl,
            homeUrl
          )
        ) {
          continue;
        }

        const alreadyAdded =
          pages.some(
            (page) =>
              page.url ===
              finalUrl.toString()
          );

        if (alreadyAdded) {
          continue;
        }

        const page =
          buildPageData(
            finalUrl.toString(),
            fetched.html
          );

        if (page.text.length < 100) {
          continue;
        }

        pages.push(page);
      } catch {
        // Une page inaccessible ne doit pas
        // bloquer l'ensemble de l'audit.
      }
    }

    const siteData = pages
      .map(
        (page, index) => `
==============================
PAGE ${index + 1}
==============================

URL :
${page.url}

TITLE :
${page.title ?? "Non trouvé"}

META DESCRIPTION :
${page.metaDescription ?? "Non trouvée"}

SIGNAUX TECHNIQUES :
- Canonical : ${page.canonical ? "oui" : "non détectée"}
- Viewport : ${page.viewport ? "oui" : "non détecté"}
- Open Graph : ${page.openGraph ? "oui" : "non détecté"}
- Données structurées JSON-LD : ${page.structuredData ? "oui" : "non détectées"}

TITRES :
${page.headings.join("\n") || "Aucun titre détecté"}

CONTENU :
${page.text}
`
      )
      .join("\n");

    const prompt = `
Tu réalises un pré-audit professionnel de site internet pour LBMedia.

Tu disposes d'un échantillon de plusieurs pages du site.

Nombre de pages réellement analysées :
${pages.length}

RÈGLE ABSOLUE :
Tu dois distinguer strictement :

1. Les QUALITÉS réellement observées du site.
2. Les POINTS PERFECTIBLES réellement observés du site.
3. Les LIMITES DE L'ANALYSE, c'est-à-dire ce que les données collectées ne permettent pas de vérifier.

Ne mélange jamais les catégories 2 et 3.

Un élément comme :
"Je ne peux pas vérifier la qualité exacte des données structurées"
est une LIMITE DE L'ANALYSE.

Ce n'est PAS un point faible du site.

De même :
- ne pas disposer de Search Console n'est pas un défaut du site ;
- ne pas mesurer PageSpeed n'est pas un défaut du site ;
- ne pas connaître les backlinks n'est pas un défaut du site ;
- ne pas avoir audité Google Business n'est pas un défaut du site.

À l'inverse, une vraie observation comme :
"plusieurs pages de services présentent des contenus très courts"
peut apparaître dans les points perfectibles.

IMPORTANT :
Une absence dans l'échantillon ne doit jamais devenir une affirmation absolue concernant l'ensemble du site.

Écris par exemple :
"Aucun témoignage n'a été repéré dans les pages analysées."

Et non :
"Le site ne contient aucun témoignage."

TU N'AS PAS MESURÉ :
- Core Web Vitals ;
- PageSpeed Insights ;
- performances réelles ;
- positions Google ;
- trafic ;
- conversions réelles ;
- backlinks ;
- Google Business ;
- Search Console ;
- Analytics.

OBJECTIF :
Produire un diagnostic professionnel, crédible, concret et utile à un dirigeant de PME.

Ne cherche pas artificiellement des défauts.

Un bon site peut obtenir une bonne note.

ANALYSE LES AXES SUIVANTS :

POSITIONNEMENT
- compréhension de l'activité ;
- proposition de valeur ;
- différenciation ;
- cible ;
- cohérence entre les pages.

CONVERSION
- appels à l'action ;
- parcours ;
- réassurance ;
- contact ;
- capacité à transformer une visite en prise de contact.

SEO
- titles ;
- meta descriptions ;
- H1/H2/H3 ;
- profondeur éditoriale ;
- cohérence sémantique ;
- différenciation des pages ;
- compréhension des services.

SEO LOCAL
- localisation ;
- zones desservies ;
- coordonnées ;
- signaux locaux visibles ;
- cohérence géographique.

Ne prétends pas avoir contrôlé Google Business.

GEO / IA
Évalue la capacité du contenu à être compris, synthétisé et potentiellement cité par les moteurs de recherche et assistants IA :
- informations explicites ;
- expertise identifiable ;
- services clairement décrits ;
- localisation ;
- entités ;
- réponses aux questions ;
- précision factuelle ;
- structure éditoriale ;
- données structurées observables.

NOTATION :
Attribue une note sur 100 pour chaque axe.

Les notes sont uniquement des indicateurs d'analyse.

Le score global doit refléter l'ensemble du diagnostic.

SITE ANALYSÉ :
${homeUrl.toString()}

DONNÉES COLLECTÉES :
${siteData}

Retourne UNIQUEMENT un objet JSON valide :

{
  "globalScore": 0,
  "positioningScore": 0,
  "conversionScore": 0,
  "seoScore": 0,
  "localSeoScore": 0,
  "geoScore": 0,
  "summary": "Synthèse professionnelle de 2 à 4 paragraphes courts.",
  "strengths": [
    "Point fort précis et réellement observé"
  ],
  "weaknesses": [
    "Point perfectible précis et réellement observé"
  ],
  "limitations": [
    "Vérification complémentaire ou élément impossible à contrôler dans ce pré-audit"
  ],
  "priorities": [
    "Action prioritaire concrète",
    "Action prioritaire concrète",
    "Action prioritaire concrète"
  ]
}

STRENGTHS :
3 à 6 éléments si possible.

WEAKNESSES :
3 à 6 éléments maximum.
Uniquement des points réellement perfectibles du site.

LIMITATIONS :
Uniquement les éléments nécessitant une vérification supplémentaire ou une source de données externe.
Entre 2 et 5 éléments utiles.
Évite les évidences ou répétitions inutiles.

PRIORITIES :
Exactement 3 actions.
Classe-les selon leur impact business probable.

Ne recommande jamais une refonte complète si les observations ne la justifient pas.
`.trim();

    const completion =
      await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
          {
            role: "system",
            content:
              "Tu es consultant senior en stratégie web, UX, SEO et visibilité dans les moteurs de recherche et assistants IA. Tes diagnostics sont factuels, prudents, exigeants et orientés business.",
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
      completion.choices[0]
        ?.message?.content;

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
      url: homeUrl.toString(),
      pagesAnalyzed: pages.length,
      analyzedUrls: pages.map(
        (page) => page.url
      ),
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