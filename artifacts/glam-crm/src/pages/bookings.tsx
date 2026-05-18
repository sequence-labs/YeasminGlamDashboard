import { Shell } from "@/components/layout/Shell";
import { getListBookingsQueryKey, useListBookings, usePermanentlyDeleteBooking, useRestoreBooking } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Plus, Search, Calendar, FileText, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const statusOptions = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function Bookings() {
  const [showDeleted, setShowDeleted] = useState(false);
  const { data: bookings, isLoading } = useListBookings({ includeDeleted: showDeleted });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const restoreBooking = useRestoreBooking();
  const permanentlyDeleteBooking = usePermanentlyDeleteBooking();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredBookings = bookings?.filter(b => {
    const matchesDeletedView = showDeleted ? !!b.deletedAt : !b.deletedAt;
    const matchesSearch = b.clientName.toLowerCase().includes(search.toLowerCase()) ||
                          b.eventType.toLowerCase().includes(search.toLowerCase()) ||
                          b.location.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    return matchesDeletedView && matchesSearch && matchesStatus;
  });

  function refreshBookingLists() {
    queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey({ includeDeleted: true }) });
  }

  function handleRestore(id: number) {
    restoreBooking.mutate({ id }, {
      onSuccess: () => {
        refreshBookingLists();
        toast({ title: "Booking restored" });
      },
      onError: () => toast({ title: "Failed to restore booking", variant: "destructive" }),
    });
  }

  function handlePermanentDelete(id: number) {
    if (!confirm("Permanently delete this booking? This cannot be undone.")) return;
    permanentlyDeleteBooking.mutate({ id }, {
      onSuccess: () => {
        refreshBookingLists();
        toast({ title: "Booking permanently deleted" });
      },
      onError: () => toast({ title: "Failed to permanently delete booking", variant: "destructive" }),
    });
  }

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif text-foreground">Bookings</h1>
            <p className="text-muted-foreground mt-1">Manage your events, trials, and upcoming jobs.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant={showDeleted ? "default" : "outline"}
              onClick={() => setShowDeleted(!showDeleted)}
              data-testid="btn-toggle-deleted-bookings"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {showDeleted ? "Viewing Deleted" : "Deleted Bookings"}
            </Button>
            <Link
              href="/bookings/new"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
              data-testid="btn-new-booking"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Booking
            </Link>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-3 sm:p-4 shadow-sm">
          <div className="grid gap-4">
            <label className="min-w-0">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Search</span>
              <div className="mt-1.5 flex min-h-10 items-center rounded-md border bg-background px-3 focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent">
                <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by client, event, or location..."
                  className="min-w-0 flex-1 bg-transparent p-0 text-sm outline-none placeholder:text-muted-foreground"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  data-testid="input-search-bookings"
                />
              </div>
            </label>

            <div className="min-w-0">
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Status
              </div>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setStatusFilter(value)}
                    aria-pressed={statusFilter === value}
                    className={`min-h-9 rounded-full px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                      statusFilter === value
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                    data-testid={`filter-status-${value}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : filteredBookings && filteredBookings.length > 0 ? (
            <div className="divide-y divide-border">
              {filteredBookings.map(booking => {
                const content = (
                  <>
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
                        {booking.deletedAt && (
                          <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-sm bg-red-100 text-red-800">
                            Deleted
                          </span>
                        )}
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
                    {booking.deletedAt ? (
                      <div className="mt-2 flex flex-wrap gap-2 sm:justify-end">
                        <Button size="sm" variant="outline" onClick={() => handleRestore(booking.id)} disabled={restoreBooking.isPending} data-testid={`btn-restore-booking-${booking.id}`}>
                          <RotateCcw className="w-3.5 h-3.5 mr-1" />
                          Restore
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handlePermanentDelete(booking.id)} disabled={permanentlyDeleteBooking.isPending} data-testid={`btn-permanent-delete-booking-${booking.id}`}>
                          Delete Forever
                        </Button>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground flex items-center sm:justify-end gap-1 mt-1">
                        {booking.balancePaid ? (
                          <span className="text-green-600 dark:text-green-400 font-medium">Paid in full</span>
                        ) : booking.retainerPaid ? (
                          <span>Retainer paid</span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">Payment pending</span>
                        )}
                      </div>
                    )}
                  </div>
                  </>
                );

                return booking.deletedAt ? (
                  <div
                    key={booking.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between bg-muted/20"
                    data-testid={`deleted-booking-${booking.id}`}
                  >
                    {content}
                  </div>
                ) : (
                  <Link
                    key={booking.id}
                    href={`/bookings/${booking.id}`}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-muted/50 transition-colors block group"
                    data-testid={`link-booking-${booking.id}`}
                  >
                    {content}
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="p-16 text-center text-muted-foreground flex flex-col items-center">
              <FileText className="w-12 h-12 mb-4 opacity-20" />
              <h3 className="text-lg font-medium text-foreground mb-1">No bookings found</h3>
              <p className="max-w-sm mb-6">
                {search || statusFilter !== "all"
                  ? "No bookings match your current filters."
                  : showDeleted
                    ? "There are no deleted bookings to recover."
                    : "You haven't created any bookings yet."}
              </p>
              {!showDeleted && !search && statusFilter === "all" && (
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
