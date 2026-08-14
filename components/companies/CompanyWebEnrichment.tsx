"use client";

import { useState } from "react";

type WebEnrichmentResult = {
  website: string;
  phone: string;
  email: string;
  business_description: string;
  linkedin_url: string;
  facebook_url: string;
  confidence: "high" | "medium" | "low";
};

type CompanyWebEnrichmentProps = {
  companyId: string;
};

export default function CompanyWebEnrichment({
  companyId,
}: CompanyWebEnrichmentProps) {
  const [
    enrichment,
    setEnrichment,
  ] = useState<WebEnrichmentResult | null>(
    null
  );

  const [
    isSearching,
    setIsSearching,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );

  async function handleSearch() {
    setIsSearching(true);
    setError(null);
    setEnrichment(null);

    try {
      const response =
        await fetch(
          `/api/companies/${companyId}/web-enrichment`,
          {
            method: "POST",
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Recherche impossible."
        );
      }

      setEnrichment(
        data.enrichment
      );
    } catch (searchError) {
      setError(
        searchError instanceof Error
          ? searchError.message
          : "Recherche impossible."
      );
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
            Présence web
          </p>

          <p className="mt-1 text-sm text-slate-600">
            Recherche des
            coordonnées et de la
            présence publique de
            l’entreprise sur
            Internet.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void handleSearch()
          }
          disabled={
            isSearching
          }
          className="rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSearching
            ? "Recherche en cours..."
            : "Rechercher les informations publiques"}
        </button>
      </div>

      {error ? (
        <p className="mt-4 text-sm font-medium text-red-600">
          {error}
        </p>
      ) : null}

      {enrichment ? (
        <div className="mt-5 border-t border-slate-200 pt-5">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <p className="text-sm font-bold text-slate-900">
              Informations
              trouvées
            </p>

            <ConfidenceBadge
              confidence={
                enrichment.confidence
              }
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ResultBlock
              label="Site internet"
              value={
                enrichment.website
              }
              link
            />

            <ResultBlock
              label="Téléphone"
              value={
                enrichment.phone
              }
            />

            <ResultBlock
              label="E-mail"
              value={
                enrichment.email
              }
            />

            <ResultBlock
              label="LinkedIn"
              value={
                enrichment.linkedin_url
              }
              link
            />

            <ResultBlock
              label="Facebook"
              value={
                enrichment.facebook_url
              }
              link
            />
          </div>

          {enrichment.business_description ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                Activité
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-700">
                {
                  enrichment.business_description
                }
              </p>
            </div>
          ) : null}

          <p className="mt-4 text-xs text-slate-400">
            Ces informations
            sont proposées avant
            import. Aucune donnée
            de la fiche n’a été
            modifiée.
          </p>
        </div>
      ) : null}
    </div>
  );
}

type ResultBlockProps = {
  label: string;
  value: string;
  link?: boolean;
};

function ResultBlock({
  label,
  value,
  link = false,
}: ResultBlockProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>

      {!value ? (
        <p className="mt-2 text-sm text-slate-400">
          Non trouvé
        </p>
      ) : link ? (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="mt-2 block break-all text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          {value}
        </a>
      ) : (
        <p className="mt-2 break-words text-sm font-semibold text-slate-800">
          {value}
        </p>
      )}
    </div>
  );
}

function ConfidenceBadge({
  confidence,
}: {
  confidence:
    | "high"
    | "medium"
    | "low";
}) {
  const label =
    confidence === "high"
      ? "Fiabilité élevée"
      : confidence === "medium"
        ? "À vérifier"
        : "Fiabilité faible";

  const classes =
    confidence === "high"
      ? "bg-emerald-50 text-emerald-700"
      : confidence === "medium"
        ? "bg-amber-50 text-amber-700"
        : "bg-red-50 text-red-700";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${classes}`}
    >
      {label}
    </span>
  );
}