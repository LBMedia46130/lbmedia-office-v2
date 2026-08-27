import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getZohoInvoice,
  type ZohoInvoice,
} from "@/lib/zoho-books";

export const dynamic =
  "force-dynamic";

type InvoiceDetailPageProps = {
  params: Promise<{
    invoiceId: string;
  }>;
};

function formatCurrency(
  value?: number,
  currency = "EUR"
) {
  return new Intl.NumberFormat(
    "fr-FR",
    {
      style: "currency",
      currency,
    }
  ).format(
    Number(value) || 0
  );
}

function formatDate(
  value?: string
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(
      `${value}T00:00:00`
    );

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

export default async function InvoiceDetailPage({
  params,
}: InvoiceDetailPageProps) {
  const { invoiceId } =
    await params;

  let invoice: ZohoInvoice;

  try {
    invoice =
      await getZohoInvoice(
        invoiceId
      );
  } catch {
    notFound();
  }

  const currency =
    invoice.currency_code ||
    "EUR";

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1200px] px-6 py-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link
              href="/management/invoices"
              className="text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              ← Retour aux factures
            </Link>

            <div className="mt-6">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-blue-600">
                Gestion / Factures
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold text-slate-900">
                  Facture{" "}
                  {invoice.invoice_number ||
                    "Brouillon"}
                </h1>

                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                    invoice.status
                  )}`}
                >
                  {getStatusLabel(
                    invoice.status
                  )}
                </span>
              </div>

              <p className="mt-2 text-sm text-slate-500">
                Document créé et géré
                dans Zoho Books
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-0 lg:pt-12">
            <Link
              href={`/management/invoices/new?cloneFrom=${encodeURIComponent(
                invoice.invoice_id
              )}`}
              className="inline-flex rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
            >
              Cloner la facture
            </Link>

            <Link
              href={`/management/invoices/${invoice.invoice_id}/edit`}
              className="inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Modifier la facture
            </Link>
          </div>
        </div>

        <section className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Informations de la facture
            </h2>

            <dl className="mt-6 grid gap-6 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Numéro
                </dt>

                <dd className="mt-1 font-semibold text-slate-900">
                  {invoice.invoice_number ||
                    "Brouillon"}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Client
                </dt>

                <dd className="mt-1 text-slate-700">
                  {
                    invoice.customer_name
                  }
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Date
                </dt>

                <dd className="mt-1 text-slate-700">
                  {formatDate(
                    invoice.date
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Échéance
                </dt>

                <dd className="mt-1 text-slate-700">
                  {formatDate(
                    invoice.due_date
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Référence
                </dt>

                <dd className="mt-1 text-slate-700">
                  {invoice.reference_number ||
                    "—"}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Envoyée par email
                </dt>

                <dd className="mt-1 text-slate-700">
                  {invoice.is_emailed
                    ? "Oui"
                    : "Non"}
                </dd>
              </div>
            </dl>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Total
              </p>

              <p className="mt-2 text-3xl font-bold text-slate-900">
                {formatCurrency(
                  invoice.total,
                  currency
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Reste dû
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-900">
                {formatCurrency(
                  invoice.balance,
                  currency
                )}
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
