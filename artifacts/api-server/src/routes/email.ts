import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  db,
  emailTemplatesTable,
  emailMessagesTable,
  clientsTable,
  bookingsTable,
  type EmailMessage,
} from "@workspace/db";
import {
  ListEmailTemplatesResponse,
  CreateEmailTemplateBody,
  UpdateEmailTemplateParams,
  UpdateEmailTemplateBody,
  UpdateEmailTemplateResponse,
  DeleteEmailTemplateParams,
  RenderEmailTemplateParams,
  RenderEmailTemplateBody,
  RenderEmailTemplateResponse,
  ListEmailMessagesQueryParams,
  ListEmailMessagesResponse,
  CreateEmailMessageBody,
  UpdateEmailMessageParams,
  UpdateEmailMessageBody,
  UpdateEmailMessageResponse,
  DeleteEmailMessageParams,
} from "@workspace/api-zod";
import {
  ensureBuiltInEmailTemplates,
  renderTemplateForBooking,
  serializeEmailTemplate,
} from "../lib/email-templates";

const router: IRouter = Router();

function serializeMessage(m: EmailMessage) {
  return {
    ...m,
    sentAt: m.sentAt ? m.sentAt.toISOString() : null,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

router.get("/email-templates", async (_req, res): Promise<void> => {
  await ensureBuiltInEmailTemplates();
  const rows = await db.select().from(emailTemplatesTable).orderBy(emailTemplatesTable.name);
  res.json(ListEmailTemplatesResponse.parse(rows.map(serializeEmailTemplate)));
});

router.post("/email-templates", async (req, res): Promise<void> => {
  const parsed = CreateEmailTemplateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .insert(emailTemplatesTable)
    .values({
      slug: parsed.data.slug,
      name: parsed.data.name,
      subject: parsed.data.subject,
      body: parsed.data.body,
      active: parsed.data.active ?? true,
      builtIn: false,
    })
    .returning();
  res.status(201).json(serializeEmailTemplate(row));
});

router.patch("/email-templates/:id", async (req, res): Promise<void> => {
  const params = UpdateEmailTemplateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateEmailTemplateBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.data.name !== undefined) updates.name = body.data.name;
  if (body.data.subject !== undefined) updates.subject = body.data.subject;
  if (body.data.body !== undefined) updates.body = body.data.body;
  if (body.data.active !== undefined) updates.active = body.data.active;
  const [row] = await db
    .update(emailTemplatesTable)
    .set(updates)
    .where(eq(emailTemplatesTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(UpdateEmailTemplateResponse.parse(serializeEmailTemplate(row)));
});

router.delete("/email-templates/:id", async (req, res): Promise<void> => {
  const params = DeleteEmailTemplateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(emailTemplatesTable).where(eq(emailTemplatesTable.id, params.data.id));
  res.sendStatus(204);
});

router.post("/email-templates/:id/render", async (req, res): Promise<void> => {
  const params = RenderEmailTemplateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = RenderEmailTemplateBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [template] = await db.select().from(emailTemplatesTable).where(eq(emailTemplatesTable.id, params.data.id));
  if (!template) {
    res.status(404).json({ error: "Template not found" });
    return;
  }

  const rendered = await renderTemplateForBooking(template, body.data);

  let toEmail = "";
  let clientName: string | null = null;
  if (body.data.bookingId) {
    const [row] = await db
      .select({ client: clientsTable })
      .from(bookingsTable)
      .innerJoin(clientsTable, eq(bookingsTable.clientId, clientsTable.id))
      .where(eq(bookingsTable.id, body.data.bookingId));
    if (row) {
      toEmail = row.client.email ?? "";
      clientName = row.client.name;
    }
  } else if (body.data.clientId) {
    const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, body.data.clientId));
    toEmail = client?.email ?? "";
    clientName = client?.name ?? null;
  }

  res.json(
    RenderEmailTemplateResponse.parse({
      subject: rendered.subject,
      body: rendered.body,
      toEmail,
      clientName,
    }),
  );
});

router.get("/email-messages", async (req, res): Promise<void> => {
  const q = ListEmailMessagesQueryParams.safeParse(req.query);
  if (!q.success) {
    res.status(400).json({ error: q.error.message });
    return;
  }
  const filters = [];
  if (q.data.clientId !== undefined) filters.push(eq(emailMessagesTable.clientId, q.data.clientId));
  if (q.data.bookingId !== undefined) filters.push(eq(emailMessagesTable.bookingId, q.data.bookingId));
  const rows = filters.length
    ? await db.select().from(emailMessagesTable).where(and(...filters)).orderBy(desc(emailMessagesTable.createdAt))
    : await db.select().from(emailMessagesTable).orderBy(desc(emailMessagesTable.createdAt));
  res.json(ListEmailMessagesResponse.parse(rows.map(serializeMessage)));
});

router.post("/email-messages", async (req, res): Promise<void> => {
  const parsed = CreateEmailMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const sentAt = parsed.data.status === "marked_sent" || parsed.data.status === "opened_in_mail_app" || parsed.data.status === "copied" ? new Date() : null;
  const [row] = await db
    .insert(emailMessagesTable)
    .values({
      templateId: parsed.data.templateId ?? null,
      clientId: parsed.data.clientId ?? null,
      bookingId: parsed.data.bookingId ?? null,
      toEmail: parsed.data.toEmail,
      ccEmails: parsed.data.ccEmails ?? null,
      bccEmails: parsed.data.bccEmails ?? null,
      subject: parsed.data.subject,
      body: parsed.data.body,
      status: parsed.data.status ?? "draft",
      sentAt,
    })
    .returning();
  res.status(201).json(serializeMessage(row));
});

router.patch("/email-messages/:id", async (req, res): Promise<void> => {
  const params = UpdateEmailMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateEmailMessageBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.data.subject !== undefined) updates.subject = body.data.subject;
  if (body.data.body !== undefined) updates.body = body.data.body;
  if (body.data.status !== undefined) {
    updates.status = body.data.status;
    if (body.data.status === "marked_sent" || body.data.status === "copied" || body.data.status === "opened_in_mail_app") {
      updates.sentAt = new Date();
    }
  }
  const [row] = await db
    .update(emailMessagesTable)
    .set(updates)
    .where(eq(emailMessagesTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(UpdateEmailMessageResponse.parse(serializeMessage(row)));
});

router.delete("/email-messages/:id", async (req, res): Promise<void> => {
  const params = DeleteEmailMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(emailMessagesTable).where(eq(emailMessagesTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
