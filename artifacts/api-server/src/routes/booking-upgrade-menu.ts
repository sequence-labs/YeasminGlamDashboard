import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import {
  db,
  bookingsTable,
  serviceItemsTable,
  bookingUpgradeMenuItemsTable,
  bookingUpgradeMenuSnapshotsTable,
} from "@workspace/db";

const router: IRouter = Router();

function num(value: unknown): number {
  return parseFloat(value as unknown as string) || 0;
}

type ResolvedItem = {
  serviceItemId: number;
  kind: "service" | "fee";
  name: string;
  description: string | null;
  unitPrice: number;
  unitLabel: string;
  included: boolean;
  followGlobal: boolean;
  hasOverride: boolean;
  globalActive: boolean;
  globalShowOnUpgradeMenu: boolean;
  sortOrder: number;
};

/**
 * Resolves the effective per-booking menu by left-joining every catalog item against any
 * booking-level override. With no override row, an item's effective content is whatever
 * the global catalog currently says, and its default `included` mirrors the existing
 * global filter (active && showOnUpgradeMenu) — so a booking with zero overrides renders
 * identically to the pre-existing, purely-global-driven menu.
 */
async function resolveMenu(bookingId: number): Promise<ResolvedItem[]> {
  const services = await db.select().from(serviceItemsTable).orderBy(serviceItemsTable.sortOrder, serviceItemsTable.id);
  const overrides = await db
    .select()
    .from(bookingUpgradeMenuItemsTable)
    .where(eq(bookingUpgradeMenuItemsTable.bookingId, bookingId));
  const overrideByServiceId = new Map(overrides.map((o) => [o.serviceItemId, o]));

  return services.map((s) => {
    const override = overrideByServiceId.get(s.id);
    const followGlobal = override ? override.followGlobal : true;
    const included = override ? override.included : s.active && s.showOnUpgradeMenu;
    return {
      serviceItemId: s.id,
      kind: s.kind as "service" | "fee",
      name: followGlobal || !override?.overrideName ? s.name : override.overrideName,
      description: followGlobal ? s.description : override?.overrideDescription ?? s.description,
      unitPrice: followGlobal || override?.overrideUnitPrice == null ? num(s.defaultUnitPrice) : num(override.overrideUnitPrice),
      unitLabel: followGlobal || !override?.overrideUnitLabel ? s.unitLabel : override.overrideUnitLabel,
      included,
      followGlobal,
      hasOverride: !!override,
      globalActive: s.active,
      globalShowOnUpgradeMenu: s.showOnUpgradeMenu,
      sortOrder: override?.sortOrder ?? s.sortOrder,
    };
  });
}

async function requireBooking(id: number) {
  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id));
  return booking ?? null;
}

// GET /bookings/:id/upgrade-menu-config — the full sidebar payload: every catalog item's
// resolved state for this booking, plus the snapshot history.
router.get("/bookings/:id/upgrade-menu-config", async (req, res): Promise<void> => {
  const bookingId = Number(req.params.id);
  if (!Number.isInteger(bookingId)) {
    res.status(400).json({ error: "Invalid booking id" });
    return;
  }
  if (!(await requireBooking(bookingId))) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  const items = await resolveMenu(bookingId);
  const snapshots = await db
    .select({ id: bookingUpgradeMenuSnapshotsTable.id, label: bookingUpgradeMenuSnapshotsTable.label, createdAt: bookingUpgradeMenuSnapshotsTable.createdAt })
    .from(bookingUpgradeMenuSnapshotsTable)
    .where(eq(bookingUpgradeMenuSnapshotsTable.bookingId, bookingId))
    .orderBy(bookingUpgradeMenuSnapshotsTable.id);

  res.json({
    bookingId,
    items,
    snapshots: snapshots.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() })).reverse(),
  });
});

