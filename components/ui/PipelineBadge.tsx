import type {
  PipelineStage,
} from "@/lib/companies";

type PipelineStageMeta = {
  label: string;
  dotClassName: string;
  badgeClassName: string;
};

export const pipelineStageOptions: Array<{
  value: PipelineStage;
  label: string;
}> = [
  {
    value: "new",
    label: "Nouveau prospect",
  },
  {
    value: "contact",
    label: "Premier contact",
  },
  {
    value: "meeting",
    label: "Rendez-vous",
  },
  {
    value: "proposal",
    label: "Proposition envoyée",
  },
  {
    value: "negotiation",
    label: "Négociation",
  },
  {
    value: "client",
    label: "Client",
  },
  {
    value: "lost",
    label: "Perdu",
  },
];

export function getPipelineStageMeta(
  stage: PipelineStage
): PipelineStageMeta {
  const stages: Record<
    PipelineStage,
    PipelineStageMeta
  > = {
    new: {
      label: "Nouveau prospect",
      dotClassName: "bg-orange-500",
      badgeClassName:
        "border-orange-200 bg-orange-50 text-orange-700",
    },
    contact: {
      label: "Premier contact",
      dotClassName: "bg-sky-500",
      badgeClassName:
        "border-sky-200 bg-sky-50 text-sky-700",
    },
    meeting: {
      label: "Rendez-vous",
      dotClassName: "bg-violet-500",
      badgeClassName:
        "border-violet-200 bg-violet-50 text-violet-700",
    },
    proposal: {
      label: "Proposition envoyée",
      dotClassName: "bg-amber-500",
      badgeClassName:
        "border-amber-200 bg-amber-50 text-amber-700",
    },
    negotiation: {
      label: "Négociation",
      dotClassName: "bg-fuchsia-500",
      badgeClassName:
        "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
    },
    client: {
      label: "Client",
      dotClassName: "bg-emerald-500",
      badgeClassName:
        "border-emerald-200 bg-emerald-50 text-emerald-700",
    },
    lost: {
      label: "Perdu",
      dotClassName: "bg-slate-500",
      badgeClassName:
        "border-slate-200 bg-slate-100 text-slate-600",
    },
  };

  return stages[stage];
}

type PipelineBadgeProps = {
  stage: PipelineStage;
  compact?: boolean;
};

export default function PipelineBadge({
  stage,
  compact = false,
}: PipelineBadgeProps) {
  const meta =
    getPipelineStageMeta(stage);

  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full border font-semibold",
        meta.badgeClassName,
        compact
          ? "px-2.5 py-1 text-xs"
          : "px-3 py-1.5 text-sm",
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className={[
          "shrink-0 rounded-full",
          meta.dotClassName,
          compact
            ? "h-2 w-2"
            : "h-2.5 w-2.5",
        ].join(" ")}
      />

      {meta.label}
    </span>
  );
}