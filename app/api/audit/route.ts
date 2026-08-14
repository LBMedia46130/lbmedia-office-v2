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

type AuditScores = {
  globalScore: number;
  positioningScore: number;
  conversionScore: number;
  seoScore: number;
  localSeoScore: number;
  geoScore: number;
};

type QualitativeAudit = {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  limitations: string[];
  priorities: string[];
};

type AuditResult =
  AuditScores &
  QualitativeAudit;

type SiteSignals = {
  pagesCount: number;

  pagesWithTitle: number;
  pagesWithMetaDescription: number;
  pagesWithCanonical: number;
  pagesWithViewport: number;
  pagesWithOpenGraph: number;
  pagesWithStructuredData: number;
  pagesWithH1: number;
  pagesWithH2: number;

  totalTextLength: number;
  averageTextLength: number;

  hasContactPage: boolean;
  hasAboutPage: boolean;
  hasServicesPage: boolean;
  hasPricingPage: boolean;
  hasBlogOrNews: boolean;

  hasPhone: boolean;
  hasEmail: boolean;
  hasPostalCode: boolean;
  hasAddressSignal: boolean;
  hasLocationSignal: boolean;
  hasServiceAreaSignal: boolean;

  hasPrimaryCTA: boolean;
  hasSecondaryCTA: boolean;
  hasQuoteCTA: boolean;
  hasContactCTA: boolean;

  hasPricingSignal: boolean;
  hasExperienceSignal: boolean;
  hasExpertiseSignal: boolean;
  hasClientSignal: boolean;
  hasTestimonialSignal: boolean;
  hasCaseStudySignal: boolean;
  hasFaqSignal: boolean;

  hasClearServiceVocabulary: boolean;
  serviceVocabularyCount: number;
  geographicVocabularyCount: number;
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
    .replace(
      /&#(\d+);/g,
      (_, code) =>
        String.fromCharCode(
          Number(code)
        )
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
      .replace(
        /<!--[\s\S]*?-->/g,
        " "
      )
      .replace(/<[^>]+>/g, " ")
  )
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

function extractMetaDescription(
  html: string
) {
  const metaTags =
    html.match(
      /<meta\b[^>]*>/gi
    ) ?? [];

  for (const tag of metaTags) {
    if (
      /name\s*=\s*["']description["']/i.test(
        tag
      )
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
    const text = cleanHtml(
      match[2]
    );

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
  return /application\/ld\+json/i.test(
    html
  );
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
  return /property\s*=\s*["']og:/i.test(
    html
  );
}

function normalizeComparableHost(
  hostname: string
) {
  return hostname
    .toLowerCase()
    .replace(/^www\./, "");
}

function isSameWebsite(
  first: URL,
  second: URL
) {
  return (
    normalizeComparableHost(
      first.hostname
    ) ===
    normalizeComparableHost(
      second.hostname
    )
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
      ![
        "http:",
        "https:",
      ].includes(candidate.protocol)
    ) {
      return null;
    }

    if (
      !isSameWebsite(
        candidate,
        baseUrl
      )
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
      candidate.searchParams.delete(
        key
      );
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

function scoreCandidate(
  url: string
) {
  const lower =
    url.toLowerCase();

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

  for (
    const keyword of
    highPriority
  ) {
    if (
      lower.includes(keyword)
    ) {
      score += 20;
    }
  }

  for (
    const keyword of
    mediumPriority
  ) {
    if (
      lower.includes(keyword)
    ) {
      score += 8;
    }
  }

  for (
    const keyword of
    lowPriority
  ) {
    if (
      lower.includes(keyword)
    ) {
      score -= 30;
    }
  }

  const depth = new URL(url)
    .pathname.split("/")
    .filter(Boolean).length;

  score -= depth * 2;

  return score;
}

function discoverInternalLinks(
  html: string,
  baseUrl: URL
) {
  const urls =
    new Set<string>();

  const matches =
    html.matchAll(
      /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi
    );

  for (const match of matches) {
    const url =
      cleanDiscoveredUrl(
        match[1],
        baseUrl
      );

    if (url) {
      urls.add(url);
    }
  }

  return [...urls].sort(
    (a, b) => {
      const scoreDifference =
        scoreCandidate(b) -
        scoreCandidate(a);

      if (
        scoreDifference !== 0
      ) {
        return scoreDifference;
      }

      return a.localeCompare(b);
    }
  );
}

async function fetchHtml(
  url: string
) {
  const response =
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
        AbortSignal.timeout(
          12000
        ),
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
    !contentType.includes(
      "text/html"
    )
  ) {
    throw new Error(
      "Contenu non HTML"
    );
  }

  const html =
    await response.text();

  return {
    html,
    finalUrl:
      response.url || url,
  };
}

function buildPageData(
  url: string,
  html: string
): PageData {
  return {
    url,
    title:
      extractTitle(html),
    metaDescription:
      extractMetaDescription(
        html
      ),
    headings:
      extractHeadings(html),
    text: cleanHtml(html).slice(
      0,
      MAX_TEXT_PER_PAGE
    ),
    canonical:
      hasCanonical(html),
    viewport:
      hasViewport(html),
    openGraph:
      hasOpenGraph(html),
    structuredData:
      hasJsonLd(html),
  };
}

function includesAny(
  text: string,
  terms: string[]
) {
  const normalized =
    text.toLowerCase();

  return terms.some((term) =>
    normalized.includes(
      term.toLowerCase()
    )
  );
}

function countTerms(
  text: string,
  terms: string[]
) {
  const normalized =
    text.toLowerCase();

  return terms.filter((term) =>
    normalized.includes(
      term.toLowerCase()
    )
  ).length;
}

function pageUrlIncludes(
  pages: PageData[],
  terms: string[]
) {
  return pages.some((page) =>
    includesAny(
      page.url,
      terms
    )
  );
}

function buildSiteSignals(
  pages: PageData[]
): SiteSignals {
  const combinedText =
    pages
      .map(
        (page) =>
          `${page.title ?? ""} ${
            page.metaDescription ??
            ""
          } ${page.headings.join(
            " "
          )} ${page.text}`
      )
      .join(" ")
      .toLowerCase();

  const pagesWithTitle =
    pages.filter(
      (page) =>
        Boolean(
          page.title?.trim()
        )
    ).length;

  const pagesWithMetaDescription =
    pages.filter(
      (page) =>
        Boolean(
          page.metaDescription?.trim()
        )
    ).length;

  const pagesWithCanonical =
    pages.filter(
      (page) =>
        page.canonical
    ).length;

  const pagesWithViewport =
    pages.filter(
      (page) =>
        page.viewport
    ).length;

  const pagesWithOpenGraph =
    pages.filter(
      (page) =>
        page.openGraph
    ).length;

  const pagesWithStructuredData =
    pages.filter(
      (page) =>
        page.structuredData
    ).length;

  const pagesWithH1 =
    pages.filter((page) =>
      page.headings.some(
        (heading) =>
          heading.startsWith(
            "H1 :"
          )
      )
    ).length;

  const pagesWithH2 =
    pages.filter((page) =>
      page.headings.some(
        (heading) =>
          heading.startsWith(
            "H2 :"
          )
      )
    ).length;

  const totalTextLength =
    pages.reduce(
      (total, page) =>
        total +
        page.text.length,
      0
    );

  const averageTextLength =
    pages.length > 0
      ? Math.round(
          totalTextLength /
            pages.length
        )
      : 0;

  const serviceTerms = [
    "service",
    "services",
    "prestation",
    "prestations",
    "solution",
    "solutions",
    "création",
    "creation",
    "accompagnement",
    "conseil",
    "audit",
    "site internet",
    "sites internet",
    "référencement",
    "referencement",
    "seo",
    "communication",
    "publicité",
    "publicite",
  ];

  const geographicTerms = [
    "lot",
    "occitanie",
    "local",
    "locale",
    "région",
    "region",
    "ville",
    "commune",
    "département",
    "departement",
    "zone",
    "secteur",
    "proximité",
    "proximite",
    "france",
  ];

  const primaryCtaTerms = [
    "contactez",
    "contact",
    "demandez",
    "demander",
    "découvrir",
    "decouvrir",
    "en savoir plus",
    "prendre rendez-vous",
    "prendre rendez vous",
    "réserver",
    "reserver",
    "commencer",
  ];

  const secondaryCtaTerms = [
    "voir nos",
    "voir les",
    "nos services",
    "nos offres",
    "nos tarifs",
    "découvrez",
    "decouvrez",
    "lire",
    "consulter",
  ];

  const quoteTerms = [
    "devis",
    "estimation",
    "audit gratuit",
    "demande de tarif",
    "demandez un tarif",
  ];

  const contactTerms = [
    "téléphone",
    "telephone",
    "appelez",
    "appeler",
    "contact",
    "e-mail",
    "email",
    "mail",
  ];

  const expertiseTerms = [
    "expertise",
    "expert",
    "spécialiste",
    "specialiste",
    "expérience",
    "experience",
    "savoir-faire",
    "conseil",
  ];

  const clientTerms = [
    "client",
    "clients",
    "référence",
    "reference",
    "références",
    "references",
    "ils nous font confiance",
    "partenaire",
  ];

  const testimonialTerms = [
    "témoignage",
    "temoignage",
    "avis client",
    "avis clients",
    "ce que disent nos clients",
  ];

  const caseStudyTerms = [
    "étude de cas",
    "etude de cas",
    "cas client",
    "réalisation",
    "realisation",
    "portfolio",
    "projet client",
  ];

  const faqTerms = [
    "faq",
    "questions fréquentes",
    "questions frequentes",
    "foire aux questions",
  ];

  return {
    pagesCount:
      pages.length,

    pagesWithTitle,
    pagesWithMetaDescription,
    pagesWithCanonical,
    pagesWithViewport,
    pagesWithOpenGraph,
    pagesWithStructuredData,
    pagesWithH1,
    pagesWithH2,

    totalTextLength,
    averageTextLength,

    hasContactPage:
      pageUrlIncludes(
        pages,
        ["contact"]
      ),

    hasAboutPage:
      pageUrlIncludes(
        pages,
        [
          "agence",
          "a-propos",
          "about",
          "qui-sommes-nous",
        ]
      ),

    hasServicesPage:
      pageUrlIncludes(
        pages,
        [
          "service",
          "prestation",
          "creation",
          "seo",
          "referencement",
        ]
      ),

    hasPricingPage:
      pageUrlIncludes(
        pages,
        [
          "tarif",
          "prix",
          "pricing",
        ]
      ),

    hasBlogOrNews:
      pageUrlIncludes(
        pages,
        [
          "actualite",
          "article",
          "blog",
          "news",
        ]
      ),

    hasPhone:
      /(?:\+33|0)[1-9](?:[\s.\-]?\d{2}){4}/.test(
        combinedText
      ),

    hasEmail:
      /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(
        combinedText
      ),

    hasPostalCode:
      /\b(?:0[1-9]|[1-8]\d|9[0-5])\d{3}\b/.test(
        combinedText
      ),

    hasAddressSignal:
      includesAny(
        combinedText,
        [
          "rue ",
          "avenue ",
          "av. ",
          "boulevard ",
          "route ",
          "place ",
          "chemin ",
          "impasse ",
          "allée ",
          "allee ",
        ]
      ),

    hasLocationSignal:
      countTerms(
        combinedText,
        geographicTerms
      ) >= 2,

    hasServiceAreaSignal:
      includesAny(
        combinedText,
        [
          "zone desservie",
          "zones desservies",
          "zone d'intervention",
          "zone d’intervention",
          "secteur d'intervention",
          "secteur d’intervention",
          "dans le lot",
          "lot et",
          "partout en france",
          "toute la france",
        ]
      ),

    hasPrimaryCTA:
      includesAny(
        combinedText,
        primaryCtaTerms
      ),

    hasSecondaryCTA:
      includesAny(
        combinedText,
        secondaryCtaTerms
      ),

    hasQuoteCTA:
      includesAny(
        combinedText,
        quoteTerms
      ),

    hasContactCTA:
      includesAny(
        combinedText,
        contactTerms
      ),

    hasPricingSignal:
      includesAny(
        combinedText,
        [
          "tarif",
          "tarifs",
          "prix",
          "à partir de",
          "a partir de",
          "€",
        ]
      ),

    hasExperienceSignal:
      includesAny(
        combinedText,
        [
          "ans d'expérience",
          "ans d’expérience",
          "années d'expérience",
          "années d’expérience",
          "depuis ",
        ]
      ),

    hasExpertiseSignal:
      includesAny(
        combinedText,
        expertiseTerms
      ),

    hasClientSignal:
      includesAny(
        combinedText,
        clientTerms
      ),

    hasTestimonialSignal:
      includesAny(
        combinedText,
        testimonialTerms
      ),

    hasCaseStudySignal:
      includesAny(
        combinedText,
        caseStudyTerms
      ),

    hasFaqSignal:
      includesAny(
        combinedText,
        faqTerms
      ),

    hasClearServiceVocabulary:
      countTerms(
        combinedText,
        serviceTerms
      ) >= 4,

    serviceVocabularyCount:
      countTerms(
        combinedText,
        serviceTerms
      ),

    geographicVocabularyCount:
      countTerms(
        combinedText,
        geographicTerms
      ),
  };
}

function clampScore(
  score: number
) {
  return Math.max(
    0,
    Math.min(
      100,
      Math.round(score)
    )
  );
}

function ratioScore(
  value: number,
  total: number,
  maximumPoints: number
) {
  if (total <= 0) {
    return 0;
  }

  return (
    (value / total) *
    maximumPoints
  );
}

function calculatePositioningScore(
  signals: SiteSignals
) {
  let score = 40;

  if (
    signals.hasClearServiceVocabulary
  ) {
    score += 15;
  }

  if (
    signals.serviceVocabularyCount >=
    7
  ) {
    score += 5;
  }

  if (
    signals.hasServicesPage
  ) {
    score += 10;
  }

  if (
    signals.hasAboutPage
  ) {
    score += 7;
  }

  if (
    signals.hasExperienceSignal
  ) {
    score += 7;
  }

  if (
    signals.hasExpertiseSignal
  ) {
    score += 6;
  }

  if (
    signals.hasLocationSignal
  ) {
    score += 5;
  }

  if (
    signals.averageTextLength >=
    1500
  ) {
    score += 5;
  }

  return clampScore(score);
}

function calculateConversionScore(
  signals: SiteSignals
) {
  let score = 30;

  if (
    signals.hasPrimaryCTA
  ) {
    score += 12;
  }

  if (
    signals.hasSecondaryCTA
  ) {
    score += 5;
  }

  if (
    signals.hasQuoteCTA
  ) {
    score += 10;
  }

  if (
    signals.hasContactCTA
  ) {
    score += 8;
  }

  if (
    signals.hasContactPage
  ) {
    score += 8;
  }

  if (signals.hasPhone) {
    score += 6;
  }

  if (signals.hasEmail) {
    score += 6;
  }

  if (
    signals.hasPricingPage ||
    signals.hasPricingSignal
  ) {
    score += 5;
  }

  if (
    signals.hasTestimonialSignal
  ) {
    score += 5;
  } else if (
    signals.hasClientSignal
  ) {
    score += 3;
  }

  if (
    signals.hasCaseStudySignal
  ) {
    score += 5;
  }

  return clampScore(score);
}

function calculateSeoScore(
  signals: SiteSignals
) {
  const total =
    signals.pagesCount;

  let score = 10;

  score += ratioScore(
    signals.pagesWithTitle,
    total,
    15
  );

  score += ratioScore(
    signals.pagesWithMetaDescription,
    total,
    12
  );

  score += ratioScore(
    signals.pagesWithCanonical,
    total,
    10
  );

  score += ratioScore(
    signals.pagesWithViewport,
    total,
    5
  );

  score += ratioScore(
    signals.pagesWithH1,
    total,
    15
  );

  score += ratioScore(
    signals.pagesWithH2,
    total,
    8
  );

  score += ratioScore(
    signals.pagesWithOpenGraph,
    total,
    5
  );

  score += ratioScore(
    signals.pagesWithStructuredData,
    total,
    5
  );

  if (
    signals.averageTextLength >=
    2500
  ) {
    score += 10;
  } else if (
    signals.averageTextLength >=
    1500
  ) {
    score += 7;
  } else if (
    signals.averageTextLength >=
    750
  ) {
    score += 4;
  }

  if (
    signals.hasServicesPage
  ) {
    score += 3;
  }

  if (
    signals.hasBlogOrNews
  ) {
    score += 2;
  }

  return clampScore(score);
}

function calculateLocalSeoScore(
  signals: SiteSignals
) {
  let score = 25;

  if (
    signals.hasLocationSignal
  ) {
    score += 15;
  }

  if (
    signals.geographicVocabularyCount >=
    4
  ) {
    score += 8;
  }

  if (
    signals.hasPostalCode
  ) {
    score += 10;
  }

  if (
    signals.hasAddressSignal
  ) {
    score += 10;
  }

  if (signals.hasPhone) {
    score += 7;
  }

  if (signals.hasEmail) {
    score += 5;
  }

  if (
    signals.hasContactPage
  ) {
    score += 5;
  }

  if (
    signals.hasServiceAreaSignal
  ) {
    score += 10;
  }

  if (
    signals.pagesWithStructuredData >
    0
  ) {
    score += 5;
  }

  return clampScore(score);
}

function calculateGeoScore(
  signals: SiteSignals
) {
  let score = 30;

  if (
    signals.hasClearServiceVocabulary
  ) {
    score += 12;
  }

  if (
    signals.hasExpertiseSignal
  ) {
    score += 8;
  }

  if (
    signals.hasExperienceSignal
  ) {
    score += 6;
  }

  if (
    signals.hasLocationSignal
  ) {
    score += 8;
  }

  if (
    signals.hasServicesPage
  ) {
    score += 7;
  }

  if (
    signals.hasAboutPage
  ) {
    score += 5;
  }

  if (
    signals.hasBlogOrNews
  ) {
    score += 6;
  }

  if (
    signals.hasFaqSignal
  ) {
    score += 5;
  }

  if (
    signals.pagesWithStructuredData >
    0
  ) {
    score += 5;
  }

  if (
    signals.averageTextLength >=
    1500
  ) {
    score += 5;
  }

  if (
    signals.hasCaseStudySignal
  ) {
    score += 3;
  }

  return clampScore(score);
}

function calculateScores(
  signals: SiteSignals
): AuditScores {
  const positioningScore =
    calculatePositioningScore(
      signals
    );

  const conversionScore =
    calculateConversionScore(
      signals
    );

  const seoScore =
    calculateSeoScore(
      signals
    );

  const localSeoScore =
    calculateLocalSeoScore(
      signals
    );

  const geoScore =
    calculateGeoScore(
      signals
    );

  const globalScore =
    clampScore(
      positioningScore * 0.2 +
        conversionScore * 0.2 +
        seoScore * 0.25 +
        localSeoScore * 0.15 +
        geoScore * 0.2
    );

  return {
    globalScore,
    positioningScore,
    conversionScore,
    seoScore,
    localSeoScore,
    geoScore,
  };
}

function getStringArray(
  value: unknown
) {
  return Array.isArray(value)
    ? value.filter(
        (
          item
        ): item is string =>
          typeof item === "string"
      )
    : [];
}

function validateQualitativeAudit(
  value: unknown
): QualitativeAudit {
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
    summary:
      typeof data.summary ===
      "string"
        ? data.summary
        : "",

    strengths:
      getStringArray(
        data.strengths
      ).slice(0, 6),

    weaknesses:
      getStringArray(
        data.weaknesses
      ).slice(0, 6),

    limitations:
      getStringArray(
        data.limitations
      ).slice(0, 5),

    priorities:
      getStringArray(
        data.priorities
      ).slice(0, 3),
  };
}

export async function POST(
  request: NextRequest
) {
  if (
    !process.env.OPENAI_API_KEY
  ) {
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
      typeof body.url ===
      "string"
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
      requestedParsed =
        new URL(requestedUrl);
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
      ![
        "http:",
        "https:",
      ].includes(
        requestedParsed.protocol
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

    const homeFetch =
      await fetchHtml(
        requestedParsed.toString()
      );

    const homeUrl =
      new URL(
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
          url !==
          homeUrl.toString()
      );

    for (
      const candidate of
      candidates
    ) {
      if (
        pages.length >=
        MAX_PAGES
      ) {
        break;
      }

      try {
        const fetched =
          await fetchHtml(
            candidate
          );

        const finalUrl =
          new URL(
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

        const normalizedFinalUrl =
          finalUrl.toString();

        const alreadyAdded =
          pages.some(
            (page) =>
              page.url ===
              normalizedFinalUrl
          );

        if (alreadyAdded) {
          continue;
        }

        const page =
          buildPageData(
            normalizedFinalUrl,
            fetched.html
          );

        if (
          page.text.length < 100
        ) {
          continue;
        }

        pages.push(page);
      } catch {
        // Une page inaccessible
        // ne bloque pas l'audit.
      }
    }

    const signals =
      buildSiteSignals(pages);

    const scores =
      calculateScores(signals);

    const siteData = pages
      .map(
        (
          page,
          index
        ) => `
==============================
PAGE ${index + 1}
==============================

URL :
${page.url}

TITLE :
${page.title ?? "Non trouvé"}

META DESCRIPTION :
${
  page.metaDescription ??
  "Non trouvée"
}

SIGNAUX TECHNIQUES :
- Canonical : ${
          page.canonical
            ? "oui"
            : "non détectée"
        }
- Viewport : ${
          page.viewport
            ? "oui"
            : "non détecté"
        }
- Open Graph : ${
          page.openGraph
            ? "oui"
            : "non détecté"
        }
- Données structurées JSON-LD : ${
          page.structuredData
            ? "oui"
            : "non détectées"
        }

TITRES :
${
  page.headings.join(
    "\n"
  ) ||
  "Aucun titre détecté"
}

CONTENU :
${page.text}
`
      )
      .join("\n");

    const prompt = `
Tu réalises un pré-audit professionnel de site internet pour LBMedia.

IMPORTANT :
Les scores ont déjà été calculés par LBMedia Office selon une grille déterministe.

TU NE DOIS PAS :
- recalculer les scores ;
- contester les scores ;
- proposer d'autres notes ;
- introduire d'autres scores dans ton texte.

TON RÔLE :
Interpréter les données observées et expliquer le diagnostic de façon professionnelle.

SITE :
${homeUrl.toString()}

PAGES ANALYSÉES :
${pages.length}

SCORES CALCULÉS PAR LBMEDIA OFFICE :
- Global : ${scores.globalScore}/100
- Positionnement : ${scores.positioningScore}/100
- Conversion : ${scores.conversionScore}/100
- SEO : ${scores.seoScore}/100
- SEO local : ${scores.localSeoScore}/100
- GEO / IA : ${scores.geoScore}/100

SIGNAUX UTILISÉS PAR LE MOTEUR :
${JSON.stringify(
  signals,
  null,
  2
)}

RÈGLE ABSOLUE :
Distingue strictement :

1. Les qualités réellement observées.
2. Les points perfectibles réellement observés.
3. Les limites du pré-audit.

Ne transforme jamais une limite de l'outil en défaut du site.

Exemple :
"PageSpeed n'a pas été mesuré"
= limitation.

Ce n'est PAS un point faible.

UNE ABSENCE DANS L'ÉCHANTILLON N'EST PAS UNE CERTITUDE SUR LE SITE ENTIER.

Écris :
"Aucun témoignage n'a été repéré dans les pages analysées."

N'écris pas :
"Le site ne possède aucun témoignage."

TU N'AS PAS ACCÈS À :
- Core Web Vitals ;
- PageSpeed Insights ;
- Search Console ;
- Google Analytics ;
- statistiques de trafic ;
- conversions réelles ;
- positions Google ;
- backlinks ;
- Google Business ;
- avis Google.

POSITIONNEMENT :
Analyse :
- compréhension de l'activité ;
- proposition de valeur ;
- cible ;
- différenciation ;
- cohérence de l'offre.

CONVERSION :
Analyse :
- appels à l'action ;
- possibilités de contact ;
- réassurance ;
- tarifs lorsqu'ils existent ;
- preuves commerciales ;
- capacité du parcours à favoriser une prise de contact.

SEO :
Analyse :
- titles ;
- meta descriptions ;
- H1/H2/H3 ;
- contenu éditorial ;
- cohérence sémantique ;
- différenciation des pages ;
- compréhension des services.

SEO LOCAL :
Analyse uniquement les éléments observables :
- localisation ;
- adresse ;
- coordonnées ;
- zones desservies ;
- vocabulaire géographique ;
- cohérence locale.

Ne prétends jamais avoir contrôlé la fiche Google Business.

GEO / IA :
Analyse la capacité des contenus à être compris, synthétisés et potentiellement cités par les moteurs et assistants IA :
- expertise explicite ;
- entités clairement identifiées ;
- services clairement expliqués ;
- informations factuelles ;
- contexte géographique ;
- contenu structuré ;
- réponses utiles ;
- données structurées observables.

TON :
- professionnel ;
- mature ;
- concret ;
- compréhensible par un dirigeant de PME ;
- jamais alarmiste ;
- jamais complaisant ;
- orienté amélioration et impact business.

Ne cherche pas artificiellement des défauts.

Ne recommande jamais une refonte complète si les observations ne la justifient pas.

DONNÉES DES PAGES :
${siteData}

Retourne UNIQUEMENT cet objet JSON valide :

{
  "summary": "Synthèse professionnelle en 2 à 4 paragraphes courts.",
  "strengths": [
    "Point fort précis réellement observé"
  ],
  "weaknesses": [
    "Point perfectible précis réellement observé"
  ],
  "limitations": [
    "Élément nécessitant une vérification ou une source externe"
  ],
  "priorities": [
    "Action prioritaire concrète",
    "Action prioritaire concrète",
    "Action prioritaire concrète"
  ]
}

STRENGTHS :
3 à 6 éléments utiles.

WEAKNESSES :
3 à 6 éléments maximum.
Pas de faux défaut pour remplir la liste.

LIMITATIONS :
2 à 5 éléments maximum.
Uniquement des limites réellement importantes.

PRIORITIES :
Exactement 3 actions.
Classe-les selon leur impact business probable.
`.trim();

    const completion =
      await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
          {
            role: "system",
            content:
              "Tu es consultant senior en stratégie web, UX, SEO et visibilité dans les moteurs de recherche et assistants IA. Tu interprètes les observations sans modifier la notation calculée par LBMedia Office.",
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

    const qualitativeAudit =
      validateQualitativeAudit(
        parsedAudit
      );

    const audit: AuditResult = {
      ...scores,
      ...qualitativeAudit,
    };

    return NextResponse.json({
      success: true,

      url:
        homeUrl.toString(),

      pagesAnalyzed:
        pages.length,

      analyzedUrls:
        pages.map(
          (page) =>
            page.url
        ),

      scoringVersion:
        "1.0",

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