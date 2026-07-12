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

// Folds long content lines per RFC 5545 on UTF-8 OCTET boundaries (75 octets, continuation
// lines prefixed with a space). Byte-aware so a multi-byte character (em-dash, emoji, accent)
// is never split across a fold — which would corrupt the value in Apple Calendar.
function fold(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const chunks: string[] = [];
  let start = 0;
  let limit = 75; // first line 75 octets; continuation lines are " " + 74 octets
  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length);
    if (end < bytes.length) {
      // Back up over UTF-8 continuation bytes (10xxxxxx) so we cut on a char boundary.
      while (end > start && (bytes[end] & 0xc0) === 0x80) end--;
    }
    chunks.push((start === 0 ? "" : " ") + bytes.subarray(start, end).toString("utf8"));
    start = end;
    limit = 74;
  }
  return chunks.join("\r\n");
}

function money(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;
}

// Parses a stored time into ICS "HHMMSS" (24-hour). Accepts 12-hour ("1:00 PM",
// "6:00 AM", "12:00 PM"=noon, "12:00 AM"=midnight) and 24-hour ("13:00", "09:30")
// formats. Returns null when the time is empty or unparseable (→ all-day event).
function parseHms(time?: string | null): string | null {
  if (!time) return null;
  const m = time.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?$/);
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = Number(m[2]);
  const meridiem = m[3]?.toUpperCase();
  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}${String(minute).padStart(2, "0")}00`;
}

// Adds `hours` to an "HHMMSS" string, clamped to the end of the same day.
function addHours(hms: string, hours: number): string {
  const total = Math.min(23 * 60 + 59, Number(hms.slice(0, 2)) * 60 + Number(hms.slice(2, 4)) + hours * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}${String(total % 60).padStart(2, "0")}00`;
}

// Shifts a "YYYYMMDD" string by `delta` days (UTC-safe across month/year boundaries).
function shiftDay(ymd: string, delta: number): string {
  const dt = new Date(Date.UTC(Number(ymd.slice(0, 4)), Number(ymd.slice(4, 6)) - 1, Number(ymd.slice(6, 8))));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return `${dt.getUTCFullYear()}${String(dt.getUTCMonth() + 1).padStart(2, "0")}${String(dt.getUTCDate()).padStart(2, "0")}`;
}

// "YYYYMMDD" → the next calendar day (all-day DTEND is exclusive in iCalendar).
function nextDay(ymd: string): string {
  return shiftDay(ymd, 1);
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
    const startYmd = evt.startDate.replace(/-/g, "");
    const startHms = parseHms(evt.startTime);

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${evt.uid}`);
    lines.push(`DTSTAMP:${now}`);
    lines.push("SEQUENCE:0");

    if (!startHms) {
      // No usable time → all-day event (DTEND is the exclusive next day).
      lines.push(`DTSTART;VALUE=DATE:${startYmd}`);
      lines.push(`DTEND;VALUE=DATE:${nextDay(evt.endDate ? evt.endDate.replace(/-/g, "") : startYmd)}`);
    } else {
      const endYmd = (evt.endDate ?? evt.startDate).replace(/-/g, "");
      let endHms = parseHms(evt.endTime);
      // If the end is missing or not after the start (same day), give it a 2h default.
      if (!endHms || (endYmd === startYmd && endHms <= startHms)) endHms = addHours(startHms, 2);
      lines.push(`DTSTART;TZID=America/New_York:${startYmd}T${startHms}`);
      lines.push(`DTEND;TZID=America/New_York:${endYmd}T${endHms}`);
    }

    lines.push(fold(`SUMMARY:${escapeIcs(evt.summary)}`));
    if (evt.location) lines.push(fold(`LOCATION:${escapeIcs(evt.location)}`));
    if (evt.description) lines.push(fold(`DESCRIPTION:${escapeIcs(evt.description)}`));
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

// Outstanding balance = grand total minus the retainer (only once it's been paid). Matches
// the app's balance-due math; on-day add-ons are intentionally excluded from this pre-event figure.
function bookingBalanceDue(b: typeof bookingsTable.$inferSelect): number {
  const grand = parseFloat(b.grandTotal as unknown as string) || 0;
  const retainer = parseFloat(b.retainerAmount as unknown as string) || 0;
  return Math.max(0, grand - (b.retainerPaid ? retainer : 0));
}

function serviceBreakdown(e: typeof eventsTable.$inferSelect): string {
  const parts: string[] = [];
  if (e.hairAndMakeupCount) parts.push(`${e.hairAndMakeupCount} Hair & Makeup`);
  if (e.hairOnlyCount) parts.push(`${e.hairOnlyCount} Hair Only`);
  if (e.makeupOnlyCount) parts.push(`${e.makeupOnlyCount} Makeup Only`);
  return parts.join(", ");
}

// Rich notes body for a service event (rendered in Apple Calendar's Notes field).
function serviceEventNotes(e: typeof eventsTable.$inferSelect, b: typeof bookingsTable.$inferSelect, clientName: string): string {
  const grand = parseFloat(b.grandTotal as unknown as string) || 0;
  const retainer = parseFloat(b.retainerAmount as unknown as string) || 0;
  const breakdown = serviceBreakdown(e);
  const lines = [
    `Client: ${clientName}`,
    `Type: ${b.eventType}${e.kind === "trial" ? " · Trial" : ""}`,
  ];
  if (breakdown) lines.push(`Services: ${breakdown}`);
  if (e.servicesBegin || e.completionTarget) {
    lines.push(`Window: ${e.servicesBegin ?? "TBD"}${e.completionTarget ? ` – ${e.completionTarget}` : ""}`);
  }
  lines.push("—");
  lines.push(`Total: ${money(grand)}`);
  lines.push(`Retainer: ${money(retainer)} — ${b.retainerPaid ? "paid" : "unpaid"}`);
  lines.push(`Balance: ${money(bookingBalanceDue(b))} — ${b.balancePaid ? "paid" : "due"}`);
  if (b.paymentMethod) lines.push(`Pay to: ${b.paymentMethod}`);
  lines.push(`Booking #${b.id}`);
  return lines.join("\n");
}

