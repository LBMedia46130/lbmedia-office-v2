"use client";

import {
  useMemo,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

type ProposalType =
  | "optimization"
  | "optimization_redesign"
  | "redesign"
  | "new_website";

type AuditProspectionGeneratorProps = {
  prospectionId: string;

  recommendedProposalType?: ProposalType;

  currentProposalType?:
    | ProposalType
    | null;
};

const proposalOptions: {
  value: ProposalType;
  label: string;
  description: string;
}[] = [
  {
    value:
      "optimization",
    label:
      "Optimisation",
    description:
      "Améliorer le site existant : SEO, SEO local, GEO / IA, contenus et conversion.",
  },
  {
    value:
      "optimization_redesign",
    label:
      "Optimisation + refonte",
    description:
      "Proposer les optimisations identifiées tout en ouvrant la possibilité d’une évolution plus globale du site.",
  },
  {
    value:
      "redesign",
    label:
      "Refonte",
    description:
      "Faire évoluer la présentation, l’organisation et le parcours tout en conservant la base du site.",
  },
  {
    value:
      "new_website",
    label:
      "Nouveau site",
    description:
      "Proposer de repartir sur une nouvelle base lorsque l’existant devient trop limitant.",
  },
];

function getProposalLabel(
  type: ProposalType
): string {
  return (
    proposalOptions.find(
      (option) =>
        option.value === type
    )?.label ??
    "Optimisation"
  );
}

export default function AuditProspectionGenerator({
  prospectionId,
  recommendedProposalType =
    "optimization",
  currentProposalType =
    null,
}: AuditProspectionGeneratorProps) {
  const router =
    useRouter();

  const initialProposalType =
    currentProposalType ??
    recommendedProposalType;

  const [
    proposalType,
    setProposalType,
  ] = useState<ProposalType>(
    initialProposalType
  );

  const [
    isGenerating,
    setIsGenerating,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const recommendationLabel =
    useMemo(
      () =>
        getProposalLabel(
          recommendedProposalType
        ),
      [
        recommendedProposalType,
      ]
    );

  const selectedLabel =
    useMemo(
      () =>
        getProposalLabel(
          proposalType
        ),
      [
        proposalType,
      ]
    );

  const differsFromRecommendation =
    proposalType !==
    recommendedProposalType;

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);

    try {
      const response =
        await fetch(
          `/api/audit-prospections/${prospectionId}/generate`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                proposalType,
              }),
          }
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ??
            "Impossible de générer la prospection."
        );
      }

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue."
      );
    } finally {
      setIsGenerating(
        false
      );
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
          Recommandation de
          l’audit
        </p>

        <p className="mt-2 text-lg font-bold text-slate-900">
          {
            recommendationLabel
          }
        </p>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          Cette recommandation
          provient du diagnostic
          commercial. Elle sert de
          point de départ mais ne
          verrouille pas la
          proposition adressée au
          prospect.
        </p>
      </div>

      <div>
        <p className="text-sm font-bold text-slate-900">
          Proposition à adresser
          au prospect
        </p>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          Choisis l’angle
          commercial qui pilotera
          le mail et les éléments
          de présentation.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {proposalOptions.map(
            (option) => {
              const isSelected =
                proposalType ===
                option.value;

              const isRecommended =
                recommendedProposalType ===
                option.value;

              return (
                <button
                  key={
                    option.value
                  }
                  type="button"
                  onClick={() =>
                    setProposalType(
                      option.value
                    )
                  }
                  disabled={
                    isGenerating
                  }
                  className={`relative rounded-2xl border p-4 text-left transition ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p
                        className={`font-bold ${
                          isSelected
                            ? "text-indigo-900"
                            : "text-slate-900"
                        }`}
                      >
                        {
                          option.label
                        }
                      </p>

                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {
                          option.description
                        }
                      </p>
                    </div>

                    <span
                      className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-600"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected ? (
                        <span className="h-2 w-2 rounded-full bg-white" />
                      ) : null}
                    </span>
                  </div>

                  {isRecommended ? (
                    <span className="mt-3 inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                      Recommandé par
                      l’audit
                    </span>
                  ) : null}
                </button>
              );
            }
          )}
        </div>
      </div>

      {differsFromRecommendation ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-900">
            Angle commercial
            différent du diagnostic
          </p>

          <p className="mt-1 text-sm leading-6 text-amber-800">
            L’audit recommande{" "}
            <strong>
              {
                recommendationLabel
              }
            </strong>
            , mais la prospection
            sera générée avec
            l’angle{" "}
            <strong>
              {selectedLabel}
            </strong>
            . Office conservera les
            constats de l’audit et
            ne les modifiera pas
            pour justifier ce choix.
          </p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={
          handleGenerate
        }
        disabled={
          isGenerating
        }
        className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isGenerating
          ? "Génération en cours..."
          : `Générer — ${selectedLabel}`}
      </button>

      {error ? (
        <p className="text-sm font-medium text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}