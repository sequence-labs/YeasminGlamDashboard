import { Shell } from "@/components/layout/Shell";
import { useListBookings } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Plus, Search, Calendar, FileText } from "lucide-react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";

export default function Bookings() {
  const { data: bookings, isLoading } = useListBookings();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredBookings = bookings?.filter(b => {
    const matchesSearch = b.clientName.toLowerCase().includes(search.toLowerCase()) ||
                          b.eventType.toLowerCase().includes(search.toLowerCase()) ||
                          b.location.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif text-foreground">Bookings</h1>
            <p className="text-muted-foreground mt-1">Manage your events, trials, and upcoming jobs.</p>
          </div>
          <Link
            href="/bookings/new"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            data-testid="btn-new-booking"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Booking
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center bg-card border rounded-md px-3 py-2 w-full sm:max-w-sm focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent">
            <Search className="w-4 h-4 text-muted-foreground mr-2" />
            <input
              type="text"
              placeholder="Search by client, event, or location..."
              className="flex-1 bg-transparent border-none outline-none focus:ring-0 p-0 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search-bookings"
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
            {["all", "draft", "active", "completed", "cancelled"].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap capitalize transition-colors ${
                  statusFilter === status
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-muted border border-border"
                }`}
                data-testid={`filter-status-${status}`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : filteredBookings && filteredBookings.length > 0 ? (
            <div className="divide-y divide-border">
              {filteredBookings.map(booking => (
                <Link
                  key={booking.id}
                  href={`/bookings/${booking.id}`}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-muted/50 transition-colors block group"
                  data-testid={`link-booking-${booking.id}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-accent/50 text-accent-foreground flex flex-col items-center justify-center font-serif flex-shrink-0 border border-accent">
                      {booking.firstServiceDate ? (
                        <>
                          <span className="text-xs font-sans uppercase leading-none opacity-80">{format(parseISO(booking.firstServiceDate), "MMM")}</span>
                          <span className="text-lg leading-none mt-1">{format(parseISO(booking.firstServiceDate), "d")}</span>
                        </>
                      ) : (
                        <Calendar className="w-5 h-5 opacity-50" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-foreground text-base group-hover:text-primary transition-colors">{booking.clientName}</h3>
                        <span className={`px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-sm ${
                          booking.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                          booking.status === 'active' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                          booking.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                        }`}>
                          {booking.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <span>{booking.eventType}</span>
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/30"></span>
                        <span className="truncate max-w-[200px] sm:max-w-[300px]">{booking.location}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 sm:mt-0 text-left sm:text-right pl-16 sm:pl-0">
                    <div className="font-serif text-lg">${booking.grandTotal.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground flex items-center sm:justify-end gap-1 mt-1">
                      {booking.balancePaid ? (
                        <span className="text-green-600 dark:text-green-400 font-medium">Paid in full</span>
                      ) : booking.retainerPaid ? (
                        <span>Retainer paid</span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 font-medium">Payment pending</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-16 text-center text-muted-foreground flex flex-col items-center">
              <FileText className="w-12 h-12 mb-4 opacity-20" />
              <h3 className="text-lg font-medium text-foreground mb-1">No bookings found</h3>
              <p className="max-w-sm mb-6">
                {search || statusFilter !== "all"
                  ? "No bookings match your current filters."
                  : "You haven't created any bookings yet."}
              </p>
              {!search && statusFilter === "all" && (
                <Link
                  href="/bookings/new"
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4"
                  data-testid="btn-add-booking-empty"
                >
                  Create your first booking
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
