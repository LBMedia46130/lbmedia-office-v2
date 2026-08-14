import Link from "next/link";

import PageBanner from "@/components/dashboard/PageBanner";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const GOOGLE_TOKEN_URL =
  "https://oauth2.googleapis.com/token";

const GOOGLE_CALENDAR_EVENTS_URL =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";

type CalendarView =
  | "week"
  | "month"
  | "agenda";

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

type GoogleCalendarConnection = {
  id: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
};

type CalendarResult = {
  success: boolean;
  connected: boolean;
  events: GoogleCalendarEvent[];
  message?: string;
};

type CalendarPageProps = {
  searchParams: Promise<{
    view?: string;
    date?: string;
  }>;
};

function parseView(
  value?: string
): CalendarView {
  if (
    value === "month" ||
    value === "agenda"
  ) {
    return value;
  }

  return "week";
}

function parseReferenceDate(
  value?: string
) {
  if (value) {
    const parsed =
      new Date(`${value}T12:00:00`);

    if (
      !Number.isNaN(
        parsed.getTime()
      )
    ) {
      return parsed;
    }
  }

  return new Date();
}

function formatDateKey(
  date: Date
) {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Europe/Paris",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).format(date);
}

function getEventDateKey(
  event: GoogleCalendarEvent
) {
  const value =
    event.start?.dateTime ??
    event.start?.date;

  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return formatDateKey(date);
}

function startOfWeek(
  date: Date
) {
  const result =
    new Date(date);

  const day =
    result.getDay();

  const diff =
    day === 0
      ? -6
      : 1 - day;

  result.setDate(
    result.getDate() + diff
  );

  result.setHours(
    0,
    0,
    0,
    0
  );

  return result;
}

function endOfWeek(
  date: Date
) {
  const result =
    startOfWeek(date);

  result.setDate(
    result.getDate() + 7
  );

  return result;
}

function startOfMonth(
  date: Date
) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    1,
    0,
    0,
    0,
    0
  );
}

function endOfMonth(
  date: Date
) {
  return new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    1,
    0,
    0,
    0,
    0
  );
}

function getCalendarRange(
  view: CalendarView,
  referenceDate: Date
) {
  if (view === "week") {
    return {
      start:
        startOfWeek(
          referenceDate
        ),
      end:
        endOfWeek(
          referenceDate
        ),
    };
  }

  if (view === "month") {
    const monthStart =
      startOfMonth(
        referenceDate
      );

    const gridStart =
      startOfWeek(
        monthStart
      );

    const monthEnd =
      endOfMonth(
        referenceDate
      );

    const gridEnd =
      endOfWeek(
        monthEnd
      );

    return {
      start: gridStart,
      end: gridEnd,
    };
  }

  const start =
    new Date();

  start.setHours(
    0,
    0,
    0,
    0
  );

  const end =
    new Date(start);

  end.setDate(
    end.getDate() + 60
  );

  return {
    start,
    end,
  };
}

function shiftReferenceDate(
  date: Date,
  view: CalendarView,
  direction: number
) {
  const result =
    new Date(date);

  if (view === "week") {
    result.setDate(
      result.getDate() +
        7 * direction
    );
  } else if (
    view === "month"
  ) {
    result.setMonth(
      result.getMonth() +
        direction
    );
  } else {
    result.setDate(
      result.getDate() +
        30 * direction
    );
  }

  return result;
}

function formatEventTime(
  event: GoogleCalendarEvent
) {
  if (
    !event.start?.dateTime
  ) {
    return "Toute la journée";
  }

  const start =
    new Date(
      event.start.dateTime
    );

  if (
    Number.isNaN(
      start.getTime()
    )
  ) {
    return "";
  }

  const formatter =
    new Intl.DateTimeFormat(
      "fr-FR",
      {
        timeZone:
          "Europe/Paris",
        hour: "2-digit",
        minute: "2-digit",
      }
    );

  const startLabel =
    formatter.format(start);

  if (
    !event.end?.dateTime
  ) {
    return startLabel;
  }

  const end =
    new Date(
      event.end.dateTime
    );

  if (
    Number.isNaN(
      end.getTime()
    )
  ) {
    return startLabel;
  }

  return `${startLabel} – ${formatter.format(
    end
  )}`;
}

function formatLongDate(
  date: Date
) {
  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      timeZone: "Europe/Paris",
      weekday: "long",
      day: "numeric",
      month: "long",
    }
  ).format(date);
}

