import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown, ChevronRight, History, RotateCcw, Save, Trash2, X } from "lucide-react";
import {
  useUpgradeMenuConfig,
  useSetUpgradeMenuItem,
  useResetUpgradeMenuItem,
  useSaveUpgradeMenuSnapshot,
  useDeleteUpgradeMenuSnapshot,
  useRestoreUpgradeMenuSnapshot,
  type UpgradeMenuResolvedItem,
} from "@/lib/upgrade-menu-config-api";

function money(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;
}

export function UpgradeMenuSidebar({ bookingId }: { bookingId: number }) {
  const { data, isLoading } = useUpgradeMenuConfig(bookingId);
  const [historyOpen, setHistoryOpen] = React.useState(false);

  return (
    <aside className="print:hidden w-[340px] shrink-0 border-r border-gray-200 bg-gray-50 text-[13px]">
      <div className="sticky top-[57px] max-h-[calc(100vh-57px)] overflow-y-auto p-4 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-black">This booking's menu</h2>
          <p className="mt-1 text-xs text-gray-600">
            Toggle what shows on this booking's menu, or edit a name/price/description just for this client.
            Anything left on "Follow global" always mirrors your Services catalog automatically.
          </p>
        </div>

        <HistorySection bookingId={bookingId} open={historyOpen} onToggle={() => setHistoryOpen((v) => !v)} snapshots={data?.snapshots ?? []} />

        {isLoading ? (
          <div className="text-xs text-gray-500">Loading…</div>
        ) : (
          <ul className="space-y-2">
            {(data?.items ?? []).map((item) => (
              <ItemRow key={item.serviceItemId} bookingId={bookingId} item={item} />
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

function HistorySection({
  bookingId,
  open,
  onToggle,
  snapshots,
}: {
  bookingId: number;
  open: boolean;
  onToggle: () => void;
  snapshots: { id: number; label: string | null; createdAt: string }[];
}) {
  const { toast } = useToast();
  const save = useSaveUpgradeMenuSnapshot(bookingId);
  const restore = useRestoreUpgradeMenuSnapshot(bookingId);
  const del = useDeleteUpgradeMenuSnapshot(bookingId);
  const [label, setLabel] = React.useState("");

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
        data-testid="btn-toggle-menu-history"
      >
        <span className="flex items-center gap-1.5 font-medium text-black">
          <History className="h-3.5 w-3.5" /> History
          {snapshots.length > 0 && <span className="text-[11px] font-normal text-gray-500">({snapshots.length})</span>}
        </span>
        {open ? <ChevronDown className="h-3.5 w-3.5 text-gray-500" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-500" />}
      </button>
      {open && (
        <div className="border-t border-gray-200 p-3 space-y-3">
          <div className="flex gap-1.5">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Optional label (e.g. Before edits)"
              className="h-8 text-xs"
            />
            <Button
              size="sm"
              className="h-8 shrink-0 px-2.5"
              disabled={save.isPending}
              onClick={() =>
                save.mutate(label || undefined, {
                  onSuccess: () => {
                    setLabel("");
                    toast({ title: "Snapshot saved" });
                  },
                })
              }
              data-testid="btn-save-menu-snapshot"
            >
              <Save className="h-3.5 w-3.5" /> Save
            </Button>
          </div>
          {snapshots.length === 0 ? (
            <p className="text-xs text-gray-500">No snapshots yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {snapshots.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 rounded-md border border-gray-200 px-2.5 py-1.5">
                  <div className="min-w-0">
                    <div className="truncate text-xs font-medium text-black">{s.label || "Untitled snapshot"}</div>
                    <div className="text-[10px] text-gray-500">{new Date(s.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      title="Restore this version"
                      className="rounded p-1 text-gray-600 hover:bg-gray-100 hover:text-black disabled:opacity-40"
                      disabled={restore.isPending}
                      onClick={() =>
                        restore.mutate(s.id, {
                          onSuccess: () => toast({ title: "Restored", description: "Your previous version was saved to history too." }),
                        })
                      }
                      data-testid={`btn-restore-snapshot-${s.id}`}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Delete snapshot"
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                      onClick={() => del.mutate(s.id)}
                      data-testid={`btn-delete-snapshot-${s.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function ItemRow({ bookingId, item }: { bookingId: number; item: UpgradeMenuResolvedItem }) {
  const { toast } = useToast();
  const setItem = useSetUpgradeMenuItem(bookingId);
  const resetItem = useResetUpgradeMenuItem(bookingId);
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState(item.name);
  const [description, setDescription] = React.useState(item.description ?? "");
  const [unitPrice, setUnitPrice] = React.useState(String(item.unitPrice));
  const [unitLabel, setUnitLabel] = React.useState(item.unitLabel);

  React.useEffect(() => {
    if (!editing) {
      setName(item.name);
      setDescription(item.description ?? "");
      setUnitPrice(String(item.unitPrice));
      setUnitLabel(item.unitLabel);
    }
  }, [item, editing]);

  function toggleIncluded(checked: boolean) {
    setItem.mutate({ serviceItemId: item.serviceItemId, included: checked, followGlobal: item.followGlobal });
  }

  function saveCustomization() {
    setItem.mutate(
      {
        serviceItemId: item.serviceItemId,
        included: item.included,
        followGlobal: false,
        name: name.trim() || item.name,
        description: description.trim() ? description : null,
        unitPrice: Number(unitPrice) || 0,
        unitLabel: unitLabel.trim() || item.unitLabel,
      },
      { onSuccess: () => { setEditing(false); toast({ title: "Customized for this booking" }); } },
    );
  }

  function revertToGlobal() {
    resetItem.mutate(item.serviceItemId, { onSuccess: () => { setEditing(false); toast({ title: "Reverted to global settings" }); } });
  }

  function startCustomizing() {
    setName(item.name);
    setDescription(item.description ?? "");
    setUnitPrice(String(item.unitPrice));
    setUnitLabel(item.unitLabel);
    setItem.mutate({
      serviceItemId: item.serviceItemId,
      included: item.included,
      followGlobal: false,
      name: item.name,
      description: item.description ?? undefined,
      unitPrice: item.unitPrice,
      unitLabel: item.unitLabel,
    });
  }

  function toggleCustomize(checked: boolean) {
    if (checked) startCustomizing();
    else revertToGlobal();
  }

  return (
    <li className={`rounded-lg border p-2.5 ${item.included ? "border-gray-200 bg-white" : "border-gray-200 bg-gray-100/60 opacity-70"}`}>
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={item.included}
          onChange={(e) => toggleIncluded(e.target.checked)}
          className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-gray-300"
          aria-label={`Include ${item.name} on this booking's menu`}
          data-testid={`checkbox-include-${item.serviceItemId}`}
        />
        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setEditing((v) => !v)}>
          <div className="flex items-center gap-1.5">
            <span className="truncate text-xs font-medium text-black">{item.name}</span>
            {item.hasOverride && !item.followGlobal && (
              <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700">
                Custom
              </span>
            )}
          </div>
          <div className="text-[11px] text-gray-500">
            {money(item.unitPrice)} / {item.unitLabel}
            {!item.globalActive && <span className="ml-1 text-gray-400">· inactive globally</span>}
          </div>
        </button>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-black"
          aria-label="Edit"
        >
          {editing ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
      </div>

      {editing && (
        <div className="mt-2.5 space-y-2 border-t border-gray-200 pt-2.5">
          <label className="flex items-center gap-1.5 text-[11px] text-gray-700">
            <input
              type="checkbox"
              checked={!item.followGlobal}
              disabled={setItem.isPending || resetItem.isPending}
              onChange={(e) => toggleCustomize(e.target.checked)}
              className="h-3 w-3 rounded border-gray-300"
              data-testid={`checkbox-customize-${item.serviceItemId}`}
            />
            Customize for this booking (otherwise follows your Services catalog)
          </label>

          {!item.followGlobal && (
            <div className="space-y-1.5 rounded-md bg-gray-50 p-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="h-7 text-xs" />
              <div className="flex gap-1.5">
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  className="h-7 text-xs"
                  placeholder="Price"
                />
                <Input value={unitLabel} onChange={(e) => setUnitLabel(e.target.value)} placeholder="per…" className="h-7 text-xs" />
              </div>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description"
                rows={2}
                className="text-xs"
              />
              <div className="flex justify-end gap-1.5">
                <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => setEditing(false)}>
                  <X className="h-3 w-3" /> Cancel
                </Button>
                <Button size="sm" className="h-7 px-2.5 text-[11px]" disabled={setItem.isPending} onClick={saveCustomization} data-testid={`btn-save-item-${item.serviceItemId}`}>
                  Save
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
