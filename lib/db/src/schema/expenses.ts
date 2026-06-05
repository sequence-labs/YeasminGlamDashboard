import { boolean, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const expensesTable = pgTable("expenses", {
  id: serial("id").primaryKey(),
  itemName: text("item_name").notNull(),
  category: text("category").notNull().default("other"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull().default("0"),
  expenseDate: text("expense_date").notNull(),
  vendor: text("vendor"),
  paymentMethod: text("payment_method"),
  notes: text("notes"),
  receiptDataUrl: text("receipt_url"),
  receiptFileName: text("receipt_file_name"),
  businessUse: boolean("business_use").notNull().default(true),
  reimbursable: boolean("reimbursable").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertExpenseSchema = createInsertSchema(expensesTable).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expensesTable.$inferSelect;
