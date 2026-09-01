import { boolean, integer, jsonb, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const assistantArtistsTable = pgTable("assistant_artists", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull().default("Makeup Artist"),
  email: text("email"),
  phone: text("phone"),
  paymentMethod: text("payment_method"),
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const assistantAgreementsTable = pgTable("assistant_agreements", {
  id: serial("id").primaryKey(),
  assistantArtistId: integer("assistant_artist_id").notNull().references(() => assistantArtistsTable.id, { onDelete: "restrict" }),
  eventName: text("event_name").notNull().default("Wedding / Event"),
  eventDate: text("event_date"),
  location: text("location"),
  arrivalTime: text("arrival_time"),
  minimumClients: integer("minimum_clients").notNull().default(2),
  maximumClients: integer("maximum_clients").notNull().default(3),
  perClientRate: numeric("per_client_rate", { precision: 10, scale: 2 }).notNull().default("90"),
  bookingDeposit: numeric("booking_deposit", { precision: 10, scale: 2 }).notNull().default("100"),
  paymentMethod: text("payment_method"),
  paymentTiming: text("payment_timing"),
  specialNotes: text("special_notes"),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Append-only audit entries preserve what changed on each agreement, even if the
// agreement itself is later removed. No application route updates or deletes these rows.
export const assistantAgreementAuditEventsTable = pgTable("assistant_agreement_audit_events", {
  id: serial("id").primaryKey(),
  agreementId: integer("agreement_id").notNull(),
  assistantArtistId: integer("assistant_artist_id").notNull(),
  action: text("action").notNull(),
  actorType: text("actor_type").notNull().default("artist"),
  summary: text("summary").notNull(),
  changes: jsonb("changes").$type<Record<string, unknown>>().notNull().default({}),
  snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAssistantArtistSchema = createInsertSchema(assistantArtistsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAssistantAgreementSchema = createInsertSchema(assistantAgreementsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAssistantAgreementAuditEventSchema = createInsertSchema(assistantAgreementAuditEventsTable).omit({ id: true, createdAt: true });

export type AssistantArtist = typeof assistantArtistsTable.$inferSelect;
export type AssistantAgreement = typeof assistantAgreementsTable.$inferSelect;
export type InsertAssistantArtist = z.infer<typeof insertAssistantArtistSchema>;
export type InsertAssistantAgreement = z.infer<typeof insertAssistantAgreementSchema>;
export type AssistantAgreementAuditEvent = typeof assistantAgreementAuditEventsTable.$inferSelect;
export type InsertAssistantAgreementAuditEvent = z.infer<typeof insertAssistantAgreementAuditEventSchema>;
