"use client";

import {
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

type AuditProspectionEditorProps = {
  prospectionId: string;
  initialRecipientEmail: string;
  initialSubject: string;
  initialEmailContent: string;
};

export default function AuditProspectionEditor({
  prospectionId,
  initialRecipientEmail,
  initialSubject,
  initialEmailContent,
}: AuditProspectionEditorProps) {
  const router =
    useRouter();

  const [
    recipientEmail,
    setRecipientEmail,
  ] = useState(
    initialRecipientEmail
  );

  const [
    subject,
    setSubject,
  ] = useState(
    initialSubject
  );

  const [
    emailContent,
    setEmailContent,
  ] = useState(
    initialEmailContent
  );

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState<
    string | null
  >(null);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  async function handleSave() {
    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response =
        await fetch(
          `/api/audit-prospections/${prospectionId}`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                recipientEmail:
                  recipientEmail.trim(),

                subject:
                  subject.trim(),

                emailContent:
                  emailContent.trim(),
              }),
          }
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ??
            "Impossible d’enregistrer la prospection."
        );
      }

      setMessage(
        "Modifications enregistrées."
      );

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mt-5 rounded-2xl border border-indigo-100 bg-white p-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-500">
          Préparer l’envoi
        </p>

        <p className="mt-1 text-sm text-slate-500">
          Relisez et modifiez le
          message avant de passer à
          l’envoi.
        </p>
      </div>

      <div className="mt-5">
        <label
          htmlFor="prospection-recipient"
          className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400"
        >
          Destinataire
        </label>

        <input
          id="prospection-recipient"
          type="email"
          value={
            recipientEmail
          }
          onChange={(event) =>
            setRecipientEmail(
              event.target.value
            )
          }
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          placeholder="adresse@entreprise.fr"
        />
      </div>

      <div className="mt-5">
        <label
          htmlFor="prospection-subject"
          className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400"
        >
          Objet
        </label>

        <input
          id="prospection-subject"
          type="text"
          value={subject}
          onChange={(event) =>
            setSubject(
              event.target.value
            )
          }
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          placeholder="Objet du mail"
        />
      </div>

      <div className="mt-5">
        <label
          htmlFor="prospection-content"
          className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400"
        >
          Message
        </label>

        <textarea
          id="prospection-content"
          value={emailContent}
          onChange={(event) =>
            setEmailContent(
              event.target.value
            )
          }
          rows={12}
          className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          placeholder="Corps du mail"
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          {message ? (
            <p className="text-sm font-semibold text-emerald-600">
              {message}
            </p>
          ) : null}

          {error ? (
            <p className="text-sm font-semibold text-red-600">
              {error}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={
            handleSave
          }
          disabled={
            isSaving
          }
          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving
            ? "Enregistrement..."
            : "Enregistrer les modifications"}
        </button>
      </div>
    </div>
  );
}