import { and, asc, eq, lte, sql } from "drizzle-orm";
import {
  db,
  scheduledTasksTable,
  automationSettingsTable,
  bookingsTable,
  clientsTable,
  emailTemplatesTable,
  emailMessagesTable,
  notificationsTable,
  leadsTable,
} from "@workspace/db";
import { applyMergeFields, ensureBuiltInEmailTemplates, renderTemplateForBooking } from "./email-templates";

export async function getOrCreateAutomationSettings() {
  const [existing] = await db.select().from(automationSettingsTable).orderBy(automationSettingsTable.id).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(automationSettingsTable).values({}).returning();
  return created;
}

export function serializeSettings(s: typeof automationSettingsTable.$inferSelect) {
  return {
    ...s,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

export function serializeScheduledTask(t: typeof scheduledTasksTable.$inferSelect) {
  return {
    ...t,
    runAt: t.runAt.toISOString(),
    claimedAt: t.claimedAt ? t.claimedAt.toISOString() : null,
    completedAt: t.completedAt ? t.completedAt.toISOString() : null,
    createdAt: t.createdAt.toISOString(),
  };
}

type EnqueueArgs = {
  kind: string;
  runAt: Date;
  resourceType?: string | null;
  resourceId?: number | null;
  payload?: unknown;
};

export async function enqueueTaskIfMissing(args: EnqueueArgs) {
  if (args.resourceType && args.resourceId !== undefined && args.resourceId !== null) {
    const [existing] = await db
      .select()
      .from(scheduledTasksTable)
      .where(and(
        eq(scheduledTasksTable.kind, args.kind),
        eq(scheduledTasksTable.resourceType, args.resourceType),
        eq(scheduledTasksTable.resourceId, args.resourceId),
        sql`${scheduledTasksTable.status} in ('pending','claimed')`,
      ))
      .limit(1);
    if (existing) return existing;
  }
  const [row] = await db
    .insert(scheduledTasksTable)
    .values({
      kind: args.kind,
      runAt: args.runAt,
      resourceType: args.resourceType ?? null,
      resourceId: args.resourceId ?? null,
      payload: args.payload as Record<string, unknown> | undefined,
      status: "pending",
    })
    .returning();
  return row;
}

async function buildEmailDraftForBooking(slug: string, bookingId: number, fallbackTitle: string) {
  await ensureBuiltInEmailTemplates();
  const [template] = await db.select().from(emailTemplatesTable).where(eq(emailTemplatesTable.slug, slug)).limit(1);
  if (!template) return null;
  const [row] = await db
    .select({ booking: bookingsTable, client: clientsTable })
    .from(bookingsTable)
    .innerJoin(clientsTable, eq(bookingsTable.clientId, clientsTable.id))
    .where(eq(bookingsTable.id, bookingId));
  if (!row) return null;
  const rendered = await renderTemplateForBooking(template, { bookingId, clientId: row.client.id });
  const [draft] = await db
    .insert(emailMessagesTable)
    .values({
      templateId: template.id,
      clientId: row.client.id,
      bookingId,
      toEmail: row.client.email ?? "",
      subject: rendered.subject,
      body: rendered.body,
      status: "draft",
    })
    .returning();
  await db.insert(notificationsTable).values({
    category: "reminder",
    title: `${fallbackTitle} for ${row.client.name}`,
    body: rendered.subject,
    href: `/bookings/${bookingId}`,
    resourceType: "email_message",
    resourceId: draft.id,
  });
  return draft;
}

async function buildEmailDraftForLead(slug: string, leadId: number) {
  await ensureBuiltInEmailTemplates();
  const [template] = await db.select().from(emailTemplatesTable).where(eq(emailTemplatesTable.slug, slug)).limit(1);
  if (!template) return null;
  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, leadId));
  if (!lead) return null;
  const fields: Record<string, string> = {
    client_name: lead.name,
    client_first_name: lead.name.split(/\s+/)[0] ?? lead.name,
    event_type: lead.eventType ?? "your event",
    event_date: lead.eventDate ?? "your event date",
    artist_name: "the studio",
    artist_business_name: "the studio",
  };
  const subject = applyMergeFields(template.subject, fields);
  const body = applyMergeFields(template.body, fields);
  const [draft] = await db
    .insert(emailMessagesTable)
    .values({
      templateId: template.id,
      clientId: null,
      bookingId: null,
      toEmail: lead.email,
      subject,
      body,
      status: "draft",
    })
    .returning();
  await db.insert(notificationsTable).values({
    category: "lead",
    title: `Auto-reply ready for ${lead.name}`,
    body: `Inquiry from ${lead.email}`,
    href: `/leads`,
    resourceType: "email_message",
    resourceId: draft.id,
  });
  return draft;
}

