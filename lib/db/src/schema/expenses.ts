import { boolean, integer, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const expenseReceiptsTable = pgTable("expense_receipts", {
  id: serial("id").primaryKey(),
  vendor: text("vendor"),
  expenseDate: text("expense_date").notNull(),
  paymentMethod: text("payment_method"),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }),
  tax: numeric("tax", { precision: 10, scale: 2 }),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  receiptDataUrl: text("receipt_data_url").notNull(),
  receiptFileName: text("receipt_file_name").notNull(),
  rawText: text("raw_text"),
  ocrConfidence: numeric("ocr_confidence", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const expensesTable = pgTable("expenses", {
  id: serial("id").primaryKey(),
  itemName: text("item_name").notNull(),
  category: text("category").notNull().default("other"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull().default("0"),
  expenseDate: text("expense_date").notNull(),
  vendor: text("vendor"),
  paymentMethod: text("payment_method"),
  notes: text("notes"),
  receiptId: integer("receipt_id").references(() => expenseReceiptsTable.id, { onDelete: "set null" }),
  productCode: text("product_code"),
  quantity: numeric("quantity", { precision: 8, scale: 2 }),
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
export type ExpenseReceipt = typeof expenseReceiptsTable.$inferSelect;
