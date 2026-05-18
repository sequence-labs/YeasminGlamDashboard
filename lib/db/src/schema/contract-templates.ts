import { boolean, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contractTemplatesTable = pgTable("contract_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  body: text("body").notNull(),
  active: boolean("active").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false),
  locked: boolean("locked").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertContractTemplateSchema = createInsertSchema(contractTemplatesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContractTemplate = z.infer<typeof insertContractTemplateSchema>;
export type ContractTemplate = typeof contractTemplatesTable.$inferSelect;
