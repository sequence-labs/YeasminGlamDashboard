import { check, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export type ServiceMenuStoredItem = {
  id: string;
  values: Record<string, string>;
};

export type ServiceMenuStoredContent = {
  items: ServiceMenuStoredItem[];
};

export const serviceMenuContentTable = pgTable(
  "service_menu_content",
  {
    key: text("key").primaryKey(),
    schemaVersion: integer("schema_version").notNull().default(1),
    content: jsonb("content").$type<ServiceMenuStoredContent>().notNull(),
    revision: integer("revision").notNull().default(1),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    check(
      "service_menu_content_supported_key",
      sql`${table.key} in ('bridal-services', 'party-services')`,
    ),
    check("service_menu_content_schema_version_positive", sql`${table.schemaVersion} >= 1`),
    check("service_menu_content_revision_positive", sql`${table.revision} >= 1`),
    check("service_menu_content_document_object", sql`jsonb_typeof(${table.content}) = 'object'`),
  ],
);

export type ServiceMenuContentRow = typeof serviceMenuContentTable.$inferSelect;
