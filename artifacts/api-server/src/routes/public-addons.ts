import { Router, type IRouter, type Request, type Response } from "express";
import { and, desc, eq, gt, isNull, lt, sql } from "drizzle-orm";
import {
  db,
  addonRequestsTable,
  addonVerificationsTable,
  bookingsTable,
  clientsTable,
  eventsTable,
  serviceItemsTable,
  bookingShareLinksTable,
  artistProfilesTable,
} from "@workspace/db";
import { generateOtp, hashOtp, verifyOtp, isProdLike } from "../lib/otp";
import { sendEmail, maskEmail } from "../lib/email";
import { renderAddonApprovalEmail } from "../lib/addon-emails";
import {
  approvedAddonsTotal,
  clientIp,
  loadRequestItems,
  num,
  recordBookingActivity,
  serializeItem,
  userAgent,
  writeAudit,
} from "../lib/addons";
import { createNotification } from "../lib/notifications";
import { createAddonRequest } from "./addons";

const router: IRouter = Router();
const OTP_TTL_MS = 1000 * 60 * 10; // 10 minutes
const SEND_WINDOW_MS = 1000 * 60; // resend throttle window
const MAX_SENDS_PER_WINDOW = 3;

type RequestRow = typeof addonRequestsTable.$inferSelect;

async function loadRequestByToken(token: string) {
  const [request] = await db.select().from(addonRequestsTable).where(eq(addonRequestsTable.token, token));
  if (!request) return null;
  const items = await loadRequestItems(request.id);
  const [firstEvent] = await db
    .select()
    .from(eventsTable)
    .where(eq(eventsTable.bookingId, request.bookingId))
    .orderBy(eventsTable.sortOrder, eventsTable.eventDate, eventsTable.id)
    .limit(1);
  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, request.bookingId));
  const [artist] = await db.select().from(artistProfilesTable).orderBy(artistProfilesTable.id).limit(1);
  const bookingHeadline = firstEvent?.eventName || booking?.eventType || "Your booking";
  return { request, items, bookingHeadline, artist };
}

/**
 * Lazily expires a pending request whose TTL has passed. Returns true if the request was
 * (or already is) expired. The transition to 'expired' is guarded + audited.
 */
async function expireIfNeeded(request: RequestRow, req: Request): Promise<boolean> {
  if (request.status !== "pending") return false;
  if (!request.expiresAt || request.expiresAt > new Date()) return false;
  const expired = await db.transaction(async (tx) => {
    const rows = await tx
      .update(addonRequestsTable)
      .set({ status: "expired", decidedAt: new Date() })
      .where(and(eq(addonRequestsTable.id, request.id), eq(addonRequestsTable.status, "pending")))
      .returning();
    if (rows.length === 0) return false;
    await writeAudit(
      {
        requestId: request.id,
        bookingId: request.bookingId,
        action: "request.expired",
        actorType: "system",
        amountSnapshot: num(request.totalAmount),
        ipAddress: clientIp(req),
        userAgent: userAgent(req),
        detail: "Request passed its expiry window before it was decided.",
      },
      tx,
    );
    return true;
  });
  return expired;
}

function publicRequestView(
  request: RequestRow,
  items: Awaited<ReturnType<typeof loadRequestItems>>,
  bookingHeadline: string,
  artist: typeof artistProfilesTable.$inferSelect | undefined,
) {
  return {
    status: request.status as "pending" | "approved" | "declined" | "expired" | "cancelled",
    source: request.source as "on_day" | "pre_event",
    artistNote: request.artistNote,
    clientName: request.clientNameSnapshot,
    total: num(request.totalAmount),
    items: items.map(serializeItem),
    bookingHeadline,
    destinationMasked: request.clientEmailSnapshot ? maskEmail(request.clientEmailSnapshot) : null,
    hasContact: Boolean(request.clientEmailSnapshot),
    decidedAt: request.decidedAt ? request.decidedAt.toISOString() : null,
    artistName: artist?.displayName ?? "Studio",
    businessName: artist?.businessName ?? artist?.displayName ?? "Studio",
  };
}

// GET /public/addon/:token — load the add-on request for the client (no code, no PII beyond
// the masked destination).
router.get("/public/addon/:token", async (req, res): Promise<void> => {
  const loaded = await loadRequestByToken(req.params.token);
  if (!loaded) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await expireIfNeeded(loaded.request, req);
  const refreshed = await loadRequestByToken(req.params.token);
  const current = refreshed ?? loaded;
  res.json(publicRequestView(current.request, current.items, current.bookingHeadline, current.artist));
});

