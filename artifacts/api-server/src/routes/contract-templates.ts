import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { contractTemplatesTable, db } from "@workspace/db";
import {
  CreateContractTemplateBody,
  DeleteContractTemplateParams,
  ListContractTemplatesResponse,
  UpdateContractTemplateBody,
  UpdateContractTemplateParams,
  UpdateContractTemplateResponse,
} from "@workspace/api-zod";
import {
  ensureBuiltInContractTemplates,
  serializeContractTemplate,
} from "../lib/contract-templates";

const router: IRouter = Router();

function nullableText(value?: string | null) {
  if (value === undefined) return undefined;
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

router.get("/contract-templates", async (req, res): Promise<void> => {
  await ensureBuiltInContractTemplates();
  const templates = await db
    .select()
    .from(contractTemplatesTable)
    .orderBy(desc(contractTemplatesTable.isDefault), desc(contractTemplatesTable.locked), desc(contractTemplatesTable.updatedAt), contractTemplatesTable.id);

  res.json(ListContractTemplatesResponse.parse(templates.map(serializeContractTemplate)));
});

router.post("/contract-templates", async (req, res): Promise<void> => {
  const parsed = CreateContractTemplateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (parsed.data.isDefault) {
    res.status(400).json({ error: "The built-in agreement remains the default template" });
    return;
  }

  const [template] = await db.insert(contractTemplatesTable).values({
    name: parsed.data.name.trim(),
    description: nullableText(parsed.data.description),
    body: parsed.data.body.trim(),
    active: parsed.data.active ?? true,
    isDefault: false,
    locked: false,
  }).returning();

  res.status(201).json(serializeContractTemplate(template));
});

router.patch("/contract-templates/:id", async (req, res): Promise<void> => {
  const params = UpdateContractTemplateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateContractTemplateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(contractTemplatesTable).where(eq(contractTemplatesTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Contract template not found" });
    return;
  }
  if (existing.locked) {
    res.status(403).json({ error: "Built-in default template cannot be edited" });
    return;
  }

  if (parsed.data.isDefault) {
    res.status(400).json({ error: "The built-in agreement remains the default template" });
    return;
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name.trim();
  if (parsed.data.description !== undefined) updateData.description = nullableText(parsed.data.description);
  if (parsed.data.body !== undefined) updateData.body = parsed.data.body.trim();
  if (parsed.data.active !== undefined) updateData.active = parsed.data.active;
  if (parsed.data.isDefault === false) updateData.isDefault = false;

  const [template] = await db.update(contractTemplatesTable)
    .set(updateData)
    .where(eq(contractTemplatesTable.id, params.data.id))
    .returning();

  if (!template) {
    res.status(404).json({ error: "Contract template not found" });
    return;
  }

  res.json(UpdateContractTemplateResponse.parse(serializeContractTemplate(template)));
});

router.delete("/contract-templates/:id", async (req, res): Promise<void> => {
  const params = DeleteContractTemplateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db.select().from(contractTemplatesTable).where(eq(contractTemplatesTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Contract template not found" });
    return;
  }
  if (existing.locked) {
    res.status(403).json({ error: "Built-in default template cannot be archived" });
    return;
  }

  const [template] = await db.update(contractTemplatesTable)
    .set({ active: false, isDefault: false, updatedAt: new Date() })
    .where(eq(contractTemplatesTable.id, params.data.id))
    .returning();

  if (!template) {
    res.status(404).json({ error: "Contract template not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
