"use client";

import {
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

  if (
    status === "sent"
  ) {
    return (
      <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-emerald-800">
              Email envoyé
            </p>

            <p className="mt-1 text-xs leading-5 text-emerald-700">
              {sentAt
                ? `Envoi enregistré le ${formatDateTime(
                    sentAt
                  )}.`
                : "L’envoi a bien été enregistré."}
            </p>

            {recipientEmail ? (
              <p className="mt-1 text-xs text-emerald-700">
                Destinataire :{" "}
                {
                  recipientEmail
                }
              </p>
            ) : null}
          </div>

          <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">
            Envoyée
          </span>
        </div>
      </div>
    );
  }

  const canSend =
    status === "ready" &&
    Boolean(
      recipientEmail?.trim()
    ) &&
    Boolean(
      attachmentUrl?.trim()
    );

  async function sendEmail() {
    if (
      isSending ||
      !canSend
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Envoyer maintenant cet email à ${recipientEmail} avec le PDF en pièce jointe ?\n\nCette action déclenche un véritable envoi depuis la boîte Exchange OVH de LBMedia.`
      );

    if (!confirmed) {
      return;
    }

    setIsSending(
      true
    );

    setMessage(null);
    setError(null);

    try {
      const response =
        await fetch(
          `/api/audit-prospections/${prospectionId}/send`,
          {
            method:
              "POST",
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
      setIsSending(
        false
      );
    }
  }

  return (
    <div className="mt-5 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white px-5 py-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600">
            Envoi
          </p>

          <h4 className="mt-1 text-base font-bold text-slate-900">
            Envoyer la
            proposition
          </h4>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            L’email sera envoyé
            depuis la boîte
            Exchange OVH de
            LBMedia avec le PDF
            actuellement
            enregistré en pièce
            jointe.
          </p>

          {recipientEmail ? (
            <p className="mt-2 text-xs font-semibold text-slate-500">
              Destinataire :{" "}
              {
                recipientEmail
              }
            </p>
          ) : null}

          {!recipientEmail ? (
            <p className="mt-2 text-xs font-semibold text-amber-700">
              Renseigne d’abord
              l’adresse email du
              destinataire.
            </p>
          ) : null}

          {!attachmentUrl ? (
            <p className="mt-2 text-xs font-semibold text-amber-700">
              Génère d’abord le
              PDF à joindre.
            </p>
          ) : null}

          {status !==
            "ready" ? (
            <p className="mt-2 text-xs font-semibold text-amber-700">
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
            !canSend ||
            isSending
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