import { pgTable, serial, integer, text, boolean, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";
import { contractTemplatesTable } from "./contract-templates";

export const bookingsTable = pgTable("bookings", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clientsTable.id, { onDelete: "cascade" }),
  contractTemplateId: integer("contract_template_id").references(() => contractTemplatesTable.id, { onDelete: "set null" }),
  eventType: text("event_type").notNull(),
  location: text("location").notNull(),
  locationDetail: text("location_detail"),
  firstServiceDate: text("first_service_date"),
  status: text("status").notNull().default("draft"),
  grandTotal: numeric("grand_total", { precision: 10, scale: 2 }).notNull().default("0"),
  retainerAmount: numeric("retainer_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  retainerPaid: boolean("retainer_paid").notNull().default(false),
  balancePaid: boolean("balance_paid").notNull().default(false),
  balanceDueDate: text("balance_due_date"),
  paymentMethod: text("payment_method"),
  earlyMorningFee: numeric("early_morning_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  travelFee: numeric("travel_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBookingSchema = createInsertSchema(bookingsTable).omit({ id: true, createdAt: true });
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookingsTable.$inferSelect;
