import * as React from "react";
import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getGetCalendarFeedTokenQueryKey,
  useGetCalendarFeedToken,
  useListBookings,
  useListCalendarEvents,
  useRotateCalendarFeedToken,
  type Booking,
  type CalendarEvent,
} from "@workspace/api-client-react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";
import { CalendarPlus, ChevronLeft, ChevronRight, CircleDollarSign, Copy, Download, RotateCw } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiBaseUrl } from "@/lib/api-base";

type ViewMode = "month" | "week" | "day";

type PaymentDue = { bookingId: number; clientName: string; eventType: string; date: string; balanceDue: number };

function money(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;
}

// Derives a payment-due marker for a booking (mirrors the ICS feed): the balance is due on
// the explicit balanceDueDate, or the day before the first service, and only shown while
// the balance is still outstanding. Returns null when there's nothing to remind about.
function derivePaymentDue(b: Booking): PaymentDue | null {
  if (b.deletedAt || b.status === "cancelled" || b.balancePaid) return null;
  const ymd = /^\d{4}-\d{2}-\d{2}$/;
  let date: string | null = null;
  if (b.balanceDueDate && ymd.test(b.balanceDueDate)) date = b.balanceDueDate;
  else if (b.firstServiceDate && ymd.test(b.firstServiceDate)) date = format(subDays(parseISO(b.firstServiceDate), 1), "yyyy-MM-dd");
  if (!date) return null;
  const balanceDue = Math.max(0, Number(b.grandTotal) - (b.retainerPaid ? Number(b.retainerAmount) : 0));
  return { bookingId: b.id, clientName: b.clientName, eventType: b.eventType, date, balanceDue };
}

function PaymentPill({ p, onOpen }: { p: PaymentDue; onOpen: (id: number) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(p.bookingId)}
      title={`Balance due ${money(p.balanceDue)} — ${p.clientName}`}
      className="flex w-full items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-1 text-left text-[11px] font-medium text-amber-700 transition-colors hover:bg-amber-500/20 dark:text-amber-300"
    >
      <CircleDollarSign className="h-3 w-3 shrink-0" />
      <span className="truncate">{p.clientName}</span>
      <span className="ml-auto shrink-0 tabular-nums opacity-80">{money(p.balanceDue)}</span>
    </button>
  );
}

