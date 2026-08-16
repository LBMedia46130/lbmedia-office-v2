"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

type AuditResult = {
  globalScore: number;
  positioningScore: number;
  conversionScore: number;
  seoScore: number;
  localSeoScore: number;
  geoScore: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  limitations: string[];
  priorities: string[];
};

type AuditResponse = {
  success: boolean;
  url: string;
  pagesAnalyzed: number;
  analyzedUrls: string[];
  scoringVersion: string;
  audit: AuditResult;
};

type CompanyOption = {
  id: string;
  name: string;
  website: string | null;
  relationship_status:
    | "prospect"
    | "client";
  is_active: boolean;
};

export default function AuditPage() {
  const [url, setUrl] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(
      null
    );

  const [result, setResult] =
    useState<AuditResponse | null>(
      null
    );

  const [
    showUrls,
    setShowUrls,
  ] = useState(false);

  const [
    companies,
    setCompanies,
  ] = useState<CompanyOption[]>(
    []
  );

  const [
    companiesLoading,
    setCompaniesLoading,
  ] = useState(true);

  const [
    companySearch,
    setCompanySearch,
  ] = useState("");

  const [
    selectedCompanyId,
    setSelectedCompanyId,
  ] = useState("");

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    saveError,
    setSaveError,
  ] = useState<string | null>(
    null
  );

  const [
    savedMessage,
    setSavedMessage,
  ] = useState<string | null>(
    null
  );

  const filteredCompanies =
    useMemo(() => {
      const search =
        companySearch
          .trim()
          .toLocaleLowerCase(
            "fr-FR"
          );

      if (!search) {
        return companies;
      }

      return companies.filter(
        (company) => {
          const name =
            company.name
              .toLocaleLowerCase(
                "fr-FR"
              );

          const website =
            (
              company.website ??
              ""
            ).toLocaleLowerCase(
              "fr-FR"
            );

          const relationship =
            company.relationship_status ===
            "client"
              ? "client"
              : "prospect";

          return (
            name.includes(
              search
            ) ||
            website.includes(
              search
            ) ||
            relationship.includes(
              search
            )
          );
        }
      );
    }, [
      companies,
      companySearch,
    ]);

  useEffect(() => {
    async function loadCompanies() {
      try {
        const response =
          await fetch(
            "/api/companies"
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ??
              "Impossible de charger les entreprises."
          );
        }

        const loadedCompanies =
          Array.isArray(
            data.companies
          )
            ? data.companies
            : [];

        setCompanies(
          loadedCompanies
        );
      } catch (error) {
        console.error(
          "Companies loading error:",
          error
        );
      } finally {
        setCompaniesLoading(
          false
        );
      }
    }

    loadCompanies();
  }, []);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError(null);
    setResult(null);
    setShowUrls(false);
    setSaveError(null);
    setSavedMessage(null);

    const trimmedUrl =
      url.trim();

    if (!trimmedUrl) {
      setError(
        "Veuillez renseigner l’URL du site à analyser."
      );
      return;
    }

    setLoading(true);

    try {
      const response =
        await fetch(
          "/api/audit",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                url: trimmedUrl,
              }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ??
            "Impossible d’analyser ce site."
        );
      }

      setResult(data);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveAudit() {
    if (!result) {
      return;
    }

    setSaveError(null);
    setSavedMessage(null);
    setSaving(true);

    try {
      const response =
        await fetch(
          "/api/audit/save",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                companyId:
                  selectedCompanyId ||
                  null,

                websiteUrl:
                  result.url,

                scoringVersion:
                  result.scoringVersion ??
                  "1.1",

                pagesAnalyzed:
                  result.pagesAnalyzed,

                analyzedUrls:
                  result.analyzedUrls,

                audit:
                  result.audit,
              }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ??
            data.message ??
            "Impossible d’enregistrer l’audit."
        );
      }

      const company =
        companies.find(
          (item) =>
            item.id ===
            selectedCompanyId
        );

      setSavedMessage(
        company
          ? `Audit enregistré et rattaché à ${company.name}.`
          : "Audit enregistré."
      );
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue pendant l’enregistrement."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-600">
            LBMedia Office
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Audit de site
          </h1>

          <p className="mt-2 max-w-3xl text-slate-600">
            Analysez rapidement la
            présence web d’une entreprise
            et identifiez ses principales
            opportunités d’amélioration.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="website-url"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                URL du site
              </label>

              <input
                id="website-url"
                type="url"
                value={url}
                onChange={(
                  event
                ) =>
                  setUrl(
                    event.target
                      .value
                  )
                }
                placeholder="https://www.exemple.fr"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Analyse en cours..."
                  : "Analyser le site"}
              </button>
            </div>
          </form>
        </section>

        {!result &&
          !loading && (
            <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <h2 className="text-lg font-semibold text-slate-900">
                Aucun audit lancé
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Saisissez l’adresse
                d’un site pour lancer
                une première analyse.
              </p>
            </section>
          )}

        {loading && (
          <section className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

            <p className="font-medium text-slate-700">
              Analyse du site en
              cours...
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Plusieurs pages sont
              parcourues avant la
              préparation du
              diagnostic.
            </p>
          </section>
        )}

        {result && (
          <>
            <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-900">
                    Analyse réalisée
                    sur{" "}
                    {
                      result.pagesAnalyzed
                    }{" "}
                    {result.pagesAnalyzed >
                    1
                      ? "pages"
                      : "page"}
                  </p>

                  <p className="mt-1 text-sm text-blue-700">
                    Site analysé :{" "}
                    {result.url}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowUrls(
                      (
                        current
                      ) =>
                        !current
                    )
                  }
                  className="self-start rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 md:self-auto"
                >
                  {showUrls
                    ? "Masquer les pages"
                    : "Voir les pages analysées"}
                </button>
              </div>

              {showUrls && (
                <div className="mt-4 rounded-xl border border-blue-200 bg-white p-4">
                  <ul className="space-y-2">
                    {result.analyzedUrls.map(
                      (
                        analyzedUrl
                      ) => (
                        <li
                          key={
                            analyzedUrl
                          }
                          className="break-all text-sm text-slate-600"
                        >
                          {
                            analyzedUrl
                          }
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <ScoreCard
                label="Score global"
                score={
                  result.audit
                    .globalScore
                }
                highlighted
              />

              <ScoreCard
                label="Positionnement"
                score={
                  result.audit
                    .positioningScore
                }
              />

              <ScoreCard
                label="Conversion"
                score={
                  result.audit
                    .conversionScore
                }
              />

              <ScoreCard
                label="SEO"
                score={
                  result.audit
                    .seoScore
                }
              />

              <ScoreCard
                label="SEO local"
                score={
                  result.audit
                    .localSeoScore
                }
              />

              <ScoreCard
                label="GEO / IA"
                score={
                  result.audit
                    .geoScore
                }
              />
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                Synthèse
              </h2>

              <p className="mt-4 whitespace-pre-line leading-7 text-slate-700">
                {
                  result.audit
                    .summary
                }
              </p>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <AuditList
                title="Points forts"
                items={
                  result.audit
                    .strengths
                }
              />

              <AuditList
                title="Points à améliorer"
                items={
                  result.audit
                    .weaknesses
                }
              />
            </div>

            {result.audit
              .limitations.length >
              0 && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
                <h2 className="text-xl font-bold text-slate-900">
                  Vérifications
                  complémentaires
                </h2>

                <p className="mt-2 text-sm text-slate-600">
                  Ces éléments ne
                  peuvent pas être
                  confirmés avec cette
                  première analyse et
                  nécessitent des
                  données ou outils
                  complémentaires.
                </p>

                <ul className="mt-5 space-y-3">
                  {result.audit.limitations.map(
                    (
                      limitation,
                      index
                    ) => (
                      <li
                        key={`${limitation}-${index}`}
                        className="flex gap-3 text-slate-700"
                      >
                        <span className="mt-1 text-amber-600">
                          •
                        </span>

                        <span>
                          {
                            limitation
                          }
                        </span>
                      </li>
                    )
                  )}
                </ul>
              </section>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                Priorités LBMedia
              </h2>

              <ol className="mt-5 space-y-4">
                {result.audit.priorities.map(
                  (
                    priority,
                    index
                  ) => (
                    <li
                      key={`${priority}-${index}`}
                      className="flex gap-4"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                        {index + 1}
                      </div>

                      <p className="pt-1 text-slate-700">
                        {priority}
                      </p>
                    </li>
                  )
                )}
              </ol>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-slate-900">
                    Enregistrer
                    l’audit
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    Vous pouvez
                    conserver cet
                    audit seul ou le
                    rattacher à une
                    entreprise du CRM.
                  </p>

                  <div className="mt-5 max-w-xl">
                    <label
                      htmlFor="company-search"
                      className="mb-2 block text-sm font-semibold text-slate-800"
                    >
                      Rechercher une
                      entreprise
                    </label>

                    <input
                      id="company-search"
                      type="search"
                      value={
                        companySearch
                      }
                      onChange={(
                        event
                      ) =>
                        setCompanySearch(
                          event.target
                            .value
                        )
                      }
                      disabled={
                        companiesLoading
                      }
                      placeholder="Nom de l’entreprise ou site internet..."
                      autoComplete="off"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                    />

                    <div className="mt-4">
                      <label
                        htmlFor="company"
                        className="mb-2 block text-sm font-semibold text-slate-800"
                      >
                        Entreprise
                      </label>

                      <select
                        id="company"
                        value={
                          selectedCompanyId
                        }
                        onChange={(
                          event
                        ) =>
                          setSelectedCompanyId(
                            event
                              .target
                              .value
                          )
                        }
                        disabled={
                          companiesLoading
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                      >
                        <option value="">
                          {companiesLoading
                            ? "Chargement..."
                            : "Aucune entreprise sélectionnée"}
                        </option>

                        {filteredCompanies.map(
                          (
                            company
                          ) => (
                            <option
                              key={
                                company.id
                              }
                              value={
                                company.id
                              }
                            >
                              {
                                company.name
                              }
                              {company.relationship_status ===
                              "client"
                                ? " — Client"
                                : " — Prospect"}
                            </option>
                          )
                        )}
                      </select>

                      {!companiesLoading &&
                      companySearch.trim() &&
                      filteredCompanies.length ===
                        0 ? (
                        <p className="mt-2 text-sm text-slate-500">
                          Aucune
                          entreprise ne
                          correspond à
                          cette
                          recherche.
                        </p>
                      ) : null}

                      {!companiesLoading &&
                      companySearch.trim() &&
                      filteredCompanies.length >
                        0 ? (
                        <p className="mt-2 text-xs text-slate-400">
                          {
                            filteredCompanies.length
                          }{" "}
                          {filteredCompanies.length >
                          1
                            ? "entreprises trouvées"
                            : "entreprise trouvée"}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={
                    handleSaveAudit
                  }
                  disabled={
                    saving
                  }
                  className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Enregistrement..."
                    : "Enregistrer l’audit"}
                </button>
              </div>

              {savedMessage && (
                <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                  {
                    savedMessage
                  }
                </div>
              )}

              {saveError && (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {saveError}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function ScoreCard({
  label,
  score,
  highlighted = false,
}: {
  label: string;
  score: number;
  highlighted?: boolean;
}) {
  const safeScore =
    Math.max(
      0,
      Math.min(
        100,
        score
      )
    );

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm ${
        highlighted
          ? "border-blue-200 bg-blue-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-sm font-semibold text-slate-600">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold text-slate-900">
        {safeScore}
        <span className="text-base font-medium text-slate-400">
          {" "}
          / 100
        </span>
      </p>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-blue-600 transition-all"
          style={{
            width: `${safeScore}%`,
          }}
        />
      </div>
    </div>
  );
}

function AuditList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900">
        {title}
      </h2>

      <ul className="mt-5 space-y-3">
        {items.map(
          (
            item,
            index
          ) => (
            <li
              key={`${item}-${index}`}
              className="flex gap-3 text-slate-700"
            >
              <span className="mt-1 text-blue-600">
                •
              </span>

              <span>
                {item}
              </span>
            </li>
          )
        )}
      </ul>
    </section>
  );
}