import { supabaseAdmin } from "@/lib/supabase-admin";

export type RelationshipStatus =
  | "prospect"
  | "client";

export type PipelineStage =
  | "new"
  | "contact"
  | "meeting"
  | "proposal"
  | "negotiation"
  | "client"
  | "lost";

export type Company = {
  id: string;

  name: string;
  legal_name: string | null;

  email: string | null;
  phone: string | null;
  website: string | null;

  address: string | null;
  address_line_2: string | null;
  postal_code: string | null;
  city: string | null;
  state: string | null;
  country: string | null;

  customer_number: string | null;

  siren: string | null;
  siret: string | null;
  vat_number: string | null;

  legal_form: string | null;

  ape_code: string | null;
  ape_label: string | null;

  creation_date: string | null;
  employee_range: string | null;

  legal_data_updated_at: string | null;

  notes: string | null;
  zoho_contact_id: string | null;

  is_active: boolean;

  relationship_status: RelationshipStatus;
  pipeline_stage: PipelineStage;

  sector: string | null;
  business_description: string | null;
  target_audience: string | null;
  geographic_area: string | null;

  tone_of_voice: string | null;
  communication_style: string | null;

  services: string[];
  products: string[];
  strengths: string[];
  values: string[];

  seo_keywords: string[];
  geo_keywords: string[];
  competitors: string[];

  preferred_channels: string[];
  publication_frequency: string | null;
  editorial_objectives: string[];

  ai_instructions: string | null;
  ai_do_not: string | null;
  brand_story: string | null;
};

export type UpdateCompanyInput = {
  name: string;
  legal_name: string | null;

  email: string | null;
  phone: string | null;
  website: string | null;

  address?: string | null;
  address_line_2?: string | null;
  postal_code: string | null;
  city: string | null;
  state?: string | null;
  country?: string | null;

  customer_number?: string | null;

  siren?: string | null;
  siret?: string | null;
  vat_number?: string | null;

  legal_form?: string | null;

  ape_code?: string | null;
  ape_label?: string | null;

  creation_date?: string | null;
  employee_range?: string | null;

  legal_data_updated_at?: string | null;

  notes?: string | null;
  zoho_contact_id?: string | null;

  is_active: boolean;

  relationship_status: RelationshipStatus;
  pipeline_stage: PipelineStage;

  sector?: string | null;
  business_description?: string | null;
  target_audience?: string | null;
  geographic_area?: string | null;

  tone_of_voice?: string | null;
  communication_style?: string | null;

  services?: string[];
  products?: string[];
  strengths?: string[];
  values?: string[];

  seo_keywords?: string[];
  geo_keywords?: string[];
  competitors?: string[];

  preferred_channels?: string[];
  publication_frequency?: string | null;
  editorial_objectives?: string[];

  ai_instructions?: string | null;
  ai_do_not?: string | null;
  brand_story?: string | null;
};

function normalizeCompany(
  company: Company
): Company {
  return {
    ...company,

    services:
      company.services ?? [],

    products:
      company.products ?? [],

    strengths:
      company.strengths ?? [],

    values:
      company.values ?? [],

    seo_keywords:
      company.seo_keywords ?? [],

    geo_keywords:
      company.geo_keywords ?? [],

    competitors:
      company.competitors ?? [],

    preferred_channels:
      company.preferred_channels ?? [],

    editorial_objectives:
      company.editorial_objectives ?? [],
  };
}

export async function getCompanies(): Promise<
  Company[]
> {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from("companies")
    .select("*")
    .order("name", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Impossible de charger les entreprises : ${error.message}`
    );
  }

  return (
    (data ?? []) as Company[]
  ).map(
    normalizeCompany
  );
}

export async function getCompanyById(
  id: string
): Promise<Company | null> {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from("companies")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Impossible de charger l’entreprise : ${error.message}`
    );
  }

  if (!data) {
    return null;
  }

  return normalizeCompany(
    data as Company
  );
}

export async function updateCompany(
  id: string,
  company: UpdateCompanyInput
): Promise<void> {
  const {
    error,
  } = await supabaseAdmin
    .from("companies")
    .update(company)
    .eq("id", id);

  if (error) {
    throw new Error(
      `Impossible de modifier l’entreprise : ${error.message}`
    );
  }
}