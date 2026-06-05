import { Router, type IRouter } from "express";
import { and, eq, gte, isNull, lte } from "drizzle-orm";
import {
  db,
  bookingsTable,
  clientsTable,
  eventsTable,
  calendarFeedTokensTable,
} from "@workspace/db";
import {
  ListCalendarEventsQueryParams,
  ListCalendarEventsResponse,
  GetCalendarFeedTokenResponse,
  RotateCalendarFeedTokenResponse,
} from "@workspace/api-zod";
import { generateToken } from "../lib/tokens";

const router: IRouter = Router();

function feedUrl(token: string) {
  return `/api/public/calendar/${token}.ics`;
}

async function ensureFeedToken() {
  const [existing] = await db
    .select()
    .from(calendarFeedTokensTable)
    .where(isNull(calendarFeedTokensTable.revokedAt))
    .limit(1);
  if (existing) return existing;
  const [row] = await db
    .insert(calendarFeedTokensTable)
    .values({ token: generateToken(), label: "Studio calendar" })
    .returning();
  return row;
}

router.get("/calendar/events", async (req, res): Promise<void> => {
  const q = ListCalendarEventsQueryParams.safeParse(req.query);
  if (!q.success) {
    res.status(400).json({ error: q.error.message });
    return;
  }
  const start = q.data.start ?? "1970-01-01";
  const end = q.data.end ?? "2999-12-31";
  const rows = await db
    .select({ event: eventsTable, booking: bookingsTable, clientName: clientsTable.name })
    .from(eventsTable)
    .innerJoin(bookingsTable, eq(eventsTable.bookingId, bookingsTable.id))
    .innerJoin(clientsTable, eq(bookingsTable.clientId, clientsTable.id))
    .where(and(
      isNull(bookingsTable.deletedAt),
      gte(eventsTable.eventDate, start),
      lte(eventsTable.eventDate, end),
    ))
    .orderBy(eventsTable.eventDate);
  res.json(ListCalendarEventsResponse.parse(rows.map((r) => ({
    eventId: r.event.id,
    bookingId: r.booking.id,
    clientName: r.clientName,
    eventType: r.booking.eventType,
    eventName: r.event.eventName,
    eventDate: r.event.eventDate,
    servicesBegin: r.event.servicesBegin ?? null,
    completionTarget: r.event.completionTarget ?? null,
    location: r.booking.location,
    bookingStatus: r.booking.status,
    lifecycleStage: r.booking.lifecycleStage,
    kind: r.event.kind as "event" | "trial",
  }))));
});

router.get("/calendar/feed-token", async (_req, res): Promise<void> => {
  const token = await ensureFeedToken();
  res.json(GetCalendarFeedTokenResponse.parse({ token: token.token, url: feedUrl(token.token), label: token.label }));
});

router.post("/calendar/feed-token", async (_req, res): Promise<void> => {
  await db
    .update(calendarFeedTokensTable)
    .set({ revokedAt: new Date() })
    .where(isNull(calendarFeedTokensTable.revokedAt));
  const [row] = await db
    .insert(calendarFeedTokensTable)
    .values({ token: generateToken(), label: "Studio calendar" })
    .returning();
  res.json(RotateCalendarFeedTokenResponse.parse({ token: row.token, url: feedUrl(row.token), label: row.label }));
});

export default router;
