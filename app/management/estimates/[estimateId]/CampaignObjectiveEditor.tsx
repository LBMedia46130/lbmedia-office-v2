"use client";

import {
  FormEvent,
  useState,
} from "react";

type Props = {
  estimateId: string;
  customerId: string;
  initialObjective: string;
};

export default function CampaignObjectiveEditor({
  estimateId,
  customerId,
  initialObjective,
}: Props) {
  const [
    objective,
    setObjective,
  ] = useState(
    initialObjective
  );

  const [
    savedObjective,
    setSavedObjective,
  ] = useState(
    initialObjective
  );

  const [
    isEditing,
    setIsEditing,
  ] = useState(
    !initialObjective
  );

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const [
    success,
    setSuccess,
  ] = useState<
    string | null
  >(null);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const normalizedObjective =
      objective.trim();

    if (
      !normalizedObjective
    ) {
      setError(
        "Précise l’objectif de la campagne."
      );

      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response =
        await fetch(
          `/api/zoho/estimates/${estimateId}/campaign-context`,
          {
            method:
              "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                campaign_objective:
                  normalizedObjective,

                customer_id:
                  customerId,
              }),
          }
        );

      const result =
        (await response.json()) as {
          success?: boolean;
          error?: string;
          campaignContext?: {
            campaign_objective?: string;
          };
        };

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
            "Impossible d’enregistrer l’objectif."
        );
      }

      const saved =
        result
          .campaignContext
          ?.campaign_objective
          ?.trim() ||
        normalizedObjective;

      setObjective(
        saved
      );

      setSavedObjective(
        saved
      );

      setIsEditing(
        false
      );

      setSuccess(
        "Objectif de campagne enregistré."
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Impossible d’enregistrer l’objectif."
      );
    } finally {
      setIsSaving(
        false
      );
    }
  }

  function handleCancel() {
    setObjective(
      savedObjective
    );

    setError(null);
    setSuccess(null);

    if (
      savedObjective
    ) {
      setIsEditing(
        false
      );
    }
  }

  return (
    <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/70 to-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
            Contexte commercial
          </p>

          <h2 className="mt-2 text-lg font-semibold text-slate-900">
            Objectif de la campagne
          </h2>

          <p className="mt-1 text-sm leading-5 text-slate-500">
            Information interne
            LBMedia Office utilisée
            notamment pour
            personnaliser la
            présentation Gamma.
          </p>
        </div>

        {!isEditing &&
        savedObjective ? (
          <button
            type="button"
            onClick={() => {
              setIsEditing(
                true
              );

              setSuccess(
                null
              );

              setError(
                null
              );
            }}
            className="shrink-0 rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
          >
            Modifier l’objectif
          </button>
        ) : null}
      </div>

      {!isEditing &&
      savedObjective ? (
        <div className="mt-5 rounded-xl border border-indigo-100 bg-white px-5 py-4">
          <p className="whitespace-pre-line text-sm font-medium leading-6 text-slate-700">
            {
              savedObjective
            }
          </p>
        </div>
      ) : (
        <form
          onSubmit={
            handleSubmit
          }
          className="mt-5"
        >
          <textarea
            rows={4}
            value={
              objective
            }
            onChange={(
              event
            ) =>
              setObjective(
                event.target.value
              )
            }
            placeholder="Ex. : Promouvoir les Journées Portes Ouvertes Mercedes Hamecher Cahors et générer du trafic en concession."
            disabled={
              isSaving
            }
            className="w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
          />

          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={
                isSaving
              }
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving
                ? "Enregistrement..."
                : "Enregistrer l’objectif"}
            </button>

            {savedObjective ? (
              <button
                type="button"
                onClick={
                  handleCancel
                }
                disabled={
                  isSaving
                }
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Annuler
              </button>
            ) : null}
          </div>
        </form>
      )}

      {error ? (
        <p className="mt-3 text-sm font-semibold text-red-600">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="mt-3 text-sm font-semibold text-emerald-600">
          {success}
        </p>
      ) : null}

      <p className="mt-4 text-xs leading-5 text-slate-400">
        Cette modification ne
        modifie pas le devis dans
        Zoho Books et reste
        disponible quel que soit
        son statut.
      </p>
    </div>
  );
}