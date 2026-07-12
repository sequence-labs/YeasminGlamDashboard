import { pgTable, serial, integer, text, boolean, numeric, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { bookingsTable } from "./bookings";
import { serviceItemsTable } from "./services";

// An add-on request created by the artist (or self-initiated by the client from the
// pre-event menu). The approval `status` lives here, and is ONLY ever moved to
// `approved`/`declined` by the public, token + OTP-gated endpoints — never by any
// authenticated artist endpoint. Client contact and the DocuSign envelope id are
// snapshotted at creation so they can't be retargeted after the fact.
export const addonRequestsTable = pgTable("addon_requests", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookingsTable.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  status: text("status").notNull().default("pending"), // pending | approved | declined | expired | cancelled
  source: text("source").notNull().default("on_day"), // on_day | pre_event
  artistNote: text("artist_note"),
  clientNameSnapshot: text("client_name_snapshot").notNull(),
  clientEmailSnapshot: text("client_email_snapshot"),
  clientPhoneSnapshot: text("client_phone_snapshot"),
  docusignEnvelopeIdSnapshot: text("docusign_envelope_id_snapshot"),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  decidedAt: timestamp("decided_at"),
  expiresAt: timestamp("expires_at"),
}, (table) => ({
  uniqueToken: unique("addon_requests_token_unique").on(table.token),
}));

// Price-locked snapshot of each selected service at request time, so later catalog
// edits never change what the client was shown / approved.
export const addonRequestItemsTable = pgTable("addon_request_items", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull().references(() => addonRequestsTable.id, { onDelete: "cascade" }),
  serviceItemId: integer("service_item_id").references(() => serviceItemsTable.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  unitLabel: text("unit_label").notNull().default("person"),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull().default("0"),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  lineTotal: numeric("line_total", { precision: 10, scale: 2 }).notNull().default("0"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// One-time verification code, stored HASHED. The plaintext code is never stored,
// never returned by any authenticated endpoint, and never logged in production.
export const addonVerificationsTable = pgTable("addon_verifications", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull().references(() => addonRequestsTable.id, { onDelete: "cascade" }),
  codeHash: text("code_hash").notNull(),
  destinationType: text("destination_type").notNull().default("email"), // email | sms
  destinationMasked: text("destination_masked").notNull(),
  destination: text("destination").notNull(), // exact target sent to (server-only, never returned)
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(5),
  consumedAt: timestamp("consumed_at"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Immutable, append-only audit trail. Deliberately denormalized (requestId/bookingId
// are plain integers with NO foreign key) so the trail survives deletion of the parent
// booking/request. The application never updates or deletes these rows; true DB-level
// immutability (REVOKE UPDATE/DELETE or a trigger) is a one-time manual SQL step.
export const addonAuditEventsTable = pgTable("addon_audit_events", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull(),
  bookingId: integer("booking_id").notNull(),
  action: text("action").notNull(),
  actorType: text("actor_type").notNull(), // artist | client | system
  verified: boolean("verified").notNull().default(false),
  amountSnapshot: numeric("amount_snapshot", { precision: 10, scale: 2 }),
  docusignEnvelopeIdSnapshot: text("docusign_envelope_id_snapshot"),
  destinationMasked: text("destination_masked"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  detail: text("detail"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAddonRequestSchema = createInsertSchema(addonRequestsTable).omit({ id: true, createdAt: true });
export type InsertAddonRequest = z.infer<typeof insertAddonRequestSchema>;
export type AddonRequest = typeof addonRequestsTable.$inferSelect;

export const insertAddonRequestItemSchema = createInsertSchema(addonRequestItemsTable).omit({ id: true, createdAt: true });
export type InsertAddonRequestItem = z.infer<typeof insertAddonRequestItemSchema>;
export type AddonRequestItem = typeof addonRequestItemsTable.$inferSelect;

export const insertAddonVerificationSchema = createInsertSchema(addonVerificationsTable).omit({ id: true, createdAt: true });
export type InsertAddonVerification = z.infer<typeof insertAddonVerificationSchema>;
export type AddonVerification = typeof addonVerificationsTable.$inferSelect;

export const insertAddonAuditEventSchema = createInsertSchema(addonAuditEventsTable).omit({ id: true, createdAt: true });
export type InsertAddonAuditEvent = z.infer<typeof insertAddonAuditEventSchema>;
export type AddonAuditEvent = typeof addonAuditEventsTable.$inferSelect;
