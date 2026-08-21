import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getZohoEstimate,
  getZohoTaxes,
} from "@/lib/zoho-books";

import EditEstimateForm from "./EditEstimateForm";

export const dynamic = "force-dynamic";

type EditEstimatePageProps = {
  params: Promise<{
    estimateId: string;
  }>;
};

function getDiscountPercentage(
  quantity: number,
  rate: number,
  discount?: number,
  discountAmount?: number,
  itemTotal?: number
) {
  if (
    typeof discount === "number" &&
    Number.isFinite(discount) &&
    discount > 0
  ) {
    return discount;
  }

  const gross =
    Number(quantity) *
    Number(rate);

  if (gross <= 0) {
    return 0;
  }

  if (
    typeof discountAmount ===
      "number" &&
    Number.isFinite(
      discountAmount
    ) &&
    discountAmount > 0
  ) {
    return Number(
      (
        (discountAmount /
          gross) *
        100
      ).toFixed(4)
    );
  }

  if (
    typeof itemTotal ===
      "number" &&
    Number.isFinite(
      itemTotal
    ) &&
    itemTotal < gross
  ) {
    return Number(
      (
        ((gross -
          itemTotal) /
          gross) *
        100
      ).toFixed(4)
    );
  }

  return 0;
}

export default async function EditEstimatePage({
  params,
}: EditEstimatePageProps) {
  const { estimateId } =
    await params;

  let estimate;

  try {
    estimate =
      await getZohoEstimate(
        estimateId
      );
  } catch {
    notFound();
  }

  const taxes =
    await getZohoTaxes();

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1500px] px-6 py-8">
        <div className="mb-8">
          <Link
            href={`/management/estimates/${estimate.estimate_id}`}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            ← Retour au devis
          </Link>

          <p className="mt-6 text-sm font-medium uppercase tracking-[0.18em] text-blue-600">
            Gestion / Devis
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Modifier{" "}
            {estimate.estimate_number}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Les modifications seront
            enregistrées directement dans
            Zoho Books.
          </p>
        </div>

        <EditEstimateForm
          estimate={{
            estimate_id:
              estimate.estimate_id,

            estimate_number:
              estimate.estimate_number,

            customer_id:
              estimate.customer_id,

            customer_name:
              estimate.customer_name,

            date:
              estimate.date || "",

            expiry_date:
              estimate.expiry_date ||
              "",

            reference_number:
              estimate.reference_number ||
              "",

            notes:
              estimate.notes || "",

            terms:
              estimate.terms || "",

            line_items: (
              estimate.line_items ??
              []
            ).map((line) => ({
              line_item_id:
                line.line_item_id,

              name:
                line.name,

              description:
                line.description ||
                "",

              quantity:
                Number(
                  line.quantity
                ) || 1,

              rate:
                Number(
                  line.rate
                ) || 0,

              discount:
                getDiscountPercentage(
                  Number(
                    line.quantity
                  ) || 0,
                  Number(
                    line.rate
                  ) || 0,
                  line.discount,
                  line.discount_amount,
                  line.item_total
                ),

              tax_id:
                line.tax_id || "",
            })),
          }}
          taxes={taxes.map(
            (tax) => ({
              tax_id:
                tax.tax_id,

              tax_name:
                tax.tax_name,

              tax_percentage:
                Number(
                  tax.tax_percentage
                ),
            })
          )}
        />
      </div>
    </main>
  );
}