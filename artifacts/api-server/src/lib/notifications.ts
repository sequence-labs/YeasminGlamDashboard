import { db, notificationsTable } from "@workspace/db";

export type NotificationDraft = {
  category: string;
  title: string;
  body?: string | null;
  href?: string | null;
  resourceType?: string | null;
  resourceId?: number | null;
};

export async function createNotification(draft: NotificationDraft) {
  const [row] = await db.insert(notificationsTable).values({
    category: draft.category,
    title: draft.title,
    body: draft.body ?? null,
    href: draft.href ?? null,
    resourceType: draft.resourceType ?? null,
    resourceId: draft.resourceId ?? null,
  }).returning();
  return row;
}

export function serializeNotification(row: typeof notificationsTable.$inferSelect) {
  return {
    ...row,
    readAt: row.readAt ? row.readAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}
