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

export type WebsiteAudit =
  WebsiteAuditSummary & {
    analyzed_urls: string[];

    summary: string;

    strengths: string[];
    weaknesses: string[];
    limitations: string[];
    priorities: string[];
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

export async function getCompanyWebsiteAudits(
  companyId: string
): Promise<WebsiteAuditSummary[]> {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from("website_audits")
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
): Promise<WebsiteAudit | null> {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from("website_audits")
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
    id: data.id,
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

    created_at:
      data.created_at,
  };
}