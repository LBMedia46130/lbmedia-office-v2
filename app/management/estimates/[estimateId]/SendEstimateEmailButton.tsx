"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

type SendEstimateEmailButtonProps = {
  estimateId: string;
  estimateNumber: string;
};

type ZohoEstimateEmailContent = {
  body: string;
  subject: string;
  to_mail_ids: string[];
  cc_mail_ids: string[];
  bcc_mail_ids: string[];
  from_mail_id?: string;
  from_name?: string;
  emailtemplate_id?: string;
  file_name?: string;
};

export default function SendEstimateEmailButton({
  estimateId,
  estimateNumber,
}: SendEstimateEmailButtonProps) {
  const [isOpen, setIsOpen] =
    useState(false);

  const [isLoading, setIsLoading] =
    useState(false);

  const [isSending, setIsSending] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [email, setEmail] =
    useState<ZohoEstimateEmailContent | null>(
      null
    );

  const [to, setTo] =
    useState("");

  const [cc, setCc] =
    useState("");

  const [bcc, setBcc] =
    useState("");

  const [subject, setSubject] =
    useState("");

  const editorRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const bodyHtmlRef =
    useRef("");

  useEffect(() => {
    if (!isOpen || email) {
      return;
    }

    async function loadEmail() {
      setIsLoading(true);
      setError("");
      setSuccess("");

      try {
        const response =
          await fetch(
            `/api/zoho/estimates/${encodeURIComponent(
              estimateId
            )}/email`,
            {
              method: "GET",
              cache: "no-store",
            }
          );

        const data =
          (await response.json()) as {
            ok?: boolean;
            email?: ZohoEstimateEmailContent;
            error?: string;
          };

        if (
          !response.ok ||
          !data.ok ||
          !data.email
        ) {
          throw new Error(
            data.error ||
              "Impossible de récupérer l'email préparé par Zoho."
          );
        }

        setEmail(
          data.email
        );

        setTo(
          data.email.to_mail_ids.join(
            ", "
          )
        );

        setCc(
          data.email.cc_mail_ids.join(
            ", "
          )
        );

        setBcc(
          data.email.bcc_mail_ids.join(
            ", "
          )
        );

        setSubject(
          data.email.subject
        );

        bodyHtmlRef.current =
          data.email.body;
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Impossible de récupérer l'email."
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadEmail();
  }, [
    isOpen,
    email,
    estimateId,
  ]);

  useEffect(() => {
    if (
      !email ||
      !editorRef.current
    ) {
      return;
    }

    editorRef.current.innerHTML =
      email.body;

    bodyHtmlRef.current =
      email.body;
  }, [email]);

  function parseEmails(
    value: string
  ) {
    return value
      .split(/[;,]/)
      .map((emailAddress) =>
        emailAddress.trim()
      )
      .filter(Boolean);
  }

  function handleEditorInput() {
    if (!editorRef.current) {
      return;
    }

    bodyHtmlRef.current =
      editorRef.current.innerHTML;
  }

  function handleEditorClick(
    event: React.MouseEvent<HTMLDivElement>
  ) {
    const target =
      event.target as HTMLElement;

    const link =
      target.closest("a");

    if (link) {
      event.preventDefault();
    }
  }

  function handleResetMessage() {
    if (
      !email ||
      !editorRef.current
    ) {
      return;
    }

    editorRef.current.innerHTML =
      email.body;

    bodyHtmlRef.current =
      email.body;

    setError("");
  }

  async function handleSend() {
    setError("");
    setSuccess("");

    const toMailIds =
      parseEmails(to);

    if (
      toMailIds.length === 0
    ) {
      setError(
        "Ajoute au moins un destinataire."
      );

      return;
    }

    if (!subject.trim()) {
      setError(
        "Le sujet de l'email est obligatoire."
      );

      return;
    }

    const currentBody =
      bodyHtmlRef.current.trim();

    if (!currentBody) {
      setError(
        "Le contenu de l'email est obligatoire."
      );

      return;
    }

    setIsSending(true);

    try {
      const response =
        await fetch(
          `/api/zoho/estimates/${encodeURIComponent(
            estimateId
          )}/email`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              to_mail_ids:
                toMailIds,

              cc_mail_ids:
                parseEmails(cc),

              bcc_mail_ids:
                parseEmails(bcc),

              subject:
                subject.trim(),

              body:
                currentBody,
            }),
          }
        );

      const data =
        (await response.json()) as {
          ok?: boolean;
          error?: string;
        };

      if (
        !response.ok ||
        !data.ok
      ) {
        throw new Error(
          data.error ||
            "Impossible d'envoyer le devis."
        );
      }

      setSuccess(
        `Le devis ${estimateNumber} a été envoyé via Zoho Books.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible d'envoyer le devis."
      );
    } finally {
      setIsSending(false);
    }
  }

  function handleClose() {
    if (isSending) {
      return;
    }

    setIsOpen(false);
    setSuccess("");
    setError("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() =>
          setIsOpen(true)
        }
        className="rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
      >
        Envoyer le devis
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.16em] text-blue-600">
                  Envoi via Zoho Books
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  Devis{" "}
                  {
                    estimateNumber
                  }
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Vérifie ou modifie
                  l&apos;email avant
                  son envoi.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  handleClose
                }
                disabled={
                  isSending
                }
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
              >
                Fermer
              </button>
            </div>

            <div className="space-y-5 p-6">
              {isLoading ? (
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-4 text-sm text-blue-700">
                  Récupération de
                  l&apos;email Zoho…
                </div>
              ) : null}

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              ) : null}

              {success ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                  {success}
                </div>
              ) : null}

              {!isLoading &&
              email ? (
                <>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Expéditeur
                    </p>

                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {email.from_name
                        ? `${email.from_name} `
                        : ""}

                      {email.from_mail_id
                        ? `<${email.from_mail_id}>`
                        : "Défini par Zoho Books"}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-700">
                      Destinataire
                    </label>

                    <input
                      value={to}
                      onChange={(event) =>
                        setTo(
                          event.target
                            .value
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      placeholder="client@entreprise.fr"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-semibold text-slate-700">
                        Copie
                      </label>

                      <input
                        value={cc}
                        onChange={(
                          event
                        ) =>
                          setCc(
                            event
                              .target
                              .value
                          )
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        placeholder="Optionnel"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-slate-700">
                        Copie cachée
                      </label>

                      <input
                        value={bcc}
                        onChange={(
                          event
                        ) =>
                          setBcc(
                            event
                              .target
                              .value
                          )
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        placeholder="Optionnel"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-700">
                      Sujet
                    </label>

                    <input
                      value={
                        subject
                      }
                      onChange={(
                        event
                      ) =>
                        setSubject(
                          event
                            .target
                            .value
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <label className="text-sm font-semibold text-slate-700">
                          Message
                        </label>

                        <p className="mt-1 text-xs text-slate-400">
                          Clique dans le
                          message pour
                          modifier directement
                          son texte.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={
                          handleResetMessage
                        }
                        disabled={
                          isSending
                        }
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        Restaurer le
                        message Zoho
                      </button>
                    </div>

                    <div className="mt-2 overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                      <div
                        ref={
                          editorRef
                        }
                        contentEditable={
                          !isSending
                        }
                        suppressContentEditableWarning
                        onInput={
                          handleEditorInput
                        }
                        onClick={
                          handleEditorClick
                        }
                        className="min-h-[420px] max-h-[620px] overflow-y-auto bg-white p-5 text-sm leading-6 text-slate-900 outline-none"
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-700">
                      Pièce jointe
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {email.file_name ||
                        `PDF officiel du devis ${estimateNumber}`}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Le PDF est généré
                      et joint directement
                      par Zoho Books.
                    </p>
                  </div>
                </>
              ) : null}
            </div>

            {!isLoading &&
            email ? (
              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 px-6 py-5">
                <button
                  type="button"
                  onClick={
                    handleClose
                  }
                  disabled={
                    isSending
                  }
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Annuler
                </button>

                <button
                  type="button"
                  onClick={
                    handleSend
                  }
                  disabled={
                    isSending ||
                    Boolean(
                      success
                    )
                  }
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSending
                    ? "Envoi…"
                    : success
                      ? "Devis envoyé"
                      : "Envoyer via Zoho"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}