import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import {
  assistantAgreementAuditEventsTable,
  assistantAgreementsTable,
  assistantArtistsTable,
  db,
} from "@workspace/db";
import {
  CreateAssistantAgreementBody,
  CreateAssistantArtistBody,
  GetAssistantAgreementParams,
  GetAssistantAgreementResponse,
  GetAssistantArtistParams,
  GetAssistantArtistResponse,
  ListAssistantAgreementsResponse,
  ListAssistantArtistsResponse,
  UpdateAssistantAgreementBody,
  UpdateAssistantAgreementParams,
  UpdateAssistantAgreementResponse,
  UpdateAssistantArtistBody,
  UpdateAssistantArtistParams,
  UpdateAssistantArtistResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

type DbOrTx = Parameters<Parameters<typeof db.transaction>[0]>[0] | typeof db;

function nullableText(value?: string | null) {
  if (value === undefined) return undefined;
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function serializeAssistantArtist(artist: typeof assistantArtistsTable.$inferSelect) {
  return {
    ...artist,
    createdAt: artist.createdAt.toISOString(),
    updatedAt: artist.updatedAt.toISOString(),
  };
}

function serializeAssistantAgreement(
  agreement: typeof assistantAgreementsTable.$inferSelect,
  assistantArtist: typeof assistantArtistsTable.$inferSelect,
) {
  return {
    ...agreement,
    perClientRate: Number(agreement.perClientRate),
    bookingDeposit: Number(agreement.bookingDeposit),
    createdAt: agreement.createdAt.toISOString(),
    updatedAt: agreement.updatedAt.toISOString(),
    assistantArtist: serializeAssistantArtist(assistantArtist),
  };
}

function serializeAuditEvent(event: typeof assistantAgreementAuditEventsTable.$inferSelect) {
  return {
    ...event,
    changes: event.changes,
    snapshot: event.snapshot,
    createdAt: event.createdAt.toISOString(),
  };
}

function agreementSnapshot(
  agreement: typeof assistantAgreementsTable.$inferSelect,
  assistantArtist: typeof assistantArtistsTable.$inferSelect,
) {
  return {
    assistantArtist: {
      id: assistantArtist.id,
      name: assistantArtist.name,
      role: assistantArtist.role,
    },
    eventName: agreement.eventName,
    eventDate: agreement.eventDate,
    location: agreement.location,
    arrivalTime: agreement.arrivalTime,
    minimumClients: agreement.minimumClients,
    maximumClients: agreement.maximumClients,
    perClientRate: Number(agreement.perClientRate),
    bookingDeposit: Number(agreement.bookingDeposit),
    paymentMethod: agreement.paymentMethod,
    paymentTiming: agreement.paymentTiming,
    specialNotes: agreement.specialNotes,
    status: agreement.status,
  };
}

function agreementChanges(
  before: typeof assistantAgreementsTable.$inferSelect,
  after: typeof assistantAgreementsTable.$inferSelect,
) {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  const trackedFields = [
    "assistantArtistId", "eventName", "eventDate", "location", "arrivalTime",
    "minimumClients", "maximumClients", "perClientRate", "bookingDeposit",
    "paymentMethod", "paymentTiming", "specialNotes", "status",
  ] as const;
  for (const field of trackedFields) {
    const previous = field === "perClientRate" || field === "bookingDeposit" ? Number(before[field]) : before[field];
    const next = field === "perClientRate" || field === "bookingDeposit" ? Number(after[field]) : after[field];
    if (previous !== next) changes[field] = { from: previous, to: next };
  }
  return changes;
}

function assistantProfileChanges(
  before: typeof assistantArtistsTable.$inferSelect,
  after: typeof assistantArtistsTable.$inferSelect,
) {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  const trackedFields = ["name", "role", "email", "phone", "paymentMethod", "notes", "active"] as const;
  for (const field of trackedFields) {
    if (before[field] !== after[field]) changes[field] = { from: before[field], to: after[field] };
  }
  return changes;
}

async function writeAgreementAudit(
  input: {
    agreement: typeof assistantAgreementsTable.$inferSelect;
    assistantArtist: typeof assistantArtistsTable.$inferSelect;
    action: "created" | "updated" | "status_changed" | "assistant_profile_updated";
    summary: string;
    changes?: Record<string, unknown>;
  },
  exec: DbOrTx = db,
) {
  await exec.insert(assistantAgreementAuditEventsTable).values({
    agreementId: input.agreement.id,
    assistantArtistId: input.assistantArtist.id,
    action: input.action,
    actorType: "artist",
    summary: input.summary,
    changes: input.changes ?? {},
    snapshot: agreementSnapshot(input.agreement, input.assistantArtist),
  });
}

async function serializeAssistantAgreementDetail(
  agreement: typeof assistantAgreementsTable.$inferSelect,
  assistantArtist: typeof assistantArtistsTable.$inferSelect,
) {
  const history = await db
    .select()
    .from(assistantAgreementAuditEventsTable)
    .where(eq(assistantAgreementAuditEventsTable.agreementId, agreement.id))
    .orderBy(desc(assistantAgreementAuditEventsTable.createdAt), desc(assistantAgreementAuditEventsTable.id));
  return {
    ...serializeAssistantAgreement(agreement, assistantArtist),
    history: history.map(serializeAuditEvent),
  };
}

function agreementInputValues(input: {
  assistantArtistId?: number;
  eventName?: string;
  eventDate?: string | null;
  location?: string | null;
  arrivalTime?: string | null;
  minimumClients?: number;
  maximumClients?: number;
  perClientRate?: number;
  bookingDeposit?: number;
  paymentMethod?: string | null;
  paymentTiming?: string | null;
  specialNotes?: string | null;
  status?: "draft" | "confirmed" | "completed" | "cancelled";
}) {
  if (input.minimumClients !== undefined && input.maximumClients !== undefined && input.maximumClients < input.minimumClients) {
    return { error: "Maximum clients cannot be lower than minimum clients." } as const;
  }

  const values: Partial<typeof assistantAgreementsTable.$inferInsert> = {};
  if (input.assistantArtistId !== undefined) values.assistantArtistId = input.assistantArtistId;
  if (input.eventName !== undefined) values.eventName = input.eventName.trim();
  if (input.eventDate !== undefined) values.eventDate = nullableText(input.eventDate);
  if (input.location !== undefined) values.location = nullableText(input.location);
  if (input.arrivalTime !== undefined) values.arrivalTime = nullableText(input.arrivalTime);
  if (input.minimumClients !== undefined) values.minimumClients = input.minimumClients;
  if (input.maximumClients !== undefined) values.maximumClients = input.maximumClients;
  if (input.perClientRate !== undefined) values.perClientRate = input.perClientRate.toFixed(2);
  if (input.bookingDeposit !== undefined) values.bookingDeposit = input.bookingDeposit.toFixed(2);
  if (input.paymentMethod !== undefined) values.paymentMethod = nullableText(input.paymentMethod);
  if (input.paymentTiming !== undefined) values.paymentTiming = nullableText(input.paymentTiming);
  if (input.specialNotes !== undefined) values.specialNotes = nullableText(input.specialNotes);
  if (input.status !== undefined) values.status = input.status;
  return { values } as const;
}

async function assistantForAgreement(assistantArtistId: number) {
  return (await db.select().from(assistantArtistsTable).where(eq(assistantArtistsTable.id, assistantArtistId)))[0];
}

router.get("/assistant-artists", async (_req, res): Promise<void> => {
  const artists = await db.select().from(assistantArtistsTable).orderBy(desc(assistantArtistsTable.active), assistantArtistsTable.name);
  res.json(ListAssistantArtistsResponse.parse(artists.map(serializeAssistantArtist)));
});

router.post("/assistant-artists", async (req, res): Promise<void> => {
  const parsed = CreateAssistantArtistBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [artist] = await db.insert(assistantArtistsTable).values({
    name: parsed.data.name.trim(),
    role: parsed.data.role?.trim() || "Makeup Artist",
    email: nullableText(parsed.data.email),
    phone: nullableText(parsed.data.phone),
    paymentMethod: nullableText(parsed.data.paymentMethod),
    notes: nullableText(parsed.data.notes),
    active: parsed.data.active ?? true,
    updatedAt: new Date(),
  }).returning();

  res.status(201).json(GetAssistantArtistResponse.parse(serializeAssistantArtist(artist)));
});

router.get("/assistant-artists/:id", async (req, res): Promise<void> => {
  const params = GetAssistantArtistParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const artist = await assistantForAgreement(params.data.id);
  if (!artist) {
    res.status(404).json({ error: "Assistant artist not found" });
    return;
  }
  res.json(GetAssistantArtistResponse.parse(serializeAssistantArtist(artist)));
});

router.patch("/assistant-artists/:id", async (req, res): Promise<void> => {
  const params = UpdateAssistantArtistParams.safeParse(req.params);
  const parsed = UpdateAssistantArtistBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const values: Partial<typeof assistantArtistsTable.$inferInsert> = { updatedAt: new Date() };
  if (parsed.data.name !== undefined) values.name = parsed.data.name.trim();
  if (parsed.data.role !== undefined) values.role = parsed.data.role.trim();
  if (parsed.data.email !== undefined) values.email = nullableText(parsed.data.email);
  if (parsed.data.phone !== undefined) values.phone = nullableText(parsed.data.phone);
  if (parsed.data.paymentMethod !== undefined) values.paymentMethod = nullableText(parsed.data.paymentMethod);
  if (parsed.data.notes !== undefined) values.notes = nullableText(parsed.data.notes);
  if (parsed.data.active !== undefined) values.active = parsed.data.active;

  const artist = await db.transaction(async (tx) => {
    const [existing] = await tx.select().from(assistantArtistsTable).where(eq(assistantArtistsTable.id, params.data.id));
    if (!existing) return null;
    const [updated] = await tx.update(assistantArtistsTable).set(values).where(eq(assistantArtistsTable.id, params.data.id)).returning();
    const changes = assistantProfileChanges(existing, updated);
    if (Object.keys(changes).length > 0) {
      const agreements = await tx.select().from(assistantAgreementsTable).where(eq(assistantAgreementsTable.assistantArtistId, updated.id));
      for (const agreement of agreements) {
        await writeAgreementAudit({
          agreement,
          assistantArtist: updated,
          action: "assistant_profile_updated",
          summary: `Assistant profile updated: ${Object.keys(changes).join(", ")}.`,
          changes,
        }, tx);
      }
    }
    return updated;
  });
  if (!artist) {
    res.status(404).json({ error: "Assistant artist not found" });
    return;
  }
  res.json(UpdateAssistantArtistResponse.parse(serializeAssistantArtist(artist)));
});

router.get("/assistant-agreements", async (_req, res): Promise<void> => {
  const rows = await db
    .select({ agreement: assistantAgreementsTable, assistantArtist: assistantArtistsTable })
    .from(assistantAgreementsTable)
    .innerJoin(assistantArtistsTable, eq(assistantAgreementsTable.assistantArtistId, assistantArtistsTable.id))
    .orderBy(desc(assistantAgreementsTable.eventDate), desc(assistantAgreementsTable.updatedAt));

  res.json(ListAssistantAgreementsResponse.parse(rows.map(({ agreement, assistantArtist }) => serializeAssistantAgreement(agreement, assistantArtist))));
});

router.post("/assistant-agreements", async (req, res): Promise<void> => {
  const parsed = CreateAssistantAgreementBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (parsed.data.maximumClients < parsed.data.minimumClients) {
    res.status(400).json({ error: "Maximum clients cannot be lower than minimum clients." });
    return;
  }

  const assistantArtist = await assistantForAgreement(parsed.data.assistantArtistId);
  if (!assistantArtist) {
    res.status(400).json({ error: "Choose an existing assistant artist profile first." });
    return;
  }
  const result = agreementInputValues(parsed.data);
  if ("error" in result) {
    res.status(400).json({ error: result.error });
    return;
  }
  const agreement = await db.transaction(async (tx) => {
    const [created] = await tx.insert(assistantAgreementsTable).values({
      assistantArtistId: parsed.data.assistantArtistId,
      eventName: parsed.data.eventName.trim(),
      minimumClients: parsed.data.minimumClients,
      maximumClients: parsed.data.maximumClients,
      perClientRate: parsed.data.perClientRate.toFixed(2),
      bookingDeposit: parsed.data.bookingDeposit.toFixed(2),
      ...result.values,
      updatedAt: new Date(),
    }).returning();
    await writeAgreementAudit({
      agreement: created,
      assistantArtist,
      action: "created",
      summary: "Agreement created.",
    }, tx);
    return created;
  });

  res.status(201).json(GetAssistantAgreementResponse.parse(await serializeAssistantAgreementDetail(agreement, assistantArtist)));
});

router.get("/assistant-agreements/:id", async (req, res): Promise<void> => {
  const params = GetAssistantAgreementParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const row = (await db
    .select({ agreement: assistantAgreementsTable, assistantArtist: assistantArtistsTable })
    .from(assistantAgreementsTable)
    .innerJoin(assistantArtistsTable, eq(assistantAgreementsTable.assistantArtistId, assistantArtistsTable.id))
    .where(eq(assistantAgreementsTable.id, params.data.id)))[0];
  if (!row) {
    res.status(404).json({ error: "Assistant agreement not found" });
    return;
  }
  res.json(GetAssistantAgreementResponse.parse(await serializeAssistantAgreementDetail(row.agreement, row.assistantArtist)));
});

router.patch("/assistant-agreements/:id", async (req, res): Promise<void> => {
  const params = UpdateAssistantAgreementParams.safeParse(req.params);
  const parsed = UpdateAssistantAgreementBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(assistantAgreementsTable).where(eq(assistantAgreementsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Assistant agreement not found" });
    return;
  }

  const minimumClients = parsed.data.minimumClients ?? existing.minimumClients;
  const maximumClients = parsed.data.maximumClients ?? existing.maximumClients;
  if (maximumClients < minimumClients) {
    res.status(400).json({ error: "Maximum clients cannot be lower than minimum clients." });
    return;
  }
  const assistantArtistId = parsed.data.assistantArtistId ?? existing.assistantArtistId;
  const assistantArtist = await assistantForAgreement(assistantArtistId);
  if (!assistantArtist) {
    res.status(400).json({ error: "Choose an existing assistant artist profile." });
    return;
  }
  const result = agreementInputValues(parsed.data);
  if ("error" in result) {
    res.status(400).json({ error: result.error });
    return;
  }

  const agreement = await db.transaction(async (tx) => {
    const [updated] = await tx.update(assistantAgreementsTable)
      .set({ ...result.values, updatedAt: new Date() })
      .where(eq(assistantAgreementsTable.id, params.data.id))
      .returning();
    const changes = agreementChanges(existing, updated);
    if (Object.keys(changes).length > 0) {
      const statusChanged = "status" in changes;
      await writeAgreementAudit({
        agreement: updated,
        assistantArtist,
        action: statusChanged ? "status_changed" : "updated",
        summary: statusChanged
          ? `Status changed from ${String(changes.status.from)} to ${String(changes.status.to)}.`
          : `Agreement updated: ${Object.keys(changes).join(", ")}.`,
        changes,
      }, tx);
    }
    return updated;
  });

  res.json(UpdateAssistantAgreementResponse.parse(await serializeAssistantAgreementDetail(agreement, assistantArtist)));
});

export default router;