// POST /public/addon/:token/send-code — email a one-time code to the client's snapshot
// contact. The plaintext code is only ever returned (as devCode) in non-production.
router.post("/public/addon/:token/send-code", async (req, res): Promise<void> => {
  const loaded = await loadRequestByToken(req.params.token);
  if (!loaded) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const { request } = loaded;
  if (request.status !== "pending") {
    res.status(409).json({ error: `This request is already ${request.status}.` });
    return;
  }
  if (await expireIfNeeded(request, req)) {
    res.status(409).json({ error: "This request has expired. Please contact the studio." });
    return;
  }
  const destination = request.clientEmailSnapshot;
  if (!destination) {
    res.status(400).json({ error: "No email is on file for this client. The studio must add one before you can approve." });
    return;
  }

  // Throttle resends.
  const since = new Date(Date.now() - SEND_WINDOW_MS);
  const recent = await db
    .select()
    .from(addonVerificationsTable)
    .where(and(eq(addonVerificationsTable.requestId, request.id), gt(addonVerificationsTable.createdAt, since)));
  if (recent.length >= MAX_SENDS_PER_WINDOW) {
    res.status(429).json({ error: "Too many code requests. Please wait a minute and try again." });
    return;
  }

  const code = generateOtp();
  const destinationMasked = maskEmail(destination);

  // Invalidate earlier unconsumed codes, store the new (hashed) code, and audit the send
  // atomically. The email is dispatched only after the transaction commits.
  await db.transaction(async (tx) => {
    await tx
      .update(addonVerificationsTable)
      .set({ consumedAt: new Date() })
      .where(and(eq(addonVerificationsTable.requestId, request.id), isNull(addonVerificationsTable.consumedAt)));
    await tx.insert(addonVerificationsTable).values({
      requestId: request.id,
      codeHash: hashOtp(request.id, code),
      destinationType: "email",
      destinationMasked,
      destination,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    });
    await writeAudit(
      {
        requestId: request.id,
        bookingId: request.bookingId,
        action: "verification.sent",
        actorType: "client",
        destinationMasked,
        ipAddress: clientIp(req),
        userAgent: userAgent(req),
        detail: `Verification code emailed to ${destinationMasked}.`,
      },
      tx,
    );
  });

  const email = renderAddonApprovalEmail({
    clientName: request.clientNameSnapshot,
    artistName: loaded.artist?.displayName ?? "Your artist",
    businessName: loaded.artist?.businessName ?? loaded.artist?.displayName ?? "Glam Studio",
    bookingHeadline: loaded.bookingHeadline,
    items: loaded.items.map((i) => ({
      quantity: num(i.quantity),
      name: i.name,
      lineTotal: num(i.lineTotal),
      unitLabel: i.unitLabel,
      unitPrice: num(i.unitPrice),
    })),
    total: num(request.totalAmount),
    code,
    expiresMinutes: Math.round(OTP_TTL_MS / 60000),
    artistEmail: loaded.artist?.email ?? null,
  });
  await sendEmail({ to: destination, subject: email.subject, text: email.text, html: email.html });

  res.json({
    sent: true,
    destinationMasked,
    // Dev convenience only — never present when GLAM_ADMIN_PASSWORD is configured.
    ...(isProdLike() ? {} : { devCode: code }),
  });
});

type Decision = "approved" | "declined";

