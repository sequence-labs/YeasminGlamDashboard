import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, automationSettingsTable, scheduledTasksTable } from "@workspace/db";
import {
  GetAutomationSettingsResponse,
  UpdateAutomationSettingsBody,
  UpdateAutomationSettingsResponse,
  RunAutomationsResponse,
  ListScheduledTasksResponse,
} from "@workspace/api-zod";
import {
  getOrCreateAutomationSettings,
  runScheduledTasksOnce,
  serializeScheduledTask,
  serializeSettings,
} from "../lib/scheduler";

const router: IRouter = Router();

router.get("/automation-settings", async (_req, res): Promise<void> => {
  const settings = await getOrCreateAutomationSettings();
  res.json(GetAutomationSettingsResponse.parse(serializeSettings(settings)));
});

router.patch("/automation-settings", async (req, res): Promise<void> => {
  const parsed = UpdateAutomationSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const settings = await getOrCreateAutomationSettings();
  const [row] = await db
    .update(automationSettingsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(automationSettingsTable.id, settings.id))
    .returning();
  res.json(UpdateAutomationSettingsResponse.parse(serializeSettings(row)));
});

router.post("/automations/run", async (_req, res): Promise<void> => {
  const result = await runScheduledTasksOnce();
  res.json(RunAutomationsResponse.parse(result));
});

router.get("/scheduled-tasks", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(scheduledTasksTable)
    .orderBy(desc(scheduledTasksTable.createdAt))
    .limit(100);
  res.json(ListScheduledTasksResponse.parse(rows.map(serializeScheduledTask)));
});

export default router;
