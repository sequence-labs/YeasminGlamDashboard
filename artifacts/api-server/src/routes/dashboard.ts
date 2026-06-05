import { Router, type IRouter } from "express";
import { desc, eq, isNull } from "drizzle-orm";
import { db, clientsTable, bookingsTable, eventsTable, expensesTable } from "@workspace/db";
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

function monthRange(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const start = new Date(year, month, 1).toISOString().slice(0, 10);
  const end = new Date(year, month + 1, 1).toISOString().slice(0, 10);
  return { start, end };
}

function yearRange(date = new Date()) {
  const year = date.getFullYear();
  const start = new Date(year, 0, 1).toISOString().slice(0, 10);
  const end = new Date(year + 1, 0, 1).toISOString().slice(0, 10);
  return { start, end };
}

function isDateInRange(value: string | null | undefined, start: string, end: string) {
  return Boolean(value && value >= start && value < end);
}

router.get("/dashboard/stats", async (req, res): Promise<void> => {
  const allClients = await db.select().from(clientsTable);
  const allBookings = await db
    .select({ booking: bookingsTable })
    .from(bookingsTable)
    .where(isNull(bookingsTable.deletedAt));
  const expenses = await db.select().from(expensesTable);
  const activeBusinessExpenses = expenses.filter((expense) => expense.active && expense.businessUse);
  const currentMonth = monthRange();
  const currentYear = yearRange();

  const totalClients = allClients.length;
  const activeBookings = allBookings.filter(r => r.booking.status === "active").length;
  const completedBookings = allBookings.filter(r => r.booking.status === "completed").length;

  const totalRevenue = allBookings
    .filter(r => r.booking.status === "completed")
    .reduce((sum, r) => sum + parseFloat(r.booking.grandTotal as unknown as string), 0);

  const pendingRevenue = allBookings
    .filter(r => r.booking.status === "active")
    .reduce((sum, r) => sum + parseFloat(r.booking.grandTotal as unknown as string), 0);

  const currentMonthRevenue = allBookings
    .filter((r) => r.booking.status === "completed" && isDateInRange(r.booking.firstServiceDate ?? r.booking.createdAt.toISOString().slice(0, 10), currentMonth.start, currentMonth.end))
    .reduce((sum, r) => sum + parseFloat(r.booking.grandTotal as unknown as string), 0);

  const totalExpenses = activeBusinessExpenses
    .reduce((sum, expense) => sum + parseFloat(expense.amount as unknown as string), 0);

  const currentMonthExpenses = activeBusinessExpenses
    .filter((expense) => isDateInRange(expense.expenseDate, currentMonth.start, currentMonth.end))
    .reduce((sum, expense) => sum + parseFloat(expense.amount as unknown as string), 0);

  const yearToDateExpenses = activeBusinessExpenses
    .filter((expense) => isDateInRange(expense.expenseDate, currentYear.start, currentYear.end))
    .reduce((sum, expense) => sum + parseFloat(expense.amount as unknown as string), 0);

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
    totalExpenses,
    currentMonthExpenses,
    yearToDateExpenses,
    netRevenue: totalRevenue - totalExpenses,
    currentMonthNetRevenue: currentMonthRevenue - currentMonthExpenses,
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
    kind: "retainer_due" | "balance_due" | "day_before_confirm" | "unsigned_contract";
    title: string;
    detail?: string | null;
    bookingId?: number | null;
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

  const severityOrder = { attention: 0, warn: 1, info: 2 } as const;
  actions.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  res.json(GetNextActionsResponse.parse(actions.slice(0, 8)));
});

export default router;
