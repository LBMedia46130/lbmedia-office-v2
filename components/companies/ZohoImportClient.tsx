"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type ZohoImportContact = {
  contactId: string;

  contactName: string;

  companyName:
    | string
    | null;

  customerNumber:
    | string
    | null;

  email:
    | string
    | null;

  phone:
    | string
    | null;
};

type ZohoImportClientProps = {
  contacts:
    ZohoImportContact[];
};

type RestoreResult = {
  success?: boolean;

  message?: string;

  companyId?: string;
};

export default function ZohoImportClient({
  contacts,
}: ZohoImportClientProps) {
  const router =
    useRouter();

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    restoringId,
    setRestoringId,
  ] =
    useState<
      string | null
    >(null);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const normalizedSearch =
    search
      .trim()
      .toLowerCase();

  const filteredContacts =
    useMemo(
      () => {
        if (
          !normalizedSearch
        ) {
          return contacts;
        }

        return contacts.filter(
          (contact) => {
            const haystack =
              [
                contact.contactName,
                contact.companyName,
                contact.customerNumber,
                contact.email,
                contact.phone,
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return haystack.includes(
              normalizedSearch
            );
          }
        );
      },
      [
        contacts,
        normalizedSearch,
      ]
    );

  async function restoreContact(
    contactId: string
  ) {
    if (
      restoringId
    ) {
      return;
    }

    setRestoringId(
      contactId
    );

    setError(
      null
    );

    try {
      const response =
        await fetch(
          "/api/companies/import-zoho",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                contactId,
              }),
          }
        );

      const result =
        (await response.json()) as RestoreResult;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ??
            "Impossible de restaurer ce client."
        );
      }

      if (
        result.companyId
      ) {
        router.push(
          `/companies/${result.companyId}`
        );

        router.refresh();

        return;
      }

      router.push(
        "/companies"
      );

      router.refresh();
    } catch (
      restoreError
    ) {
      setError(
        restoreError instanceof Error
          ? restoreError.message
          : "Une erreur est survenue pendant la restauration."
      );
    } finally {
      setRestoringId(
        null
      );
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
            Recherche
          </p>

          <h2 className="mt-2 text-xl font-bold text-slate-900">
            Choisir le client à restaurer
          </h2>
        </div>

        <p className="text-sm font-semibold text-slate-500">
          {
            filteredContacts.length
          }{" "}
          résultat
          {filteredContacts.length >
          1
            ? "s"
            : ""}
        </p>
      </div>

      <div className="mt-5">
        <input
          type="search"
          value={
            search
          }
          onChange={(
            event
          ) =>
            setSearch(
              event.target.value
            )
          }
          placeholder="Nom, société, numéro client, email…"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-700">
            {error}
          </p>
        </div>
      ) : null}

      {filteredContacts.length ===
      0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="font-semibold text-slate-700">
            Aucun client trouvé
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Modifie la recherche ou
            vérifie que le client
            n’existe pas déjà dans
            Office.
          </p>
        </div>
      ) : (
        <div className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200">
          {filteredContacts.map(
            (contact) => {
              const displayName =
                contact.companyName?.trim() ||
                contact.contactName;

              const secondaryName =
                contact.companyName &&
                contact.companyName !==
                  contact.contactName
                  ? contact.contactName
                  : null;

              const isRestoring =
                restoringId ===
                contact.contactId;

              return (
                <div
                  key={
                    contact.contactId
                  }
                  className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900">
                      {displayName}
                    </p>

                    {secondaryName ? (
                      <p className="mt-1 text-sm text-slate-500">
                        {
                          secondaryName
                        }
                      </p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                      {contact.customerNumber ? (
                        <span>
                          N° client :{" "}
                          <strong className="text-slate-700">
                            {
                              contact.customerNumber
                            }
                          </strong>
                        </span>
                      ) : null}

                      {contact.email ? (
                        <span>
                          {
                            contact.email
                          }
                        </span>
                      ) : null}

                      {contact.phone ? (
                        <span>
                          {
                            contact.phone
                          }
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-2 font-mono text-[10px] text-slate-400">
                      Zoho :{" "}
                      {
                        contact.contactId
                      }
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      restoreContact(
                        contact.contactId
                      )
                    }
                    disabled={
                      Boolean(
                        restoringId
                      )
                    }
                    className="inline-flex shrink-0 items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isRestoring
                      ? "Restauration…"
                      : "Restaurer dans Office"}
                  </button>
                </div>
              );
            }
          )}
        </div>
      )}
    </section>
  );
}