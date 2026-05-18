import { Router, type IRouter } from "express";
import { eq, isNull } from "drizzle-orm";
import { db, clientsTable, bookingsTable, eventsTable } from "@workspace/db";
import {
  GetDashboardStatsResponse,
  GetUpcomingEventsResponse,
  GetRecentBookingsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function serializeBooking(b: typeof bookingsTable.$inferSelect, clientName: string) {
  return {
    ...b,
    clientName,
    grandTotal: parseFloat(b.grandTotal as unknown as string),
    retainerAmount: parseFloat(b.retainerAmount as unknown as string),
    earlyMorningFee: parseFloat(b.earlyMorningFee as unknown as string),
    travelFee: parseFloat(b.travelFee as unknown as string),
    createdAt: b.createdAt.toISOString(),
  };
}

router.get("/dashboard/stats", async (req, res): Promise<void> => {
  const allClients = await db.select().from(clientsTable);
  const allBookings = await db
    .select({ booking: bookingsTable })
    .from(bookingsTable)
    .where(isNull(bookingsTable.deletedAt));

  const totalClients = allClients.length;
  const activeBookings = allBookings.filter(r => r.booking.status === "active").length;
  const completedBookings = allBookings.filter(r => r.booking.status === "completed").length;

  const totalRevenue = allBookings
    .filter(r => r.booking.status === "completed")
    .reduce((sum, r) => sum + parseFloat(r.booking.grandTotal as unknown as string), 0);

  const pendingRevenue = allBookings
    .filter(r => r.booking.status === "active")
    .reduce((sum, r) => sum + parseFloat(r.booking.grandTotal as unknown as string), 0);

  const retainersPending = allBookings.filter(r =>
    r.booking.status === "active" && !r.booking.retainerPaid
  ).length;

  const balancesPending = allBookings.filter(r =>
    r.booking.status === "active" && !r.booking.balancePaid
  ).length;

  res.json(GetDashboardStatsResponse.parse({
    totalClients,
    activeBookings,
    completedBookings,
    totalRevenue,
    pendingRevenue,
    retainersPending,
    balancesPending,
  }));
});

router.get("/dashboard/upcoming", async (req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];
  const ninetyDaysLater = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const rows = await db
    .select({ event: eventsTable, booking: bookingsTable, clientName: clientsTable.name })
    .from(eventsTable)
    .innerJoin(bookingsTable, eq(eventsTable.bookingId, bookingsTable.id))
    .innerJoin(clientsTable, eq(bookingsTable.clientId, clientsTable.id))
    .where(isNull(bookingsTable.deletedAt))
    .orderBy(eventsTable.eventDate);

  const upcoming = rows.filter(r =>
    r.event.eventDate >= today && r.event.eventDate <= ninetyDaysLater &&
    r.booking.status !== "cancelled"
  );

  res.json(GetUpcomingEventsResponse.parse(upcoming.map(r => ({
    eventId: r.event.id,
    bookingId: r.booking.id,
    clientName: r.clientName,
    eventType: r.booking.eventType,
    eventName: r.event.eventName,
    eventDate: r.event.eventDate,
    location: r.booking.location,
    servicesBegin: r.event.servicesBegin ?? null,
    bookingStatus: r.booking.status,
  }))));
});

router.get("/dashboard/recent-bookings", async (req, res): Promise<void> => {
  const rows = await db
    .select({ booking: bookingsTable, clientName: clientsTable.name })
    .from(bookingsTable)
    .innerJoin(clientsTable, eq(bookingsTable.clientId, clientsTable.id))
    .where(isNull(bookingsTable.deletedAt))
    .orderBy(bookingsTable.createdAt)
    .limit(10);

  res.json(GetRecentBookingsResponse.parse(rows.map(r => serializeBooking(r.booking, r.clientName))));
});

export default router;