function formatShortDay(
  date: Date
) {
  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      timeZone: "Europe/Paris",
      weekday: "short",
    }
  ).format(date);
}

function formatMonthTitle(
  date: Date
) {
  const label =
    new Intl.DateTimeFormat(
      "fr-FR",
      {
        timeZone:
          "Europe/Paris",
        month: "long",
        year: "numeric",
      }
    ).format(date);

  return (
    label.charAt(0)
      .toUpperCase() +
    label.slice(1)
  );
}

function formatWeekTitle(
  referenceDate: Date
) {
  const start =
    startOfWeek(
      referenceDate
    );

  const end =
    new Date(start);

  end.setDate(
    end.getDate() + 6
  );

  const startLabel =
    new Intl.DateTimeFormat(
      "fr-FR",
      {
        day: "numeric",
        month: "short",
      }
    ).format(start);

  const endLabel =
    new Intl.DateTimeFormat(
      "fr-FR",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    ).format(end);

  return `${startLabel} – ${endLabel}`;
}

function isSameMonth(
  date: Date,
  referenceDate: Date
) {
  return (
    date.getMonth() ===
      referenceDate.getMonth() &&
    date.getFullYear() ===
      referenceDate.getFullYear()
  );
}

async function refreshAccessToken(
  connection: GoogleCalendarConnection
) {
  const clientId =
    process.env
      .GOOGLE_CALENDAR_CLIENT_ID;

  const clientSecret =
    process.env
      .GOOGLE_CALENDAR_CLIENT_SECRET;

  if (
    !clientId ||
    !clientSecret ||
    !connection.refresh_token
  ) {
    throw new Error(
      "Impossible de renouveler la connexion Google Calendar."
    );
  }

  const response =
    await fetch(
      GOOGLE_TOKEN_URL,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body:
          new URLSearchParams(
            {
              client_id:
                clientId,
              client_secret:
                clientSecret,
              refresh_token:
                connection.refresh_token,
              grant_type:
                "refresh_token",
            }
          ),
        cache: "no-store",
      }
    );

  const result =
    await response.json();

  if (
    !response.ok ||
    !result.access_token
  ) {
    throw new Error(
      result.error_description ??
        result.error ??
        "Impossible de renouveler l’accès à Google Calendar."
    );
  }

  const expiresIn =
    Number(
      result.expires_in ??
        3600
    );

  const expiresAt =
    new Date(
      Date.now() +
        expiresIn * 1000
    ).toISOString();

  const { error } =
    await supabaseAdmin
      .from(
        "google_calendar_connection"
      )
      .update({
        access_token:
          result.access_token,
        expires_at:
          expiresAt,
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        connection.id
      );

  if (error) {
    throw new Error(
      `Impossible de mettre à jour la connexion Google Calendar : ${error.message}`
    );
  }

  return result.access_token as string;
}

async function getAccessToken(
  connection: GoogleCalendarConnection
) {
  if (
    connection.access_token &&
    connection.expires_at
  ) {
    const expiresAt =
      new Date(
        connection.expires_at
      ).getTime();

    const safetyMargin =
      60 * 1000;

    if (
      Date.now() <
      expiresAt -
        safetyMargin
    ) {
      return connection.access_token;
    }
  }

  return refreshAccessToken(
    connection
  );
}

async function getCalendarEvents(
  start: Date,
  end: Date
): Promise<CalendarResult> {
  try {
    const {
      data: connection,
      error:
        connectionError,
    } = await supabaseAdmin
      .from(
        "google_calendar_connection"
      )
      .select(
        "id, access_token, refresh_token, expires_at"
      )
      .limit(1)
      .maybeSingle();

    if (connectionError) {
      throw new Error(
        `Impossible de charger la connexion Google Calendar : ${connectionError.message}`
      );
    }

    if (!connection) {
      return {
        success: true,
        connected: false,
        events: [],
      };
    }

    const accessToken =
      await getAccessToken(
        connection
      );

    const params =
      new URLSearchParams({
        timeMin:
          start.toISOString(),
        timeMax:
          end.toISOString(),
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "250",
      });

    const response =
      await fetch(
        `${GOOGLE_CALENDAR_EVENTS_URL}?${params.toString()}`,
        {
          headers: {
            Authorization:
              `Bearer ${accessToken}`,
          },
          cache: "no-store",
        }
      );

    const result =
      await response.json();

    if (!response.ok) {
      throw new Error(
        result.error
          ?.message ??
          "Impossible de récupérer les événements Google Calendar."
      );
    }

    return {
      success: true,
      connected: true,
      events:
        result.items ?? [],
    };
  } catch (error) {
    return {
      success: false,
      connected: false,
      events: [],
      message:
        error instanceof Error
          ? error.message
          : "Impossible de charger Google Calendar.",
    };
  }
}

