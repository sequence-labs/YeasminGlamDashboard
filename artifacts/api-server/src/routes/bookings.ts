import { Router, type IRouter } from "express";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db, clientsTable, bookingsTable, eventsTable, paymentsTable, bookingLineItemsTable, bookingActivityTable, contractTemplatesTable } from "@workspace/db";
import {
  CreateBookingBody,
  GetBookingParams,
  GetBookingResponse,
  UpdateBookingParams,
  UpdateBookingBody,
  UpdateBookingResponse,
  DeleteBookingParams,
  RestoreBookingParams,
  RestoreBookingResponse,
  PermanentlyDeleteBookingParams,
  ListBookingsResponse,
  CreateEventParams,
  CreateEventBody,
  CreateBookingLineItemParams,
  CreateBookingLineItemBody,
  UpdateEventParams,
  UpdateEventBody,
  UpdateEventResponse,
  UpdateBookingLineItemParams,
  UpdateBookingLineItemBody,
  UpdateBookingLineItemResponse,
  DeleteBookingLineItemParams,
  DeleteEventParams,
  GetContractParams,
  GetContractResponse,
  RecordPaymentParams,
  RecordPaymentBody,
  DeletePaymentParams,
} from "@workspace/api-zod";
import { getOrCreateArtistProfile } from "../lib/artist-profile";
import { ensureDefaultContractTemplate, serializeContractTemplate } from "../lib/contract-templates";
import { scheduleBookingReminders } from "../lib/scheduler";

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
    lifecycleStage: b.lifecycleStage,
    signedAt: b.signedAt ? b.signedAt.toISOString() : null,
    signedByName: b.signedByName,
    deletedAt: b.deletedAt ? b.deletedAt.toISOString() : null,
    createdAt: b.createdAt.toISOString(),
  };
}

function serializeActivity(a: typeof bookingActivityTable.$inferSelect) {
  return {
    ...a,
    createdAt: a.createdAt.toISOString(),
  };
}

async function recordBookingActivity(
  bookingId: number,
  action: string,
  title: string,
  description: string,
  metadata?: Record<string, unknown>,
) {
  await db.insert(bookingActivityTable).values({
    bookingId,
    action,
    title,
    description,
    metadata: metadata ? JSON.stringify(metadata) : null,
  });
}

function money(n: number) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "empty";
  if (typeof value === "boolean") return value ? "yes" : "no";
  return String(value);
}

function bookingChangeDescriptions(
  existing: typeof bookingsTable.$inferSelect,
  data: Record<string, unknown>,
) {
  const changes: string[] = [];
  const compare = (label: string, oldValue: unknown, newValue: unknown) => {
    if (String(oldValue ?? "") !== String(newValue ?? "")) {
      changes.push(`${label} changed from ${displayValue(oldValue)} to ${displayValue(newValue)}`);
    }
  };

  if (data.eventType !== undefined) compare("Event type", existing.eventType, data.eventType);
  if (data.contractTemplateId !== undefined) compare("Contract template", existing.contractTemplateId, data.contractTemplateId);
  if (data.location !== undefined) compare("Location", existing.location, data.location);
  if (data.locationDetail !== undefined) compare("Location detail", existing.locationDetail, data.locationDetail);
  if (data.firstServiceDate !== undefined) compare("First service date", existing.firstServiceDate, data.firstServiceDate);
  if (data.status !== undefined) compare("Status", existing.status, data.status);
  if (data.retainerPaid !== undefined) compare("Retainer paid", existing.retainerPaid, data.retainerPaid);
  if (data.balancePaid !== undefined) compare("Balance paid", existing.balancePaid, data.balancePaid);
  if (data.balanceDueDate !== undefined) compare("Balance due date", existing.balanceDueDate, data.balanceDueDate);
  if (data.paymentMethod !== undefined) compare("Payment method", existing.paymentMethod, data.paymentMethod);
  if (data.notes !== undefined) compare("Notes", existing.notes, data.notes);
  if (data.earlyMorningFee !== undefined) compare("Early morning fee", parseFloat(existing.earlyMorningFee as unknown as string), data.earlyMorningFee);
  if (data.travelFee !== undefined) compare("Travel fee", parseFloat(existing.travelFee as unknown as string), data.travelFee);
  if (data.retainerAmount !== undefined) compare("Retainer amount", parseFloat(existing.retainerAmount as unknown as string), data.retainerAmount);

  return changes;
}

