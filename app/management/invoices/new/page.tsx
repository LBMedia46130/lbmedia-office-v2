import Link from "next/link";

import {
  getCompanies,
} from "@/lib/companies";

import {
  getAllZohoItems,
  getZohoInvoice,
  getZohoTaxes,
  type ZohoInvoiceLineItem,
} from "@/lib/zoho-books";

import NewInvoiceForm, {
  type NewInvoiceInitialData,
} from "./NewInvoiceForm";

export const dynamic =
  "force-dynamic";

type NewInvoicePageProps = {
  searchParams: Promise<{
    cloneFrom?: string;
  }>;
};

function getLineDiscount(
  line: ZohoInvoiceLineItem
): string | number | undefined {
  if (
    typeof line.discount ===
    "string"
  ) {
    const trimmed =
      line.discount.trim();

    if (trimmed) {
      return trimmed;
    }
  }

  if (
    typeof line.discount ===
      "number" &&
    Number.isFinite(
      line.discount
    ) &&
    line.discount > 0
  ) {
    return `${line.discount}%`;
  }

  const discountAmount =
    Number(
      line.discount_amount
    ) || 0;

  if (
    discountAmount > 0
  ) {
    return String(
      discountAmount
    );
  }

  return undefined;
}

export default async function NewInvoicePage({
  searchParams,
}: NewInvoicePageProps) {
  const resolvedSearchParams =
    await searchParams;

  const cloneFrom =
    typeof resolvedSearchParams.cloneFrom ===
      "string"
      ? resolvedSearchParams.cloneFrom.trim()
      : "";

  const [
    companies,
    taxes,
    items,
  ] = await Promise.all([
    getCompanies(),
    getZohoTaxes(),
    getAllZohoItems(),
  ]);

  const activeCompanies =
    companies.filter(
      (company) =>
        company.is_active &&
        company.pipeline_stage !==
          "lost"
    );

  const vatTax =
    taxes.find(
      (tax) =>
        Number(
          tax.tax_percentage
        ) === 20
    ) ?? taxes[0];

  let initialData:
    NewInvoiceInitialData | undefined;

  let cloneSourceNumber:
    string | null = null;

  let cloneWarning:
    string | null = null;

  if (cloneFrom) {
    try {
      const sourceInvoice =
        await getZohoInvoice(
          cloneFrom
        );

      cloneSourceNumber =
        sourceInvoice.invoice_number ||
        "Brouillon";

      const sourceCompany =
        activeCompanies.find(
          (company) =>
            company.zoho_contact_id ===
            sourceInvoice.customer_id
        );

      if (!sourceCompany) {
        cloneWarning =
          "La facture source a bien été chargée, mais son client Zoho n’est pas relié à une entreprise active dans LBMedia Office. Sélectionne l’entreprise avant de créer la nouvelle facture.";
      }

      initialData = {
        companyId:
          sourceCompany?.id,

        referenceNumber:
          sourceInvoice.reference_number ??
          "",

        notes:
          sourceInvoice.notes ??
          "",

        terms:
          sourceInvoice.terms ??
          "",

        lines:
          (
            sourceInvoice.line_items ??
            []
          ).map(
            (line) => ({
              item_id:
                line.item_id,

              name:
                line.name,

              description:
                line.description,

              quantity:
                Number(
                  line.quantity
                ) || 1,

              rate:
                Number(
                  line.rate
                ) || 0,

              discount:
                getLineDiscount(
                  line
                ),

              tax_id:
                line.tax_id,
            })
          ),
      };
    } catch (error) {
      cloneWarning =
        error instanceof Error
          ? `Impossible de charger la facture à cloner : ${error.message}`
          : "Impossible de charger la facture à cloner.";
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <div className="mb-8">
          <Link
            href="/management/invoices"
            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            ← Retour aux factures
          </Link>

          <p className="mt-6 text-sm font-medium uppercase tracking-[0.18em] text-blue-600">
            Gestion
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            {cloneFrom
              ? "Cloner une facture"
              : "Nouvelle facture"}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {cloneFrom
              ? `Nouvelle facture préremplie à partir de ${cloneSourceNumber ?? "la facture source"}. La date et l’échéance sont recalculées automatiquement.`
              : "La facture sera créée directement dans Zoho Books."}
          </p>
        </div>

        {cloneWarning ? (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
            {cloneWarning}
          </div>
        ) : null}

        <NewInvoiceForm
          companies={activeCompanies.map(
            (company) => ({
              id:
                company.id,

              name:
                company.name,

              legal_name:
                company.legal_name,

              relationship_status:
                company.relationship_status,

              city:
                company.city,

              zoho_contact_id:
                company.zoho_contact_id,
            })
          )}
          tax={
            vatTax
              ? {
                  tax_id:
                    vatTax.tax_id,

                  tax_name:
                    vatTax.tax_name,

                  tax_percentage:
                    Number(
                      vatTax.tax_percentage
                    ),
                }
              : null
          }
          items={items.map(
            (item) => ({
              item_id:
                item.item_id,

              name:
                item.name,

              description:
                item.description ??
                "",

              rate:
                Number(
                  item.rate
                ) || 0,

              tax_id:
                item.tax_id ??
                null,

              tax_name:
                item.tax_name ??
                null,

              tax_percentage:
                typeof item.tax_percentage ===
                "number"
                  ? item.tax_percentage
                  : null,
            })
          )}
          initialData={
            initialData
          }
        />
      </div>
    </main>
  );
}
