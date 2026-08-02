import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { GoogleGenAI } from "@google/genai";
import { db, expenseReceiptsTable, expensesTable } from "@workspace/db";
import {
  AnalyzeExpenseReceiptBody,
  AnalyzeExpenseReceiptResponse,
  CreateExpenseBody,
  DeleteExpenseParams,
  ImportExpenseReceiptBody,
  ListExpensesResponse,
  ListExpensesResponseItem,
  UpdateExpenseBody,
  UpdateExpenseParams,
  UpdateExpenseResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const receiptAnalysisModel = "gemini-3.1-flash-lite";
const receiptAnalysisSchema = {
  type: "OBJECT",
  properties: {
    vendor: { type: "STRING" },
    expenseDate: { type: "STRING", description: "Purchase date as YYYY-MM-DD, or an empty string when not visible." },
    purchaseTime: { type: "STRING", description: "Local purchase time as HH:MM, or an empty string when not visible." },
    paymentMethod: { type: "STRING", description: "Normalized payment method such as Credit/debit card, Cash, Venmo, or an empty string when not visible." },
    subtotal: { type: "NUMBER" },
    tax: { type: "NUMBER" },
    total: { type: "NUMBER" },
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          itemName: { type: "STRING" },
          receiptLabel: { type: "STRING" },
          category: {
            type: "STRING",
            enum: ["makeup_products", "hair_products", "tools_equipment", "disposables", "travel", "education", "marketing", "software", "studio_supplies", "other"],
          },
          amount: { type: "NUMBER" },
          quantity: { type: "NUMBER" },
          productCode: { type: "STRING" },
        },
        required: ["itemName", "receiptLabel", "category", "amount", "quantity", "productCode"],
      },
    },
  },
  required: ["vendor", "expenseDate", "purchaseTime", "paymentMethod", "subtotal", "tax", "total", "items"],
};

function cleanOptional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function serializeExpense(
  expense: typeof expensesTable.$inferSelect,
  receipt?: typeof expenseReceiptsTable.$inferSelect | null,
) {
  return {
    ...expense,
    category: expense.category,
    amount: parseFloat(expense.amount as unknown as string),
    quantity: expense.quantity === null ? null : parseFloat(expense.quantity as unknown as string),
    receiptDataUrl: expense.receiptDataUrl ?? (receipt ? `/api/expense-receipts/${receipt.id}/file` : null),
    receiptFileName: expense.receiptFileName ?? receipt?.receiptFileName ?? null,
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
  };
}