async function decide(req: Request, res: Response, decision: Decision, token: string): Promise<void> {
  const loaded = await loadRequestByToken(token);
  if (!loaded) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const { request } = loaded;
  if (request.status !== "pending") {
    res.status(409).json({ error: `This request is already ${request.status}.` });
    return;
  }
  if (await expireIfNeeded(request, req)) {
    res.status(409).json({ error: "This request has expired. Please contact the studio." });
    return;
  }
  const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
  if (!/^\d{6}$/.test(code)) {
    res.status(400).json({ error: "Enter the 6-digit code from your email." });
    return;
  }

  // Newest unconsumed, unexpired verification.
  const [verification] = await db
    .select()
    .from(addonVerificationsTable)
    .where(
      and(
        eq(addonVerificationsTable.requestId, request.id),
        isNull(addonVerificationsTable.consumedAt),
        gt(addonVerificationsTable.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(addonVerificationsTable.id))
    .limit(1);

  if (!verification) {
    res.status(400).json({ error: "Your code has expired or hasn't been sent. Request a new code." });
    return;
  }

  // Atomically increment the attempt counter only while it is below the cap. If no row is
  // returned the cap is already reached — this closes the read-check-write race.
  const incremented = await db
    .update(addonVerificationsTable)
    .set({ attempts: sql`${addonVerificationsTable.attempts} + 1` })
    .where(and(eq(addonVerificationsTable.id, verification.id), lt(addonVerificationsTable.attempts, addonVerificationsTable.maxAttempts)))
    .returning();
  if (incremented.length === 0) {
    await writeAudit({
      requestId: request.id,
      bookingId: request.bookingId,
      action: "verification.failed",
      actorType: "client",
      destinationMasked: verification.destinationMasked,
      ipAddress: clientIp(req),
      userAgent: userAgent(req),
      detail: "Too many failed code attempts.",
    });
    res.status(429).json({ error: "Too many incorrect attempts. Request a new code." });
    return;
  }

  if (!verifyOtp(request.id, code, verification.codeHash)) {
    await writeAudit({
      requestId: request.id,
      bookingId: request.bookingId,
      action: "verification.failed",
      actorType: "client",
      destinationMasked: verification.destinationMasked,
      ipAddress: clientIp(req),
      userAgent: userAgent(req),
      detail: "Incorrect verification code submitted.",
    });
    res.status(400).json({ error: "That code is incorrect. Please try again." });
    return;
  }

  const ip = clientIp(req);
  const ua = userAgent(req);

  // Consume the code, flip status (guarded so a concurrent action can't double-decide),
  // and write both audit rows + the activity entry — all atomically.
  const outcome = await db.transaction(async (tx) => {
    await tx.update(addonVerificationsTable).set({ consumedAt: new Date() }).where(eq(addonVerificationsTable.id, verification.id));
    const updatedRows = await tx
      .update(addonRequestsTable)
      .set({ status: decision, decidedAt: new Date() })
      .where(and(eq(addonRequestsTable.id, request.id), eq(addonRequestsTable.status, "pending")))
      .returning();
    if (updatedRows.length === 0) return null;

    await writeAudit(
      {
        requestId: request.id,
        bookingId: request.bookingId,
        action: "verification.verified",
        actorType: "client",
        verified: true,
        destinationMasked: verification.destinationMasked,
        ipAddress: ip,
        userAgent: ua,
        detail: `Client verified identity via code sent to ${verification.destinationMasked}.`,
      },
      tx,
    );
    await writeAudit(
      {
        requestId: request.id,
        bookingId: request.bookingId,
        action: decision === "approved" ? "addon.approved" : "addon.declined",
        actorType: "client",
        verified: true,
        amountSnapshot: num(request.totalAmount),
        docusignEnvelopeIdSnapshot: request.docusignEnvelopeIdSnapshot,
        destinationMasked: verification.destinationMasked,
        ipAddress: ip,
        userAgent: ua,
        detail:
          decision === "approved"
            ? `Client approved add-on(s) totaling $${num(request.totalAmount).toFixed(2)}. Treated as a written amendment to the master agreement${request.docusignEnvelopeIdSnapshot ? ` (DocuSign envelope ${request.docusignEnvelopeIdSnapshot})` : ""}.`
            : `Client declined the add-on request.`,
      },
      tx,
    );
    await recordBookingActivity(
      request.bookingId,
      decision === "approved" ? "addon.approved" : "addon.declined",
      decision === "approved" ? "Add-on approved by client" : "Add-on declined by client",
      decision === "approved"
        ? `${request.clientNameSnapshot} approved an add-on ($${num(request.totalAmount).toFixed(2)}) via verified email code.`
        : `${request.clientNameSnapshot} declined an add-on request via verified email code.`,
      tx,
    );
    return updatedRows[0];
  });

  if (!outcome) {
    res.status(409).json({ error: "This request was already decided." });
    return;
  }

  await createNotification({
    category: "addon",
    title:
      decision === "approved"
        ? `${request.clientNameSnapshot} approved an add-on ($${num(request.totalAmount).toFixed(2)})`
        : `${request.clientNameSnapshot} declined an add-on`,
    body: `Booking #${request.bookingId} · ${loaded.bookingHeadline}`,
    href: `/bookings/${request.bookingId}`,
    resourceType: "booking",
    resourceId: request.bookingId,
  });

  res.json(publicRequestView(outcome, loaded.items, loaded.bookingHeadline, loaded.artist));
}

// POST /public/addon/:token/approve — verified client approval. Approval status can ONLY
// be set here (public, token + OTP gated); no authenticated artist endpoint can set it.
router.post("/public/addon/:token/approve", (req, res) => decide(req, res, "approved", req.params.token));

// POST /public/addon/:token/decline — verified client decline (attributable).
router.post("/public/addon/:token/decline", (req, res) => decide(req, res, "declined", req.params.token));

// GET /public/addon-menu/:shareToken — pre-event upgrade menu for a booking, keyed off the
// booking's existing portal share link. Lists the live add-on catalog.
router.get("/public/addon-menu/:shareToken", async (req, res): Promise<void> => {
  const [link] = await db
    .select()
    .from(bookingShareLinksTable)
    .where(and(eq(bookingShareLinksTable.token, req.params.shareToken), isNull(bookingShareLinksTable.revokedAt)))
    .limit(1);
  if (!link) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const [row] = await db
    .select({ booking: bookingsTable, client: clientsTable })
    .from(bookingsTable)
    .innerJoin(clientsTable, eq(bookingsTable.clientId, clientsTable.id))
    .where(eq(bookingsTable.id, link.bookingId));
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const [firstEvent] = await db
    .select()
    .from(eventsTable)
    .where(eq(eventsTable.bookingId, link.bookingId))
    .orderBy(eventsTable.sortOrder, eventsTable.eventDate, eventsTable.id)
    .limit(1);
  const [artist] = await db.select().from(artistProfilesTable).orderBy(artistProfilesTable.id).limit(1);
  const services = await db
    .select()
    .from(serviceItemsTable)
    .where(and(eq(serviceItemsTable.active, true), eq(serviceItemsTable.showOnUpgradeMenu, true)))
    .orderBy(serviceItemsTable.sortOrder, serviceItemsTable.id);

  res.json({
    bookingHeadline: firstEvent?.eventName || row.booking.eventType || "Your booking",
    clientName: row.client.name,
    artistName: artist?.displayName ?? "Studio",
    businessName: artist?.businessName ?? artist?.displayName ?? "Studio",
    approvedAddonsTotal: await approvedAddonsTotal(link.bookingId),
    services: services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      kind: s.kind as "service" | "fee",
      unitLabel: s.unitLabel,
      defaultUnitPrice: num(s.defaultUnitPrice),
    })),
  });
});

