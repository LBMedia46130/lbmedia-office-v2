"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type AuditProspectionFollowUpProps = {
  prospectionId: string;

  status:
    | "draft"
    | "ready"
    | "sent"
    | "follow_up"
    | "replied";

  sentAt:
    | string
    | null;

  followUpAt:
    | string
    | null;
};

type GeneratedFollowUp = {
  number: number;
  subject: string;
  emailContent: string;
  recipientEmail:
    | string
    | null;
  previousMessageId:
    | string
    | null;
};

type ApiResult = {
  success?: boolean;
  message?: string;
  sent?: boolean;
  sequenceNumber?: number;
  followUp?: GeneratedFollowUp;
  [key: string]: unknown;
};

export default function AuditProspectionFollowUp({
  prospectionId,
  status,
  sentAt,
  followUpAt,
}: AuditProspectionFollowUpProps) {
  const router =
    useRouter();

  const initialDate =
    useMemo(() => {
      if (followUpAt) {
        return toDateInputValue(
          followUpAt
        );
      }

      if (sentAt) {
        const date =
          new Date(sentAt);

        if (
          !Number.isNaN(
            date.getTime()
          )
        ) {
          date.setDate(
            date.getDate() + 7
          );

          return toDateInputValue(
            date.toISOString()
          );
        }
      }

      return "";
    }, [
      followUpAt,
      sentAt,
    ]);

  const [
    followUpDate,
    setFollowUpDate,
  ] =
    useState(
      initialDate
    );

  const [
    isSaving,
    setIsSaving,
  ] =
    useState(false);

  const [
    isGenerating,
    setIsGenerating,
  ] =
    useState(false);

  const [
    isSending,
    setIsSending,
  ] =
    useState(false);

  const [
    generatedFollowUp,
    setGeneratedFollowUp,
  ] =
    useState<
      GeneratedFollowUp | null
    >(null);

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
    status !== "sent" &&
    status !== "follow_up" &&
    status !== "replied"
  ) {
    return null;
  }

  const isReplied =
    status === "replied";

  const followUpIsDue =
    Boolean(
      followUpAt &&
        !isReplied &&
        new Date(
          followUpAt
        ).getTime() <=
          Date.now()
    );

  async function updateProspection(
    payload: {
      status?:
        | "sent"
        | "follow_up"
        | "replied";

      followUpAt?:
        | string
        | null;

      repliedAt?:
        | string
        | null;
    },
    successMessage: string
  ) {
    if (isSaving) {
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
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                payload
              ),
          }
        );

      const result =
        await readJsonResponse(
          response
        );

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ??
            "Impossible de mettre à jour la prospection."
        );
      }

      setMessage(
        successMessage
      );

      router.refresh();
    } catch (
      updateError
    ) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Une erreur est survenue."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function saveFollowUp() {
    if (
      !followUpDate
    ) {
      setError(
        "Choisis une date de relance."
      );

      setMessage(null);

      return;
    }

    const followUpDateTime =
      new Date(
        `${followUpDate}T09:00:00`
      );

    if (
      Number.isNaN(
        followUpDateTime.getTime()
      )
    ) {
      setError(
        "La date de relance n’est pas valide."
      );

      setMessage(null);

      return;
    }

    await updateProspection(
      {
        status:
          "follow_up",

        followUpAt:
          followUpDateTime.toISOString(),
      },
      "Relance programmée."
    );
  }

  async function markAsReplied() {
    const now =
      new Date().toISOString();

    await updateProspection(
      {
        status:
          "replied",

        repliedAt:
          now,
      },
      "Réponse enregistrée."
    );
  }

  async function reopenFollowUp() {
    await updateProspection(
      {
        status:
          "follow_up",

        repliedAt:
          null,
      },
      "Suivi commercial réouvert."
    );
  }

  async function generateFollowUp() {
    if (
      isGenerating ||
      isSending
    ) {
      return;
    }

    setIsGenerating(true);
    setMessage(null);
    setError(null);

    try {
      const response =
        await fetch(
          `/api/audit-prospections/${prospectionId}/follow-up/generate`,
          {
            method:
              "POST",
          }
        );

      const result =
        await readJsonResponse(
          response
        );

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ??
            "Impossible de générer la relance."
        );
      }

      if (
        !result.followUp
      ) {
        throw new Error(
          "La relance générée est introuvable dans la réponse du serveur."
        );
      }

      setGeneratedFollowUp(
        result.followUp
      );

      setMessage(
        "Relance préparée."
      );
    } catch (
      generateError
    ) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : "Une erreur est survenue pendant la génération."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  function updateGeneratedSubject(
    value: string
  ) {
    setGeneratedFollowUp(
      (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          subject:
            value,
        };
      }
    );

    setMessage(null);
    setError(null);
  }

  function updateGeneratedContent(
    value: string
  ) {
    setGeneratedFollowUp(
      (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          emailContent:
            value,
        };
      }
    );

    setMessage(null);
    setError(null);
  }

  async function sendFollowUp() {
    if (
      !generatedFollowUp ||
      isSending ||
      isGenerating
    ) {
      return;
    }

    const recipientEmail =
      generatedFollowUp
        .recipientEmail
        ?.trim();

    const subject =
      generatedFollowUp
        .subject
        .trim();

    const emailContent =
      generatedFollowUp
        .emailContent
        .trim();

    if (!recipientEmail) {
      setError(
        "Le destinataire de la relance est manquant."
      );

      setMessage(null);

      return;
    }

    if (!subject) {
      setError(
        "L’objet de la relance est obligatoire."
      );

      setMessage(null);

      return;
    }

    if (!emailContent) {
      setError(
        "Le message de relance est obligatoire."
      );

      setMessage(null);

      return;
    }

    const firstConfirmation =
      window.confirm(
        [
          "ENVOI RÉEL DE LA RELANCE",
          "",
          `Destinataire : ${recipientEmail}`,
          "",
          `Objet : ${subject}`,
          "",
          "La signature LBMedia sera ajoutée automatiquement.",
          "",
          "Aucun PDF ne sera joint.",
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
          "Recopiez exactement l’adresse du destinataire :",
          "",
          recipientEmail,
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
      recipientEmail
        .toLowerCase()
    ) {
      setError(
        "Envoi annulé : l’adresse saisie ne correspond pas au destinataire."
      );

      setMessage(null);

      return;
    }

    setIsSending(true);
    setMessage(null);
    setError(null);

    try {
      const response =
        await fetch(
          `/api/audit-prospections/${prospectionId}/follow-up/send`,
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
                  recipientEmail,

                subject,

                emailContent,
              }),
          }
        );

      const result =
        await readJsonResponse(
          response
        );

      if (
        !response.ok ||
        !result.success
      ) {
        if (
          result.sent ===
          true
        ) {
          setGeneratedFollowUp(
            null
          );

          router.refresh();

          throw new Error(
            result.message ??
              "La relance a été envoyée mais la traçabilité n’a pas pu être entièrement enregistrée. Ne renvoyez pas le message."
          );
        }

        throw new Error(
          result.message ??
            "Impossible d’envoyer la relance."
        );
      }

      const sequenceNumber =
        typeof result
          .sequenceNumber ===
        "number"
          ? result
              .sequenceNumber
          : generatedFollowUp
              .number;

      setGeneratedFollowUp(
        null
      );

      setMessage(
        `Relance ${sequenceNumber} envoyée avec succès. Une nouvelle date de suivi a été proposée à J+7.`
      );

      router.refresh();
    } catch (
      sendError
    ) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Une erreur est survenue pendant l’envoi de la relance."
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50/60 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-600">
              Suivi commercial
            </p>

            {isReplied ? (
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                Réponse reçue
              </span>
            ) : followUpIsDue ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                À relancer
              </span>
            ) : followUpAt ? (
              <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-bold text-violet-700">
                Relance programmée
              </span>
            ) : (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                En attente
              </span>
            )}
          </div>

          <h4 className="mt-2 text-base font-bold text-slate-900">
            Suivre cette
            prospection
          </h4>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Programme une relance
            ou indique simplement
            qu’une réponse a été
            reçue.
          </p>
        </div>

        {sentAt ? (
          <div className="shrink-0 text-left lg:text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Premier envoi
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-700">
              {formatDateTime(
                sentAt
              )}
            </p>
          </div>
        ) : null}
      </div>

      {isReplied ? (
        <div className="mt-5 rounded-xl border border-emerald-200 bg-white px-4 py-4">
          <p className="text-sm font-bold text-emerald-700">
            Cette prospection a
            obtenu une réponse.
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Aucune relance n’est
            actuellement attendue.
          </p>

          <button
            type="button"
            onClick={
              reopenFollowUp
            }
            disabled={
              isSaving
            }
            className="mt-4 inline-flex items-center justify-center rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Réouvrir le suivi
          </button>
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <label
                htmlFor={`follow-up-${prospectionId}`}
                className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-500"
              >
                Date de relance
              </label>

              <input
                id={`follow-up-${prospectionId}`}
                type="date"
                value={
                  followUpDate
                }
                onChange={(
                  event
                ) => {
                  setFollowUpDate(
                    event.target
                      .value
                  );

                  setMessage(
                    null
                  );

                  setError(
                    null
                  );
                }}
                className="mt-2 w-full rounded-xl border border-violet-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </div>

            <button
              type="button"
              onClick={
                saveFollowUp
              }
              disabled={
                isSaving ||
                isSending ||
                !followUpDate
              }
              className="inline-flex items-center justify-center rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving
                ? "Enregistrement..."
                : followUpAt
                  ? "Modifier la relance"
                  : "Programmer la relance"}
            </button>
          </div>

          {followUpAt ? (
            <div
              className={`mt-4 rounded-xl border px-4 py-3 ${
                followUpIsDue
                  ? "border-amber-200 bg-amber-50"
                  : "border-violet-200 bg-white"
              }`}
            >
              <p
                className={`text-sm font-bold ${
                  followUpIsDue
                    ? "text-amber-800"
                    : "text-violet-700"
                }`}
              >
                {followUpIsDue
                  ? "Cette prospection est à relancer."
                  : `Relance prévue le ${formatDate(
                      followUpAt
                    )}.`}
              </p>

              {followUpIsDue ? (
                <button
                  type="button"
                  onClick={
                    generateFollowUp
                  }
                  disabled={
                    isGenerating ||
                    isSending
                  }
                  className="mt-4 inline-flex items-center justify-center rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isGenerating
                    ? "Préparation..."
                    : generatedFollowUp
                      ? "Regénérer la relance"
                      : "Préparer la relance"}
                </button>
              ) : null}
            </div>
          ) : null}

          {generatedFollowUp ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-600">
                    Relance{" "}
                    {
                      generatedFollowUp.number
                    }
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Vérifie et
                    modifie le
                    message avant
                    l’envoi.
                  </p>
                </div>

                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                  Brouillon
                </span>
              </div>

              <div className="mt-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Destinataire
                </p>

                <p className="mt-1 break-all text-sm font-semibold text-slate-800">
                  {generatedFollowUp.recipientEmail ||
                    "Non renseigné"}
                </p>
              </div>

              <div className="mt-5">
                <label
                  htmlFor={`follow-up-subject-${prospectionId}`}
                  className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400"
                >
                  Objet
                </label>

                <input
                  id={`follow-up-subject-${prospectionId}`}
                  type="text"
                  value={
                    generatedFollowUp.subject
                  }
                  onChange={(
                    event
                  ) =>
                    updateGeneratedSubject(
                      event.target
                        .value
                    )
                  }
                  disabled={
                    isSending
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 disabled:bg-slate-50"
                />
              </div>

              <div className="mt-5">
                <label
                  htmlFor={`follow-up-content-${prospectionId}`}
                  className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400"
                >
                  Message
                </label>

                <textarea
                  id={`follow-up-content-${prospectionId}`}
                  value={
                    generatedFollowUp.emailContent
                  }
                  onChange={(
                    event
                  ) =>
                    updateGeneratedContent(
                      event.target
                        .value
                    )
                  }
                  disabled={
                    isSending
                  }
                  rows={8}
                  className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-800 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 disabled:bg-slate-50"
                />
              </div>

              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                  Envoi
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  La signature
                  LBMedia sera
                  ajoutée
                  automatiquement.
                  Aucun PDF ne sera
                  joint à la
                  relance.
                </p>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5">
                <p className="max-w-xl text-xs leading-5 text-slate-500">
                  Le message ne
                  sera archivé
                  dans l’historique
                  qu’après
                  acceptation par
                  le serveur SMTP.
                </p>

                <button
                  type="button"
                  onClick={
                    sendFollowUp
                  }
                  disabled={
                    isSending ||
                    isGenerating ||
                    !generatedFollowUp
                      .subject
                      .trim() ||
                    !generatedFollowUp
                      .emailContent
                      .trim() ||
                    !generatedFollowUp
                      .recipientEmail
                      ?.trim()
                  }
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSending
                    ? "Envoi en cours..."
                    : `Envoyer la relance ${generatedFollowUp.number}`}
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-5 border-t border-violet-200 pt-5">
            <button
              type="button"
              onClick={
                markAsReplied
              }
              disabled={
                isSaving ||
                isSending
              }
              className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Marquer comme
              réponse reçue
            </button>
          </div>
        </>
      )}

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