router.get("/expenses", async (req, res): Promise<void> => {
  const includeArchived = String(req.query.includeArchived ?? "false") === "true";
  const rows = await db
    .select({ expense: expensesTable, receipt: expenseReceiptsTable })
    .from(expensesTable)
    .leftJoin(expenseReceiptsTable, eq(expensesTable.receiptId, expenseReceiptsTable.id))
    .orderBy(desc(expensesTable.expenseDate), desc(expensesTable.id));
  const visibleRows = includeArchived ? rows : rows.filter(({ expense }) => expense.active);

  res.json(ListExpensesResponse.parse(visibleRows.map(({ expense, receipt }) => serializeExpense(expense, receipt))));
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
      receiptId: parsed.data.receiptId ?? null,
      productCode: cleanOptional(parsed.data.productCode),
      quantity: parsed.data.quantity === undefined ? null : parsed.data.quantity.toFixed(2),
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
  if (parsed.data.receiptId !== undefined) updateData.receiptId = parsed.data.receiptId;
  if (parsed.data.productCode !== undefined) updateData.productCode = cleanOptional(parsed.data.productCode);
  if (parsed.data.quantity !== undefined) updateData.quantity = parsed.data.quantity === null ? null : parsed.data.quantity.toFixed(2);
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

router.post("/expense-receipts/import", async (req, res): Promise<void> => {
  const parsed = ImportExpenseReceiptBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const result = await db.transaction(async (tx) => {
    const [receipt] = await tx
      .insert(expenseReceiptsTable)
      .values({
        vendor: cleanOptional(parsed.data.vendor),
        expenseDate: parsed.data.expenseDate,
        paymentMethod: cleanOptional(parsed.data.paymentMethod),
        subtotal: parsed.data.subtotal === undefined ? null : parsed.data.subtotal.toFixed(2),
        tax: parsed.data.tax === undefined ? null : parsed.data.tax.toFixed(2),
        total: parsed.data.total.toFixed(2),
        receiptDataUrl: parsed.data.receiptDataUrl,
        receiptFileName: parsed.data.receiptFileName.trim(),
        rawText: cleanOptional(parsed.data.rawText),
        ocrConfidence: parsed.data.ocrConfidence === undefined ? null : parsed.data.ocrConfidence.toFixed(2),
        updatedAt: new Date(),
      })
      .returning();

    const expenses = await tx
      .insert(expensesTable)
      .values(parsed.data.items.map((item) => ({
        itemName: item.itemName.trim(),
        category: item.category,
        amount: item.amount.toFixed(2),
        expenseDate: parsed.data.expenseDate,
        vendor: cleanOptional(parsed.data.vendor),
        paymentMethod: cleanOptional(parsed.data.paymentMethod),
        notes: cleanOptional(item.notes),
        receiptId: receipt.id,
        productCode: cleanOptional(item.productCode),
        quantity: item.quantity === undefined ? null : item.quantity.toFixed(2),
        businessUse: parsed.data.businessUse ?? true,
        reimbursable: parsed.data.reimbursable ?? false,
        active: true,
        updatedAt: new Date(),
      })))
      .returning();

    return {
      receiptId: receipt.id,
      expenses: ListExpensesResponse.parse(expenses.map((expense) => serializeExpense(expense, receipt))),
    };
  });

  res.status(201).json(result);
});

router.post("/expense-receipts/analyze", async (req, res): Promise<void> => {
  const parsed = AnalyzeExpenseReceiptBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let totalBytes = 0;
  const images = parsed.data.redactedImages.map((dataUrl) => {
    const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/i);
    if (!match) return null;
    const data = match[2].replace(/\s/g, "");
    const bytes = Buffer.byteLength(data, "base64");
    totalBytes += bytes;
    return { data, mimeType: match[1].toLowerCase() };
  });
  if (images.some((image) => !image) || totalBytes > 8 * 1024 * 1024) {
    res.status(400).json({ error: "Use up to 8 MB of redacted JPEG, PNG, or WebP receipt images." });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    res.status(503).json({ error: "Gemini receipt analysis is not configured." });
    return;
  }

  try {
    const client = new GoogleGenAI({ apiKey });
    const response = await client.models.generateContent({
      model: receiptAnalysisModel,
      contents: [
        {
          text: [
            "Read this redacted business receipt and return only the requested JSON.",
            "Extract the merchant, purchase date, subtotal, total tax, final total, and every purchased line item.",
            "Extract the printed local purchase time when visible as HH:MM; use an empty string when it is not visible.",
            "Normalize the tender to one of Credit/debit card, Cash, Venmo, Zelle, PayPal, Bank transfer, Check, Store credit, Other, or an empty string when it is not visible. Never return card numbers or last four digits.",
            "Amounts for items must be pretax line totals after item-specific discounts. Sum multiple tax lines.",
            "For each item, itemName must be a readable, standardized, broadly searchable name in title case with the brand, product family, and important size, shade, finish, or count. Expand obvious store abbreviations when you can do so safely, but do not invent a brand or product detail.",
            "For each item, receiptLabel must preserve the original printed product wording without the price, payment data, or SKU. Keep product codes only in productCode.",
            "Do not treat payment, card, authorization, subtotal, tax, total, change, or loyalty metadata as products.",
            "Use an empty date or product code when it is not visible. Do not invent missing values.",
            "Choose the closest supplied expense category; use other when uncertain.",
          ].join(" "),
        },
        ...images.filter((image): image is NonNullable<typeof image> => Boolean(image)).map((image) => ({
          inlineData: { data: image.data, mimeType: image.mimeType },
        })),
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: receiptAnalysisSchema,
      },
    });
    const output = JSON.parse(response.text || "null");
    const normalizedOutput = output && typeof output === "object" ? {
      ...output,
      items: Array.isArray(output.items)
        ? output.items.filter((item: unknown) => (
          item && typeof item === "object" &&
          typeof (item as { amount?: unknown }).amount === "number" &&
          (item as { amount: number }).amount > 0
        ))
        : [],
    } : output;
    const validated = AnalyzeExpenseReceiptResponse.safeParse({ model: receiptAnalysisModel, ...normalizedOutput });
    if (!validated.success) {
      req.log.warn({
        model: receiptAnalysisModel,
        fields: validated.error.issues.map((issue) => issue.path.join(".")).slice(0, 20),
      }, "Gemini receipt response failed schema validation");
      res.status(502).json({ error: "Gemini returned receipt data in an unexpected format." });
      return;
    }
    res.json(validated.data);
  } catch (error) {
    const providerError = error as { status?: number; message?: string };
    const providerMessage = String(providerError?.message ?? "unknown provider error")
      .replace(apiKey, "[redacted]")
      .replace(/data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+/gi, "[image-redacted]")
      .slice(0, 240);
    req.log.warn({ model: receiptAnalysisModel, status: providerError?.status ?? null, message: providerMessage }, "Gemini receipt analysis failed");
    res.status(502).json({ error: "Gemini could not analyze this receipt. The image was not saved." });
  }
});

router.get("/expense-receipts/:id/file", async (req, res): Promise<void> => {
  const receiptId = Number(req.params.id);
  if (!Number.isInteger(receiptId) || receiptId <= 0) {
    res.status(400).json({ error: "Invalid receipt id" });
    return;
  }

  const [receipt] = await db.select().from(expenseReceiptsTable).where(eq(expenseReceiptsTable.id, receiptId)).limit(1);
  if (!receipt) {
    res.status(404).json({ error: "Receipt not found" });
    return;
  }

  const match = receipt.receiptDataUrl.match(/^data:([^;,]+)(;base64)?,([\s\S]*)$/);
  if (!match) {
    res.status(422).json({ error: "Stored receipt is not a valid attachment" });
    return;
  }

  const mimeType = match[1] || "application/octet-stream";
  const fileName = receipt.receiptFileName.replace(/["\r\n]/g, "_");
  const body = match[2] ? Buffer.from(match[3], "base64") : Buffer.from(decodeURIComponent(match[3]), "utf8");
  res.setHeader("Content-Type", mimeType);
  res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
  res.setHeader("Cache-Control", "private, max-age=300");
  res.send(body);
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