type RunResult = { claimed: number; completed: number; failed: number };

export async function runScheduledTasksOnce(limit = 25): Promise<RunResult> {
  const result: RunResult = { claimed: 0, completed: 0, failed: 0 };
  const claimed = await db.execute(sql`
    update ${scheduledTasksTable}
    set status = 'claimed', claimed_at = now(), attempts = attempts + 1
    where id in (
      select id from ${scheduledTasksTable}
      where status = 'pending' and run_at <= now()
      order by run_at asc
      limit ${limit}
      for update skip locked
    )
    returning *
  `);
  const tasks = (claimed.rows ?? []) as unknown as Array<typeof scheduledTasksTable.$inferSelect>;
  result.claimed = tasks.length;

  for (const task of tasks) {
    try {
      await runTask(task);
      await db
        .update(scheduledTasksTable)
        .set({ status: "completed", completedAt: new Date() })
        .where(eq(scheduledTasksTable.id, task.id));
      result.completed += 1;
    } catch (err) {
      await db
        .update(scheduledTasksTable)
        .set({ status: "failed", error: err instanceof Error ? err.message : String(err) })
        .where(eq(scheduledTasksTable.id, task.id));
      result.failed += 1;
    }
  }
  return result;
}

async function runTask(task: typeof scheduledTasksTable.$inferSelect): Promise<void> {
  switch (task.kind) {
    case "retainer_reminder": {
      if (!task.resourceId) return;
      await buildEmailDraftForBooking("retainer-reminder", task.resourceId, "Retainer reminder ready");
      return;
    }
    case "balance_reminder": {
      if (!task.resourceId) return;
      await buildEmailDraftForBooking("retainer-reminder", task.resourceId, "Balance reminder ready");
      return;
    }
    case "day_before_confirmation": {
      if (!task.resourceId) return;
      await buildEmailDraftForBooking("day-before-logistics", task.resourceId, "Day-before logistics ready");
      return;
    }
    case "thank_you": {
      if (!task.resourceId) return;
      await buildEmailDraftForBooking("thank-you", task.resourceId, "Thank-you note ready");
      return;
    }
    case "inquiry_auto_reply": {
      if (!task.resourceId) return;
      await buildEmailDraftForLead("inquiry-reply", task.resourceId);
      return;
    }
    default:
      // Unknown kinds quietly skip.
      return;
  }
}

export async function scheduleBookingReminders(bookingId: number) {
  const settings = await getOrCreateAutomationSettings();
  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId));
  if (!booking) return;

  if (settings.retainerReminderEnabled && !booking.retainerPaid) {
    const runAt = new Date(Date.now() + settings.retainerReminderDays * 24 * 60 * 60 * 1000);
    await enqueueTaskIfMissing({
      kind: "retainer_reminder",
      resourceType: "booking",
      resourceId: bookingId,
      runAt,
    });
  }

  if (settings.dayBeforeReminderEnabled && booking.firstServiceDate) {
    const eventDate = new Date(`${booking.firstServiceDate}T09:00:00`);
    const runAt = new Date(eventDate.getTime() - 24 * 60 * 60 * 1000);
    if (runAt.getTime() > Date.now()) {
      await enqueueTaskIfMissing({
        kind: "day_before_confirmation",
        resourceType: "booking",
        resourceId: bookingId,
        runAt,
      });
    }
  }

  if (settings.thankYouEnabled && booking.firstServiceDate) {
    const eventDate = new Date(`${booking.firstServiceDate}T18:00:00`);
    const runAt = new Date(eventDate.getTime() + settings.thankYouDays * 24 * 60 * 60 * 1000);
    if (runAt.getTime() > Date.now()) {
      await enqueueTaskIfMissing({
        kind: "thank_you",
        resourceType: "booking",
        resourceId: bookingId,
        runAt,
      });
    }
  }
}

export function startReminderRunner(intervalMs = 60_000) {
  const interval = setInterval(() => {
    runScheduledTasksOnce().catch(() => {
      // intentional swallow — errors recorded per-task in DB
    });
  }, intervalMs);
  if (interval.unref) interval.unref();
  return interval;
}
