import { Router, type IRouter } from "express";
import { and, desc, eq, isNull } from "drizzle-orm";
import {
  db,
  addonRequestsTable,
  addonRequestItemsTable,
  bookingsTable,
  clientsTable,
  serviceItemsTable,
  bookingShareLinksTable,
} from "@workspace/db";
import { generateToken } from "../lib/tokens";
import { maskEmail } from "../lib/email";
import {
  approvedAddonsTotal,
  clientIp,
  loadRequestItems,
  num,
  recordBookingActivity,
  serializeRequest,
  userAgent,
  writeAudit,
  type AddonRequestRow,
} from "../lib/addons";

const router: IRouter = Router();

// A pending request stays approvable for this long; after that it is treated as expired.
const REQUEST_TTL_MS = 1000 * 60 * 60 * 24 * 60; // 60 days
const MAX_NOTE_LENGTH = 1000;

type RequestedItem = { serviceItemId: number; quantity: number };

function parseRequestedItems(value: unknown): RequestedItem[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const out: RequestedItem[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") return null;
    const serviceItemId = Number((raw as Record<string, unknown>).serviceItemId);
    const quantityRaw = (raw as Record<string, unknown>).quantity;
    const quantity = quantityRaw == null ? 1 : Number(quantityRaw);
    if (!Number.isInteger(serviceItemId) || serviceItemId <= 0) return null;
    if (!Number.isFinite(quantity) || quantity <= 0) return null;
    out.push({ serviceItemId, quantity });
  }
  return out;
}

async function activeShareToken(bookingId: number): Promise<string | null> {
  const [link] = await db
    .select()
    .from(bookingShareLinksTable)
    .where(and(eq(bookingShareLinksTable.bookingId, bookingId), isNull(bookingShareLinksTable.revokedAt)))
    .limit(1);
  return link?.token ?? null;
}

/**
 * Builds an add-on request from a list of catalog item ids, snapshotting the client
 * contact, the DocuSign envelope id, and each service's price at creation time. The
 * request row, its items, the request.created audit row (which captures the intended
 * verification destination), and the booking activity entry are written in a single
 * transaction so a request can never exist without its audit. Shared by the artist admin
 * endpoint and the client-initiated pre-event menu endpoint. Returns the created row, or
 * null if the booking / items are invalid.
 */
export async function createAddonRequest(opts: {
  bookingId: number;
  items: RequestedItem[];
  note?: string | null;
  source: "on_day" | "pre_event";
  actorType: "artist" | "client";
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<AddonRequestRow | null> {
  const [row] = await db
    .select({ booking: bookingsTable, client: clientsTable })
    .from(bookingsTable)
    .innerJoin(clientsTable, eq(bookingsTable.clientId, clientsTable.id))
    .where(eq(bookingsTable.id, opts.bookingId));
  if (!row) return null;

  // Resolve and price-lock each catalog item.
  const resolved: {
    serviceItemId: number;
    name: string;
    description: string | null;
    unitLabel: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
    sortOrder: number;
  }[] = [];
  let total = 0;
  for (let i = 0; i < opts.items.length; i++) {
    const requested = opts.items[i];
    const [service] = await db
      .select()
      .from(serviceItemsTable)
      .where(eq(serviceItemsTable.id, requested.serviceItemId));
    if (!service) return null;
    const unitPrice = num(service.defaultUnitPrice);
    const lineTotal = unitPrice * requested.quantity;
    total += lineTotal;
    resolved.push({
      serviceItemId: service.id,
      name: service.name,
      description: service.description ?? null,
      unitLabel: service.unitLabel,
      unitPrice,
      quantity: requested.quantity,
      lineTotal,
      sortOrder: i,
    });
  }

  const clientEmail = row.client.email ?? null;
  const destinationMasked = clientEmail ? maskEmail(clientEmail) : null;
  const expiresAt = new Date(Date.now() + REQUEST_TTL_MS);
  const activity =
    opts.actorType === "artist"
      ? {
          title: "Add-on requested",
          description: `Artist created an add-on request ($${total.toFixed(2)}) awaiting client approval.`,
        }
      : {
          title: "Add-on selected from menu",
          description: `Client pre-selected an add-on ($${total.toFixed(2)}) from the upgrade menu; awaiting verified approval.`,
        };
  const auditDetail =
    opts.actorType === "artist"
      ? `Artist requested ${resolved.length} add-on(s) totaling $${total.toFixed(2)}. Verification will be sent to ${destinationMasked ?? "no email on file"}.`
      : `Client selected ${resolved.length} add-on(s) from the pre-event menu ($${total.toFixed(2)}). Verification will be sent to ${destinationMasked ?? "no email on file"}.`;

  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(addonRequestsTable)
      .values({
        bookingId: opts.bookingId,
        token: generateToken(),
        status: "pending",
        source: opts.source,
        artistNote: opts.note?.trim() ? opts.note.trim() : null,
        clientNameSnapshot: row.client.name,
        clientEmailSnapshot: clientEmail,
        clientPhoneSnapshot: row.client.phone ?? null,
        docusignEnvelopeIdSnapshot: row.booking.docusignEnvelopeId ?? null,
        totalAmount: total.toFixed(2),
        expiresAt,
      })
      .returning();

    await tx.insert(addonRequestItemsTable).values(
      resolved.map((r) => ({
        requestId: created.id,
        serviceItemId: r.serviceItemId,
        name: r.name,
        description: r.description,
        unitLabel: r.unitLabel,
        unitPrice: r.unitPrice.toFixed(2),
        quantity: r.quantity.toFixed(2),
        lineTotal: r.lineTotal.toFixed(2),
        sortOrder: r.sortOrder,
      })),
    );

    await writeAudit(
      {
        requestId: created.id,
        bookingId: opts.bookingId,
        action: "request.created",
        actorType: opts.actorType,
        amountSnapshot: total,
        docusignEnvelopeIdSnapshot: created.docusignEnvelopeIdSnapshot,
        destinationMasked,
        ipAddress: opts.ipAddress ?? null,
        userAgent: opts.userAgent ?? null,
        detail: auditDetail,
      },
      tx,
    );
    await recordBookingActivity(opts.bookingId, "addon.requested", activity.title, activity.description, tx);

    return created;
  });
}

