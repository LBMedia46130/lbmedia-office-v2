"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type AuditStatus = "to_process" | "sent" | "followed_up" | "completed";

type Audit = {
  id: string;
  company_id: string | null;
  status: AuditStatus;
  website_url: string;
  pages_analyzed: number;
  global_score: number;
  created_at: string;
};

type Company = {
  id: string;
  name: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const statusLabels: Record<AuditStatus, string> = {
  to_process: "À traiter",
  sent: "Envoyé",
  followed_up: "Relancé",
  completed: "Terminé",
};

export default function AuditHistoryPage() {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAudits(
    targetPage = page,
    targetSearch = search,
    targetStatus = status
  ) {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: "25",
      });

      if (targetSearch) {
        params.set("search", targetSearch);
      }

      if (targetStatus) {
        params.set("status", targetStatus);
      }

      const response = await fetch(
        `/api/audit/history?${params.toString()}`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ?? "Impossible de charger l’historique."
        );
      }

      setAudits(Array.isArray(data.audits) ? data.audits : []);
      setCompanies(Array.isArray(data.companies) ? data.companies : []);

      setPagination(
        data.pagination ?? {
          page: targetPage,
          limit: 25,
          total: 0,
          totalPages: 1,
        }
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Impossible de charger l’historique."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAudits(page, search, status);
  }, [page, search, status]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function companyName(companyId: string | null) {
    if (!companyId) {
      return "Non rattaché";
    }

    return (
      companies.find((company) => company.id === companyId)?.name ??
      "Entreprise"
    );
  }

  async function updateStatus(
    auditId: string,
    nextStatus: AuditStatus
  ) {
    setError(null);

    try {
      const response = await fetch(`/api/audit/${auditId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: nextStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ?? "Impossible de modifier le statut."
        );
      }

      setAudits((current) =>
        current.map((audit) =>
          audit.id === auditId
            ? {
                ...audit,
                status: nextStatus,
              }
            : audit
        )
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Impossible de modifier le statut."
      );
    }
  }

  async function deleteAudit(audit: Audit) {
    if (
      !window.confirm(
        `Supprimer définitivement l’audit de ${audit.website_url} ?`
      )
    ) {
      return;
    }

    setError(null);

    try {
      const response = await fetch(`/api/audit/${audit.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ?? "Impossible de supprimer l’audit."
        );
      }

      if (audits.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await loadAudits(page, search, status);
      }
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Impossible de supprimer l’audit."
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
              LBMedia Office
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              Historique des audits
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              Retrouver, filtrer et consulter tous les audits enregistrés.
            </p>
          </div>

          <Link
            href="/audit"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            ← Retour à l’audit
          </Link>
        </div>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <form
              onSubmit={handleSearch}
              className="flex flex-1 gap-2"
            >
              <div className="flex-1">
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Entreprise ou site
                </label>

                <input
                  value={searchInput}
                  onChange={(event) =>
                    setSearchInput(event.target.value)
                  }
                  placeholder="Rechercher une entreprise ou une URL..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <button
                type="submit"
                className="self-end rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Rechercher
              </button>
            </form>

            <div className="w-full lg:w-56">
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Statut
              </label>

              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Tous les statuts</option>
                <option value="to_process">À traiter</option>
                <option value="sent">Envoyé</option>
                <option value="followed_up">Relancé</option>
                <option value="completed">Terminé</option>
              </select>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <p className="text-sm text-slate-500">
              {pagination.total} audit
              {pagination.total > 1 ? "s" : ""} enregistré
              {pagination.total > 1 ? "s" : ""}
            </p>

            {search || status ? (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                  setStatus("");
                  setPage(1);
                }}
                className="text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                Réinitialiser les filtres
              </button>
            ) : null}
          </div>

          {error ? (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              Chargement des audits...
            </div>
          ) : null}

          {!loading && audits.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
              <p className="font-medium text-slate-700">
                Aucun audit trouvé
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Modifiez la recherche ou les filtres.
              </p>
            </div>
          ) : null}

          {!loading && audits.length > 0 ? (
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
                        Entreprise
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        Statut
                      </th>

                      <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {audits.map((audit) => (
                      <tr key={audit.id} className="align-top">
                        <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                          {new Intl.DateTimeFormat("fr-FR", {
                            dateStyle: "short",
                            timeStyle: "short",
                            timeZone: "Europe/Paris",
                          }).format(new Date(audit.created_at))}
                        </td>

                        <td className="px-4 py-4">
                          <p className="max-w-md break-all text-sm font-semibold text-slate-900">
                            {audit.website_url}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {audit.pages_analyzed} page
                            {audit.pages_analyzed > 1 ? "s" : ""} analysée
                            {audit.pages_analyzed > 1 ? "s" : ""}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                            {audit.global_score}/100
                          </span>
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-700">
                          {companyName(audit.company_id)}
                        </td>

                        <td className="px-4 py-4">
                          <select
                            value={audit.status}
                            onChange={(event) =>
                              void updateStatus(
                                audit.id,
                                event.target.value as AuditStatus
                              )
                            }
                            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700"
                          >
                            {(
                              Object.keys(
                                statusLabels
                              ) as AuditStatus[]
                            ).map((value) => (
                              <option key={value} value={value}>
                                {statusLabels[value]}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            {audit.company_id ? (
                              <Link
                                href={`/companies/${audit.company_id}/audits/${audit.id}`}
                                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                              >
                                Voir l’audit
                              </Link>
                            ) : (
                              <span
                                title="Cet audit n’est rattaché à aucune entreprise"
                                className="cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-400"
                              >
                                Voir l’audit
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => void deleteAudit(audit)}
                              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                            >
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {pagination.totalPages > 1 ? (
            <div className="mt-6 flex items-center justify-between gap-4">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() =>
                  setPage((current) => Math.max(1, current - 1))
                }
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Précédent
              </button>

              <p className="text-sm font-medium text-slate-600">
                Page {pagination.page} sur {pagination.totalPages}
              </p>

              <button
                type="button"
                disabled={
                  page >= pagination.totalPages || loading
                }
                onClick={() =>
                  setPage((current) => current + 1)
                }
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Suivant →
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}