function serializeEvent(e: typeof eventsTable.$inferSelect) {
  return {
    ...e,
    makeupRate: parseFloat(e.makeupRate as unknown as string),
    hairRate: parseFloat(e.hairRate as unknown as string),
    hairAndMakeupRate: parseFloat(e.hairAndMakeupRate as unknown as string),
    subtotal: parseFloat(e.subtotal as unknown as string),
    kind: (e.kind as "event" | "trial") ?? "event",
  };
}

function serializePayment(p: typeof paymentsTable.$inferSelect) {
  return {
    ...p,
    amount: parseFloat(p.amount as unknown as string),
    paidAt: p.paidAt.toISOString(),
  };
}

function serializeLineItem(item: typeof bookingLineItemsTable.$inferSelect) {
  const quantity = parseFloat(item.quantity as unknown as string);
  const unitPrice = parseFloat(item.unitPrice as unknown as string);

  return {
    ...item,
    kind: item.kind as "service" | "fee",
    quantity,
    unitPrice,
    total: quantity * unitPrice,
  };
}

async function recomputeGrandTotal(bookingId: number) {
  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId));
  if (!booking) return;
  const totals = await effectiveBookingTotals(booking);
  await db.update(bookingsTable)
    .set({
      grandTotal: totals.grandTotal.toFixed(2),
      retainerAmount: totals.retainerAmount.toFixed(2),
    })
    .where(eq(bookingsTable.id, bookingId));
}

async function effectiveBookingTotals(booking: typeof bookingsTable.$inferSelect) {
  const events = await db.select().from(eventsTable).where(eq(eventsTable.bookingId, booking.id));
  const lineItems = await db.select().from(bookingLineItemsTable).where(eq(bookingLineItemsTable.bookingId, booking.id));
  const eventsTotal = events.reduce((sum, e) => sum + parseFloat(e.subtotal as unknown as string), 0);
  const groups = new Map<string, {
    totalAmount: number;
    sortOrder: number;
    authoritativeAmount?: number;
  }>();

  for (const item of lineItems) {
    const quantity = parseFloat(item.quantity as unknown as string);
    const unitPrice = parseFloat(item.unitPrice as unknown as string);
    const amount = quantity * unitPrice;
    const key = [
      item.kind,
      item.serviceItemId ?? "custom",
      item.name,
      item.description ?? "",
      unitPrice,
      item.unitLabel,
      item.calculationNote ?? "",
      item.eventId ?? "booking",
    ].join("|");
    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, {
        totalAmount: amount,
        sortOrder: item.sortOrder,
        authoritativeAmount: quantity > 1 ? amount : undefined,
      });
      continue;
    }

    existing.totalAmount += amount;
    existing.sortOrder = Math.min(existing.sortOrder, item.sortOrder);
    if (quantity > 1 && existing.authoritativeAmount === undefined) {
      existing.authoritativeAmount = amount;
    }
  }

  const lineItemsTotal = [...groups.values()]
    .reduce((sum, group) => sum + (group.authoritativeAmount ?? group.totalAmount), 0);
  const fees = parseFloat(booking.earlyMorningFee as unknown as string) + parseFloat(booking.travelFee as unknown as string);
  const grandTotal = eventsTotal + lineItemsTotal + fees;

  return {
    grandTotal,
    retainerAmount: grandTotal * 0.25,
  };
}

async function syncFirstServiceDateFromEvents(bookingId: number) {
  const [firstEvent] = await db
    .select({ eventDate: eventsTable.eventDate })
    .from(eventsTable)
    .where(eq(eventsTable.bookingId, bookingId))
    .orderBy(eventsTable.eventDate, eventsTable.id)
    .limit(1);
  const firstServiceDate = firstEvent?.eventDate ?? null;
  await db.update(bookingsTable)
    .set({ firstServiceDate })
    .where(eq(bookingsTable.id, bookingId));
  return firstServiceDate;
}

