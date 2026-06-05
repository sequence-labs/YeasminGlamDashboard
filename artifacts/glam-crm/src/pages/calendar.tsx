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
  useListCalendarEvents,
  useRotateCalendarFeedToken,
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
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, Copy, Download, ExternalLink, RotateCw } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

type ViewMode = "month" | "week" | "day";

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

  const byDate = React.useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const k = ev.eventDate;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(ev);
    }
    return map;
  }, [events]);

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
            <MonthGrid cursor={cursor} days={days} byDate={byDate} onSelect={setSelectedEvent} />
          ) : view === "week" ? (
            <WeekView days={days} byDate={byDate} onSelect={setSelectedEvent} />
          ) : (
            <DayView day={cursor} events={byDate.get(format(cursor, "yyyy-MM-dd")) || []} onSelect={setSelectedEvent} />
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
  onSelect,
}: {
  cursor: Date;
  days: Date[];
  byDate: Map<string, CalendarEvent[]>;
  onSelect: (e: CalendarEvent) => void;
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
              {events.slice(0, 3).map((ev) => (
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
              {events.length > 3 && (
                <li className="px-1 text-[10px] text-muted-foreground">+{events.length - 3} more</li>
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
  onSelect,
}: {
  days: Date[];
  byDate: Map<string, CalendarEvent[]>;
  onSelect: (e: CalendarEvent) => void;
}) {
  return (
    <div className="grid grid-cols-7">
      {days.map((day) => {
        const key = format(day, "yyyy-MM-dd");
        const events = byDate.get(key) || [];
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
  onSelect,
}: {
  day: Date;
  events: CalendarEvent[];
  onSelect: (e: CalendarEvent) => void;
}) {
  return (
    <div className="p-6">
      <div className="crm-eyebrow">{format(day, "EEEE")}</div>
      <div className="mt-1 font-serif text-4xl text-foreground" style={{ fontVariationSettings: "'opsz' 144" }}>
        {format(day, "MMMM d, yyyy")}
      </div>
      <div className="crm-gold-rule mt-4 w-16" />
      <ul className="mt-6 space-y-3">
        {events.length === 0 ? (
          <li className="text-sm text-muted-foreground">Nothing scheduled.</li>
        ) : (
          events.map((ev) => (
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
          ))
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

function FeedDialog({ open, onOpenChange, toast }: { open: boolean; onOpenChange: (v: boolean) => void; toast: ReturnType<typeof useToast>["toast"] }) {
  const { data, refetch } = useGetCalendarFeedToken({
    query: { enabled: open, queryKey: getGetCalendarFeedTokenQueryKey() },
  });
  const rotate = useRotateCalendarFeedToken();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <span className="crm-eyebrow">Calendar · Subscribe</span>
          <DialogTitle className="font-serif text-2xl" style={{ fontVariationSettings: "'opsz' 72" }}>
            Sync to Apple, Google, or Outlook
          </DialogTitle>
          <DialogDescription>
            Paste this URL into your calendar app's "Subscribe to calendar" — it stays in sync automatically.
          </DialogDescription>
        </DialogHeader>
        {data && (
          <div className="space-y-3">
            <code className="block break-all rounded-lg border border-card-border bg-muted/40 p-3 text-xs">{data.url}</code>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  await navigator.clipboard.writeText(data.url);
                  toast({ title: "Feed URL copied" });
                }}
              >
                <Copy className="h-4 w-4" /> Copy URL
              </Button>
              <Button asChild variant="outline">
                <a href={data.url} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" /> Open
                </a>
              </Button>
              <Button
                variant="ghost"
                disabled={rotate.isPending}
                onClick={() =>
                  rotate.mutate(undefined, {
                    onSuccess: () => {
                      refetch();
                      toast({ title: "Feed token rotated", description: "Old URL is no longer valid." });
                    },
                  })
                }
              >
                <RotateCw className="h-4 w-4" /> Rotate token
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
