"use client";

import {
  ChangeEvent,
  useRef,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type WebEnrichmentResult = {
  website: string;
  phone: string;
  email: string;
  logo_url: string;
  business_description: string;
  linkedin_url: string;
  facebook_url: string;
  confidence:
    | "high"
    | "medium"
    | "low";
};

type CompanyWebEnrichmentProps = {
  companyId: string;
  initialLogoUrl?: string | null;
  initialLinkedinUrl?: string | null;
  initialFacebookUrl?: string | null;
  initialBusinessDescription?: string | null;
};

type LogoResponse = {
  success?: boolean;
  logoUrl?: string;
  message?: string;
};

export default function CompanyWebEnrichment({
  companyId,
  initialLogoUrl,
  initialLinkedinUrl,
  initialFacebookUrl,
  initialBusinessDescription,
}: CompanyWebEnrichmentProps) {
  const router =
    useRouter();

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const initiallyEnriched =
    Boolean(
      initialLogoUrl ||
        initialLinkedinUrl ||
        initialFacebookUrl ||
        initialBusinessDescription
    );

  const [
    enrichment,
    setEnrichment,
  ] =
    useState<WebEnrichmentResult | null>(
      null
    );

  const [
    currentLogoUrl,
    setCurrentLogoUrl,
  ] =
    useState<string | null>(
      initialLogoUrl ??
        null
    );

  const [
    isSearching,
    setIsSearching,
  ] = useState(false);

  const [
    isImporting,
    setIsImporting,
  ] = useState(false);

  const [
    isSavingLogo,
    setIsSavingLogo,
  ] = useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  const [
    success,
    setSuccess,
  ] =
    useState<string | null>(
      null
    );

  const [
    isEnriched,
    setIsEnriched,
  ] = useState(
    initiallyEnriched
  );

  async function searchPublicInformation() {
    const response =
      await fetch(
        `/api/companies/${companyId}/web-enrichment`,
        {
          method:
            "POST",
        }
      );

    const data =
      await response.json();

    if (
      !response.ok ||
      !data.success
    ) {
      throw new Error(
        data.message ||
          "Recherche impossible."
      );
    }

    return data.enrichment as WebEnrichmentResult;
  }

  async function importPublicInformation(
    result: WebEnrichmentResult
  ) {
    const response =
      await fetch(
        `/api/companies/${companyId}/web-enrichment/import`,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              website:
                result.website,

              phone:
                result.phone,

              email:
                result.email,

              business_description:
                result.business_description,

              linkedin_url:
                result.linkedin_url,

              facebook_url:
                result.facebook_url,
            }),
        }
      );

    const data =
      await response.json();

    if (
      !response.ok ||
      !data.success
    ) {
      throw new Error(
        data.message ||
          "Import impossible."
      );
    }

    return data;
  }

  async function handleSearch() {
    setIsSearching(
      true
    );

    setError(null);
    setSuccess(null);
    setEnrichment(null);

    try {
      const result =
        await searchPublicInformation();

      setEnrichment(
        result
      );
    } catch (
      searchError
    ) {
      setError(
        searchError instanceof Error
          ? searchError.message
          : "Recherche impossible."
      );
    } finally {
      setIsSearching(
        false
      );
    }
  }

  async function handleRefresh() {
    await handleSearch();
  }

  async function handleImport() {
    if (!enrichment) {
      return;
    }

    setIsImporting(
      true
    );

    setError(null);
    setSuccess(null);

    try {
      const data =
        await importPublicInformation(
          enrichment
        );

      const updated =
        Array.isArray(
          data.updated
        )
          ? data.updated
          : [];

      if (
        updated.length ===
        0
      ) {
        setSuccess(
          "Aucune donnée vide à compléter."
        );
      } else {
        setSuccess(
          "Informations publiques importées."
        );
      }

      setIsEnriched(
        true
      );

      router.refresh();
    } catch (
      importError
    ) {
      setError(
        importError instanceof Error
          ? importError.message
          : "Import impossible."
      );
    } finally {
      setIsImporting(
        false
      );
    }
  }

  async function saveRemoteLogo(
    sourceUrl: string
  ) {
    setIsSavingLogo(
      true
    );

    setError(null);
    setSuccess(null);

    try {
      const response =
        await fetch(
          `/api/companies/${companyId}/logo`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                sourceUrl,
              }),
          }
        );

      const result =
        (await response.json()) as LogoResponse;

      if (
        !response.ok ||
        !result.success ||
        !result.logoUrl
      ) {
        throw new Error(
          result.message ||
            "Impossible d’enregistrer le logo."
        );
      }

      setCurrentLogoUrl(
        result.logoUrl
      );

      setSuccess(
        "Logo validé et enregistré dans Office."
      );

      setIsEnriched(
        true
      );

      router.refresh();
    } catch (
      logoError
    ) {
      setError(
        logoError instanceof Error
          ? logoError.message
          : "Impossible d’enregistrer le logo."
      );
    } finally {
      setIsSavingLogo(
        false
      );
    }
  }

  async function uploadLogoFile(
    file: File
  ) {
    setIsSavingLogo(
      true
    );

    setError(null);
    setSuccess(null);

    try {
      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      const response =
        await fetch(
          `/api/companies/${companyId}/logo`,
          {
            method:
              "POST",

            body:
              formData,
          }
        );

      const result =
        (await response.json()) as LogoResponse;

      if (
        !response.ok ||
        !result.success ||
        !result.logoUrl
      ) {
        throw new Error(
          result.message ||
            "Impossible d’importer le logo."
        );
      }

      setCurrentLogoUrl(
        result.logoUrl
      );

      setSuccess(
        "Logo importé et enregistré dans Office."
      );

      setIsEnriched(
        true
      );

      router.refresh();
    } catch (
      uploadError
    ) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Impossible d’importer le logo."
      );
    } finally {
      setIsSavingLogo(
        false
      );

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          "";
      }
    }
  }

  async function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files
        ?.item(0);

    if (!file) {
      return;
    }

    await uploadLogoFile(
      file
    );
  }

  async function handleDeleteLogo() {
    setIsSavingLogo(
      true
    );

    setError(null);
    setSuccess(null);

    try {
      const response =
        await fetch(
          `/api/companies/${companyId}/logo`,
          {
            method:
              "DELETE",
          }
        );

      const result =
        (await response.json()) as LogoResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Impossible de supprimer le logo."
        );
      }

      setCurrentLogoUrl(
        null
      );

      setSuccess(
        "Logo supprimé de la fiche."
      );

      router.refresh();
    } catch (
      deleteError
    ) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Impossible de supprimer le logo."
      );
    } finally {
      setIsSavingLogo(
        false
      );
    }
  }

  const foundLogoUrl =
    enrichment
      ?.logo_url
      ?.trim() ||
    "";

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
            Présence web
          </p>

          <p className="mt-1 text-sm text-slate-600">
            {isEnriched
              ? "Les informations publiques de cette entreprise ont déjà été enrichies."
              : "Recherche des coordonnées, du logo et de la présence publique de l’entreprise sur Internet."}
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void (
              isEnriched
                ? handleRefresh()
                : handleSearch()
            )
          }
          disabled={
            isSearching ||
            isImporting ||
            isSavingLogo
          }
          className="rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSearching
            ? "Recherche en cours..."
            : isEnriched
              ? "Actualiser les informations publiques"
              : "Rechercher les informations publiques"}
        </button>
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              Logo client
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Le logo validé ici sera utilisé dans les documents commerciaux.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              ref={
                fileInputRef
              }
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={(
                event
              ) =>
                void handleFileChange(
                  event
                )
              }
              className="hidden"
            />

            <button
              type="button"
              onClick={() =>
                fileInputRef.current
                  ?.click()
              }
              disabled={
                isSavingLogo
              }
              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
            >
              {currentLogoUrl
                ? "Remplacer le logo"
                : "Importer un logo"}
            </button>

            {currentLogoUrl ? (
              <button
                type="button"
                onClick={() =>
                  void handleDeleteLogo()
                }
                disabled={
                  isSavingLogo
                }
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
              >
                Supprimer
              </button>
            ) : null}
          </div>
        </div>

        {currentLogoUrl ? (
          <LogoPreview
            src={
              currentLogoUrl
            }
            alt="Logo validé de l’entreprise"
            size="compact"
          />
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
            <p className="text-sm font-semibold text-slate-600">
              Aucun logo validé
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Lance une recherche web ou importe directement le logo.
            </p>
          </div>
        )}
      </div>

      {error ? (
        <p className="mt-4 text-sm font-medium text-red-600">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="mt-4 text-sm font-semibold text-emerald-600">
          {success}
        </p>
      ) : null}

      {enrichment ? (
        <div className="mt-5 border-t border-slate-200 pt-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-bold text-slate-900">
                Informations trouvées
              </p>

              <ConfidenceBadge
                confidence={
                  enrichment.confidence
                }
              />
            </div>

            <button
              type="button"
              onClick={() =>
                void handleImport()
              }
              disabled={
                isImporting ||
                isSavingLogo ||
                enrichment.confidence ===
                  "low"
              }
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isImporting
                ? "Import en cours..."
                : isEnriched
                  ? "Compléter la fiche"
                  : "Importer dans la fiche"}
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ResultBlock
              label="Site internet"
              value={
                enrichment.website
              }
              link
            />

            <ResultBlock
              label="Téléphone"
              value={
                enrichment.phone
              }
            />

            <ResultBlock
              label="E-mail"
              value={
                enrichment.email
              }
            />

            <ResultBlock
              label="LinkedIn"
              value={
                enrichment.linkedin_url
              }
              link
            />

            <ResultBlock
              label="Facebook"
              value={
                enrichment.facebook_url
              }
              link
            />

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                Logo proposé
              </p>

              {!foundLogoUrl ? (
                <div className="mt-3">
                  <p className="text-sm text-slate-400">
                    Non trouvé
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      fileInputRef.current
                        ?.click()
                    }
                    disabled={
                      isSavingLogo
                    }
                    className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Importer manuellement
                  </button>
                </div>
              ) : (
                <>
                  <LogoPreview
                    src={
                      foundLogoUrl
                    }
                    alt="Logo proposé par la recherche web"
                    size="large"
                  />

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void saveRemoteLogo(
                          foundLogoUrl
                        )
                      }
                      disabled={
                        isSavingLogo
                      }
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {isSavingLogo
                        ? "Enregistrement..."
                        : "Utiliser ce logo"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        fileInputRef.current
                          ?.click()
                      }
                      disabled={
                        isSavingLogo
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      Choisir un autre logo
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {enrichment.business_description ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                Activité
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-700">
                {
                  enrichment.business_description
                }
              </p>
            </div>
          ) : null}

          <p className="mt-4 text-xs leading-5 text-slate-400">
            Les coordonnées complètent uniquement les champs vides.
            Le logo n’est jamais enregistré automatiquement : il doit être validé ou importé manuellement.
          </p>
        </div>
      ) : null}

      {!enrichment &&
      isEnriched ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {initialLinkedinUrl ? (
            <SocialLink
              label="LinkedIn"
              href={
                initialLinkedinUrl
              }
            />
          ) : null}

          {initialFacebookUrl ? (
            <SocialLink
              label="Facebook"
              href={
                initialFacebookUrl
              }
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

type ResultBlockProps = {
  label: string;
  value: string;
  link?: boolean;
};

function ResultBlock({
  label,
  value,
  link = false,
}: ResultBlockProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>

      {!value ? (
        <p className="mt-2 text-sm text-slate-400">
          Non trouvé
        </p>
      ) : link ? (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="mt-2 block break-all text-sm font-semibold text-blue-600 transition hover:text-blue-700"
        >
          {value}
        </a>
      ) : (
        <p className="mt-2 break-words text-sm font-semibold text-slate-800">
          {value}
        </p>
      )}
    </div>
  );
}

function LogoPreview({
  src,
  alt,
  size,
}: {
  src: string;
  alt: string;
  size:
    | "compact"
    | "large";
}) {
  const sizeClasses =
    size === "compact"
      ? "min-h-20 max-w-xs"
      : "min-h-24 w-full";

  return (
    <div
      className={`relative mt-3 flex items-center justify-center overflow-hidden rounded-lg border border-slate-200 p-3 ${sizeClasses}`}
      style={{
        backgroundColor:
          "#ffffff",

        backgroundImage: `
          linear-gradient(45deg, #e2e8f0 25%, transparent 25%),
          linear-gradient(-45deg, #e2e8f0 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, #e2e8f0 75%),
          linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)
        `,

        backgroundSize:
          "20px 20px",

        backgroundPosition:
          "0 0, 0 10px, 10px -10px, -10px 0px",
      }}
    >
      <img
        src={src}
        alt={alt}
        className="relative z-10 max-h-20 max-w-full object-contain"
      />
    </div>
  );
}

function SocialLink({
  label,
  href,
}: {
  label: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
    >
      {label} ↗
    </a>
  );
}

function ConfidenceBadge({
  confidence,
}: {
  confidence:
    | "high"
    | "medium"
    | "low";
}) {
  const label =
    confidence ===
    "high"
      ? "Fiabilité élevée"
      : confidence ===
          "medium"
        ? "À vérifier"
        : "Fiabilité faible";

  const classes =
    confidence ===
    "high"
      ? "bg-emerald-50 text-emerald-700"
      : confidence ===
          "medium"
        ? "bg-amber-50 text-amber-700"
        : "bg-red-50 text-red-700";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${classes}`}
    >
      {label}
    </span>
  );
}