export default async function CalendarPage({
  searchParams,
}: CalendarPageProps) {
  const params =
    await searchParams;

  const view =
    parseView(
      params.view
    );

  const referenceDate =
    parseReferenceDate(
      params.date
    );

  const range =
    getCalendarRange(
      view,
      referenceDate
    );

  const calendar =
    await getCalendarEvents(
      range.start,
      range.end
    );

  const events =
    calendar.events ?? [];

  const todayKey =
    formatDateKey(
      new Date()
    );

  const todayEvents =
    events.filter(
      (event) =>
        getEventDateKey(
          event
        ) === todayKey
    );

  const previousDate =
    shiftReferenceDate(
      referenceDate,
      view,
      -1
    );

  const nextDate =
    shiftReferenceDate(
      referenceDate,
      view,
      1
    );

  const today =
    new Date();

  const title =
    view === "week"
      ? formatWeekTitle(
          referenceDate
        )
      : view === "month"
        ? formatMonthTitle(
            referenceDate
          )
        : "Prochains événements";

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <PageBanner
          eyebrow="Organisation"
          title="Calendrier"
          description="Retrouve ici les rendez-vous et événements professionnels synchronisés avec Google Calendar."
        />

        <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_300px]">
          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                    Google Calendar
                  </p>

                  <span
                    className={[
                      "rounded-full px-3 py-1 text-xs font-semibold",
                      calendar.connected
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800",
                    ].join(
                      " "
                    )}
                  >
                    {calendar.connected
                      ? "Connecté"
                      : "Non connecté"}
                  </span>
                </div>

                <h2 className="mt-2 text-xl font-bold text-slate-950">
                  {title}
                </h2>
              </div>

              <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                <ViewLink
                  view="week"
                  currentView={
                    view
                  }
                  date={
                    referenceDate
                  }
                  label="Semaine"
                />

                <ViewLink
                  view="month"
                  currentView={
                    view
                  }
                  date={
                    referenceDate
                  }
                  label="Mois"
                />

                <ViewLink
                  view="agenda"
                  currentView={
                    view
                  }
                  date={
                    referenceDate
                  }
                  label="Agenda"
                />
              </div>
            </div>

            {calendar.connected ? (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-y border-slate-100 py-4">
                <div className="flex items-center gap-2">
                  <Link
                    href={buildCalendarHref(
                      view,
                      previousDate
                    )}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    ←
                  </Link>

                  <Link
                    href={buildCalendarHref(
                      view,
                      today
                    )}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Aujourd’hui
                  </Link>

                  <Link
                    href={buildCalendarHref(
                      view,
                      nextDate
                    )}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    →
                  </Link>
                </div>

                <p className="text-sm font-semibold text-slate-500">
                  {events.length}{" "}
                  événement
                  {events.length >
                  1
                    ? "s"
                    : ""}
                </p>
              </div>
            ) : null}

            {!calendar.connected ? (
              <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                  <CalendarIcon />
                </div>

                <h3 className="mt-5 text-lg font-bold text-slate-950">
                  Google Calendar n’est pas encore connecté
                </h3>

                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
                  Autorise LBMedia
                  Office à lire ton
                  agenda Google.
                </p>

                <a
                  href="/api/google-calendar/connect"
                  className="mt-6 inline-flex rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
                >
                  Connecter Google Calendar
                </a>

                {calendar.message ? (
                  <p className="mt-4 text-xs text-red-600">
                    {
                      calendar.message
                    }
                  </p>
                ) : null}
              </div>
            ) : view ===
              "week" ? (
              <WeekView
                referenceDate={
                  referenceDate
                }
                events={
                  events
                }
              />
            ) : view ===
              "month" ? (
              <MonthView
                referenceDate={
                  referenceDate
                }
                events={
                  events
                }
              />
            ) : (
              <AgendaView
                events={
                  events
                }
              />
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

              {!calendar.connected ||
              todayEvents.length ===
                0 ? (
                <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                  <p className="text-sm font-semibold text-slate-700">
                    Aucun rendez-vous
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Rien de prévu
                    aujourd’hui dans
                    Google Calendar.
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {todayEvents.map(
                    (event) => (
                      <EventMiniCard
                        key={
                          event.id
                        }
                        event={
                          event
                        }
                      />
                    )
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
                LBMedia Office
                affiche les
                événements de Google
                Calendar. Toute
                modification continue
                pour l’instant à se
                faire directement dans
                Google.
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function ViewLink({
  view,
  currentView,
  date,
  label,
}: {
  view: CalendarView;
  currentView: CalendarView;
  date: Date;
  label: string;
}) {
  const active =
    view === currentView;

  return (
    <Link
      href={buildCalendarHref(
        view,
        date
      )}
      className={[
        "rounded-lg px-4 py-2 text-sm font-semibold transition",
        active
          ? "bg-white text-blue-700 shadow-sm"
          : "text-slate-500 hover:text-slate-950",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

function buildCalendarHref(
  view: CalendarView,
  date: Date
) {
  return `/calendar?view=${view}&date=${formatDateKey(
    date
  )}`;
}

function WeekView({
  referenceDate,
  events,
}: {
  referenceDate: Date;
  events: GoogleCalendarEvent[];
}) {
  const start =
    startOfWeek(
      referenceDate
    );

  const days =
    Array.from(
      {
        length: 7,
      },
      (_, index) => {
        const date =
          new Date(start);

        date.setDate(
          date.getDate() +
            index
        );

        return date;
      }
    );

  const todayKey =
    formatDateKey(
      new Date()
    );

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
      <div className="grid grid-cols-1 divide-y divide-slate-200 lg:grid-cols-7 lg:divide-x lg:divide-y-0">
        {days.map(
          (day) => {
            const key =
              formatDateKey(
                day
              );

            const dayEvents =
              events.filter(
                (event) =>
                  getEventDateKey(
                    event
                  ) === key
              );

            const isToday =
              key ===
              todayKey;

            return (
              <div
                key={key}
                className="min-h-72 bg-white"
              >
                <div
                  className={[
                    "border-b border-slate-100 px-3 py-3 text-center",
                    isToday
                      ? "bg-blue-50"
                      : "bg-slate-50",
                  ].join(
                    " "
                  )}
                >
                  <p
                    className={[
                      "text-xs font-bold uppercase tracking-wide",
                      isToday
                        ? "text-blue-700"
                        : "text-slate-500",
                    ].join(
                      " "
                    )}
                  >
                    {formatShortDay(
                      day
                    )}
                  </p>

                  <p
                    className={[
                      "mt-1 text-xl font-bold",
                      isToday
                        ? "text-blue-700"
                        : "text-slate-950",
                    ].join(
                      " "
                    )}
                  >
                    {day.getDate()}
                  </p>
                </div>

                <div className="space-y-2 p-2">
                  {dayEvents.length ===
                  0 ? (
                    <p className="px-2 py-5 text-center text-xs text-slate-400">
                      —
                    </p>
                  ) : (
                    dayEvents.map(
                      (
                        event
                      ) => (
                        <EventWeekCard
                          key={
                            event.id
                          }
                          event={
                            event
                          }
                        />
                      )
                    )
                  )}
                </div>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}

function MonthView({
  referenceDate,
  events,
}: {
  referenceDate: Date;
  events: GoogleCalendarEvent[];
}) {
  const start =
    startOfWeek(
      startOfMonth(
        referenceDate
      )
    );

  const end =
    endOfWeek(
      endOfMonth(
        referenceDate
      )
    );

  const days: Date[] =
    [];

  const cursor =
    new Date(start);

  while (cursor < end) {
    days.push(
      new Date(cursor)
    );

    cursor.setDate(
      cursor.getDate() + 1
    );
  }

  const todayKey =
    formatDateKey(
      new Date()
    );

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
      <div className="hidden grid-cols-7 border-b border-slate-200 bg-slate-50 lg:grid">
        {[
          "Lun",
          "Mar",
          "Mer",
          "Jeu",
          "Ven",
          "Sam",
          "Dim",
        ].map(
          (label) => (
            <div
              key={
                label
              }
              className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-500"
            >
              {label}
            </div>
          )
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-7">
        {days.map(
          (day) => {
            const key =
              formatDateKey(
                day
              );

            const dayEvents =
              events.filter(
                (event) =>
                  getEventDateKey(
                    event
                  ) === key
              );

            const isToday =
              key ===
              todayKey;

            const currentMonth =
              isSameMonth(
                day,
                referenceDate
              );

            return (
              <div
                key={key}
                className={[
                  "min-h-32 border-b border-r border-slate-100 p-2",
                  currentMonth
                    ? "bg-white"
                    : "bg-slate-50",
                ].join(
                  " "
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 lg:hidden">
                    {formatShortDay(
                      day
                    )}
                  </span>

                  <span
                    className={[
                      "flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold",
                      isToday
                        ? "bg-blue-700 text-white"
                        : currentMonth
                          ? "text-slate-900"
                          : "text-slate-400",
                    ].join(
                      " "
                    )}
                  >
                    {day.getDate()}
                  </span>
                </div>

                <div className="mt-2 space-y-1">
                  {dayEvents
                    .slice(
                      0,
                      3
                    )
                    .map(
                      (
                        event
                      ) => (
                        <EventMonthCard
                          key={
                            event.id
                          }
                          event={
                            event
                          }
                        />
                      )
                    )}

                  {dayEvents.length >
                  3 ? (
                    <p className="px-1 text-[11px] font-semibold text-blue-700">
                      +
                      {dayEvents.length -
                        3}{" "}
                      autre
                      {dayEvents.length -
                        3 >
                      1
                        ? "s"
                        : ""}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}

function AgendaView({
  events,
}: {
  events: GoogleCalendarEvent[];
}) {
  if (
    events.length === 0
  ) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
        <p className="font-semibold text-slate-900">
          Aucun événement à venir
        </p>

        <p className="mt-2 text-sm text-slate-500">
          Aucun rendez-vous
          trouvé dans les
          prochains jours.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      {events.map(
        (event) => {
          const value =
            event.start
              ?.dateTime ??
            event.start?.date;

          const date =
            value
              ? new Date(
                  value
                )
              : null;

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
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-700">
                    {date
                      ? formatLongDate(
                          date
                        )
                      : "Date inconnue"}
                  </p>

                  <h3 className="mt-2 font-bold text-slate-950">
                    {event.summary ??
                      "Événement"}
                  </h3>

                  {event.location ? (
                    <p className="mt-2 text-sm text-slate-500">
                      {
                        event.location
                      }
                    </p>
                  ) : null}
                </div>

                <p className="text-sm font-bold text-slate-950">
                  {formatEventTime(
                    event
                  )}
                </p>
              </div>
            </a>
          );
        }
      )}
    </div>
  );
}

function EventWeekCard({
  event,
}: {
  event: GoogleCalendarEvent;
}) {
  const content = (
    <>
      <p className="text-[11px] font-bold text-blue-700">
        {formatEventTime(
          event
        )}
      </p>

      <p className="mt-1 line-clamp-2 text-xs font-semibold leading-4 text-slate-900">
        {event.summary ??
          "Événement"}
      </p>
    </>
  );

  if (
    event.htmlLink
  ) {
    return (
      <a
        href={
          event.htmlLink
        }
        target="_blank"
        rel="noreferrer"
        className="block rounded-lg border border-blue-100 bg-blue-50 p-2 transition hover:border-blue-300"
      >
        {content}
      </a>
    );
  }

  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50 p-2">
      {content}
    </div>
  );
}

function EventMonthCard({
  event,
}: {
  event: GoogleCalendarEvent;
}) {
  const content = (
    <p className="truncate text-[11px] font-semibold text-blue-900">
      {event.start
        ?.dateTime
        ? `${new Intl.DateTimeFormat(
            "fr-FR",
            {
              timeZone:
                "Europe/Paris",
              hour: "2-digit",
              minute: "2-digit",
            }
          ).format(
            new Date(
              event.start
                .dateTime
            )
          )} `
        : ""}
      {event.summary ??
        "Événement"}
    </p>
  );

  if (
    event.htmlLink
  ) {
    return (
      <a
        href={
          event.htmlLink
        }
        target="_blank"
        rel="noreferrer"
        className="block rounded-md bg-blue-50 px-2 py-1 transition hover:bg-blue-100"
      >
        {content}
      </a>
    );
  }

  return (
    <div className="rounded-md bg-blue-50 px-2 py-1">
      {content}
    </div>
  );
}

function EventMiniCard({
  event,
}: {
  event: GoogleCalendarEvent;
}) {
  return (
    <a
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
      className="block rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 transition hover:border-blue-300"
    >
      <p className="text-sm font-semibold text-slate-950">
        {event.summary ??
          "Événement"}
      </p>

      <p className="mt-1 text-xs font-semibold text-blue-700">
        {formatEventTime(
          event
        )}
      </p>
    </a>
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