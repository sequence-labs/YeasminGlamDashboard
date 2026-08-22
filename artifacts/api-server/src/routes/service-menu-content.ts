import { Router, type IRouter } from "express";
import { and, eq, sql } from "drizzle-orm";
import { db, serviceMenuContentTable, type ServiceMenuContentRow, type ServiceMenuStoredItem } from "@workspace/db";
import { GetServiceMenuContentResponse, UpdateServiceMenuContentBody, UpdateServiceMenuContentResponse } from "@workspace/api-zod";
import {
  InvalidServiceMenuContentError,
  cloneDefaultServiceMenuContent,
  normalizeServiceMenuContent,
} from "../lib/service-menu-content";

const router: IRouter = Router();
const menuKey = "bridal-services";

function serializeMenu(row?: ServiceMenuContentRow) {
  const content = row?.content ?? cloneDefaultServiceMenuContent();
  return {
    customized: Boolean(row),
    revision: row?.revision ?? 0,
    schemaVersion: row?.schemaVersion ?? 1,
    items: content.items,
    updatedAt: row?.updatedAt.toISOString() ?? null,
  };
}

async function loadMenuRow() {
  const [row] = await db
    .select()
    .from(serviceMenuContentTable)
    .where(eq(serviceMenuContentTable.key, menuKey));
  return row;
}

function postgresErrorCode(error: unknown) {
  if (!error || typeof error !== "object") return undefined;
  const directCode = (error as { code?: string }).code;
  if (directCode) return directCode;
  const cause = (error as { cause?: unknown }).cause;
  return cause && typeof cause === "object" ? (cause as { code?: string }).code : undefined;
}

router.get("/service-menu-content", async (_req, res): Promise<void> => {
  const row = await loadMenuRow();
  res.json(GetServiceMenuContentResponse.parse(serializeMenu(row)));
});

router.patch("/service-menu-content", async (req, res): Promise<void> => {
  const parsed = UpdateServiceMenuContentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let content;
  try {
    content = normalizeServiceMenuContent((req.body as { items: ServiceMenuStoredItem[] }).items);
  } catch (error) {
    if (error instanceof InvalidServiceMenuContentError) {
      res.status(400).json({ error: error.message });
      return;
    }
    throw error;
  }

  const now = new Date();
  let row: ServiceMenuContentRow | undefined;

  if (parsed.data.expectedRevision === 0) {
    try {
      [row] = await db.insert(serviceMenuContentTable).values({
        key: menuKey,
        schemaVersion: 1,
        content,
        revision: 1,
        updatedAt: now,
      }).returning();
    } catch (error) {
      if (postgresErrorCode(error) === "23505") {
        res.status(409).json({ error: "The menu was changed in another session. Reload before saving again." });
        return;
      }
      throw error;
    }
  } else {
    [row] = await db
      .update(serviceMenuContentTable)
      .set({
        content,
        schemaVersion: 1,
        revision: sql`${serviceMenuContentTable.revision} + 1`,
        updatedAt: now,
      })
      .where(and(
        eq(serviceMenuContentTable.key, menuKey),
        eq(serviceMenuContentTable.revision, parsed.data.expectedRevision),
      ))
      .returning();
  }

  if (!row) {
    res.status(409).json({ error: "The menu was changed in another session. Reload before saving again." });
    return;
  }

  res.json(UpdateServiceMenuContentResponse.parse(serializeMenu(row)));
});

export default router;
