"use client";

import {
  ChangeEvent,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";

type ImportResult = {
  success: boolean;
  message: string;
  created?: number;
  skipped?: number;
  invalid?: number;
};

export default function ImportCompaniesButton() {
  const router = useRouter();

  const inputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const [isImporting, setIsImporting] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  function openFilePicker() {
    if (isImporting) {
      return;
    }

    inputRef.current?.click();
  }

  async function handleFile(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    setIsImporting(true);
    setMessage(null);
    setError(null);

    try {
      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      const response =
        await fetch(
          "/api/companies/import",
          {
            method: "POST",
            body: formData,
          }
        );

      const result =
        (await response.json()) as ImportResult;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Impossible d’importer le fichier."
        );
      }

      setMessage(
        [
          `${result.created ?? 0} client(s) importé(s).`,
          `${result.skipped ?? 0} doublon(s) ignoré(s).`,
          result.invalid
            ? `${result.invalid} ligne(s) incomplète(s) ignorée(s).`
            : null,
        ]
          .filter(Boolean)
          .join(" ")
      );

      router.refresh();
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : "Une erreur est survenue."
      );
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFile}
        className="hidden"
      />

      <button
        type="button"
        onClick={openFilePicker}
        disabled={isImporting}
        className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isImporting
          ? "Import en cours..."
          : "Importer des clients"}
      </button>

      {message ? (
        <p className="max-w-md text-right text-xs font-medium text-emerald-700">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="max-w-md text-right text-xs font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}