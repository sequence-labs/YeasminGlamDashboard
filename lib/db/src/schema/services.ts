import { boolean, integer, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { bookingsTable } from "./bookings";
import { eventsTable } from "./events";

export const serviceItemsTable = pgTable("service_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  kind: text("kind").notNull().default("service"),
  defaultUnitPrice: numeric("default_unit_price", { precision: 10, scale: 2 }).notNull().default("0"),
  unitLabel: text("unit_label").notNull().default("person"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bookingLineItemsTable = pgTable("booking_line_items", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookingsTable.id, { onDelete: "cascade" }),
  eventId: integer("event_id").references(() => eventsTable.id, { onDelete: "set null" }),
  serviceItemId: integer("service_item_id").references(() => serviceItemsTable.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  kind: text("kind").notNull().default("service"),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull().default("0"),
  unitLabel: text("unit_label").notNull().default("person"),
  calculationNote: text("calculation_note"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertServiceItemSchema = createInsertSchema(serviceItemsTable).omit({ id: true, createdAt: true });
export const insertBookingLineItemSchema = createInsertSchema(bookingLineItemsTable).omit({ id: true });

export type InsertServiceItem = z.infer<typeof insertServiceItemSchema>;
export type ServiceItem = typeof serviceItemsTable.$inferSelect;
export type InsertBookingLineItem = z.infer<typeof insertBookingLineItemSchema>;
export type BookingLineItem = typeof bookingLineItemsTable.$inferSelect;
