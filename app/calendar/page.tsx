import PageBanner from "@/components/dashboard/PageBanner";

export const dynamic = "force-dynamic";

type GoogleCalendarEvent = {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  start?: {
    date?: string;
    dateTime?: string;
  };
  end?: {
    date?: string;
    dateTime?: string;
  };
};

type EventsApiResponse = {
  success: boolean;
  connected: boolean;
  events: GoogleCalendarEvent[];
  message?: string;
};

function formatEventDate(
  event: GoogleCalendarEvent
) {
  const value =
    event.start?.dateTime ??
    event.start?.date;

  if (!value) {
    return {
      date: "Date inconnue",
      time: "",
    };
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return {
      date: value,
      time: "",
    };
  }

  const dateLabel =
    new Intl.DateTimeFormat(
      "fr-FR",
      {
        timeZone: "Europe/Paris",
        weekday: "long",
        day: "numeric",
        month: "long",
      }
    ).format(date);

  const timeLabel =
    event.start?.dateTime
      ? new Intl.DateTimeFormat(
          "fr-FR",
          {
            timeZone: "Europe/Paris",
            hour: "2-digit",
            minute: "2-digit",
          }
        ).format(date)
      : "Toute la journée";

  return {
    date: dateLabel,
    time: timeLabel,
  };
}

function isToday(
  event: GoogleCalendarEvent
) {
  const value =
    event.start?.dateTime ??
    event.start?.date;

  if (!value) {
    return false;
  }

  const eventDate =
    new Date(value);

  const now =
    new Date();

  const formatter =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: "Europe/Paris",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    );

  return (
    formatter.format(eventDate) ===
    formatter.format(now)
  );
}

async function getCalendarEvents() {
  const baseUrl =
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

  try {
    const response =
      await fetch(
        `${baseUrl}/api/google-calendar/events`,
        {
          cache: "no-store",
        }
      );

    const result =
      (await response.json()) as EventsApiResponse;

    return result;
  } catch {
    return {
      success: false,
      connected: false,
      events: [],
      message:
        "Impossible de charger Google Calendar.",
    } satisfies EventsApiResponse;
  }
}

export default async function CalendarPage() {
  const calendar =
    await getCalendarEvents();

  const events =
    calendar.events ?? [];

  const todayEvents =
    events.filter(isToday);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <PageBanner
          eyebrow="Organisation"
          title="Calendrier"
          description="Retrouve ici les rendez-vous et événements professionnels synchronisés avec Google Calendar."
        />

        <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_320px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                  Google Calendar
                </p>

                <h2 className="mt-2 text-xl font-bold text-slate-950">
                  Agenda LBMedia
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Événements à venir dans
                  ton agenda Google.
                </p>
              </div>

              <span
                className={[
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  calendar.connected
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800",
                ].join(" ")}
              >
                {calendar.connected
                  ? "Connecté"
                  : "Non connecté"}
              </span>
            </div>

            {!calendar.connected ? (
              <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                  <CalendarIcon />
                </div>

                <h3 className="mt-5 text-lg font-bold text-slate-950">
                  Google Calendar n’est pas encore connecté
                </h3>

                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
                  Autorise LBMedia Office
                  à lire ton agenda Google.
                </p>

                <a
                  href="/api/google-calendar/connect"
                  className="mt-6 inline-flex rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
                >
                  Connecter Google Calendar
                </a>

                {calendar.message ? (
                  <p className="mt-4 text-xs text-red-600">
                    {calendar.message}
                  </p>
                ) : null}
              </div>
            ) : events.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
                <p className="font-semibold text-slate-900">
                  Aucun événement à venir
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Aucun rendez-vous trouvé
                  dans les 60 prochains jours.
                </p>
              </div>
            ) : (
              <div className="mt-8 space-y-3">
                {events.map((event) => {
                  const formatted =
                    formatEventDate(event);

                  return (
                    <a
                      key={event.id}
                      href={
                        event.htmlLink ??
                        "#"
                      }
                      target={
                        event.htmlLink
                          ? "_blank"
                          : undefined
                      }
                      rel={
                        event.htmlLink
                          ? "noreferrer"
                          : undefined
                      }
                      className="block rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-blue-200 hover:shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                            {formatted.date}
                          </p>

                          <h3 className="mt-2 font-bold text-slate-950">
                            {event.summary ??
                              "Événement"}
                          </h3>

                          {event.location ? (
                            <p className="mt-2 text-sm text-slate-500">
                              {event.location}
                            </p>
                          ) : null}
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-sm font-bold text-slate-950">
                            {formatted.time}
                          </p>

                          {event.htmlLink ? (
                            <p className="mt-2 text-xs font-semibold text-blue-700">
                              Ouvrir →
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Aujourd’hui
              </p>

              <h2 className="mt-2 text-lg font-bold text-slate-950">
                Rendez-vous
              </h2>

              {todayEvents.length === 0 ? (
                <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                  <p className="text-sm font-semibold text-slate-700">
                    Aucun rendez-vous
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Rien de prévu aujourd’hui
                    dans Google Calendar.
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {todayEvents.map(
                    (event) => {
                      const formatted =
                        formatEventDate(
                          event
                        );

                      return (
                        <div
                          key={
                            event.id
                          }
                          className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3"
                        >
                          <p className="text-sm font-semibold text-slate-950">
                            {event.summary ??
                              "Événement"}
                          </p>

                          <p className="mt-1 text-xs font-semibold text-blue-700">
                            {
                              formatted.time
                            }
                          </p>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                Synchronisation
              </p>

              <h2 className="mt-2 text-lg font-bold text-blue-950">
                Google reste la référence
              </h2>

              <p className="mt-2 text-sm leading-6 text-blue-800">
                LBMedia Office affiche les
                événements de Google Calendar.
                Toute modification continue
                pour l’instant à se faire
                directement dans Google.
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-7 w-7"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="16"
        rx="2"
      />

      <path d="M16 3v4" />
      <path d="M8 3v4" />
      <path d="M3 10h18" />

      <path d="M8 14h2" />
      <path d="M14 14h2" />
      <path d="M8 17h2" />
      <path d="M14 17h2" />
    </svg>
  );
}