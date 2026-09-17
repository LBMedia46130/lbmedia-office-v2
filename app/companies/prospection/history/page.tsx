"use client";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
type ProspectionStatus = "draft" | "ready" | "sent" | "follow_up" | "replied";
type Prospection = {
  id: string;
  company_id: string;
  status: ProspectionStatus;
  recipient_email: string | null;
  subject: string | null;
  sent_subject: string | null;
  sales_angle: string | null;
  sent_at: string | null;
  follow_up_at: string | null;
  replied_at: string | null;
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
const statusLabels: Record<ProspectionStatus, string> = {
  draft: "À préparer",
  ready: "Prête",
  sent: "Envoyée",
  follow_up: "Suivi / relance",
  replied: "Réponse reçue",
};
export default function ProspectionHistoryPage() {
  const [prospections, setProspections] = useState<Prospection[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  async function loadProspections(targetPage = page, targetSearch = search, targetStatus = status) {
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
      const response = await fetch(`/api/companies/prospection/history?${params.toString()}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message ?? "Impossible de charger l’historique.");
      }
      setProspections(Array.isArray(data.prospections) ? data.prospections : []);
      setCompanies(Array.isArray(data.companies) ? data.companies : []);
      setPagination(data.pagination ?? { page: targetPage, limit: 25, total: 0, totalPages: 1 });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Impossible de charger l’historique.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void loadProspections(page, search, status);
  }, [page, search, status]);
  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }
  function companyName(companyId: string) {
    return companies.find((company) => company.id === companyId)?.name ?? "Entreprise";
  }
  function formatDate(value: string | null) {
    if (!value) {
      return "—";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeZone: "Europe/Paris" }).format(date);
  }
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">LBMedia Office</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Historique des prospections</h1>
            <p className="mt-2 text-sm text-slate-600">Retrouver, filtrer et consulter toutes les prospections enregistrées.</p>
          </div>
          <Link href="/companies/prospection" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">← Retour à la prospection</Link>
        </div>
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <form onSubmit={handleSearch} className="flex flex-1 gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-semibold text-slate-700">Entreprise, destinataire ou proposition</label>
                <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Rechercher une entreprise, un email ou un objet..." className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>
              <button type="submit" className="self-end rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">Rechercher</button>
            </form>
            <div className="w-full lg:w-56">
              <label className="mb-1 block text-sm font-semibold text-slate-700">Statut</label>
              <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="">Tous les statuts</option>
                <option value="draft">À préparer</option>
                <option value="ready">Prête</option>
                <option value="sent">Envoyée</option>
                <option value="follow_up">Suivi / relance</option>
                <option value="replied">Réponse reçue</option>
              </select>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <p className="text-sm text-slate-500">{pagination.total} prospection{pagination.total > 1 ? "s" : ""} enregistrée{pagination.total > 1 ? "s" : ""}</p>
            {(search || status) ? <button type="button" onClick={() => { setSearchInput(""); setSearch(""); setStatus(""); setPage(1); }} className="text-sm font-semibold text-blue-600 hover:text-blue-700">Réinitialiser les filtres</button> : null}
          </div>
          {error ? <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
          {loading ? <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">Chargement des prospections...</div> : null}
          {!loading && prospections.length === 0 ? <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center"><p className="font-medium text-slate-700">Aucune prospection trouvée</p><p className="mt-1 text-sm text-slate-500">Modifiez la recherche ou les filtres.</p></div> : null}
          {!loading && prospections.length > 0 ? (
            <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Entreprise</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Proposition</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Envoi</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Relance</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Statut</th>
                      <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {prospections.map((prospection) => (
                      <tr key={prospection.id} className="align-top">
                        <td className="px-4 py-4"><p className="text-sm font-semibold text-slate-900">{companyName(prospection.company_id)}</p>{prospection.recipient_email ? <p className="mt-1 text-xs text-slate-400">{prospection.recipient_email}</p> : null}</td>
                        <td className="px-4 py-4"><p className="max-w-md text-sm font-semibold text-slate-700">{prospection.sent_subject || prospection.subject || "À rédiger"}</p>{prospection.sales_angle ? <p className="mt-1 max-w-md text-xs text-slate-400">{prospection.sales_angle}</p> : null}</td>
                        <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">{formatDate(prospection.sent_at)}</td>
                        <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">{formatDate(prospection.follow_up_at)}</td>
                        <td className="px-4 py-4"><span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{statusLabels[prospection.status]}</span></td>
                        <td className="px-4 py-4 text-right"><Link href={`/companies/${prospection.company_id}`} className="inline-flex rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100">Ouvrir</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
          {pagination.totalPages > 1 ? (
            <div className="mt-6 flex items-center justify-between gap-4">
              <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">← Précédent</button>
              <p className="text-sm font-medium text-slate-600">Page {pagination.page} sur {pagination.totalPages}</p>
              <button type="button" disabled={page >= pagination.totalPages || loading} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Suivant →</button>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
