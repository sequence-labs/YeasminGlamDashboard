import { Router, type IRouter } from "express";
import { desc, eq, isNull } from "drizzle-orm";
import { db, notificationsTable } from "@workspace/db";
import {
  ListNotificationsResponse,
  MarkNotificationReadParams,
  MarkNotificationReadResponse,
} from "@workspace/api-zod";
import { serializeNotification } from "../lib/notifications";

const router: IRouter = Router();

router.get("/notifications", async (_req, res): Promise<void> => {
  const rows = await db.select().from(notificationsTable).orderBy(desc(notificationsTable.createdAt)).limit(100);
  res.json(ListNotificationsResponse.parse(rows.map(serializeNotification)));
});

router.post("/notifications/:id/read", async (req, res): Promise<void> => {
  const params = MarkNotificationReadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .update(notificationsTable)
    .set({ readAt: new Date() })
    .where(eq(notificationsTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(MarkNotificationReadResponse.parse(serializeNotification(row)));
});

router.post("/notifications/read-all", async (_req, res): Promise<void> => {
  await db.update(notificationsTable).set({ readAt: new Date() }).where(isNull(notificationsTable.readAt));
  res.sendStatus(204);
});

export default router;
