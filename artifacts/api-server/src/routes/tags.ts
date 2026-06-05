import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, tagsTable, clientTagsTable, bookingTagsTable, savedSegmentsTable } from "@workspace/db";
import {
  ListTagsResponse,
  CreateTagBody,
  DeleteTagParams,
  ListClientTagsParams,
  ListClientTagsResponse,
  AssignClientTagParams,
  AssignClientTagBody,
  RemoveClientTagParams,
  ListBookingTagsParams,
  ListBookingTagsResponse,
  AssignBookingTagParams,
  AssignBookingTagBody,
  RemoveBookingTagParams,
  ListSavedSegmentsResponse,
  CreateSavedSegmentBody,
  DeleteSavedSegmentParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function serializeTag(t: typeof tagsTable.$inferSelect) {
  return { ...t, createdAt: t.createdAt.toISOString() };
}

function serializeSegment(s: typeof savedSegmentsTable.$inferSelect) {
  return { ...s, createdAt: s.createdAt.toISOString() };
}

router.get("/tags", async (_req, res): Promise<void> => {
  const rows = await db.select().from(tagsTable).orderBy(tagsTable.name);
  res.json(ListTagsResponse.parse(rows.map(serializeTag)));
});

router.post("/tags", async (req, res): Promise<void> => {
  const parsed = CreateTagBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const name = parsed.data.name.trim();
  const existing = await db.select().from(tagsTable).where(eq(tagsTable.name, name)).limit(1);
  if (existing[0]) {
    res.status(201).json(serializeTag(existing[0]));
    return;
  }
  const [row] = await db
    .insert(tagsTable)
    .values({ name, color: parsed.data.color ?? "oxblood" })
    .returning();
  res.status(201).json(serializeTag(row));
});

router.delete("/tags/:id", async (req, res): Promise<void> => {
  const params = DeleteTagParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(tagsTable).where(eq(tagsTable.id, params.data.id));
  res.sendStatus(204);
});

router.get("/clients/:id/tags", async (req, res): Promise<void> => {
  const params = ListClientTagsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const rows = await db
    .select({ tag: tagsTable })
    .from(clientTagsTable)
    .innerJoin(tagsTable, eq(clientTagsTable.tagId, tagsTable.id))
    .where(eq(clientTagsTable.clientId, params.data.id));
  res.json(ListClientTagsResponse.parse(rows.map((r) => serializeTag(r.tag))));
});

router.post("/clients/:id/tags", async (req, res): Promise<void> => {
  const params = AssignClientTagParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = AssignClientTagBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  await db
    .insert(clientTagsTable)
    .values({ clientId: params.data.id, tagId: body.data.tagId })
    .onConflictDoNothing();
  res.sendStatus(204);
});

router.delete("/clients/:id/tags/:tagId", async (req, res): Promise<void> => {
  const params = RemoveClientTagParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db
    .delete(clientTagsTable)
    .where(and(eq(clientTagsTable.clientId, params.data.id), eq(clientTagsTable.tagId, params.data.tagId)));
  res.sendStatus(204);
});

router.get("/bookings/:id/tags", async (req, res): Promise<void> => {
  const params = ListBookingTagsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const rows = await db
    .select({ tag: tagsTable })
    .from(bookingTagsTable)
    .innerJoin(tagsTable, eq(bookingTagsTable.tagId, tagsTable.id))
    .where(eq(bookingTagsTable.bookingId, params.data.id));
  res.json(ListBookingTagsResponse.parse(rows.map((r) => serializeTag(r.tag))));
});

router.post("/bookings/:id/tags", async (req, res): Promise<void> => {
  const params = AssignBookingTagParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = AssignBookingTagBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  await db
    .insert(bookingTagsTable)
    .values({ bookingId: params.data.id, tagId: body.data.tagId })
    .onConflictDoNothing();
  res.sendStatus(204);
});

router.delete("/bookings/:id/tags/:tagId", async (req, res): Promise<void> => {
  const params = RemoveBookingTagParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db
    .delete(bookingTagsTable)
    .where(and(eq(bookingTagsTable.bookingId, params.data.id), eq(bookingTagsTable.tagId, params.data.tagId)));
  res.sendStatus(204);
});

router.get("/saved-segments", async (_req, res): Promise<void> => {
  const rows = await db.select().from(savedSegmentsTable).orderBy(savedSegmentsTable.name);
  res.json(ListSavedSegmentsResponse.parse(rows.map(serializeSegment)));
});

router.post("/saved-segments", async (req, res): Promise<void> => {
  const parsed = CreateSavedSegmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .insert(savedSegmentsTable)
    .values({
      name: parsed.data.name.trim(),
      scope: parsed.data.scope,
      filterJson: parsed.data.filterJson,
      pinned: parsed.data.pinned ?? 0,
    })
    .returning();
  res.status(201).json(serializeSegment(row));
});

router.delete("/saved-segments/:id", async (req, res): Promise<void> => {
  const params = DeleteSavedSegmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(savedSegmentsTable).where(eq(savedSegmentsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
