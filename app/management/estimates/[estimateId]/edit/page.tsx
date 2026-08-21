import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getAllZohoItems,
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

type DiscountMode =
  | "percent"
  | "amount";

function readDiscount(
  discount: string | number | undefined,
  discountAmount: number | undefined
): {
  mode: DiscountMode;
  value: number;
} {
  if (
    typeof discount === "string"
  ) {
    const trimmed =
      discount.trim();

    if (
      trimmed.endsWith("%")
    ) {
      const value =
        Number(
          trimmed
            .slice(0, -1)
            .replace(",", ".")
        );

      return {
        mode: "percent",
        value:
          Number.isFinite(value)
            ? Math.round(value)
            : 0,
      };
    }

    const value =
      Number(
        trimmed.replace(",", ".")
      );

    if (
      Number.isFinite(value) &&
      value > 0
    ) {
      return {
        mode: "amount",
        value,
      };
    }
  }

  /*
   * Dans l'API Zoho, une valeur numérique
   * sans symbole % représente une remise
   * monétaire fixe.
   */
  if (
    typeof discount === "number" &&
    Number.isFinite(discount) &&
    discount > 0
  ) {
    return {
      mode: "amount",
      value: discount,
    };
  }

  /*
   * Si Zoho ne renvoie que discount_amount,
   * on ne tente plus de fabriquer un
   * pourcentage. On conserve le montant €.
   */
  if (
    typeof discountAmount === "number" &&
    Number.isFinite(discountAmount) &&
    discountAmount > 0
  ) {
    return {
      mode: "amount",
      value: discountAmount,
    };
  }

  return {
    mode: "percent",
    value: 0,
  };
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

  const [
    taxes,
    items,
  ] = await Promise.all([
    getZohoTaxes(),
    getAllZohoItems(),
  ]);

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
            ).map((line) => {
              const discount =
                readDiscount(
                  line.discount,
                  line.discount_amount
                );

              return {
                line_item_id:
                  line.line_item_id,

                item_id:
                  line.item_id || "",

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

                discount_mode:
                  discount.mode,

                discount_value:
                  discount.value,

                tax_id:
                  line.tax_id || "",
              };
            }),
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
        />
      </div>
    </main>
  );
}