// In-memory mock calendar store for demo purposes
// Mirrors the shapes used by the Outlook endpoints described in backend README

export const dynamic = "force-dynamic";

export type CalendarOrderBy = "start" | "end" | "title";

export type CalendarAttendee = {
  email: string;
  type?: "required" | "optional";
  status?: "accepted" | "declined" | "tentative" | "none";
};

export type CalendarSummary = {
  id: string;
  name: string;
};

export type CalendarEventRecord = {
  id: string;
  calendarId: string;
  title: string;
  description?: string;
  start: string; // ISO
  end: string; // ISO
  allDay?: boolean;
  color?: string;
  location?: string;
  isOnlineMeeting?: boolean;
  attendees?: CalendarAttendee[];
  reminderMinutesBeforeStart?: number;
  responseStatus?: "accepted" | "declined" | "tentative" | "none";
  createdDateTime: string; // ISO
};

type CalendarDB = {
  calendars: CalendarSummary[];
  events: Record<string, CalendarEventRecord>; // id -> event
};

const GLOBAL_KEY = "__OASIS_CALENDAR_DB__" as const;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalAny = globalThis as any;

function toIso(d: Date): string {
  return new Date(d).toISOString();
}

function createInitialDB(): CalendarDB {
  const calendars: CalendarSummary[] = [{ id: "primary", name: "Personal" }];

  const now = new Date();

  // A few sample events around today
  const seed: CalendarEventRecord[] = [
    {
      id: crypto.randomUUID(),
      calendarId: "primary",
      title: "Team Meeting",
      description: "Weekly team sync",
      start: toIso(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0)),
      end: toIso(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0)),
      color: "sky",
      location: "Conference Room A",
      createdDateTime: toIso(now),
      responseStatus: "none",
    },
    {
      id: crypto.randomUUID(),
      calendarId: "primary",
      title: "Product Launch",
      description: "New product release",
      start: toIso(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3)),
      end: toIso(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 6)),
      allDay: true,
      color: "violet",
      createdDateTime: toIso(now),
      responseStatus: "none",
    },
  ];

  const map: Record<string, CalendarEventRecord> = {};
  for (const e of seed) map[e.id] = e;

  return { calendars, events: map };
}

const DB: CalendarDB = globalAny[GLOBAL_KEY] ?? createInitialDB();
globalAny[GLOBAL_KEY] = DB;

export function listEvents(params: {
  calendarId?: string;
  start?: string; // ISO
  end?: string; // ISO
  query?: string;
  limit?: number;
  orderBy?: CalendarOrderBy;
}): CalendarEventRecord[] {
  const {
    calendarId = DB.calendars[0]?.id,
    start,
    end,
    query,
    limit = 200,
    orderBy = "start",
  } = params ?? {};

  const startMs = start ? Date.parse(start) : undefined;
  const endMs = end ? Date.parse(end) : undefined;

  let arr = Object.values(DB.events).filter((e) => e.calendarId === calendarId);

  if (startMs !== undefined) arr = arr.filter((e) => Date.parse(e.end) >= startMs);
  if (endMs !== undefined) arr = arr.filter((e) => Date.parse(e.start) <= endMs);

  if (query) {
    const q = query.toLowerCase();
    arr = arr.filter((e) =>
      [e.title, e.description ?? "", e.location ?? ""].join("\n").toLowerCase().includes(q)
    );
  }

  arr.sort((a, b) => {
    if (orderBy === "title") return a.title.localeCompare(b.title);
    if (orderBy === "end") return Date.parse(a.end) - Date.parse(b.end);
    return Date.parse(a.start) - Date.parse(b.start);
  });

  return arr.slice(0, limit).map((e) => ({ ...e }));
}

export function createEvent(params: {
  calendarId?: string;
  subject: string; // title
  start: string; // ISO
  end: string; // ISO
  body?: string; // description
  location?: string;
  attendees?: CalendarAttendee[];
  isOnlineMeeting?: boolean;
  reminderMinutesBeforeStart?: number;
}): CalendarEventRecord {
  const {
    calendarId = DB.calendars[0]?.id,
    subject,
    start,
    end,
    body,
    location,
    attendees = [],
    isOnlineMeeting,
    reminderMinutesBeforeStart,
  } = params;

  const id = crypto.randomUUID();
  const record: CalendarEventRecord = {
    id,
    calendarId,
    title: subject || "(no title)",
    description: body,
    start,
    end,
    allDay: false,
    color: undefined,
    location,
    attendees,
    isOnlineMeeting,
    reminderMinutesBeforeStart,
    responseStatus: "none",
    createdDateTime: new Date().toISOString(),
  };

  DB.events[id] = record;
  return { ...record };
}

export function deleteEvent(params: { eventId: string; calendarId?: string }): {
  success: boolean;
} {
  const { eventId } = params;
  if (DB.events[eventId]) {
    delete DB.events[eventId];
    return { success: true };
  }
  return { success: false };
}

export function respondToEvent(params: {
  eventId: string;
  response: "accepted" | "tentative" | "declined" | "cancelled";
  comment?: string;
}): { success: boolean } {
  const { eventId, response } = params;
  const evt = DB.events[eventId];
  if (!evt) return { success: false };
  if (response === "cancelled") {
    delete DB.events[eventId];
    return { success: true };
  }
  evt.responseStatus = response as CalendarEventRecord["responseStatus"];
  return { success: true };
}