// Rich notes body for a payment-due reminder. Enumerates the retainer and balance lines
// explicitly so the entry conveys real urgency (e.g. retainer "DUE NOW").
function paymentDueNotes(b: typeof bookingsTable.$inferSelect, clientName: string, dueLabel: string): string {
  const grand = parseFloat(b.grandTotal as unknown as string) || 0;
  const retainer = parseFloat(b.retainerAmount as unknown as string) || 0;
  const lines = [
    `Payment due for ${clientName} · ${b.eventType}`,
    "—",
    `Retainer: ${money(retainer)} — ${b.retainerPaid ? "paid" : "DUE NOW (unpaid)"}`,
    `Balance: ${money(bookingBalanceDue(b))} — ${b.balancePaid ? "paid" : `due ${dueLabel}`}`,
    `Total: ${money(grand)}`,
  ];
  if (b.firstServiceDate) lines.push(`Event date: ${b.firstServiceDate}`);
  lines.push(`Booking #${b.id}`);
  return lines.join("\n");
}

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

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

  // Service events (one per booking event) with rich notes.
  const eventRows = await db
    .select({ event: eventsTable, booking: bookingsTable, clientName: clientsTable.name })
    .from(eventsTable)
    .innerJoin(bookingsTable, eq(eventsTable.bookingId, bookingsTable.id))
    .innerJoin(clientsTable, eq(bookingsTable.clientId, clientsTable.id))
    .where(isNull(bookingsTable.deletedAt))
    .orderBy(eventsTable.eventDate);

  const serviceItems = eventRows.map((r) => ({
    uid: `event-${r.event.id}@glam-studio`,
    summary: `${r.clientName} — ${r.event.eventName}`,
    location: r.booking.location,
    description: serviceEventNotes(r.event, r.booking, r.clientName),
    startDate: r.event.eventDate,
    startTime: r.event.servicesBegin ?? null,
    endTime: r.event.completionTarget ?? null,
  }));

  // Payment-due reminders (one all-day entry per unpaid, non-cancelled booking).
  const bookingRows = await db
    .select({ booking: bookingsTable, clientName: clientsTable.name })
    .from(bookingsTable)
    .innerJoin(clientsTable, eq(bookingsTable.clientId, clientsTable.id))
    .where(isNull(bookingsTable.deletedAt));

  const paymentItems: typeof serviceItems = [];
  for (const { booking: b, clientName } of bookingRows) {
    if (b.status === "cancelled" || b.balancePaid) continue;
    // Prefer an explicit balance due date; otherwise the contract default (day before the
    // first service). If neither exists, skip rather than invent a date.
    let dueLabel: string;
    if (b.balanceDueDate && YMD_RE.test(b.balanceDueDate)) {
      dueLabel = b.balanceDueDate;
    } else if (b.firstServiceDate && YMD_RE.test(b.firstServiceDate)) {
      const ymd = shiftDay(b.firstServiceDate.replace(/-/g, ""), -1);
      dueLabel = `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
    } else {
      continue;
    }
    paymentItems.push({
      uid: `payment-${b.id}@glam-studio`,
      summary: `💰 Balance due — ${clientName} (${money(bookingBalanceDue(b))})`,
      location: "",
      description: paymentDueNotes(b, clientName, dueLabel),
      startDate: dueLabel,
      startTime: null,
      endTime: null,
    });
  }

  const ics = buildIcsCalendar([...serviceItems, ...paymentItems], feedToken.label);

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
