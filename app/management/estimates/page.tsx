import Link from "next/link";

import {
  getAllZohoEstimates,
  type ZohoEstimate,
} from "@/lib/zoho-books";

export const dynamic = "force-dynamic";

type EstimatesPageProps = {
  searchParams: Promise<{
    fiscalYear?: string;
  }>;
};

type FiscalYear = {
  startYear: number;
  endYear: number;
  label: string;
  value: string;
  startDate: string;
  endDate: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function formatDate(value?: string) {
  if (!value) {
    return "—";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "fr-FR"
  ).format(date);
}

function getStatusLabel(status: string) {
  switch (status) {
    case "draft":
      return "Brouillon";
    case "sent":
      return "Envoyé";
    case "viewed":
      return "Consulté";
    case "accepted":
      return "Accepté";
    case "declined":
      return "Refusé";
    case "invoiced":
      return "Facturé";
    case "expired":
      return "Expiré";
    case "void":
    case "cancelled":
      return "Annulé";
    default:
      return status;
  }
}

function getStatusClass(status: string) {
  switch (status) {
    case "accepted":
      return "bg-emerald-100 text-emerald-700";

    case "invoiced":
      return "bg-cyan-100 text-cyan-700";

    case "declined":
    case "expired":
      return "bg-red-100 text-red-700";

    case "sent":
    case "viewed":
      return "bg-blue-100 text-blue-700";

    case "draft":
      return "bg-amber-100 text-amber-700";

    case "void":
    case "cancelled":
      return "bg-slate-100 text-slate-500";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getCurrentFiscalStartYear() {
  const now = new Date();

  const year =
    now.getFullYear();

  const month =
    now.getMonth() + 1;

  return month >= 9
    ? year
    : year - 1;
}

function createFiscalYear(
  startYear: number
): FiscalYear {
  const endYear =
    startYear + 1;

  return {
    startYear,
    endYear,
    label: `${startYear}–${endYear}`,
    value: String(startYear),
    startDate: `${startYear}-09-01`,
    endDate: `${endYear}-08-31`,
  };
}

function getEstimateFiscalStartYear(
  value?: string
) {
  if (!value) {
    return null;
  }

  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value
    );

  if (!match) {
    return null;
  }

  const year =
    Number(match[1]);

  const month =
    Number(match[2]);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month)
  ) {
    return null;
  }

  return month >= 9
    ? year
    : year - 1;
}

function getAvailableFiscalYears(
  estimates: ZohoEstimate[]
) {
  const currentStartYear =
    getCurrentFiscalStartYear();

  const years =
    new Set<number>([
      currentStartYear,
    ]);

  for (const estimate of estimates) {
    const startYear =
      getEstimateFiscalStartYear(
        estimate.date
      );

    if (startYear !== null) {
      years.add(startYear);
    }
  }

  return Array.from(years)
    .sort((a, b) => b - a)
    .map(createFiscalYear);
}

function filterEstimatesByFiscalYear(
  estimates: ZohoEstimate[],
  startYear: number
) {
  return estimates.filter(
    (estimate) =>
      getEstimateFiscalStartYear(
        estimate.date
      ) === startYear
  );
}

function sortEstimates(
  estimates: ZohoEstimate[]
) {
  return [...estimates].sort(
    (a, b) => {
      const dateComparison =
        (b.date ?? "").localeCompare(
          a.date ?? ""
        );

      if (dateComparison !== 0) {
        return dateComparison;
      }

      return (
        b.estimate_number ??
        ""
      ).localeCompare(
        a.estimate_number ?? "",
        "fr",
        {
          numeric: true,
        }
      );
    }
  );
}

function calculateTotals(
  estimates: ZohoEstimate[]
) {
  let draftCount = 0;
  let sentCount = 0;
  let acceptedCount = 0;
  let invoicedCount = 0;

  for (const estimate of estimates) {
    switch (estimate.status) {
      case "draft":
        draftCount += 1;
        break;

      case "sent":
      case "viewed":
        sentCount += 1;
        break;

      case "accepted":
        acceptedCount += 1;
        break;

      case "invoiced":
        invoicedCount += 1;
        break;
    }
  }

  return {
    draftCount,
    sentCount,
    acceptedCount,
    invoicedCount,
  };
}

