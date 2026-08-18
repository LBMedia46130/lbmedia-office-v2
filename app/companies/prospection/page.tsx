import Link from "next/link";

import PageBanner from "@/components/dashboard/PageBanner";

import {
  getCompanies,
} from "@/lib/companies";

import {
  getAuditProspections,
  type AuditProspection,
  type AuditProspectionStatus,
} from "@/lib/audit-prospections";

export const dynamic =
  "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    status?: string;
  }>;
};

type ViewFilter =
  | "all"
  | "draft"
  | "ready"
  | "sent"
  | "scheduled"
  | "due"
  | "replied";

export default async function ProspectionPage({
  searchParams,
}: PageProps) {
  const params =
    await searchParams;

  const requestedFilter =
    params.status ??
    "all";

  const activeFilter =
    isViewFilter(
      requestedFilter
    )
      ? requestedFilter
      : "all";

  const [
    companies,
    prospections,
  ] = await Promise.all([
    getCompanies(),
    getAuditProspections(),
  ]);

  const companiesById =
    new Map(
      companies.map(
        (company) => [
          company.id,
          company,
        ]
      )
    );

  const now =
    Date.now();

  const rows =
    prospections.map(
      (prospection) => ({
        prospection,
        company:
          companiesById.get(
            prospection.company_id
          ) ?? null,
      })
    );

  const draftCount =
    rows.filter(
      ({ prospection }) =>
        prospection.status ===
        "draft"
    ).length;

  const readyCount =
    rows.filter(
      ({ prospection }) =>
        prospection.status ===
        "ready"
    ).length;

  const sentCount =
    rows.filter(
      ({ prospection }) =>
        prospection.status ===
        "sent"
    ).length;

  const scheduledCount =
    rows.filter(
      ({ prospection }) =>
        isScheduledFollowUp(
          prospection,
          now
        )
    ).length;

  const dueCount =
    rows.filter(
      ({ prospection }) =>
        isDueFollowUp(
          prospection,
          now
        )
    ).length;

  const repliedCount =
    rows.filter(
      ({ prospection }) =>
        prospection.status ===
        "replied"
    ).length;

  const filteredRows =
    rows
      .filter(
        ({ prospection }) =>
          matchesFilter(
            prospection,
            activeFilter,
            now
          )
      )
      .sort(
        (
          rowA,
          rowB
        ) =>
          compareProspections(
            rowA.prospection,
            rowB.prospection,
            now
          )
      );

  const dueRows =
    rows
      .filter(
        ({ prospection }) =>
          isDueFollowUp(
            prospection,
            now
          )
      )
      .sort(
        (
          rowA,
          rowB
        ) =>
          compareFollowUpDates(
            rowA.prospection,
            rowB.prospection
          )
      );

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <PageBanner
          eyebrow="CRM"
          title="Prospection"
          description="Pilotage des propositions commerciales issues des audits et suivi des relances."
        />

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <StatCard
            href="/companies/prospection?status=draft"
            label="À préparer"
            value={
              draftCount
            }
            tone="slate"
            active={
              activeFilter ===
              "draft"
            }
          />

          <StatCard
            href="/companies/prospection?status=ready"
            label="Prêtes"
            value={
              readyCount
            }
            tone="blue"
            active={
              activeFilter ===
              "ready"
            }
          />

          <StatCard
            href="/companies/prospection?status=sent"
            label="Envoyées"
            value={
              sentCount
            }
            tone="emerald"
            active={
              activeFilter ===
              "sent"
            }
          />

          <StatCard
            href="/companies/prospection?status=scheduled"
            label="Relances prévues"
            value={
              scheduledCount
            }
            tone="violet"
            active={
              activeFilter ===
              "scheduled"
            }
          />

          <StatCard
            href="/companies/prospection?status=due"
            label="À relancer"
            value={
              dueCount
            }
            tone="amber"
            active={
              activeFilter ===
              "due"
            }
          />

          <StatCard
            href="/companies/prospection?status=replied"
            label="Réponses"
            value={
              repliedCount
            }
            tone="cyan"
            active={
              activeFilter ===
              "replied"
            }
          />
        </section>

        {dueRows.length >
        0 ? (
          <section className="mt-6 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-orange-50 p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600">
                  Priorité
                </p>

                <h2 className="mt-2 text-xl font-bold text-slate-900">
                  Relances à
                  effectuer
                </h2>

                <p className="mt-2 text-sm text-slate-600">
                  Ces prospections
                  ont atteint leur
                  date de relance.
                </p>
              </div>

              <span className="rounded-full bg-amber-500 px-3 py-1.5 text-xs font-bold text-white">
                {dueRows.length}{" "}
                à traiter
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {dueRows.map(
                ({
                  prospection,
                  company,
                }) => (
                  <Link
                    key={
                      prospection.id
                    }
                    href={`/companies/${prospection.company_id}`}
                    className="group flex flex-col gap-4 rounded-xl border border-amber-200 bg-white px-5 py-4 transition hover:border-amber-300 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 group-hover:text-amber-700">
                        {company
                          ?.name ||
                          "Entreprise"}
                      </p>

                      <p className="mt-1 truncate text-sm text-slate-500">
                        {prospection.sent_subject ||
                          prospection.subject ||
                          "Prospection après audit"}
                      </p>

                      {prospection.recipient_email ? (
                        <p className="mt-1 text-xs text-slate-400">
                          {
                            prospection.recipient_email
                          }
                        </p>
                      ) : null}
                    </div>

                    <div className="shrink-0 text-left sm:text-right">
                      <p className="text-xs font-bold uppercase tracking-wide text-amber-600">
                        Relance prévue
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-800">
                        {prospection.follow_up_at
                          ? formatDate(
                              prospection.follow_up_at
                            )
                          : "Aujourd’hui"}
                      </p>
                    </div>
                  </Link>
                )
              )}
            </div>
          </section>
        ) : (
          <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-5">
            <p className="text-sm font-bold text-emerald-800">
              Aucune relance en
              retard aujourd’hui.
            </p>

            <p className="mt-1 text-xs text-emerald-700">
              Le suivi commercial
              est à jour.
            </p>
          </section>
        )}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                Suivi global
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-900">
                Prospections
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              <FilterLink
                href="/companies/prospection"
                label="Toutes"
                active={
                  activeFilter ===
                  "all"
                }
              />

              <FilterLink
                href="/companies/prospection?status=draft"
                label="À préparer"
                active={
                  activeFilter ===
                  "draft"
                }
              />

              <FilterLink
                href="/companies/prospection?status=ready"
                label="Prêtes"
                active={
                  activeFilter ===
                  "ready"
                }
              />

              <FilterLink
                href="/companies/prospection?status=sent"
                label="Envoyées"
                active={
                  activeFilter ===
                  "sent"
                }
              />

              <FilterLink
                href="/companies/prospection?status=scheduled"
                label="Relances prévues"
                active={
                  activeFilter ===
                  "scheduled"
                }
              />

              <FilterLink
                href="/companies/prospection?status=due"
                label="À relancer"
                active={
                  activeFilter ===
                  "due"
                }
              />

              <FilterLink
                href="/companies/prospection?status=replied"
                label="Réponses"
                active={
                  activeFilter ===
                  "replied"
                }
              />
            </div>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-5">
            <p className="text-sm text-slate-500">
              {
                filteredRows.length
              }{" "}
              prospection
              {filteredRows.length >
              1
                ? "s"
                : ""}
            </p>
          </div>

          {filteredRows.length >
          0 ? (
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              <div className="hidden grid-cols-[minmax(220px,1.2fr)_minmax(220px,1.4fr)_150px_150px_120px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 lg:grid">
                <span>
                  Entreprise
                </span>

                <span>
                  Proposition
                </span>

                <span>
                  Envoi
                </span>

                <span>
                  Relance
                </span>

                <span className="text-right">
                  Statut
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {filteredRows.map(
                  ({
                    prospection,
                    company,
                  }) => (
                    <Link
                      key={
                        prospection.id
                      }
                      href={`/companies/${prospection.company_id}`}
                      className="grid gap-4 px-5 py-5 transition hover:bg-slate-50 lg:grid-cols-[minmax(220px,1.2fr)_minmax(220px,1.4fr)_150px_150px_120px] lg:items-center"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900">
                          {company
                            ?.name ||
                            "Entreprise inconnue"}
                        </p>

                        {prospection.recipient_email ? (
                          <p className="mt-1 truncate text-xs text-slate-400">
                            {
                              prospection.recipient_email
                            }
                          </p>
                        ) : null}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-700">
                          {prospection.sent_subject ||
                            prospection.subject ||
                            "À rédiger"}
                        </p>

                        {prospection.sales_angle ? (
                          <p className="mt-1 truncate text-xs text-slate-400">
                            {
                              prospection.sales_angle
                            }
                          </p>
                        ) : null}
                      </div>

                      <DateColumn
                        label="Envoi"
                        value={
                          prospection.sent_at
                        }
                      />

                      <DateColumn
                        label="Relance"
                        value={
                          prospection.follow_up_at
                        }
                        warning={
                          isDueFollowUp(
                            prospection,
                            now
                          )
                        }
                      />

                      <div className="lg:text-right">
                        <ProspectionBadge
                          prospection={
                            prospection
                          }
                          now={
                            now
                          }
                        />
                      </div>
                    </Link>
                  )
                )}
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
              <p className="font-semibold text-slate-700">
                Aucune prospection
                dans cette catégorie.
              </p>

              <Link
                href="/companies/prospection"
                className="mt-3 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                Afficher toutes les
                prospections
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({
  href,
  label,
  value,
  tone,
  active,
}: {
  href: string;
  label: string;
  value: number;
  tone:
    | "slate"
    | "blue"
    | "emerald"
    | "violet"
    | "amber"
    | "cyan";
  active: boolean;
}) {
  const tones = {
    slate:
      "border-slate-200 bg-gradient-to-br from-white to-slate-50 text-slate-700",
    blue:
      "border-blue-200 bg-gradient-to-br from-white to-blue-50 text-blue-700",
    emerald:
      "border-emerald-200 bg-gradient-to-br from-white to-emerald-50 text-emerald-700",
    violet:
      "border-violet-200 bg-gradient-to-br from-white to-violet-50 text-violet-700",
    amber:
      "border-amber-200 bg-gradient-to-br from-white to-amber-50 text-amber-700",
    cyan:
      "border-cyan-200 bg-gradient-to-br from-white to-cyan-50 text-cyan-700",
  };

  return (
    <Link
      href={href}
      className={`rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        tones[tone]
      } ${
        active
          ? "ring-2 ring-blue-500/30"
          : ""
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-[0.14em] opacity-80">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black">
        {value}
      </p>
    </Link>
  );
}

function FilterLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3.5 py-2 text-xs font-bold transition ${
        active
          ? "bg-slate-900 text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {label}
    </Link>
  );
}

function DateColumn({
  label,
  value,
  warning = false,
}: {
  label: string;
  value:
    | string
    | null;
  warning?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 lg:hidden">
        {label}
      </p>

      <p
        className={`mt-1 text-sm font-semibold lg:mt-0 ${
          warning
            ? "text-amber-700"
            : "text-slate-600"
        }`}
      >
        {value
          ? formatDate(
              value
            )
          : "—"}
      </p>
    </div>
  );
}

function ProspectionBadge({
  prospection,
  now,
}: {
  prospection: AuditProspection;
  now: number;
}) {
  let label =
    getStatusLabel(
      prospection.status
    );

  let className =
    getStatusClassName(
      prospection.status
    );

  if (
    isDueFollowUp(
      prospection,
      now
    )
  ) {
    label =
      "À relancer";

    className =
      "bg-amber-100 text-amber-700";
  } else if (
    isScheduledFollowUp(
      prospection,
      now
    )
  ) {
    label =
      "Relance prévue";

    className =
      "bg-violet-100 text-violet-700";
  }

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${className}`}
    >
      {label}
    </span>
  );
}

function isScheduledFollowUp(
  prospection: AuditProspection,
  now: number
) {
  if (
    prospection.status !==
      "follow_up" ||
    !prospection.follow_up_at
  ) {
    return false;
  }

  const followUpTime =
    new Date(
      prospection.follow_up_at
    ).getTime();

  return (
    Number.isFinite(
      followUpTime
    ) &&
    followUpTime >
      now
  );
}

function isDueFollowUp(
  prospection: AuditProspection,
  now: number
) {
  if (
    prospection.status !==
      "follow_up" ||
    !prospection.follow_up_at
  ) {
    return false;
  }

  const followUpTime =
    new Date(
      prospection.follow_up_at
    ).getTime();

  return (
    Number.isFinite(
      followUpTime
    ) &&
    followUpTime <=
      now
  );
}

function matchesFilter(
  prospection: AuditProspection,
  filter: ViewFilter,
  now: number
) {
  if (
    filter === "all"
  ) {
    return true;
  }

  if (
    filter === "scheduled"
  ) {
    return isScheduledFollowUp(
      prospection,
      now
    );
  }

  if (
    filter === "due"
  ) {
    return isDueFollowUp(
      prospection,
      now
    );
  }

  return (
    prospection.status ===
    filter
  );
}

function compareProspections(
  a: AuditProspection,
  b: AuditProspection,
  now: number
) {
  const aDue =
    isDueFollowUp(
      a,
      now
    );

  const bDue =
    isDueFollowUp(
      b,
      now
    );

  if (
    aDue !== bDue
  ) {
    return aDue
      ? -1
      : 1;
  }

  if (
    a.follow_up_at &&
    b.follow_up_at
  ) {
    const followUpCompare =
      new Date(
        a.follow_up_at
      ).getTime() -
      new Date(
        b.follow_up_at
      ).getTime();

    if (
      followUpCompare !==
      0
    ) {
      return followUpCompare;
    }
  }

  return (
    new Date(
      b.created_at
    ).getTime() -
    new Date(
      a.created_at
    ).getTime()
  );
}

function compareFollowUpDates(
  a: AuditProspection,
  b: AuditProspection
) {
  return (
    new Date(
      a.follow_up_at ??
        0
    ).getTime() -
    new Date(
      b.follow_up_at ??
        0
    ).getTime()
  );
}

function getStatusLabel(
  status: AuditProspectionStatus
) {
  const labels = {
    draft:
      "À préparer",
    ready:
      "Prête",
    sent:
      "Envoyée",
    follow_up:
      "Suivi",
    replied:
      "Réponse reçue",
  };

  return labels[status];
}

function getStatusClassName(
  status: AuditProspectionStatus
) {
  const classes = {
    draft:
      "bg-slate-100 text-slate-600",
    ready:
      "bg-blue-100 text-blue-700",
    sent:
      "bg-emerald-100 text-emerald-700",
    follow_up:
      "bg-violet-100 text-violet-700",
    replied:
      "bg-cyan-100 text-cyan-700",
  };

  return classes[status];
}

function isViewFilter(
  value: string
): value is ViewFilter {
  return [
    "all",
    "draft",
    "ready",
    "sent",
    "scheduled",
    "due",
    "replied",
  ].includes(
    value
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
    "fr-FR",
    {
      dateStyle:
        "short",
    }
  ).format(date);
}