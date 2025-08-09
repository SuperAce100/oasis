"use client";

import { useEffect, useState } from "react";

import { EventCalendar, type CalendarEvent } from "@/components/apps/calendar/event-calendar";

export type CalendarAppProps = React.HTMLAttributes<HTMLDivElement>;

type ApiCalendarEvent = {
  id: string;
  title: string;
  description?: string;
  start: string; // ISO
  end: string; // ISO
  allDay?: boolean;
  color?: string;
  location?: string;
};

export function CalendarApp({ className, ...props }: CalendarAppProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/calendar/list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ limit: 200, orderBy: "start" }),
        });
        const data: ApiCalendarEvent[] = await res.json();
        const mapped: CalendarEvent[] = (data ?? []).map((e) => ({
          id: e.id,
          title: e.title,
          description: e.description,
          start: new Date(e.start),
          end: new Date(e.end),
          allDay: e.allDay,
          color: e.color as CalendarEvent["color"],
          location: e.location,
        }));
        setEvents(mapped);
      } catch (_) {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const handleEventAdd = async (event: CalendarEvent) => {
    // Create on server to get canonical id
    try {
      const res = await fetch("/api/calendar/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: event.title,
          start: event.start.toISOString(),
          end: event.end.toISOString(),
          body: event.description ?? "",
          location: event.location,
          isOnlineMeeting: false,
          reminderMinutesBeforeStart: 15,
        }),
      });
      const created: ApiCalendarEvent = await res.json();
      const createdEvent: CalendarEvent = {
        id: created.id,
        title: created.title,
        description: created.description,
        start: new Date(created.start),
        end: new Date(created.end),
        allDay: created.allDay,
        color: created.color as CalendarEvent["color"],
        location: created.location,
      };
      setEvents((prev) => [...prev, createdEvent]);
    } catch (_) {
      // fallback to local add
      setEvents((prev) => [...prev, event]);
    }
  };

  const handleEventUpdate = async (updated: CalendarEvent) => {
    // No dedicated update endpoint in the mock spec; update locally
    setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  };

  const handleEventDelete = async (eventId: string) => {
    try {
      await fetch("/api/calendar/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
    } finally {
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    }
  };

  return (
    <div className={"w-full h-full bg-background " + (className ?? "")} {...props}>
      <EventCalendar
        events={events}
        onEventAdd={handleEventAdd}
        onEventUpdate={handleEventUpdate}
        onEventDelete={handleEventDelete}
      />
      {loading && <div className="p-2 text-xs text-muted-foreground">Loading events…</div>}
    </div>
  );
}

export default CalendarApp;
