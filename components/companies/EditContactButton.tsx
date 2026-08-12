"use client";

import {
  FormEvent,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

import { updateCompanyContact } from "@/app/companies/[id]/contactActions";
import type { CompanyContact } from "@/lib/company-contacts";

type EditContactButtonProps = {
  companyId: string;
  contact: CompanyContact;
};

export default function EditContactButton({
  companyId,
  contact,
}: EditContactButtonProps) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [errorMessage, setErrorMessage] =
    useState("");
  const [isPending, startTransition] =
    useTransition();

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

    const formData = new FormData(
      event.currentTarget
    );

    startTransition(async () => {
      const result = await updateCompanyContact(
        companyId,
        contact.id,
        formData
      );

      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }

      setIsOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-50"
      >
        Modifier
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-950/50"
            onClick={closeDrawer}
          />

          <div className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-[480px] flex-col border-l border-white/10 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-8 py-6">
              <h2 className="text-xl font-semibold text-white">
                Modifier le contact
              </h2>

              <button
                type="button"
                aria-label="Fermer"
                onClick={closeDrawer}
                disabled={isPending}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-xl text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="flex-1 overflow-y-auto px-8 py-6">
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <Field
                      name="first_name"
                      label="Prénom *"
                      defaultValue={contact.first_name}
                      required
                    />

                    <Field
                      name="last_name"
                      label="Nom *"
                      defaultValue={contact.last_name}
                      required
                    />
                  </div>

                  <Field
                    name="job_title"
                    label="Fonction"
                    defaultValue={
                      contact.job_title ?? ""
                    }
                  />

                  <Field
                    name="email"
                    label="E-mail"
                    type="email"
                    defaultValue={
                      contact.email ?? ""
                    }
                  />

                  <Field
                    name="phone"
                    label="Téléphone fixe"
                    type="tel"
                    defaultValue={
                      contact.phone ?? ""
                    }
                  />

                  <Field
                    name="mobile"
                    label="Téléphone mobile"
                    type="tel"
                    defaultValue={
                      contact.mobile ?? ""
                    }
                  />

                  <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-800 px-4 py-4 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      name="is_primary"
                      defaultChecked={
                        contact.is_primary
                      }
                      className="h-4 w-4 rounded border-slate-500"
                    />

                    Contact principal
                  </label>

                  {errorMessage && (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                      {errorMessage}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-white/10 px-8 py-6">
                <button
                  type="button"
                  onClick={closeDrawer}
                  disabled={isPending}
                  className="rounded-xl border border-white/10 px-5 py-3 text-white transition hover:bg-white/5 disabled:opacity-50"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={isPending}
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
      )}
    </>
  );
}

type FieldProps = {
  name: string;
  label: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
};

function Field({
  name,
  label,
  defaultValue,
  type = "text",
  required = false,
}: FieldProps) {
  return (
    <div>
      <label
        htmlFor={`edit-${name}`}
        className="mb-2 block text-sm font-medium text-slate-300"
      >
        {label}
      </label>

      <input
        id={`edit-${name}`}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500"
      />
    </div>
  );
}