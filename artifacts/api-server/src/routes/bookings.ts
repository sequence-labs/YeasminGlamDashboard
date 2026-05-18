import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, clientsTable, bookingsTable, eventsTable, paymentsTable } from "@workspace/db";
import {
  CreateBookingBody,
  GetBookingParams,
  GetBookingResponse,
  UpdateBookingParams,
  UpdateBookingBody,
  UpdateBookingResponse,
  DeleteBookingParams,
  ListBookingsResponse,
  CreateEventParams,
  CreateEventBody,
  UpdateEventParams,
  UpdateEventBody,
  UpdateEventResponse,
  DeleteEventParams,
  GetContractParams,
  GetContractResponse,
  RecordPaymentParams,
  RecordPaymentBody,
  DeletePaymentParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function computeSubtotal(ham: number, ho: number, mo: number, hamRate: number, hRate: number, mRate: number) {
  return (ham * hamRate) + (ho * hRate) + (mo * mRate);
}

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

function serializeEvent(e: typeof eventsTable.$inferSelect) {
  return {
    ...e,
    makeupRate: parseFloat(e.makeupRate as unknown as string),
    hairRate: parseFloat(e.hairRate as unknown as string),
    hairAndMakeupRate: parseFloat(e.hairAndMakeupRate as unknown as string),
    subtotal: parseFloat(e.subtotal as unknown as string),
  };
}

function serializePayment(p: typeof paymentsTable.$inferSelect) {
  return {
    ...p,
    amount: parseFloat(p.amount as unknown as string),
    paidAt: p.paidAt.toISOString(),
  };
}

async function recomputeGrandTotal(bookingId: number) {
  const events = await db.select().from(eventsTable).where(eq(eventsTable.bookingId, bookingId));
  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId));
  if (!booking) return;
  const eventsTotal = events.reduce((sum, e) => sum + parseFloat(e.subtotal as unknown as string), 0);
  const fees = parseFloat(booking.earlyMorningFee as unknown as string) + parseFloat(booking.travelFee as unknown as string);
  const grandTotal = (eventsTotal + fees).toFixed(2);
  const retainerAmount = (parseFloat(grandTotal) * 0.25).toFixed(2);
  await db.update(bookingsTable)
    .set({ grandTotal, retainerAmount })
    .where(eq(bookingsTable.id, bookingId));
}

// List bookings
router.get("/bookings", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      booking: bookingsTable,
      clientName: clientsTable.name,
    })
    .from(bookingsTable)
    .innerJoin(clientsTable, eq(bookingsTable.clientId, clientsTable.id))
    .orderBy(bookingsTable.createdAt);

  res.json(ListBookingsResponse.parse(rows.map(r => serializeBooking(r.booking, r.clientName))));
});

// Create booking
router.post("/bookings", async (req, res): Promise<void> => {
  const parsed = CreateBookingBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid booking body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, parsed.data.clientId));
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  const earlyMorningFee = parsed.data.earlyMorningFee ?? 0;
  const travelFee = parsed.data.travelFee ?? 0;
  const retainerAmount = parsed.data.retainerAmount ?? 0;
  const [booking] = await db.insert(bookingsTable).values({
    clientId: parsed.data.clientId,
    eventType: parsed.data.eventType,
    location: parsed.data.location,
    locationDetail: parsed.data.locationDetail ?? null,
    firstServiceDate: parsed.data.firstServiceDate ?? null,
    status: parsed.data.status ?? "draft",
    grandTotal: (earlyMorningFee + travelFee).toFixed(2),
    retainerAmount: retainerAmount.toFixed(2),
    retainerPaid: false,
    balancePaid: false,
    balanceDueDate: parsed.data.balanceDueDate ?? null,
    paymentMethod: parsed.data.paymentMethod ?? null,
    earlyMorningFee: earlyMorningFee.toFixed(2),
    travelFee: travelFee.toFixed(2),
    notes: parsed.data.notes ?? null,
  }).returning();
  res.status(201).json(serializeBooking(booking, client.name));
});

// Get booking detail
router.get("/bookings/:id", async (req, res): Promise<void> => {
  const params = GetBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .select({ booking: bookingsTable, client: clientsTable })
    .from(bookingsTable)
    .innerJoin(clientsTable, eq(bookingsTable.clientId, clientsTable.id))
    .where(eq(bookingsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  const events = await db.select().from(eventsTable).where(eq(eventsTable.bookingId, params.data.id));
  const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.bookingId, params.data.id));
  res.json(GetBookingResponse.parse({
    ...serializeBooking(row.booking, row.client.name),
    clientEmail: row.client.email,
    clientPhone: row.client.phone ?? null,
    events: events.map(serializeEvent),
    payments: payments.map(serializePayment),
  }));
});

