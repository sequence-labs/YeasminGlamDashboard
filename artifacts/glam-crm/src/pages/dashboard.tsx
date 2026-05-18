import { Shell } from "@/components/layout/Shell";
import {
  useGetDashboardStats,
  useGetUpcomingEvents,
  useListBookings,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, CalendarCheck, Wallet, HandCoins, Clock, MapPin, TrendingUp, AlertCircle } from "lucide-react";
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
  PieChart,
  Pie,
  Cell,
  Legend,
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

  const paymentSummary = useMemo(() => {
    if (!bookings) return { retainerPending: 0, balancePending: 0, paidInFull: 0 };
    const active = bookings.filter(b => b.status === "active");
    return {
      retainerPending: active.filter(b => !b.retainerPaid).length,
      balancePending: active.filter(b => b.retainerPaid && !b.balancePaid).length,
      paidInFull: active.filter(b => b.balancePaid).length,
    };
  }, [bookings]);

  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Overview of your bookings, revenue, and upcoming schedule.</p>
        </div>

        {/* Stat Cards */}
        {statsLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 w-full" />)}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Active Bookings" value={stats.activeBookings} sub="In progress" icon={CalendarCheck} color="blue" testId="stat-active-bookings" />
            <StatCard title="Pending Revenue" value={`$${stats.pendingRevenue.toLocaleString()}`} sub="From active bookings" icon={HandCoins} color="amber" testId="stat-pending-revenue" />
            <StatCard title="Total Clients" value={stats.totalClients} sub="On your roster" icon={Users} color="purple" testId="stat-total-clients" />
            <StatCard title="Total Earned" value={`$${stats.totalRevenue.toLocaleString()}`} sub="From completed jobs" icon={Wallet} color="green" testId="stat-total-revenue" />
          </div>
        ) : null}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Status Distribution */}
          <div className="bg-card border rounded-lg p-5">
            <div className="mb-4">
              <h2 className="font-semibold text-foreground">Booking Status</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Distribution across all bookings</p>
            </div>
            {bookingsLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : statusChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusChartData.map((entry) => (
                      <Cell key={entry.key} fill={STATUS_COLORS[entry.key] || "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v} booking${v !== 1 ? "s" : ""}`, ""]} />
                  <Legend iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No bookings yet</div>
            )}
          </div>

          {/* Revenue by Event Type */}
          <div className="bg-card border rounded-lg p-5 lg:col-span-2">
            <div className="mb-4">
              <h2 className="font-semibold text-foreground">Revenue by Event Type</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Total contract value grouped by event category</p>
            </div>
            {bookingsLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : revenueByTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={revenueByTypeData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]} cursor={{ fill: "hsl(var(--muted))" }} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No revenue data yet</div>
            )}
          </div>
        </div>

        {/* Payment Alerts + Upcoming Events */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Payment Status */}
          <div className="bg-card border rounded-lg p-5 space-y-3">
            <div>
              <h2 className="font-semibold text-foreground">Payment Status</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Active bookings requiring action</p>
            </div>
            {bookingsLoading ? (
              <div className="space-y-2"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>
            ) : (
              <div className="space-y-2">
                <PaymentStatusRow
                  label="Retainer Not Collected"
                  count={paymentSummary.retainerPending}
                  color="amber"
                  urgent={paymentSummary.retainerPending > 0}
                />
                <PaymentStatusRow
                  label="Balance Pending"
                  count={paymentSummary.balancePending}
                  color="blue"
                  urgent={false}
                />
                <PaymentStatusRow
                  label="Paid in Full"
                  count={paymentSummary.paidInFull}
                  color="green"
                  urgent={false}
                />
              </div>
            )}

            {!bookingsLoading && bookings && bookings.length > 0 && (
              <div className="pt-2 border-t">
                <div className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">All Bookings</div>
                <div className="space-y-1">
                  {bookings.slice(0, 5).map(b => (
                    <Link
                      key={b.id}
                      href={`/bookings/${b.id}`}
                      className="flex items-center justify-between text-sm py-1 hover:text-primary transition-colors"
                    >
                      <span className="truncate text-foreground">{b.clientName}</span>
                      <span className={`text-xs ml-2 px-1.5 py-0.5 rounded font-medium shrink-0 ${
                        b.status === "completed" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                        b.status === "active" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                        b.status === "cancelled" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                        "bg-muted text-muted-foreground"
                      }`}>{b.status}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Upcoming Events */}
          <div className="lg:col-span-2 bg-card border rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-foreground">Upcoming Events</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Next 90 days</p>
              </div>
              <Link href="/bookings" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                View all →
              </Link>
            </div>
            {upcomingLoading ? (
              <div className="p-5 space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : upcomingEvents && upcomingEvents.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Client / Event</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Start Time</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Location</th>
                      <th className="px-4 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {upcomingEvents.map(event => (
                      <tr key={event.eventId} className="hover:bg-muted/30 transition-colors" data-testid={`upcoming-event-${event.eventId}`}>
                        <td className="px-5 py-3">
                          <div className="font-medium text-foreground">{event.clientName}</div>
                          <div className="text-xs text-muted-foreground">{event.eventName} · {event.eventType}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-foreground">
                          {format(parseISO(event.eventDate), "MMM d, yyyy")}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {event.servicesBegin || "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground truncate max-w-[160px]">
                          {event.location}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/bookings/${event.bookingId}`}
                            className="text-xs font-medium text-primary hover:underline whitespace-nowrap"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-10 text-center text-muted-foreground">
                <CalendarCheck className="w-8 h-8 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No upcoming events in the next 90 days.</p>
              </div>
            )}
          </div>
        </div>

        {/* All Bookings Table */}
        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-foreground">All Bookings</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Complete booking history</p>
            </div>
            <Link href="/bookings/new" className="text-xs font-semibold bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors">
              + New Booking
            </Link>
          </div>
          {bookingsLoading ? (
            <div className="p-5 space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : bookings && bookings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Client</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Event Type</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Payment</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {bookings.map(b => (
                    <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3 font-medium text-foreground">{b.clientName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{b.eventType}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {b.firstServiceDate ? format(parseISO(b.firstServiceDate), "MMM d, yyyy") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold capitalize ${
                          b.status === "completed" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                          b.status === "active" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                          b.status === "cancelled" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                          "bg-muted text-muted-foreground"
                        }`}>{b.status}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground">${b.grandTotal.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        {b.balancePaid ? (
                          <span className="text-green-600 dark:text-green-400 text-xs font-medium">Paid in full</span>
                        ) : b.retainerPaid ? (
                          <span className="text-blue-600 dark:text-blue-400 text-xs font-medium">Retainer paid</span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 text-xs font-medium flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/bookings/${b.id}`} className="text-xs font-medium text-primary hover:underline">View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-10 text-center text-muted-foreground">
              <p className="text-sm mb-3">No bookings yet.</p>
              <Link href="/bookings/new" className="text-xs font-medium text-primary hover:underline">Create your first booking →</Link>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}

function StatCard({
  title, value, sub, icon: Icon, color, testId,
}: {
  title: string;
  value: string | number;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  color: "blue" | "green" | "amber" | "purple";
  testId: string;
}) {
  const iconBg: Record<string, string> = {
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    green: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    purple: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  };
  return (
    <div data-testid={testId} className="bg-card border rounded-lg p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconBg[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</div>
        <div className="text-2xl font-bold text-foreground mt-0.5">{value}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
      </div>
    </div>
  );
}

function PaymentStatusRow({ label, count, color, urgent }: { label: string; count: number; color: string; urgent: boolean }) {
  const colors: Record<string, string> = {
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  };
  return (
    <div className={`flex items-center justify-between px-3 py-2.5 rounded-md border ${urgent && count > 0 ? "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/10" : "border-border bg-muted/30"}`}>
      <span className="text-sm text-foreground">{label}</span>
      <span className={`text-sm font-bold px-2 py-0.5 rounded ${colors[color]}`}>{count}</span>
    </div>
  );
}
