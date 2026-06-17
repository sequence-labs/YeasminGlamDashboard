import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, serviceItemsTable } from "@workspace/db";
import {
  CreateServiceItemBody,
  DeleteServiceItemParams,
  ListServiceItemsResponse,
  ListServiceItemsResponseItem,
  UpdateServiceItemBody,
  UpdateServiceItemParams,
  UpdateServiceItemResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const defaultServiceItems: Array<typeof serviceItemsTable.$inferInsert> = [
  {
    name: "Makeup Only",
    description: "Non-bridal event makeup / soft glam.",
    kind: "service",
    defaultUnitPrice: "150.00",
    unitLabel: "person",
    sortOrder: 10,
  },
  {
    name: "Hair Only",
    description: "Hair service for one person.",
    kind: "service",
    defaultUnitPrice: "135.00",
    unitLabel: "person",
    sortOrder: 20,
  },
  {
    name: "Hair & Makeup",
    description: "Combined hair and makeup service for one person.",
    kind: "service",
    defaultUnitPrice: "285.00",
    unitLabel: "person",
    sortOrder: 30,
  },
  {
    name: "Early Morning Fee",
    description: "Flat fee for early service start times.",
    kind: "fee",
    defaultUnitPrice: "200.00",
    unitLabel: "booking",
    sortOrder: 40,
  },
  {
    name: "Travel Fee",
    description: "Flat travel fee for the listed service location.",
    kind: "fee",
    defaultUnitPrice: "150.00",
    unitLabel: "booking",
    sortOrder: 50,
  },
  {
    name: "Client-Caused Overtime",
    description: "Billed in 30-minute increments when client delays extend the schedule.",
    kind: "fee",
    defaultUnitPrice: "100.00",
    unitLabel: "hour",
    sortOrder: 60,
  },
];

function serializeServiceItem(item: typeof serviceItemsTable.$inferSelect) {
  return {
    ...item,
    kind: item.kind as "service" | "fee",
    defaultUnitPrice: parseFloat(item.defaultUnitPrice as unknown as string),
    createdAt: item.createdAt.toISOString(),
  };
}

export async function ensureDefaultServiceItems() {
  await db
    .update(serviceItemsTable)
    .set({ active: false })
    .where(eq(serviceItemsTable.name, "Make up Trial"));

  const existing = await db.select({
    id: serviceItemsTable.id,
    active: serviceItemsTable.active,
    name: serviceItemsTable.name,
  }).from(serviceItemsTable);
  const existingByName = new Map(existing.map((item) => [item.name.trim().toLowerCase(), item]));

  const itemsToInsert: Array<typeof serviceItemsTable.$inferInsert> = [];

  for (const defaultItem of defaultServiceItems) {
    const key = defaultItem.name.trim().toLowerCase();
    const existingItem = existingByName.get(key);

    if (!existingItem) {
      itemsToInsert.push(defaultItem);
      continue;
    }

  }

  if (itemsToInsert.length === 0) return;

  await db.insert(serviceItemsTable).values(itemsToInsert);
}

router.get("/services", async (req, res): Promise<void> => {
  await ensureDefaultServiceItems();

  const items = await db
    .select()
    .from(serviceItemsTable)
    .orderBy(serviceItemsTable.sortOrder, serviceItemsTable.id);

  res.json(ListServiceItemsResponse.parse(items.map(serializeServiceItem)));
});

router.post("/services", async (req, res): Promise<void> => {
  const parsed = CreateServiceItemBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid service item body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [item] = await db.insert(serviceItemsTable).values({
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    kind: parsed.data.kind,
    defaultUnitPrice: parsed.data.defaultUnitPrice.toFixed(2),
    unitLabel: parsed.data.unitLabel,
    active: parsed.data.active ?? true,
    sortOrder: parsed.data.sortOrder ?? 0,
  }).returning();

  res.status(201).json(ListServiceItemsResponseItem.parse(serializeServiceItem(item)));
});

router.patch("/services/:id", async (req, res): Promise<void> => {
  const params = UpdateServiceItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateServiceItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.kind !== undefined) updateData.kind = parsed.data.kind;
  if (parsed.data.defaultUnitPrice !== undefined) updateData.defaultUnitPrice = parsed.data.defaultUnitPrice.toFixed(2);
  if (parsed.data.unitLabel !== undefined) updateData.unitLabel = parsed.data.unitLabel;
  if (parsed.data.active !== undefined) updateData.active = parsed.data.active;
  if (parsed.data.sortOrder !== undefined) updateData.sortOrder = parsed.data.sortOrder;

  const [item] = await db
    .update(serviceItemsTable)
    .set(updateData)
    .where(eq(serviceItemsTable.id, params.data.id))
    .returning();

  if (!item) {
    res.status(404).json({ error: "Service item not found" });
    return;
  }

  res.json(UpdateServiceItemResponse.parse(serializeServiceItem(item)));
});

router.delete("/services/:id", async (req, res): Promise<void> => {
  const params = DeleteServiceItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [item] = await db
    .update(serviceItemsTable)
    .set({ active: false })
    .where(eq(serviceItemsTable.id, params.data.id))
    .returning();

  if (!item) {
    res.status(404).json({ error: "Service item not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
