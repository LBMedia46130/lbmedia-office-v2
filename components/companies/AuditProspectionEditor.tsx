"use client";

import {
  useEffect,
  useMemo,
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
    savedRecipientEmail,
    setSavedRecipientEmail,
  ] = useState(
    initialRecipientEmail
  );

  const [
    savedSubject,
    setSavedSubject,
  ] = useState(
    initialSubject
  );

  const [
    savedEmailContent,
    setSavedEmailContent,
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

  const isDirty =
    useMemo(() => {
      return (
        recipientEmail.trim() !==
          savedRecipientEmail.trim() ||
        subject.trim() !==
          savedSubject.trim() ||
        emailContent.trim() !==
          savedEmailContent.trim()
      );
    }, [
      recipientEmail,
      subject,
      emailContent,
      savedRecipientEmail,
      savedSubject,
      savedEmailContent,
    ]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(
        "audit-prospection-edit-state",
        {
          detail: {
            prospectionId,
            isDirty,
            isSaving,
          },
        }
      )
    );
  }, [
    prospectionId,
    isDirty,
    isSaving,
  ]);

  useEffect(() => {
    return () => {
      window.dispatchEvent(
        new CustomEvent(
          "audit-prospection-edit-state",
          {
            detail: {
              prospectionId,
              isDirty: false,
              isSaving: false,
            },
          }
        )
      );
    };
  }, [prospectionId]);

  async function handleSave() {
    if (
      isSaving ||
      !isDirty
    ) {
      return;
    }

    const nextRecipientEmail =
      recipientEmail.trim();

    const nextSubject =
      subject.trim();

    const nextEmailContent =
      emailContent.trim();

    if (
      !nextRecipientEmail
    ) {
      setError(
        "L’adresse email du destinataire est obligatoire."
      );
      setMessage(null);
      return;
    }

    if (!nextSubject) {
      setError(
        "L’objet de l’email est obligatoire."
      );
      setMessage(null);
      return;
    }

    if (
      !nextEmailContent
    ) {
      setError(
        "Le message est obligatoire."
      );
      setMessage(null);
      return;
    }

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
                  nextRecipientEmail,

                subject:
                  nextSubject,

                emailContent:
                  nextEmailContent,
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

      setRecipientEmail(
        nextRecipientEmail
      );

      setSubject(
        nextSubject
      );

      setEmailContent(
        nextEmailContent
      );

      setSavedRecipientEmail(
        nextRecipientEmail
      );

      setSavedSubject(
        nextSubject
      );

      setSavedEmailContent(
        nextEmailContent
      );

      setMessage(
        "Modifications enregistrées. L’envoi peut maintenant utiliser ces informations."
      );

      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Une erreur est survenue."
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleRecipientChange(
    value: string
  ) {
    setRecipientEmail(
      value
    );
    setMessage(null);
    setError(null);
  }

  function handleSubjectChange(
    value: string
  ) {
    setSubject(value);
    setMessage(null);
    setError(null);
  }

  function handleContentChange(
    value: string
  ) {
    setEmailContent(value);
    setMessage(null);
    setError(null);
  }

  return (
    <div className="mt-5 rounded-2xl border border-indigo-100 bg-white p-5">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-500">
            Préparer l’envoi
          </p>

          {isDirty ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">
              Modifications non enregistrées
            </span>
          ) : (
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
              Enregistré
            </span>
          )}
        </div>

        <p className="mt-2 text-sm text-slate-500">
          Toute modification du
          destinataire, de l’objet
          ou du message doit être
          enregistrée avant
          l’envoi.
        </p>
      </div>

      {isDirty ? (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-bold text-amber-800">
            Envoi temporairement
            bloqué
          </p>

          <p className="mt-1 text-xs leading-5 text-amber-700">
            Les informations
            affichées ont été
            modifiées mais ne sont
            pas encore enregistrées
            dans LBMedia Office.
          </p>
        </div>
      ) : null}

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
            handleRecipientChange(
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
          value={
            subject
          }
          onChange={(event) =>
            handleSubjectChange(
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
          value={
            emailContent
          }
          onChange={(event) =>
            handleContentChange(
              event.target.value
            )
          }
          rows={12}
          className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          placeholder="Corps du mail"
        />
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              Aperçu du mail envoyé
            </p>

            <p className="mt-1 text-xs text-slate-500">
              La signature LBMedia
              sera ajoutée
              automatiquement à
              l’envoi.
            </p>
          </div>

          {isDirty ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">
              Aperçu non enregistré
            </span>
          ) : (
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
              Aperçu prêt à envoyer
            </span>
          )}
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
            <div className="grid gap-2 text-sm sm:grid-cols-[90px_1fr]">
              <span className="font-semibold text-slate-500">
                À
              </span>

              <span className="break-all text-slate-800">
                {recipientEmail.trim() ||
                  "—"}
              </span>

              <span className="font-semibold text-slate-500">
                Objet
              </span>

              <span className="font-semibold text-slate-900">
                {subject.trim() ||
                  "—"}
              </span>
            </div>
          </div>

          <div className="px-6 py-6">
            <div className="whitespace-pre-wrap text-[15px] leading-7 text-slate-800">
              {emailContent ||
                "Le contenu du message apparaîtra ici."}
            </div>

            <div className="mt-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="shrink-0 sm:pr-5">
                  <img
                    src="/brand/lbmedia-logo.png"
                    alt="LBMedia"
                    className="h-auto w-[155px]"
                  />
                </div>

                <div className="border-l-2 border-[#1683c5] pl-5">
                  <p className="text-[17px] font-bold leading-6 text-[#293b50]">
                    Laurent BARRES
                  </p>

                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#1683c5]">
                    Directeur
                  </p>

                  <div className="mt-2 text-[12px] leading-5 text-[#4b5d70]">
                    <a
                      href="tel:+33680061019"
                      className="block text-[#4b5d70] no-underline"
                    >
                      06.80.06.10.19
                    </a>

                    <a
                      href="mailto:laurent@lbmedia.fr"
                      className="block text-[#1683c5] no-underline"
                    >
                      laurent@lbmedia.fr
                    </a>

                    <a
                      href="https://www.lbmedia.fr"
                      target="_blank"
                      rel="noreferrer"
                      className="block text-[#1683c5] no-underline"
                    >
                      www.lbmedia.fr
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
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
            isSaving ||
            !isDirty
          }
          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving
            ? "Enregistrement..."
            : isDirty
              ? "Enregistrer les modifications"
              : "Modifications enregistrées"}
        </button>
      </div>
    </div>
  );
}