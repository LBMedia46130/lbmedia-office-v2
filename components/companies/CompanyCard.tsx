import Link from "next/link";

import PipelineBadge from "@/components/ui/PipelineBadge";

import type {
  Company,
} from "@/lib/companies";

type Props = {
  company: Company;
};

export default function CompanyCard({
  company,
}: Props) {
  const location = [
    company.postal_code,
    company.city,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md">
      <Link
        href={`/companies/${company.id}`}
        aria-label={`Ouvrir la fiche de ${company.name}`}
        className="absolute inset-0 z-0 rounded-2xl"
      />

      <div className="pointer-events-none relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-xl font-bold text-slate-900">
              {company.name}
            </h3>

            {company.legal_name &&
            company.legal_name !==
              company.name ? (
              <p className="mt-1 text-sm text-slate-500">
                {company.legal_name}
              </p>
            ) : null}
          </div>

          <span
            className={[
              "shrink-0 rounded-full px-3 py-1 text-xs font-semibold",
              company.is_active
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-500",
            ].join(" ")}
          >
            {company.is_active
              ? "Active"
              : "Inactive"}
          </span>
        </div>

        <div className="mt-5">
          <PipelineBadge
            stage={
              company.pipeline_stage
            }
            compact
          />
        </div>

        <div className="mt-6 space-y-2 text-sm text-slate-600">
          {location ? (
            <p className="font-medium text-slate-700">
              {location}
            </p>
          ) : null}

          {company.email ? (
            <p>
              <a
                href={`mailto:${company.email}`}
                className="pointer-events-auto relative z-20 break-all transition hover:text-blue-700"
              >
                {company.email}
              </a>
            </p>
          ) : null}

          {company.phone ? (
            <p>
              <a
                href={`tel:${company.phone}`}
                className="pointer-events-auto relative z-20 transition hover:text-blue-700"
              >
                {company.phone}
              </a>
            </p>
          ) : null}

          {company.website ? (
            <p>
              <a
                href={company.website}
                target="_blank"
                rel="noreferrer"
                className="pointer-events-auto relative z-20 block truncate transition hover:text-blue-700"
              >
                {company.website}
              </a>
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}