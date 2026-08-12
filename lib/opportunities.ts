import { supabaseAdmin } from "@/lib/supabase-admin";

export type Opportunity = {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  status: string;
  value: number | null;
  probability: number;
  expected_close_date: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
};

export async function getCompanyOpportunities(
  companyId: string
): Promise<Opportunity[]> {
  const { data, error } =
    await supabaseAdmin
      .from("opportunities")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", {
        ascending: false,
      });

  if (error) {
    throw new Error(
      `Impossible de charger les opportunités : ${error.message}`
    );
  }

  return (data ?? []) as Opportunity[];
}