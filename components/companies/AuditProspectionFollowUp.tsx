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
        await response.json();

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
            </div>
          ) : null}

          <div className="mt-5 border-t border-violet-200 pt-5">
            <button
              type="button"
              onClick={
                markAsReplied
              }
              disabled={
                isSaving
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