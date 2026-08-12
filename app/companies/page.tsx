import CompaniesExplorer from "@/components/companies/CompaniesExplorer";
import ImportCompaniesButton from "@/components/companies/ImportCompaniesButton";
import NewCompanyButton from "@/components/companies/NewCompanyButton";
import PageBanner from "@/components/dashboard/PageBanner";

import {
  getCompanies,
  type Company,
} from "@/lib/companies";

export const dynamic =
  "force-dynamic";

export default async function CompaniesPage() {
  let companies: Company[] =
    [];

  let hasError = false;

  try {
    companies =
      await getCompanies();
  } catch (error) {
    console.error(error);
    hasError = true;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <PageBanner
          eyebrow="CRM"
          title="Entreprises"
          description="Clients, prospects, partenaires et suivi commercial LBMedia."
        />

        <div className="mt-6 flex flex-wrap items-start justify-end gap-3">
          <ImportCompaniesButton />

          <NewCompanyButton />
        </div>

        <div className="mt-8">
          {hasError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-red-800">
                Impossible de charger
                les entreprises
              </h2>

              <p className="mt-2 text-sm text-red-700">
                Une erreur est survenue
                lors de la récupération
                des données.
              </p>
            </div>
          ) : companies.length ===
            0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900">
                Aucune entreprise
                enregistrée
              </h2>

              <p className="mt-3 text-slate-500">
                Ajoute une entreprise
                ou importe directement
                tes clients Zoho.
              </p>

              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <ImportCompaniesButton />

                <NewCompanyButton />
              </div>
            </div>
          ) : (
            <CompaniesExplorer
              companies={
                companies
              }
            />
          )}
        </div>
      </div>
    </main>
  );
}