function buildLineItemValues(
  bookingId: number,
  lineItem: {
    serviceItemId?: number | null;
    eventId?: number | null;
    name: string;
    description?: string | null;
    kind: "service" | "fee";
    quantity: number;
    unitPrice: number;
    unitLabel: string;
    calculationNote?: string | null;
    sortOrder?: number;
  },
) {
  return {
    bookingId,
    serviceItemId: lineItem.serviceItemId ?? null,
    eventId: lineItem.eventId ?? null,
    name: lineItem.name,
    description: lineItem.description ?? null,
    kind: lineItem.kind,
    quantity: lineItem.quantity.toFixed(2),
    unitPrice: lineItem.unitPrice.toFixed(2),
    unitLabel: lineItem.unitLabel,
    calculationNote: lineItem.calculationNote ?? null,
    sortOrder: lineItem.sortOrder ?? 0,
  };
}

async function resolveContractTemplateId(contractTemplateId?: number | null) {
  if (contractTemplateId === null) return null;

  if (contractTemplateId !== undefined) {
    const [template] = await db.select().from(contractTemplatesTable).where(eq(contractTemplatesTable.id, contractTemplateId));
    if (!template || !template.active) return undefined;
    return template.id;
  }

  const defaultTemplate = await ensureDefaultContractTemplate();
  return defaultTemplate.id;
}

// List bookings
router.get("/bookings", async (req, res): Promise<void> => {
  const includeDeleted = req.query.includeDeleted === "true";
  const selection = {
    booking: bookingsTable,
    clientName: clientsTable.name,
  };
  const rows = includeDeleted
    ? await db.select(selection)
      .from(bookingsTable)
      .innerJoin(clientsTable, eq(bookingsTable.clientId, clientsTable.id))
      .orderBy(bookingsTable.firstServiceDate, desc(bookingsTable.createdAt))
    : await db.select(selection)
      .from(bookingsTable)
      .innerJoin(clientsTable, eq(bookingsTable.clientId, clientsTable.id))
      .where(isNull(bookingsTable.deletedAt))
      .orderBy(bookingsTable.firstServiceDate, desc(bookingsTable.createdAt));

  const serialized = await Promise.all(rows.map(async (r) => {
    const totals = await effectiveBookingTotals(r.booking);
    return serializeBooking({
      ...r.booking,
      grandTotal: totals.grandTotal.toFixed(2),
      retainerAmount: totals.retainerAmount.toFixed(2),
    }, r.clientName);
  }));

  res.json(ListBookingsResponse.parse(serialized));
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
  const contractTemplateId = await resolveContractTemplateId(parsed.data.contractTemplateId);
  if (contractTemplateId === undefined) {
    res.status(400).json({ error: "Contract template is not available" });
    return;
  }
  const earlyMorningFee = parsed.data.earlyMorningFee ?? 0;
  const travelFee = parsed.data.travelFee ?? 0;
  const retainerAmount = parsed.data.retainerAmount ?? 0;
  const [booking] = await db.insert(bookingsTable).values({
    clientId: parsed.data.clientId,
    contractTemplateId,
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
    lifecycleStage: parsed.data.lifecycleStage ?? "lead",
  }).returning();

  if (parsed.data.lineItems && parsed.data.lineItems.length > 0) {
    await db.insert(bookingLineItemsTable).values(
      parsed.data.lineItems.map((lineItem) => buildLineItemValues(booking.id, lineItem)),
    );
  }

  await recomputeGrandTotal(booking.id);
  const [updatedBooking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, booking.id));
  await recordBookingActivity(
    booking.id,
    "booking.created",
    "Booking created",
    `Booking was created for ${client.name}.`,
  );
  await scheduleBookingReminders(booking.id).catch(() => undefined);
  res.status(201).json(serializeBooking(updatedBooking, client.name));
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
  const events = await db.select().from(eventsTable).where(eq(eventsTable.bookingId, params.data.id)).orderBy(eventsTable.sortOrder, eventsTable.eventDate, eventsTable.id);
  const firstServiceDate = await syncFirstServiceDateFromEvents(params.data.id);
  const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.bookingId, params.data.id));
  const lineItems = await db
    .select()
    .from(bookingLineItemsTable)
    .where(eq(bookingLineItemsTable.bookingId, params.data.id))
    .orderBy(bookingLineItemsTable.sortOrder, bookingLineItemsTable.id);
  const activity = await db
    .select()
    .from(bookingActivityTable)
    .where(eq(bookingActivityTable.bookingId, params.data.id))
    .orderBy(desc(bookingActivityTable.createdAt), desc(bookingActivityTable.id));
  res.json(GetBookingResponse.parse({
    ...serializeBooking({ ...row.booking, firstServiceDate }, row.client.name),
    clientEmail: row.client.email,
    clientPhone: row.client.phone ?? null,
    events: events.map(serializeEvent),
    payments: payments.map(serializePayment),
    lineItems: lineItems.map(serializeLineItem),
    activity: activity.map(serializeActivity),
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
  const [existing] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  const resolvedContractTemplateId = parsed.data.contractTemplateId !== undefined
    ? await resolveContractTemplateId(parsed.data.contractTemplateId)
    : undefined;
  if (resolvedContractTemplateId === undefined && parsed.data.contractTemplateId !== undefined) {
    res.status(400).json({ error: "Contract template is not available" });
    return;
  }
  const changes = bookingChangeDescriptions(existing, parsed.data);
  const updateData: Record<string, unknown> = {};
  if (parsed.data.contractTemplateId !== undefined) updateData.contractTemplateId = resolvedContractTemplateId;
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
  if (parsed.data.lifecycleStage !== undefined) updateData.lifecycleStage = parsed.data.lifecycleStage;

  const [booking] = await db.update(bookingsTable)
    .set(updateData)
    .where(eq(bookingsTable.id, params.data.id))
    .returning();
  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  if (changes.length > 0) {
    await recordBookingActivity(
      params.data.id,
      "booking.updated",
      "Booking updated",
      changes.join("; "),
      { fields: Object.keys(parsed.data) },
    );
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
  const [booking] = await db.update(bookingsTable)
    .set({ deletedAt: new Date() })
    .where(eq(bookingsTable.id, params.data.id))
    .returning();
  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  await recordBookingActivity(params.data.id, "booking.deleted", "Booking moved to deleted", "Booking was moved to deleted bookings.");
  res.sendStatus(204);
});

// Restore deleted booking
router.post("/bookings/:id/restore", async (req, res): Promise<void> => {
  const params = RestoreBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [booking] = await db.update(bookingsTable)
    .set({ deletedAt: null })
    .where(eq(bookingsTable.id, params.data.id))
    .returning();
  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, booking.clientId));
  await recordBookingActivity(params.data.id, "booking.restored", "Booking restored", "Booking was restored from deleted bookings.");
  res.json(RestoreBookingResponse.parse(serializeBooking(booking, client.name)));
});

