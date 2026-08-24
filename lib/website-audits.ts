import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

export type WebsiteAuditSummary = {
  id: string;
  company_id: string | null;
  website_url: string;
  scoring_version: string;
  pages_analyzed: number;

  global_score: number;
  positioning_score: number;
  conversion_score: number;
  seo_score: number;
  local_seo_score: number;
  geo_score: number;

  created_at: string;
};

export type TechnicalPlatform =
  | "wordpress"
  | "eatbu"
  | "wix"
  | "squarespace"
  | "webflow"
  | "jimdo"
  | "shopify"
  | "prestashop"
  | "custom"
  | "unknown";

export type TechnicalConfidence =
  | "high"
  | "medium"
  | "low";

export type TechnicalFeasibility =
  | "good"
  | "limited"
  | "verify"
  | "migration_recommended";

export type WebsiteAudit =
  WebsiteAuditSummary & {
    analyzed_urls: string[];

    summary: string;

    strengths: string[];
    weaknesses: string[];
    limitations: string[];
    priorities: string[];

    technical_platform:
      TechnicalPlatform | null;

    technical_platform_label:
      string | null;

    technical_confidence:
      TechnicalConfidence | null;

    technical_evidence:
      string[];

    optimization_feasibility:
      TechnicalFeasibility | null;

    redesign_feasibility:
      TechnicalFeasibility | null;

    new_website_feasibility:
      TechnicalFeasibility | null;

    migration_likely:
      boolean | null;

    technical_note:
      string | null;
  };

export type CommercialRecommendationType =
  | "optimization"
  | "redesign"
  | "new_website";

export type CommercialRecommendation = {
  type: CommercialRecommendationType;
  label: string;
  short_label: string;
  description: string;
};

export type CommercialWeaknessGroup = {
  visibility: string[];
  website: string[];
};

export type WebsiteAuditCommercialDiagnosis = {
  recommendation: CommercialRecommendation;

  visibility_score: number;
  website_effectiveness_score: number;

  visibility_severity:
    | "low"
    | "medium"
    | "high";

  website_severity:
    | "low"
    | "medium"
    | "high";

  weaknesses: CommercialWeaknessGroup;

  main_issues: string[];

  commercial_summary: string;

  technical_caution:
    string | null;
};

function normalizeStringArray(
  value: unknown
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string =>
      typeof item === "string"
  );
}

function normalizeScore(
  value: number
): number {
  if (
    typeof value !== "number" ||
    Number.isNaN(value)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(value)
    )
  );
}

function average(
  values: number[]
): number {
  if (values.length === 0) {
    return 0;
  }

  const total =
    values.reduce(
      (sum, value) =>
        sum + value,
      0
    );

  return Math.round(
    total / values.length
  );
}

function getSeverity(
  score: number
):
  | "low"
  | "medium"
  | "high" {
  if (score < 45) {
    return "high";
  }

  if (score < 70) {
    return "medium";
  }

  return "low";
}

function normalizeText(
  text: string
): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    );
}

function countKeywordMatches(
  text: string,
  keywords: string[]
): number {
  const normalized =
    normalizeText(text);

  return keywords.reduce(
    (
      count,
      keyword
    ) => {
      return normalized.includes(
        normalizeText(keyword)
      )
        ? count + 1
        : count;
    },
    0
  );
}

function normalizeTechnicalPlatform(
  value: unknown
): TechnicalPlatform | null {
  if (
    value === "wordpress" ||
    value === "eatbu" ||
    value === "wix" ||
    value === "squarespace" ||
    value === "webflow" ||
    value === "jimdo" ||
    value === "shopify" ||
    value === "prestashop" ||
    value === "custom" ||
    value === "unknown"
  ) {
    return value;
  }

  return null;
}

function normalizeTechnicalConfidence(
  value: unknown
): TechnicalConfidence | null {
  if (
    value === "high" ||
    value === "medium" ||
    value === "low"
  ) {
    return value;
  }

  return null;
}

function normalizeTechnicalFeasibility(
  value: unknown
): TechnicalFeasibility | null {
  if (
    value === "good" ||
    value === "limited" ||
    value === "verify" ||
    value ===
      "migration_recommended"
  ) {
    return value;
  }

  return null;
}

