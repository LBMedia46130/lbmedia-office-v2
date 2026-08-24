"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type ProposalType =
  | "optimization"
  | "optimization_redesign"
  | "redesign"
  | "new_website";

type AuditProspectionAssetsProps = {
  prospectionId: string;

  proposalType:
    | ProposalType
    | null;

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

const MAX_SCREENSHOT_WIDTH =
  1600;

const MAX_REGULAR_DIMENSION =
  2400;

const JPEG_QUALITIES = [
  0.88,
  0.8,
  0.72,
  0.64,
  0.56,
];

function getPresentationContent(
  proposalType: ProposalType
) {
  switch (
    proposalType
  ) {
    case "optimization":
      return {
        eyebrow:
          "Pièce jointe",

        title:
          "Aucun PDF nécessaire",

        description:
          "La proposition porte sur l’optimisation du site existant. Le message de prospection suffit pour présenter les améliorations identifiées en SEO, visibilité locale, GEO / IA, contenus et conversion.",

        currentLabel:
          "Site actuel",

        proposalLabel:
          "Optimisation",

        generateLabel:
          "Générer une proposition",

        regenerateLabel:
          "Régénérer la proposition",
      };

    case "optimization_redesign":
      return {
        eyebrow:
          "Projection d’évolution",

        title:
          "Illustrer une évolution possible",

        description:
          "La proposition associe des optimisations ciblées à une possibilité de faire évoluer plus largement le site. La projection permet de montrer concrètement jusqu’où cette évolution pourrait aller.",

        currentLabel:
          "Site actuel",

        proposalLabel:
          "Piste d’évolution",

        generateLabel:
          "Générer une piste d’évolution",

        regenerateLabel:
          "Régénérer la piste",
      };

    case "redesign":
      return {
        eyebrow:
          "Projection de refonte",

        title:
          "Illustrer une refonte du site",

        description:
          "La projection permet de comparer le site actuel avec une proposition faisant évoluer sa présentation, son organisation et la mise en valeur des prestations.",

        currentLabel:
          "Site actuel",

        proposalLabel:
          "Projection de refonte",

        generateLabel:
          "Générer une projection de refonte",

        regenerateLabel:
          "Régénérer la projection",
      };

    case "new_website":
      return {
        eyebrow:
          "Nouvelle orientation",

        title:
          "Illustrer une nouvelle direction",

        description:
          "La proposition ne constitue pas une maquette définitive. Elle illustre une orientation possible pour un nouveau site pensé autour des prestations, de la visibilité et de la prise de contact.",

        currentLabel:
          "Site actuel",

        proposalLabel:
          "Nouvelle orientation",

        generateLabel:
          "Générer une nouvelle orientation",

        regenerateLabel:
          "Régénérer l’orientation",
      };
  }
}

export default function AuditProspectionAssets({
  prospectionId,
  proposalType,
  initialBeforeImageUrl,
  initialAfterImageUrl,
  initialAttachmentUrl,
}: AuditProspectionAssetsProps) {
  const router =
    useRouter();

  const effectiveProposalType:
    ProposalType =
    proposalType ??
    "optimization";

  const presentation =
    getPresentationContent(
      effectiveProposalType
    );

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
    file: File,
    kind:
      | "before"
      | "after"
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
      await loadImage(
        file
      );

    const originalWidth =
      image.naturalWidth;

    const originalHeight =
      image.naturalHeight;

    if (
      originalWidth <= 0 ||
      originalHeight <= 0
    ) {
      throw new Error(
        "Impossible de lire les dimensions de l’image."
      );
    }

    let width =
      originalWidth;

    let height =
      originalHeight;

    if (
      kind === "before"
    ) {
      if (
        width >
        MAX_SCREENSHOT_WIDTH
      ) {
        const ratio =
          MAX_SCREENSHOT_WIDTH /
          width;

        width =
          MAX_SCREENSHOT_WIDTH;

        height =
          Math.round(
            height *
              ratio
          );
      }
    } else {
      const largestDimension =
        Math.max(
          width,
          height
        );

      if (
        largestDimension >
        MAX_REGULAR_DIMENSION
      ) {
        const ratio =
          MAX_REGULAR_DIMENSION /
          largestDimension;

        width =
          Math.round(
            width *
              ratio
          );

        height =
          Math.round(
            height *
              ratio
          );
      }
    }

    let currentWidth =
      width;

    let currentHeight =
      height;

    for (
      let resizeAttempt = 0;
      resizeAttempt < 5;
      resizeAttempt += 1
    ) {
      const totalPixels =
        currentWidth *
        currentHeight;

      const MAX_CANVAS_PIXELS =
        30_000_000;

      if (
        totalPixels >
        MAX_CANVAS_PIXELS
      ) {
        const pixelRatio =
          Math.sqrt(
            MAX_CANVAS_PIXELS /
              totalPixels
          );

        currentWidth =
          Math.max(
            900,
            Math.round(
              currentWidth *
                pixelRatio
            )
          );

        currentHeight =
          Math.max(
            900,
            Math.round(
              currentHeight *
                pixelRatio
            )
          );
      }

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

      const nextWidth =
        Math.max(
          900,
          Math.round(
            currentWidth *
              0.82
          )
        );

      if (
        nextWidth ===
        currentWidth
      ) {
        break;
      }

      const ratio =
        nextWidth /
        currentWidth;

      currentWidth =
        nextWidth;

      currentHeight =
        Math.max(
          900,
          Math.round(
            currentHeight *
              ratio
          )
        );
    }

    throw new Error(
      "La capture reste trop volumineuse après optimisation. Essayez avec une capture légèrement moins grande."
    );
  }

  async function uploadFile(
    kind:
      | "before"
      | "after",
    file: File
  ) {
    setLoadingKind(
      kind
    );

    setError(
      null
    );

    try {
      const preparedFile =
        await prepareImageForUpload(
          file,
          kind
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
        kind ===
        "before"
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
    if (
      !beforeImageUrl
    ) {
      setError(
        "Importez d’abord la capture du site actuel."
      );

      return;
    }

    setLoadingKind(
      "proposal"
    );

    setError(
      null
    );

    try {
      const response =
        await fetch(
          `/api/audit-prospections/${prospectionId}/generate-proposal`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                proposalType:
                  effectiveProposalType,
              }),
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
      effectiveProposalType ===
      "optimization"
    ) {
      setError(
        "Aucun PDF n’est nécessaire pour une prospection basée uniquement sur l’optimisation."
      );

      return;
    }

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

    setError(
      null
    );

    try {
      const response =
        await fetch(
          `/api/audit-prospections/${prospectionId}/generate-pdf`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                proposalType:
                  effectiveProposalType,
              }),
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
    loadingKind !==
    null;

  if (
    effectiveProposalType ===
    "optimization"
  ) {
    return (
      <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600">
          {
            presentation.eyebrow
          }
        </p>

        <h3 className="mt-2 text-lg font-bold text-slate-900">
          {
            presentation.title
          }
        </h3>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          {
            presentation.description
          }
        </p>

        {initialAttachmentUrl ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-900">
              Un ancien PDF est encore associé à cette prospection.
            </p>

            <p className="mt-1 text-sm leading-6 text-amber-800">
              Il ne devra pas être envoyé avec une prospection basée uniquement sur l’optimisation.
            </p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-2xl border border-indigo-100 bg-white p-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-500">
          {
            presentation.eyebrow
          }
        </p>

        <h3 className="mt-2 text-lg font-bold text-slate-900">
          {
            presentation.title
          }
        </h3>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          {
            presentation.description
          }
        </p>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <AssetCard
          title={
            presentation.currentLabel
          }
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
            {
              presentation.proposalLabel
            }
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
                alt={
                  presentation.proposalLabel
                }
                className="h-56 w-full object-cover object-top"
              />
            </a>
          ) : (
            <div className="mt-3 flex h-56 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-5 text-center">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Aucune projection générée
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Importez d’abord la capture du site actuel.
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
                  ? presentation.regenerateLabel
                  : presentation.generateLabel}
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

      {effectiveProposalType ===
      "new_website" ? (
        <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-sm font-semibold text-blue-900">
            Projection illustrative
          </p>

          <p className="mt-1 text-sm leading-6 text-blue-800">
            Cette proposition sert à illustrer une direction possible pour un nouveau site. Elle ne constitue ni une maquette définitive ni un BAT.
          </p>
        </div>
      ) : null}

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
              Une fois les deux visuels validés, vous pourrez générer la présentation PDF adaptée à cette proposition.
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
            alt={
              title
            }
            className="h-56 w-full object-cover object-top"
          />
        </a>
      ) : (
        <div className="mt-3 flex h-56 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-5 text-center text-sm text-slate-400">
          Aucun visuel importé
        </div>
      )}

      {imageUrl ? (
        <p className="mt-2 text-xs text-slate-400">
          Aperçu du haut de la capture.
          Cliquez sur l’image pour
          voir la page complète.
        </p>
      ) : null}

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