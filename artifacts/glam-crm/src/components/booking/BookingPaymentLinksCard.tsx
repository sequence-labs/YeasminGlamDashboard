import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  getListBookingPaymentIntentsQueryKey,
  useCreatePaymentIntent,
  useGetArtistProfile,
  useListBookingPaymentIntents,
  useUpdatePaymentIntent,
  type PaymentIntent,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Copy, ExternalLink, HandCoins, Plus, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Props = {
  bookingId: number;
  clientName: string;
  retainerAmount: number;
  balanceDue: number;
  eventName: string;
};

export function BookingPaymentLinksCard({ bookingId, clientName, retainerAmount, balanceDue, eventName }: Props) {
  const { data: intents = [] } = useListBookingPaymentIntents(bookingId);
  const { data: artist } = useGetArtistProfile();
  const create = useCreatePaymentIntent();
  const update = useUpdatePaymentIntent();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  function refresh() {
    queryClient.invalidateQueries({ queryKey: getListBookingPaymentIntentsQueryKey(bookingId) });
  }

  const hasHandles = !!(artist?.zelleHandle || artist?.venmoHandle || artist?.cashAppHandle);
  const note = `${clientName} · ${eventName}`;

  return (
    <section className="crm-section overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-card-border/70 px-6 py-5">
        <div>
          <span className="crm-eyebrow">Money · Payment links</span>
          <h2 className="crm-section-title mt-1">Send a payment request</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Zelle, Venmo, or Cash App — copy a ready-to-paste handle, deeplink, or instructions.
          </p>
        </div>
        <NewIntentDialog
          bookingId={bookingId}
          defaults={{ retainer: retainerAmount, balance: balanceDue }}
          onCreated={refresh}
        />
      </div>

      {!hasHandles ? (
        <div className="px-6 py-6 text-sm text-muted-foreground">
          Add your Zelle, Venmo, or Cash App handle in <a className="underline" href="/artist">Artist profile</a> to enable payment links.
        </div>
      ) : intents.length === 0 ? (
        <div className="px-6 py-6 text-sm text-muted-foreground">
          No requests yet. Create one above when you're ready to collect.
        </div>
      ) : (
        <ul className="divide-y divide-card-border/60">
          {intents.map((intent) => (
            <PaymentIntentRow
              key={intent.id}
              intent={intent}
              artist={artist}
              note={note}
              onUpdated={refresh}
              onCopy={(t) => toast({ title: t })}
              onMarkPaid={() =>
                update.mutate({ id: intent.id, data: { status: "paid" } }, { onSuccess: () => { refresh(); toast({ title: "Marked as paid" }); } })
              }
              onCancel={() =>
                update.mutate({ id: intent.id, data: { status: "cancelled" } }, { onSuccess: () => { refresh(); toast({ title: "Cancelled" }); } })
              }
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function handleField(method: string): "zelleHandle" | "venmoHandle" | "cashAppHandle" | null {
  if (method === "zelle") return "zelleHandle";
  if (method === "venmo") return "venmoHandle";
  if (method === "cashapp") return "cashAppHandle";
  return null;
}

function PaymentIntentRow({
  intent,
  artist,
  note,
  onMarkPaid,
  onCancel,
  onCopy,
}: {
  intent: PaymentIntent;
  artist: any;
  note: string;
  onUpdated: () => void;
  onMarkPaid: () => void;
  onCancel: () => void;
  onCopy: (text: string) => void;
}) {
  const key = handleField(intent.method);
  const handle: string = (key && artist?.[key]) || "";
  const cleanHandle = handle.replace(/^@/, "").replace(/^\$/, "");

  const venmoDeep = intent.method === "venmo"
    ? `venmo://paycharge?txn=pay&recipients=${encodeURIComponent(cleanHandle)}&amount=${intent.amount}&note=${encodeURIComponent(note)}`
    : "";

  const externalLink =
    intent.method === "venmo" ? `https://venmo.com/${encodeURIComponent(cleanHandle)}`
    : intent.method === "cashapp" ? `https://cash.app/$${encodeURIComponent(cleanHandle)}`
    : "";

  return (
    <li className="grid grid-cols-1 gap-3 px-6 py-4 sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:items-center">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {intent.kind} · {intent.method}
        </div>
        <div className="mt-1 font-serif text-2xl text-foreground tabular-nums" style={{ fontVariationSettings: "'opsz' 72" }}>
          ${Number(intent.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </div>
        <div className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          Requested {format(parseISO(intent.requestedAt), "MMM d, h:mm a")}
        </div>
      </div>
      <div className="space-y-2 text-sm">
        <div className="text-xs text-muted-foreground">Handle: <span className="font-medium text-foreground">{handle || "—"}</span></div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={!handle} onClick={async () => { await navigator.clipboard.writeText(handle); onCopy("Handle copied"); }}>
            <Copy className="h-3.5 w-3.5" /> Copy handle
          </Button>
          {venmoDeep && (
            <Button asChild size="sm" variant="outline">
              <a href={venmoDeep}><ExternalLink className="h-3.5 w-3.5" /> Open Venmo</a>
            </Button>
          )}
          {externalLink && (
            <Button asChild size="sm" variant="outline">
              <a href={externalLink} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" /> Open {intent.method}</a>
            </Button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 justify-self-end">
        <StatusPill status={intent.status} />
        {intent.status === "requested" || intent.status === "pending" ? (
          <>
            <Button size="sm" onClick={onMarkPaid}>Mark paid</Button>
            <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={onCancel}>Cancel</Button>
          </>
        ) : null}
      </div>
    </li>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "paid"
      ? "border-emerald-700/25 bg-emerald-700/8 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300"
      : status === "cancelled"
      ? "border-muted-foreground/20 bg-muted text-muted-foreground"
      : "border-primary/25 bg-primary/8 text-primary";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${tone}`}>
      <HandCoins className="h-3 w-3" /> {status}
    </span>
  );
}

function NewIntentDialog({
  bookingId,
  defaults,
  onCreated,
}: {
  bookingId: number;
  defaults: { retainer: number; balance: number };
  onCreated: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [kind, setKind] = React.useState<"retainer" | "balance" | "custom">("retainer");
  const [method, setMethod] = React.useState<"zelle" | "venmo" | "cashapp">("zelle");
  const [amount, setAmount] = React.useState<string>(String(defaults.retainer || 0));
  const [note, setNote] = React.useState("");
  const create = useCreatePaymentIntent();

  React.useEffect(() => {
    if (kind === "retainer") setAmount(String(defaults.retainer || 0));
    else if (kind === "balance") setAmount(String(defaults.balance || 0));
  }, [kind, defaults]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const numeric = Number(amount);
    if (!numeric || numeric <= 0) return;
    create.mutate(
      { id: bookingId, data: { kind, method, amount: numeric, note: note || undefined } },
      {
        onSuccess: () => {
          onCreated();
          setOpen(false);
          setNote("");
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> New request
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <span className="crm-eyebrow">Money · Payment</span>
          <DialogTitle className="font-serif text-2xl" style={{ fontVariationSettings: "'opsz' 72" }}>New payment request</DialogTitle>
          <DialogDescription>
            Tracks the request lifecycle and surfaces in the client portal.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {(["retainer", "balance", "custom"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                  kind === k ? "border-primary/35 bg-primary/8 text-primary" : "border-card-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["zelle", "venmo", "cashapp"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={`inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  method === m ? "border-primary/35 bg-primary/8 text-primary" : "border-card-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                <Wallet className="h-3.5 w-3.5" /> {m === "cashapp" ? "Cash App" : m}
              </button>
            ))}
          </div>
          <label className="block">
            <span className="crm-eyebrow !text-[10px]">Amount</span>
            <Input type="number" min={0} step={0.01} value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </label>
          <label className="block">
            <span className="crm-eyebrow !text-[10px]">Internal note (optional)</span>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Trial deposit" />
          </label>
          <DialogFooter>
            <Button type="submit" disabled={create.isPending || !Number(amount)}>
              {create.isPending ? "Creating…" : "Create request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
