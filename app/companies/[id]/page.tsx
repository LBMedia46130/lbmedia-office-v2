import Link from "next/link";
import { notFound } from "next/navigation";

import PageBanner from "@/components/dashboard/PageBanner";
import CompanyContacts from "@/components/companies/CompanyContacts";
import CompanyOpportunities from "@/components/companies/CompanyOpportunities";
import DeleteCompanyButton from "@/components/companies/DeleteCompanyButton";
import PipelineBadge from "@/components/ui/PipelineBadge";

import {
  getCompanyById,
} from "@/lib/companies";

import {
  getCompanyContacts,
} from "@/lib/company-contacts";

import {
  getCompanyOpportunities,
} from "@/lib/opportunities";

export const dynamic =
  "force-dynamic";

type CompanyPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CompanyPage({
  params,
}: CompanyPageProps) {
  const { id } =
    await params;

  const company =
    await getCompanyById(id);

  if (!company) {
    notFound();
  }

  const [
    contacts,
    opportunities,
  ] = await Promise.all([
    getCompanyContacts(id),
    getCompanyOpportunities(
      id
    ),
  ]);

  const location = [
    company.postal_code,
    company.city,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <PageBanner
          eyebrow="CRM"
          title={company.name}
          description="Coordonnées, contacts et suivi commercial de l’entreprise."
        />

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/companies"
            className="text-sm font-semibold text-slate-500 transition hover:text-slate-950"
          >
            ← Retour aux entreprises
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <PipelineBadge
              stage={
                company.pipeline_stage
              }
            />

            <span
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                company.is_active
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {company.is_active
                ? "Active"
                : "Inactive"}
            </span>

            <DeleteCompanyButton
              companyId={
                company.id
              }
              companyName={
                company.name
              }
            />
          </div>
        </div>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-slate-900 shadow-sm">
          <div className="border-b border-slate-200 pb-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
              Fiche entreprise
            </p>

            <h2 className="mt-2 text-3xl font-bold">
              {company.name}
            </h2>

            {company.legal_name ? (
              <p className="mt-2 text-slate-500">
                {
                  company.legal_name
                }
              </p>
            ) : null}
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <InfoBlock
              label="Localisation"
              value={
                location ||
                "Non renseignée"
              }
            />

            <InfoBlock
              label="Téléphone"
              value={
                company.phone ||
                "Non renseigné"
              }
              href={
                company.phone
                  ? `tel:${company.phone}`
                  : undefined
              }
            />

            <InfoBlock
              label="E-mail"
              value={
                company.email ||
                "Non renseigné"
              }
              href={
                company.email
                  ? `mailto:${company.email}`
                  : undefined
              }
            />

            <InfoBlock
              label="Site internet"
              value={
                company.website ||
                "Non renseigné"
              }
              href={
                company.website ||
                undefined
              }
              external
            />
          </div>
        </section>

        <div className="mt-8">
          <CompanyContacts
            companyId={
              company.id
            }
            contacts={
              contacts
            }
          />
        </div>

        <div className="mt-8 pb-10">
          <CompanyOpportunities
            companyId={
              company.id
            }
            opportunities={
              opportunities
            }
          />
        </div>
      </div>
    </main>
  );
}

type InfoBlockProps = {
  label: string;
  value: string;
  href?: string;
  external?: boolean;
};

function InfoBlock({
  label,
  value,
  href,
  external = false,
}: InfoBlockProps) {
  return (
    <div className="rounded-2xl border border-slate-200 p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>

      {href ? (
        <a
          href={href}
          target={
            external
              ? "_blank"
              : undefined
          }
          rel={
            external
              ? "noreferrer"
              : undefined
          }
          className="mt-2 block font-semibold text-blue-600 transition hover:text-blue-700"
        >
          {value}
        </a>
      ) : (
        <p className="mt-2 font-semibold text-slate-800">
          {value}
        </p>
      )}
    </div>
  );
}