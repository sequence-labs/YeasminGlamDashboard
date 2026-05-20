import { Shell } from "@/components/layout/Shell";
import {
  useGetDashboardStats,
  useGetNextActions,
  useGetUpcomingEvents,
  useListBookings,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  ArrowUpRight,
  CalendarCheck,
  CalendarDays,
  HandCoins,
  Inbox,
  ListChecks,
  MapPin,
  PenLine,
  Plus,
  Send,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { Link } from "wouter";
import { format, parseISO } from "date-fns";
import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

/* ------------------------------------------------------------------------ *
 * Status palette — keeps semantic color but tunes to the warm system.      *
 * ------------------------------------------------------------------------ */
const STATUS_COLORS: Record<string, string> = {
  active: "hsl(348 52% 38%)",
  completed: "hsl(150 38% 38%)",
  draft: "hsl(28 8% 60%)",
  cancelled: "hsl(0 55% 50%)",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  completed: "Completed",
  draft: "Draft",
  cancelled: "Cancelled",
};

function formatMoney(value: number) {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatDate(value?: string | null) {
  return value ? format(parseISO(value), "MMM d") : "TBD";
}

function statusTone(status: string) {
  switch (status) {
    case "completed":
      return "border-emerald-700/15 bg-emerald-700/8 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300";
    case "active":
      return "border-primary/25 bg-primary/8 text-primary";
    case "cancelled":
      return "border-destructive/25 bg-destructive/8 text-destructive";
    default:
      return "border-border bg-muted/60 text-muted-foreground";
  }
}

function paymentLabel(booking: { retainerPaid: boolean; balancePaid: boolean }) {
  if (booking.balancePaid) return "Paid in full";
  if (booking.retainerPaid) return "Balance due";
  return "Retainer due";
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: upcomingEvents, isLoading: upcomingLoading } = useGetUpcomingEvents();
  const { data: bookings, isLoading: bookingsLoading } = useListBookings();
  const { data: nextActions = [] } = useGetNextActions();

  const statusChartData = useMemo(() => {
    if (!bookings) return [];
    const counts: Record<string, number> = { active: 0, completed: 0, draft: 0, cancelled: 0 };
    bookings.forEach(b => { counts[b.status] = (counts[b.status] || 0) + 1; });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name: STATUS_LABELS[name] || name, value, key: name }));
  }, [bookings]);

  const revenueByTypeData = useMemo(() => {
    if (!bookings) return [];
    const totals: Record<string, number> = {};
    bookings.forEach(b => {
      if (b.grandTotal > 0) {
        totals[b.eventType] = (totals[b.eventType] || 0) + b.grandTotal;
      }
    });
    return Object.entries(totals)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value }));
  }, [bookings]);

  const nextUpcomingEvent = upcomingEvents?.[0];
  const bookingRows = bookings ?? [];
  const activeBookingRows = bookingRows.filter((booking) => booking.status === "active");
  const paymentRiskRows = activeBookingRows
    .filter((booking) => !booking.retainerPaid || !booking.balancePaid)
    .slice(0, 4);
  const openPipelineValue = activeBookingRows.reduce((sum, booking) => sum + booking.grandTotal, 0);
  const completedBookingCount =
    stats?.completedBookings ?? bookingRows.filter((booking) => booking.status === "completed").length;
  const maxStatusCount = Math.max(...statusChartData.map((entry) => entry.value), 1);

  return (
    <Shell>
      <div className="space-y-7 sm:space-y-9">
        {/* -------- Page header — editorial masthead -------- */}
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="crm-eyebrow">Studio · Command Center</span>
            <h1 className="crm-page-title mt-2">Dashboard</h1>
            <p className="crm-page-subtitle">
              Money, schedule, and booking health — at a single glance.
            </p>
            <div className="crm-gold-rule mt-6 w-24" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="default">
              <Link href="/bookings">
                <ListChecks className="h-4 w-4" />
                All bookings
              </Link>
            </Button>
            <Button asChild size="default">
              <Link href="/bookings/new">
                <Plus className="h-4 w-4" />
                New booking
              </Link>
            </Button>
          </div>
        </header>

        {/* -------- Next actions -------- */}
        {nextActions.length > 0 && (
          <section className="crm-section overflow-hidden">
            <div className="flex items-start justify-between gap-4 border-b border-card-border/70 px-6 py-5">
              <div>
                <span className="crm-eyebrow">Studio · Next moves</span>
                <h2 className="crm-section-title mt-1">What needs you today</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Calculated from booking lifecycle, payment status, and lead activity.
                </p>
              </div>
              <Sparkles className="mt-1 hidden h-5 w-5 text-[hsl(var(--gold))] sm:block" strokeWidth={1.5} />
            </div>
            <ul className="divide-y divide-card-border/60">
              {nextActions.slice(0, 5).map((action) => {
                const meta = nextActionMeta(action.kind);
                return (
                  <li key={action.id}>
                    <Link
                      href={action.href || "/bookings"}
                      className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-6 py-4 transition-colors hover:bg-accent/35"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-card-border bg-card text-muted-foreground">
                        <NextActionIcon kind={action.kind} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="crm-eyebrow !text-[10px]">{meta.eyebrow}</span>
                          {action.severity === "attention" && (
                            <span
                              className="inline-flex h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_0_2px_hsl(var(--primary)/0.18)]"
                              aria-label="Needs attention"
                            />
                          )}
                          {action.dueOn && (
                            <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                              · {format(parseISO(action.dueOn), "MMM d")}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 truncate text-[15px] font-medium text-foreground group-hover:text-primary">
                          {action.title}
                        </div>
                        {action.detail && (
                          <div className="mt-0.5 truncate text-xs text-muted-foreground">{action.detail}</div>
                        )}
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.14em] text-primary">
                        {meta.action}
                        <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* -------- Stat strip -------- */}
        {statsLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1fr_1fr]">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 w-full" />)}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1fr_1fr]">
            <MetricTile
              eyebrow="Open pipeline"
              value={formatMoney(openPipelineValue || stats.pendingRevenue)}
              detail={`${stats.activeBookings} active booking${stats.activeBookings === 1 ? "" : "s"}`}
              icon={HandCoins}
              testId="stat-pending-revenue"
              emphasis
            />
            <MetricTile
              eyebrow="Retainers due"
              value={String(stats.retainersPending)}
              detail={`${stats.balancesPending} balance${stats.balancesPending === 1 ? "" : "s"} pending`}
              icon={AlertCircle}
              testId="stat-active-bookings"
            />
            <MetricTile
              eyebrow="Clients"
              value={String(stats.totalClients)}
              detail="Current roster"
              icon={Users}
              testId="stat-total-clients"
            />
            <MetricTile
              eyebrow="Earned"
              value={formatMoney(stats.totalRevenue)}
              detail={`${completedBookingCount} completed job${completedBookingCount === 1 ? "" : "s"}`}
              icon={Wallet}
              testId="stat-total-revenue"
            />
          </div>
        ) : null}

        {/* -------- Next event + payment attention -------- */}
        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          {/* ---- Next event card ---- */}
          <section className="crm-section crm-section-hover overflow-hidden">
            <div className="flex flex-col gap-2 border-b border-card-border/70 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="crm-eyebrow">On the books · next</span>
                <h2 className="crm-section-title mt-1">Next scheduled work</h2>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/bookings">
                  Open calendar
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            {upcomingLoading ? (
              <div className="p-6">
                <Skeleton className="h-44 w-full" />
              </div>
            ) : nextUpcomingEvent ? (
              <div className="grid gap-6 p-6 lg:grid-cols-[240px_minmax(0,1fr)]">
                {/* Date plate */}
                <div className="relative rounded-xl border border-card-border/70 bg-accent/40 p-5">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {format(parseISO(nextUpcomingEvent.eventDate), "EEEE")}
                  </div>
                  <div
                    className="mt-4 font-serif text-[3.25rem] leading-[0.95] text-foreground"
                    style={{ fontVariationSettings: "'opsz' 144", letterSpacing: "-0.04em" }}
                  >
                    {format(parseISO(nextUpcomingEvent.eventDate), "d")}
                  </div>
                  <div className="mt-1 text-sm font-medium tracking-tight text-muted-foreground">
                    {format(parseISO(nextUpcomingEvent.eventDate), "MMMM yyyy")}
                  </div>
                  <div className="crm-gold-rule mt-5 w-full" />
                  <div className="mt-4 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    {nextUpcomingEvent.servicesBegin || "Start time TBD"}
                  </div>
                </div>
                {/* Event meta */}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={statusTone(nextUpcomingEvent.bookingStatus ?? "draft")} variant="outline">
                      {nextUpcomingEvent.bookingStatus ?? "draft"}
                    </Badge>
                    <span className="crm-eyebrow !tracking-[0.18em]">{nextUpcomingEvent.eventType ?? "Event"}</span>
                  </div>
                  <h3
                    className="mt-3 truncate font-serif text-[1.875rem] text-foreground"
                    style={{ fontVariationSettings: "'opsz' 96", letterSpacing: "-0.02em" }}
                  >
                    {nextUpcomingEvent.clientName}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">{nextUpcomingEvent.eventName}</p>
                  <div className="mt-5 flex items-start gap-2 text-sm text-foreground/80">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="line-clamp-2">{nextUpcomingEvent.location}</span>
                  </div>
                  <Button asChild className="mt-6">
                    <Link href={`/bookings/${nextUpcomingEvent.bookingId}`}>Open booking</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <EmptyPanel
                icon={CalendarCheck}
                title="No upcoming events"
                detail="Create a booking to populate the schedule."
                actionHref="/bookings/new"
                actionLabel="New booking"
              />
            )}
          </section>

          {/* ---- Payment attention ---- */}
          <section className="crm-section overflow-hidden">
            <div className="border-b border-card-border/70 px-6 py-5">
              <span className="crm-eyebrow">Money · attention</span>
              <h2 className="crm-section-title mt-1">Payment attention</h2>
              <p className="mt-1 text-sm text-muted-foreground">Active bookings awaiting collection.</p>
            </div>
            {bookingsLoading ? (
              <div className="space-y-3 p-6">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : paymentRiskRows.length > 0 ? (
              <ul className="divide-y divide-card-border/60">
                {paymentRiskRows.map((booking) => (
                  <li key={booking.id}>
                    <Link
                      href={`/bookings/${booking.id}`}
                      className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-6 py-3.5 transition-colors hover:bg-accent/35"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-[15px] font-medium text-foreground group-hover:text-primary">
                          {booking.clientName}
                        </div>
                        <div className="mt-0.5 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                          {booking.eventType}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-serif text-base text-foreground tabular-nums" style={{ fontVariationSettings: "'opsz' 48" }}>
                          {formatMoney(booking.grandTotal)}
                        </div>
                        <div className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.12em] text-primary">
                          {paymentLabel(booking)}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyPanel
                icon={HandCoins}
                title="Nothing outstanding"
                detail="All active bookings are paid up for this stage."
              />
            )}
          </section>
        </div>

        {/* -------- Booking mix + revenue mix -------- */}
        <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
          <section className="crm-section p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <span className="crm-eyebrow">Composition</span>
                <h2 className="crm-section-title mt-1">Booking mix</h2>
                <p className="mt-1 text-sm text-muted-foreground">Status distribution across the ledger.</p>
              </div>
              <Badge variant="outline" className="!normal-case !tracking-tight">
                <span className="font-serif text-sm tabular-nums" style={{ fontVariationSettings: "'opsz' 48" }}>{bookingRows.length}</span>
                <span className="text-muted-foreground">total</span>
              </Badge>
            </div>
            {bookingsLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : statusChartData.length > 0 ? (
              <div className="space-y-4">
                {statusChartData.map((entry) => (
                  <div key={entry.key} className="grid grid-cols-[96px_minmax(0,1fr)_38px] items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: STATUS_COLORS[entry.key] || "hsl(28 8% 60%)" }}
                      />
                      <span className="text-[13px] text-foreground">{entry.name}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{
                          width: `${Math.max(8, (entry.value / maxStatusCount) * 100)}%`,
                          backgroundColor: STATUS_COLORS[entry.key] || "hsl(28 8% 60%)",
                        }}
                      />
                    </div>
                    <div className="text-right font-serif text-base text-foreground tabular-nums" style={{ fontVariationSettings: "'opsz' 48" }}>
                      {entry.value}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyPanel icon={CalendarCheck} title="No bookings yet" detail="Create a booking to start tracking status." />
            )}
          </section>

          <section className="crm-section p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <span className="crm-eyebrow">Revenue · by category</span>
                <h2 className="crm-section-title mt-1">Revenue by event type</h2>
                <p className="mt-1 text-sm text-muted-foreground">Contract value grouped by category.</p>
              </div>
              <TrendingUp className="mt-1 h-4 w-4 text-muted-foreground" />
            </div>
            {bookingsLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : revenueByTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={revenueByTypeData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", letterSpacing: "0.04em" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(v: number) => [formatMoney(v), "Revenue"]}
                    cursor={{ fill: "hsl(var(--accent) / 0.35)" }}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid hsl(var(--card-border))",
                      background: "hsl(var(--card))",
                      boxShadow: "0 18px 40px -18px var(--elevate-3)",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyPanel icon={TrendingUp} title="No revenue data" detail="Revenue appears once bookings have totals." />
            )}
          </section>
        </div>

        {/* -------- Full ledger -------- */}
        <section className="crm-section overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-card-border/70 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="crm-eyebrow">All books · ledger</span>
              <h2 className="crm-section-title mt-1">Booking ledger</h2>
              <p className="mt-1 text-sm text-muted-foreground">Complete booking history with money and payment state.</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/bookings">
                Open bookings
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          {bookingsLoading ? (
            <div className="space-y-2 p-6">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : bookingRows.length > 0 ? (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-card-border/70">
                      <th className="px-6 py-3 text-left crm-eyebrow !tracking-[0.16em]">Client</th>
                      <th className="px-4 py-3 text-left crm-eyebrow !tracking-[0.16em]">Type</th>
                      <th className="px-4 py-3 text-left crm-eyebrow !tracking-[0.16em]">Date</th>
                      <th className="px-4 py-3 text-left crm-eyebrow !tracking-[0.16em]">Status</th>
                      <th className="px-4 py-3 text-right crm-eyebrow !tracking-[0.16em]">Total</th>
                      <th className="px-4 py-3 text-left crm-eyebrow !tracking-[0.16em]">Payment</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-card-border/50">
                    {bookingRows.map(b => (
                      <tr key={b.id} className="group transition-colors hover:bg-accent/30">
                        <td className="px-6 py-4 font-medium text-foreground">{b.clientName}</td>
                        <td className="px-4 py-4 text-muted-foreground">{b.eventType}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-muted-foreground">{formatDate(b.firstServiceDate)}</td>
                        <td className="px-4 py-4">
                          <Badge className={statusTone(b.status)} variant="outline">{b.status}</Badge>
                        </td>
                        <td
                          className="px-4 py-4 text-right font-serif text-base text-foreground tabular-nums"
                          style={{ fontVariationSettings: "'opsz' 48" }}
                        >
                          {formatMoney(b.grandTotal)}
                        </td>
                        <td className="px-4 py-4">
                          {b.balancePaid ? (
                            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">
                              Paid
                            </span>
                          ) : b.retainerPaid ? (
                            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                              Balance due
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-600 dark:text-amber-400">
                              <AlertCircle className="h-3 w-3" /> Retainer due
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <Link
                            href={`/bookings/${b.id}`}
                            className="text-[12px] font-medium uppercase tracking-[0.14em] text-primary opacity-70 transition-opacity hover:opacity-100"
                          >
                            Open →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile list */}
              <div className="divide-y divide-card-border/50 sm:hidden">
                {bookingRows.map((b) => (
                  <Link key={b.id} href={`/bookings/${b.id}`} className="block px-5 py-4 active:bg-muted/40">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">{b.clientName}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                          {b.eventType} · {formatDate(b.firstServiceDate)}
                        </div>
                      </div>
                      <div
                        className="shrink-0 text-right font-serif text-base text-foreground tabular-nums"
                        style={{ fontVariationSettings: "'opsz' 48" }}
                      >
                        {formatMoney(b.grandTotal)}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <Badge className={statusTone(b.status)} variant="outline">{b.status}</Badge>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">{paymentLabel(b)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <EmptyPanel
              icon={CalendarCheck}
              title="No bookings yet"
              detail="Create the first booking to begin tracking schedule and payments."
              actionHref="/bookings/new"
              actionLabel="Create booking"
            />
          )}
        </section>
      </div>
    </Shell>
  );
}

/* ------------------------------------------------------------------------ *
 * Metric tile — editorial stat card.                                       *
 * Eyebrow label, large serif number, soft detail line.                      *
 * ------------------------------------------------------------------------ */
function MetricTile({
  eyebrow,
  value,
  detail,
  icon: Icon,
  testId,
  emphasis = false,
}: {
  eyebrow: string;
  value: string;
  detail: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  testId: string;
  emphasis?: boolean;
}) {
  return (
    <div
      data-testid={testId}
      className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 ease-out
        ${emphasis
          ? "border-primary/20 bg-[linear-gradient(155deg,hsl(var(--accent)/0.6)_0%,hsl(var(--card))_55%)]"
          : "border-card-border bg-card"
        }
        shadow-[0_1px_0_0_hsl(var(--card-border)/0.4),0_14px_36px_-26px_var(--elevate-3)]
        hover:-translate-y-px hover:shadow-[0_1px_0_0_hsl(var(--primary)/0.15),0_22px_46px_-28px_var(--elevate-3)]`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="crm-eyebrow">{eyebrow}</span>
        <Icon
          className={`h-4 w-4 shrink-0 ${emphasis ? "text-primary" : "text-muted-foreground"}`}
          strokeWidth={1.5}
        />
      </div>
      <div
        className="mt-4 font-serif text-[2.25rem] leading-none text-foreground tabular-nums"
        style={{ fontVariationSettings: "'opsz' 144", letterSpacing: "-0.03em" }}
      >
        {value}
      </div>
      <div className="mt-2 text-[12.5px] text-muted-foreground">{detail}</div>
      {emphasis && (
        <span
          aria-hidden
          className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-[hsl(var(--gold)/0.12)] blur-2xl"
        />
      )}
    </div>
  );
}

function NextActionIcon({ kind }: { kind: string }) {
  switch (kind) {
    case "retainer_due":
    case "balance_due":
      return <HandCoins className="h-4 w-4" strokeWidth={1.5} />;
    case "day_before_confirm":
      return <CalendarCheck className="h-4 w-4" strokeWidth={1.5} />;
    case "unsigned_contract":
      return <PenLine className="h-4 w-4" strokeWidth={1.5} />;
    case "new_lead":
      return <Inbox className="h-4 w-4" strokeWidth={1.5} />;
    default:
      return <Send className="h-4 w-4" strokeWidth={1.5} />;
  }
}

function nextActionMeta(kind: string): { eyebrow: string; action: string } {
  switch (kind) {
    case "retainer_due":
      return { eyebrow: "Money · Retainer", action: "Send request" };
    case "balance_due":
      return { eyebrow: "Money · Balance", action: "Send request" };
    case "day_before_confirm":
      return { eyebrow: "Today · Confirm", action: "Send confirm" };
    case "unsigned_contract":
      return { eyebrow: "Contract · Unsigned", action: "Share portal" };
    case "new_lead":
      return { eyebrow: "Lead · New", action: "Review" };
    default:
      return { eyebrow: "Action", action: "Open" };
  }
}

/* ------------------------------------------------------------------------ *
 * Empty state panel — calm, editorial.                                     *
 * ------------------------------------------------------------------------ */
function EmptyPanel({
  icon: Icon,
  title,
  detail,
  actionHref,
  actionLabel,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  detail: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center px-8 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-card-border bg-accent/50 text-foreground/70">
        <Icon className="h-5 w-5" strokeWidth={1.5} />
      </div>
      <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{detail}</p>
      {actionHref && actionLabel && (
        <Button asChild className="mt-5" size="sm">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      )}
    </div>
  );
}