// PUT /bookings/:id/upgrade-menu-config/:serviceItemId — upsert a per-booking override.
router.put("/bookings/:id/upgrade-menu-config/:serviceItemId", async (req, res): Promise<void> => {
  const bookingId = Number(req.params.id);
  const serviceItemId = Number(req.params.serviceItemId);
  if (!Number.isInteger(bookingId) || !Number.isInteger(serviceItemId)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  if (!(await requireBooking(bookingId))) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  const [service] = await db.select().from(serviceItemsTable).where(eq(serviceItemsTable.id, serviceItemId));
  if (!service) {
    res.status(404).json({ error: "Service item not found" });
    return;
  }

  const included = typeof req.body?.included === "boolean" ? req.body.included : true;
  const followGlobal = typeof req.body?.followGlobal === "boolean" ? req.body.followGlobal : true;
  const overrideName = followGlobal ? null : typeof req.body?.name === "string" && req.body.name.trim() ? req.body.name.trim() : null;
  const overrideDescription = followGlobal ? null : typeof req.body?.description === "string" ? req.body.description : null;
  const overrideUnitPrice = followGlobal || typeof req.body?.unitPrice !== "number" ? null : req.body.unitPrice.toFixed(2);
  const overrideUnitLabel = followGlobal ? null : typeof req.body?.unitLabel === "string" && req.body.unitLabel.trim() ? req.body.unitLabel.trim() : null;

  await db
    .insert(bookingUpgradeMenuItemsTable)
    .values({ bookingId, serviceItemId, included, followGlobal, overrideName, overrideDescription, overrideUnitPrice, overrideUnitLabel })
    .onConflictDoUpdate({
      target: [bookingUpgradeMenuItemsTable.bookingId, bookingUpgradeMenuItemsTable.serviceItemId],
      set: { included, followGlobal, overrideName, overrideDescription, overrideUnitPrice, overrideUnitLabel, updatedAt: new Date() },
    });

  res.json({ items: await resolveMenu(bookingId) });
});

// DELETE /bookings/:id/upgrade-menu-config/:serviceItemId — clear a single item's override,
// reverting it to "follow the global catalog" (the default, pre-override behavior).
router.delete("/bookings/:id/upgrade-menu-config/:serviceItemId", async (req, res): Promise<void> => {
  const bookingId = Number(req.params.id);
  const serviceItemId = Number(req.params.serviceItemId);
  if (!Number.isInteger(bookingId) || !Number.isInteger(serviceItemId)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db
    .delete(bookingUpgradeMenuItemsTable)
    .where(and(eq(bookingUpgradeMenuItemsTable.bookingId, bookingId), eq(bookingUpgradeMenuItemsTable.serviceItemId, serviceItemId)));
  res.json({ items: await resolveMenu(bookingId) });
});

// POST /bookings/:id/upgrade-menu-snapshots — save the current resolved menu as a
// point-in-time snapshot (not raw override rows), so restoring it later doesn't depend on
// where the global catalog has drifted to since.
router.post("/bookings/:id/upgrade-menu-snapshots", async (req, res): Promise<void> => {
  const bookingId = Number(req.params.id);
  if (!Number.isInteger(bookingId)) {
    res.status(400).json({ error: "Invalid booking id" });
    return;
  }
  if (!(await requireBooking(bookingId))) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  const label = typeof req.body?.label === "string" && req.body.label.trim() ? req.body.label.trim().slice(0, 200) : null;
  const items = await resolveMenu(bookingId);
  const [snapshot] = await db
    .insert(bookingUpgradeMenuSnapshotsTable)
    .values({ bookingId, label, itemsJson: JSON.stringify(items) })
    .returning();
  res.status(201).json({ id: snapshot.id, label: snapshot.label, createdAt: snapshot.createdAt.toISOString() });
});

// DELETE /bookings/:id/upgrade-menu-snapshots/:snapshotId — remove a snapshot from history.
router.delete("/bookings/:id/upgrade-menu-snapshots/:snapshotId", async (req, res): Promise<void> => {
  const snapshotId = Number(req.params.snapshotId);
  if (!Number.isInteger(snapshotId)) {
    res.status(400).json({ error: "Invalid snapshot id" });
    return;
  }
  await db.delete(bookingUpgradeMenuSnapshotsTable).where(eq(bookingUpgradeMenuSnapshotsTable.id, snapshotId));
  res.sendStatus(204);
});

// POST /bookings/:id/upgrade-menu-snapshots/:snapshotId/restore — restore a past snapshot.
// The current state is auto-saved as a snapshot first, so a restore is itself always
// reversible from the same history list.
router.post("/bookings/:id/upgrade-menu-snapshots/:snapshotId/restore", async (req, res): Promise<void> => {
  const bookingId = Number(req.params.id);
  const snapshotId = Number(req.params.snapshotId);
  if (!Number.isInteger(bookingId) || !Number.isInteger(snapshotId)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [target] = await db
    .select()
    .from(bookingUpgradeMenuSnapshotsTable)
    .where(and(eq(bookingUpgradeMenuSnapshotsTable.id, snapshotId), eq(bookingUpgradeMenuSnapshotsTable.bookingId, bookingId)));
  if (!target) {
    res.status(404).json({ error: "Snapshot not found" });
    return;
  }

  const currentItems = await resolveMenu(bookingId);
  await db.insert(bookingUpgradeMenuSnapshotsTable).values({
    bookingId,
    label: "Auto-saved before restore",
    itemsJson: JSON.stringify(currentItems),
  });

  const targetItems = JSON.parse(target.itemsJson) as ResolvedItem[];
  for (const item of targetItems) {
    await db
      .insert(bookingUpgradeMenuItemsTable)
      .values({
        bookingId,
        serviceItemId: item.serviceItemId,
        included: item.included,
        followGlobal: false,
        overrideName: item.name,
        overrideDescription: item.description,
        overrideUnitPrice: item.unitPrice.toFixed(2),
        overrideUnitLabel: item.unitLabel,
      })
      .onConflictDoUpdate({
        target: [bookingUpgradeMenuItemsTable.bookingId, bookingUpgradeMenuItemsTable.serviceItemId],
        set: {
          included: item.included,
          followGlobal: false,
          overrideName: item.name,
          overrideDescription: item.description,
          overrideUnitPrice: item.unitPrice.toFixed(2),
          overrideUnitLabel: item.unitLabel,
          updatedAt: new Date(),
        },
      });
  }

  res.json({ items: await resolveMenu(bookingId) });
});

export default router;