// POST /bookings/:id/addon-requests — artist creates an add-on request (status=pending).
// This endpoint can ONLY create a pending request; it cannot approve.
router.post("/bookings/:id/addon-requests", async (req, res): Promise<void> => {
  const bookingId = Number(req.params.id);
  if (!Number.isInteger(bookingId)) {
    res.status(400).json({ error: "Invalid booking id" });
    return;
  }
  const items = parseRequestedItems(req.body?.items);
  if (!items) {
    res.status(400).json({ error: "items must be a non-empty array of { serviceItemId, quantity }" });
    return;
  }
  const source = req.body?.source === "pre_event" ? "pre_event" : "on_day";
  if (req.body?.note != null && typeof req.body.note !== "string") {
    res.status(400).json({ error: "note must be a string" });
    return;
  }
  const note = typeof req.body?.note === "string" ? req.body.note : null;
  if (note && note.length > MAX_NOTE_LENGTH) {
    res.status(400).json({ error: `note must be ${MAX_NOTE_LENGTH} characters or fewer` });
    return;
  }

  const created = await createAddonRequest({
    bookingId,
    items,
    note,
    source,
    actorType: "artist",
    ipAddress: clientIp(req),
    userAgent: userAgent(req),
  });
  if (!created) {
    res.status(400).json({ error: "Booking not found or one or more services are invalid" });
    return;
  }

  const createdItems = await loadRequestItems(created.id);
  res.status(201).json(serializeRequest(created, createdItems));
});

// GET /bookings/:id/addon-requests — list requests for a booking + computed totals +
// the booking's DocuSign envelope id + active share token (for the menu link).
router.get("/bookings/:id/addon-requests", async (req, res): Promise<void> => {
  const bookingId = Number(req.params.id);
  if (!Number.isInteger(bookingId)) {
    res.status(400).json({ error: "Invalid booking id" });
    return;
  }
  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId));
  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  const requests = await db
    .select()
    .from(addonRequestsTable)
    .where(eq(addonRequestsTable.bookingId, bookingId))
    .orderBy(desc(addonRequestsTable.createdAt), desc(addonRequestsTable.id));

  const serialized = [];
  for (const request of requests) {
    const items = await loadRequestItems(request.id);
    serialized.push(serializeRequest(request, items));
  }

  res.json({
    bookingId,
    docusignEnvelopeId: booking.docusignEnvelopeId ?? null,
    approvedAddonsTotal: await approvedAddonsTotal(bookingId),
    shareToken: await activeShareToken(bookingId),
    requests: serialized,
  });
});

// POST /addon-requests/:id/cancel — artist cancels a still-pending request. The status
// change and its audit are atomic, and the UPDATE is guarded on status='pending' so it
// can never clobber a concurrent client approval/decline.
router.post("/addon-requests/:id/cancel", async (req, res): Promise<void> => {
  const requestId = Number(req.params.id);
  if (!Number.isInteger(requestId)) {
    res.status(400).json({ error: "Invalid request id" });
    return;
  }
  const [request] = await db.select().from(addonRequestsTable).where(eq(addonRequestsTable.id, requestId));
  if (!request) {
    res.status(404).json({ error: "Request not found" });
    return;
  }

  const updated = await db.transaction(async (tx) => {
    const rows = await tx
      .update(addonRequestsTable)
      .set({ status: "cancelled", decidedAt: new Date() })
      .where(and(eq(addonRequestsTable.id, requestId), eq(addonRequestsTable.status, "pending")))
      .returning();
    if (rows.length === 0) return null;
    await writeAudit(
      {
        requestId,
        bookingId: request.bookingId,
        action: "request.cancelled",
        actorType: "artist",
        amountSnapshot: num(request.totalAmount),
        ipAddress: clientIp(req),
        userAgent: userAgent(req),
        detail: "Artist cancelled the pending add-on request.",
      },
      tx,
    );
    await recordBookingActivity(
      request.bookingId,
      "addon.cancelled",
      "Add-on cancelled",
      "Artist cancelled a pending add-on request.",
      tx,
    );
    return rows[0];
  });

  if (!updated) {
    res.status(409).json({ error: `This request is no longer pending and cannot be cancelled.` });
    return;
  }

  const items = await loadRequestItems(requestId);
  res.json(serializeRequest(updated, items));
});

// PUT /bookings/:id/docusign-envelope — store/update the master agreement reference.
router.put("/bookings/:id/docusign-envelope", async (req, res): Promise<void> => {
  const bookingId = Number(req.params.id);
  if (!Number.isInteger(bookingId)) {
    res.status(400).json({ error: "Invalid booking id" });
    return;
  }
  const raw = req.body?.envelopeId;
  if (raw != null && typeof raw !== "string") {
    res.status(400).json({ error: "envelopeId must be a string or null" });
    return;
  }
  const envelopeId = typeof raw === "string" && raw.trim() ? raw.trim() : null;
  if (envelopeId && envelopeId.length > 255) {
    res.status(400).json({ error: "envelopeId is too long" });
    return;
  }

  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId));
  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  await db.update(bookingsTable).set({ docusignEnvelopeId: envelopeId }).where(eq(bookingsTable.id, bookingId));
  res.json({ bookingId, docusignEnvelopeId: envelopeId });
});

export default router;
