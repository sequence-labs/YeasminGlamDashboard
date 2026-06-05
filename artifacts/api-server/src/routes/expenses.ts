import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, expensesTable } from "@workspace/db";
import {
  CreateExpenseBody,
  DeleteExpenseParams,
  ListExpensesResponse,
  ListExpensesResponseItem,
  UpdateExpenseBody,
  UpdateExpenseParams,
  UpdateExpenseResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function cleanOptional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function serializeExpense(expense: typeof expensesTable.$inferSelect) {
  return {
    ...expense,
    category: expense.category,
    amount: parseFloat(expense.amount as unknown as string),
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
  };
}

router.get("/expenses", async (req, res): Promise<void> => {
  const includeArchived = String(req.query.includeArchived ?? "false") === "true";
  const rows = await db.select().from(expensesTable).orderBy(desc(expensesTable.expenseDate), desc(expensesTable.id));
  const visibleRows = includeArchived ? rows : rows.filter((expense) => expense.active);

  res.json(ListExpensesResponse.parse(visibleRows.map(serializeExpense)));
});

router.post("/expenses", async (req, res): Promise<void> => {
  const parsed = CreateExpenseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [expense] = await db
    .insert(expensesTable)
    .values({
      itemName: parsed.data.itemName.trim(),
      category: parsed.data.category,
      amount: parsed.data.amount.toFixed(2),
      expenseDate: parsed.data.expenseDate,
      vendor: cleanOptional(parsed.data.vendor),
      paymentMethod: cleanOptional(parsed.data.paymentMethod),
      notes: cleanOptional(parsed.data.notes),
      receiptDataUrl: cleanOptional(parsed.data.receiptDataUrl),
      receiptFileName: cleanOptional(parsed.data.receiptFileName),
      businessUse: parsed.data.businessUse ?? true,
      reimbursable: parsed.data.reimbursable ?? false,
      active: parsed.data.active ?? true,
      updatedAt: new Date(),
    })
    .returning();

  res.status(201).json(ListExpensesResponseItem.parse(serializeExpense(expense)));
});

router.patch("/expenses/:id", async (req, res): Promise<void> => {
  const params = UpdateExpenseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateExpenseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Partial<typeof expensesTable.$inferInsert> = { updatedAt: new Date() };
  if (parsed.data.itemName !== undefined) updateData.itemName = parsed.data.itemName.trim();
  if (parsed.data.category !== undefined) updateData.category = parsed.data.category;
  if (parsed.data.amount !== undefined) updateData.amount = parsed.data.amount.toFixed(2);
  if (parsed.data.expenseDate !== undefined) updateData.expenseDate = parsed.data.expenseDate;
  if (parsed.data.vendor !== undefined) updateData.vendor = cleanOptional(parsed.data.vendor);
  if (parsed.data.paymentMethod !== undefined) updateData.paymentMethod = cleanOptional(parsed.data.paymentMethod);
  if (parsed.data.notes !== undefined) updateData.notes = cleanOptional(parsed.data.notes);
  if (parsed.data.receiptDataUrl !== undefined) updateData.receiptDataUrl = cleanOptional(parsed.data.receiptDataUrl);
  if (parsed.data.receiptFileName !== undefined) updateData.receiptFileName = cleanOptional(parsed.data.receiptFileName);
  if (parsed.data.businessUse !== undefined) updateData.businessUse = parsed.data.businessUse;
  if (parsed.data.reimbursable !== undefined) updateData.reimbursable = parsed.data.reimbursable;
  if (parsed.data.active !== undefined) updateData.active = parsed.data.active;

  const [expense] = await db
    .update(expensesTable)
    .set(updateData)
    .where(eq(expensesTable.id, params.data.id))
    .returning();

  if (!expense) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  res.json(UpdateExpenseResponse.parse(serializeExpense(expense)));
});

router.delete("/expenses/:id", async (req, res): Promise<void> => {
  const params = DeleteExpenseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [expense] = await db
    .update(expensesTable)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(expensesTable.id, params.data.id))
    .returning();

  if (!expense) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
