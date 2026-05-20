import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import {
  db,
  paymentIntentsTable,
  bookingsTable,
  paymentsTable,
  bookingActivityTable,
} from "@workspace/db";
import {
  ListBookingPaymentIntentsParams,
  ListBookingPaymentIntentsResponse,
  CreatePaymentIntentParams,
  CreatePaymentIntentBody,
  UpdatePaymentIntentParams,
  UpdatePaymentIntentBody,
  UpdatePaymentIntentResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function serialize(p: typeof paymentIntentsTable.$inferSelect) {
  return {
    ...p,
    amount: parseFloat(p.amount as unknown as string),
    requestedAt: p.requestedAt.toISOString(),
    paidAt: p.paidAt ? p.paidAt.toISOString() : null,
    cancelledAt: p.cancelledAt ? p.cancelledAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
  };
}

router.get("/bookings/:id/payment-intents", async (req, res): Promise<void> => {
  const params = ListBookingPaymentIntentsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const rows = await db
    .select()
    .from(paymentIntentsTable)
    .where(eq(paymentIntentsTable.bookingId, params.data.id))
    .orderBy(desc(paymentIntentsTable.createdAt));
  res.json(ListBookingPaymentIntentsResponse.parse(rows.map(serialize)));
});

router.post("/bookings/:id/payment-intents", async (req, res): Promise<void> => {
  const params = CreatePaymentIntentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = CreatePaymentIntentBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, params.data.id));
  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  const [row] = await db
    .insert(paymentIntentsTable)
    .values({
      bookingId: params.data.id,
      amount: body.data.amount.toFixed(2),
      kind: body.data.kind,
      method: body.data.method,
      note: body.data.note ?? null,
      status: "requested",
    })
    .returning();
  await db.insert(bookingActivityTable).values({
    bookingId: params.data.id,
    action: "payment_intent.created",
    title: "Payment link sent",
    description: `${body.data.kind} payment request created via ${body.data.method}.`,
  });
  res.status(201).json(serialize(row));
});

router.patch("/payment-intents/:id", async (req, res): Promise<void> => {
  const params = UpdatePaymentIntentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdatePaymentIntentBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [existing] = await db.select().from(paymentIntentsTable).where(eq(paymentIntentsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (body.data.status !== undefined) {
    updates.status = body.data.status;
    if (body.data.status === "paid") updates.paidAt = new Date();
    if (body.data.status === "cancelled") updates.cancelledAt = new Date();
  }
  if (body.data.note !== undefined) updates.note = body.data.note;
  const [row] = await db
    .update(paymentIntentsTable)
    .set(updates)
    .where(eq(paymentIntentsTable.id, params.data.id))
    .returning();

  if (row && body.data.status === "paid" && existing.status !== "paid") {
    await db.insert(paymentsTable).values({
      bookingId: row.bookingId,
      amount: row.amount,
      type: row.kind === "balance" ? "balance" : row.kind === "retainer" ? "retainer" : "other",
      note: `${row.method} (intent #${row.id})`,
    });
    if (row.kind === "retainer") {
      await db.update(bookingsTable).set({ retainerPaid: true }).where(eq(bookingsTable.id, row.bookingId));
    } else if (row.kind === "balance") {
      await db.update(bookingsTable).set({ balancePaid: true }).where(eq(bookingsTable.id, row.bookingId));
    }
    await db.insert(bookingActivityTable).values({
      bookingId: row.bookingId,
      action: "payment.recorded",
      title: "Payment marked paid",
      description: `Manual confirmation for ${row.kind} via ${row.method}.`,
    });
  }

  res.json(UpdatePaymentIntentResponse.parse(serialize(row)));
});

export default router;
