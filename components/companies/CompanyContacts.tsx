"use client";

import {
  FormEvent,
  useState,
  useTransition,
} from "react";

import { useRouter } from "next/navigation";

import { createCompanyContact } from "@/app/companies/[id]/contactActions";
import DeleteContactButton from "@/components/companies/DeleteContactButton";
import EditContactButton from "@/components/companies/EditContactButton";

import type {
  CompanyContact,
} from "@/lib/company-contacts";

type CompanyContactsProps = {
  companyId: string;
  contacts: CompanyContact[];
};

export default function CompanyContacts({
  companyId,
  contacts,
}: CompanyContactsProps) {
  const router = useRouter();

  const [isOpen, setIsOpen] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    isPending,
    startTransition,
  ] = useTransition();

  function closeDrawer() {
    if (isPending) {
      return;
    }

    setErrorMessage("");
    setIsOpen(false);
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setErrorMessage("");

    const form =
      event.currentTarget;

    const formData =
      new FormData(form);

    startTransition(
      async () => {
        const result =
          await createCompanyContact(
            companyId,
            formData
          );

        if (!result.success) {
          setErrorMessage(
            result.message
          );
          return;
        }

        form.reset();

        setIsOpen(false);

        router.refresh();
      }
    );
  }

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-900 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
              Interlocuteurs
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Contacts
            </h2>
          </div>

          <button
            type="button"
            onClick={() =>
              setIsOpen(true)
            }
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            + Ajouter un contact
          </button>
        </div>

        {contacts.length === 0 ? (
          <div className="py-10 text-center">
            <p className="font-semibold text-slate-700">
              Aucun contact enregistré
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Ajoutez le premier interlocuteur de cette entreprise.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {contacts.map(
              (contact) => {
                const contactName =
                  `${contact.first_name} ${contact.last_name}`.trim();

                return (
                  <article
                    key={contact.id}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">
                          {contactName}
                        </h3>

                        {contact.job_title ? (
                          <p className="mt-1 text-sm text-slate-500">
                            {contact.job_title}
                          </p>
                        ) : null}
                      </div>

                      {contact.is_primary ? (
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          Contact principal
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-5 space-y-3 text-sm">
                      {contact.email ? (
                        <a
                          href={`mailto:${contact.email}`}
                          className="block font-medium text-blue-600 hover:text-blue-700"
                        >
                          {contact.email}
                        </a>
                      ) : null}

                      {contact.phone ? (
                        <a
                          href={`tel:${contact.phone}`}
                          className="block font-medium text-slate-700 hover:text-blue-600"
                        >
                          Tél. {contact.phone}
                        </a>
                      ) : null}

                      {contact.mobile ? (
                        <a
                          href={`tel:${contact.mobile}`}
                          className="block font-medium text-slate-700 hover:text-blue-600"
                        >
                          Mobile {contact.mobile}
                        </a>
                      ) : null}
                    </div>

                    <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
                      <EditContactButton
                        companyId={
                          companyId
                        }
                        contact={
                          contact
                        }
                      />

                      <DeleteContactButton
                        companyId={
                          companyId
                        }
                        contactId={
                          contact.id
                        }
                        contactName={
                          contactName
                        }
                      />
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>

      {isOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-950/50"
            onClick={
              closeDrawer
            }
          />

          <div className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-[480px] flex-col border-l border-white/10 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-8 py-6">
              <h2 className="text-xl font-semibold text-white">
                Nouveau contact
              </h2>

              <button
                type="button"
                aria-label="Fermer"
                onClick={
                  closeDrawer
                }
                disabled={
                  isPending
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-xl text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={
                handleSubmit
              }
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="flex-1 overflow-y-auto px-8 py-6">
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <Field
                      name="first_name"
                      label="Prénom *"
                      required
                    />

                    <Field
                      name="last_name"
                      label="Nom *"
                      required
                    />
                  </div>

                  <Field
                    name="job_title"
                    label="Fonction"
                    placeholder="Gérant, responsable communication..."
                  />

                  <Field
                    name="email"
                    label="E-mail"
                    type="email"
                    placeholder="contact@entreprise.fr"
                  />

                  <Field
                    name="phone"
                    label="Téléphone fixe"
                    type="tel"
                    placeholder="05 65 xx xx xx"
                  />

                  <Field
                    name="mobile"
                    label="Téléphone mobile"
                    type="tel"
                    placeholder="06 xx xx xx xx"
                  />

                  <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-800 px-4 py-4 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      name="is_primary"
                      className="h-4 w-4 rounded border-slate-500"
                    />

                    Contact principal
                  </label>

                  {errorMessage ? (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                      {errorMessage}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-white/10 px-8 py-6">
                <button
                  type="button"
                  onClick={
                    closeDrawer
                  }
                  disabled={
                    isPending
                  }
                  className="rounded-xl border border-white/10 px-5 py-3 text-white transition hover:bg-white/5 disabled:opacity-50"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={
                    isPending
                  }
                  className="min-w-32 rounded-xl bg-blue-500 px-5 py-3 font-medium text-white transition hover:bg-blue-400 disabled:opacity-50"
                >
                  {isPending
                    ? "Enregistrement…"
                    : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </>
      ) : null}
    </>
  );
}

type FieldProps = {
  name: string;
  label: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
};

function Field({
  name,
  label,
  placeholder,
  type = "text",
  required = false,
}: FieldProps) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-medium text-slate-300"
      >
        {label}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={
          placeholder
        }
        className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500"
      />
    </div>
  );
}