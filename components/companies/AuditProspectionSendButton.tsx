"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type AuditProspectionSendButtonProps = {
  prospectionId: string;

  status:
    | "draft"
    | "ready"
    | "sent"
    | "follow_up"
    | "replied";

  recipientEmail:
    | string
    | null;

  attachmentUrl:
    | string
    | null;

  sentAt:
    | string
    | null;
};

type EditStateEventDetail = {
  prospectionId: string;
  isDirty: boolean;
  isSaving: boolean;
};

type SendTrace = {
  recipient_email:
    | string
    | null;

  sent_at:
    | string
    | null;

  sent_subject:
    | string
    | null;

  sent_email_content:
    | string
    | null;

  sent_html_content:
    | string
    | null;

  sent_attachment_url:
    | string
    | null;

  smtp_message_id:
    | string
    | null;
};

export default function AuditProspectionSendButton({
  prospectionId,
  status,
  recipientEmail,
  attachmentUrl,
  sentAt,
}: AuditProspectionSendButtonProps) {
  const router =
    useRouter();

  const [
    isSending,
    setIsSending,
  ] =
    useState(false);

  const [
    hasUnsavedChanges,
    setHasUnsavedChanges,
  ] =
    useState(false);

  const [
    editorIsSaving,
    setEditorIsSaving,
  ] =
    useState(false);

  const [
    message,
    setMessage,
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

  const [
    trace,
    setTrace,
  ] =
    useState<
      SendTrace | null
    >(null);

  const [
    isLoadingTrace,
    setIsLoadingTrace,
  ] =
    useState(false);

  const [
    traceError,
    setTraceError,
  ] =
    useState<
      string | null
    >(null);

  const [
    showArchivedEmail,
    setShowArchivedEmail,
  ] =
    useState(false);

  useEffect(() => {
    function handleEditState(
      event: Event
    ) {
      const customEvent =
        event as CustomEvent<EditStateEventDetail>;

      if (
        customEvent.detail
          ?.prospectionId !==
        prospectionId
      ) {
        return;
      }

      setHasUnsavedChanges(
        Boolean(
          customEvent.detail
            .isDirty
        )
      );

      setEditorIsSaving(
        Boolean(
          customEvent.detail
            .isSaving
        )
      );
    }

    window.addEventListener(
      "audit-prospection-edit-state",
      handleEditState
    );

    return () => {
      window.removeEventListener(
        "audit-prospection-edit-state",
        handleEditState
      );
    };
  }, [prospectionId]);

  useEffect(() => {
    if (
      status !==
      "sent"
    ) {
      return;
    }

    let cancelled =
      false;

    async function loadTrace() {
      setIsLoadingTrace(
        true
      );

      setTraceError(
        null
      );

      try {
        const response =
          await fetch(
            `/api/audit-prospections/${prospectionId}/trace`,
            {
              cache:
                "no-store",
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
              "Impossible de charger la trace d’envoi."
          );
        }

        if (
          !cancelled
        ) {
          setTrace(
            result.trace as SendTrace
          );
        }
      } catch (
        loadError
      ) {
        if (
          !cancelled
        ) {
          setTraceError(
            loadError instanceof Error
              ? loadError.message
              : "Impossible de charger la trace d’envoi."
          );
        }
      } finally {
        if (
          !cancelled
        ) {
          setIsLoadingTrace(
            false
          );
        }
      }
    }

    void loadTrace();

    return () => {
      cancelled =
        true;
    };
  }, [
    prospectionId,
    status,
  ]);

  if (
    status === "sent"
  ) {
    const archivedRecipient =
      trace
        ?.recipient_email ||
      recipientEmail;

    const archivedSentAt =
      trace
        ?.sent_at ||
      sentAt;

    const archivedAttachment =
      trace
        ?.sent_attachment_url;

    return (
      <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-bold text-emerald-800">
                Email envoyé
              </p>

              <span className="inline-flex rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white">
                Envoyée
              </span>
            </div>

            <p className="mt-2 text-xs leading-5 text-emerald-700">
              {archivedSentAt
                ? `Envoi enregistré le ${formatDateTime(
                    archivedSentAt
                  )}.`
                : "L’envoi a bien été enregistré."}
            </p>
          </div>
        </div>

        {isLoadingTrace ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-white px-4 py-4 text-sm text-slate-500">
            Chargement de la
            traçabilité…
          </div>
        ) : null}

        {traceError ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
            {traceError}
          </div>
        ) : null}

        {trace ? (
          <>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <TraceInfo
                label="Destinataire"
                value={
                  archivedRecipient ||
                  "Non renseigné"
                }
              />

              <TraceInfo
                label="Date d’envoi"
                value={
                  archivedSentAt
                    ? formatDateTime(
                        archivedSentAt
                      )
                    : "Non renseignée"
                }
              />

              <TraceInfo
                label="Objet envoyé"
                value={
                  trace.sent_subject ||
                  "Non archivé"
                }
              />

              <TraceInfo
                label="Identifiant SMTP"
                value={
                  trace.smtp_message_id ||
                  "Non disponible"
                }
                mono
              />
            </div>

            <div className="mt-3 rounded-xl border border-emerald-200 bg-white px-4 py-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Pièce jointe
              </p>

              {archivedAttachment ? (
                <a
                  href={
                    archivedAttachment
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex text-sm font-semibold text-blue-600 transition hover:text-blue-700"
                >
                  Ouvrir le PDF
                  envoyé
                </a>
              ) : (
                <p className="mt-2 text-sm text-slate-500">
                  Aucune pièce
                  jointe archivée.
                </p>
              )}
            </div>

            <div className="mt-4 rounded-xl border border-emerald-200 bg-white">
              <button
                type="button"
                onClick={() =>
                  setShowArchivedEmail(
                    (
                      current
                    ) =>
                      !current
                  )
                }
                className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
              >
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-600">
                    Copie archivée
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    Consulter le
                    message réellement
                    envoyé
                  </p>
                </div>

                <span className="text-sm font-bold text-emerald-700">
                  {showArchivedEmail
                    ? "Masquer"
                    : "Afficher"}
                </span>
              </button>

              {showArchivedEmail ? (
                <div className="border-t border-emerald-100 px-5 py-5">
                  {trace.sent_subject ? (
                    <div className="mb-5 border-b border-slate-100 pb-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        Objet
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {
                          trace.sent_subject
                        }
                      </p>
                    </div>
                  ) : null}

                  {trace.sent_email_content ? (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        Message
                      </p>

                      <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                        {
                          trace.sent_email_content
                        }
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      Aucun contenu
                      archivé.
                    </p>
                  )}

                  <div className="mt-7 border-t border-slate-100 pt-5">
                    <p className="text-xs font-semibold text-slate-500">
                      La signature
                      LBMedia a été
                      ajoutée
                      automatiquement
                      à cette version
                      lors de l’envoi.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-100/50 px-4 py-3">
              <p className="text-xs font-semibold leading-5 text-emerald-800">
                Cet envoi est
                verrouillé dans
                LBMedia Office afin
                d’éviter toute
                réexpédition
                accidentelle.
              </p>
            </div>
          </>
        ) : null}
      </div>
    );
  }

  const normalizedRecipient =
    recipientEmail
      ?.trim()
      .toLowerCase() ??
    "";

  const canSend =
    status === "ready" &&
    Boolean(
      normalizedRecipient
    ) &&
    Boolean(
      attachmentUrl?.trim()
    ) &&
    !hasUnsavedChanges &&
    !editorIsSaving &&
    !isSending;

  async function sendEmail() {
    if (!canSend) {
      return;
    }

    const firstConfirmation =
      window.confirm(
        [
          "ENVOI RÉEL D’UN EMAIL",
          "",
          `Destinataire réellement enregistré :`,
          `${recipientEmail}`,
          "",
          "Le PDF actuellement enregistré sera joint.",
          "",
          "Voulez-vous continuer ?",
        ].join("\n")
      );

    if (
      !firstConfirmation
    ) {
      return;
    }

    const typedEmail =
      window.prompt(
        [
          "CONFIRMATION DE SÉCURITÉ",
          "",
          "Recopiez exactement l’adresse email du destinataire pour autoriser l’envoi :",
          "",
          `${recipientEmail}`,
        ].join("\n")
      );

    if (
      typedEmail === null
    ) {
      return;
    }

    if (
      typedEmail
        .trim()
        .toLowerCase() !==
      normalizedRecipient
    ) {
      setError(
        "Envoi annulé : l’adresse saisie lors de la confirmation ne correspond pas au destinataire enregistré."
      );

      return;
    }

    setIsSending(true);
    setMessage(null);
    setError(null);

    try {
      const response =
        await fetch(
          `/api/audit-prospections/${prospectionId}/send`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                confirmedRecipientEmail:
                  normalizedRecipient,
              }),
          }
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        if (
          result.sent ===
          true
        ) {
          throw new Error(
            result.message ??
              "L’email a été envoyé mais la traçabilité n’a pas pu être enregistrée. Ne renvoyez pas le message."
          );
        }

        throw new Error(
          result.message ??
            "Impossible d’envoyer l’email."
        );
      }

      setMessage(
        "Email envoyé avec succès."
      );

      router.refresh();
    } catch (
      sendError
    ) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Une erreur est survenue pendant l’envoi."
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="mt-5 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white px-5 py-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600">
            Envoi réel
          </p>

          <h4 className="mt-1 text-base font-bold text-slate-900">
            Envoyer la
            proposition
          </h4>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Le destinataire
            ci-dessous est celui
            qui est actuellement
            enregistré dans
            LBMedia Office et que
            le serveur utilisera.
          </p>

          {recipientEmail ? (
            <div className="mt-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Destinataire
                réellement
                enregistré
              </p>

              <p className="mt-1 break-all text-sm font-bold text-slate-900">
                {
                  recipientEmail
                }
              </p>
            </div>
          ) : null}

          {hasUnsavedChanges ? (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-bold text-amber-800">
                Envoi bloqué
              </p>

              <p className="mt-1 text-xs leading-5 text-amber-700">
                Des modifications
                du destinataire,
                de l’objet ou du
                message ne sont
                pas encore
                enregistrées.
              </p>
            </div>
          ) : null}

          {editorIsSaving ? (
            <p className="mt-3 text-xs font-semibold text-amber-700">
              Enregistrement en
              cours…
            </p>
          ) : null}

          {!recipientEmail ? (
            <p className="mt-3 text-xs font-semibold text-amber-700">
              Renseigne et
              enregistre d’abord
              l’adresse email du
              destinataire.
            </p>
          ) : null}

          {!attachmentUrl ? (
            <p className="mt-3 text-xs font-semibold text-amber-700">
              Génère d’abord le
              PDF à joindre.
            </p>
          ) : null}

          {status !==
            "ready" ? (
            <p className="mt-3 text-xs font-semibold text-amber-700">
              La prospection doit
              être au statut
              « Prête » avant
              l’envoi.
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={
            sendEmail
          }
          disabled={
            !canSend
          }
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSending
            ? "Envoi en cours..."
            : "Envoyer l’email + PDF"}
        </button>
      </div>

      {message ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-700">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}

function TraceInfo({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-white px-4 py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>

      <p
        className={`mt-2 break-words text-sm font-semibold text-slate-800 ${
          mono
            ? "font-mono text-xs"
            : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function formatDateTime(
  value: string
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      dateStyle:
        "short",

      timeStyle:
        "short",
    }
  ).format(date);
}