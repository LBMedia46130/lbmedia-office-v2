import Link from "next/link";
import { notFound } from "next/navigation";

import AuditOpportunityButton from "@/components/companies/AuditOpportunityButton";
import PageBanner from "@/components/dashboard/PageBanner";

import {
  getCompanyById,
} from "@/lib/companies";

import {
  getWebsiteAuditById,
  getWebsiteAuditCommercialDiagnosis,
} from "@/lib/website-audits";

export const dynamic =
  "force-dynamic";

type AuditPageProps = {
  params: Promise<{
    id: string;
    auditId: string;
  }>;
};

export default async function AuditDetailPage({
  params,
}: AuditPageProps) {
  const {
    id,
    auditId,
  } = await params;

  const [
    company,
    audit,
  ] = await Promise.all([
    getCompanyById(id),
    getWebsiteAuditById(
      auditId
    ),
  ]);

  if (
    !company ||
    !audit
  ) {
    notFound();
  }

  const auditCompanyId =
    String(
      audit.company_id ?? ""
    );

  const companyId =
    String(company.id);

  if (
    auditCompanyId !== companyId
  ) {
    notFound();
  }

  const commercialDiagnosis =
    getWebsiteAuditCommercialDiagnosis(
      audit
    );

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <PageBanner
          eyebrow="Audit de site"
          title={company.name}
          description={`Audit réalisé le ${formatDateTime(
            audit.created_at
          )}`}
        />

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            href={`/companies/${company.id}`}
            className="text-sm font-semibold text-slate-500 transition hover:text-slate-950"
          >
            ← Retour à l’entreprise
          </Link>

          <div className="flex flex-wrap gap-3">
            <AuditOpportunityButton
              companyId={
                companyId
              }
              companyName={
                company.name
              }
              websiteUrl={
                audit.website_url
              }
              globalScore={
                audit.global_score
              }
              priorities={
                audit.priorities
              }
              recommendationType={
                commercialDiagnosis
                  .recommendation
                  .type
              }
              recommendationLabel={
                commercialDiagnosis
                  .recommendation
                  .label
              }
              commercialSummary={
                commercialDiagnosis
                  .commercial_summary
              }
              visibilityWeaknesses={
                commercialDiagnosis
                  .weaknesses
                  .visibility
              }
              websiteWeaknesses={
                commercialDiagnosis
                  .weaknesses
                  .website
              }
            />

            <a
              href={
                audit.website_url
              }
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Ouvrir le site
            </a>

            <Link
              href={`/audit?companyId=${encodeURIComponent(
                companyId
              )}&url=${encodeURIComponent(
                company.website ??
                  audit.website_url
              )}`}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Nouvel audit
            </Link>
          </div>
        </div>

        <section className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-900">
                {
                  audit.pages_analyzed
                }{" "}
                {audit.pages_analyzed >
                1
                  ? "pages analysées"
                  : "page analysée"}
              </p>

              <p className="mt-1 break-all text-sm text-blue-700">
                {
                  audit.website_url
                }
              </p>

              <p className="mt-1 text-xs text-blue-500">
                Grille de notation{" "}
                {
                  audit.scoring_version
                }
              </p>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-white px-6 py-4 text-center">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Score global
              </p>

              <p className="mt-1 text-4xl font-bold text-slate-900">
                {
                  audit.global_score
                }
                <span className="ml-1 text-base font-medium text-slate-400">
                  /100
                </span>
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <ScoreCard
            label="Positionnement"
            score={
              audit.positioning_score
            }
          />

          <ScoreCard
            label="Conversion"
            score={
              audit.conversion_score
            }
          />

          <ScoreCard
            label="SEO"
            score={
              audit.seo_score
            }
          />

          <ScoreCard
            label="SEO local"
            score={
              audit.local_seo_score
            }
          />

          <ScoreCard
            label="GEO / IA"
            score={
              audit.geo_score
            }
          />
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-sm">
          <div className="border-b border-indigo-100 bg-indigo-50 px-7 py-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
              Diagnostic commercial
            </p>

            <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Recommandation LBMedia
                </p>

                <h2 className="mt-1 text-3xl font-bold text-slate-950">
                  {
                    commercialDiagnosis
                      .recommendation
                      .label
                  }
                </h2>
              </div>

              <RecommendationBadge
                type={
                  commercialDiagnosis
                    .recommendation
                    .type
                }
                label={
                  commercialDiagnosis
                    .recommendation
                    .short_label
                }
              />
            </div>
          </div>

          <div className="p-7">
            <p className="text-base leading-7 text-slate-700">
              {
                commercialDiagnosis
                  .commercial_summary
              }
            </p>

            <p className="mt-4 text-sm leading-7 text-slate-600">
              {
                commercialDiagnosis
                  .recommendation
                  .description
              }
            </p>

            <div className="mt-7 grid gap-4 md:grid-cols-2">
              <CommercialScoreCard
                label="Visibilité"
                description="SEO · SEO local · GEO / IA"
                score={
                  commercialDiagnosis
                    .visibility_score
                }
                severity={
                  commercialDiagnosis
                    .visibility_severity
                }
              />

              <CommercialScoreCard
                label="Efficacité du site"
                description="Positionnement · conversion · qualité globale"
                score={
                  commercialDiagnosis
                    .website_effectiveness_score
                }
                severity={
                  commercialDiagnosis
                    .website_severity
                }
              />
            </div>

            {commercialDiagnosis
              .main_issues.length >
            0 ? (
              <div className="mt-7">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  Enjeux principaux
                </p>

                <ul className="mt-4 grid gap-3 lg:grid-cols-2">
                  {commercialDiagnosis
                    .main_issues
                    .map(
                      (
                        issue,
                        index
                      ) => (
                        <li
                          key={`${issue}-${index}`}
                          className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700"
                        >
                          <span className="font-bold text-indigo-600">
                            •
                          </span>

                          <span>
                            {
                              issue
                            }
                          </span>
                        </li>
                      )
                    )}
                </ul>
              </div>
            ) : null}

            <div className="mt-7 grid gap-5 lg:grid-cols-2">
              <CommercialWeaknessList
                title="Visibilité & acquisition"
                description="SEO, SEO local, contenus et compréhension par les moteurs et IA."
                items={
                  commercialDiagnosis
                    .weaknesses
                    .visibility
                }
              />

              <CommercialWeaknessList
                title="Site & conversion"
                description="Présentation, lisibilité, parcours, conversion et efficacité commerciale."
                items={
                  commercialDiagnosis
                    .weaknesses
                    .website
                }
              />
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
            Diagnostic
          </p>

          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            Synthèse de l’audit
          </h2>

          <p className="mt-5 whitespace-pre-line text-sm leading-7 text-slate-700">
            {audit.summary}
          </p>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <AuditList
            eyebrow="Diagnostic"
            title="Points forts"
            items={
              audit.strengths
            }
          />

          <AuditList
            eyebrow="Diagnostic"
            title="Points à améliorer"
            items={
              audit.weaknesses
            }
          />
        </div>

        {audit.limitations.length >
        0 ? (
          <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-7">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">
              Périmètre
            </p>

            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              Vérifications complémentaires
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Ces éléments nécessitent des données ou outils complémentaires avant de pouvoir être confirmés.
            </p>

            <ul className="mt-5 space-y-3">
              {audit.limitations.map(
                (
                  limitation,
                  index
                ) => (
                  <li
                    key={`${limitation}-${index}`}
                    className="flex gap-3 text-sm leading-6 text-slate-700"
                  >
                    <span className="mt-1 text-amber-600">
                      •
                    </span>

                    <span>
                      {
                        limitation
                      }
                    </span>
                  </li>
                )
              )}
            </ul>
          </section>
        ) : null}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
            Actions
          </p>

          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            Priorités LBMedia
          </h2>

          <ol className="mt-6 space-y-5">
            {audit.priorities.map(
              (
                priority,
                index
              ) => (
                <li
                  key={`${priority}-${index}`}
                  className="flex gap-4"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                    {index + 1}
                  </div>

                  <p className="pt-1 text-sm leading-6 text-slate-700">
                    {priority}
                  </p>
                </li>
              )
            )}
          </ol>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            Périmètre analysé
          </p>

          <h2 className="mt-2 text-xl font-bold text-slate-900">
            Pages parcourues
          </h2>

          <div className="mt-5 space-y-2">
            {audit.analyzed_urls.map(
              (
                url,
                index
              ) => (
                <a
                  key={`${url}-${index}`}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="block break-all rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
                >
                  {url}
                </a>
              )
            )}
          </div>
        </section>

        <div className="mt-8 pb-10">
          <Link
            href={`/companies/${company.id}`}
            className="inline-flex rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            ← Retour à la fiche entreprise
          </Link>
        </div>
      </div>
    </main>
  );
}