// Permanently delete booking
router.delete("/bookings/:id/permanent", async (req, res): Promise<void> => {
  const params = PermanentlyDeleteBookingParams.safeParse(req.params);
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
  const existingEvents = await db.select({ sortOrder: eventsTable.sortOrder })
    .from(eventsTable)
    .where(eq(eventsTable.bookingId, params.data.id));
  const nextSortOrder = parsed.data.sortOrder ?? (
    existingEvents.length > 0
      ? Math.max(...existingEvents.map((existingEvent) => existingEvent.sortOrder)) + 10
      : 0
  );
  const [event] = await db.insert(eventsTable).values({
    bookingId: params.data.id,
    eventName: parsed.data.eventName,
    eventDate: parsed.data.eventDate,
    servicesBegin: parsed.data.servicesBegin ?? null,
    completionTarget: parsed.data.completionTarget ?? null,
    sortOrder: nextSortOrder,
    hairAndMakeupCount: ham,
    hairOnlyCount: ho,
    makeupOnlyCount: mo,
    makeupRate: mRate.toFixed(2),
    hairRate: hRate.toFixed(2),
    hairAndMakeupRate: hamRate.toFixed(2),
    subtotal: subtotal.toFixed(2),
    kind: parsed.data.kind ?? "event",
  }).returning();
  await recomputeGrandTotal(params.data.id);
  await syncFirstServiceDateFromEvents(params.data.id);
  await recordBookingActivity(
    params.data.id,
    "event.created",
    "Event added",
    `${event.eventName} was added for ${event.eventDate}.`,
  );
  res.status(201).json(serializeEvent(event));
});

