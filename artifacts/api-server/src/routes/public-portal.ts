import { Router, type IRouter } from "express";
import { and, desc, eq, isNull } from "drizzle-orm";
import {
  db,
  bookingShareLinksTable,
  bookingsTable,
  clientsTable,
  eventsTable,
  bookingLineItemsTable,
  paymentsTable,
  contractTemplatesTable,
  artistProfilesTable,
  contractSignaturesTable,
  bookingActivityTable,
} from "@workspace/db";
import {
  GetPortalBookingParams,
  GetPortalBookingResponse,
  SignPortalContractParams,
  SignPortalContractBody,
  SignPortalContractResponse,
} from "@workspace/api-zod";
import { createNotification } from "../lib/notifications";

const router: IRouter = Router();

function serializeBooking(b: typeof bookingsTable.$inferSelect, clientName: string) {
  return {
    ...b,
    clientName,
    grandTotal: parseFloat(b.grandTotal as unknown as string),
    retainerAmount: parseFloat(b.retainerAmount as unknown as string),
    earlyMorningFee: parseFloat(b.earlyMorningFee as unknown as string),
    travelFee: parseFloat(b.travelFee as unknown as string),
    deletedAt: b.deletedAt ? b.deletedAt.toISOString() : null,
    signedAt: b.signedAt ? b.signedAt.toISOString() : null,
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

function serializePayment(p: typeof paymentsTable.$inferSelect) {
  return {
    ...p,
    amount: parseFloat(p.amount as unknown as string),
    paidAt: p.paidAt.toISOString(),
  };
}

async function loadPortalPayload(token: string) {
  const [link] = await db
    .select()
    .from(bookingShareLinksTable)
    .where(and(eq(bookingShareLinksTable.token, token), isNull(bookingShareLinksTable.revokedAt)))
    .limit(1);
  if (!link) return null;

  const [row] = await db
    .select({ booking: bookingsTable, client: clientsTable })
    .from(bookingsTable)
    .innerJoin(clientsTable, eq(bookingsTable.clientId, clientsTable.id))
    .where(eq(bookingsTable.id, link.bookingId));
  if (!row) return null;

  const events = await db
    .select()
    .from(eventsTable)
    .where(eq(eventsTable.bookingId, link.bookingId))
    .orderBy(eventsTable.sortOrder, eventsTable.eventDate, eventsTable.id);
  const lineItems = await db
    .select()
    .from(bookingLineItemsTable)
    .where(eq(bookingLineItemsTable.bookingId, link.bookingId))
    .orderBy(bookingLineItemsTable.sortOrder, bookingLineItemsTable.id);
  const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.bookingId, link.bookingId));
  const activity = await db
    .select()
    .from(bookingActivityTable)
    .where(eq(bookingActivityTable.bookingId, link.bookingId))
    .orderBy(desc(bookingActivityTable.createdAt), desc(bookingActivityTable.id));

  const [contractTemplate] = row.booking.contractTemplateId
    ? await db.select().from(contractTemplatesTable).where(eq(contractTemplatesTable.id, row.booking.contractTemplateId))
    : [];
  const [defaultTemplate] = await db
    .select()
    .from(contractTemplatesTable)
    .where(eq(contractTemplatesTable.isDefault, true))
    .limit(1);
  const template = contractTemplate ?? defaultTemplate;
  if (!template) return null;

  const [artist] = await db.select().from(artistProfilesTable).orderBy(artistProfilesTable.id).limit(1);

  const grandTotal = parseFloat(row.booking.grandTotal as unknown as string);
  const retainerAmount = parseFloat(row.booking.retainerAmount as unknown as string);
  const balanceDue = Math.max(0, grandTotal - (row.booking.retainerPaid ? retainerAmount : 0));

  return {
    link,
    payload: {
      booking: {
        ...serializeBooking(row.booking, row.client.name),
        clientEmail: row.client.email,
        clientPhone: row.client.phone ?? null,
        events: events.map(serializeEvent),
        payments: payments.map(serializePayment),
        lineItems: lineItems.map(serializeLineItem),
        activity: activity.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })),
      },
      client: { ...row.client, createdAt: row.client.createdAt.toISOString() },
      events: events.map(serializeEvent),
      lineItems: lineItems.map(serializeLineItem),
      payments: payments.map(serializePayment),
      signed: !!row.booking.signedAt,
      signedAt: row.booking.signedAt ? row.booking.signedAt.toISOString() : null,
      signedByName: row.booking.signedByName,
      retainerAmount,
      balanceDue,
      grandTotal,
      contractTemplate: {
        ...template,
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString(),
      },
      artistName: artist?.displayName ?? "Studio",
      artistBusinessName: artist?.businessName ?? artist?.displayName ?? "Studio",
      artistEmail: artist?.email ?? null,
      artistPhone: artist?.phone ?? null,
      artistPaymentMethod: artist?.paymentMethod ?? null,
      zelleHandle: artist?.zelleHandle ?? null,
      venmoHandle: artist?.venmoHandle ?? null,
      cashAppHandle: artist?.cashAppHandle ?? null,
      paymentInstructions: artist?.paymentInstructions ?? null,
    },
  };
}

router.get("/public/portal/:token", async (req, res): Promise<void> => {
  const params = GetPortalBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const result = await loadPortalPayload(params.data.token);
  if (!result) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  await db
    .update(bookingShareLinksTable)
    .set({ viewCount: result.link.viewCount + 1, lastViewedAt: new Date() })
    .where(eq(bookingShareLinksTable.id, result.link.id));

  res.json(GetPortalBookingResponse.parse(result.payload));
});

router.post("/public/portal/:token/sign", async (req, res): Promise<void> => {
  const params = SignPortalContractParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = SignPortalContractBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const result = await loadPortalPayload(params.data.token);
  if (!result) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const snapshot = JSON.stringify(result.payload);
  const ipAddress = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.ip ?? null;
  const userAgent = req.headers["user-agent"] ?? null;

  await db.insert(contractSignaturesTable).values({
    bookingId: result.payload.booking.id,
    signerName: body.data.signerName,
    signerInitials: body.data.signerInitials,
    signerEmail: body.data.signerEmail ?? null,
    contractSnapshot: snapshot,
    ipAddress,
    userAgent: userAgent ?? null,
  });

  await db
    .update(bookingsTable)
    .set({ signedAt: new Date(), signedByName: body.data.signerName, lifecycleStage: "signed" })
    .where(eq(bookingsTable.id, result.payload.booking.id));

  await db.insert(bookingActivityTable).values({
    bookingId: result.payload.booking.id,
    action: "contract.signed",
    title: "Contract signed",
    description: `${body.data.signerName} signed the contract via the portal.`,
  });

  await createNotification({
    category: "signature",
    title: `${body.data.signerName} signed the contract`,
    body: `Booking #${result.payload.booking.id} contract signed via portal.`,
    href: `/bookings/${result.payload.booking.id}`,
    resourceType: "booking",
    resourceId: result.payload.booking.id,
  });

  const refreshed = await loadPortalPayload(params.data.token);
  if (!refreshed) {
    res.status(500).json({ error: "Failed to reload portal" });
    return;
  }
  res.json(SignPortalContractResponse.parse(refreshed.payload));
});

export default router;
