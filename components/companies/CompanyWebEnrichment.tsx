"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type WebEnrichmentResult = {
  website: string;
  phone: string;
  email: string;
  logo_url: string;
  business_description: string;
  linkedin_url: string;
  facebook_url: string;
  confidence:
    | "high"
    | "medium"
    | "low";
};

type CompanyWebEnrichmentProps = {
  companyId: string;
  initialLogoUrl?: string | null;
  initialLinkedinUrl?: string | null;
  initialFacebookUrl?: string | null;
  initialBusinessDescription?: string | null;
};

export default function CompanyWebEnrichment({
  companyId,
  initialLogoUrl,
  initialLinkedinUrl,
  initialFacebookUrl,
  initialBusinessDescription,
}: CompanyWebEnrichmentProps) {
  const router =
    useRouter();

  const initiallyEnriched =
    Boolean(
      initialLogoUrl ||
        initialLinkedinUrl ||
        initialFacebookUrl ||
        initialBusinessDescription
    );

  const [
    enrichment,
    setEnrichment,
  ] =
    useState<WebEnrichmentResult | null>(
      null
    );

  const [
    isSearching,
    setIsSearching,
  ] = useState(false);

  const [
    isImporting,
    setIsImporting,
  ] = useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  const [
    success,
    setSuccess,
  ] =
    useState<string | null>(
      null
    );

  const [
    isEnriched,
    setIsEnriched,
  ] = useState(
    initiallyEnriched
  );

  async function searchPublicInformation() {
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

    return data.enrichment as WebEnrichmentResult;
  }

  async function importPublicInformation(
    result: WebEnrichmentResult
  ) {
    const response =
      await fetch(
        `/api/companies/${companyId}/web-enrichment/import`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(
            result
          ),
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
          "Import impossible."
      );
    }

    return data;
  }

  async function handleSearch() {
    setIsSearching(
      true
    );

    setError(null);
    setSuccess(null);
    setEnrichment(null);

    try {
      const result =
        await searchPublicInformation();

      setEnrichment(
        result
      );
    } catch (
      searchError
    ) {
      setError(
        searchError instanceof Error
          ? searchError.message
          : "Recherche impossible."
      );
    } finally {
      setIsSearching(
        false
      );
    }
  }

  async function handleImport() {
    if (!enrichment) {
      return;
    }

    setIsImporting(
      true
    );

    setError(null);
    setSuccess(null);

    try {
      const data =
        await importPublicInformation(
          enrichment
        );

      const updated =
        Array.isArray(
          data.updated
        )
          ? data.updated
          : [];

      if (
        updated.length ===
        0
      ) {
        setSuccess(
          "Aucune donnée vide à compléter."
        );
      } else {
        setSuccess(
          "Informations publiques importées."
        );
      }

      setIsEnriched(
        true
      );

      setEnrichment(
        null
      );

      router.refresh();
    } catch (
      importError
    ) {
      setError(
        importError instanceof Error
          ? importError.message
          : "Import impossible."
      );
    } finally {
      setIsImporting(
        false
      );
    }
  }

  async function handleRefresh() {
    setIsSearching(
      true
    );

    setError(null);
    setSuccess(null);
    setEnrichment(null);

    try {
      const result =
        await searchPublicInformation();

      setEnrichment(
        result
      );
    } catch (
      refreshError
    ) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Actualisation impossible."
      );
    } finally {
      setIsSearching(
        false
      );
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
            {isEnriched
              ? "Les informations publiques de cette entreprise ont déjà été enrichies."
              : "Recherche des coordonnées, du logo et de la présence publique de l’entreprise sur Internet."}
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void (
              isEnriched
                ? handleRefresh()
                : handleSearch()
            )
          }
          disabled={
            isSearching ||
            isImporting
          }
          className="rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSearching
            ? "Recherche en cours..."
            : isEnriched
              ? "Actualiser les informations publiques"
              : "Rechercher les informations publiques"}
        </button>
      </div>

      {isEnriched &&
      !enrichment ? (
        <div className="mt-4 space-y-4">
          {initialLogoUrl ? (
            <div className="w-fit rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                Logo
              </p>

              <div className="mt-3 flex min-h-20 min-w-40 items-center justify-center rounded-lg bg-white">
                <img
                  src={
                    initialLogoUrl
                  }
                  alt="Logo de l’entreprise"
                  className="max-h-20 max-w-48 object-contain"
                />
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            {initialLinkedinUrl ? (
              <SocialLink
                label="LinkedIn"
                href={
                  initialLinkedinUrl
                }
              />
            ) : null}

            {initialFacebookUrl ? (
              <SocialLink
                label="Facebook"
                href={
                  initialFacebookUrl
                }
              />
            ) : null}
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 text-sm font-medium text-red-600">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="mt-4 text-sm font-semibold text-emerald-600">
          {success}
        </p>
      ) : null}

      {enrichment ? (
        <div className="mt-5 border-t border-slate-200 pt-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-bold text-slate-900">
                Informations trouvées
              </p>

              <ConfidenceBadge
                confidence={
                  enrichment.confidence
                }
              />
            </div>

            <button
              type="button"
              onClick={() =>
                void handleImport()
              }
              disabled={
                isImporting ||
                enrichment.confidence ===
                  "low"
              }
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isImporting
                ? "Import en cours..."
                : isEnriched
                  ? "Compléter la fiche"
                  : "Importer dans la fiche"}
            </button>
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

            <LogoResultBlock
              value={
                enrichment.logo_url
              }
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

          <p className="mt-4 text-xs leading-5 text-slate-400">
            L’import complète
            uniquement les champs
            actuellement vides de
            la fiche. Les
            informations déjà
            enregistrées ne sont
            pas remplacées.
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
          className="mt-2 block break-all text-sm font-semibold text-blue-600 transition hover:text-blue-700"
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

function LogoResultBlock({
  value,
}: {
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
        Logo
      </p>

      {!value ? (
        <p className="mt-2 text-sm text-slate-400">
          Non trouvé
        </p>
      ) : (
        <>
          <div className="mt-3 flex min-h-24 items-center justify-center rounded-lg border border-slate-100 bg-white p-3">
            <img
              src={
                value
              }
              alt="Logo trouvé pour l’entreprise"
              className="max-h-20 max-w-full object-contain"
            />
          </div>

          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="mt-3 block break-all text-xs font-semibold text-blue-600 transition hover:text-blue-700"
          >
            Voir l’image
          </a>
        </>
      )}
    </div>
  );
}

function SocialLink({
  label,
  href,
}: {
  label: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
    >
      {label} ↗
    </a>
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