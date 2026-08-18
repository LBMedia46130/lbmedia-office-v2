"use client";

import {
  useMemo,
  useState,
} from "react";

import type {
  Company,
  PipelineStage,
} from "@/lib/companies";

import CompanyGrid from "./CompanyGrid";

import {
  getPipelineStageMeta,
  pipelineStageOptions,
} from "@/components/ui/PipelineBadge";

type Props = {
  companies: Company[];
};

type ActivityFilter =
  | "all"
  | "active"
  | "inactive";

type RelationshipFilter =
  | "all"
  | "client"
  | "prospect";

type PipelineFilter =
  | "all"
  | PipelineStage;

type SortOption =
  | "name-asc"
  | "name-desc"
  | "city-asc";

type AlphabetFilter =
  | "all"
  | "#"
  | string;

const alphabet = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
];

export default function CompaniesExplorer({
  companies,
}: Props) {
  const [
    search,
    setSearch,
  ] = useState("");

  const [
    activityFilter,
    setActivityFilter,
  ] =
    useState<ActivityFilter>(
      "active"
    );

  const [
    relationshipFilter,
    setRelationshipFilter,
  ] =
    useState<RelationshipFilter>(
      "all"
    );

  const [
    pipelineFilter,
    setPipelineFilter,
  ] =
    useState<PipelineFilter>(
      "all"
    );

  const [
    sortOption,
    setSortOption,
  ] =
    useState<SortOption>(
      "name-asc"
    );

  const [
    alphabetFilter,
    setAlphabetFilter,
  ] =
    useState<AlphabetFilter>(
      "A"
    );

  const activeCount = useMemo(
    () =>
      companies.filter(
        (company) =>
          company.is_active
      ).length,
    [companies]
  );

  const inactiveCount =
    companies.length -
    activeCount;

  const clientCount = useMemo(
    () =>
      companies.filter(
        (company) =>
          company.relationship_status ===
          "client"
      ).length,
    [companies]
  );

  const prospectCount = useMemo(
    () =>
      companies.filter(
        (company) =>
          company.relationship_status ===
          "prospect"
      ).length,
    [companies]
  );

  const pipelineCounts =
    useMemo(() => {
      const counts: Record<
        PipelineStage,
        number
      > = {
        new: 0,
        contact: 0,
        meeting: 0,
        proposal: 0,
        negotiation: 0,
        client: 0,
        lost: 0,
      };

      companies.forEach(
        (company) => {
          counts[
            company.pipeline_stage
          ] += 1;
        }
      );

      return counts;
    }, [companies]);

  const alphabetCounts =
    useMemo(() => {
      const counts: Record<
        string,
        number
      > = {
        "#": 0,
      };

      alphabet.forEach(
        (letter) => {
          counts[letter] =
            0;
        }
      );

      companies.forEach(
        (company) => {
          const firstLetter =
            getCompanyInitial(
              company.name
            );

          if (
            alphabet.includes(
              firstLetter
            )
          ) {
            counts[
              firstLetter
            ] += 1;
          } else {
            counts["#"] +=
              1;
          }
        }
      );

      return counts;
    }, [companies]);

  const visibleCompanies =
    useMemo(() => {
      const normalizedSearch =
        normalizeText(search);

      const filteredCompanies =
        companies.filter(
          (company) => {
            const matchesActivity =
              activityFilter ===
                "all" ||
              (activityFilter ===
                "active" &&
                company.is_active) ||
              (activityFilter ===
                "inactive" &&
                !company.is_active);

            const matchesRelationship =
              relationshipFilter ===
                "all" ||
              company.relationship_status ===
                relationshipFilter;

            const matchesPipeline =
              pipelineFilter ===
                "all" ||
              company.pipeline_stage ===
                pipelineFilter;

            const companyInitial =
              getCompanyInitial(
                company.name
              );

            const matchesAlphabet =
              alphabetFilter ===
                "all" ||
              (alphabetFilter ===
                "#" &&
                !alphabet.includes(
                  companyInitial
                )) ||
              companyInitial ===
                alphabetFilter;

            if (
              !matchesActivity ||
              !matchesRelationship ||
              !matchesPipeline ||
              !matchesAlphabet
            ) {
              return false;
            }

            if (
              !normalizedSearch
            ) {
              return true;
            }

            const pipelineLabel =
              getPipelineStageMeta(
                company.pipeline_stage
              ).label;

            const searchableContent =
              [
                company.name,
                company.legal_name,
                company.email,
                company.phone,
                company.website,
                company.postal_code,
                company.city,
                company.relationship_status,
                pipelineLabel,
              ]
                .filter(Boolean)
                .join(" ");

            return normalizeText(
              searchableContent
            ).includes(
              normalizedSearch
            );
          }
        );

      return [
        ...filteredCompanies,
      ].sort(
        (
          companyA,
          companyB
        ) => {
          if (
            sortOption ===
            "name-desc"
          ) {
            return compareText(
              companyB.name,
              companyA.name
            );
          }

          if (
            sortOption ===
            "city-asc"
          ) {
            const cityComparison =
              compareText(
                companyA.city ||
                  "",
                companyB.city ||
                  ""
              );

            if (
              cityComparison !==
              0
            ) {
              return cityComparison;
            }

            return compareText(
              companyA.name,
              companyB.name
            );
          }

          return compareText(
            companyA.name,
            companyB.name
          );
        }
      );
    }, [
      companies,
      search,
      activityFilter,
      relationshipFilter,
      pipelineFilter,
      sortOption,
      alphabetFilter,
    ]);

  function resetFilters() {
    setSearch("");

    setActivityFilter(
      "active"
    );

    setRelationshipFilter(
      "all"
    );

    setPipelineFilter(
      "all"
    );

    setSortOption(
      "name-asc"
    );

    setAlphabetFilter(
      "all"
    );
  }

  function showAllCompanies() {
    setActivityFilter(
      "all"
    );

    setRelationshipFilter(
      "all"
    );

    setPipelineFilter(
      "all"
    );
  }

  function showClients() {
    setActivityFilter(
      "all"
    );

    setRelationshipFilter(
      "client"
    );

    setPipelineFilter(
      "all"
    );
  }

  function showProspects() {
    setActivityFilter(
      "all"
    );

    setRelationshipFilter(
      "prospect"
    );

    setPipelineFilter(
      "all"
    );
  }

  function showActiveCompanies() {
    setActivityFilter(
      "active"
    );

    setRelationshipFilter(
      "all"
    );

    setPipelineFilter(
      "all"
    );
  }

  function showInactiveCompanies() {
    setActivityFilter(
      "inactive"
    );

    setRelationshipFilter(
      "all"
    );

    setPipelineFilter(
      "all"
    );
  }

  function showPipelineStage(
    stage: PipelineStage
  ) {
    setActivityFilter(
      "all"
    );

    setRelationshipFilter(
      "all"
    );

    setPipelineFilter(
      stage
    );
  }

  const hasActiveFilters =
    search.trim() !== "" ||
    activityFilter !==
      "active" ||
    relationshipFilter !==
      "all" ||
    pipelineFilter !==
      "all" ||
    sortOption !==
      "name-asc" ||
    alphabetFilter !==
      "all";

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 2xl:grid-cols-[minmax(280px,1fr)_190px_190px_210px_190px]">
          <div>
            <label
              htmlFor="company-search"
              className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500"
            >
              Rechercher
            </label>

            <div className="relative">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
              >
                <circle
                  cx="11"
                  cy="11"
                  r="8"
                />

                <path d="m21 21-4.3-4.3" />
              </svg>

              <input
                id="company-search"
                type="search"
                value={
                  search
                }
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target
                      .value
                  )
                }
                placeholder="Nom, ville, email, téléphone..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
          </div>

          <SelectField
            id="company-relationship"
            label="Relation"
            value={
              relationshipFilter
            }
            onChange={(
              value
            ) =>
              setRelationshipFilter(
                value as RelationshipFilter
              )
            }
          >
            <option value="all">
              Clients et prospects
            </option>

            <option value="client">
              Clients uniquement
            </option>

            <option value="prospect">
              Prospects uniquement
            </option>
          </SelectField>

          <SelectField
            id="company-activity"
            label="Activité"
            value={
              activityFilter
            }
            onChange={(
              value
            ) =>
              setActivityFilter(
                value as ActivityFilter
              )
            }
          >
            <option value="all">
              Toutes
            </option>

            <option value="active">
              Actives uniquement
            </option>

            <option value="inactive">
              Inactives uniquement
            </option>
          </SelectField>

          <SelectField
            id="company-pipeline"
            label="Pipeline"
            value={
              pipelineFilter
            }
            onChange={(
              value
            ) =>
              setPipelineFilter(
                value as PipelineFilter
              )
            }
          >
            <option value="all">
              Toutes les étapes
            </option>

            {pipelineStageOptions.map(
              (stage) => (
                <option
                  key={
                    stage.value
                  }
                  value={
                    stage.value
                  }
                >
                  {
                    stage.label
                  }
                </option>
              )
            )}
          </SelectField>

          <SelectField
            id="company-sort"
            label="Trier par"
            value={
              sortOption
            }
            onChange={(
              value
            ) =>
              setSortOption(
                value as SortOption
              )
            }
          >
            <option value="name-asc">
              Nom : A → Z
            </option>

            <option value="name-desc">
              Nom : Z → A
            </option>

            <option value="city-asc">
              Ville : A → Z
            </option>
          </SelectField>
        </div>

        <div className="mt-5 flex flex-col gap-4 border-t border-slate-100 pt-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            <FilterButton
              active={
                activityFilter ===
                  "all" &&
                relationshipFilter ===
                  "all" &&
                pipelineFilter ===
                  "all"
              }
              label={`Toutes · ${companies.length}`}
              activeClassName="bg-blue-600 text-white"
              inactiveClassName="bg-slate-100 text-slate-600 hover:bg-slate-200"
              onClick={
                showAllCompanies
              }
            />

            <FilterButton
              active={
                relationshipFilter ===
                "client"
              }
              label={`Clients · ${clientCount}`}
              activeClassName="bg-blue-600 text-white"
              inactiveClassName="bg-blue-50 text-blue-700 hover:bg-blue-100"
              onClick={
                showClients
              }
            />

            <FilterButton
              active={
                relationshipFilter ===
                "prospect"
              }
              label={`Prospects · ${prospectCount}`}
              activeClassName="bg-amber-500 text-white"
              inactiveClassName="bg-amber-50 text-amber-700 hover:bg-amber-100"
              onClick={
                showProspects
              }
            />

            <FilterButton
              active={
                activityFilter ===
                "active"
              }
              label={`Actives · ${activeCount}`}
              activeClassName="bg-emerald-600 text-white"
              inactiveClassName="bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              onClick={
                showActiveCompanies
              }
            />

            <FilterButton
              active={
                activityFilter ===
                "inactive"
              }
              label={`Inactives · ${inactiveCount}`}
              activeClassName="bg-slate-700 text-white"
              inactiveClassName="bg-slate-100 text-slate-600 hover:bg-slate-200"
              onClick={
                showInactiveCompanies
              }
            />
          </div>

          <div className="flex items-center gap-4">
            <p className="text-sm font-medium text-slate-500">
              {
                visibleCompanies.length
              }{" "}
              résultat
              {visibleCompanies.length >
              1
                ? "s"
                : ""}
            </p>

            {hasActiveFilters ? (
              <button
                type="button"
                onClick={
                  resetFilters
                }
                className="cursor-pointer text-sm font-semibold text-blue-600 transition hover:text-blue-700"
              >
                Réinitialiser
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-5 border-t border-slate-100 pt-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Accès alphabétique
          </p>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() =>
                setAlphabetFilter(
                  "all"
                )
              }
              className={[
                "cursor-pointer rounded-lg px-3 py-2 text-sm font-bold transition",
                alphabetFilter ===
                "all"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              ].join(" ")}
            >
              Toutes
            </button>

            {alphabet.map(
              (letter) => {
                const count =
                  alphabetCounts[
                    letter
                  ] ?? 0;

                const active =
                  alphabetFilter ===
                  letter;

                return (
                  <button
                    key={
                      letter
                    }
                    type="button"
                    disabled={
                      count === 0
                    }
                    onClick={() =>
                      setAlphabetFilter(
                        letter
                      )
                    }
                    className={[
                      "min-w-10 rounded-lg px-2.5 py-2 text-sm font-bold transition",
                      active
                        ? "cursor-pointer bg-blue-600 text-white shadow-sm"
                        : count > 0
                          ? "cursor-pointer border border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          : "cursor-not-allowed border border-slate-100 bg-slate-50 text-slate-300",
                    ].join(
                      " "
                    )}
                    title={`${count} entreprise${
                      count > 1
                        ? "s"
                        : ""
                    }`}
                  >
                    {letter}
                  </button>
                );
              }
            )}

            <button
              type="button"
              disabled={
                alphabetCounts[
                  "#"
                ] === 0
              }
              onClick={() =>
                setAlphabetFilter(
                  "#"
                )
              }
              className={[
                "min-w-10 rounded-lg px-2.5 py-2 text-sm font-bold transition",
                alphabetFilter ===
                "#"
                  ? "cursor-pointer bg-blue-600 text-white shadow-sm"
                  : alphabetCounts[
                        "#"
                      ] > 0
                    ? "cursor-pointer border border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    : "cursor-not-allowed border border-slate-100 bg-slate-50 text-slate-300",
              ].join(" ")}
              title={`${alphabetCounts["#"]} entreprise${
                alphabetCounts[
                  "#"
                ] > 1
                  ? "s"
                  : ""
              }`}
            >
              #
            </button>
          </div>
        </div>

        <div className="mt-5 border-t border-slate-100 pt-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Pipeline commercial
          </p>

          <div className="flex flex-wrap gap-2">
            {pipelineStageOptions.map(
              (stage) => {
                const meta =
                  getPipelineStageMeta(
                    stage.value
                  );

                const active =
                  pipelineFilter ===
                  stage.value;

                return (
                  <button
                    key={
                      stage.value
                    }
                    type="button"
                    onClick={() =>
                      showPipelineStage(
                        stage.value
                      )
                    }
                    className={[
                      "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition",
                      active
                        ? meta.badgeClassName
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                    ].join(
                      " "
                    )}
                  >
                    <span
                      className={[
                        "h-2.5 w-2.5 rounded-full",
                        meta.dotClassName,
                      ].join(
                        " "
                      )}
                    />

                    {
                      meta.label
                    }

                    <span className="opacity-70">
                      ·{" "}
                      {
                        pipelineCounts[
                          stage
                            .value
                        ]
                      }
                    </span>
                  </button>
                );
              }
            )}
          </div>
        </div>
      </section>

      {visibleCompanies.length >
      0 ? (
        <CompanyGrid
          companies={
            visibleCompanies
          }
        />
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
          <h3 className="text-xl font-bold text-slate-900">
            Aucune entreprise trouvée
          </h3>

          <p className="mt-2 text-slate-500">
            Modifiez votre recherche,
            changez de lettre ou
            réinitialisez les filtres.
          </p>

          <button
            type="button"
            onClick={
              resetFilters
            }
            className="mt-6 cursor-pointer rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Afficher les entreprises actives
          </button>
        </div>
      )}
    </div>
  );
}

type SelectFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  children: React.ReactNode;
};

function SelectField({
  id,
  label,
  value,
  onChange,
  children,
}: SelectFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500"
      >
        {label}
      </label>

      <select
        id={id}
        value={value}
        onChange={(
          event
        ) =>
          onChange(
            event.target
              .value
          )
        }
        className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
      >
        {children}
      </select>
    </div>
  );
}

type FilterButtonProps = {
  active: boolean;
  label: string;
  activeClassName: string;
  inactiveClassName: string;
  onClick: () => void;
};

function FilterButton({
  active,
  label,
  activeClassName,
  inactiveClassName,
  onClick,
}: FilterButtonProps) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={[
        "cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition",
        active
          ? activeClassName
          : inactiveClassName,
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function getCompanyInitial(
  value: string
) {
  const normalized =
    normalizeText(
      value
    )
      .toUpperCase()
      .trim();

  return (
    normalized.charAt(
      0
    ) || "#"
  );
}

function normalizeText(
  value: string
) {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLocaleLowerCase(
      "fr"
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function compareText(
  valueA: string,
  valueB: string
) {
  return valueA.localeCompare(
    valueB,
    "fr",
    {
      sensitivity:
        "base",
      ignorePunctuation:
        true,
    }
  );
}