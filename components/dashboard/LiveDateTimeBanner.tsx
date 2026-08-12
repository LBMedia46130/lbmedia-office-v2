"use client";

import { useEffect, useState } from "react";

type LiveDateTimeBannerProps = {
  initialDate: string;
  initialTime: string;
};

function getParisDate() {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

function getParisTime() {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .format(new Date())
    .replace(":", "h")
    .replace(":", "m");
}

export default function LiveDateTimeBanner({
  initialDate,
  initialTime,
}: LiveDateTimeBannerProps) {
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);

  useEffect(() => {
    function updateDateTime() {
      setDate(getParisDate());
      setTime(getParisTime());
    }

    updateDateTime();

    const timer = window.setInterval(
      updateDateTime,
      1000
    );

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  return (
    <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 px-6 py-5 text-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">
            Aujourd’hui
          </p>

          <p className="mt-1 text-lg font-semibold">
            Nous sommes le {date}
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-xl bg-white/10 px-5 py-3 backdrop-blur-sm">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-6 w-6 text-blue-100"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="9"
            />

            <path d="M12 7v5l3 2" />
          </svg>

          <div>
            <p className="text-xs font-medium text-blue-100">
              Il est
            </p>

            <p className="text-xl font-bold tracking-tight tabular-nums">
              {time}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}