// Update booking
router.patch("/bookings/:id", async (req, res): Promise<void> => {
  const params = UpdateBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateBookingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: Record<string, unknown> = {};
  if (parsed.data.eventType !== undefined) updateData.eventType = parsed.data.eventType;
  if (parsed.data.location !== undefined) updateData.location = parsed.data.location;
  if (parsed.data.locationDetail !== undefined) updateData.locationDetail = parsed.data.locationDetail;
  if (parsed.data.firstServiceDate !== undefined) updateData.firstServiceDate = parsed.data.firstServiceDate;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.retainerPaid !== undefined) updateData.retainerPaid = parsed.data.retainerPaid;
  if (parsed.data.balancePaid !== undefined) updateData.balancePaid = parsed.data.balancePaid;
  if (parsed.data.balanceDueDate !== undefined) updateData.balanceDueDate = parsed.data.balanceDueDate;
  if (parsed.data.paymentMethod !== undefined) updateData.paymentMethod = parsed.data.paymentMethod;
  if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;
  if (parsed.data.earlyMorningFee !== undefined) updateData.earlyMorningFee = parsed.data.earlyMorningFee.toFixed(2);
  if (parsed.data.travelFee !== undefined) updateData.travelFee = parsed.data.travelFee.toFixed(2);
  if (parsed.data.retainerAmount !== undefined) updateData.retainerAmount = parsed.data.retainerAmount.toFixed(2);

  const [booking] = await db.update(bookingsTable)
    .set(updateData)
    .where(eq(bookingsTable.id, params.data.id))
    .returning();
  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  if (parsed.data.earlyMorningFee !== undefined || parsed.data.travelFee !== undefined) {
    await recomputeGrandTotal(params.data.id);
    const [updated] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, params.data.id));
    const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, updated.clientId));
    res.json(UpdateBookingResponse.parse(serializeBooking(updated, client.name)));
    return;
  }
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, booking.clientId));
  res.json(UpdateBookingResponse.parse(serializeBooking(booking, client.name)));
});

// Delete booking
router.delete("/bookings/:id", async (req, res): Promise<void> => {
  const params = DeleteBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [booking] = await db.delete(bookingsTable).where(eq(bookingsTable.id, params.data.id)).returning();
  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  res.sendStatus(204);
});

// Create event
router.post("/bookings/:id/events", async (req, res): Promise<void> => {
  const params = CreateEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const ham = parsed.data.hairAndMakeupCount ?? 0;
  const ho = parsed.data.hairOnlyCount ?? 0;
  const mo = parsed.data.makeupOnlyCount ?? 0;
  const hamRate = parsed.data.hairAndMakeupRate ?? 285;
  const hRate = parsed.data.hairRate ?? 135;
  const mRate = parsed.data.makeupRate ?? 150;
  const subtotal = computeSubtotal(ham, ho, mo, hamRate, hRate, mRate);
  const [event] = await db.insert(eventsTable).values({
    bookingId: params.data.id,
    eventName: parsed.data.eventName,
    eventDate: parsed.data.eventDate,
    servicesBegin: parsed.data.servicesBegin ?? null,
    completionTarget: parsed.data.completionTarget ?? null,
    hairAndMakeupCount: ham,
    hairOnlyCount: ho,
    makeupOnlyCount: mo,
    makeupRate: mRate.toFixed(2),
    hairRate: hRate.toFixed(2),
    hairAndMakeupRate: hamRate.toFixed(2),
    subtotal: subtotal.toFixed(2),
  }).returning();
  await recomputeGrandTotal(params.data.id);
  res.status(201).json(serializeEvent(event));
});

