"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type AuditProspectionAssetsProps = {
  prospectionId: string;

  initialBeforeImageUrl:
    | string
    | null;

  initialAfterImageUrl:
    | string
    | null;

  initialAttachmentUrl:
    | string
    | null;
};

export default function AuditProspectionAssets({
  prospectionId,
  initialBeforeImageUrl,
  initialAfterImageUrl,
  initialAttachmentUrl,
}: AuditProspectionAssetsProps) {
  const router =
    useRouter();

  const [
    beforeImageUrl,
    setBeforeImageUrl,
  ] = useState(
    initialBeforeImageUrl
  );

  const [
    afterImageUrl,
    setAfterImageUrl,
  ] = useState(
    initialAfterImageUrl
  );

  const [
    attachmentUrl,
    setAttachmentUrl,
  ] = useState(
    initialAttachmentUrl
  );

  const [
    loadingKind,
    setLoadingKind,
  ] = useState<
    | "before"
    | "after"
    | "proposal"
    | "pdf"
    | null
  >(null);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  async function uploadFile(
    kind:
      | "before"
      | "after",
    file: File
  ) {
    setLoadingKind(kind);
    setError(null);

    try {
      const formData =
        new FormData();

      formData.append(
        "kind",
        kind
      );

      formData.append(
        "file",
        file
      );

      const response =
        await fetch(
          `/api/audit-prospections/${prospectionId}/assets`,
          {
            method: "POST",
            body: formData,
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
            "Impossible d’importer le visuel."
        );
      }

      if (
        kind === "before"
      ) {
        setBeforeImageUrl(
          result.prospection
            .before_image_url
        );
      } else {
        setAfterImageUrl(
          result.prospection
            .after_image_url
        );
      }

      setAttachmentUrl(
        null
      );

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue."
      );
    } finally {
      setLoadingKind(
        null
      );
    }
  }

  async function generateProposal() {
    if (!beforeImageUrl) {
      setError(
        "Importez d’abord la capture du site actuel."
      );
      return;
    }

    setLoadingKind(
      "proposal"
    );

    setError(null);

    try {
      const response =
        await fetch(
          `/api/audit-prospections/${prospectionId}/generate-proposal`,
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
        throw new Error(
          result.message ??
            "Impossible de générer la proposition visuelle."
        );
      }

      const imageUrl =
        result.image_url ??
        result.prospection
          ?.after_image_url;

      if (!imageUrl) {
        throw new Error(
          "La proposition a été générée mais aucune image n’a été retournée."
        );
      }

      setAfterImageUrl(
        imageUrl
      );

      setAttachmentUrl(
        null
      );

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue."
      );
    } finally {
      setLoadingKind(
        null
      );
    }
  }

  async function generatePdf() {
    setLoadingKind(
      "pdf"
    );

    setError(null);

    try {
      const response =
        await fetch(
          `/api/audit-prospections/${prospectionId}/generate-pdf`,
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
        throw new Error(
          result.message ??
            "Impossible de générer le PDF."
        );
      }

      setAttachmentUrl(
        result.attachmentUrl
      );

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue."
      );
    } finally {
      setLoadingKind(
        null
      );
    }
  }

  const isBusy =
    loadingKind !== null;

  return (
    <div className="mt-5 rounded-2xl border border-indigo-100 bg-white p-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-500">
          Présentation avant / après
        </p>

        <p className="mt-1 text-sm text-slate-500">
          Ajoutez une capture du
          site actuel, puis laissez
          Pénélope imaginer une
          piste d’amélioration.
        </p>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <AssetCard
          title="Aujourd’hui"
          imageUrl={
            beforeImageUrl
          }
          loading={
            loadingKind ===
            "before"
          }
          onFile={(file) =>
            uploadFile(
              "before",
              file
            )
          }
        />

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
            Piste proposée
          </p>

          {afterImageUrl ? (
            <a
              href={
                afterImageUrl
              }
              target="_blank"
              rel="noreferrer"
              className="mt-3 block overflow-hidden rounded-xl border border-slate-200 bg-white"
            >
              <img
                src={
                  afterImageUrl
                }
                alt="Piste proposée"
                className="h-48 w-full object-contain"
              />
            </a>
          ) : (
            <div className="mt-3 flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-5 text-center">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Aucune proposition
                  générée
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Importez d’abord
                  la capture du site
                  actuel.
                </p>
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={
                generateProposal
              }
              disabled={
                !beforeImageUrl ||
                isBusy
              }
              className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingKind ===
              "proposal"
                ? "Génération en cours..."
                : afterImageUrl
                  ? "Régénérer la proposition"
                  : "Générer une proposition LBMedia"}
            </button>

            <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50">
              {loadingKind ===
              "after"
                ? "Import en cours..."
                : afterImageUrl
                  ? "Remplacer manuellement"
                  : "Importer un visuel"}

              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={
                  isBusy
                }
                className="hidden"
                onChange={(
                  event
                ) => {
                  const file =
                    event
                      .target
                      .files?.[0];

                  if (
                    file
                  ) {
                    uploadFile(
                      "after",
                      file
                    );
                  }

                  event.target.value =
                    "";
                }}
              />
            </label>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-700">
            {error}
          </p>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5">
        <div>
          {attachmentUrl ? (
            <>
              <p className="text-sm font-semibold text-emerald-700">
                PDF généré
              </p>

              <a
                href={
                  attachmentUrl
                }
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-sm font-semibold text-indigo-600 transition hover:text-indigo-700"
              >
                Voir le PDF
              </a>
            </>
          ) : (
            <p className="text-sm text-slate-500">
              Une fois les deux
              visuels validés, vous
              pourrez générer la
              présentation PDF.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={
            generatePdf
          }
          disabled={
            !beforeImageUrl ||
            !afterImageUrl ||
            isBusy
          }
          className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loadingKind ===
          "pdf"
            ? "Génération du PDF..."
            : attachmentUrl
              ? "Régénérer le PDF"
              : "Générer le PDF"}
        </button>
      </div>
    </div>
  );
}

type AssetCardProps = {
  title: string;

  imageUrl:
    | string
    | null;

  loading: boolean;

  onFile: (
    file: File
  ) => void;
};

function AssetCard({
  title,
  imageUrl,
  loading,
  onFile,
}: AssetCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
        {title}
      </p>

      {imageUrl ? (
        <a
          href={
            imageUrl
          }
          target="_blank"
          rel="noreferrer"
          className="mt-3 block overflow-hidden rounded-xl border border-slate-200 bg-white"
        >
          <img
            src={
              imageUrl
            }
            alt={title}
            className="h-48 w-full object-contain"
          />
        </a>
      ) : (
        <div className="mt-3 flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-5 text-center text-sm text-slate-400">
          Aucun visuel importé
        </div>
      )}

      <label className="mt-4 inline-flex cursor-pointer items-center justify-center rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50">
        {loading
          ? "Import en cours..."
          : imageUrl
            ? "Remplacer la capture"
            : "Importer la capture"}

        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={
            loading
          }
          className="hidden"
          onChange={(
            event
          ) => {
            const file =
              event
                .target
                .files?.[0];

            if (file) {
              onFile(
                file
              );
            }

            event.target.value =
              "";
          }}
        />
      </label>
    </div>
  );
}