import { Router, type IRouter } from "express";
import { and, eq, isNull } from "drizzle-orm";
import {
  db,
  calendarFeedTokensTable,
  bookingsTable,
  clientsTable,
  eventsTable,
  bookingShareLinksTable,
} from "@workspace/db";

const router: IRouter = Router();

function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let remaining = line;
  parts.push(remaining.slice(0, 75));
  remaining = remaining.slice(75);
  while (remaining.length > 0) {
    parts.push(` ${remaining.slice(0, 74)}`);
    remaining = remaining.slice(74);
  }
  return parts.join("\r\n");
}

function asLocalDateTime(date: string, time?: string | null) {
  // date is "YYYY-MM-DD", time is "HH:mm" or "HH:mm:ss"
  const datePart = date.replace(/-/g, "");
  if (!time) return { value: `${datePart}T090000`, allDay: false };
  const timeClean = time.replace(/:/g, "").padEnd(6, "0").slice(0, 6);
  return { value: `${datePart}T${timeClean}`, allDay: false };
}

function buildIcsCalendar(events: Array<{
  uid: string;
  summary: string;
  location: string;
  description?: string;
  startDate: string;
  endDate?: string;
  startTime?: string | null;
  endTime?: string | null;
}>, calendarName: string) {
  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Glam Studio//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcs(calendarName)}`,
    "X-WR-TIMEZONE:America/New_York",
    "BEGIN:VTIMEZONE",
    "TZID:America/New_York",
    "BEGIN:STANDARD",
    "DTSTART:19701101T020000",
    "TZOFFSETFROM:-0400",
    "TZOFFSETTO:-0500",
    "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
    "TZNAME:EST",
    "END:STANDARD",
    "BEGIN:DAYLIGHT",
    "DTSTART:19700308T020000",
    "TZOFFSETFROM:-0500",
    "TZOFFSETTO:-0400",
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
    "TZNAME:EDT",
    "END:DAYLIGHT",
    "END:VTIMEZONE",
  ];

  for (const evt of events) {
    const start = asLocalDateTime(evt.startDate, evt.startTime);
    const fallbackEndTime = evt.endTime ?? null;
    const end = asLocalDateTime(evt.endDate ?? evt.startDate, fallbackEndTime ?? "23:00");

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${evt.uid}`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART;TZID=America/New_York:${start.value}`);
    lines.push(`DTEND;TZID=America/New_York:${end.value}`);
    lines.push(fold(`SUMMARY:${escapeIcs(evt.summary)}`));
    lines.push(fold(`LOCATION:${escapeIcs(evt.location)}`));
    if (evt.description) lines.push(fold(`DESCRIPTION:${escapeIcs(evt.description)}`));
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

router.get("/public/calendar/:token.ics", async (req, res): Promise<void> => {
  const token = req.params.token;
  const [feedToken] = await db
    .select()
    .from(calendarFeedTokensTable)
    .where(and(eq(calendarFeedTokensTable.token, token), isNull(calendarFeedTokensTable.revokedAt)))
    .limit(1);
  if (!feedToken) {
    res.status(404).send("Calendar feed not found");
    return;
  }

  const rows = await db
    .select({ event: eventsTable, booking: bookingsTable, clientName: clientsTable.name })
    .from(eventsTable)
    .innerJoin(bookingsTable, eq(eventsTable.bookingId, bookingsTable.id))
    .innerJoin(clientsTable, eq(bookingsTable.clientId, clientsTable.id))
    .where(isNull(bookingsTable.deletedAt))
    .orderBy(eventsTable.eventDate);

  const ics = buildIcsCalendar(rows.map((r) => ({
    uid: `event-${r.event.id}@glam-studio`,
    summary: `${r.clientName} — ${r.event.eventName}`,
    location: r.booking.location,
    description: `${r.booking.eventType}${r.event.servicesBegin ? ` · Start ${r.event.servicesBegin}` : ""}`,
    startDate: r.event.eventDate,
    startTime: r.event.servicesBegin ?? null,
    endTime: r.event.completionTarget ?? null,
  })), feedToken.label);

  res.set("Content-Type", "text/calendar; charset=utf-8");
  res.set("Cache-Control", "public, max-age=300");
  res.send(ics);
});

router.get("/public/portal/:token/booking.ics", async (req, res): Promise<void> => {
  const token = req.params.token;
  const [link] = await db
    .select()
    .from(bookingShareLinksTable)
    .where(and(eq(bookingShareLinksTable.token, token), isNull(bookingShareLinksTable.revokedAt)))
    .limit(1);
  if (!link) {
    res.status(404).send("Not found");
    return;
  }
  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, link.bookingId));
  if (!booking) {
    res.status(404).send("Not found");
    return;
  }
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, booking.clientId));
  const events = await db.select().from(eventsTable).where(eq(eventsTable.bookingId, booking.id));
  const ics = buildIcsCalendar(events.map((e) => ({
    uid: `event-${e.id}@glam-studio`,
    summary: `${client?.name ?? "Booking"} — ${e.eventName}`,
    location: booking.location,
    description: `${booking.eventType}${e.servicesBegin ? ` · Start ${e.servicesBegin}` : ""}`,
    startDate: e.eventDate,
    startTime: e.servicesBegin ?? null,
    endTime: e.completionTarget ?? null,
  })), `${client?.name ?? "Booking"} — ${booking.eventType}`);

  res.set("Content-Type", "text/calendar; charset=utf-8");
  res.send(ics);
});

export default router;
