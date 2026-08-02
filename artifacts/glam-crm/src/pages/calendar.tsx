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
  getGetBookingQueryKey,
  useGetBooking,
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
  if (balanceDue <= 0) return null;
  return { bookingId: b.id, clientName: b.clientName, eventType: b.eventType, date, balanceDue };
}

function PaymentPill({ p, onOpen }: { p: PaymentDue; onOpen: (id: number) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(p.bookingId)}
      title={`Balance due ${money(p.balanceDue)} — ${p.clientName} · ${p.eventType} · Booking #${p.bookingId}`}
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
  const [isMobileViewport, setIsMobileViewport] = React.useState(false);
  const [selectedEvent, setSelectedEvent] = React.useState<CalendarEvent | null>(null);
  const [feedOpen, setFeedOpen] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobileViewport(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const range = React.useMemo(() => {
    const visibleView = isMobileViewport ? "month" : view;
    if (visibleView === "month") {
      const monthStart = startOfMonth(cursor);
      const monthEnd = endOfMonth(cursor);
      return {
        start: startOfWeek(monthStart, { weekStartsOn: 0 }),
        end: endOfWeek(monthEnd, { weekStartsOn: 0 }),
      };
    }
    if (visibleView === "week") {
      return {
        start: startOfWeek(cursor, { weekStartsOn: 0 }),
        end: endOfWeek(cursor, { weekStartsOn: 0 }),
      };
    }
    return { start: cursor, end: cursor };
  }, [cursor, view, isMobileViewport]);

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
          <div className="hidden flex-col gap-3 border-b border-card-border/70 px-6 py-4 sm:flex-row sm:items-center sm:justify-between md:flex">
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
          ) : (
            <>
              <div className="md:hidden">
                <MobileAgenda
                  cursor={cursor}
                  byDate={byDate}
                  paymentsByDate={paymentsByDate}
                  onPrevious={() => setCursor(subMonths(cursor, 1))}
                  onNext={() => setCursor(addMonths(cursor, 1))}
                  onToday={() => setCursor(new Date())}
                  onSelect={setSelectedEvent}
                  onOpenBooking={openBooking}
                />
              </div>
              <div className="hidden md:block">
                {view === "month" ? (
                  <MonthGrid cursor={cursor} days={days} byDate={byDate} paymentsByDate={paymentsByDate} onSelect={setSelectedEvent} onOpenBooking={openBooking} />
                ) : view === "week" ? (
                  <WeekView days={days} byDate={byDate} paymentsByDate={paymentsByDate} onSelect={setSelectedEvent} onOpenBooking={openBooking} />
                ) : (
                  <DayView day={cursor} events={byDate.get(format(cursor, "yyyy-MM-dd")) || []} payments={paymentsByDate.get(format(cursor, "yyyy-MM-dd")) || []} onSelect={setSelectedEvent} onOpenBooking={openBooking} />
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <BookingPreviewDialog event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      <FeedDialog open={feedOpen} onOpenChange={setFeedOpen} toast={toast} />
    </Shell>
  );
}

function MobileAgenda({
  cursor,
  byDate,
  paymentsByDate,
  onPrevious,
  onNext,
  onToday,
  onSelect,
  onOpenBooking,
}: {
  cursor: Date;
  byDate: Map<string, CalendarEvent[]>;
  paymentsByDate: Map<string, PaymentDue[]>;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onSelect: (e: CalendarEvent) => void;
  onOpenBooking: (id: number) => void;
}) {
  const monthDays = React.useMemo(() => {
    const result: Date[] = [];
    let day = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    while (day <= end) {
      result.push(day);
      day = addDays(day, 1);
    }
    return result.filter((day) => isSameMonth(day, cursor));
  }, [cursor]);
  const scheduledDays = monthDays.filter((day) => {
    const key = format(day, "yyyy-MM-dd");
    return (byDate.get(key)?.length ?? 0) > 0 || (paymentsByDate.get(key)?.length ?? 0) > 0;
  });
  const eventCount = scheduledDays.reduce((total, day) => total + (byDate.get(format(day, "yyyy-MM-dd"))?.length ?? 0), 0);
  const paymentCount = scheduledDays.reduce((total, day) => total + (paymentsByDate.get(format(day, "yyyy-MM-dd"))?.length ?? 0), 0);

  return (
    <div className="bg-background">
      <div className="border-b border-card-border/70 px-4 py-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" aria-label="Previous month" onClick={onPrevious}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <div className="crm-eyebrow">Schedule</div>
            <div className="mt-1 font-serif text-[1.65rem] leading-none text-foreground" style={{ fontVariationSettings: "'opsz' 72" }}>
              {format(cursor, "MMMM yyyy")}
            </div>
          </div>
          <Button variant="ghost" size="icon" aria-label="Next month" onClick={onNext}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-muted/45 px-3 py-2.5">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span><strong className="text-foreground">{eventCount}</strong> {eventCount === 1 ? "event" : "events"}</span>
            <span className="h-3 w-px bg-border" />
            <span><strong className="text-foreground">{paymentCount}</strong> due</span>
          </div>
          <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs" onClick={onToday}>Today</Button>
        </div>
      </div>

      {scheduledDays.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <div className="font-serif text-2xl text-foreground" style={{ fontVariationSettings: "'opsz' 72" }}>A quiet month</div>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">Nothing is scheduled in {format(cursor, "MMMM")}. Move to another month to see upcoming work.</p>
        </div>
      ) : (
        <div className="divide-y divide-card-border/70">
          {scheduledDays.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const events = byDate.get(key) || [];
            const payments = paymentsByDate.get(key) || [];
            const today = isSameDay(day, new Date());
            return (
              <section key={key} className={`flex gap-4 px-4 py-4 ${today ? "bg-primary/[0.045]" : ""}`}>
                <div className="w-[3.75rem] shrink-0 pt-0.5 text-center">
                  <div className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${today ? "text-primary" : "text-muted-foreground"}`}>
                    {today ? "Today" : format(day, "EEE")}
                  </div>
                  <div className={`mt-1 font-serif text-[2rem] leading-none tabular-nums ${today ? "text-primary" : "text-foreground"}`} style={{ fontVariationSettings: "'opsz' 72" }}>
                    {format(day, "d")}
                  </div>
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  {events.map((ev) => (
                    <button
                      key={`${ev.eventId}-${ev.bookingId}`}
                      type="button"
                      onClick={() => onSelect(ev)}
                      className="block w-full rounded-xl border border-primary/20 bg-primary/[0.055] px-3 py-2.5 text-left transition-colors hover:bg-primary/10"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="min-w-0 truncate text-sm font-semibold text-foreground">{ev.clientName}</span>
                        {ev.kind === "trial" && <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Trial</span>}
                      </div>
                      <div className="mt-1 truncate text-xs text-muted-foreground">
                        {ev.servicesBegin || "Time not set"} <span className="px-1 text-border">·</span> {ev.eventName} <span className="px-1 text-border">·</span> Booking #{ev.bookingId}
                      </div>
                    </button>
                  ))}
                  {payments.map((payment) => (
                    <button
                      key={`pay-${payment.bookingId}`}
                      type="button"
                      onClick={() => onOpenBooking(payment.bookingId)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.08] px-3 py-2.5 text-left transition-colors hover:bg-amber-500/15"
                    >
                      <span className="flex min-w-0 items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-200">
                        <CircleDollarSign className="h-4 w-4 shrink-0" />
                        <span className="truncate">{payment.clientName} · {payment.eventType} · balance due · #{payment.bookingId}</span>
                      </span>
                      <span className="shrink-0 text-xs font-semibold tabular-nums text-amber-800 dark:text-amber-200">{money(payment.balanceDue)}</span>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
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
    <div className="overflow-x-auto">
      <div className="grid min-w-[760px] grid-cols-7 border-t border-card-border/40 text-xs">
      {["S", "M", "T", "W", "T", "F", "S"].map((dow, i) => (
        <div key={i} className="border-b border-card-border/40 bg-muted/30 px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {dow}
        </div>
      ))}
      {days.map((day) => {
        const key = format(day, "yyyy-MM-dd");
        const events = byDate.get(key) || [];
        const payments = paymentsByDate.get(key) || [];
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
              {events.map((ev) => (
                <li key={`${ev.eventId}-${ev.bookingId}`}>
                  <button
                    type="button"
                    onClick={() => onSelect(ev)}
                    title={`${ev.eventName} · ${ev.clientName} · Booking #${ev.bookingId}`}
                    className="min-h-9 w-full truncate rounded-md border border-primary/20 bg-primary/8 px-2 py-1.5 text-left text-[11px] font-medium text-primary transition-colors hover:bg-primary/15"
                  >
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-[hsl(var(--gold))] align-middle" />{" "}
                    {ev.servicesBegin && <span className="text-[10px] text-muted-foreground">{ev.servicesBegin}</span>}{" "}
                    {ev.clientName}
                    {ev.kind === "trial" && <span className="ml-1 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">· Trial</span>}
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
    <div className="overflow-x-auto">
      <div className="grid min-w-[760px] grid-cols-7">
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

function BookingPreviewDialog({ event, onClose }: { event: CalendarEvent | null; onClose: () => void }) {
  const bookingId = event?.bookingId ?? 0;
  const { data: booking, isLoading } = useGetBooking(bookingId, {
    query: {
      enabled: Boolean(event),
      queryKey: getGetBookingQueryKey(bookingId),
    },
  });

  if (!event) return null;

  const balanceDue = booking
    ? Math.max(0, Number(booking.grandTotal) - (booking.retainerPaid ? Number(booking.retainerAmount) : 0))
    : null;

  return (
    <Dialog open={!!event} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[min(90vh,760px)] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <span className="crm-eyebrow">{event.kind === "trial" ? "Trial · Booking preview" : "Booking preview"}</span>
          <DialogTitle className="font-serif text-2xl" style={{ fontVariationSettings: "'opsz' 72" }}>
            {booking?.clientName ?? event.clientName}
          </DialogTitle>
          <DialogDescription>
            {booking?.eventType ?? event.eventType} · Booking #{event.bookingId}
          </DialogDescription>
          <div className="crm-gold-rule mt-2" />
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-3" aria-label="Loading booking preview">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="space-y-5">
            <section className="rounded-xl border border-primary/20 bg-primary/[0.055] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="crm-eyebrow !text-[10px]">Selected event</div>
                  <h3 className="mt-1 font-serif text-xl text-foreground" style={{ fontVariationSettings: "'opsz' 48" }}>
                    {event.eventName}
                  </h3>
                </div>
                <span className="rounded-full bg-card px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                  {event.kind === "trial" ? "Trial" : event.bookingStatus}
                </span>
              </div>
              <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div><dt className="crm-eyebrow !text-[10px]">Date</dt><dd className="mt-0.5 text-foreground">{format(parseISO(event.eventDate), "EEE, MMM d, yyyy")}</dd></div>
                <div><dt className="crm-eyebrow !text-[10px]">Service window</dt><dd className="mt-0.5 text-foreground">{event.servicesBegin || "Time not set"}{event.completionTarget ? ` – ${event.completionTarget}` : ""}</dd></div>
                <div className="sm:col-span-2"><dt className="crm-eyebrow !text-[10px]">Location</dt><dd className="mt-0.5 text-foreground">{event.location}</dd></div>
              </dl>
            </section>

            {booking ? (
              <>
                <section>
                  <div className="crm-eyebrow !text-[10px]">Booking schedule</div>
                  <div className="mt-2 space-y-2">
                    {booking.events.map((scheduledEvent) => (
                      <div key={scheduledEvent.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-card-border/70 px-3 py-2.5 text-sm">
                        <span className="font-medium text-foreground">{scheduledEvent.eventName}</span>
                        <span className="text-muted-foreground">{format(parseISO(scheduledEvent.eventDate), "MMM d, yyyy")}{scheduledEvent.servicesBegin ? ` · ${scheduledEvent.servicesBegin}` : ""}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <PreviewMetric label="Status" value={booking.status} />
                  <PreviewMetric label="Total" value={money(Number(booking.grandTotal))} />
                  <PreviewMetric label="Retainer" value={booking.retainerPaid ? "Paid" : `${money(Number(booking.retainerAmount))} due`} />
                  <PreviewMetric label="Balance" value={booking.balancePaid ? "Paid" : money(balanceDue ?? 0)} />
                </section>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Booking details are unavailable right now. Open the booking to try again.</p>
            )}

            <Button asChild className="w-full sm:w-auto">
              <Link href={`/bookings/${event.bookingId}`}>Open full booking</Link>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-card-border/70 bg-muted/25 px-3 py-2.5">
      <div className="crm-eyebrow !text-[9px]">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

// Builds an absolute, subscribable feed URL from the token. In production apiBaseUrl is the
// API's absolute origin; in local dev it's empty, so we fall back to the current window
// origin (which proxies /api to the API server — reachable from any device on the same Wi-Fi).
function buildFeedUrls(token: string) {
  const configuredBase = import.meta.env.VITE_PUBLIC_CALENDAR_BASE_URL as string | undefined;
  const base = (configuredBase || apiBaseUrl || (typeof window !== "undefined" ? window.location.origin : "")).replace(/\/+$/, "");
  const bookingsHttpUrl = `${base}/api/public/calendar/${token}/bookings.ics`;
  const remindersHttpUrl = `${base}/api/public/calendar/${token}/reminders.ics`;
  return {
    bookingsHttpUrl,
    bookingsWebcalUrl: bookingsHttpUrl.replace(/^https?:\/\//i, "webcal://"),
    remindersHttpUrl,
    remindersWebcalUrl: remindersHttpUrl.replace(/^https?:\/\//i, "webcal://"),
  };
}

function SubscriptionOption({
  eyebrow,
  title,
  description,
  httpUrl,
  webcalUrl,
  downloadName,
  onCopy,
}: {
  eyebrow: string;
  title: string;
  description: string;
  httpUrl: string;
  webcalUrl: string;
  downloadName: string;
  onCopy: () => void;
}) {
  return (
    <section className="space-y-3 rounded-xl border border-card-border/70 bg-card/70 p-4">
      <div>
        <span className="crm-eyebrow !text-[10px]">{eyebrow}</span>
        <h3 className="mt-1 font-serif text-xl text-foreground" style={{ fontVariationSettings: "'opsz' 72" }}>
          {title}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <Button asChild className="w-full">
        <a href={webcalUrl}>
          <CalendarPlus className="h-4 w-4" /> Add {title.toLowerCase()} to Apple Calendar
        </a>
      </Button>
      <div className="space-y-2">
        <span className="crm-eyebrow !text-[10px]">Or paste this subscription link into any calendar app</span>
        <code className="block break-all rounded-lg border border-card-border bg-muted/40 p-3 text-xs">{httpUrl}</code>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onCopy}>
            <Copy className="h-4 w-4" /> Copy URL
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={httpUrl} target="_blank" rel="noreferrer" download={downloadName}>
              <Download className="h-4 w-4" /> Download .ics
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}

function FeedDialog({ open, onOpenChange, toast }: { open: boolean; onOpenChange: (v: boolean) => void; toast: ReturnType<typeof useToast>["toast"] }) {
  const { data, refetch } = useGetCalendarFeedToken({
    query: { enabled: open, queryKey: getGetCalendarFeedTokenQueryKey() },
  });
  const rotate = useRotateCalendarFeedToken();
  const urls = data ? buildFeedUrls(data.token) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <span className="crm-eyebrow">Calendar · Subscribe</span>
          <DialogTitle className="font-serif text-2xl" style={{ fontVariationSettings: "'opsz' 72" }}>
            Add the studio calendars
          </DialogTitle>
          <DialogDescription>
            Keep scheduled work and payment reminders separate. Subscribe to either calendar—or both—and each one
            will update automatically as the studio schedule changes.
          </DialogDescription>
        </DialogHeader>
        {urls && (
          <div className="space-y-4">
            <SubscriptionOption
              eyebrow="Bookings · Events"
              title="Bookings & events"
              description="Scheduled trials and services, with client, event type, time window, location, and booking details."
              httpUrl={urls.bookingsHttpUrl}
              webcalUrl={urls.bookingsWebcalUrl}
              downloadName="glam-bookings.ics"
              onCopy={async () => {
                await navigator.clipboard.writeText(urls.bookingsHttpUrl);
                toast({ title: "Bookings calendar URL copied" });
              }}
            />

            <SubscriptionOption
              eyebrow="Payments · Reminders"
              title="Payment reminders"
              description="Balance-due dates only, clearly separated from the actual appointment schedule."
              httpUrl={urls.remindersHttpUrl}
              webcalUrl={urls.remindersWebcalUrl}
              downloadName="glam-payment-reminders.ics"
              onCopy={async () => {
                await navigator.clipboard.writeText(urls.remindersHttpUrl);
                toast({ title: "Payment reminders URL copied" });
              }}
            />

            <div className="flex items-center justify-between gap-3 rounded-lg border border-card-border/70 bg-muted/30 px-3 py-2">
              <p className="text-xs leading-relaxed text-muted-foreground">Resetting the link resets both subscriptions.</p>
              <Button
                variant="ghost"
                size="sm"
                disabled={rotate.isPending}
                onClick={() =>
                  rotate.mutate(undefined, {
                    onSuccess: () => {
                      refetch();
                      toast({ title: "Feed links reset", description: "The old booking and reminder links no longer work." });
                    },
                  })
                }
              >
                <RotateCw className="h-4 w-4" /> Reset both
              </Button>
            </div>

            <div className="rounded-lg border border-card-border/70 bg-accent/20 p-3 text-xs leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground/80">On iPhone:</span> tap either “Add to Apple Calendar”
              button, or go to Settings → Calendar → Accounts → Add Account → Other → Add Subscribed Calendar and
              paste that calendar’s link. Apple Calendar subscriptions are read-only and refresh on Apple’s schedule.
              For a phone, use the deployed HTTPS link or set the local public calendar URL to a reachable HTTPS/LAN
              address; a localhost link only works on the computer running this app.
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
