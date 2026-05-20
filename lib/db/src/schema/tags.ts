import { pgTable, serial, integer, text, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";
import { bookingsTable } from "./bookings";

export const tagsTable = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull().default("oxblood"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueName: unique("tags_name_unique").on(table.name),
}));

export const clientTagsTable = pgTable("client_tags", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clientsTable.id, { onDelete: "cascade" }),
  tagId: integer("tag_id").notNull().references(() => tagsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueClientTag: unique("client_tags_client_tag_unique").on(table.clientId, table.tagId),
}));

export const bookingTagsTable = pgTable("booking_tags", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookingsTable.id, { onDelete: "cascade" }),
  tagId: integer("tag_id").notNull().references(() => tagsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueBookingTag: unique("booking_tags_booking_tag_unique").on(table.bookingId, table.tagId),
}));

export const savedSegmentsTable = pgTable("saved_segments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  scope: text("scope").notNull(),
  filterJson: text("filter_json").notNull(),
  pinned: integer("pinned").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTagSchema = createInsertSchema(tagsTable).omit({ id: true, createdAt: true });
export type InsertTag = z.infer<typeof insertTagSchema>;
export type Tag = typeof tagsTable.$inferSelect;
export type ClientTag = typeof clientTagsTable.$inferSelect;
export type BookingTag = typeof bookingTagsTable.$inferSelect;

export const insertSavedSegmentSchema = createInsertSchema(savedSegmentsTable).omit({ id: true, createdAt: true });
export type InsertSavedSegment = z.infer<typeof insertSavedSegmentSchema>;
export type SavedSegment = typeof savedSegmentsTable.$inferSelect;
