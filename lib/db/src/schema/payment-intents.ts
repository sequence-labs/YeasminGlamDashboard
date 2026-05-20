import { pgTable, serial, integer, text, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { bookingsTable } from "./bookings";

export const paymentIntentsTable = pgTable("payment_intents", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookingsTable.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  kind: text("kind").notNull(),
  method: text("method").notNull().default("zelle"),
  status: text("status").notNull().default("requested"),
  note: text("note"),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  paidAt: timestamp("paid_at"),
  cancelledAt: timestamp("cancelled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPaymentIntentSchema = createInsertSchema(paymentIntentsTable).omit({ id: true, createdAt: true });
export type InsertPaymentIntent = z.infer<typeof insertPaymentIntentSchema>;
export type PaymentIntent = typeof paymentIntentsTable.$inferSelect;
