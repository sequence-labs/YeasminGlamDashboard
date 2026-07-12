import type { Request } from "express";
import { and, eq } from "drizzle-orm";
import {
  db,
  addonRequestsTable,
  addonRequestItemsTable,
  addonAuditEventsTable,
  bookingActivityTable,
} from "@workspace/db";

export type AddonRequestRow = typeof addonRequestsTable.$inferSelect;
export type AddonRequestItemRow = typeof addonRequestItemsTable.$inferSelect;

// Accepts either the root db handle or a transaction handle, so audit/activity writes
// can be enrolled in the same transaction as the state change they record.
export type DbOrTx = Parameters<Parameters<typeof db.transaction>[0]>[0] | typeof db;

export function clientIp(req: Request): string | null {
  return (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.ip ?? null;
}

export function userAgent(req: Request): string | null {
  return req.headers["user-agent"] ?? null;
}

export function num(value: unknown): number {
  return parseFloat(value as unknown as string) || 0;
}

export function approvalUrl(token: string): string {
  return `/a/${token}`;
}

export function serializeItem(item: AddonRequestItemRow) {
  return {
    id: item.id,
    serviceItemId: item.serviceItemId,
    name: item.name,
    description: item.description,
    unitLabel: item.unitLabel,
    unitPrice: num(item.unitPrice),
    quantity: num(item.quantity),
    lineTotal: num(item.lineTotal),
    sortOrder: item.sortOrder,
  };
}

export function serializeRequest(row: AddonRequestRow, items: AddonRequestItemRow[]) {
  return {
    id: row.id,
    token: row.token,
    bookingId: row.bookingId,
    status: row.status as "pending" | "approved" | "declined" | "expired" | "cancelled",
    source: row.source as "on_day" | "pre_event",
    artistNote: row.artistNote,
    clientNameSnapshot: row.clientNameSnapshot,
    clientEmailSnapshot: row.clientEmailSnapshot,
    docusignEnvelopeIdSnapshot: row.docusignEnvelopeIdSnapshot,
    total: num(row.totalAmount),
    approvalUrl: approvalUrl(row.token),
    createdAt: row.createdAt.toISOString(),
    decidedAt: row.decidedAt ? row.decidedAt.toISOString() : null,
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    items: items.map(serializeItem),
  };
}

export async function loadRequestItems(requestId: number) {
  return db
    .select()
    .from(addonRequestItemsTable)
    .where(eq(addonRequestItemsTable.requestId, requestId))
    .orderBy(addonRequestItemsTable.sortOrder, addonRequestItemsTable.id);
}

/** Sum of approved add-on request totals for a booking. Surfaced into the balance. */
export async function approvedAddonsTotal(bookingId: number): Promise<number> {
  const rows = await db
    .select({ totalAmount: addonRequestsTable.totalAmount })
    .from(addonRequestsTable)
    .where(and(eq(addonRequestsTable.bookingId, bookingId), eq(addonRequestsTable.status, "approved")));
  return rows.reduce((sum, r) => sum + num(r.totalAmount), 0);
}

export type AuditInput = {
  requestId: number;
  bookingId: number;
  action: string;
  actorType: "artist" | "client" | "system";
  verified?: boolean;
  amountSnapshot?: number | null;
  docusignEnvelopeIdSnapshot?: string | null;
  destinationMasked?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  detail?: string | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * Appends an immutable audit row. This is the ONLY way audit rows are written; nothing
 * in the codebase updates or deletes them.
 */
export async function writeAudit(input: AuditInput, exec: DbOrTx = db) {
  await exec.insert(addonAuditEventsTable).values({
    requestId: input.requestId,
    bookingId: input.bookingId,
    action: input.action,
    actorType: input.actorType,
    verified: input.verified ?? false,
    amountSnapshot: input.amountSnapshot != null ? input.amountSnapshot.toFixed(2) : null,
    docusignEnvelopeIdSnapshot: input.docusignEnvelopeIdSnapshot ?? null,
    destinationMasked: input.destinationMasked ?? null,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    detail: input.detail ?? null,
    metadata: input.metadata ? JSON.stringify(input.metadata) : null,
  });
}

/** Mirrors an add-on event into the booking's human-readable activity feed (History tab). */
export async function recordBookingActivity(
  bookingId: number,
  action: string,
  title: string,
  description: string,
  exec: DbOrTx = db,
) {
  await exec.insert(bookingActivityTable).values({ bookingId, action, title, description });
}