function RecommendationBadge({
  type,
  label,
}: {
  type:
    | "optimization"
    | "redesign"
    | "new_website";
  label: string;
}) {
  const className =
    type === "new_website"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : type === "redesign"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <span
      className={`inline-flex w-fit rounded-full border px-4 py-2 text-sm font-bold ${className}`}
    >
      {label}
    </span>
  );
}

function CommercialScoreCard({
  label,
  description,
  score,
  severity,
}: {
  label: string;
  description: string;
  score: number;
  severity:
    | "low"
    | "medium"
    | "high";
}) {
  const severityLabel =
    severity === "high"
      ? "Prioritaire"
      : severity === "medium"
        ? "À renforcer"
        : "Satisfaisant";

  const severityClassName =
    severity === "high"
      ? "text-rose-600"
      : severity === "medium"
        ? "text-amber-600"
        : "text-emerald-600";

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-bold text-slate-900">
            {label}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </p>
        </div>

        <div className="text-right">
          <p className="text-2xl font-bold text-slate-950">
            {score}
            <span className="ml-1 text-xs font-medium text-slate-400">
              /100
            </span>
          </p>

          <p
            className={`mt-1 text-xs font-bold ${severityClassName}`}
          >
            {
              severityLabel
            }
          </p>
        </div>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-indigo-600"
          style={{
            width: `${Math.max(
              0,
              Math.min(
                100,
                score
              )
            )}%`,
          }}
        />
      </div>
    </div>
  );
}

