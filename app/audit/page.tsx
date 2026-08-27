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

type TechnicalPlatform =
  | "wordpress"
  | "eatbu"
  | "wix"
  | "squarespace"
  | "webflow"
  | "jimdo"
  | "shopify"
  | "prestashop"
  | "custom"
  | "unknown";

type TechnicalConfidence =
  | "high"
  | "medium"
  | "low";

type TechnicalFeasibility =
  | "good"
  | "limited"
  | "verify"
  | "migration_recommended";

type TechnicalProfile = {
  platform: TechnicalPlatform;
  platformLabel: string;
  confidence: TechnicalConfidence;
  evidence: string[];
  optimizationFeasibility: TechnicalFeasibility;
  redesignFeasibility: TechnicalFeasibility;
  newWebsiteFeasibility: TechnicalFeasibility;
  migrationLikely: boolean | null;
  note: string;
};

type AuditResponse = {
  success: boolean;
  url: string;
  pagesAnalyzed: number;
  analyzedUrls: string[];
  scoringVersion: string;
  technicalProfile?: TechnicalProfile;
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


type RecentAudit = {
  id: string;
  company_id: string | null;
  website_url: string;
  scoring_version: string;
  pages_analyzed: number;
  global_score: number;
  positioning_score: number;
  conversion_score: number;
  seo_score: number;
  local_seo_score: number;
  geo_score: number;
  created_at: string;
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


  const [
    recentAudits,
    setRecentAudits,
  ] = useState<RecentAudit[]>(
    []
  );

  const [
    auditsLoading,
    setAuditsLoading,
  ] = useState(true);

  const [
    auditsError,
    setAuditsError,
  ] = useState<string | null>(
    null
  );

  const [
    openingAuditId,
    setOpeningAuditId,
  ] = useState<string | null>(
    null
  );

  const [
    activeSavedAuditId,
    setActiveSavedAuditId,
  ] = useState<string | null>(
    null
  );

  const [
    attachAuditId,
    setAttachAuditId,
  ] = useState<string | null>(
    null
  );

  const [
    attachCompanySearch,
    setAttachCompanySearch,
  ] = useState("");

  const [
    attachCompanyId,
    setAttachCompanyId,
  ] = useState("");

  const [
    attaching,
    setAttaching,
  ] = useState(false);

  const [
    attachError,
    setAttachError,
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


  const filteredAttachCompanies =
    useMemo(() => {
      const search =
        attachCompanySearch
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

          return (
            name.includes(
              search
            ) ||
            website.includes(
              search
            )
          );
        }
      );
    }, [
      companies,
      attachCompanySearch,
    ]);

  async function loadRecentAudits() {
    setAuditsError(
      null
    );

    try {
      const response =
        await fetch(
          "/api/audit/history?limit=50",
          {
            cache:
              "no-store",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ??
            "Impossible de charger les audits enregistrés."
        );
      }

      setRecentAudits(
        Array.isArray(
          data.audits
        )
          ? data.audits
          : []
      );
    } catch (error) {
      setAuditsError(
        error instanceof Error
          ? error.message
          : "Impossible de charger les audits enregistrés."
      );
    } finally {
      setAuditsLoading(
        false
      );
    }
  }

  useEffect(() => {
    void loadRecentAudits();
  }, []);

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
    setActiveSavedAuditId(
      null
    );

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

                technicalProfile:
                  result.technicalProfile ??
                  null,

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


      await loadRecentAudits();
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

  async function handleOpenAudit(
    auditId: string
  ) {
    setOpeningAuditId(
      auditId
    );
    setError(
      null
    );
    setSaveError(
      null
    );
    setSavedMessage(
      null
    );

    try {
      const response =
        await fetch(
          `/api/audit/${auditId}`,
          {
            cache:
              "no-store",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ??
            "Impossible de charger cet audit."
        );
      }

      setResult(
        data
      );
      setActiveSavedAuditId(
        auditId
      );
      setShowUrls(
        false
      );

      window.scrollTo({
        top: 0,
        behavior:
          "smooth",
      });
    } catch (error) {
      setAuditsError(
        error instanceof Error
          ? error.message
          : "Impossible de charger cet audit."
      );
    } finally {
      setOpeningAuditId(
        null
      );
    }
  }

  function startAttachAudit(
    auditId: string
  ) {
    setAttachAuditId(
      auditId
    );
    setAttachCompanyId(
      ""
    );
    setAttachCompanySearch(
      ""
    );
    setAttachError(
      null
    );
  }

  async function handleAttachAudit() {
    if (
      !attachAuditId
    ) {
      return;
    }

    if (
      !attachCompanyId
    ) {
      setAttachError(
        "Sélectionnez une entreprise."
      );
      return;
    }

    setAttaching(
      true
    );
    setAttachError(
      null
    );

    try {
      const response =
        await fetch(
          `/api/audit/${attachAuditId}`,
          {
            method:
              "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                companyId:
                  attachCompanyId,
              }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ??
            "Impossible de rattacher cet audit."
        );
      }

      setAttachAuditId(
        null
      );
      setAttachCompanyId(
        ""
      );
      setAttachCompanySearch(
        ""
      );

      await loadRecentAudits();
    } catch (error) {
      setAttachError(
        error instanceof Error
          ? error.message
          : "Impossible de rattacher cet audit."
      );
    } finally {
      setAttaching(
        false
      );
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

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Audits enregistrés
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Les audits restent accessibles ici, même lorsqu’ils ne sont pas encore rattachés à une entreprise.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setAuditsLoading(
                  true
                );
                void loadRecentAudits();
              }}
              disabled={
                auditsLoading
              }
              className="self-start rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
            >
              {auditsLoading
                ? "Actualisation..."
                : "Actualiser"}
            </button>
          </div>

          {auditsError && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {auditsError}
            </div>
          )}

          {auditsLoading &&
          recentAudits.length ===
            0 ? (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Chargement des audits...
            </div>
          ) : null}

          {!auditsLoading &&
          recentAudits.length ===
            0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
              <p className="font-medium text-slate-700">
                Aucun audit enregistré
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Les prochains audits sauvegardés apparaîtront ici.
              </p>
            </div>
          ) : null}

          {recentAudits.length >
          0 ? (
            <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        Date
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        Site
                      </th>

                      <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                        Score
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        Rattachement
                      </th>

                      <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {recentAudits.map(
                      (audit) => {
                        const company =
                          audit.company_id
                            ? companies.find(
                                (
                                  item
                                ) =>
                                  item.id ===
                                  audit.company_id
                              )
                            : null;

                        const isAttachOpen =
                          attachAuditId ===
                          audit.id;

                        return (
                          <tr
                            key={
                              audit.id
                            }
                            className="align-top"
                          >
                            <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                              {formatAuditDate(
                                audit.created_at
                              )}
                            </td>

                            <td className="px-4 py-4">
                              <p className="max-w-md break-all text-sm font-semibold text-slate-900">
                                {
                                  audit.website_url
                                }
                              </p>

                              <p className="mt-1 text-xs text-slate-400">
                                {
                                  audit.pages_analyzed
                                }{" "}
                                {audit.pages_analyzed >
                                1
                                  ? "pages analysées"
                                  : "page analysée"}
                              </p>
                            </td>

                            <td className="px-4 py-4 text-center">
                              <span className="inline-flex min-w-14 justify-center rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">
                                {
                                  audit.global_score
                                }
                                /100
                              </span>
                            </td>

                            <td className="px-4 py-4">
                              {audit.company_id ? (
                                <div>
                                  <p className="text-sm font-semibold text-slate-800">
                                    {company
                                      ? company.name
                                      : "Entreprise rattachée"}
                                  </p>

                                  <p className="mt-1 text-xs text-slate-500">
                                    {company?.relationship_status ===
                                    "client"
                                      ? "Client"
                                      : company?.relationship_status ===
                                          "prospect"
                                        ? "Prospect"
                                        : "Rattaché"}
                                  </p>
                                </div>
                              ) : (
                                <div>
                                  <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                                    Non rattaché
                                  </span>

                                  {isAttachOpen ? (
                                    <div className="mt-3 w-72 max-w-full space-y-3">
                                      <input
                                        type="search"
                                        value={
                                          attachCompanySearch
                                        }
                                        onChange={(
                                          event
                                        ) =>
                                          setAttachCompanySearch(
                                            event
                                              .target
                                              .value
                                          )
                                        }
                                        placeholder="Rechercher une entreprise..."
                                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                      />

                                      <select
                                        value={
                                          attachCompanyId
                                        }
                                        onChange={(
                                          event
                                        ) =>
                                          setAttachCompanyId(
                                            event
                                              .target
                                              .value
                                          )
                                        }
                                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                      >
                                        <option value="">
                                          Sélectionner...
                                        </option>

                                        {filteredAttachCompanies.map(
                                          (
                                            companyOption
                                          ) => (
                                            <option
                                              key={
                                                companyOption.id
                                              }
                                              value={
                                                companyOption.id
                                              }
                                            >
                                              {
                                                companyOption.name
                                              }
                                              {companyOption.relationship_status ===
                                              "client"
                                                ? " — Client"
                                                : " — Prospect"}
                                            </option>
                                          )
                                        )}
                                      </select>

                                      {attachError && (
                                        <p className="text-xs text-red-600">
                                          {
                                            attachError
                                          }
                                        </p>
                                      )}

                                      <div className="flex gap-2">
                                        <button
                                          type="button"
                                          onClick={
                                            handleAttachAudit
                                          }
                                          disabled={
                                            attaching
                                          }
                                          className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                          {attaching
                                            ? "Rattachement..."
                                            : "Confirmer"}
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            setAttachAuditId(
                                              null
                                            );
                                            setAttachError(
                                              null
                                            );
                                          }}
                                          disabled={
                                            attaching
                                          }
                                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                                        >
                                          Annuler
                                        </button>
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              )}
                            </td>

                            <td className="px-4 py-4">
                              <div className="flex flex-col items-end gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleOpenAudit(
                                      audit.id
                                    )
                                  }
                                  disabled={
                                    openingAuditId ===
                                    audit.id
                                  }
                                  className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {openingAuditId ===
                                  audit.id
                                    ? "Ouverture..."
                                    : "Voir l’audit"}
                                </button>

                                {!audit.company_id &&
                                !isAttachOpen ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      startAttachAudit(
                                        audit.id
                                      )
                                    }
                                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                                  >
                                    Rattacher
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
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

            {result.technicalProfile ? (
              <TechnicalProfileCard
                profile={
                  result.technicalProfile
                }
              />
            ) : null}

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

                {activeSavedAuditId ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700">
                    Audit déjà enregistré
                  </div>
                ) : (
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
                )}
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

function formatAuditDate(
  value: string
) {
  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleString(
    "fr-FR",
    {
      dateStyle:
        "short",
      timeStyle:
        "short",
    }
  );
}

function TechnicalProfileCard({
  profile,
}: {
  profile: TechnicalProfile;
}) {
  const confidenceLabel =
    getConfidenceLabel(
      profile.confidence
    );

  return (
    <section className="rounded-2xl border border-violet-200 bg-violet-50 p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-600">
            Faisabilité technique
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900">
              Plateforme :{" "}
              {
                profile.platformLabel
              }
            </h2>

            <span className="rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-bold text-violet-700">
              Confiance :{" "}
              {
                confidenceLabel
              }
            </span>
          </div>
        </div>

        {profile.migrationLikely ===
        true ? (
          <span className="self-start rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800">
            Migration probablement
            nécessaire
          </span>
        ) : null}
      </div>

      <p className="mt-4 max-w-5xl text-sm leading-6 text-slate-700">
        {profile.note}
      </p>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <FeasibilityCard
          label="Optimisation"
          value={
            profile.optimizationFeasibility
          }
        />

        <FeasibilityCard
          label="Refonte"
          value={
            profile.redesignFeasibility
          }
        />

        <FeasibilityCard
          label="Nouveau site"
          value={
            profile.newWebsiteFeasibility
          }
        />
      </div>

      {profile.evidence.length >
      0 ? (
        <div className="mt-5 border-t border-violet-200 pt-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            Indices détectés
          </p>

          <ul className="mt-3 space-y-2">
            {profile.evidence.map(
              (
                evidence,
                index
              ) => (
                <li
                  key={`${evidence}-${index}`}
                  className="flex gap-2 text-sm text-slate-600"
                >
                  <span className="text-violet-500">
                    •
                  </span>

                  <span>
                    {evidence}
                  </span>
                </li>
              )
            )}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function FeasibilityCard({
  label,
  value,
}: {
  label: string;
  value: TechnicalFeasibility;
}) {
  const presentation =
    getFeasibilityPresentation(
      value
    );

  return (
    <div className="rounded-xl border border-violet-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-600">
        {label}
      </p>

      <div className="mt-3">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${presentation.className}`}
        >
          {
            presentation.label
          }
        </span>
      </div>

      <p className="mt-3 text-sm leading-5 text-slate-500">
        {
          presentation.description
        }
      </p>
    </div>
  );
}

function getConfidenceLabel(
  confidence:
    TechnicalConfidence
) {
  switch (
    confidence
  ) {
    case "high":
      return "élevée";

    case "medium":
      return "moyenne";

    case "low":
      return "faible";
  }
}

function getFeasibilityPresentation(
  feasibility:
    TechnicalFeasibility
) {
  switch (
    feasibility
  ) {
    case "good":
      return {
        label:
          "Bonne faisabilité",
        description:
          "La plateforme semble permettre ce type d’intervention dans de bonnes conditions.",
        className:
          "bg-emerald-100 text-emerald-700",
      };

    case "limited":
      return {
        label:
          "Possibilités limitées",
        description:
          "Certaines évolutions sont possibles, mais la plateforme peut imposer des limites techniques.",
        className:
          "bg-amber-100 text-amber-800",
      };

    case "migration_recommended":
      return {
        label:
          "Migration à prévoir",
        description:
          "Cette orientation implique probablement de repartir sur une plateforme plus adaptée.",
        className:
          "bg-orange-100 text-orange-800",
      };

    case "verify":
      return {
        label:
          "À vérifier",
        description:
          "Une vérification technique complémentaire est nécessaire avant de confirmer la prestation.",
        className:
          "bg-slate-100 text-slate-700",
      };
  }
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