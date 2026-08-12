"use client";

import {
  FormEvent,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

import {
  createOpportunity,
  deleteOpportunity,
  updateOpportunity,
} from "@/app/companies/[id]/opportunityActions";
import type { Opportunity } from "@/lib/opportunities";

type CompanyOpportunitiesProps = {
  companyId: string;
  opportunities: Opportunity[];
};

type OpportunityFormProps = {
  companyId: string;
  opportunity?: Opportunity;
  onClose: () => void;
};

const statusOptions = [
  {
    value: "new",
    label: "Nouvelle",
  },
  {
    value: "qualified",
    label: "Qualifiée",
  },
  {
    value: "proposal",
    label: "Proposition envoyée",
  },
  {
    value: "negotiation",
    label: "Négociation",
  },
  {
    value: "won",
    label: "Gagnée",
  },
  {
    value: "lost",
    label: "Perdue",
  },
];

export default function CompanyOpportunities({
  companyId,
  opportunities,
}: CompanyOpportunitiesProps) {
  const [isCreating, setIsCreating] =
    useState(false);
  const [editingOpportunity, setEditingOpportunity] =
    useState<Opportunity | null>(null);

  return (
    <>
      <section className="rounded-3xl bg-white p-8 text-slate-900 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
              Suivi commercial
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Opportunités
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            + Ajouter une opportunité
          </button>
        </div>

        {opportunities.length === 0 ? (
          <div className="py-10 text-center">
            <p className="font-semibold text-slate-700">
              Aucune opportunité enregistrée
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Ajoutez une première opportunité commerciale.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {opportunities.map((opportunity) => (
              <OpportunityCard
                key={opportunity.id}
                companyId={companyId}
                opportunity={opportunity}
                onEdit={() =>
                  setEditingOpportunity(opportunity)
                }
              />
            ))}
          </div>
        )}
      </section>

      {isCreating && (
        <OpportunityForm
          companyId={companyId}
          onClose={() => setIsCreating(false)}
        />
      )}

      {editingOpportunity && (
        <OpportunityForm
          companyId={companyId}
          opportunity={editingOpportunity}
          onClose={() =>
            setEditingOpportunity(null)
          }
        />
      )}
    </>
  );
}

type OpportunityCardProps = {
  companyId: string;
  opportunity: Opportunity;
  onEdit: () => void;
};

function OpportunityCard({
  companyId,
  opportunity,
  onEdit,
}: OpportunityCardProps) {
  const router = useRouter();
  const [showDelete, setShowDelete] =
    useState(false);
  const [errorMessage, setErrorMessage] =
    useState("");
  const [isPending, startTransition] =
    useTransition();

  function handleDelete() {
    setErrorMessage("");

    startTransition(async () => {
      const result = await deleteOpportunity(
        companyId,
        opportunity.id
      );

      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }

      setShowDelete(false);
      router.refresh();
    });
  }

  return (
    <>
      <article className="rounded-2xl border border-slate-200 p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-lg font-bold text-slate-900">
                {opportunity.title}
              </h3>

              <StatusBadge status={opportunity.status} />
            </div>

            {opportunity.description && (
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                {opportunity.description}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
              <span>
                Montant :{" "}
                <strong className="text-slate-900">
                  {formatCurrency(opportunity.value)}
                </strong>
              </span>

              <span>
                Probabilité :{" "}
                <strong className="text-slate-900">
                  {opportunity.probability} %
                </strong>
              </span>

              <span>
                Échéance :{" "}
                <strong className="text-slate-900">
                  {formatDate(
                    opportunity.expected_close_date
                  )}
                </strong>
              </span>

              {opportunity.source && (
                <span>
                  Source :{" "}
                  <strong className="text-slate-900">
                    {opportunity.source}
                  </strong>
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-50"
            >
              Modifier
            </button>

            <button
              type="button"
              onClick={() => setShowDelete(true)}
              className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
            >
              Supprimer
            </button>
          </div>
        </div>
      </article>

      {showDelete && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-slate-950/50 backdrop-blur-sm"
            onClick={() => {
              if (!isPending) {
                setShowDelete(false);
              }
            }}
          />

          <div className="fixed left-1/2 top-1/2 z-[70] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-xl font-bold text-red-600">
              !
            </div>

            <h2 className="mt-5 text-xl font-bold text-slate-900">
              Supprimer cette opportunité ?
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              L’opportunité{" "}
              <strong className="font-semibold text-slate-900">
                {opportunity.title}
              </strong>{" "}
              sera définitivement supprimée.
            </p>

            {errorMessage && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {errorMessage}
              </div>
            )}

            <div className="mt-7 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDelete(false)}
                disabled={isPending}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {isPending
                  ? "Suppression..."
                  : "Supprimer définitivement"}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function OpportunityForm({
  companyId,
  opportunity,
  onClose,
}: OpportunityFormProps) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] =
    useState("");
  const [isPending, startTransition] =
    useTransition();

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setErrorMessage("");

    const formData = new FormData(
      event.currentTarget
    );

    startTransition(async () => {
      const result = opportunity
        ? await updateOpportunity(
            companyId,
            opportunity.id,
            formData
          )
        : await createOpportunity(
            companyId,
            formData
          );

      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }

      onClose();
      router.refresh();
    });
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-950/50"
        onClick={() => {
          if (!isPending) {
            onClose();
          }
        }}
      />

      <div className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-[520px] flex-col border-l border-white/10 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-8 py-6">
          <h2 className="text-xl font-semibold text-white">
            {opportunity
              ? "Modifier l’opportunité"
              : "Nouvelle opportunité"}
          </h2>

          <button
            type="button"
            aria-label="Fermer"
            onClick={onClose}
            disabled={isPending}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-xl text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 overflow-y-auto px-8 py-6">
            <div className="space-y-5">
              <Field
                name="title"
                label="Titre *"
                defaultValue={
                  opportunity?.title ?? ""
                }
                required
              />

              <div>
                <label
                  htmlFor="description"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Description
                </label>

                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  defaultValue={
                    opportunity?.description ?? ""
                  }
                  className="w-full resize-none rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="status"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Statut
                </label>

                <select
                  id="status"
                  name="status"
                  defaultValue={
                    opportunity?.status ?? "new"
                  }
                  className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-blue-500"
                >
                  {statusOptions.map((status) => (
                    <option
                      key={status.value}
                      value={status.value}
                    >
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field
                  name="value"
                  label="Montant estimé"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={
                    opportunity?.value?.toString() ?? ""
                  }
                />

                <Field
                  name="probability"
                  label="Probabilité (%)"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue={
                    opportunity?.probability?.toString() ??
                    "0"
                  }
                />
              </div>

              <Field
                name="expected_close_date"
                label="Date de conclusion prévue"
                type="date"
                defaultValue={
                  opportunity?.expected_close_date ??
                  ""
                }
              />

              <Field
                name="source"
                label="Source"
                placeholder="LinkedIn, recommandation, radio..."
                defaultValue={
                  opportunity?.source ?? ""
                }
              />

              {errorMessage && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {errorMessage}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-white/10 px-8 py-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-xl border border-white/10 px-5 py-3 text-white transition hover:bg-white/5 disabled:opacity-50"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={isPending}
              className="min-w-32 rounded-xl bg-blue-500 px-5 py-3 font-medium text-white transition hover:bg-blue-400 disabled:opacity-50"
            >
              {isPending
                ? "Enregistrement…"
                : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

type FieldProps = {
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  min?: string;
  max?: string;
  step?: string;
};

function Field({
  name,
  label,
  defaultValue,
  placeholder,
  type = "text",
  required = false,
  min,
  max,
  step,
}: FieldProps) {
  return (
    <div>
      <label
        htmlFor={`opportunity-${name}`}
        className="mb-2 block text-sm font-medium text-slate-300"
      >
        {label}
      </label>

      <input
        id={`opportunity-${name}`}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500"
      />
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const labels: Record<string, string> = {
    new: "Nouvelle",
    qualified: "Qualifiée",
    proposal: "Proposition envoyée",
    negotiation: "Négociation",
    won: "Gagnée",
    lost: "Perdue",
  };

  const classes: Record<string, string> = {
    new: "bg-slate-100 text-slate-700",
    qualified: "bg-blue-50 text-blue-700",
    proposal: "bg-violet-50 text-violet-700",
    negotiation: "bg-amber-50 text-amber-700",
    won: "bg-emerald-50 text-emerald-700",
    lost: "bg-red-50 text-red-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        classes[status] ??
        "bg-slate-100 text-slate-700"
      }`}
    >
      {labels[status] ?? status}
    </span>
  );
}

function formatCurrency(
  value: number | null
) {
  if (value === null) {
    return "Non renseigné";
  }

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function formatDate(
  value: string | null
) {
  if (!value) {
    return "Non renseignée";
  }

  return new Intl.DateTimeFormat("fr-FR").format(
    new Date(`${value}T00:00:00`)
  );
}