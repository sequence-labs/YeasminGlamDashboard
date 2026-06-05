import { pgTable, serial, integer, text, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { bookingsTable } from "./bookings";

export const bookingShareLinksTable = pgTable("booking_share_links", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookingsTable.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  viewCount: integer("view_count").notNull().default(0),
  lastViewedAt: timestamp("last_viewed_at"),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueToken: unique("booking_share_links_token_unique").on(table.token),
}));

export const contractSignaturesTable = pgTable("contract_signatures", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookingsTable.id, { onDelete: "cascade" }),
  signerName: text("signer_name").notNull(),
  signerInitials: text("signer_initials").notNull(),
  signerEmail: text("signer_email"),
  contractSnapshot: text("contract_snapshot").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  signedAt: timestamp("signed_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const calendarFeedTokensTable = pgTable("calendar_feed_tokens", {
  id: serial("id").primaryKey(),
  token: text("token").notNull(),
  label: text("label").notNull().default("Studio calendar"),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueToken: unique("calendar_feed_tokens_token_unique").on(table.token),
}));

export const insertBookingShareLinkSchema = createInsertSchema(bookingShareLinksTable).omit({ id: true, createdAt: true });
export type InsertBookingShareLink = z.infer<typeof insertBookingShareLinkSchema>;
export type BookingShareLink = typeof bookingShareLinksTable.$inferSelect;

export const insertContractSignatureSchema = createInsertSchema(contractSignaturesTable).omit({ id: true, createdAt: true });
export type InsertContractSignature = z.infer<typeof insertContractSignatureSchema>;
export type ContractSignature = typeof contractSignaturesTable.$inferSelect;

export const insertCalendarFeedTokenSchema = createInsertSchema(calendarFeedTokensTable).omit({ id: true, createdAt: true });
export type InsertCalendarFeedToken = z.infer<typeof insertCalendarFeedTokenSchema>;
export type CalendarFeedToken = typeof calendarFeedTokensTable.$inferSelect;
