"use client";

import {
  FormEvent,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type CompanyOption = {
  id: string;
  name: string;
  legal_name: string | null;
  relationship_status:
    | "prospect"
    | "client";
  city: string | null;
  zoho_contact_id: string | null;
};

type TaxOption = {
  tax_id: string;
  tax_name: string;
  tax_percentage: number;
};

type EstimateLine = {
  id: string;
  name: string;
  description: string;
  quantity: string;
  rate: string;
};

type Props = {
  companies: CompanyOption[];
  tax: TaxOption | null;
};

function formatDateForInput(
  date: Date
) {
  return [
    date.getFullYear(),
    String(
      date.getMonth() + 1
    ).padStart(2, "0"),
    String(
      date.getDate()
    ).padStart(2, "0"),
  ].join("-");
}

function today() {
  return formatDateForInput(
    new Date()
  );
}

function addDays(
  dateValue: string,
  days: number
) {
  if (!dateValue) {
    return "";
  }

  const [
    year,
    month,
    day,
  ] = dateValue
    .split("-")
    .map(Number);

  const date = new Date(
    year,
    month - 1,
    day
  );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  date.setDate(
    date.getDate() + days
  );

  return formatDateForInput(
    date
  );
}

function createLine(): EstimateLine {
  return {
    id:
      typeof crypto !== "undefined" &&
      "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`,
    name: "",
    description: "",
    quantity: "1",
    rate: "",
  };
}

function numberValue(
  value: string
) {
  const normalized =
    value.replace(",", ".");

  const number =
    Number(normalized);

  return Number.isFinite(number)
    ? number
    : 0;
}

function formatCurrency(
  value: number
) {
  return new Intl.NumberFormat(
    "fr-FR",
    {
      style: "currency",
      currency: "EUR",
    }
  ).format(value);
}

export default function NewEstimateForm({
  companies,
  tax,
}: Props) {
  const router =
    useRouter();

  const initialDate =
    today();

  const [
    companyId,
    setCompanyId,
  ] = useState("");

  const [
    date,
    setDate,
  ] = useState(
    initialDate
  );

  const [
    expiryDate,
    setExpiryDate,
  ] = useState(
    addDays(
      initialDate,
      60
    )
  );

  const [
    referenceNumber,
    setReferenceNumber,
  ] = useState("");

  const [
    notes,
    setNotes,
  ] = useState("");

  const [
    terms,
    setTerms,
  ] = useState("");

  const [
    lines,
    setLines,
  ] = useState<EstimateLine[]>([
    createLine(),
  ]);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(
    null
  );

  const selectedCompany =
    companies.find(
      (company) =>
        company.id === companyId
    ) ?? null;

  const subtotal =
    useMemo(() => {
      return lines.reduce(
        (total, line) =>
          total +
          numberValue(
            line.quantity
          ) *
            numberValue(
              line.rate
            ),
        0
      );
    }, [lines]);

  const taxPercentage =
    tax?.tax_percentage ?? 0;

  const taxAmount =
    subtotal *
    (taxPercentage / 100);

  const total =
    subtotal + taxAmount;

  function handleDateChange(
    value: string
  ) {
    setDate(value);

    setExpiryDate(
      addDays(
        value,
        60
      )
    );
  }

  function updateLine(
    id: string,
    field:
      | "name"
      | "description"
      | "quantity"
      | "rate",
    value: string
  ) {
    setLines(
      (current) =>
        current.map((line) =>
          line.id === id
            ? {
                ...line,
                [field]: value,
              }
            : line
        )
    );
  }

  function addLine() {
    setLines(
      (current) => [
        ...current,
        createLine(),
      ]
    );
  }

  function removeLine(
    id: string
  ) {
    setLines(
      (current) => {
        if (
          current.length === 1
        ) {
          return current;
        }

        return current.filter(
          (line) =>
            line.id !== id
        );
      }
    );
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setErrorMessage(null);

    if (!companyId) {
      setErrorMessage(
        "Sélectionne un client ou un prospect."
      );

      return;
    }

    const normalizedLines =
      lines.map((line) => ({
        name:
          line.name.trim(),

        description:
          line.description.trim(),

        quantity:
          numberValue(
            line.quantity
          ),

        rate:
          numberValue(
            line.rate
          ),

        tax_id:
          tax?.tax_id,
      }));

    if (
      normalizedLines.some(
        (line) =>
          !line.name ||
          line.quantity <= 0 ||
          line.rate < 0
      )
    ) {
      setErrorMessage(
        "Vérifie les lignes du devis : prestation, quantité et prix HT."
      );

      return;
    }

    setSubmitting(true);

    try {
      const response =
        await fetch(
          "/api/zoho/estimates/create",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                company_id:
                  companyId,

                date:
                  date || undefined,

                expiry_date:
                  expiryDate ||
                  undefined,

                reference_number:
                  referenceNumber ||
                  undefined,

                notes:
                  notes || undefined,

                terms:
                  terms || undefined,

                line_items:
                  normalizedLines,
              }),
          }
        );

      const result =
        (await response.json()) as {
          success?: boolean;
          error?: string;
          estimate?: {
            estimate_id: string;
            estimate_number: string;
          };
        };

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
            "Impossible de créer le devis."
        );
      }

      router.push(
        "/management/estimates"
      );

      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de créer le devis."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Client / prospect
        </h2>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div>
            <label
              htmlFor="company"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Entreprise
            </label>

            <select
              id="company"
              value={companyId}
              onChange={(event) =>
                setCompanyId(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">
                Sélectionner...
              </option>

              {companies.map(
                (company) => (
                  <option
                    key={
                      company.id
                    }
                    value={
                      company.id
                    }
                  >
                    {company.name}
                    {" — "}
                    {company.relationship_status ===
                    "client"
                      ? "Client"
                      : "Prospect"}
                    {company.city
                      ? ` — ${company.city}`
                      : ""}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            {selectedCompany ? (
              <>
                <p className="font-semibold text-slate-900">
                  {
                    selectedCompany.name
                  }
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {selectedCompany.relationship_status ===
                  "client"
                    ? "Client"
                    : "Prospect"}
                  {selectedCompany.city
                    ? ` · ${selectedCompany.city}`
                    : ""}
                </p>

                <p className="mt-3 text-xs font-medium text-slate-400">
                  {selectedCompany.zoho_contact_id
                    ? "Déjà lié à Zoho Books"
                    : "Le contact Zoho sera créé automatiquement"}
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-400">
                Les informations de
                l’entreprise apparaîtront
                ici.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Informations du devis
        </h2>

        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <div>
            <label
              htmlFor="date"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Date
            </label>

            <input
              id="date"
              type="date"
              value={date}
              onChange={(event) =>
                handleDateChange(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="expiry"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Valable jusqu’au
            </label>

            <input
              id="expiry"
              type="date"
              value={expiryDate}
              onChange={(event) =>
                setExpiryDate(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="reference"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Référence
            </label>

            <input
              id="reference"
              value={referenceNumber}
              onChange={(event) =>
                setReferenceNumber(
                  event.target.value
                )
              }
              placeholder="Optionnel"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Prestations
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Montants exprimés hors
              taxes.
            </p>
          </div>

          <button
            type="button"
            onClick={addLine}
            className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
          >
            + Ajouter une ligne
          </button>
        </div>

        <div className="space-y-4 p-6">
          {lines.map(
            (line, index) => (
              <div
                key={line.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700">
                    Ligne {index + 1}
                  </p>

                  {lines.length > 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        removeLine(
                          line.id
                        )
                      }
                      className="text-sm font-semibold text-red-600 hover:text-red-700"
                    >
                      Supprimer
                    </button>
                  ) : null}
                </div>

                <div className="grid gap-4 lg:grid-cols-[2fr_3fr_0.8fr_1fr_1fr]">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Prestation
                    </label>

                    <input
                      value={
                        line.name
                      }
                      onChange={(
                        event
                      ) =>
                        updateLine(
                          line.id,
                          "name",
                          event
                            .target
                            .value
                        )
                      }
                      placeholder="Ex. Création site internet"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Description
                    </label>

                    <input
                      value={
                        line.description
                      }
                      onChange={(
                        event
                      ) =>
                        updateLine(
                          line.id,
                          "description",
                          event
                            .target
                            .value
                        )
                      }
                      placeholder="Détail de la prestation"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Qté
                    </label>

                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={
                        line.quantity
                      }
                      onChange={(
                        event
                      ) =>
                        updateLine(
                          line.id,
                          "quantity",
                          event
                            .target
                            .value
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Prix HT
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        line.rate
                      }
                      onChange={(
                        event
                      ) =>
                        updateLine(
                          line.id,
                          "rate",
                          event
                            .target
                            .value
                        )
                      }
                      placeholder="0,00"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      TVA
                    </label>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700">
                      {tax
                        ? `${tax.tax_percentage} %`
                        : "—"}
                    </div>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Notes et conditions
          </h2>

          <div className="mt-5 space-y-5">
            <div>
              <label
                htmlFor="notes"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Notes
              </label>

              <textarea
                id="notes"
                rows={4}
                value={notes}
                onChange={(event) =>
                  setNotes(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="terms"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Conditions
              </label>

              <textarea
                id="terms"
                rows={4}
                value={terms}
                onChange={(event) =>
                  setTerms(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </div>

        <div className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Total
          </h2>

          <div className="mt-5 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">
                Total HT
              </span>

              <span className="font-semibold text-slate-900">
                {formatCurrency(
                  subtotal
                )}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-slate-500">
                TVA{" "}
                {taxPercentage
                  ? `${taxPercentage} %`
                  : ""}
              </span>

              <span className="font-semibold text-slate-900">
                {formatCurrency(
                  taxAmount
                )}
              </span>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <div className="flex items-end justify-between">
                <span className="font-semibold text-slate-700">
                  Total TTC
                </span>

                <span className="text-2xl font-bold text-blue-700">
                  {formatCurrency(
                    total
                  )}
                </span>
              </div>
            </div>
          </div>

          {tax ? (
            <p className="mt-5 text-xs text-slate-400">
              Taxe Zoho Books :{" "}
              {tax.tax_name} (
              {tax.tax_percentage} %)
            </p>
          ) : (
            <p className="mt-5 text-xs font-medium text-red-600">
              Aucune taxe Zoho Books
              disponible.
            </p>
          )}

          <button
            type="submit"
            disabled={
              submitting ||
              !tax
            }
            className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting
              ? "Création..."
              : "Créer le devis"}
          </button>

          <p className="mt-3 text-center text-xs text-slate-400">
            Création directe dans Zoho
            Books
          </p>
        </div>
      </section>
    </form>
  );
}