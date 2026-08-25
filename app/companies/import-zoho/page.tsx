import Link from "next/link";

import PageBanner from "@/components/dashboard/PageBanner";
import ZohoImportClient from "@/components/companies/ZohoImportClient";

import {
  getCompanies,
} from "@/lib/companies";

import {
  getZohoContacts,
  type ZohoContact,
} from "@/lib/zoho-books";

export const dynamic =
  "force-dynamic";

async function getAllZohoContacts() {
  const contacts:
    ZohoContact[] = [];

  let page = 1;
  const perPage = 200;
  let hasMorePage = true;

  while (hasMorePage) {
    const result =
      await getZohoContacts(
        page,
        perPage
      );

    contacts.push(
      ...result.contacts
    );

    hasMorePage =
      result.pageContext
        ?.has_more_page ??
      false;

    page += 1;

    if (page > 100) {
      throw new Error(
        "Arrêt de sécurité pendant la récupération des contacts Zoho."
      );
    }
  }

  return contacts;
}

export default async function ImportZohoPage() {
  let contacts:
    ZohoContact[] = [];

  let activeZohoIds =
    new Set<string>();

  let errorMessage:
    string | null = null;

  try {
    const [
      zohoContacts,
      companies,
    ] =
      await Promise.all([
        getAllZohoContacts(),
        getCompanies(),
      ]);

    contacts =
      zohoContacts;

    activeZohoIds =
      new Set(
        companies
          .filter(
            (company) =>
              company.is_active
          )
          .map(
            (company) =>
              company.zoho_contact_id
          )
          .filter(
            (
              value
            ): value is string =>
              Boolean(
                value?.trim()
              )
          )
      );
  } catch (error) {
    console.error(
      error
    );

    errorMessage =
      error instanceof Error
        ? error.message
        : "Impossible de charger les clients Zoho.";
  }

  const availableContacts =
    contacts
      .filter(
        (contact) =>
          !activeZohoIds.has(
            contact.contact_id
          )
      )
      .filter(
        (contact) =>
          !contact.status ||
          contact.status ===
            "active"
      )
      .sort(
        (
          a,
          b
        ) =>
          (
            a.company_name ||
            a.contact_name
          ).localeCompare(
            b.company_name ||
              b.contact_name,
            "fr",
            {
              sensitivity:
                "base",
            }
          )
      );

  const alreadyInOffice =
    contacts.filter(
      (contact) =>
        activeZohoIds.has(
          contact.contact_id
        )
    ).length;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <PageBanner
          eyebrow="CRM · Zoho Books"
          title="Importer un client depuis Zoho"
          description="Récupérer dans LBMedia Office un client déjà présent dans Zoho Books."
        />

        <div className="mt-6">
          <Link
            href="/companies"
            className="text-sm font-semibold text-slate-500 transition hover:text-slate-950"
          >
            ← Retour aux entreprises
          </Link>
        </div>

        <section className="mt-8 rounded-2xl border border-emerald-200 bg-gradient-to-br from-white to-emerald-50 p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">
            Restauration sécurisée
          </p>

          <h2 className="mt-2 text-xl font-bold text-slate-900">
            Clients Zoho absents d’Office
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Les clients déjà liés à
            une fiche Office active
            sont masqués. Une ancienne
            fiche Office inactive peut
            en revanche être restaurée
            à partir de Zoho Books.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Stat
              label="Clients Zoho"
              value={
                contacts.length
              }
            />

            <Stat
              label="Déjà dans Office"
              value={
                alreadyInOffice
              }
            />

            <Stat
              label="Importables"
              value={
                availableContacts.length
              }
            />
          </div>
        </section>

        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="font-semibold text-red-800">
              Impossible de charger
              Zoho Books
            </p>

            <p className="mt-2 text-sm text-red-700">
              {errorMessage}
            </p>
          </div>
        ) : (
          <ZohoImportClient
            contacts={
              availableContacts.map(
                (contact) => ({
                  contactId:
                    contact.contact_id,

                  contactName:
                    contact.contact_name,

                  companyName:
                    contact.company_name ??
                    null,

                  customerNumber:
                    contact.contact_number ??
                    null,

                  email:
                    contact.email ??
                    null,

                  phone:
                    contact.phone ??
                    contact.mobile ??
                    null,
                })
              )
            }
          />
        )}
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-emerald-100 bg-white px-4 py-4">
      <p className="text-xs font-semibold text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold text-emerald-700">
        {value}
      </p>
    </div>
  );
}