function classifyWeaknesses(
  weaknesses: string[]
): CommercialWeaknessGroup {
  const visibilityKeywords = [
    "seo",
    "referencement",
    "google",
    "google business",
    "moteur",
    "moteurs",
    "recherche",
    "recherches",
    "visibilite",
    "positionnement",
    "mot-cle",
    "mots-cles",
    "mot cle",
    "mots cles",
    "contenu",
    "contenus",
    "balise",
    "meta",
    "title",
    "h1",
    "schema",
    "structured data",
    "donnees structurees",
    "structure semantique",
    "semantique",
    "local",
    "locale",
    "locales",
    "geographique",
    "geographiques",
    "zone desservie",
    "zones desservies",
    "servicearea",
    "geo",
    "ia",
    "intelligence artificielle",
    "assistant",
    "assistants",
    "indexation",
    "indexe",
    "indexee",
    "maillage",
    "faq",
    "case study",
    "cas client",
    "cas clients",
    "preuve",
    "preuves",
    "rich snippet",
    "rich snippets",
  ];

  const websiteKeywords = [
    "design",
    "ergonomie",
    "navigation",
    "conversion",
    "contact",
    "prise de contact",
    "telephone",
    "e-mail",
    "email",
    "appel a l'action",
    "cta",
    "mobile",
    "responsive",
    "lisibilite",
    "lecture",
    "parcours",
    "interface",
    "presentation",
    "mise en page",
    "visuel",
    "visuelle",
    "obsolet",
    "obsolete",
    "vieillissant",
    "ancienne",
    "moderne",
    "moderniser",
    "offre",
    "prestations",
    "comprehension",
    "hierarchie",
    "rapidite",
    "performance",
    "friction",
    "frictions",
    "formulaire",
    "formulaires",
    "rendez-vous",
    "tarif",
    "tarifs",
    "disponibilite",
    "cliquable",
    "cliquables",
    "utilisateur",
    "experience utilisateur",
  ];

  const visibility: string[] = [];
  const website: string[] = [];

  for (
    const item of weaknesses
  ) {
    const visibilityMatches =
      countKeywordMatches(
        item,
        visibilityKeywords
      );

    const websiteMatches =
      countKeywordMatches(
        item,
        websiteKeywords
      );

    if (
      visibilityMatches === 0 &&
      websiteMatches === 0
    ) {
      website.push(item);
      continue;
    }

    if (
      visibilityMatches >
      websiteMatches
    ) {
      visibility.push(item);
      continue;
    }

    if (
      websiteMatches >
      visibilityMatches
    ) {
      website.push(item);
      continue;
    }

    const normalized =
      normalizeText(item);

    const explicitVisibilitySignals = [
      "seo",
      "referencement",
      "google",
      "visibilite",
      "geographique",
      "servicearea",
      "zone desservie",
      "schema",
      "donnees structurees",
      "moteur",
      "assistant",
      "indexation",
    ];

    const hasExplicitVisibilitySignal =
      explicitVisibilitySignals.some(
        (signal) =>
          normalized.includes(
            signal
          )
      );

    if (
      hasExplicitVisibilitySignal
    ) {
      visibility.push(item);
    } else {
      website.push(item);
    }
  }

  return {
    visibility,
    website,
  };
}

