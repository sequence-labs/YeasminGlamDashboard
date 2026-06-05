import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, leadsTable, clientsTable } from "@workspace/db";
import {
  ListLeadsResponse,
  GetLeadParams,
  GetLeadResponse,
  UpdateLeadParams,
  UpdateLeadBody,
  UpdateLeadResponse,
  ConvertLeadParams,
  ConvertLeadResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function serialize(l: typeof leadsTable.$inferSelect) {
  return {
    ...l,
    createdAt: l.createdAt.toISOString(),
  };
}

router.get("/leads", async (_req, res): Promise<void> => {
  const rows = await db.select().from(leadsTable).orderBy(desc(leadsTable.createdAt));
  res.json(ListLeadsResponse.parse(rows.map(serialize)));
});

router.get("/leads/:id", async (req, res): Promise<void> => {
  const params = GetLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db.select().from(leadsTable).where(eq(leadsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(GetLeadResponse.parse(serialize(row)));
});

router.patch("/leads/:id", async (req, res): Promise<void> => {
  const params = UpdateLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateLeadBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (body.data.status !== undefined) updates.status = body.data.status;
  if (body.data.convertedClientId !== undefined) updates.convertedClientId = body.data.convertedClientId;
  if (body.data.convertedBookingId !== undefined) updates.convertedBookingId = body.data.convertedBookingId;
  const [row] = await db
    .update(leadsTable)
    .set(updates)
    .where(eq(leadsTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(UpdateLeadResponse.parse(serialize(row)));
});

router.post("/leads/:id/convert", async (req, res): Promise<void> => {
  const params = ConvertLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, params.data.id));
  if (!lead) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  let clientId = lead.convertedClientId;
  if (!clientId) {
    const [existingClient] = await db.select().from(clientsTable).where(eq(clientsTable.email, lead.email)).limit(1);
    if (existingClient) {
      clientId = existingClient.id;
    } else {
      const [created] = await db
        .insert(clientsTable)
        .values({
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          notes: lead.vision,
        })
        .returning();
      clientId = created.id;
    }
  }

  const [updatedLead] = await db
    .update(leadsTable)
    .set({ status: "converted", convertedClientId: clientId })
    .where(eq(leadsTable.id, params.data.id))
    .returning();

  res.json(
    ConvertLeadResponse.parse({
      lead: serialize(updatedLead),
      clientId,
      bookingId: lead.convertedBookingId ?? null,
    }),
  );
});

export default router;
