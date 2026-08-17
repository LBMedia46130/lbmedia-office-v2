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

type ApiResult = {
  success?: boolean;
  message?: string;

  image_url?: string;

  attachmentUrl?: string;

  prospection?: {
    before_image_url?:
      | string
      | null;

    after_image_url?:
      | string
      | null;

    attachment_url?:
      | string
      | null;
  };
};

const MAX_UPLOAD_BYTES =
  2.5 * 1024 * 1024;

const MAX_IMAGE_DIMENSION =
  2400;

const JPEG_QUALITIES = [
  0.88,
  0.8,
  0.72,
  0.64,
];

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

  async function readApiResponse(
    response: Response
  ): Promise<ApiResult> {
    const raw =
      await response.text();

    if (!raw.trim()) {
      throw new Error(
        response.ok
          ? "Le serveur a renvoyé une réponse vide."
          : `Le serveur a renvoyé une erreur ${response.status} sans message.`
      );
    }

    try {
      return JSON.parse(
        raw
      ) as ApiResult;
    } catch {
      const contentType =
        response.headers.get(
          "content-type"
        );

      console.error(
        "Réponse API non JSON",
        {
          status:
            response.status,

          statusText:
            response.statusText,

          contentType,

          body:
            raw.slice(
              0,
              1000
            ),
        }
      );

      if (
        raw
          .trim()
          .startsWith(
            "<"
          )
      ) {
        throw new Error(
          `Le serveur a renvoyé une erreur HTTP ${response.status} au lieu d’une réponse JSON.`
        );
      }

      throw new Error(
        `Réponse serveur invalide (${response.status}) : ${raw.slice(
          0,
          300
        )}`
      );
    }
  }

  async function prepareImageForUpload(
    file: File
  ): Promise<File> {
    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      throw new Error(
        "Le fichier sélectionné n’est pas une image valide."
      );
    }

    const image =
      await loadImage(file);

    let width =
      image.naturalWidth;

    let height =
      image.naturalHeight;

    if (
      width <= 0 ||
      height <= 0
    ) {
      throw new Error(
        "Impossible de lire les dimensions de l’image."
      );
    }

    const largestDimension =
      Math.max(
        width,
        height
      );

    if (
      largestDimension >
      MAX_IMAGE_DIMENSION
    ) {
      const ratio =
        MAX_IMAGE_DIMENSION /
        largestDimension;

      width =
        Math.round(
          width * ratio
        );

      height =
        Math.round(
          height * ratio
        );
    }

    let currentWidth =
      width;

    let currentHeight =
      height;

    /*
     * Plusieurs tentatives sont possibles :
     * d'abord en jouant sur la qualité JPEG,
     * puis en réduisant encore les dimensions
     * si l'image reste trop volumineuse.
     */
    for (
      let resizeAttempt = 0;
      resizeAttempt < 4;
      resizeAttempt += 1
    ) {
      const canvas =
        document.createElement(
          "canvas"
        );

      canvas.width =
        currentWidth;

      canvas.height =
        currentHeight;

      const context =
        canvas.getContext(
          "2d"
        );

      if (!context) {
        throw new Error(
          "Impossible de préparer la capture pour l’envoi."
        );
      }

      /*
       * Fond blanc avant conversion JPEG.
       * Cela évite un fond noir si le PNG
       * d'origine contient de la transparence.
       */
      context.fillStyle =
        "#ffffff";

      context.fillRect(
        0,
        0,
        currentWidth,
        currentHeight
      );

      context.drawImage(
        image,
        0,
        0,
        currentWidth,
        currentHeight
      );

      for (
        const quality of
        JPEG_QUALITIES
      ) {
        const blob =
          await canvasToBlob(
            canvas,
            "image/jpeg",
            quality
          );

        if (
          blob.size <=
          MAX_UPLOAD_BYTES
        ) {
          const baseName =
            removeFileExtension(
              file.name
            ) ||
            "capture";

          return new File(
            [
              blob,
            ],
            `${baseName}-lbmedia.jpg`,
            {
              type:
                "image/jpeg",

              lastModified:
                Date.now(),
            }
          );
        }
      }

      currentWidth =
        Math.max(
          800,
          Math.round(
            currentWidth *
              0.78
          )
        );

      currentHeight =
        Math.max(
          800,
          Math.round(
            currentHeight *
              0.78
          )
        );
    }

    throw new Error(
      "La capture reste trop volumineuse après optimisation. Essayez avec une image légèrement moins grande."
    );
  }

  async function uploadFile(
    kind:
      | "before"
      | "after",
    file: File
  ) {
    setLoadingKind(kind);
    setError(null);

    try {
      const preparedFile =
        await prepareImageForUpload(
          file
        );

      console.info(
        "Capture préparée pour upload",
        {
          originalName:
            file.name,

          originalSize:
            file.size,

          uploadedName:
            preparedFile.name,

          uploadedSize:
            preparedFile.size,

          uploadedType:
            preparedFile.type,
        }
      );

      const formData =
        new FormData();

      formData.append(
        "kind",
        kind
      );

      formData.append(
        "file",
        preparedFile
      );

      const response =
        await fetch(
          `/api/audit-prospections/${prospectionId}/assets`,
          {
            method:
              "POST",

            body:
              formData,
          }
        );

      const result =
        await readApiResponse(
          response
        );

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ??
            `Impossible d’importer le visuel (${response.status}).`
        );
      }

      if (
        kind === "before"
      ) {
        const newUrl =
          result.prospection
            ?.before_image_url;

        if (!newUrl) {
          throw new Error(
            "L’image a été importée mais aucune URL n’a été retournée."
          );
        }

        setBeforeImageUrl(
          newUrl
        );
      } else {
        const newUrl =
          result.prospection
            ?.after_image_url;

        if (!newUrl) {
          throw new Error(
            "L’image a été importée mais aucune URL n’a été retournée."
          );
        }

        setAfterImageUrl(
          newUrl
        );
      }

      /*
       * Toute modification d'un visuel
       * invalide le PDF précédemment généré.
       */
      setAttachmentUrl(
        null
      );

      router.refresh();
    } catch (
      uploadError
    ) {
      console.error(
        "Erreur import visuel prospection",
        uploadError
      );

      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Une erreur est survenue pendant l’import du visuel."
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
        await readApiResponse(
          response
        );

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ??
            `Impossible de générer la proposition visuelle (${response.status}).`
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
    } catch (
      proposalError
    ) {
      console.error(
        "Erreur génération proposition visuelle",
        proposalError
      );

      setError(
        proposalError instanceof Error
          ? proposalError.message
          : "Une erreur est survenue pendant la génération de la proposition."
      );
    } finally {
      setLoadingKind(
        null
      );
    }
  }

  async function generatePdf() {
    if (
      !beforeImageUrl ||
      !afterImageUrl
    ) {
      setError(
        "Les deux visuels doivent être disponibles avant de générer le PDF."
      );

      return;
    }

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
        await readApiResponse(
          response
        );

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ??
            `Impossible de générer le PDF (${response.status}).`
        );
      }

      const newAttachmentUrl =
        result.attachmentUrl ??
        result.prospection
          ?.attachment_url;

      if (
        !newAttachmentUrl
      ) {
        throw new Error(
          "Le PDF a été généré mais aucune URL n’a été retournée."
        );
      }

      setAttachmentUrl(
        newAttachmentUrl
      );

      router.refresh();
    } catch (
      pdfError
    ) {
      console.error(
        "Erreur génération PDF prospection",
        pdfError
      );

      setError(
        pdfError instanceof Error
          ? pdfError.message
          : "Une erreur est survenue pendant la génération du PDF."
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
          disabled={
            isBusy
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

            <label
              className={`inline-flex items-center justify-center rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 transition ${
                isBusy
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-pointer hover:bg-indigo-50"
              }`}
            >
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

                  if (file) {
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

  disabled: boolean;

  onFile: (
    file: File
  ) => void;
};

function AssetCard({
  title,
  imageUrl,
  loading,
  disabled,
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

      <label
        className={`mt-4 inline-flex items-center justify-center rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 transition ${
          disabled
            ? "cursor-not-allowed opacity-50"
            : "cursor-pointer hover:bg-indigo-50"
        }`}
      >
        {loading
          ? "Optimisation et import..."
          : imageUrl
            ? "Remplacer la capture"
            : "Importer la capture"}

        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={
            disabled
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

function loadImage(
  file: File
): Promise<HTMLImageElement> {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      const image =
        new Image();

      const objectUrl =
        URL.createObjectURL(
          file
        );

      image.onload =
        () => {
          URL.revokeObjectURL(
            objectUrl
          );

          resolve(
            image
          );
        };

      image.onerror =
        () => {
          URL.revokeObjectURL(
            objectUrl
          );

          reject(
            new Error(
              "Impossible de lire l’image sélectionnée."
            )
          );
        };

      image.src =
        objectUrl;
    }
  );
}

function canvasToBlob(
  canvas:
    HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(
              new Error(
                "Impossible d’optimiser la capture."
              )
            );

            return;
          }

          resolve(
            blob
          );
        },
        type,
        quality
      );
    }
  );
}

function removeFileExtension(
  filename: string
) {
  const lastDot =
    filename.lastIndexOf(
      "."
    );

  if (
    lastDot <= 0
  ) {
    return filename;
  }

  return filename.slice(
    0,
    lastDot
  );
}