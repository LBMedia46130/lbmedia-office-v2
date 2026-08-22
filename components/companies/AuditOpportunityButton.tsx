"use client";

import {
  FormEvent,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

import {
  createOpportunity,
} from "@/app/companies/[id]/opportunityActions";

type RecommendationType =
  | "optimization"
  | "redesign"
  | "new_website";

type AuditOpportunityButtonProps = {
  companyId: string;
  companyName: string;
  websiteUrl: string;
  globalScore: number;
  priorities: string[];

  recommendationType?: RecommendationType;
  recommendationLabel?: string;
  commercialSummary?: string;
  visibilityWeaknesses?: string[];
  websiteWeaknesses?: string[];
};

export default function AuditOpportunityButton({
  companyId,
  companyName,
  websiteUrl,
  globalScore,
  priorities,
  recommendationType = "optimization",
  recommendationLabel = "Optimisation du site existant",
  commercialSummary = "",
  visibilityWeaknesses = [],
  websiteWeaknesses = [],
}: AuditOpportunityButtonProps) {
  const router = useRouter();

  const [
    isOpen,
    setIsOpen,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const defaultTitle =
    buildTitle(
      recommendationType
    );

  const defaultDescription =
    buildDescription({
      companyName,
      websiteUrl,
      globalScore,
      recommendationLabel,
      commercialSummary,
      visibilityWeaknesses,
      websiteWeaknesses,
      priorities,
    });

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setErrorMessage("");

    const formData =
      new FormData(
        event.currentTarget
      );

    startTransition(async () => {
      const result =
        await createOpportunity(
          companyId,
          formData
        );

      if (!result.success) {
        setErrorMessage(
          result.message
        );

        return;
      }

      setIsOpen(false);

      router.push(
        `/companies/${companyId}`
      );

      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() =>
          setIsOpen(true)
        }
        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
      >
        Créer une opportunité
      </button>

      {isOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm"
            onClick={() => {
              if (!isPending) {
                setIsOpen(false);
              }
            }}
          />

          <div className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-[540px] flex-col border-l border-white/10 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-8 py-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">
                  Audit → Diagnostic → CRM
                </p>

                <h2 className="mt-2 text-xl font-semibold text-white">
                  Nouvelle opportunité
                </h2>
              </div>

              <button
                type="button"
                aria-label="Fermer"
                onClick={() =>
                  setIsOpen(false)
                }
                disabled={isPending}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-xl text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={
                handleSubmit
              }
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="flex-1 overflow-y-auto px-8 py-6">
                <div className="space-y-5">
                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-4">
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-300">
                      Recommandation issue de l’audit
                    </p>

                    <p className="mt-2 text-lg font-semibold text-white">
                      {
                        recommendationLabel
                      }
                    </p>

                    {commercialSummary ? (
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        {
                          commercialSummary
                        }
                      </p>
                    ) : null}
                  </div>

                  <Field
                    name="title"
                    label="Titre *"
                    defaultValue={
                      defaultTitle
                    }
                    required
                  />

                  <div>
                    <label
                      htmlFor="audit-opportunity-description"
                      className="mb-2 block text-sm font-medium text-slate-300"
                    >
                      Description
                    </label>

                    <textarea
                      id="audit-opportunity-description"
                      name="description"
                      rows={18}
                      defaultValue={
                        defaultDescription
                      }
                      className="w-full resize-y rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500"
                    />
                  </div>

                  <input
                    type="hidden"
                    name="status"
                    value="new"
                  />

                  <input
                    type="hidden"
                    name="source"
                    value="Audit de site"
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      name="value"
                      label="Montant estimé"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Ex. 2500"
                    />

                    <Field
                      name="probability"
                      label="Probabilité (%)"
                      type="number"
                      min="0"
                      max="100"
                      defaultValue="20"
                    />
                  </div>

                  <Field
                    name="expected_close_date"
                    label="Date de conclusion prévue"
                    type="date"
                  />

                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
                    <p className="text-sm font-semibold text-emerald-300">
                      Source : Audit de site
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      L’opportunité sera automatiquement rattachée à{" "}
                      {companyName}.
                    </p>
                  </div>

                  {errorMessage ? (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300">
                      {
                        errorMessage
                      }
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-white/10 px-8 py-6">
                <button
                  type="button"
                  onClick={() =>
                    setIsOpen(false)
                  }
                  disabled={isPending}
                  className="rounded-xl border border-white/10 px-5 py-3 text-white transition hover:bg-white/5 disabled:opacity-50"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={isPending}
                  className="min-w-40 rounded-xl bg-emerald-600 px-5 py-3 font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
                >
                  {isPending
                    ? "Enregistrement…"
                    : "Créer l’opportunité"}
                </button>
              </div>
            </form>
          </div>
        </>
      ) : null}
    </>
  );
}

function buildTitle(
  recommendationType: RecommendationType
): string {
  if (
    recommendationType ===
    "new_website"
  ) {
    return "Création d’un nouveau site internet";
  }

  if (
    recommendationType ===
    "redesign"
  ) {
    return "Refonte du site internet";
  }

  return "Optimisation du site internet";
}

function buildDescription({
  companyName,
  websiteUrl,
  globalScore,
  recommendationLabel,
  commercialSummary,
  visibilityWeaknesses,
  websiteWeaknesses,
  priorities,
}: {
  companyName: string;
  websiteUrl: string;
  globalScore: number;
  recommendationLabel: string;
  commercialSummary: string;
  visibilityWeaknesses: string[];
  websiteWeaknesses: string[];
  priorities: string[];
}) {
  const lines = [
    `Opportunité identifiée à la suite de l’audit du site de ${companyName}.`,
    "",
    `Site : ${websiteUrl}`,
    `Score global de l’audit : ${globalScore}/100`,
    "",
    `Recommandation : ${recommendationLabel}`,
  ];

  if (commercialSummary) {
    lines.push(
      "",
      "Diagnostic commercial :",
      commercialSummary
    );
  }

  if (
    visibilityWeaknesses.length >
    0
  ) {
    lines.push(
      "",
      "Faiblesses — Visibilité & acquisition :"
    );

    visibilityWeaknesses
      .slice(0, 5)
      .forEach(
        (
          weakness,
          index
        ) => {
          lines.push(
            `${index + 1}. ${weakness}`
          );
        }
      );
  }

  if (
    websiteWeaknesses.length >
    0
  ) {
    lines.push(
      "",
      "Faiblesses — Site & conversion :"
    );

    websiteWeaknesses
      .slice(0, 5)
      .forEach(
        (
          weakness,
          index
        ) => {
          lines.push(
            `${index + 1}. ${weakness}`
          );
        }
      );
  }

  if (priorities.length > 0) {
    lines.push(
      "",
      "Actions recommandées :"
    );

    priorities
      .slice(0, 5)
      .forEach(
        (
          priority,
          index
        ) => {
          lines.push(
            `${index + 1}. ${priority}`
          );
        }
      );
  }

  return lines.join("\n");
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
        htmlFor={`audit-opportunity-${name}`}
        className="mb-2 block text-sm font-medium text-slate-300"
      >
        {label}
      </label>

      <input
        id={`audit-opportunity-${name}`}
        name={name}
        type={type}
        required={required}
        defaultValue={
          defaultValue
        }
        placeholder={
          placeholder
        }
        min={min}
        max={max}
        step={step}
        className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500"
      />
    </div>
  );
}