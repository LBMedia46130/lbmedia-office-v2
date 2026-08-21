import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getZohoEstimate,
  type ZohoEstimate,
} from "@/lib/zoho-books";

export const dynamic = "force-dynamic";

type EstimateDetailPageProps = {
  params: Promise<{
    estimateId: string;
  }>;
};

function formatCurrency(
  value?: number,
  currency = "EUR"
) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
  }).format(Number(value) || 0);
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

function formatDateTime(value?: string) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      dateStyle: "short",
      timeStyle: "short",
    }
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

export default async function EstimateDetailPage({
  params,
}: EstimateDetailPageProps) {
  const { estimateId } = await params;

  let estimate: ZohoEstimate;

  try {
    estimate =
      await getZohoEstimate(estimateId);
  } catch {
    notFound();
  }

  const currency =
    estimate.currency_code || "EUR";

  const lineItems =
    estimate.line_items ?? [];

  const taxes =
    estimate.taxes ?? [];

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <div className="mb-6">
          <Link
            href="/management/estimates"
            className="text-sm font-semibold text-blue-600 transition hover:text-blue-700"
          >
            ← Retour aux devis
          </Link>
        </div>

        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-blue-600">
              Gestion / Devis
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900">
                Devis{" "}
                {estimate.estimate_number}
              </h1>

              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                  estimate.status
                )}`}
              >
                {getStatusLabel(
                  estimate.status
                )}
              </span>
            </div>

            <p className="mt-2 text-sm text-slate-500">
              Données synchronisées avec
              Zoho Books
            </p>
          </div>

          <a
            href={`https://books.zoho.eu/app#/estimates/${estimate.estimate_id}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Ouvrir dans Zoho Books
          </a>
        </div>

        <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Informations du devis
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Références principales
                enregistrées dans Zoho Books.
              </p>

              <dl className="mt-6 grid gap-5 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Numéro
                  </dt>

                  <dd className="mt-1 text-sm font-semibold text-slate-900">
                    {estimate.estimate_number}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Référence
                  </dt>

                  <dd className="mt-1 text-sm text-slate-700">
                    {estimate.reference_number ||
                      "—"}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Date du devis
                  </dt>

                  <dd className="mt-1 text-sm text-slate-700">
                    {formatDate(
                      estimate.date
                    )}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Validité
                  </dt>

                  <dd className="mt-1 text-sm text-slate-700">
                    {formatDate(
                      estimate.expiry_date
                    )}
                  </dd>
                </div>

                {estimate.salesperson_name ? (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Commercial
                    </dt>

                    <dd className="mt-1 text-sm text-slate-700">
                      {
                        estimate.salesperson_name
                      }
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Client / prospect
              </h2>

              <div className="mt-5">
                <p className="text-lg font-semibold text-slate-900">
                  {estimate.customer_name}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Identifiant Zoho :{" "}
                  {estimate.customer_id}
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="text-lg font-semibold text-slate-900">
                  Détail des prestations
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Prestations et montants
                  enregistrés dans Zoho Books.
                </p>
              </div>

              {lineItems.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Prestation
                        </th>

                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Qté
                        </th>

                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Prix HT
                        </th>

                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                          TVA
                        </th>

                        <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Total HT
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {lineItems.map(
                        (line, index) => (
                          <tr
                            key={
                              line.line_item_id ||
                              `${line.name}-${index}`
                            }
                          >
                            <td className="px-6 py-4">
                              <p className="text-sm font-semibold text-slate-900">
                                {line.name}
                              </p>

                              {line.description ? (
                                <p className="mt-1 whitespace-pre-line text-sm leading-5 text-slate-500">
                                  {
                                    line.description
                                  }
                                </p>
                              ) : null}
                            </td>

                            <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-slate-700">
                              {line.quantity}

                              {line.unit
                                ? ` ${line.unit}`
                                : ""}
                            </td>

                            <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-slate-700">
                              {formatCurrency(
                                line.rate,
                                currency
                              )}
                            </td>

                            <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-slate-700">
                              {typeof line.tax_percentage ===
                              "number"
                                ? `${line.tax_percentage} %`
                                : "—"}
                            </td>

                            <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold text-slate-900">
                              {formatCurrency(
                                line.item_total,
                                currency
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-6 py-10 text-center text-sm text-slate-500">
                  Aucune ligne de prestation
                  retournée par Zoho Books.
                </div>
              )}

              <div className="border-t border-slate-200 bg-slate-50 px-6 py-5">
                <div className="ml-auto max-w-sm space-y-3">
                  <div className="flex items-center justify-between gap-6 text-sm">
                    <span className="text-slate-500">
                      Sous-total HT
                    </span>

                    <span className="font-medium text-slate-900">
                      {formatCurrency(
                        estimate.sub_total,
                        currency
                      )}
                    </span>
                  </div>

                  {Number(estimate.discount) >
                  0 ? (
                    <div className="flex items-center justify-between gap-6 text-sm">
                      <span className="text-slate-500">
                        Remise
                      </span>

                      <span className="font-medium text-slate-900">
                        {formatCurrency(
                          estimate.discount,
                          currency
                        )}
                      </span>
                    </div>
                  ) : null}

                  {taxes.length > 0
                    ? taxes.map(
                        (tax, index) => (
                          <div
                            key={`${tax.tax_name}-${index}`}
                            className="flex items-center justify-between gap-6 text-sm"
                          >
                            <span className="text-slate-500">
                              {tax.tax_name}
                            </span>

                            <span className="font-medium text-slate-900">
                              {formatCurrency(
                                tax.tax_amount,
                                currency
                              )}
                            </span>
                          </div>
                        )
                      )
                    : Number(
                          estimate.tax_total
                        ) > 0 && (
                        <div className="flex items-center justify-between gap-6 text-sm">
                          <span className="text-slate-500">
                            TVA
                          </span>

                          <span className="font-medium text-slate-900">
                            {formatCurrency(
                              estimate.tax_total,
                              currency
                            )}
                          </span>
                        </div>
                      )}

                  {Number(
                    estimate.shipping_charge
                  ) > 0 ? (
                    <div className="flex items-center justify-between gap-6 text-sm">
                      <span className="text-slate-500">
                        Frais
                      </span>

                      <span className="font-medium text-slate-900">
                        {formatCurrency(
                          estimate.shipping_charge,
                          currency
                        )}
                      </span>
                    </div>
                  ) : null}

                  {Number(
                    estimate.adjustment
                  ) !== 0 ? (
                    <div className="flex items-center justify-between gap-6 text-sm">
                      <span className="text-slate-500">
                        {estimate.adjustment_description ||
                          "Ajustement"}
                      </span>

                      <span className="font-medium text-slate-900">
                        {formatCurrency(
                          estimate.adjustment,
                          currency
                        )}
                      </span>
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between gap-6 border-t border-slate-200 pt-3">
                    <span className="font-semibold text-slate-900">
                      Total TTC
                    </span>

                    <span className="text-xl font-bold text-slate-900">
                      {formatCurrency(
                        estimate.total,
                        currency
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {estimate.notes ||
            estimate.terms ? (
              <div className="grid gap-6 lg:grid-cols-2">
                {estimate.notes ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="font-semibold text-slate-900">
                      Notes
                    </h2>

                    <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-600">
                      {estimate.notes}
                    </p>
                  </div>
                ) : null}

                {estimate.terms ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="font-semibold text-slate-900">
                      Conditions
                    </h2>

                    <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-600">
                      {estimate.terms}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Montant du devis
              </p>

              <p className="mt-2 text-3xl font-bold text-slate-900">
                {formatCurrency(
                  estimate.total,
                  currency
                )}
              </p>

              <div className="mt-5 border-t border-slate-100 pt-5">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-500">
                    Statut
                  </span>

                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                      estimate.status
                    )}`}
                  >
                    {getStatusLabel(
                      estimate.status
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-slate-900">
                Suivi
              </h2>

              <dl className="mt-5 space-y-4">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Envoyé par email
                  </dt>

                  <dd className="mt-1 text-sm text-slate-700">
                    {estimate.is_emailed
                      ? "Oui"
                      : "Non"}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Consulté par le client
                  </dt>

                  <dd className="mt-1 text-sm text-slate-700">
                    {estimate.is_viewed_by_client
                      ? "Oui"
                      : "Non"}
                  </dd>
                </div>

                {estimate.client_viewed_time ? (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Consultation
                    </dt>

                    <dd className="mt-1 text-sm text-slate-700">
                      {formatDateTime(
                        estimate.client_viewed_time
                      )}
                    </dd>
                  </div>
                ) : null}

                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Créé le
                  </dt>

                  <dd className="mt-1 text-sm text-slate-700">
                    {formatDateTime(
                      estimate.created_time
                    )}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Dernière modification
                  </dt>

                  <dd className="mt-1 text-sm text-slate-700">
                    {formatDateTime(
                      estimate.last_modified_time
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}