export default async function EstimatesPage({
  searchParams,
}: EstimatesPageProps) {
  const resolvedSearchParams =
    await searchParams;

  let allEstimates: ZohoEstimate[] = [];
  let errorMessage: string | null = null;

  try {
    allEstimates =
      await getAllZohoEstimates();
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Impossible de récupérer les devis Zoho Books.";
  }

  const fiscalYears =
    getAvailableFiscalYears(
      allEstimates
    );

  const currentFiscalStartYear =
    getCurrentFiscalStartYear();

  const requestedFiscalStartYear =
    Number(
      resolvedSearchParams.fiscalYear
    );

  const selectedFiscalStartYear =
    Number.isInteger(
      requestedFiscalStartYear
    ) &&
    fiscalYears.some(
      (fiscalYear) =>
        fiscalYear.startYear ===
        requestedFiscalStartYear
    )
      ? requestedFiscalStartYear
      : currentFiscalStartYear;

  const selectedFiscalYear =
    fiscalYears.find(
      (fiscalYear) =>
        fiscalYear.startYear ===
        selectedFiscalStartYear
    ) ??
    createFiscalYear(
      currentFiscalStartYear
    );

  const estimates =
    sortEstimates(
      filterEstimatesByFiscalYear(
        allEstimates,
        selectedFiscalStartYear
      )
    );

  const totals =
    calculateTotals(estimates);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1600px] px-6 py-8">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-blue-600">
              Gestion
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Devis
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Données synchronisées avec
              Zoho Books
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Exercice
              </p>

              <div className="flex flex-wrap gap-2">
                {fiscalYears.map(
                  (fiscalYear) => {
                    const isSelected =
                      fiscalYear.startYear ===
                      selectedFiscalStartYear;

                    return (
                      <Link
                        key={
                          fiscalYear.value
                        }
                        href={`/management/estimates?fiscalYear=${fiscalYear.value}`}
                        className={
                          isSelected
                            ? "rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
                            : "rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                        }
                      >
                        {
                          fiscalYear.label
                        }
                      </Link>
                    );
                  }
                )}
              </div>
            </div>

            <Link
              href="/management/estimates/new"
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Nouveau devis
            </Link>
          </div>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : (
          <>
            <div className="mb-5 flex flex-col gap-2 rounded-2xl border border-blue-100 bg-blue-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-900">
                  Exercice{" "}
                  {
                    selectedFiscalYear.label
                  }
                </p>

                <p className="mt-1 text-xs text-blue-700">
                  Du 1er septembre{" "}
                  {
                    selectedFiscalYear.startYear
                  }{" "}
                  au 31 août{" "}
                  {
                    selectedFiscalYear.endYear
                  }
                </p>
              </div>

              <p className="text-sm font-medium text-blue-800">
                {estimates.length}{" "}
                {estimates.length > 1
                  ? "devis"
                  : "devis"}
              </p>
            </div>

            <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Brouillons
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {totals.draftCount}
                </p>

                <p className="mt-2 text-xs text-slate-400">
                  Devis en préparation
                </p>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-blue-600">
                  En attente
                </p>

                <p className="mt-2 text-2xl font-bold text-blue-700">
                  {totals.sentCount}
                </p>

                <p className="mt-2 text-xs text-slate-400">
                  Envoyés ou consultés
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-emerald-600">
                  Acceptés
                </p>

                <p className="mt-2 text-2xl font-bold text-emerald-700">
                  {totals.acceptedCount}
                </p>

                <p className="mt-2 text-xs text-slate-400">
                  Devis acceptés
                </p>
              </div>

              <div className="rounded-2xl border border-cyan-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-cyan-700">
                  Facturés
                </p>

                <p className="mt-2 text-2xl font-bold text-cyan-800">
                  {totals.invoicedCount}
                </p>

                <p className="mt-2 text-xs text-slate-400">
                  Transformés en facture
                </p>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    Devis de l’exercice{" "}
                    {
                      selectedFiscalYear.label
                    }
                  </h2>

                  <p className="text-sm text-slate-500">
                    {estimates.length} devis
                    du 01/09/
                    {
                      selectedFiscalYear.startYear
                    }{" "}
                    au 31/08/
                    {
                      selectedFiscalYear.endYear
                    }
                  </p>
                </div>

                <div className="text-xs text-slate-400">
                  Source : Zoho Books
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Devis
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Client / prospect
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Date
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Validité
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Montant
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Statut
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {estimates.map(
                      (estimate) => (
                        <tr
                          key={
                            estimate.estimate_id
                          }
                          className="transition hover:bg-slate-50"
                        >
                          <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold">
                            <Link
                              href={`/management/estimates/${estimate.estimate_id}`}
                              className="text-blue-600 transition hover:text-blue-800 hover:underline"
                            >
                              {
                                estimate.estimate_number
                              }
                            </Link>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-700">
                            {
                              estimate.customer_name
                            }
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                            {formatDate(
                              estimate.date
                            )}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                            {formatDate(
                              estimate.expiry_date
                            )}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-medium text-slate-700">
                            {formatCurrency(
                              Number(
                                estimate.total
                              ) || 0
                            )}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                                estimate.status
                              )}`}
                            >
                              {getStatusLabel(
                                estimate.status
                              )}
                            </span>
                          </td>
                        </tr>
                      )
                    )}

                    {estimates.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-5 py-12 text-center text-sm text-slate-500"
                        >
                          Aucun devis pour
                          l’exercice{" "}
                          {
                            selectedFiscalYear.label
                          }.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}