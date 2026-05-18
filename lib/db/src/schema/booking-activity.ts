import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { bookingsTable } from "./bookings";

export const bookingActivityTable = pgTable("booking_activity", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookingsTable.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBookingActivitySchema = createInsertSchema(bookingActivityTable).omit({ id: true, createdAt: true });
export type InsertBookingActivity = z.infer<typeof insertBookingActivitySchema>;
export type BookingActivity = typeof bookingActivityTable.$inferSelect;