function CommercialWeaknessList({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="font-bold text-slate-900">
        {title}
      </h3>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {description}
      </p>

      {items.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {items
            .slice(
              0,
              5
            )
            .map(
              (
                item,
                index
              ) => (
                <li
                  key={`${item}-${index}`}
                  className="flex gap-3 text-sm leading-6 text-slate-700"
                >
                  <span className="mt-1 font-bold text-indigo-600">
                    •
                  </span>

                  <span>
                    {item}
                  </span>
                </li>
              )
            )}
        </ul>
      ) : (
        <p className="mt-4 text-sm italic text-slate-400">
          Aucun point prioritaire identifié dans cette catégorie.
        </p>
      )}
    </div>
  );
}

function ScoreCard({
  label,
  score,
}: {
  label: string;
  score: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-slate-900">
        {score}
        <span className="ml-1 text-xs font-medium text-slate-400">
          /100
        </span>
      </p>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-blue-600"
          style={{
            width: `${Math.max(
              0,
              Math.min(
                100,
                score
              )
            )}%`,
          }}
        />
      </div>
    </div>
  );
}

function AuditList({
  eyebrow,
  title,
  items,
}: {
  eyebrow: string;
  title: string;
  items: string[];
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
        {eyebrow}
      </p>

      <h2 className="mt-2 text-2xl font-bold text-slate-900">
        {title}
      </h2>

      <ul className="mt-5 space-y-3">
        {items.map(
          (
            item,
            index
          ) => (
            <li
              key={`${item}-${index}`}
              className="flex gap-3 text-sm leading-6 text-slate-700"
            >
              <span className="mt-1 text-blue-600">
                •
              </span>

              <span>
                {item}
              </span>
            </li>
          )
        )}
      </ul>
    </section>
  );
}

function formatDateTime(
  value: string
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      dateStyle:
        "long",
      timeStyle:
        "short",
    }
  ).format(date);
}