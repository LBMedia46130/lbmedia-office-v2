import { supabaseAdmin } from "@/lib/supabase-admin";

export type CompanyContact = {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  is_primary: boolean;
  created_at: string;
};

export async function getCompanyContacts(
  companyId: string
): Promise<CompanyContact[]> {
  const { data, error } =
    await supabaseAdmin
      .from("company_contacts")
      .select("*")
      .eq("company_id", companyId)
      .order("is_primary", {
        ascending: false,
      })
      .order("last_name", {
        ascending: true,
      })
      .order("first_name", {
        ascending: true,
      });

  if (error) {
    throw new Error(
      `Impossible de charger les contacts : ${error.message}`
    );
  }

  return (data ?? []) as CompanyContact[];
}