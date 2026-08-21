"use client";

import {
  FormEvent,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type DiscountMode =
  | "percent"
  | "amount";

type TaxOption = {
  tax_id: string;
  tax_name: string;
  tax_percentage: number;
};

type ItemOption = {
  item_id: string;
  name: string;
  description: string;
  rate: number;
  tax_id: string | null;
  tax_name: string | null;
  tax_percentage: number | null;
};

type InitialLine = {
  line_item_id: string;
  item_id: string;
  name: string;
  description: string;
  quantity: number;
  rate: number;
  discount_mode: DiscountMode;
  discount_value: number;
  tax_id: string;
};

type InitialEstimate = {
  estimate_id: string;
  estimate_number: string;
  customer_id: string;
  customer_name: string;
  date: string;
  expiry_date: string;
  reference_number: string;
  notes: string;
  terms: string;
  line_items: InitialLine[];
};

type EstimateLine = {
  id: string;
  item_id: string;
  name: string;
  description: string;
  quantity: string;
  rate: string;
  discount_mode: DiscountMode;
  discount_value: string;
  tax_id: string;
};

type Props = {
  estimate: InitialEstimate;
  taxes: TaxOption[];
  items: ItemOption[];
};

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

function createLine(
  defaultTaxId = ""
): EstimateLine {
  return {
    id:
      typeof crypto !== "undefined" &&
      "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`,
    item_id: "",
    name: "",
    description: "",
    quantity: "1",
    rate: "",
    discount_mode: "percent",
    discount_value: "0",
    tax_id: defaultTaxId,
  };
}

function calculateLineGross(
  line: EstimateLine
) {
  return (
    numberValue(line.quantity) *
    numberValue(line.rate)
  );
}

function calculateLineDiscount(
  line: EstimateLine
) {
  const gross =
    calculateLineGross(line);

  const value =
    Math.max(
      0,
      numberValue(
        line.discount_value
      )
    );

  if (
    line.discount_mode ===
    "percent"
  ) {
    const percentage =
      Math.min(
        100,
        value
      );

    return (
      gross *
      (percentage / 100)
    );
  }

  return Math.min(
    gross,
    value
  );
}

function calculateLineTotal(
  line: EstimateLine
) {
  return Math.max(
    0,
    calculateLineGross(line) -
      calculateLineDiscount(line)
  );
}

function normalizeSearch(
  value: string
) {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .trim();
}

export default function EditEstimateForm({
  estimate,
  taxes,
  items,
}: Props) {
  const router =
    useRouter();

  const defaultTax =
    taxes.find(
      (tax) =>
        Number(
          tax.tax_percentage
        ) === 20
    ) ??
    taxes[0] ??
    null;

  const [
    date,
    setDate,
  ] = useState(
    estimate.date
  );

  const [
    expiryDate,
    setExpiryDate,
  ] = useState(
    estimate.expiry_date
  );

  const [
    referenceNumber,
    setReferenceNumber,
  ] = useState(
    estimate.reference_number
  );

  const [
    notes,
    setNotes,
  ] = useState(
    estimate.notes
  );

  const [
    terms,
    setTerms,
  ] = useState(
    estimate.terms
  );

  const [
    lines,
    setLines,
  ] = useState<EstimateLine[]>(
    estimate.line_items.length
      ? estimate.line_items.map(
          (line) => ({
            id:
              line.line_item_id ||
              `${Date.now()}-${Math.random()}`,

            item_id:
              line.item_id || "",

            name:
              line.name,

            description:
              line.description,

            quantity:
              String(
                line.quantity
              ),

            rate:
              String(
                line.rate
              ),

            discount_mode:
              line.discount_mode,

            discount_value:
              String(
                line.discount_value
              ),

            tax_id:
              line.tax_id ||
              defaultTax?.tax_id ||
              "",
          })
        )
      : [
          createLine(
            defaultTax?.tax_id
          ),
        ]
  );

  const [
    activeSearchLineId,
    setActiveSearchLineId,
  ] = useState<
    string | null
  >(null);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<
    string | null
  >(null);

  const subtotalBeforeDiscount =
    useMemo(() => {
      return lines.reduce(
        (total, line) =>
          total +
          calculateLineGross(
            line
          ),
        0
      );
    }, [lines]);

  const discountTotal =
    useMemo(() => {
      return lines.reduce(
        (total, line) =>
          total +
          calculateLineDiscount(
            line
          ),
        0
      );
    }, [lines]);

  const subtotal =
    useMemo(() => {
      return lines.reduce(
        (total, line) =>
          total +
          calculateLineTotal(
            line
          ),
        0
      );
    }, [lines]);

  const taxAmount =
    useMemo(() => {
      return lines.reduce(
        (total, line) => {
          const tax =
            taxes.find(
              (item) =>
                item.tax_id ===
                line.tax_id
            );

          const percentage =
            tax?.tax_percentage ??
            0;

          return (
            total +
            calculateLineTotal(
              line
            ) *
              (percentage /
                100)
          );
        },
        0
      );
    }, [lines, taxes]);

  const total =
    subtotal + taxAmount;

  function updateLine(
    id: string,
    field:
      | "name"
      | "description"
      | "quantity"
      | "rate"
      | "discount_value"
      | "tax_id",
    value: string
  ) {
    setLines(
      (current) =>
        current.map(
          (line) => {
            if (
              line.id !== id
            ) {
              return line;
            }

            if (
              field ===
              "name"
            ) {
              return {
                ...line,
                item_id: "",
                name: value,
              };
            }

            return {
              ...line,
              [field]: value,
            };
          }
        )
    );
  }

  function updateDiscountMode(
    id: string,
    mode: DiscountMode
  ) {
    setLines(
      (current) =>
        current.map(
          (line) =>
            line.id === id
              ? {
                  ...line,
                  discount_mode:
                    mode,
                  discount_value:
                    "0",
                }
              : line
        )
    );
  }

  function selectItem(
    lineId: string,
    item: ItemOption
  ) {
    setLines(
      (current) =>
        current.map(
          (line) =>
            line.id ===
            lineId
              ? {
                  ...line,
                  item_id:
                    item.item_id,
                  name:
                    item.name,
                  description:
                    item.description,
                  rate:
                    String(
                      item.rate
                    ),
                  tax_id:
                    item.tax_id ||
                    defaultTax?.tax_id ||
                    "",
                }
              : line
        )
    );

    setActiveSearchLineId(
      null
    );
  }

  function getSuggestions(
    line: EstimateLine
  ) {
    const search =
      normalizeSearch(
        line.name
      );

    if (!search) {
      return items
        .slice()
        .sort((a, b) =>
          a.name.localeCompare(
            b.name,
            "fr"
          )
        )
        .slice(0, 8);
    }

    const startsWith =
      items.filter(
        (item) =>
          normalizeSearch(
            item.name
          ).startsWith(
            search
          )
      );

    const containsInName =
      items.filter(
        (item) => {
          const name =
            normalizeSearch(
              item.name
            );

          return (
            !name.startsWith(
              search
            ) &&
            name.includes(
              search
            )
          );
        }
      );

    const containsInDescription =
      items.filter(
        (item) => {
          const name =
            normalizeSearch(
              item.name
            );

          const description =
            normalizeSearch(
              item.description
            );

          return (
            !name.includes(
              search
            ) &&
            description.includes(
              search
            )
          );
        }
      );

    return [
      ...startsWith,
      ...containsInName,
      ...containsInDescription,
    ].slice(0, 8);
  }

  function addLine() {
    setLines(
      (current) => [
        ...current,
        createLine(
          defaultTax?.tax_id
        ),
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

    if (
      activeSearchLineId ===
      id
    ) {
      setActiveSearchLineId(
        null
      );
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setErrorMessage(null);

    const normalizedLines =
      lines.map(
        (line) => {
          const discountValue =
            numberValue(
              line.discount_value
            );

          let discount:
            | string
            | undefined;

          if (
            discountValue > 0
          ) {
            discount =
              line.discount_mode ===
              "percent"
                ? `${Math.round(
                    discountValue
                  )}%`
                : String(
                    discountValue
                  );
          }

          return {
            item_id:
              line.item_id ||
              undefined,

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

            discount,

            tax_id:
              line.tax_id ||
              undefined,
          };
        }
      );

    const invalidLine =
      normalizedLines.some(
        (line, index) => {
          const sourceLine =
            lines[index];

          const discountValue =
            numberValue(
              sourceLine
                .discount_value
            );

          if (
            !line.name ||
            line.quantity <= 0 ||
            line.rate < 0 ||
            discountValue < 0
          ) {
            return true;
          }

          if (
            sourceLine.discount_mode ===
              "percent" &&
            discountValue > 100
          ) {
            return true;
          }

          if (
            sourceLine.discount_mode ===
              "amount" &&
            discountValue >
              calculateLineGross(
                sourceLine
              )
          ) {
            return true;
          }

          return false;
        }
      );

    if (invalidLine) {
      setErrorMessage(
        "Vérifie les lignes du devis : quantité, prix HT et remise."
      );

      return;
    }

    setSubmitting(true);

    try {
      const response =
        await fetch(
          `/api/zoho/estimates/${estimate.estimate_id}/update`,
          {
            method:
              "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                customer_id:
                  estimate.customer_id,

                date:
                  date ||
                  undefined,

                expiry_date:
                  expiryDate ||
                  undefined,

                reference_number:
                  referenceNumber ||
                  undefined,

                notes:
                  notes ||
                  undefined,

                terms:
                  terms ||
                  undefined,

                line_items:
                  normalizedLines,
              }),
          }
        );

      const result =
        (await response.json()) as {
          success?: boolean;
          error?: string;
        };

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
            "Impossible de modifier le devis."
        );
      }

      router.push(
        `/management/estimates/${estimate.estimate_id}`
      );

      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de modifier le devis."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={
        handleSubmit
      }
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

        <div className="mt-5 rounded-xl bg-slate-50 p-4">
          <p className="font-semibold text-slate-900">
            {
              estimate.customer_name
            }
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Le client du devis
            n’est pas modifié.
          </p>
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
              onChange={(
                event
              ) =>
                setDate(
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
              value={
                expiryDate
              }
              onChange={(
                event
              ) =>
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
              value={
                referenceNumber
              }
              onChange={(
                event
              ) =>
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
              Recherche dans le
              catalogue Zoho Books
              ou saisie libre.
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
            (
              line,
              index
            ) => {
              const suggestions =
                getSuggestions(
                  line
                );

              return (
                <div
                  key={
                    line.id
                  }
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700">
                      Ligne{" "}
                      {index +
                        1}
                    </p>

                    {lines.length >
                    1 ? (
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

                  <div className="grid gap-4 xl:grid-cols-[1.8fr_2.5fr_0.7fr_1fr_1.25fr_1fr]">
                    <div className="relative">
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Prestation
                      </label>

                      <input
                        value={
                          line.name
                        }
                        onFocus={() =>
                          setActiveSearchLineId(
                            line.id
                          )
                        }
                        onChange={(
                          event
                        ) => {
                          updateLine(
                            line.id,
                            "name",
                            event
                              .target
                              .value
                          );

                          setActiveSearchLineId(
                            line.id
                          );
                        }}
                        onBlur={() => {
                          window.setTimeout(
                            () =>
                              setActiveSearchLineId(
                                null
                              ),
                            150
                          );
                        }}
                        placeholder="Tapez les premières lettres..."
                        autoComplete="off"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />

                      {line.item_id ? (
                        <p className="mt-1 text-xs font-medium text-emerald-600">
                          Article Zoho
                          sélectionné
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-slate-400">
                          Recherche
                          catalogue ou
                          saisie libre
                        </p>
                      )}

                      {activeSearchLineId ===
                        line.id &&
                      suggestions.length >
                        0 ? (
                        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                          {suggestions.map(
                            (
                              item
                            ) => (
                              <button
                                key={
                                  item.item_id
                                }
                                type="button"
                                onMouseDown={(
                                  event
                                ) => {
                                  event.preventDefault();

                                  selectItem(
                                    line.id,
                                    item
                                  );
                                }}
                                className="block w-full border-b border-slate-100 px-3 py-3 text-left transition last:border-b-0 hover:bg-blue-50"
                              >
                                <span className="block text-sm font-semibold text-slate-900">
                                  {
                                    item.name
                                  }
                                </span>

                                <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                                  <span>
                                    {formatCurrency(
                                      item.rate
                                    )}{" "}
                                    HT
                                  </span>

                                  {item.tax_percentage !==
                                  null ? (
                                    <span>
                                      TVA{" "}
                                      {
                                        item.tax_percentage
                                      }{" "}
                                      %
                                    </span>
                                  ) : null}
                                </span>

                                {item.description ? (
                                  <span className="mt-1 block line-clamp-2 text-xs text-slate-400">
                                    {
                                      item.description
                                    }
                                  </span>
                                ) : null}
                              </button>
                            )
                          )}
                        </div>
                      ) : null}
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
                        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Qté
                      </label>

                      <input
                        type="number"
                        min="1"
                        step="1"
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
                        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Remise
                      </label>

                      <div className="grid grid-cols-[72px_1fr] gap-2">
                        <select
                          value={
                            line.discount_mode
                          }
                          onChange={(
                            event
                          ) =>
                            updateDiscountMode(
                              line.id,
                              event
                                .target
                                .value as DiscountMode
                            )
                          }
                          className="rounded-xl border border-slate-300 bg-white px-2 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        >
                          <option value="percent">
                            %
                          </option>

                          <option value="amount">
                            €
                          </option>
                        </select>

                        <input
                          type="number"
                          min="0"
                          max={
                            line.discount_mode ===
                            "percent"
                              ? "100"
                              : undefined
                          }
                          step={
                            line.discount_mode ===
                            "percent"
                              ? "1"
                              : "0.01"
                          }
                          value={
                            line.discount_value
                          }
                          onChange={(
                            event
                          ) =>
                            updateLine(
                              line.id,
                              "discount_value",
                              event
                                .target
                                .value
                            )
                          }
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        TVA
                      </label>

                      <select
                        value={
                          line.tax_id
                        }
                        onChange={(
                          event
                        ) =>
                          updateLine(
                            line.id,
                            "tax_id",
                            event
                              .target
                              .value
                          )
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="">
                          Sans TVA
                        </option>

                        {taxes.map(
                          (
                            tax
                          ) => (
                            <option
                              key={
                                tax.tax_id
                              }
                              value={
                                tax.tax_id
                              }
                            >
                              {
                                tax.tax_percentage
                              }{" "}
                              % —{" "}
                              {
                                tax.tax_name
                              }
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <p className="text-sm text-slate-500">
                      Total ligne HT :{" "}
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(
                          calculateLineTotal(
                            line
                          )
                        )}
                      </span>
                    </p>
                  </div>
                </div>
              );
            }
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
                onChange={(
                  event
                ) =>
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
                rows={5}
                value={terms}
                onChange={(
                  event
                ) =>
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
                Montant brut HT
              </span>

              <span className="font-semibold text-slate-900">
                {formatCurrency(
                  subtotalBeforeDiscount
                )}
              </span>
            </div>

            {discountTotal >
            0 ? (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">
                  Remises
                </span>

                <span className="font-semibold text-amber-700">
                  -
                  {formatCurrency(
                    discountTotal
                  )}
                </span>
              </div>
            ) : null}

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
                TVA
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

          <button
            type="submit"
            disabled={
              submitting
            }
            className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting
              ? "Enregistrement..."
              : "Enregistrer les modifications"}
          </button>

          <button
            type="button"
            onClick={() =>
              router.push(
                `/management/estimates/${estimate.estimate_id}`
              )
            }
            disabled={
              submitting
            }
            className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Annuler
          </button>

          <p className="mt-3 text-center text-xs text-slate-400">
            Modification directe
            dans Zoho Books
          </p>
        </div>
      </section>
    </form>
  );
}