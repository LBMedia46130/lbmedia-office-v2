import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
export const dynamic = "force-dynamic";
const allowedStatuses = ["draft", "ready", "sent", "follow_up", "replied"] as const;
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "25") || 25));
    const search = (searchParams.get("search") ?? "").trim();
    const status = (searchParams.get("status") ?? "").trim();
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    let companyIds: string[] = [];
    if (search) {
      const { data: matchingCompanies, error: companyError } = await supabaseAdmin
        .from("companies")
        .select("id")
        .ilike("name", `%${search}%`)
        .limit(100);
      if (companyError) {
        throw new Error(`Impossible de rechercher les entreprises : ${companyError.message}`);
      }
      companyIds = (matchingCompanies ?? []).map((company) => company.id);
    }
    let query = supabaseAdmin
      .from("audit_prospections")
      .select(`
        id,
        company_id,
        status,
        recipient_email,
        subject,
        sent_subject,
        sales_angle,
        sent_at,
        follow_up_at,
        replied_at,
        created_at
      `, { count: "exact" });
    if (status && allowedStatuses.includes(status as (typeof allowedStatuses)[number])) {
      query = query.eq("status", status);
    }
    if (search) {
      const escapedSearch = search.replace(/[%_,()]/g, "");
      if (companyIds.length > 0) {
        query = query.or(`recipient_email.ilike.%${escapedSearch}%,subject.ilike.%${escapedSearch}%,sent_subject.ilike.%${escapedSearch}%,company_id.in.(${companyIds.join(",")})`);
      } else {
        query = query.or(`recipient_email.ilike.%${escapedSearch}%,subject.ilike.%${escapedSearch}%,sent_subject.ilike.%${escapedSearch}%`);
      }
    }
    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) {
      throw new Error(`Impossible de charger l’historique des prospections : ${error.message}`);
    }
    const prospectionCompanyIds = Array.from(new Set((data ?? []).map((prospection) => prospection.company_id).filter(Boolean))) as string[];
    let companies: { id: string; name: string }[] = [];
    if (prospectionCompanyIds.length > 0) {
      const { data: companyData, error: companiesError } = await supabaseAdmin
        .from("companies")
        .select("id,name")
        .in("id", prospectionCompanyIds);
      if (companiesError) {
        throw new Error(`Impossible de charger les entreprises : ${companiesError.message}`);
      }
      companies = companyData ?? [];
    }
    return NextResponse.json({
      success: true,
      prospections: data ?? [],
      companies,
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.max(1, Math.ceil((count ?? 0) / limit)),
      },
    });
  } catch (error) {
    console.error("Prospection history error:", error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : "Impossible de charger l’historique des prospections.",
    }, { status: 500 });
  }
}
