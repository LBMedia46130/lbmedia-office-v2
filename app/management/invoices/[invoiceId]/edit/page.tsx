import Link from "next/link";
import {
  notFound,
} from "next/navigation";

import {
  getAllZohoItems,
  getZohoInvoice,
  getZohoTaxes,
} from "@/lib/zoho-books";

import EditInvoiceForm from "./EditInvoiceForm";

export const dynamic =
  "force-dynamic";

type EditInvoicePageProps = {
  params: Promise<{
    invoiceId: string;
  }>;
};

type DiscountMode =
  | "percent"
  | "amount";

function readDiscount(
  discount: string | number | undefined,
  discountAmount: number | undefined,
  gross: number,
  itemTotal: number
): { mode: DiscountMode; value: number } {
  // Zoho retourne parfois une remise numérique même lorsque sa nature
  // est un montant fixe. Ne jamais l'interpréter comme un pourcentage.
  if (typeof discount === "string" && discount.trim().endsWith("%")) {
    const value = Number(discount.trim().slice(0, -1).replace(",", "."));
    return { mode: "percent", value: Number.isFinite(value) ? value : 0 };
  }

  if (typeof discountAmount === "number" &&
      Number.isFinite(discountAmount) && discountAmount > 0) {
    return { mode: "amount", value: discountAmount };
  }

  if (typeof discount === "string" || typeof discount === "number") {
    const value = Number(String(discount).trim().replace(",", "."));
    if (Number.isFinite(value) && value > 0) {
      return { mode: "amount", value };
    }
  }

  // Sécurité pour les lignes dont Zoho ne renseigne que le montant net.
  if (gross > 0 && Number.isFinite(itemTotal) && itemTotal >= 0 &&
      gross - itemTotal > 0.005) {
    return { mode: "amount", value: Math.round((gross - itemTotal) * 100) / 100 };
  }

  return { mode: "percent", value: 0 };
}

export default async function EditInvoicePage({
  params,
}: EditInvoicePageProps) {
  const { invoiceId } =
    await params;

  let invoice;

  try {
    invoice =
      await getZohoInvoice(
        invoiceId
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
            href={`/management/invoices/${invoice.invoice_id}`}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            ← Retour à la facture
          </Link>

          <p className="mt-6 text-sm font-medium uppercase tracking-[0.18em] text-blue-600">
            Gestion / Factures
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Modifier{" "}
            {invoice.invoice_number ||
              "la facture"}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Les modifications seront
            enregistrées directement
            dans Zoho Books.
          </p>
        </div>

        <EditInvoiceForm
          invoice={{
            invoice_id:
              invoice.invoice_id,

            invoice_number:
              invoice.invoice_number,

            customer_id:
              invoice.customer_id,

            customer_name:
              invoice.customer_name,

            status:
              invoice.status,

            original_total:
              Number(invoice.total) || 0,

            date:
              invoice.date || "",

            due_date:
              invoice.due_date ||
              "",

            reference_number:
              invoice.reference_number ||
              "",

            notes:
              invoice.notes || "",

            terms:
              invoice.terms || "",

            line_items: (
              invoice.line_items ??
              []
            ).map((line) => {
              const discount =
                readDiscount(
                  line.discount,
                  line.discount_amount,
                  Number(line.quantity) * Number(line.rate),
                  Number(line.item_total)
                );

              return {
                line_item_id:
                  line.line_item_id,

                item_id:
                  line.item_id ||
                  "",

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
                  line.tax_id ||
                  "",
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