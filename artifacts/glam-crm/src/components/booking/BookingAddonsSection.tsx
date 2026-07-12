import * as React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Minus, Copy, Printer, Sparkles, Link2, ShieldCheck, X } from "lucide-react";
import type { ServiceItem } from "@workspace/api-client-react";
import {
  useAddonRequests,
  useCreateAddonRequest,
  useCancelAddonRequest,
  useSetDocusignEnvelope,
  type AddonRequest,
  type AddonStatus,
} from "@/lib/addons-api";

function money(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;
}

function publicUrl(path: string) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}${base}${path}`;
}

const STATUS_STYLES: Record<AddonStatus, string> = {
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  approved: "border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300",
  declined: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  cancelled: "border-border bg-muted text-muted-foreground",
  expired: "border-border bg-muted text-muted-foreground",
};

export function BookingAddonsSection({ bookingId, serviceItems }: { bookingId: number; serviceItems: ServiceItem[] }) {
  const { toast } = useToast();
  const { data, isLoading } = useAddonRequests(bookingId);
  const requests = data?.requests ?? [];
  const shareToken = data?.shareToken ?? null;

  function copy(label: string, url: string) {
    navigator.clipboard?.writeText(url).then(
      () => toast({ title: `${label} link copied` }),
      () => toast({ title: "Could not copy", variant: "destructive" }),
    );
  }

  return (
    <div className="crm-section p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="crm-eyebrow">Add-ons · Client-verified</span>
          <h2 className="crm-section-title mt-1">On-day &amp; upgrade approvals</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Request add-ons the client approves with a one-time email code. Approved add-ons are added to the
            balance as a written amendment to the signed agreement — you cannot approve on their behalf.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="h-9">
            <Link href={`/bookings/${bookingId}/upgrade-menu`} data-testid="btn-upgrade-menu-pdf">
              <Printer className="h-4 w-4" /> Upgrade menu PDF
            </Link>
          </Button>
          {shareToken && (
            <Button variant="outline" className="h-9" onClick={() => copy("Upgrade menu", publicUrl(`/a-menu/${shareToken}`))} data-testid="btn-copy-menu-link">
              <Link2 className="h-4 w-4" /> Copy menu link
            </Button>
          )}
          <RequestAddonDialog bookingId={bookingId} serviceItems={serviceItems} />
        </div>
      </div>

      <DocusignField bookingId={bookingId} envelopeId={data?.docusignEnvelopeId ?? null} />

      {isLoading ? (
        <div className="mt-5 text-sm text-muted-foreground">Loading add-on requests…</div>
      ) : requests.length === 0 ? (
        <div className="mt-5 rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          No add-on requests yet. Use “Request add-on” to send one for client approval.
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {requests.map((r) => (
            <RequestRow key={r.id} request={r} bookingId={bookingId} onCopy={copy} />
          ))}
        </ul>
      )}
    </div>
  );
}

function RequestRow({ request, bookingId, onCopy }: { request: AddonRequest; bookingId: number; onCopy: (label: string, url: string) => void }) {
  const { toast } = useToast();
  const cancel = useCancelAddonRequest(bookingId);

  return (
    <li className="rounded-lg border border-card-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] ${STATUS_STYLES[request.status]}`}>
            {request.status}
          </span>
          <span className="text-xs text-muted-foreground">{request.source === "pre_event" ? "Pre-event menu" : "On-day"}</span>
        </div>
        <div className="shrink-0 font-serif text-lg tabular-nums text-foreground">{money(request.total)}</div>
      </div>

      {/* Itemized breakdown — one line per add-on with its own price */}
      <ul className="mt-3 space-y-1.5 border-t border-card-border/60 pt-3">
        {request.items.map((i) => (
          <li key={i.id} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 text-foreground">
              {i.quantity > 1 && <span className="text-muted-foreground">{i.quantity}× </span>}
              {i.name}
              {i.quantity > 1 && <span className="ml-1 text-xs text-muted-foreground">@ {money(i.unitPrice)}</span>}
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">{money(i.lineTotal)}</span>
          </li>
        ))}
      </ul>

      {request.artistNote && <div className="mt-2 text-xs text-muted-foreground">Note: {request.artistNote}</div>}
      <div className="mt-2 text-xs text-muted-foreground">
        For {request.clientNameSnapshot} · {request.clientEmailSnapshot ?? "no email on file"}
        {request.decidedAt && request.status !== "pending" ? ` · ${request.status} ${new Date(request.decidedAt).toLocaleDateString()}` : ""}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {request.status === "pending" && (
          <>
            <Button size="sm" variant="outline" className="h-8" onClick={() => onCopy("Approval", publicUrl(request.approvalUrl))} data-testid={`btn-copy-approval-${request.id}`}>
              <Copy className="h-3.5 w-3.5" /> Copy approval link
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-muted-foreground hover:text-destructive"
              disabled={cancel.isPending}
              onClick={() =>
                cancel.mutate(request.id, {
                  onSuccess: () => toast({ title: "Request cancelled" }),
                  onError: (e) => toast({ title: (e as Error)?.message ?? "Could not cancel", variant: "destructive" }),
                })
              }
              data-testid={`btn-cancel-addon-${request.id}`}
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </Button>
          </>
        )}
      </div>
    </li>
  );
}