// Add selected service or fee
router.post("/bookings/:id/line-items", async (req, res): Promise<void> => {
  const params = CreateBookingLineItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateBookingLineItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, params.data.id));
  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  if (parsed.data.eventId !== undefined) {
    const [event] = await db.select().from(eventsTable)
      .where(and(eq(eventsTable.id, parsed.data.eventId), eq(eventsTable.bookingId, params.data.id)));
    if (!event) {
      res.status(400).json({ error: "Event does not belong to this booking" });
      return;
    }
  }

  const [lineItem] = await db.insert(bookingLineItemsTable)
    .values(buildLineItemValues(params.data.id, parsed.data))
    .returning();
  await recomputeGrandTotal(params.data.id);
  await recordBookingActivity(
    params.data.id,
    "line_item.created",
    "Service or fee added",
    `${lineItem.name} was added to the booking.`,
  );
  res.status(201).json(serializeLineItem(lineItem));
});

// Update selected service or fee
router.patch("/bookings/:id/line-items/:lineItemId", async (req, res): Promise<void> => {
  const params = UpdateBookingLineItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateBookingLineItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [lineItem] = await db.select().from(bookingLineItemsTable)
    .where(and(eq(bookingLineItemsTable.id, params.data.lineItemId), eq(bookingLineItemsTable.bookingId, params.data.id)));
  if (!lineItem) {
    res.status(404).json({ error: "Booking line item not found" });
    return;
  }
  if (parsed.data.eventId !== undefined && parsed.data.eventId !== null) {
    const [event] = await db.select().from(eventsTable)
      .where(and(eq(eventsTable.id, parsed.data.eventId), eq(eventsTable.bookingId, params.data.id)));
    if (!event) {
      res.status(400).json({ error: "Event does not belong to this booking" });
      return;
    }
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.serviceItemId !== undefined) updateData.serviceItemId = parsed.data.serviceItemId;
  if (parsed.data.eventId !== undefined) updateData.eventId = parsed.data.eventId;
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.kind !== undefined) updateData.kind = parsed.data.kind;
  if (parsed.data.quantity !== undefined) updateData.quantity = parsed.data.quantity.toFixed(2);
  if (parsed.data.unitPrice !== undefined) updateData.unitPrice = parsed.data.unitPrice.toFixed(2);
  if (parsed.data.unitLabel !== undefined) updateData.unitLabel = parsed.data.unitLabel;
  if (parsed.data.calculationNote !== undefined) updateData.calculationNote = parsed.data.calculationNote;
  if (parsed.data.sortOrder !== undefined) updateData.sortOrder = parsed.data.sortOrder;

  const [updated] = await db.update(bookingLineItemsTable)
    .set(updateData)
    .where(eq(bookingLineItemsTable.id, params.data.lineItemId))
    .returning();
  const assignedEvent = updated.eventId
    ? (await db.select().from(eventsTable).where(eq(eventsTable.id, updated.eventId)))[0]
    : null;
  await recomputeGrandTotal(params.data.id);
  await recordBookingActivity(
    params.data.id,
    "line_item.updated",
    parsed.data.eventId !== undefined ? "Service assignment updated" : "Service or fee updated",
    parsed.data.eventId !== undefined
      ? assignedEvent
        ? `${updated.name} was assigned to ${assignedEvent.eventName}.`
        : `${updated.name} was moved to booking-level charges.`
      : `${updated.name} was updated.`,
  );
  res.json(UpdateBookingLineItemResponse.parse(serializeLineItem(updated)));
});

