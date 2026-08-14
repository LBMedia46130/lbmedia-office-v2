"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type LegalCompanyResult = {
  siren: string;
  siret: string;
  vat_number: string;

  legal_name: string;
  legal_form: string;

  address: string;
  postal_code: string;
  city: string;

  ape_code: string;
  ape_label: string;

  creation_date: string;
  employee_range: string;
};

type CompanyLegalSearchProps = {
  companyId: string;

  initialName: string;

  initialSiren?: string | null;
  initialSiret?: string | null;

  initialPostalCode?:
    | string
    | null;
};

export default function CompanyLegalSearch({
  companyId,
  initialName,
  initialSiren,
  initialSiret,
  initialPostalCode,
}: CompanyLegalSearchProps) {
  const router =
    useRouter();

  const initialQuery =
    initialSiret ||
    initialSiren ||
    initialName;

  const [
    query,
    setQuery,
  ] = useState(
    initialQuery
  );

  const [
    results,
    setResults,
  ] = useState<
    LegalCompanyResult[]
  >([]);

  const [
    isSearching,
    setIsSearching,
  ] = useState(false);

  const [
    importingSiren,
    setImportingSiren,
  ] = useState<
    string | null
  >(null);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const [
    hasSearched,
    setHasSearched,
  ] = useState(false);

  async function handleSearch() {
    const cleanedQuery =
      query.trim();

    if (!cleanedQuery) {
      setError(
        "Indiquez un nom, un SIREN ou un SIRET."
      );

      return;
    }

    setIsSearching(true);
    setError(null);
    setResults([]);
    setHasSearched(false);

    try {
      const params =
        new URLSearchParams({
          q: cleanedQuery,
        });

      if (
        initialPostalCode
      ) {
        params.set(
          "postal_code",
          initialPostalCode
        );
      }

      const response =
        await fetch(
          `/api/companies/legal-search?${params.toString()}`
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

      setResults(
        Array.isArray(
          data.results
        )
          ? data.results
          : []
      );

      setHasSearched(true);
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

  async function handleImport(
    company: LegalCompanyResult
  ) {
    setImportingSiren(
      company.siren
    );

    setError(null);

    try {
      const response =
        await fetch(
          `/api/companies/${companyId}/legal-data`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              company
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

      setResults([]);
      setHasSearched(false);

      router.refresh();
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : "Import impossible."
      );
    } finally {
      setImportingSiren(
        null
      );
    }
  }

  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
          Enrichissement
        </p>

        <h3 className="mt-1 font-bold text-slate-900">
          Données légales officielles
        </h3>

        <p className="mt-1 text-sm leading-6 text-slate-600">
          Recherche dans
          l’Annuaire des
          Entreprises à partir
          du nom, du SIREN ou
          du SIRET.
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={query}
          onChange={(event) =>
            setQuery(
              event.target.value
            )
          }
          onKeyDown={(event) => {
            if (
              event.key ===
              "Enter"
            ) {
              void handleSearch();
            }
          }}
          placeholder="Nom, SIREN ou SIRET"
          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />

        <button
          type="button"
          onClick={() =>
            void handleSearch()
          }
          disabled={
            isSearching
          }
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSearching
            ? "Recherche..."
            : "Rechercher"}
        </button>
      </div>

      {error ? (
        <p className="mt-3 text-sm font-medium text-red-600">
          {error}
        </p>
      ) : null}

      {hasSearched &&
      results.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          Aucun résultat
          trouvé.
        </p>
      ) : null}

      {results.length >
      0 ? (
        <div className="mt-5 space-y-3">
          {results.map(
            (
              result,
              index
            ) => {
              const key =
                result.siret ||
                result.siren ||
                String(index);

              return (
                <div
                  key={key}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                    <div>
                      <p className="font-bold text-slate-900">
                        {result.legal_name ||
                          "Entreprise sans dénomination"}
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        {[
                          result.address,
                          [
                            result.postal_code,
                            result.city,
                          ]
                            .filter(
                              Boolean
                            )
                            .join(
                              " "
                            ),
                        ]
                          .filter(
                            Boolean
                          )
                          .join(
                            " — "
                          )}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                        {result.siren ? (
                          <span>
                            SIREN{" "}
                            {
                              result.siren
                            }
                          </span>
                        ) : null}

                        {result.siret ? (
                          <span>
                            SIRET{" "}
                            {
                              result.siret
                            }
                          </span>
                        ) : null}

                        {result.ape_code ? (
                          <span>
                            APE{" "}
                            {
                              result.ape_code
                            }
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        void handleImport(
                          result
                        )
                      }
                      disabled={
                        importingSiren !==
                        null
                      }
                      className="shrink-0 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {importingSiren ===
                      result.siren
                        ? "Import..."
                        : "Importer"}
                    </button>
                  </div>
                </div>
              );
            }
          )}
        </div>
      ) : null}
    </div>
  );
}