function buildRecommendation(
  globalScore: number,
  visibilityScore: number,
  websiteEffectivenessScore: number,
  positioningScore: number
): CommercialRecommendation {
  const severeOverallWeakness =
    globalScore < 40;

  const severeWebsiteWeakness =
    websiteEffectivenessScore < 40;

  const severePositioningWeakness =
    positioningScore < 40;

  const multipleCriticalWeaknesses =
    [
      globalScore,
      visibilityScore,
      websiteEffectivenessScore,
      positioningScore,
    ].filter(
      (score) =>
        score < 40
    ).length >= 3;

  if (
    severeOverallWeakness &&
    severeWebsiteWeakness &&
    severePositioningWeakness &&
    multipleCriticalWeaknesses
  ) {
    return {
      type:
        "new_website",

      label:
        "Création d’un nouveau site",

      short_label:
        "Nouveau site",

      description:
        "Les faiblesses relevées touchent à la fois la structure du site, son efficacité commerciale et sa visibilité. Une optimisation ponctuelle risquerait de ne corriger qu’une partie du problème. Repartir sur une base plus adaptée apparaît comme la solution la plus cohérente.",
    };
  }

  if (
    websiteEffectivenessScore <
      55 ||
    (
      globalScore < 55 &&
      positioningScore < 60
    )
  ) {
    return {
      type:
        "redesign",

      label:
        "Refonte du site existant",

      short_label:
        "Refonte",

      description:
        "Le site possède une base exploitable, mais son organisation, sa présentation ou son parcours limitent son efficacité. Une refonte permettrait de conserver ce qui fonctionne tout en améliorant la lisibilité, la conversion et la visibilité.",
    };
  }

  return {
    type:
      "optimization",

    label:
      "Optimisation du site existant",

    short_label:
      "Optimisation",

    description:
      "Le site constitue une base satisfaisante. Les principaux gains peuvent être obtenus en renforçant sa visibilité, ses contenus et certains éléments de conversion sans engager une refonte complète.",
  };
}

function getRecommendationFeasibility(
  audit: WebsiteAudit,
  recommendationType:
    CommercialRecommendationType
): TechnicalFeasibility | null {
  switch (
    recommendationType
  ) {
    case "optimization":
      return audit
        .optimization_feasibility;

    case "redesign":
      return audit
        .redesign_feasibility;

    case "new_website":
      return audit
        .new_website_feasibility;
  }
}

function getTechnicalCaution(
  audit: WebsiteAudit,
  recommendation:
    CommercialRecommendation
): string | null {
  const feasibility =
    getRecommendationFeasibility(
      audit,
      recommendation.type
    );

  if (!feasibility) {
    return null;
  }

  const platformLabel =
    audit.technical_platform_label ??
    "la plateforme actuelle";

  if (
    feasibility === "good"
  ) {
    return null;
  }

  if (
    feasibility === "limited"
  ) {
    if (
      recommendation.type ===
      "optimization"
    ) {
      return `La recommandation d’optimisation reste commercialement pertinente, mais ${platformLabel} peut limiter certaines interventions. Les possibilités exactes devront être vérifiées avant chiffrage.`;
    }

    if (
      recommendation.type ===
      "redesign"
    ) {
      return `La refonte reste pertinente au regard du diagnostic, mais ${platformLabel} peut limiter une évolution avancée du site. Une migration vers une solution plus flexible pourra être nécessaire selon le niveau de refonte retenu.`;
    }

    return `Le projet reste pertinent, mais les possibilités offertes par ${platformLabel} devront être vérifiées avant chiffrage.`;
  }

  if (
    feasibility ===
    "migration_recommended"
  ) {
    if (
      recommendation.type ===
      "new_website"
    ) {
      return `La création d’un nouveau site est cohérente avec le diagnostic. La plateforme actuelle (${platformLabel}) étant probablement trop limitée pour cette évolution, le projet devra vraisemblablement prévoir une migration vers une nouvelle solution.`;
    }

    return `La prestation envisagée nécessitera probablement une migration depuis ${platformLabel} vers une solution plus adaptée. Ce changement devra être intégré au périmètre et au chiffrage du projet.`;
  }

  if (
    feasibility === "verify"
  ) {
    return `La recommandation commerciale reste valable, mais la technologie du site ou ses possibilités d’évolution ne sont pas suffisamment établies. Une vérification technique sera nécessaire avant de confirmer la prestation et son chiffrage.`;
  }

  return null;
}

