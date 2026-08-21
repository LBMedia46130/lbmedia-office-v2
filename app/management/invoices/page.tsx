import Link from "next/link";

import {
  getAllZohoInvoices,
  type ZohoInvoice,
} from "@/lib/zoho-books";

export const dynamic = "force-dynamic";

type InvoicesPageProps = {
  searchParams: Promise<{
    fiscalYear?: string;
  }>;
};

type FiscalYear = {
  startYear: number;
  endYear: number;
  label: string;
  value: string;
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

  const date = new Date(
    `${value}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "fr-FR"
  ).format(date);
}

function getStatusLabel(
  status: string
) {
  switch (status) {
    case "draft":
      return "Brouillon";
    case "sent":
      return "Envoyée";
    case "viewed":
      return "Consultée";
    case "overdue":
      return "En retard";
    case "paid":
      return "Payée";
    case "unpaid":
      return "Impayée";
    case "partially_paid":
      return "Partiellement payée";
    case "void":
      return "Annulée";
    default:
      return status;
  }
}

function getStatusClass(
  status: string
) {
  switch (status) {
    case "paid":
      return "bg-emerald-100 text-emerald-700";

    case "overdue":
      return "bg-red-100 text-red-700";

    case "partially_paid":
      return "bg-amber-100 text-amber-700";

    case "sent":
    case "viewed":
      return "bg-blue-100 text-blue-700";

    case "draft":
      return "bg-slate-100 text-slate-700";

    case "void":
      return "bg-gray-100 text-gray-500";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

function roundCurrency(
  value: number
) {
  return (
    Math.round(
      (value + Number.EPSILON) *
        100
    ) / 100
  );
}

function calculateTotals(
  invoices: ZohoInvoice[]
) {
  let outstanding = 0;
  let overdue = 0;
  let overdueCount = 0;
  let unpaidCount = 0;

  for (const invoice of invoices) {
    const balance =
      Number(invoice.balance) || 0;

    if (balance > 0) {
      outstanding += balance;
      unpaidCount += 1;
    }

    if (
      invoice.status ===
        "overdue" &&
      balance > 0
    ) {
      overdue += balance;
      overdueCount += 1;
    }
  }

  return {
    outstanding:
      roundCurrency(outstanding),

    overdue:
      roundCurrency(overdue),

    overdueCount,
    unpaidCount,
  };
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
  };
}

function getInvoiceFiscalStartYear(
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
  invoices: ZohoInvoice[]
) {
  const currentStartYear =
    getCurrentFiscalStartYear();

  const years =
    new Set<number>([
      currentStartYear,
    ]);

  for (const invoice of invoices) {
    const startYear =
      getInvoiceFiscalStartYear(
        invoice.date
      );

    if (startYear !== null) {
      years.add(startYear);
    }
  }

  return Array.from(years)
    .sort((a, b) => b - a)
    .map(createFiscalYear);
}

function filterInvoicesByFiscalYear(
  invoices: ZohoInvoice[],
  startYear: number
) {
  return invoices.filter(
    (invoice) =>
      getInvoiceFiscalStartYear(
        invoice.date
      ) === startYear
  );
}

function sortInvoices(
  invoices: ZohoInvoice[]
) {
  return [...invoices].sort(
    (a, b) => {
      const dateComparison =
        (b.date ?? "").localeCompare(
          a.date ?? ""
        );

      if (dateComparison !== 0) {
        return dateComparison;
      }

      return (
        b.invoice_number ?? ""
      ).localeCompare(
        a.invoice_number ?? "",
        "fr",
        {
          numeric: true,
        }
      );
    }
  );
}

export default async function InvoicesPage({
  searchParams,
}: InvoicesPageProps) {
  const resolvedSearchParams =
    await searchParams;

  let allInvoices: ZohoInvoice[] =
    [];

  let errorMessage:
    | string
    | null = null;

  try {
    allInvoices =
      await getAllZohoInvoices();
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Impossible de récupérer les factures Zoho Books.";
  }

  const fiscalYears =
    getAvailableFiscalYears(
      allInvoices
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

  const invoices =
    sortInvoices(
      filterInvoicesByFiscalYear(
        allInvoices,
        selectedFiscalStartYear
      )
    );

  /*
   * Important :
   * les indicateurs sont calculés
   * uniquement APRÈS filtrage
   * de l'exercice.
   */
  const totals =
    calculateTotals(invoices);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1600px] px-6 py-8">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-blue-600">
              Gestion
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Factures
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Données synchronisées
              avec Zoho Books
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
                        href={`/management/invoices?fiscalYear=${fiscalYear.value}`}
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
              href="/companies"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Voir les entreprises
            </Link>

            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white opacity-50"
              title="La création de facture arrive dans l'étape suivante."
            >
              Nouvelle facture
            </button>
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
                {invoices.length}{" "}
                facture
                {invoices.length > 1
                  ? "s"
                  : ""}
              </p>
            </div>

            <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  À encaisser
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {formatCurrency(
                    totals.outstanding
                  )}
                </p>

                <p className="mt-2 text-xs text-slate-400">
                  Solde restant dû
                </p>
              </div>

              <div className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-red-600">
                  En retard
                </p>

                <p className="mt-2 text-2xl font-bold text-red-700">
                  {formatCurrency(
                    totals.overdue
                  )}
                </p>

                <p className="mt-2 text-xs text-slate-400">
                  Échéances dépassées
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Factures en retard
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {
                    totals.overdueCount
                  }
                </p>

                <p className="mt-2 text-xs text-slate-400">
                  À surveiller ou
                  relancer
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Factures avec solde
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {
                    totals.unpaidCount
                  }
                </p>

                <p className="mt-2 text-xs text-slate-400">
                  Payées partiellement
                  ou non
                </p>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    Factures de
                    l’exercice{" "}
                    {
                      selectedFiscalYear.label
                    }
                  </h2>

                  <p className="text-sm text-slate-500">
                    {invoices.length}{" "}
                    facture
                    {invoices.length > 1
                      ? "s"
                      : ""}{" "}
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
                        Facture
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Client
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Date
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Échéance
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Total
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Reste dû
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Statut
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {invoices.map(
                      (invoice) => (
                        <tr
                          key={
                            invoice.invoice_id
                          }
                          className="transition hover:bg-slate-50"
                        >
                          <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-900">
                            {
                              invoice.invoice_number
                            }
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-700">
                            {
                              invoice.customer_name
                            }
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                            {formatDate(
                              invoice.date
                            )}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                            {formatDate(
                              invoice.due_date
                            )}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-medium text-slate-700">
                            {formatCurrency(
                              Number(
                                invoice.total
                              ) || 0
                            )}
                          </td>

                          <td
                            className={`whitespace-nowrap px-5 py-4 text-right text-sm font-semibold ${
                              Number(
                                invoice.balance
                              ) > 0
                                ? "text-slate-900"
                                : "text-slate-400"
                            }`}
                          >
                            {formatCurrency(
                              Number(
                                invoice.balance
                              ) || 0
                            )}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                                invoice.status
                              )}`}
                            >
                              {getStatusLabel(
                                invoice.status
                              )}
                            </span>
                          </td>
                        </tr>
                      )
                    )}

                    {invoices.length ===
                    0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-5 py-12 text-center text-sm text-slate-500"
                        >
                          Aucune facture
                          pour l’exercice{" "}
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