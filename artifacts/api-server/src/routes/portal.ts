import { Router, type IRouter } from "express";
import { eq, isNull, and } from "drizzle-orm";
import {
  db,
  bookingShareLinksTable,
  bookingsTable,
  clientsTable,
} from "@workspace/db";
import {
  GetBookingShareLinkParams,
  GetBookingShareLinkResponse,
  RotateBookingShareLinkParams,
  RotateBookingShareLinkResponse,
  RevokeBookingShareLinkParams,
} from "@workspace/api-zod";
import { generateToken } from "../lib/tokens";

const router: IRouter = Router();

function portalUrl(token: string) {
  return `/p/${token}`;
}

function serialize(row: typeof bookingShareLinksTable.$inferSelect) {
  return {
    ...row,
    url: portalUrl(row.token),
    lastViewedAt: row.lastViewedAt ? row.lastViewedAt.toISOString() : null,
    revokedAt: row.revokedAt ? row.revokedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

async function ensureLinkForBooking(bookingId: number) {
  const [active] = await db
    .select()
    .from(bookingShareLinksTable)
    .where(and(eq(bookingShareLinksTable.bookingId, bookingId), isNull(bookingShareLinksTable.revokedAt)))
    .limit(1);
  if (active) return active;
  const [created] = await db
    .insert(bookingShareLinksTable)
    .values({ bookingId, token: generateToken() })
    .returning();
  return created;
}

router.get("/bookings/:id/share-link", async (req, res): Promise<void> => {
  const params = GetBookingShareLinkParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, params.data.id));
  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  const link = await ensureLinkForBooking(params.data.id);
  res.json(GetBookingShareLinkResponse.parse(serialize(link)));
});

router.post("/bookings/:id/share-link", async (req, res): Promise<void> => {
  const params = RotateBookingShareLinkParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, params.data.id));
  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  await db
    .update(bookingShareLinksTable)
    .set({ revokedAt: new Date() })
    .where(and(eq(bookingShareLinksTable.bookingId, params.data.id), isNull(bookingShareLinksTable.revokedAt)));
  const [link] = await db
    .insert(bookingShareLinksTable)
    .values({ bookingId: params.data.id, token: generateToken() })
    .returning();
  res.json(RotateBookingShareLinkResponse.parse(serialize(link)));
});

router.delete("/bookings/:id/share-link", async (req, res): Promise<void> => {
  const params = RevokeBookingShareLinkParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db
    .update(bookingShareLinksTable)
    .set({ revokedAt: new Date() })
    .where(and(eq(bookingShareLinksTable.bookingId, params.data.id), isNull(bookingShareLinksTable.revokedAt)));
  res.sendStatus(204);
});

export default router;
