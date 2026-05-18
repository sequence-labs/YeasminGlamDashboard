import { Shell } from "@/components/layout/Shell";
import { useGetDashboardStats, useGetUpcomingEvents, useGetRecentBookings } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, CalendarCheck, Wallet, HandCoins, ArrowRight, Clock, MapPin } from "lucide-react";
import { Link } from "wouter";
import { format, parseISO } from "date-fns";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: upcomingEvents, isLoading: upcomingLoading } = useGetUpcomingEvents();
  const { data: recentBookings, isLoading: recentLoading } = useGetRecentBookings();

  return (
    <Shell>
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-serif text-foreground">Welcome back, Yeasmin.</h1>
          <p className="text-muted-foreground mt-1 text-sm">Here's what's happening with your business today.</p>
        </header>

        {statsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-28 w-full rounded-md" />
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Active Bookings"
              value={stats.activeBookings}
              icon={CalendarCheck}
              testId="stat-active-bookings"
            />
            <StatCard
              title="Pending Revenue"
              value={`$${stats.pendingRevenue.toLocaleString()}`}
              icon={HandCoins}
              testId="stat-pending-revenue"
            />
            <StatCard
              title="Total Clients"
              value={stats.totalClients}
              icon={Users}
              testId="stat-total-clients"
            />
            <StatCard
              title="Total Revenue"
              value={`$${stats.totalRevenue.toLocaleString()}`}
              icon={Wallet}
              testId="stat-total-revenue"
            />
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-serif">Upcoming Events</h2>
              <Link
                href="/bookings"
                className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
                data-testid="link-all-bookings"
              >
                All Bookings <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="bg-card border rounded-lg overflow-hidden">
              {upcomingLoading ? (
                <div className="p-4 space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : upcomingEvents && upcomingEvents.length > 0 ? (
                <div className="divide-y divide-border">
                  {upcomingEvents.map(event => (
                    <div key={event.eventId} className="p-4 flex justify-between items-center hover:bg-muted/50 transition-colors" data-testid={`upcoming-event-${event.eventId}`}>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{event.clientName} - {event.eventName}</span>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(parseISO(event.eventDate), "MMM d, yyyy")}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {event.location}</span>
                        </div>
                      </div>
                      <Link
                        href={`/bookings/${event.bookingId}`}
                        className="px-3 py-1.5 text-xs font-medium border rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                        data-testid={`link-booking-${event.bookingId}`}
                      >
                        View
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <CalendarCheck className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  <p>No upcoming events.</p>
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-serif">Recent Bookings</h2>
            </div>

            <div className="bg-card border rounded-lg overflow-hidden">
              {recentLoading ? (
                <div className="p-4 space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : recentBookings && recentBookings.length > 0 ? (
                <div className="divide-y divide-border">
                  {recentBookings.map(booking => (
                    <div key={booking.id} className="p-4 flex justify-between items-center hover:bg-muted/50 transition-colors" data-testid={`recent-booking-${booking.id}`}>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{booking.clientName} <span className="text-muted-foreground font-normal text-sm">• {booking.eventType}</span></span>
                        <span className="text-sm text-muted-foreground mt-1">{format(parseISO(booking.createdAt), "MMM d, yyyy")}</span>
                      </div>
                      <Link
                        href={`/bookings/${booking.id}`}
                        className="px-3 py-1.5 text-xs font-medium border rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                        data-testid={`link-recent-booking-${booking.id}`}
                      >
                        View
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <p>No recent bookings.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </Shell>
  );
}

function StatCard({ title, value, icon: Icon, testId }: { title: string; value: string | number; icon: React.ComponentType<{ className?: string }>; testId: string }) {
  return (
    <div data-testid={testId} className="p-6 bg-card border rounded-lg flex flex-col gap-2 shadow-sm">
      <div className="flex items-center justify-between text-muted-foreground">
        <h3 className="text-xs font-medium uppercase tracking-wider">{title}</h3>
        <Icon className="w-4 h-4 opacity-50" />
      </div>
      <p className="text-2xl font-serif text-foreground">{value}</p>
    </div>
  );
}
