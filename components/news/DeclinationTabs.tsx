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
}[] = [
  {
    key: "brevo",
    label: "Brevo",
  },
  {
    key: "google_business",
    label: "Google Business",
  },
  {
    key: "linkedin",
    label: "LinkedIn",
  },
  {
    key: "facebook",
    label: "Facebook",
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
      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
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
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? "bg-slate-950 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                {channel.label}
              </button>
            );
          }
        )}
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
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
            <p className="font-semibold text-slate-900">
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