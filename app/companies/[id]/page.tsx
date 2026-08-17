import Link from "next/link";
import { notFound } from "next/navigation";

import PageBanner from "@/components/dashboard/PageBanner";
import CompanyContacts from "@/components/companies/CompanyContacts";
import CompanyOpportunities from "@/components/companies/CompanyOpportunities";
import CompanyLegalSearch from "@/components/companies/CompanyLegalSearch";
import CompanyWebEnrichment from "@/components/companies/CompanyWebEnrichment";
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

import {
  getCompanyWebsiteAudits,
} from "@/lib/website-audits";

import {
  getAuditProspectionByAuditId,
} from "@/lib/audit-prospections";

import {
  prepareAuditProspection,
} from "./auditProspectionActions";

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
    websiteAudits,
  ] = await Promise.all([
    getCompanyContacts(id),
    getCompanyOpportunities(
      id
    ),
    getCompanyWebsiteAudits(
      id
    ),
  ]);

  const latestAudit =
    websiteAudits[0] ??
    null;

  const latestProspection =
    latestAudit
      ? await getAuditProspectionByAuditId(
          latestAudit.id
        )
      : null;

  const fullAddress = [
    company.address,
    company.address_line_2,
    [
      company.postal_code,
      company.city,
    ]
      .filter(Boolean)
      .join(" "),
    company.state,
    company.country,
  ]
    .filter(Boolean)
    .join("\n");

  const hasAdministrativeInfo =
    Boolean(
      company.customer_number ||
        company.siren ||
        company.siret ||
        company.vat_number ||
        company.legal_form ||
        company.ape_code ||
        company.ape_label ||
        company.creation_date
    );

  const hasNotes =
    Boolean(
      company.notes?.trim()
    );

  const auditUrl =
    company.website
      ? `/audit?companyId=${encodeURIComponent(
          company.id
        )}&url=${encodeURIComponent(
          company.website
        )}`
      : `/audit?companyId=${encodeURIComponent(
          company.id
        )}`;

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

            <Link
              href={`/companies/${company.id}/edit`}
              className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
            >
              Modifier
            </Link>

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
              label="Adresse"
              value={
                fullAddress ||
                "Non renseignée"
              }
              multiline
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

          <div className="mt-8 border-t border-slate-200 pt-8">
            <CompanyLegalSearch
              companyId={
                company.id
              }
              initialName={
                company.name
              }
              initialSiren={
                company.siren
              }
              initialSiret={
                company.siret
              }
              initialPostalCode={
                company.postal_code
              }
            />

            <div className="mt-6">
              <CompanyWebEnrichment
                companyId={
                  company.id
                }
                initialLinkedinUrl={
                  company.linkedin_url
                }
                initialFacebookUrl={
                  company.facebook_url
                }
                initialBusinessDescription={
                  company.business_description
                }
              />
            </div>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-8">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                      Audits de site
                    </p>

                    {websiteAudits.length >
                    0 ? (
                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                        {
                          websiteAudits.length
                        }{" "}
                        {websiteAudits.length >
                        1
                          ? "audits"
                          : "audit"}
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-1 text-sm text-slate-500">
                    Historique des
                    analyses du site
                    internet de
                    l’entreprise.
                  </p>
                </div>

                <Link
                  href={auditUrl}
                  className="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-50"
                >
                  + Nouvel audit
                </Link>
              </div>

              {latestAudit ? (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-sm font-semibold text-slate-900">
                          Dernier audit
                        </p>

                        <span className="text-xs text-slate-400">
                          {formatDateTime(
                            latestAudit.created_at
                          )}
                        </span>
                      </div>

                      <a
                        href={
                          latestAudit.website_url
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 block truncate text-sm font-semibold text-blue-600 transition hover:text-blue-700"
                      >
                        {
                          latestAudit.website_url
                        }
                      </a>

                      <p className="mt-2 text-xs text-slate-400">
                        {
                          latestAudit.pages_analyzed
                        }{" "}
                        {latestAudit.pages_analyzed >
                        1
                          ? "pages analysées"
                          : "page analysée"}{" "}
                        · Scoring{" "}
                        {
                          latestAudit.scoring_version
                        }
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Score global
                        </p>

                        <p className="mt-1 text-3xl font-bold text-slate-900">
                          {
                            latestAudit.global_score
                          }
                          <span className="ml-1 text-sm font-medium text-slate-400">
                            / 100
                          </span>
                        </p>
                      </div>

                      <Link
                        href={`/companies/${company.id}/audits/${latestAudit.id}`}
                        className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        Voir l’audit complet
                      </Link>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                    <MiniScore
                      label="Positionnement"
                      score={
                        latestAudit.positioning_score
                      }
                    />

                    <MiniScore
                      label="Conversion"
                      score={
                        latestAudit.conversion_score
                      }
                    />

                    <MiniScore
                      label="SEO"
                      score={
                        latestAudit.seo_score
                      }
                    />

                    <MiniScore
                      label="SEO local"
                      score={
                        latestAudit.local_seo_score
                      }
                    />

                    <MiniScore
                      label="GEO / IA"
                      score={
                        latestAudit.geo_score
                      }
                    />
                  </div>

                  {websiteAudits.length >
                  1 ? (
                    <p className="mt-4 text-xs text-slate-400">
                      +
                      {websiteAudits.length -
                        1}{" "}
                      audit
                      {websiteAudits.length -
                        1 >
                      1
                        ? "s"
                        : ""}{" "}
                      précédent
                      {websiteAudits.length -
                        1 >
                      1
                        ? "s"
                        : ""}{" "}
                      enregistré
                      {websiteAudits.length -
                        1 >
                      1
                        ? "s"
                        : ""}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-6 text-center">
                  <p className="text-sm font-semibold text-slate-700">
                    Aucun audit
                    enregistré
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Lancez le premier
                    audit du site de
                    cette entreprise.
                  </p>
                </div>
              )}
            </div>
          </div>

          {latestAudit ? (
            <div className="mt-8 border-t border-slate-200 pt-8">
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
                        Prospection après audit
                      </p>

                      {latestProspection ? (
                        <ProspectionStatusBadge
                          status={
                            latestProspection.status
                          }
                        />
                      ) : null}
                    </div>

                    <h3 className="mt-2 text-xl font-bold text-slate-900">
                      Transformer l’audit
                      en prise de contact
                    </h3>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                      Préparer une approche
                      commerciale personnalisée
                      à partir des points relevés
                      dans le dernier audit.
                    </p>
                  </div>

                  {latestProspection ? (
                    <div className="shrink-0">
                      <p className="text-sm font-semibold text-slate-800">
                        Prospection créée
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {formatDateTime(
                          latestProspection.created_at
                        )}
                      </p>
                    </div>
                  ) : (
                    <form
                      action={prepareAuditProspection.bind(
                        null,
                        company.id,
                        latestAudit.id,
                        company.email
                      )}
                    >
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                      >
                        Préparer la prospection
                      </button>
                    </form>
                  )}
                </div>

                {latestProspection ? (
                  <div className="mt-6 grid gap-4 border-t border-indigo-200 pt-5 sm:grid-cols-2 lg:grid-cols-3">
                    <ProspectionInfo
                      label="Destinataire"
                      value={
                        latestProspection.recipient_email ||
                        company.email ||
                        "À renseigner"
                      }
                    />

                    <ProspectionInfo
                      label="Objet"
                      value={
                        latestProspection.subject ||
                        "À générer"
                      }
                    />

                    <ProspectionInfo
                      label="Angle commercial"
                      value={
                        latestProspection.sales_angle ||
                        "À définir"
                      }
                    />
                  </div>
                ) : null}

                {latestProspection ? (
                  <div className="mt-5 rounded-xl border border-indigo-100 bg-white px-4 py-4">
                    <p className="text-sm font-semibold text-slate-800">
                      Prochaine étape
                    </p>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Générer l’angle commercial
                      et le mail de prospection
                      directement à partir des
                      résultats de l’audit.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {hasAdministrativeInfo ? (
            <div className="mt-8 border-t border-slate-200 pt-8">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                    Données légales
                  </p>

                  {company.legal_data_updated_at ? (
                    <p className="mt-1 text-xs text-slate-400">
                      Mise à jour{" "}
                      {formatDateTime(
                        company.legal_data_updated_at
                      )}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {company.customer_number ? (
                  <InfoBlock
                    label="N° client"
                    value={
                      company.customer_number
                    }
                  />
                ) : null}

                {company.legal_name ? (
                  <InfoBlock
                    label="Raison sociale"
                    value={
                      company.legal_name
                    }
                  />
                ) : null}

                {company.legal_form ? (
                  <InfoBlock
                    label="Forme juridique"
                    value={
                      company.legal_form
                    }
                  />
                ) : null}

                {company.siren ? (
                  <InfoBlock
                    label="SIREN"
                    value={
                      company.siren
                    }
                  />
                ) : null}

                {company.siret ? (
                  <InfoBlock
                    label="SIRET du siège"
                    value={
                      company.siret
                    }
                  />
                ) : null}

                {company.vat_number ? (
                  <InfoBlock
                    label="TVA intracommunautaire"
                    value={
                      company.vat_number
                    }
                  />
                ) : null}

                {company.ape_code ? (
                  <InfoBlock
                    label="Code APE / NAF"
                    value={
                      company.ape_code
                    }
                  />
                ) : null}

                {company.ape_label ? (
                  <InfoBlock
                    label="Activité principale"
                    value={
                      company.ape_label
                    }
                  />
                ) : null}

                {company.creation_date ? (
                  <InfoBlock
                    label="Date de création"
                    value={
                      formatDate(
                        company.creation_date
                      )
                    }
                  />
                ) : null}
              </div>
            </div>
          ) : null}

          {hasNotes ? (
            <div className="mt-8 border-t border-slate-200 pt-8">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                Notes
              </p>

              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {company.notes}
                </p>
              </div>
            </div>
          ) : null}
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
  multiline?: boolean;
};

function InfoBlock({
  label,
  value,
  href,
  external = false,
  multiline = false,
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
          className="mt-2 block break-words font-semibold text-blue-600 transition hover:text-blue-700"
        >
          {value}
        </a>
      ) : (
        <p
          className={`mt-2 font-semibold text-slate-800 ${
            multiline
              ? "whitespace-pre-line leading-7"
              : ""
          }`}
        >
          {value}
        </p>
      )}
    </div>
  );
}

function MiniScore({
  label,
  score,
}: {
  label: string;
  score: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-lg font-bold text-slate-800">
        {score}
        <span className="ml-1 text-xs font-medium text-slate-400">
          /100
        </span>
      </p>
    </div>
  );
}

function ProspectionInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-indigo-100 bg-white px-4 py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-400">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function ProspectionStatusBadge({
  status,
}: {
  status:
    | "draft"
    | "ready"
    | "sent"
    | "follow_up"
    | "replied";
}) {
  const labels = {
    draft: "À préparer",
    ready: "Prête",
    sent: "Envoyée",
    follow_up: "Relance à faire",
    replied: "Réponse reçue",
  };

  return (
    <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">
      {labels[status]}
    </span>
  );
}

function formatDate(
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
    "fr-FR"
  ).format(date);
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
        "short",
      timeStyle:
        "short",
    }
  ).format(date);
}