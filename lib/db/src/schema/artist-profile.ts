import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const artistProfilesTable = pgTable("artist_profiles", {
  id: serial("id").primaryKey(),
  businessName: text("business_name").notNull().default("Glam CRM"),
  displayName: text("display_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  website: text("website"),
  instagram: text("instagram"),
  paymentMethod: text("payment_method"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertArtistProfileSchema = createInsertSchema(artistProfilesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertArtistProfile = z.infer<typeof insertArtistProfileSchema>;
export type ArtistProfile = typeof artistProfilesTable.$inferSelect;
