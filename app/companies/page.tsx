import Link from "next/link";

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

  const activeCount =
    companies.filter(
      (company) =>
        company.is_active
    ).length;

  const clientCount =
    companies.filter(
      (company) =>
        company.relationship_status ===
        "client"
    ).length;

  const prospectCount =
    companies.filter(
      (company) =>
        company.relationship_status ===
        "prospect"
    ).length;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <PageBanner
          eyebrow="CRM"
          title="Entreprises"
          description="Clients, prospects, partenaires et suivi commercial LBMedia."
        />

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <StatCard
            label="Entreprises actives"
            value={activeCount}
            tone="cyan"
          />

          <StatCard
            label="Clients"
            value={clientCount}
            tone="emerald"
          />

          <StatCard
            label="Prospects"
            value={prospectCount}
            tone="amber"
          />
        </section>

        <section className="mt-6 rounded-2xl border border-blue-100 bg-gradient-to-r from-white via-blue-50/50 to-cyan-50/70 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                Gestion CRM
              </p>

              <p className="mt-1 text-sm text-slate-600">
                Ajoute une entreprise,
                importe un fichier ou
                récupère directement un
                client existant dans
                Zoho Books.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/companies/import-zoho"
                className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
              >
                Importer depuis Zoho
              </Link>

              <ImportCompaniesButton />

              <NewCompanyButton />
            </div>
          </div>
        </section>

        <div className="mt-8">
          {hasError ? (
            <div className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-rose-50 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-red-800">
                Impossible de charger les entreprises
              </h2>

              <p className="mt-2 text-sm text-red-700">
                Une erreur est survenue lors de la récupération des données.
              </p>
            </div>
          ) : companies.length ===
            0 ? (
            <div className="rounded-2xl border border-dashed border-cyan-200 bg-gradient-to-br from-white via-cyan-50/40 to-blue-50/50 p-16 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-100 text-xl font-bold text-cyan-700">
                +
              </div>

              <h2 className="mt-5 text-2xl font-bold text-slate-900">
                Aucune entreprise enregistrée
              </h2>

              <p className="mt-3 text-slate-500">
                Ajoute une entreprise
                ou récupère directement
                tes clients Zoho.
              </p>

              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link
                  href="/companies/import-zoho"
                  className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
                >
                  Importer depuis Zoho
                </Link>

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

type StatTone =
  | "cyan"
  | "emerald"
  | "amber";

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: StatTone;
}) {
  const styles: Record<
    StatTone,
    {
      card: string;
      label: string;
      value: string;
      dot: string;
    }
  > = {
    cyan: {
      card:
        "border-cyan-200 bg-gradient-to-br from-white to-cyan-50",
      label:
        "text-cyan-700",
      value:
        "text-cyan-700",
      dot:
        "bg-cyan-500",
    },

    emerald: {
      card:
        "border-emerald-200 bg-gradient-to-br from-white to-emerald-50",
      label:
        "text-emerald-700",
      value:
        "text-emerald-700",
      dot:
        "bg-emerald-500",
    },

    amber: {
      card:
        "border-amber-200 bg-gradient-to-br from-white to-amber-50",
      label:
        "text-amber-700",
      value:
        "text-amber-700",
      dot:
        "bg-amber-400",
    },
  };

  const style =
    styles[tone];

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm ${style.card}`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 rounded-full ${style.dot}`}
        />

        <p
          className={`text-sm font-semibold ${style.label}`}
        >
          {label}
        </p>
      </div>

      <p
        className={`mt-3 text-3xl font-bold tracking-tight ${style.value}`}
      >
        {value}
      </p>
    </div>
  );
}