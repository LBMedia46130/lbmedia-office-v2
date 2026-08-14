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