function DocusignField({ bookingId, envelopeId }: { bookingId: number; envelopeId: string | null }) {
  const { toast } = useToast();
  const save = useSetDocusignEnvelope(bookingId);
  const [value, setValue] = React.useState(envelopeId ?? "");
  React.useEffect(() => setValue(envelopeId ?? ""), [envelopeId]);
  const dirty = (value.trim() || null) !== (envelopeId || null);

  return (
    <div className="rounded-lg border border-card-border bg-accent/20 p-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
        <span className="crm-eyebrow !text-[10px]">DocuSign master agreement</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Paste the signed master agreement's DocuSign envelope ID. Each approved add-on is linked to it, forming the proof chain: master agreement → verified approval → audit → balance.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. 3f2c8a90-1b2c-4d5e-…"
          className="h-9 max-w-md font-mono text-xs"
          data-testid="input-docusign-envelope"
        />
        <Button
          size="sm"
          className="h-9"
          disabled={!dirty || save.isPending}
          onClick={() =>
            save.mutate(value.trim() || null, {
              onSuccess: () => toast({ title: "DocuSign envelope saved" }),
              onError: (e) => toast({ title: (e as Error)?.message ?? "Could not save", variant: "destructive" }),
            })
          }
          data-testid="btn-save-docusign"
        >
          Save
        </Button>
      </div>
    </div>
  );
}

function RequestAddonDialog({ bookingId, serviceItems }: { bookingId: number; serviceItems: ServiceItem[] }) {
  const { toast } = useToast();
  const create = useCreateAddonRequest(bookingId);
  const [open, setOpen] = React.useState(false);
  const [qty, setQty] = React.useState<Record<number, number>>({});
  const [note, setNote] = React.useState("");
  const active = serviceItems.filter((s) => s.active);

  const selected = Object.entries(qty).filter(([, q]) => q > 0).map(([id, q]) => ({ serviceItemId: Number(id), quantity: q }));
  const total = selected.reduce((sum, s) => {
    const svc = serviceItems.find((x) => x.id === s.serviceItemId);
    return sum + (svc ? svc.defaultUnitPrice * s.quantity : 0);
  }, 0);

  function bump(id: number, delta: number) {
    setQty((p) => ({ ...p, [id]: Math.max(0, (p[id] ?? 0) + delta) }));
  }
  function reset() {
    setQty({});
    setNote("");
  }

  function submit() {
    if (selected.length === 0) return;
    create.mutate(
      { items: selected, note: note.trim() || undefined, source: "on_day" },
      {
        onSuccess: () => {
          toast({ title: "Add-on request created", description: "Copy the approval link and send it to the client." });
          reset();
          setOpen(false);
        },
        onError: (e) => toast({ title: (e as Error)?.message ?? "Could not create request", variant: "destructive" }),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button className="h-9" data-testid="btn-request-addon">
          <Sparkles className="h-4 w-4" /> Request add-on
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request an add-on</DialogTitle>
          <DialogDescription>
            Select services from your catalog. The client approves with a one-time email code before anything is billed.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          {active.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active services in your catalog. Add some under Services first.</p>
          ) : (
            <ul className="divide-y divide-border">
              {active.map((s) => {
                const q = qty[s.id] ?? 0;
                return (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{money(s.defaultUnitPrice)} / {s.unitLabel}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button type="button" aria-label={`Remove one ${s.name}`} onClick={() => bump(s.id, -1)} disabled={q === 0} className="flex h-8 w-8 items-center justify-center rounded-full border border-border disabled:opacity-40">
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-6 text-center text-sm tabular-nums">{q}</span>
                      <button type="button" aria-label={`Add one ${s.name}`} onClick={() => bump(s.id, 1)} className="flex h-8 w-8 items-center justify-center rounded-full border border-border">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="crm-eyebrow !text-[10px]">Note to client (optional)</label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="e.g. Extra hairstyle requested on the day" />
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            Total: <span className="font-serif text-base text-foreground">{money(total)}</span>
          </div>
          <Button onClick={submit} disabled={selected.length === 0 || create.isPending} data-testid="btn-submit-addon-request">
            {create.isPending ? "Creating…" : "Create request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