function buildMainIssues(
  audit: WebsiteAudit,
  visibilityScore: number,
  websiteEffectivenessScore: number
): string[] {
  const issues: string[] = [];

  if (
    audit.seo_score < 65
  ) {
    issues.push(
      "Le référencement naturel du site peut être renforcé."
    );
  }

  if (
    audit.local_seo_score < 65
  ) {
    issues.push(
      "La visibilité du site sur les recherches locales ou géographiques est perfectible."
    );
  }

  if (
    audit.geo_score < 65
  ) {
    issues.push(
      "Le site fournit encore trop peu de signaux permettant aux moteurs et assistants IA de comprendre précisément l’activité, les prestations et le positionnement de l’entreprise."
    );
  }

  if (
    audit.conversion_score < 65
  ) {
    issues.push(
      "Le parcours du visiteur et les éléments favorisant la prise de contact peuvent être améliorés."
    );
  }

  if (
    audit.positioning_score < 65
  ) {
    issues.push(
      "La proposition de valeur et la hiérarchie des informations ne permettent pas toujours d’identifier immédiatement les prestations prioritaires."
    );
  }

  if (
    visibilityScore >= 65 &&
    websiteEffectivenessScore >=
      65
  ) {
    issues.push(
      "Le site présente une base solide, avec quelques optimisations ciblées susceptibles d’améliorer encore sa visibilité et son efficacité."
    );
  }

  return issues.slice(
    0,
    4
  );
}

function buildCommercialSummary(
  recommendation:
    CommercialRecommendation,
  visibilityScore: number,
  websiteEffectivenessScore: number
): string {
  if (
    recommendation.type ===
    "new_website"
  ) {
    return "L’analyse met en évidence des faiblesses importantes à la fois dans la visibilité du site et dans son efficacité commerciale. Dans ce contexte, la création d’un nouveau site paraît plus pertinente qu’une succession de corrections ponctuelles.";
  }

  if (
    recommendation.type ===
    "redesign"
  ) {
    if (
      visibilityScore <
      websiteEffectivenessScore
    ) {
      return "Le site dispose d’une base exploitable, mais sa visibilité et son organisation actuelle limitent son potentiel. Une refonte permettrait de retravailler conjointement la présentation des prestations, le parcours de conversion et les fondamentaux SEO, SEO local et GEO-IA.";
    }

    return "Le site possède une base exploitable, mais sa présentation et son parcours ne valorisent pas suffisamment l’offre ni la prise de contact. Une refonte ciblée permettrait d’améliorer son efficacité commerciale tout en consolidant sa visibilité.";
  }

  if (
    visibilityScore <
    websiteEffectivenessScore
  ) {
    return "Le site présente une base suffisamment saine pour être conservée. Le principal potentiel d’amélioration concerne sa visibilité : référencement naturel, présence locale et capacité à être correctement compris par les moteurs de recherche et les assistants IA.";
  }

  return "Le site présente une base satisfaisante et ne nécessite pas de refonte prioritaire. Des optimisations ciblées sur les contenus, la visibilité et le parcours de conversion devraient permettre d’en améliorer l’efficacité.";
}

function applyTechnicalContextToCommercialSummary(
  audit: WebsiteAudit,
  recommendation:
    CommercialRecommendation,
  commercialSummary: string
): string {
  const technicalCaution =
    getTechnicalCaution(
      audit,
      recommendation
    );

  if (
    !technicalCaution
  ) {
    return commercialSummary;
  }

  return `${commercialSummary} Sur le plan technique, ${technicalCaution.charAt(
    0
  ).toLowerCase()}${technicalCaution.slice(
    1
  )}`;
}

export function getWebsiteAuditCommercialDiagnosis(
  audit: WebsiteAudit
): WebsiteAuditCommercialDiagnosis {
  const globalScore =
    normalizeScore(
      audit.global_score
    );

  const positioningScore =
    normalizeScore(
      audit.positioning_score
    );

  const conversionScore =
    normalizeScore(
      audit.conversion_score
    );

  const seoScore =
    normalizeScore(
      audit.seo_score
    );

  const localSeoScore =
    normalizeScore(
      audit.local_seo_score
    );

  const geoScore =
    normalizeScore(
      audit.geo_score
    );

  const visibilityScore =
    average([
      seoScore,
      localSeoScore,
      geoScore,
    ]);

  const websiteEffectivenessScore =
    average([
      positioningScore,
      conversionScore,
      globalScore,
    ]);

  const weaknesses =
    classifyWeaknesses(
      audit.weaknesses
    );

  const recommendation =
    buildRecommendation(
      globalScore,
      visibilityScore,
      websiteEffectivenessScore,
      positioningScore
    );

  const baseCommercialSummary =
    buildCommercialSummary(
      recommendation,
      visibilityScore,
      websiteEffectivenessScore
    );

  const commercialSummary =
    applyTechnicalContextToCommercialSummary(
      audit,
      recommendation,
      baseCommercialSummary
    );

  const technicalCaution =
    getTechnicalCaution(
      audit,
      recommendation
    );

  return {
    recommendation,

    visibility_score:
      visibilityScore,

    website_effectiveness_score:
      websiteEffectivenessScore,

    visibility_severity:
      getSeverity(
        visibilityScore
      ),

    website_severity:
      getSeverity(
        websiteEffectivenessScore
      ),

    weaknesses,

    main_issues:
      buildMainIssues(
        audit,
        visibilityScore,
        websiteEffectivenessScore
      ),

    commercial_summary:
      commercialSummary,

    technical_caution:
      technicalCaution,
  };
}

