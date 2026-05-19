import { Shell } from "@/components/layout/Shell";
import {
  useGetDashboardStats,
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
  ListChecks,
  MapPin,
  Plus,
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

const STATUS_COLORS: Record<string, string> = {
  active: "#3b82f6",
  completed: "#22c55e",
  draft: "#94a3b8",
  cancelled: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  completed: "Completed",
  draft: "Draft",
  cancelled: "Cancelled",
};

function formatMoney(value: number) {
  return `$${value.toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })}`;
}

function formatDate(value?: string | null) {
  return value ? format(parseISO(value), "MMM d") : "TBD";
}

function statusTone(status: string) {
  if (status === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-300";
  if (status === "active") return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-300";
  if (status === "cancelled") return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300";
  return "border-border bg-muted text-muted-foreground";
}

function paymentLabel(booking: { retainerPaid: boolean; balancePaid: boolean }) {
  if (booking.balancePaid) return "Paid";
  if (booking.retainerPaid) return "Balance due";
  return "Retainer due";
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: upcomingEvents, isLoading: upcomingLoading } = useGetUpcomingEvents();
  const { data: bookings, isLoading: bookingsLoading } = useListBookings();

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
  const completedBookingCount = stats?.completedBookings ?? bookingRows.filter((booking) => booking.status === "completed").length;
  const maxStatusCount = Math.max(...statusChartData.map((entry) => entry.value), 1);

  return (
    <Shell>
      <div className="space-y-4 sm:space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Studio command center</p>
            <h1 className="mt-1 font-sans text-2xl font-semibold tracking-normal text-foreground sm:text-3xl">Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Money, schedule, and booking health in one working view.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/bookings">
                <ListChecks className="w-4 h-4" />
                Bookings
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/bookings/new">
                <Plus className="w-4 h-4" />
                New Booking
              </Link>
            </Button>
          </div>
        </div>

        {statsLoading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1fr_1fr]">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1fr_1fr]">
            <MetricTile
              title="Open pipeline"
              value={formatMoney(openPipelineValue || stats.pendingRevenue)}
              detail={`${stats.activeBookings} active booking${stats.activeBookings === 1 ? "" : "s"}`}
              icon={HandCoins}
              testId="stat-pending-revenue"
              emphasis
            />
            <MetricTile
              title="Retainers due"
              value={stats.retainersPending}
              detail={`${stats.balancesPending} balance${stats.balancesPending === 1 ? "" : "s"} pending`}
              icon={AlertCircle}
              testId="stat-active-bookings"
            />
            <MetricTile
              title="Clients"
              value={stats.totalClients}
              detail="Current roster"
              icon={Users}
              testId="stat-total-clients"
            />
            <MetricTile
              title="Earned"
              value={formatMoney(stats.totalRevenue)}
              detail={`${completedBookingCount} completed job${completedBookingCount === 1 ? "" : "s"}`}
              icon={Wallet}
              testId="stat-total-revenue"
            />
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="crm-section overflow-hidden">
            <div className="border-b border-card-border px-5 py-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-sans text-lg font-semibold tracking-normal text-foreground">Next scheduled work</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Closest event in the next 90 days.</p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href="/bookings">
                    View Calendar
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </div>
            {upcomingLoading ? (
              <div className="p-5">
                <Skeleton className="h-36 w-full" />
              </div>
            ) : nextUpcomingEvent ? (
              <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div className="rounded-lg border border-border bg-muted/30 p-4 sm:p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <CalendarDays className="w-4 h-4" />
                    {format(parseISO(nextUpcomingEvent.eventDate), "EEEE")}
                  </div>
                  <div className="mt-3 font-mono text-3xl font-semibold tracking-normal text-foreground sm:mt-4 sm:text-4xl">
                    {formatDate(nextUpcomingEvent.eventDate)}
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {nextUpcomingEvent.servicesBegin || "Start time TBD"}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={statusTone(nextUpcomingEvent.bookingStatus ?? "draft")} variant="outline">
                      {nextUpcomingEvent.bookingStatus ?? "draft"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{nextUpcomingEvent.eventType ?? "Event"}</span>
                  </div>
                  <h3 className="mt-3 truncate font-sans text-xl font-semibold tracking-normal text-foreground sm:text-2xl">
                    {nextUpcomingEvent.clientName}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">{nextUpcomingEvent.eventName}</p>
                  <div className="mt-5 flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 w-4 h-4 shrink-0" />
                    <span className="line-clamp-2">{nextUpcomingEvent.location}</span>
                  </div>
                  <Button asChild className="mt-5" size="sm">
                    <Link href={`/bookings/${nextUpcomingEvent.bookingId}`}>Open Booking</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <EmptyPanel
                icon={CalendarCheck}
                title="No upcoming events"
                detail="Create a booking to populate the schedule."
                actionHref="/bookings/new"
                actionLabel="New Booking"
              />
            )}
          </section>

          <section className="crm-section overflow-hidden">
            <div className="border-b border-card-border px-5 py-4">
              <h2 className="font-sans text-lg font-semibold tracking-normal text-foreground">Payment attention</h2>
              <p className="mt-1 text-sm text-muted-foreground">Active bookings that still need money collected.</p>
            </div>
            {bookingsLoading ? (
              <div className="space-y-3 p-5">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : paymentRiskRows.length > 0 ? (
              <div className="divide-y divide-border">
                {paymentRiskRows.map((booking) => (
                  <Link
                    key={booking.id}
                    href={`/bookings/${booking.id}`}
                    className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-5 py-3 transition-colors hover:bg-muted/35"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-foreground">{booking.clientName}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{booking.eventType}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm font-semibold text-foreground">{formatMoney(booking.grandTotal)}</div>
                      <div className="mt-0.5 text-xs font-medium text-primary">{paymentLabel(booking)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyPanel
                icon={HandCoins}
                title="No payment issues"
                detail="Active bookings are paid up for the current stage."
              />
            )}
          </section>
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <section className="crm-section p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-sans text-lg font-semibold tracking-normal text-foreground">Booking mix</h2>
                <p className="mt-1 text-sm text-muted-foreground">Status distribution across the full ledger.</p>
              </div>
              <Badge variant="outline">{bookingRows.length} total</Badge>
            </div>
            {bookingsLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : statusChartData.length > 0 ? (
              <div className="space-y-3">
                {statusChartData.map((entry) => (
                  <div key={entry.key} className="grid grid-cols-[92px_minmax(0,1fr)_32px] items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: STATUS_COLORS[entry.key] || "#94a3b8" }}
                      />
                      <span>{entry.name}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(8, (entry.value / maxStatusCount) * 100)}%`,
                          backgroundColor: STATUS_COLORS[entry.key] || "#94a3b8",
                        }}
                      />
                    </div>
                    <div className="text-right font-mono text-sm font-semibold text-foreground">{entry.value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyPanel icon={CalendarCheck} title="No bookings yet" detail="Create a booking to start tracking status." />
            )}
          </section>

          <section className="crm-section p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-sans text-lg font-semibold tracking-normal text-foreground">Revenue by event type</h2>
                <p className="mt-1 text-sm text-muted-foreground">Contract value grouped by category.</p>
              </div>
              <TrendingUp className="mt-1 w-4 h-4 text-muted-foreground" />
            </div>
            {bookingsLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : revenueByTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={revenueByTypeData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [formatMoney(v), "Revenue"]} cursor={{ fill: "hsl(var(--muted))" }} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyPanel icon={TrendingUp} title="No revenue data" detail="Revenue appears when bookings have totals." />
            )}
          </section>
        </div>

        <section className="crm-section overflow-hidden">
          <div className="border-b border-card-border px-5 py-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-sans text-lg font-semibold tracking-normal text-foreground">Booking ledger</h2>
                <p className="mt-1 text-sm text-muted-foreground">Complete booking history with money and payment state.</p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/bookings">
                  Open Bookings
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
          {bookingsLoading ? (
            <div className="p-4 space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : bookingRows.length > 0 ? (
            <>
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/35">
                      <th className="text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Client</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Type</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Date</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Status</th>
                      <th className="text-right px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Total</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Payment</th>
                      <th className="px-4 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {bookingRows.map(b => (
                      <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3 font-medium text-foreground">{b.clientName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{b.eventType}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {formatDate(b.firstServiceDate)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={statusTone(b.status)} variant="outline">{b.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-foreground">{formatMoney(b.grandTotal)}</td>
                        <td className="px-4 py-3">
                          {b.balancePaid ? (
                            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Paid</span>
                          ) : b.retainerPaid ? (
                            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Balance due</span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                              <AlertCircle className="w-3 h-3" /> Retainer due
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/bookings/${b.id}`} className="text-xs font-medium text-primary hover:underline">Open</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="divide-y divide-border sm:hidden">
                {bookingRows.map((b) => (
                  <Link key={b.id} href={`/bookings/${b.id}`} className="block px-4 py-4 active:bg-muted/40">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">{b.clientName}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{b.eventType} · {formatDate(b.firstServiceDate)}</div>
                      </div>
                      <div className="shrink-0 text-right font-mono text-sm font-semibold text-foreground">{formatMoney(b.grandTotal)}</div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <Badge className={statusTone(b.status)} variant="outline">{b.status}</Badge>
                      <span className="text-xs font-medium text-primary">{paymentLabel(b)}</span>
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
              actionLabel="Create Booking"
            />
          )}
        </section>
      </div>
    </Shell>
  );
}

function MetricTile({
  title, value, detail, icon: Icon, testId, emphasis = false,
}: {
  title: string;
  value: string | number;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  testId: string;
  emphasis?: boolean;
}) {
  return (
    <div
      data-testid={testId}
      className={`rounded-lg border p-3 transition-colors sm:p-4 ${
        emphasis ? "border-primary/25 bg-primary/10" : "border-border bg-card"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</div>
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
      <div className="mt-3 font-mono text-xl font-semibold tracking-normal text-foreground sm:text-2xl">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
    </div>
  );
}

function EmptyPanel({
  icon: Icon,
  title,
  detail,
  actionHref,
  actionLabel,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  detail: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex min-h-[160px] flex-col items-center justify-center px-6 py-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/30 text-muted-foreground">
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="mt-3 font-sans text-sm font-semibold tracking-normal text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{detail}</p>
      {actionHref && actionLabel && (
        <Button asChild className="mt-4" size="sm">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      )}
    </div>
  );
}