// Update event
router.patch("/bookings/:id/events/:eventId", async (req, res): Promise<void> => {
  const params = UpdateEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [existing] = await db.select().from(eventsTable)
    .where(and(eq(eventsTable.id, params.data.eventId), eq(eventsTable.bookingId, params.data.id)));
  if (!existing) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  const ham = parsed.data.hairAndMakeupCount ?? existing.hairAndMakeupCount;
  const ho = parsed.data.hairOnlyCount ?? existing.hairOnlyCount;
  const mo = parsed.data.makeupOnlyCount ?? existing.makeupOnlyCount;
  const hamRate = parsed.data.hairAndMakeupRate ?? parseFloat(existing.hairAndMakeupRate as unknown as string);
  const hRate = parsed.data.hairRate ?? parseFloat(existing.hairRate as unknown as string);
  const mRate = parsed.data.makeupRate ?? parseFloat(existing.makeupRate as unknown as string);
  const subtotal = computeSubtotal(ham, ho, mo, hamRate, hRate, mRate);
  const updateData: Record<string, unknown> = {
    hairAndMakeupCount: ham,
    hairOnlyCount: ho,
    makeupOnlyCount: mo,
    hairAndMakeupRate: hamRate.toFixed(2),
    hairRate: hRate.toFixed(2),
    makeupRate: mRate.toFixed(2),
    subtotal: subtotal.toFixed(2),
  };
  if (parsed.data.eventName !== undefined) updateData.eventName = parsed.data.eventName;
  if (parsed.data.eventDate !== undefined) updateData.eventDate = parsed.data.eventDate;
  if (parsed.data.servicesBegin !== undefined) updateData.servicesBegin = parsed.data.servicesBegin;
  if (parsed.data.completionTarget !== undefined) updateData.completionTarget = parsed.data.completionTarget;
  const [updated] = await db.update(eventsTable).set(updateData).where(eq(eventsTable.id, params.data.eventId)).returning();
  await recomputeGrandTotal(params.data.id);
  res.json(UpdateEventResponse.parse(serializeEvent(updated)));
});

// Delete event
router.delete("/bookings/:id/events/:eventId", async (req, res): Promise<void> => {
  const params = DeleteEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [event] = await db.delete(eventsTable)
    .where(and(eq(eventsTable.id, params.data.eventId), eq(eventsTable.bookingId, params.data.id)))
    .returning();
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  await recomputeGrandTotal(params.data.id);
  res.sendStatus(204);
});

// Get contract
router.get("/bookings/:id/contract", async (req, res): Promise<void> => {
  const params = GetContractParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .select({ booking: bookingsTable, client: clientsTable })
    .from(bookingsTable)
    .innerJoin(clientsTable, eq(bookingsTable.clientId, clientsTable.id))
    .where(eq(bookingsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  const events = await db.select().from(eventsTable).where(eq(eventsTable.bookingId, params.data.id));
  const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.bookingId, params.data.id));
  const bookingSerialized = {
    ...serializeBooking(row.booking, row.client.name),
    clientEmail: row.client.email,
    clientPhone: row.client.phone ?? null,
    events: events.map(serializeEvent),
    payments: payments.map(serializePayment),
  };
  const clientSerialized = {
    ...row.client,
    createdAt: row.client.createdAt.toISOString(),
  };
  res.json(GetContractResponse.parse({
    booking: bookingSerialized,
    client: clientSerialized,
    events: events.map(serializeEvent),
    artistName: "Yeasmin Bhuiyan",
    artistEmail: "yeasminbhuiyan1997@gmail.com",
    artistPhone: null,
  }));
});

// Record payment
router.post("/bookings/:id/payments", async (req, res): Promise<void> => {
  const params = RecordPaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = RecordPaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, params.data.id));
  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  const paidAt = parsed.data.paidAt ? new Date(parsed.data.paidAt) : new Date();
  const [payment] = await db.insert(paymentsTable).values({
    bookingId: params.data.id,
    amount: parsed.data.amount.toFixed(2),
    type: parsed.data.type,
    note: parsed.data.note ?? null,
    paidAt,
  }).returning();
  // Auto-update retainerPaid/balancePaid flags
  if (parsed.data.type === "retainer") {
    await db.update(bookingsTable).set({ retainerPaid: true }).where(eq(bookingsTable.id, params.data.id));
  } else if (parsed.data.type === "balance") {
    await db.update(bookingsTable).set({ balancePaid: true }).where(eq(bookingsTable.id, params.data.id));
  }
  res.status(201).json(serializePayment(payment));
});

// Delete payment
router.delete("/payments/:paymentId", async (req, res): Promise<void> => {
  const params = DeletePaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [payment] = await db.delete(paymentsTable).where(eq(paymentsTable.id, params.data.paymentId)).returning();
  if (!payment) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
