import Link from "next/link";

import {
  getCompanies,
} from "@/lib/companies";

import {
  getAllZohoItems,
  getZohoTaxes,
} from "@/lib/zoho-books";

import NewEstimateForm from "./NewEstimateForm";

export const dynamic = "force-dynamic";

export default async function NewEstimatePage() {
  const [
    companies,
    taxes,
    items,
  ] = await Promise.all([
    getCompanies(),
    getZohoTaxes(),
    getAllZohoItems(),
  ]);

  const activeCompanies =
    companies.filter(
      (company) =>
        company.is_active &&
        company.pipeline_stage !== "lost"
    );

  const vatTax =
    taxes.find(
      (tax) =>
        Number(tax.tax_percentage) === 20
    ) ?? taxes[0];

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <div className="mb-8">
          <Link
            href="/management/estimates"
            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            ← Retour aux devis
          </Link>

          <p className="mt-6 text-sm font-medium uppercase tracking-[0.18em] text-blue-600">
            Gestion
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Nouveau devis
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Le devis sera créé dans Zoho Books.
          </p>
        </div>

        <NewEstimateForm
          companies={activeCompanies.map(
            (company) => ({
              id: company.id,
              name: company.name,
              legal_name:
                company.legal_name,
              relationship_status:
                company.relationship_status,
              city:
                company.city,
              zoho_contact_id:
                company.zoho_contact_id,
            })
          )}
          tax={
            vatTax
              ? {
                  tax_id:
                    vatTax.tax_id,
                  tax_name:
                    vatTax.tax_name,
                  tax_percentage:
                    Number(
                      vatTax.tax_percentage
                    ),
                }
              : null
          }
          items={items.map(
            (item) => ({
              item_id:
                item.item_id,
              name:
                item.name,
              description:
                item.description ?? "",
              rate:
                Number(item.rate) || 0,
              tax_id:
                item.tax_id ?? null,
              tax_name:
                item.tax_name ?? null,
              tax_percentage:
                typeof item.tax_percentage ===
                "number"
                  ? item.tax_percentage
                  : null,
            })
          )}
        />
      </div>
    </main>
  );
}