// POST /public/addon-menu/:shareToken/request — client self-initiates a pre-event request
// from the menu. Creates a pending request; approval still requires the OTP flow above.
router.post("/public/addon-menu/:shareToken/request", async (req, res): Promise<void> => {
  const [link] = await db
    .select()
    .from(bookingShareLinksTable)
    .where(and(eq(bookingShareLinksTable.token, req.params.shareToken), isNull(bookingShareLinksTable.revokedAt)))
    .limit(1);
  if (!link) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const rawItems = req.body?.items;
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    res.status(400).json({ error: "Select at least one add-on." });
    return;
  }
  const items: { serviceItemId: number; quantity: number }[] = [];
  for (const raw of rawItems) {
    const serviceItemId = Number(raw?.serviceItemId);
    const quantity = raw?.quantity == null ? 1 : Number(raw.quantity);
    if (!Number.isInteger(serviceItemId) || serviceItemId <= 0 || !Number.isFinite(quantity) || quantity <= 0) {
      res.status(400).json({ error: "Invalid selection." });
      return;
    }
    items.push({ serviceItemId, quantity });
  }
  if (req.body?.note != null && typeof req.body.note !== "string") {
    res.status(400).json({ error: "note must be a string" });
    return;
  }
  const note = typeof req.body?.note === "string" ? req.body.note.slice(0, 1000) : null;

  const created = await createAddonRequest({
    bookingId: link.bookingId,
    items,
    note,
    source: "pre_event",
    actorType: "client",
    ipAddress: clientIp(req),
    userAgent: userAgent(req),
  });
  if (!created) {
    res.status(400).json({ error: "Could not build request — one or more services are invalid." });
    return;
  }
  await createNotification({
    category: "addon",
    title: `${created.clientNameSnapshot} selected an add-on from the menu`,
    body: `Booking #${link.bookingId} · awaiting their verified approval`,
    href: `/bookings/${link.bookingId}`,
    resourceType: "booking",
    resourceId: link.bookingId,
  });

  res.status(201).json({ token: created.token, approvalUrl: `/a/${created.token}` });
});

export default router;