export default function CalendarPage() {
  const [cursor, setCursor] = React.useState(() => startOfMonth(new Date()));
  const [view, setView] = React.useState<ViewMode>("month");
  const [selectedEvent, setSelectedEvent] = React.useState<CalendarEvent | null>(null);
  const [feedOpen, setFeedOpen] = React.useState(false);
  const { toast } = useToast();

  const range = React.useMemo(() => {
    if (view === "month") {
      const monthStart = startOfMonth(cursor);
      const monthEnd = endOfMonth(cursor);
      return {
        start: startOfWeek(monthStart, { weekStartsOn: 0 }),
        end: endOfWeek(monthEnd, { weekStartsOn: 0 }),
      };
    }
    if (view === "week") {
      return {
        start: startOfWeek(cursor, { weekStartsOn: 0 }),
        end: endOfWeek(cursor, { weekStartsOn: 0 }),
      };
    }
    return { start: cursor, end: cursor };
  }, [cursor, view]);

  const { data: events = [], isLoading } = useListCalendarEvents({
    start: format(range.start, "yyyy-MM-dd"),
    end: format(range.end, "yyyy-MM-dd"),
  });
  const { data: bookings = [] } = useListBookings();
  const [, setLocation] = useLocation();
  const openBooking = React.useCallback((id: number) => setLocation(`/bookings/${id}`), [setLocation]);

  const byDate = React.useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const k = ev.eventDate;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(ev);
    }
    return map;
  }, [events]);

  const paymentsByDate = React.useMemo(() => {
    const map = new Map<string, PaymentDue[]>();
    for (const b of bookings) {
      const p = derivePaymentDue(b);
      if (!p) continue;
      if (!map.has(p.date)) map.set(p.date, []);
      map.get(p.date)!.push(p);
    }
    return map;
  }, [bookings]);

  const days = React.useMemo(() => {
    const result: Date[] = [];
    let day = range.start;
    while (day <= range.end) {
      result.push(day);
      day = addDays(day, 1);
    }
    return result;
  }, [range]);

  return (
    <Shell>
      <div className="space-y-7 sm:space-y-9">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="crm-eyebrow">Studio · Schedule</span>
            <h1 className="crm-page-title mt-2">Calendar</h1>
            <p className="crm-page-subtitle">
              Every booked event, trial, and confirmed session — in editorial form.
            </p>
            <div className="crm-gold-rule mt-6 w-24" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setFeedOpen(true)}>
              <Download className="h-4 w-4" /> Subscribe (.ics)
            </Button>
          </div>
        </header>

        <div className="crm-section overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-card-border/70 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Previous"
                onClick={() => setCursor(view === "month" ? subMonths(cursor, 1) : addDays(cursor, view === "week" ? -7 : -1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div
                className="min-w-44 font-serif text-2xl text-foreground"
                style={{ fontVariationSettings: "'opsz' 72" }}
              >
                {view === "day" ? format(cursor, "MMMM d, yyyy") : format(cursor, "MMMM yyyy")}
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Next"
                onClick={() => setCursor(view === "month" ? addMonths(cursor, 1) : addDays(cursor, view === "week" ? 7 : 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setCursor(new Date())}>
                Today
              </Button>
            </div>
            <div className="flex items-center gap-1 rounded-full border border-card-border bg-card p-1 text-xs">
              {(["month", "week", "day"] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setView(mode)}
                  className={`rounded-full px-3 py-1 font-medium uppercase tracking-[0.12em] transition-colors ${
                    view === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="p-6">
              <Skeleton className="h-96 w-full" />
            </div>
          ) : view === "month" ? (
            <MonthGrid cursor={cursor} days={days} byDate={byDate} paymentsByDate={paymentsByDate} onSelect={setSelectedEvent} onOpenBooking={openBooking} />
          ) : view === "week" ? (
            <WeekView days={days} byDate={byDate} paymentsByDate={paymentsByDate} onSelect={setSelectedEvent} onOpenBooking={openBooking} />
          ) : (
            <DayView day={cursor} events={byDate.get(format(cursor, "yyyy-MM-dd")) || []} payments={paymentsByDate.get(format(cursor, "yyyy-MM-dd")) || []} onSelect={setSelectedEvent} onOpenBooking={openBooking} />
          )}
        </div>
      </div>

      <EventDetailDialog event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      <FeedDialog open={feedOpen} onOpenChange={setFeedOpen} toast={toast} />
    </Shell>
  );
}

function MonthGrid({
  cursor,
  days,
  byDate,
  paymentsByDate,
  onSelect,
  onOpenBooking,
}: {
  cursor: Date;
  days: Date[];
  byDate: Map<string, CalendarEvent[]>;
  paymentsByDate: Map<string, PaymentDue[]>;
  onSelect: (e: CalendarEvent) => void;
  onOpenBooking: (id: number) => void;
}) {
  return (
    <div className="grid grid-cols-7 border-t border-card-border/40 text-xs">
      {["S", "M", "T", "W", "T", "F", "S"].map((dow, i) => (
        <div key={i} className="border-b border-card-border/40 bg-muted/30 px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {dow}
        </div>
      ))}
      {days.map((day) => {
        const key = format(day, "yyyy-MM-dd");
        const events = byDate.get(key) || [];
        const payments = paymentsByDate.get(key) || [];
        const shownEvents = events.slice(0, 3);
        const shownPayments = payments.slice(0, 2);
        const overflow = events.length - shownEvents.length + (payments.length - shownPayments.length);
        const inMonth = isSameMonth(day, cursor);
        const today = isSameDay(day, new Date());
        return (
          <div
            key={key}
            className={`relative min-h-[110px] border-b border-r border-card-border/40 px-2 py-2 transition-colors ${
              inMonth ? "bg-background" : "bg-muted/15 text-muted-foreground"
            } ${today ? "ring-1 ring-inset ring-primary/40" : ""}`}
          >
            <div className={`text-[11px] font-semibold tabular-nums ${today ? "text-primary" : "text-foreground/80"}`}>
              {format(day, "d")}
            </div>
            <ul className="mt-1 space-y-1">
              {shownEvents.map((ev) => (
                <li key={`${ev.eventId}-${ev.bookingId}`}>
                  <button
                    type="button"
                    onClick={() => onSelect(ev)}
                    className="w-full truncate rounded-md border border-primary/20 bg-primary/8 px-1.5 py-1 text-left text-[11px] font-medium text-primary transition-colors hover:bg-primary/15"
                  >
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-[hsl(var(--gold))] align-middle" />{" "}
                    {ev.servicesBegin && <span className="text-[10px] text-muted-foreground">{ev.servicesBegin}</span>}{" "}
                    {ev.clientName}
                    {ev.kind === "trial" && <span className="ml-1 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">· Trial</span>}
                  </button>
                </li>
              ))}
              {shownPayments.map((p) => (
                <li key={`pay-${p.bookingId}`}>
                  <PaymentPill p={p} onOpen={onOpenBooking} />
                </li>
              ))}
              {overflow > 0 && (
                <li className="px-1 text-[10px] text-muted-foreground">+{overflow} more</li>
              )}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function WeekView({
  days,
  byDate,
  paymentsByDate,
  onSelect,
  onOpenBooking,
}: {
  days: Date[];
  byDate: Map<string, CalendarEvent[]>;
  paymentsByDate: Map<string, PaymentDue[]>;
  onSelect: (e: CalendarEvent) => void;
  onOpenBooking: (id: number) => void;
}) {
  return (
    <div className="grid grid-cols-7">
      {days.map((day) => {
        const key = format(day, "yyyy-MM-dd");
        const events = byDate.get(key) || [];
        const payments = paymentsByDate.get(key) || [];
        const today = isSameDay(day, new Date());
        return (
          <div key={key} className="min-h-[400px] border-r border-card-border/40 p-3">
            <div className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${today ? "text-primary" : "text-muted-foreground"}`}>
              {format(day, "EEE")}
            </div>
            <div className="mt-0.5 font-serif text-2xl text-foreground" style={{ fontVariationSettings: "'opsz' 72" }}>
              {format(day, "d")}
            </div>
            <ul className="mt-3 space-y-1.5">
              {events.map((ev) => (
                <li key={`${ev.eventId}-${ev.bookingId}`}>
                  <button
                    type="button"
                    onClick={() => onSelect(ev)}
                    className="w-full rounded-lg border border-primary/25 bg-primary/8 p-2 text-left text-xs transition-colors hover:bg-primary/15"
                  >
                    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {ev.servicesBegin || "—"}
                    </div>
                    <div className="mt-0.5 font-medium text-foreground">{ev.clientName}</div>
                    <div className="text-[10px] text-muted-foreground">{ev.eventName}</div>
                  </button>
                </li>
              ))}
              {payments.map((p) => (
                <li key={`pay-${p.bookingId}`}>
                  <PaymentPill p={p} onOpen={onOpenBooking} />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function DayView({
  day,
  events,
  payments,
  onSelect,
  onOpenBooking,
}: {
  day: Date;
  events: CalendarEvent[];
  payments: PaymentDue[];
  onSelect: (e: CalendarEvent) => void;
  onOpenBooking: (id: number) => void;
}) {
  return (
    <div className="p-6">
      <div className="crm-eyebrow">{format(day, "EEEE")}</div>
      <div className="mt-1 font-serif text-4xl text-foreground" style={{ fontVariationSettings: "'opsz' 144" }}>
        {format(day, "MMMM d, yyyy")}
      </div>
      <div className="crm-gold-rule mt-4 w-16" />
      <ul className="mt-6 space-y-3">
        {events.length === 0 && payments.length === 0 ? (
          <li className="text-sm text-muted-foreground">Nothing scheduled.</li>
        ) : (
          <>
            {events.map((ev) => (
              <li key={`${ev.eventId}-${ev.bookingId}`}>
                <button
                  type="button"
                  onClick={() => onSelect(ev)}
                  className="grid w-full grid-cols-[120px_minmax(0,1fr)] gap-4 rounded-xl border border-card-border bg-card p-4 text-left transition-colors hover:border-primary/30"
                >
                  <div className="text-sm font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    {ev.servicesBegin || "—"}
                  </div>
                  <div>
                    <div className="font-serif text-lg text-foreground" style={{ fontVariationSettings: "'opsz' 48" }}>
                      {ev.clientName}
                    </div>
                    <div className="text-xs text-muted-foreground">{ev.eventName} · {ev.location}</div>
                  </div>
                </button>
              </li>
            ))}
            {payments.map((p) => (
              <li key={`pay-${p.bookingId}`}>
                <button
                  type="button"
                  onClick={() => onOpenBooking(p.bookingId)}
                  className="grid w-full grid-cols-[120px_minmax(0,1fr)] gap-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-left transition-colors hover:border-amber-500/50"
                >
                  <div className="flex items-center gap-1.5 text-sm font-medium uppercase tracking-[0.12em] text-amber-700 dark:text-amber-300">
                    <CircleDollarSign className="h-4 w-4" /> Due
                  </div>
                  <div>
                    <div className="font-serif text-lg text-foreground" style={{ fontVariationSettings: "'opsz' 48" }}>
                      {money(p.balanceDue)} balance
                    </div>
                    <div className="text-xs text-muted-foreground">{p.clientName} · {p.eventType} · Booking #{p.bookingId}</div>
                  </div>
                </button>
              </li>
            ))}
          </>
        )}
      </ul>
    </div>
  );
}

function EventDetailDialog({ event, onClose }: { event: CalendarEvent | null; onClose: () => void }) {
  if (!event) return null;
  return (
    <Dialog open={!!event} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <span className="crm-eyebrow">{event.kind === "trial" ? "Trial · Studio" : "Booking · Studio"}</span>
          <DialogTitle className="font-serif text-2xl" style={{ fontVariationSettings: "'opsz' 72" }}>
            {event.clientName}
          </DialogTitle>
          <DialogDescription>{event.eventName}</DialogDescription>
          <div className="crm-gold-rule mt-2" />
        </DialogHeader>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div><dt className="crm-eyebrow !text-[10px]">Date</dt><dd className="mt-0.5 text-foreground">{format(parseISO(event.eventDate), "EEE MMM d, yyyy")}</dd></div>
          {event.servicesBegin && <div><dt className="crm-eyebrow !text-[10px]">Services begin</dt><dd className="mt-0.5 text-foreground">{event.servicesBegin}</dd></div>}
          {event.completionTarget && <div><dt className="crm-eyebrow !text-[10px]">Completion</dt><dd className="mt-0.5 text-foreground">{event.completionTarget}</dd></div>}
          <div className="col-span-2"><dt className="crm-eyebrow !text-[10px]">Location</dt><dd className="mt-0.5 text-foreground">{event.location}</dd></div>
        </dl>
        <Button asChild>
          <Link href={`/bookings/${event.bookingId}`}>Open booking</Link>
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// Builds an absolute, subscribable feed URL from the token. In production apiBaseUrl is the
// API's absolute origin; in local dev it's empty, so we fall back to the current window
// origin (which proxies /api to the API server — reachable from any device on the same Wi-Fi).
function buildFeedUrls(token: string) {
  const base = (apiBaseUrl || (typeof window !== "undefined" ? window.location.origin : "")).replace(/\/+$/, "");
  const httpUrl = `${base}/api/public/calendar/${token}.ics`;
  const webcalUrl = httpUrl.replace(/^https?:\/\//i, "webcal://");
  return { httpUrl, webcalUrl };
}

function FeedDialog({ open, onOpenChange, toast }: { open: boolean; onOpenChange: (v: boolean) => void; toast: ReturnType<typeof useToast>["toast"] }) {
  const { data, refetch } = useGetCalendarFeedToken({
    query: { enabled: open, queryKey: getGetCalendarFeedTokenQueryKey() },
  });
  const rotate = useRotateCalendarFeedToken();
  const urls = data ? buildFeedUrls(data.token) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <span className="crm-eyebrow">Calendar · Subscribe</span>
          <DialogTitle className="font-serif text-2xl" style={{ fontVariationSettings: "'opsz' 72" }}>
            Sync to Apple, Google, or Outlook
          </DialogTitle>
          <DialogDescription>
            Subscribe once and every booking, trial, and session stays in sync automatically — new events
            and changes appear on their own.
          </DialogDescription>
        </DialogHeader>
        {urls && (
          <div className="space-y-4">
            <Button asChild className="w-full">
              <a href={urls.webcalUrl}>
                <CalendarPlus className="h-4 w-4" /> Add to Apple Calendar
              </a>
            </Button>

            <div className="space-y-2">
              <span className="crm-eyebrow !text-[10px]">Or paste this link into any calendar app</span>
              <code className="block break-all rounded-lg border border-card-border bg-muted/40 p-3 text-xs">{urls.httpUrl}</code>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await navigator.clipboard.writeText(urls.httpUrl);
                    toast({ title: "Feed URL copied" });
                  }}
                >
                  <Copy className="h-4 w-4" /> Copy URL
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href={urls.httpUrl} target="_blank" rel="noreferrer" download="glam-calendar.ics">
                    <Download className="h-4 w-4" /> Download .ics
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={rotate.isPending}
                  onClick={() =>
                    rotate.mutate(undefined, {
                      onSuccess: () => {
                        refetch();
                        toast({ title: "Feed link reset", description: "The old link no longer works." });
                      },
                    })
                  }
                >
                  <RotateCw className="h-4 w-4" /> Reset link
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-card-border/70 bg-accent/20 p-3 text-xs leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground/80">On iPhone:</span> tap “Add to Apple Calendar,” or go
              to Settings → Calendar → Accounts → Add Account → Other → Add Subscribed Calendar and paste the link.
              Keep the studio’s network reachable for updates — the deployed link syncs from anywhere; this local
              link syncs while your phone is on the same Wi-Fi.
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