async function readJsonResponse(
  response: Response
): Promise<ApiResult> {
  const contentType =
    response.headers.get(
      "content-type"
    ) ?? "";

  const rawText =
    await response.text();

  if (
    !rawText.trim()
  ) {
    return {
      success:
        response.ok,

      message:
        response.ok
          ? undefined
          : `Le serveur a retourné une réponse vide (${response.status}).`,
    };
  }

  if (
    contentType.includes(
      "application/json"
    )
  ) {
    try {
      return JSON.parse(
        rawText
      ) as ApiResult;
    } catch {
      return {
        success: false,

        message:
          `Le serveur a retourné un JSON invalide (${response.status}).`,
      };
    }
  }

  try {
    return JSON.parse(
      rawText
    ) as ApiResult;
  } catch {
    const cleanedText =
      rawText
        .replace(
          /<script[\s\S]*?<\/script>/gi,
          " "
        )
        .replace(
          /<style[\s\S]*?<\/style>/gi,
          " "
        )
        .replace(
          /<[^>]+>/g,
          " "
        )
        .replace(
          /\s+/g,
          " "
        )
        .trim();

    return {
      success: false,

      message:
        cleanedText
          ? `Erreur serveur ${response.status} : ${cleanedText.slice(
              0,
              500
            )}`
          : `Le serveur a retourné une réponse non JSON (${response.status}).`,
    };
  }
}

function toDateInputValue(
  value: string
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

function formatDate(
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
        "long",
    }
  ).format(date);
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