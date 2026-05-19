import { pgTable, serial, integer, text, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { bookingsTable } from "./bookings";

export const eventsTable = pgTable("booking_events", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookingsTable.id, { onDelete: "cascade" }),
  eventName: text("event_name").notNull(),
  eventDate: text("event_date").notNull(),
  servicesBegin: text("services_begin"),
  completionTarget: text("completion_target"),
  sortOrder: integer("sort_order").notNull().default(0),
  hairAndMakeupCount: integer("hair_and_makeup_count").notNull().default(0),
  hairOnlyCount: integer("hair_only_count").notNull().default(0),
  makeupOnlyCount: integer("makeup_only_count").notNull().default(0),
  makeupRate: numeric("makeup_rate", { precision: 10, scale: 2 }).notNull().default("150"),
  hairRate: numeric("hair_rate", { precision: 10, scale: 2 }).notNull().default("135"),
  hairAndMakeupRate: numeric("hair_and_makeup_rate", { precision: 10, scale: 2 }).notNull().default("285"),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
});

export const insertEventSchema = createInsertSchema(eventsTable).omit({ id: true });
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type BookingEvent = typeof eventsTable.$inferSelect;
