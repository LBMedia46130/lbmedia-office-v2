import Link from "next/link";
import {
  getAllZohoCreditNotes,
  type ZohoCreditNote,
} from "@/lib/zoho-books";

export const dynamic = "force-dynamic";

function money(amount?: number, currency = "EUR") {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
  }).format(Number(amount) || 0);
}

function dateLabel(value?: string) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("fr-FR").format(date);
}

function statusLabel(status?: string) {
  switch (status) {
    case "draft": return "Brouillon";
    case "open": return "Ouvert";
    case "closed": return "Clôturé";
    case "void": return "Annulé";
    default: return status || "—";
  }
}

export default async function CreditNotesPage() {
  let creditNotes: ZohoCreditNote[] = [];
  let error: string | null = null;

  try {
    creditNotes = await getAllZohoCreditNotes();
  } catch (cause) {
    console.error("Erreur de lecture des avoirs Zoho Books :", cause);
    error = "Impossible de récupérer les avoirs depuis Zoho Books. Vérifie les autorisations OAuth et la connexion Zoho.";
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1200px] px-6 py-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
          Gestion / Avoirs
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Avoirs</h1>
        <p className="mt-2 text-sm text-slate-500">
          Consultation des avoirs enregistrés dans Zoho Books. La création d'avoirs sera activée dans une prochaine étape.
        </p>

        {error ? (
          <div role="alert" className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
            {error}
          </div>
        ) : creditNotes.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-sm">
            Aucun avoir trouvé dans Zoho Books.
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Numéro</th>
                  <th className="px-5 py-4 font-semibold">Date</th>
                  <th className="px-5 py-4 font-semibold">Client</th>
                  <th className="px-5 py-4 font-semibold">Statut</th>
                  <th className="px-5 py-4 text-right font-semibold">Montant TTC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {creditNotes.map((creditNote) => (
                  <tr key={creditNote.creditnote_id} className="text-slate-700">
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      {creditNote.creditnote_number || "—"}
                    </td>
                    <td className="px-5 py-4">{dateLabel(creditNote.date)}</td>
                    <td className="px-5 py-4">{creditNote.customer_name || "—"}</td>
                    <td className="px-5 py-4">{statusLabel(creditNote.status)}</td>
                    <td className="px-5 py-4 text-right font-semibold">
                      {money(creditNote.total, creditNote.currency_code || "EUR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Link href="/management/invoices" className="mt-6 inline-block text-sm font-semibold text-blue-600 hover:text-blue-700">
          ← Retour aux factures
        </Link>
      </div>
    </main>
  );
}
