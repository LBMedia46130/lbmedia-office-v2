"use client";

import {
  FormEvent,
  useState,
  useTransition,
} from "react";

import { createCompany } from "@/app/companies/companyActions";

export default function NewCompanyButton() {
  const [open, setOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function closeDrawer() {
    if (isPending) {
      return;
    }

    setErrorMessage("");
    setOpen(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await createCompany(formData);

      if (!result.success) {
        setErrorMessage(result.message);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        className="cursor-pointer rounded-xl bg-blue-500 px-5 py-3 font-medium text-white transition hover:bg-blue-400"
        onClick={() => setOpen(true)}
      >
        + Nouvelle entreprise
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 cursor-pointer bg-black/50"
            onClick={closeDrawer}
          />

          <div className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-[480px] flex-col border-l border-white/10 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-8 py-6">
              <h2 className="text-xl font-semibold text-white">
                Nouvelle entreprise
              </h2>

              <button
                type="button"
                aria-label="Fermer"
                onClick={closeDrawer}
                disabled={isPending}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/5 text-xl text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <form
              id="new-company-form"
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="flex-1 overflow-y-auto px-8 py-6">
                <div className="space-y-5">
                  <Field
                    name="name"
                    label="Nom *"
                    placeholder="LBMedia"
                    required
                  />

                  <Field
                    name="legal_name"
                    label="Nom juridique"
                    placeholder="LBMedia EURL"
                  />

                  <Field
                    name="email"
                    label="Email"
                    placeholder="contact@entreprise.fr"
                    type="email"
                  />

                  <Field
                    name="phone"
                    label="Téléphone"
                    placeholder="05 65 xx xx xx"
                    type="tel"
                  />

                  <Field
                    name="website"
                    label="Site internet"
                    placeholder="https://..."
                    type="url"
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <Field
                      name="postal_code"
                      label="Code postal"
                      placeholder="46000"
                    />

                    <Field
                      name="city"
                      label="Ville"
                      placeholder="Cahors"
                    />
                  </div>

                  {errorMessage && (
                    <div
                      role="alert"
                      className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                    >
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
                  className="cursor-pointer rounded-xl border border-white/10 px-5 py-3 text-white transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={isPending}
                  className="min-w-32 cursor-pointer rounded-xl bg-blue-500 px-5 py-3 font-medium text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? "Enregistrement…" : "Enregistrer"}
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
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500"
      />
    </div>
  );
}