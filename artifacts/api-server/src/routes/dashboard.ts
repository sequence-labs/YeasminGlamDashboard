import { Router, type IRouter } from "express";
import { desc, eq, isNull } from "drizzle-orm";
import { db, clientsTable, bookingsTable, eventsTable, leadsTable } from "@workspace/db";
import {
  GetDashboardStatsResponse,
  GetUpcomingEventsResponse,
  GetRecentBookingsResponse,
  GetNextActionsResponse,
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

function diffDays(from: Date, to: Date) {
  return Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}

router.get("/dashboard/next-actions", async (_req, res): Promise<void> => {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const tomorrowStr = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const bookings = await db
    .select({ booking: bookingsTable, clientName: clientsTable.name })
    .from(bookingsTable)
    .innerJoin(clientsTable, eq(bookingsTable.clientId, clientsTable.id))
    .where(isNull(bookingsTable.deletedAt));

  const actions: Array<{
    id: string;
    kind: "retainer_due" | "balance_due" | "day_before_confirm" | "unsigned_contract" | "new_lead";
    title: string;
    detail?: string | null;
    bookingId?: number | null;
    leadId?: number | null;
    href?: string | null;
    severity: "info" | "warn" | "attention";
    dueOn?: string | null;
  }> = [];

  for (const { booking, clientName } of bookings) {
    if (booking.status === "cancelled") continue;
    const created = booking.createdAt;
    const daysSince = diffDays(created, today);

    if (!booking.retainerPaid && daysSince >= 7 && booking.status !== "completed") {
      actions.push({
        id: `retainer-${booking.id}`,
        kind: "retainer_due",
        title: `Retainer outstanding for ${clientName}`,
        detail: `${booking.eventType} · ${daysSince} days since intake`,
        bookingId: booking.id,
        href: `/bookings/${booking.id}`,
        severity: daysSince >= 14 ? "attention" : "warn",
      });
    }

    if (booking.retainerPaid && !booking.balancePaid && booking.balanceDueDate && booking.balanceDueDate <= tomorrowStr) {
      actions.push({
        id: `balance-${booking.id}`,
        kind: "balance_due",
        title: `Balance due for ${clientName}`,
        detail: `Balance owed by ${booking.balanceDueDate}`,
        bookingId: booking.id,
        href: `/bookings/${booking.id}`,
        severity: "attention",
        dueOn: booking.balanceDueDate,
      });
    }

    if (booking.firstServiceDate === tomorrowStr) {
      actions.push({
        id: `day-before-${booking.id}`,
        kind: "day_before_confirm",
        title: `Confirm tomorrow's plan with ${clientName}`,
        detail: `${booking.eventType} · ${booking.location}`,
        bookingId: booking.id,
        href: `/bookings/${booking.id}`,
        severity: "warn",
        dueOn: booking.firstServiceDate,
      });
    }

    if (!booking.signedAt && booking.status !== "completed" && booking.status !== "cancelled") {
      actions.push({
        id: `unsigned-${booking.id}`,
        kind: "unsigned_contract",
        title: `Contract unsigned — ${clientName}`,
        detail: booking.firstServiceDate ? `Event on ${booking.firstServiceDate}` : null,
        bookingId: booking.id,
        href: `/bookings/${booking.id}`,
        severity: "info",
      });
    }
  }

  const newLeads = await db.select().from(leadsTable).where(eq(leadsTable.status, "new")).orderBy(desc(leadsTable.createdAt)).limit(3);
  for (const lead of newLeads) {
    actions.push({
      id: `lead-${lead.id}`,
      kind: "new_lead",
      title: `New lead — ${lead.name}`,
      detail: `${lead.eventType ?? "Inquiry"}${lead.eventDate ? ` · ${lead.eventDate}` : ""}`,
      leadId: lead.id,
      href: `/leads`,
      severity: "info",
    });
  }

  const severityOrder = { attention: 0, warn: 1, info: 2 } as const;
  actions.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  res.json(GetNextActionsResponse.parse(actions.slice(0, 8)));
});

export default router;
