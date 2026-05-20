import * as React from "react";
import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getListLeadsQueryKey,
  useConvertLead,
  useListLeads,
  useUpdateLead,
  type Lead,
  type LeadUpdateStatus,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  ArrowUpRight,
  Inbox,
  CalendarDays,
  MapPin,
  Users as UsersIcon,
  Phone,
  Mail,
  Sparkles,
  PartyPopper,
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

const STATUS_OPTIONS: { value: LeadUpdateStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "converted", label: "Converted" },
  { value: "archived", label: "Archived" },
];

function statusTone(status: string) {
  switch (status) {
    case "new":
      return "border-primary/25 bg-primary/8 text-primary";
    case "contacted":
      return "border-amber-700/20 bg-amber-700/8 text-amber-700 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300";
    case "converted":
      return "border-emerald-700/20 bg-emerald-700/8 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300";
    case "archived":
      return "border-muted-foreground/20 bg-muted text-muted-foreground";
    default:
      return "border-card-border bg-muted/60 text-foreground/80";
  }
}

export default function LeadsPage() {
  const { data: leads = [], isLoading } = useListLeads();
  const [filter, setFilter] = React.useState<string>("all");
  const [selected, setSelected] = React.useState<Lead | null>(null);

  const filtered = filter === "all" ? leads : leads.filter((l) => l.status === filter);
  const counts = React.useMemo(() => {
    const c: Record<string, number> = { all: leads.length };
    for (const lead of leads) c[lead.status] = (c[lead.status] || 0) + 1;
    return c;
  }, [leads]);

  return (
    <Shell>
      <div className="space-y-7 sm:space-y-9">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="crm-eyebrow">Studio · Intake</span>
            <h1 className="crm-page-title mt-2">Leads</h1>
            <p className="crm-page-subtitle">
              Inquiries from the public form. Convert qualified leads into bookings.
            </p>
            <div className="crm-gold-rule mt-6 w-24" />
          </div>
          <Button asChild variant="outline">
            <a href="/inquire" target="_blank" rel="noreferrer">
              View public form
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </Button>
        </header>

        <div className="crm-section overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-card-border/70 px-6 py-4">
            {["all", ...STATUS_OPTIONS.map((s) => s.value)].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilter(status)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium uppercase tracking-[0.12em] transition-colors ${
                  filter === status
                    ? "border-primary/35 bg-primary/10 text-primary"
                    : "border-card-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{status === "all" ? "All" : STATUS_OPTIONS.find((s) => s.value === status)?.label}</span>
                <span className="rounded-full bg-foreground/10 px-1.5 text-[10px] font-semibold tabular-nums">
                  {counts[status] ?? 0}
                </span>
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-card-border bg-accent/50 text-foreground/70">
                <Inbox className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <h3 className="mt-4 font-serif text-lg text-foreground" style={{ fontVariationSettings: "'opsz' 48" }}>
                No leads in this view
              </h3>
              <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
                Share your public inquiry form at <code className="rounded bg-muted/60 px-1 py-0.5 text-xs">/inquire</code>.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-card-border/60">
              {filtered.map((lead) => (
                <li key={lead.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(lead)}
                    className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-4 px-6 py-4 text-left transition-colors hover:bg-accent/35"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={statusTone(lead.status)} variant="outline">
                          {lead.status}
                        </Badge>
                        {lead.eventType && (
                          <span className="crm-eyebrow !text-[10px]">{lead.eventType}</span>
                        )}
                        <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                          Received {format(parseISO(lead.createdAt), "MMM d, h:mm a")}
                        </span>
                      </div>
                      <h3
                        className="mt-1 truncate font-serif text-xl text-foreground"
                        style={{ fontVariationSettings: "'opsz' 72", letterSpacing: "-0.01em" }}
                      >
                        {lead.name}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" strokeWidth={1.5} />{lead.email}</span>
                        {lead.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" strokeWidth={1.5} />{lead.phone}</span>}
                        {lead.eventDate && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" strokeWidth={1.5} />{lead.eventDate}</span>}
                        {lead.borough && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" strokeWidth={1.5} />{lead.borough}</span>}
                        {lead.headcount != null && <span className="inline-flex items-center gap-1"><UsersIcon className="h-3 w-3" strokeWidth={1.5} />{lead.headcount}</span>}
                      </div>
                      {lead.vision && (
                        <p className="mt-2 line-clamp-2 max-w-3xl text-sm text-foreground/80">
                          {lead.vision}
                        </p>
                      )}
                    </div>
                    <ArrowUpRight className="mt-2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <LeadDetailDialog lead={selected} onClose={() => setSelected(null)} />
    </Shell>
  );
}

function LeadDetailDialog({ lead, onClose }: { lead: Lead | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateLead = useUpdateLead();
  const convertLead = useConvertLead();

  function refresh() {
    queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
  }

  if (!lead) return null;

  return (
    <Dialog open={!!lead} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <span className="crm-eyebrow">Lead · {lead.eventType || "Inquiry"}</span>
          <DialogTitle className="font-serif text-2xl" style={{ fontVariationSettings: "'opsz' 72" }}>
            {lead.name}
          </DialogTitle>
          <DialogDescription>
            Received {format(parseISO(lead.createdAt), "MMM d, yyyy 'at' h:mm a")}
          </DialogDescription>
          <div className="crm-gold-rule mt-2" />
        </DialogHeader>

        <div className="space-y-5">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div><dt className="crm-eyebrow !text-[10px]">Email</dt><dd className="mt-0.5 break-all text-foreground">{lead.email}</dd></div>
            {lead.phone && <div><dt className="crm-eyebrow !text-[10px]">Phone</dt><dd className="mt-0.5 text-foreground">{lead.phone}</dd></div>}
            {lead.eventDate && <div><dt className="crm-eyebrow !text-[10px]">Event date</dt><dd className="mt-0.5 text-foreground">{lead.eventDate}</dd></div>}
            {lead.eventType && <div><dt className="crm-eyebrow !text-[10px]">Event type</dt><dd className="mt-0.5 text-foreground">{lead.eventType}</dd></div>}
            {lead.borough && <div><dt className="crm-eyebrow !text-[10px]">Borough</dt><dd className="mt-0.5 text-foreground">{lead.borough}</dd></div>}
            {lead.headcount != null && <div><dt className="crm-eyebrow !text-[10px]">Headcount</dt><dd className="mt-0.5 text-foreground">{lead.headcount}</dd></div>}
            {lead.source && <div><dt className="crm-eyebrow !text-[10px]">Source</dt><dd className="mt-0.5 text-foreground">{lead.source}</dd></div>}
          </dl>

          {lead.vision && (
            <div className="rounded-xl border border-card-border bg-card/70 p-4">
              <div className="crm-eyebrow !text-[10px]">Vision</div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">{lead.vision}</p>
            </div>
          )}

          <div>
            <div className="crm-eyebrow !text-[10px]">Status</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={updateLead.isPending || lead.status === opt.value}
                  onClick={() =>
                    updateLead.mutate(
                      { id: lead.id, data: { status: opt.value } },
                      {
                        onSuccess: () => {
                          refresh();
                          toast({ title: `Marked ${opt.label.toLowerCase()}` });
                        },
                      }
                    )
                  }
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    lead.status === opt.value
                      ? "border-primary/35 bg-primary/10 text-primary"
                      : "border-card-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {lead.convertedBookingId ? (
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/8 p-4 text-emerald-700 dark:text-emerald-300">
              <div className="flex items-center gap-2 text-sm">
                <PartyPopper className="h-4 w-4" strokeWidth={1.5} />
                Converted to booking #{lead.convertedBookingId}
              </div>
              <Button asChild variant="link" className="px-0 text-sm" size="sm">
                <Link href={`/bookings/${lead.convertedBookingId}`}>Open booking</Link>
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-card-border bg-accent/30 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-foreground">Ready to convert?</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    Creates a client and a draft booking pre-filled with these details.
                  </div>
                </div>
                <Button
                  disabled={convertLead.isPending}
                  onClick={() =>
                    convertLead.mutate(
                      { id: lead.id },
                      {
                        onSuccess: (result) => {
                          refresh();
                          toast({ title: "Lead converted", description: "Booking created in draft." });
                          if (result.bookingId) {
                            window.location.href = `/bookings/${result.bookingId}`;
                          } else {
                            window.location.href = `/clients/${result.clientId}`;
                          }
                        },
                      }
                    )
                  }
                >
                  <Sparkles className="h-4 w-4" /> Convert to booking
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
