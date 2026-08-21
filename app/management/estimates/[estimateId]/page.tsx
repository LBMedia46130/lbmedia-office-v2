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
  value: number,
  currency = "EUR"
) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
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

          <div className="flex flex-wrap gap-3">
            <a
              href={`https://books.zoho.eu/app#/estimates/${estimate.estimate_id}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Ouvrir dans Zoho Books
            </a>
          </div>
        </div>

        <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Informations du devis
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Références principales
                    enregistrées dans Zoho
                    Books.
                  </p>
                </div>
              </div>

              <dl className="grid gap-5 sm:grid-cols-2">
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

            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Détail des prestations
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Le détail des lignes du devis
                sera affiché ici après
                enrichissement du type
                ZohoEstimate avec les données
                complètes retournées par
                l&apos;API Zoho Books.
              </p>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Montant du devis
              </p>

              <p className="mt-2 text-3xl font-bold text-slate-900">
                {formatCurrency(
                  Number(estimate.total) || 0,
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
                    Créé le
                  </dt>

                  <dd className="mt-1 text-sm text-slate-700">
                    {estimate.created_time ||
                      "—"}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Dernière modification
                  </dt>

                  <dd className="mt-1 text-sm text-slate-700">
                    {estimate.last_modified_time ||
                      "—"}
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