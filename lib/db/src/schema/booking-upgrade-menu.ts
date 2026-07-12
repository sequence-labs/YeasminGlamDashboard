import { boolean, integer, numeric, pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { bookingsTable } from "./bookings";
import { serviceItemsTable } from "./services";

// A per-booking override of one catalog item on the Upgrade Menu. A row only exists once
// the artist actually touches an item for this booking — with no row, the item renders
// exactly as it does today (live from the global catalog), so existing bookings are
// unaffected by this table's introduction.
export const bookingUpgradeMenuItemsTable = pgTable("booking_upgrade_menu_items", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookingsTable.id, { onDelete: "cascade" }),
  serviceItemId: integer("service_item_id").notNull().references(() => serviceItemsTable.id, { onDelete: "cascade" }),
  included: boolean("included").notNull().default(true),
  // When true, the effective name/description/price/unit for this booking always mirror
  // the live global catalog item (the override_* columns are ignored/cleared). When false,
  // the override_* columns are the frozen, booking-specific values.
  followGlobal: boolean("follow_global").notNull().default(true),
  overrideName: text("override_name"),
  overrideDescription: text("override_description"),
  overrideUnitPrice: numeric("override_unit_price", { precision: 10, scale: 2 }),
  overrideUnitLabel: text("override_unit_label"),
  sortOrder: integer("sort_order"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  bookingServiceUnique: unique("booking_upgrade_menu_items_booking_service_unique").on(table.bookingId, table.serviceItemId),
}));

// A saved, point-in-time copy of the fully-resolved menu for a booking (not raw override
// rows), so restoring doesn't depend on the state of the global catalog at restore time.
export const bookingUpgradeMenuSnapshotsTable = pgTable("booking_upgrade_menu_snapshots", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookingsTable.id, { onDelete: "cascade" }),
  label: text("label"),
  itemsJson: text("items_json").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBookingUpgradeMenuItemSchema = createInsertSchema(bookingUpgradeMenuItemsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBookingUpgradeMenuItem = z.infer<typeof insertBookingUpgradeMenuItemSchema>;
export type BookingUpgradeMenuItem = typeof bookingUpgradeMenuItemsTable.$inferSelect;

export const insertBookingUpgradeMenuSnapshotSchema = createInsertSchema(bookingUpgradeMenuSnapshotsTable).omit({ id: true, createdAt: true });
export type InsertBookingUpgradeMenuSnapshot = z.infer<typeof insertBookingUpgradeMenuSnapshotSchema>;
export type BookingUpgradeMenuSnapshot = typeof bookingUpgradeMenuSnapshotsTable.$inferSelect;