// Remove selected service or fee
router.delete("/bookings/:id/line-items/:lineItemId", async (req, res): Promise<void> => {
  const params = DeleteBookingLineItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [lineItem] = await db.delete(bookingLineItemsTable)
    .where(and(eq(bookingLineItemsTable.id, params.data.lineItemId), eq(bookingLineItemsTable.bookingId, params.data.id)))
    .returning();
  if (!lineItem) {
    res.status(404).json({ error: "Booking line item not found" });
    return;
  }
  await recomputeGrandTotal(params.data.id);
  await recordBookingActivity(
    params.data.id,
    "line_item.deleted",
    "Service or fee removed",
    `${lineItem.name} was removed from the booking.`,
  );
  res.sendStatus(204);
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
  if (parsed.data.sortOrder !== undefined) updateData.sortOrder = parsed.data.sortOrder;
  if (parsed.data.kind !== undefined) updateData.kind = parsed.data.kind;
  const [updated] = await db.update(eventsTable).set(updateData).where(eq(eventsTable.id, params.data.eventId)).returning();
  await recomputeGrandTotal(params.data.id);
  await syncFirstServiceDateFromEvents(params.data.id);
  await recordBookingActivity(
    params.data.id,
    "event.updated",
    "Event updated",
    `${updated.eventName} was updated.`,
  );
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
  await syncFirstServiceDateFromEvents(params.data.id);
  await recordBookingActivity(
    params.data.id,
    "event.deleted",
    "Event deleted",
    `${event.eventName} was removed from the schedule.`,
  );
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
  const events = await db.select().from(eventsTable).where(eq(eventsTable.bookingId, params.data.id)).orderBy(eventsTable.sortOrder, eventsTable.eventDate, eventsTable.id);
  const firstServiceDate = await syncFirstServiceDateFromEvents(params.data.id);
  const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.bookingId, params.data.id));
  const lineItems = await db
    .select()
    .from(bookingLineItemsTable)
    .where(eq(bookingLineItemsTable.bookingId, params.data.id))
    .orderBy(bookingLineItemsTable.sortOrder, bookingLineItemsTable.id);
  const activity = await db
    .select()
    .from(bookingActivityTable)
    .where(eq(bookingActivityTable.bookingId, params.data.id))
    .orderBy(desc(bookingActivityTable.createdAt), desc(bookingActivityTable.id));
  const bookingSerialized = {
    ...serializeBooking({ ...row.booking, firstServiceDate }, row.client.name),
    clientEmail: row.client.email,
    clientPhone: row.client.phone ?? null,
    events: events.map(serializeEvent),
    payments: payments.map(serializePayment),
    lineItems: lineItems.map(serializeLineItem),
    activity: activity.map(serializeActivity),
  };
  const clientSerialized = {
    ...row.client,
    createdAt: row.client.createdAt.toISOString(),
  };
  const artistProfile = await getOrCreateArtistProfile();
  const defaultTemplate = await ensureDefaultContractTemplate();
  const [selectedTemplate] = row.booking.contractTemplateId
    ? await db.select().from(contractTemplatesTable).where(eq(contractTemplatesTable.id, row.booking.contractTemplateId))
    : [];
  const contractTemplate = selectedTemplate?.active ? selectedTemplate : defaultTemplate;
  const artistBusinessName = (artistProfile as { businessName?: string | null; [key: string]: unknown }).businessName?.trim()
    || ((artistProfile as { business_name?: string | null })["business_name"]?.trim() || "");

  res.json(GetContractResponse.parse({
    booking: bookingSerialized,
    client: clientSerialized,
    events: events.map(serializeEvent),
    contractTemplate: serializeContractTemplate(contractTemplate),
    artistName: artistProfile.displayName,
    artistBusinessName: artistBusinessName || artistProfile.displayName,
    artistEmail: artistProfile.email,
    artistPhone: artistProfile.phone,
    artistPaymentMethod: artistProfile.paymentMethod,
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
    await recordBookingActivity(params.data.id, "booking.updated", "Retainer marked paid", "Recording the retainer payment marked the retainer as paid.");
  } else if (parsed.data.type === "balance") {
    await db.update(bookingsTable).set({ balancePaid: true }).where(eq(bookingsTable.id, params.data.id));
    await recordBookingActivity(params.data.id, "booking.updated", "Balance marked paid", "Recording the balance payment marked the balance as paid.");
  }
  await recordBookingActivity(
    params.data.id,
    "payment.recorded",
    "Payment recorded",
    `${parsed.data.type} payment of ${money(parsed.data.amount)} was recorded.`,
  );
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
  await recordBookingActivity(
    payment.bookingId,
    "payment.deleted",
    "Payment deleted",
    `${payment.type} payment of ${money(parseFloat(payment.amount as unknown as string))} was deleted.`,
  );
  res.sendStatus(204);
});

export default router;