export async function getCompanyWebsiteAudits(
  companyId: string
): Promise<
  WebsiteAuditSummary[]
> {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from(
      "website_audits"
    )
    .select(
      `
        id,
        company_id,
        website_url,
        scoring_version,
        pages_analyzed,
        global_score,
        positioning_score,
        conversion_score,
        seo_score,
        local_seo_score,
        geo_score,
        created_at
      `
    )
    .eq(
      "company_id",
      companyId
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    );

  if (error) {
    throw new Error(
      `Impossible de charger les audits du site : ${error.message}`
    );
  }

  return (
    data ?? []
  ) as WebsiteAuditSummary[];
}

export async function getWebsiteAuditById(
  auditId: string
): Promise<
  WebsiteAudit | null
> {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from(
      "website_audits"
    )
    .select(
      `
        id,
        company_id,
        website_url,
        scoring_version,
        pages_analyzed,
        analyzed_urls,
        global_score,
        positioning_score,
        conversion_score,
        seo_score,
        local_seo_score,
        geo_score,
        summary,
        strengths,
        weaknesses,
        limitations,
        priorities,
        technical_platform,
        technical_platform_label,
        technical_confidence,
        technical_evidence,
        optimization_feasibility,
        redesign_feasibility,
        new_website_feasibility,
        migration_likely,
        technical_note,
        created_at
      `
    )
    .eq(
      "id",
      auditId
    )
    .maybeSingle();

  if (error) {
    throw new Error(
      `Impossible de charger l’audit : ${error.message}`
    );
  }

  if (!data) {
    return null;
  }

  return {
    id:
      data.id,

    company_id:
      data.company_id,

    website_url:
      data.website_url,

    scoring_version:
      data.scoring_version,

    pages_analyzed:
      data.pages_analyzed,

    analyzed_urls:
      normalizeStringArray(
        data.analyzed_urls
      ),

    global_score:
      data.global_score,

    positioning_score:
      data.positioning_score,

    conversion_score:
      data.conversion_score,

    seo_score:
      data.seo_score,

    local_seo_score:
      data.local_seo_score,

    geo_score:
      data.geo_score,

    summary:
      data.summary ?? "",

    strengths:
      normalizeStringArray(
        data.strengths
      ),

    weaknesses:
      normalizeStringArray(
        data.weaknesses
      ),

    limitations:
      normalizeStringArray(
        data.limitations
      ),

    priorities:
      normalizeStringArray(
        data.priorities
      ),

    technical_platform:
      normalizeTechnicalPlatform(
        data.technical_platform
      ),

    technical_platform_label:
      typeof data.technical_platform_label ===
      "string"
        ? data.technical_platform_label
        : null,

    technical_confidence:
      normalizeTechnicalConfidence(
        data.technical_confidence
      ),

    technical_evidence:
      normalizeStringArray(
        data.technical_evidence
      ),

    optimization_feasibility:
      normalizeTechnicalFeasibility(
        data.optimization_feasibility
      ),

    redesign_feasibility:
      normalizeTechnicalFeasibility(
        data.redesign_feasibility
      ),

    new_website_feasibility:
      normalizeTechnicalFeasibility(
        data.new_website_feasibility
      ),

    migration_likely:
      typeof data.migration_likely ===
      "boolean"
        ? data.migration_likely
        : null,

    technical_note:
      typeof data.technical_note ===
      "string"
        ? data.technical_note
        : null,

    created_at:
      data.created_at,
  };
}