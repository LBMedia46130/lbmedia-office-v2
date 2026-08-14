"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { useSearchParams } from "next/navigation";

import PublicationEditor from "@/components/news/PublicationEditor";

import type {
  Publication,
  PublicationChannel,
} from "@/lib/news";

type DeclinationTabsProps = {
  publications: Publication[];
};

const channels: {
  key: PublicationChannel;
  label: string;
  description: string;
  activeClass: string;
  inactiveClass: string;
  dotClass: string;
}[] = [
  {
    key: "brevo",
    label: "Brevo",
    description: "Newsletter",
    activeClass:
      "border-orange-300 bg-orange-50 text-orange-800 shadow-sm",
    inactiveClass:
      "border-transparent text-slate-600 hover:border-orange-100 hover:bg-orange-50/60 hover:text-orange-700",
    dotClass: "bg-orange-500",
  },
  {
    key: "google_business",
    label: "Google Business",
    description: "Visibilité locale",
    activeClass:
      "border-emerald-300 bg-emerald-50 text-emerald-800 shadow-sm",
    inactiveClass:
      "border-transparent text-slate-600 hover:border-emerald-100 hover:bg-emerald-50/60 hover:text-emerald-700",
    dotClass: "bg-emerald-500",
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    description: "Réseau pro",
    activeClass:
      "border-sky-300 bg-sky-50 text-sky-800 shadow-sm",
    inactiveClass:
      "border-transparent text-slate-600 hover:border-sky-100 hover:bg-sky-50/60 hover:text-sky-700",
    dotClass: "bg-sky-500",
  },
  {
    key: "facebook",
    label: "Facebook",
    description: "Réseau social",
    activeClass:
      "border-blue-300 bg-blue-50 text-blue-800 shadow-sm",
    inactiveClass:
      "border-transparent text-slate-600 hover:border-blue-100 hover:bg-blue-50/60 hover:text-blue-700",
    dotClass: "bg-blue-600",
  },
];

function isDeclinationChannel(
  value: string | null
): value is PublicationChannel {
  return channels.some(
    (channel) => channel.key === value
  );
}

export default function DeclinationTabs({
  publications,
}: DeclinationTabsProps) {
  const searchParams =
    useSearchParams();

  const requestedChannel =
    searchParams.get("channel");

  const initialChannel =
    isDeclinationChannel(
      requestedChannel
    )
      ? requestedChannel
      : "brevo";

  const [
    activeChannel,
    setActiveChannel,
  ] =
    useState<PublicationChannel>(
      initialChannel
    );

  const tabsRef =
    useRef<HTMLDivElement | null>(
      null
    );

  useEffect(() => {
    if (
      !isDeclinationChannel(
        requestedChannel
      )
    ) {
      return;
    }

    setActiveChannel(
      requestedChannel
    );

    const timeout =
      window.setTimeout(() => {
        tabsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);

    return () => {
      window.clearTimeout(
        timeout
      );
    };
  }, [requestedChannel]);

  const activePublication =
    publications.find(
      (publication) =>
        publication.channel ===
        activeChannel
    );

  const activeChannelConfig =
    channels.find(
      (channel) =>
        channel.key ===
        activeChannel
    );

  return (
    <div
      ref={tabsRef}
      className="scroll-mt-6"
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {channels.map(
            (channel) => {
              const publication =
                publications.find(
                  (item) =>
                    item.channel ===
                    channel.key
                );

              const isActive =
                activeChannel ===
                channel.key;

              return (
                <button
                  key={channel.key}
                  type="button"
                  onClick={() =>
                    setActiveChannel(
                      channel.key
                    )
                  }
                  disabled={!publication}
                  className={[
                    "flex min-h-16 items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200",
                    isActive
                      ? channel.activeClass
                      : channel.inactiveClass,
                    !publication
                      ? "cursor-not-allowed opacity-40"
                      : "",
                  ].join(" ")}
                >
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${channel.dotClass}`}
                  />

                  <span className="min-w-0">
                    <span className="block text-sm font-bold">
                      {channel.label}
                    </span>

                    <span className="mt-0.5 block text-xs font-medium opacity-70">
                      {
                        channel.description
                      }
                    </span>
                  </span>

                  {publication ? (
                    <StatusDot
                      status={
                        publication.status
                      }
                    />
                  ) : null}
                </button>
              );
            }
          )}
        </div>
      </div>

      <div className="mt-5">
        {activePublication &&
        activeChannelConfig ? (
          <PublicationEditor
            key={
              activePublication.id
            }
            publication={
              activePublication
            }
            label={
              activeChannelConfig.label
            }
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-violet-200 bg-gradient-to-br from-violet-50 via-white to-cyan-50 px-6 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <DiffusionIcon />
            </div>

            <p className="mt-4 font-semibold text-slate-900">
              Déclinaison indisponible
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Cette déclinaison n’a pas
              encore été créée.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusDot({
  status,
}: {
  status: string;
}) {
  const styles: Record<
    string,
    string
  > = {
    draft: "bg-slate-400",
    ready: "bg-amber-400",
    scheduled: "bg-cyan-500",
    published: "bg-emerald-500",
    failed: "bg-red-500",
  };

  return (
    <span
      className={`ml-auto h-2.5 w-2.5 shrink-0 rounded-full ${
        styles[status] ??
        "bg-slate-300"
      }`}
      title={status}
    />
  );
}

function DiffusionIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="2"
      />

      <path d="M7.8 7.8a6 6 0 0 0 0 8.4" />
      <path d="M16.2 7.8a6 6 0 0 1 0 8.4" />
      <path d="M4.9 4.9a10 10 0 0 0 0 14.2" />
      <path d="M19.1 4.9a10 10 0 0 1 0 14.2" />
    </svg>
  );
}