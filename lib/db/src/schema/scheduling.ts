import { pgTable, serial, integer, text, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const scheduledTasksTable = pgTable("scheduled_tasks", {
  id: serial("id").primaryKey(),
  kind: text("kind").notNull(),
  resourceType: text("resource_type"),
  resourceId: integer("resource_id"),
  runAt: timestamp("run_at").notNull(),
  payload: jsonb("payload"),
  status: text("status").notNull().default("pending"),
  claimedAt: timestamp("claimed_at"),
  completedAt: timestamp("completed_at"),
  error: text("error"),
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const automationSettingsTable = pgTable("automation_settings", {
  id: serial("id").primaryKey(),
  retainerReminderEnabled: boolean("retainer_reminder_enabled").notNull().default(true),
  retainerReminderDays: integer("retainer_reminder_days").notNull().default(14),
  balanceReminderEnabled: boolean("balance_reminder_enabled").notNull().default(true),
  balanceReminderDays: integer("balance_reminder_days").notNull().default(30),
  dayBeforeReminderEnabled: boolean("day_before_reminder_enabled").notNull().default(true),
  thankYouEnabled: boolean("thank_you_enabled").notNull().default(true),
  thankYouDays: integer("thank_you_days").notNull().default(7),
  inquiryAutoReplyEnabled: boolean("inquiry_auto_reply_enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertScheduledTaskSchema = createInsertSchema(scheduledTasksTable).omit({ id: true, createdAt: true });
export type InsertScheduledTask = z.infer<typeof insertScheduledTaskSchema>;
export type ScheduledTask = typeof scheduledTasksTable.$inferSelect;

export const insertAutomationSettingsSchema = createInsertSchema(automationSettingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAutomationSettings = z.infer<typeof insertAutomationSettingsSchema>;
export type AutomationSettings = typeof automationSettingsTable.$inferSelect;
