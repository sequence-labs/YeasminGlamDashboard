import { Shell } from "@/components/layout/Shell";
import {
  getListBookingsQueryKey,
  useListBookings,
  usePermanentlyDeleteBooking,
  useRestoreBooking,
  useUpdateBooking,
  type Booking,
} from "@workspace/api-client-react";
import { Link } from "wouter";
import { Plus, Search, Calendar, FileText, RotateCcw, Trash2, MapPin, Columns3, List } from "lucide-react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

type LifecycleStage =
  | "lead"
  | "trial_scheduled"
  | "trial_complete"
  | "contract_sent"
  | "signed"
  | "active"
  | "completed";

const LIFECYCLE_COLUMNS: { value: LifecycleStage; label: string }[] = [
  { value: "lead", label: "Lead" },
  { value: "trial_scheduled", label: "Trial scheduled" },
  { value: "trial_complete", label: "Trial complete" },
  { value: "contract_sent", label: "Contract sent" },
  { value: "signed", label: "Signed" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
];

function derivedStage(b: Booking): LifecycleStage {
  if (b.lifecycleStage && LIFECYCLE_COLUMNS.some((c) => c.value === b.lifecycleStage)) {
    return b.lifecycleStage as LifecycleStage;
  }
  if (b.status === "completed") return "completed";
  if (b.status === "active") return "active";
  if (b.signedAt) return "signed";
  return "lead";
}

const statusOptions = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

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

export default function Bookings() {
  const [showDeleted, setShowDeleted] = useState(false);
  const { data: bookings, isLoading } = useListBookings({ includeDeleted: showDeleted });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const restoreBooking = useRestoreBooking();
  const permanentlyDeleteBooking = usePermanentlyDeleteBooking();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [view, setView] = useState<"list" | "pipeline">("list");
  const updateBooking = useUpdateBooking();

  const filteredBookings = bookings?.filter((b) => {
    const matchesDeletedView = showDeleted ? !!b.deletedAt : !b.deletedAt;
    const matchesSearch =
      b.clientName.toLowerCase().includes(search.toLowerCase()) ||
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
    restoreBooking.mutate(
      { id },
      {
        onSuccess: () => {
          refreshBookingLists();
          toast({ title: "Booking restored" });
        },
        onError: () => toast({ title: "Failed to restore booking", variant: "destructive" }),
      },
    );
  }

  function handlePermanentDelete(id: number) {
    if (!confirm("Permanently delete this booking? This cannot be undone.")) return;
    permanentlyDeleteBooking.mutate(
      { id },
      {
        onSuccess: () => {
          refreshBookingLists();
          toast({ title: "Booking permanently deleted" });
        },
        onError: () =>
          toast({ title: "Failed to permanently delete booking", variant: "destructive" }),
      },
    );
  }

  const visibleCount = filteredBookings?.length ?? 0;
  const totalCount = bookings?.filter((b) => (showDeleted ? !!b.deletedAt : !b.deletedAt)).length ?? 0;

  return (
    <Shell>
      <div className="space-y-7">
        {/* Header */}
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <span className="crm-eyebrow">Studio · Schedule</span>
            <h1 className="crm-page-title mt-2">Bookings</h1>
            <p className="crm-page-subtitle">
              Manage events, trials, and upcoming jobs across the studio's calendar.
            </p>
            <div className="crm-gold-rule mt-6 w-24" />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1 rounded-full border border-card-border bg-card p-1 text-xs">
              <button
                type="button"
                onClick={() => setView("list")}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-medium uppercase tracking-[0.12em] transition-colors ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <List className="h-3 w-3" /> List
              </button>
              <button
                type="button"
                onClick={() => setView("pipeline")}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-medium uppercase tracking-[0.12em] transition-colors ${view === "pipeline" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Columns3 className="h-3 w-3" /> Pipeline
              </button>
            </div>
            <Button
              type="button"
              variant={showDeleted ? "default" : "outline"}
              onClick={() => setShowDeleted(!showDeleted)}
              data-testid="btn-toggle-deleted-bookings"
            >
              <Trash2 className="h-4 w-4" />
              {showDeleted ? "Viewing archive" : "Archive"}
            </Button>
            <Button asChild data-testid="btn-new-booking">
              <Link href="/bookings/new">
                <Plus className="h-4 w-4" />
                New booking
              </Link>
            </Button>
          </div>
        </header>

        {view === "pipeline" ? (
          <PipelineBoard
            bookings={(filteredBookings ?? []).filter((b) => !b.deletedAt)}
            isLoading={isLoading}
            onMove={(id, stage) =>
              updateBooking.mutate(
                { id, data: { lifecycleStage: stage } },
                {
                  onSuccess: () => {
                    refreshBookingLists();
                    toast({ title: `Moved to ${LIFECYCLE_COLUMNS.find((c) => c.value === stage)?.label}` });
                  },
                }
              )
            }
          />
        ) : null}

        {/* Filter bar */}
        {view === "list" && (
        <section className="crm-section p-5 sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <label className="block min-w-0">
              <span className="crm-eyebrow">Search</span>
              <div className="mt-2 flex min-h-11 items-center rounded-lg border border-input bg-card px-3.5 shadow-[inset_0_1px_0_0_hsl(var(--card-border)/0.4)] transition-[border-color,box-shadow] duration-200 focus-within:border-primary/55 focus-within:ring-2 focus-within:ring-primary/30">
                <Search className="mr-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Client, event type, or location…"
                  className="min-w-0 flex-1 bg-transparent p-0 text-sm text-foreground outline-none placeholder:text-muted-foreground/80"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  data-testid="input-search-bookings"
                />
              </div>
            </label>

            <div className="min-w-0">
              <span className="crm-eyebrow">Status</span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {statusOptions.map(({ value, label }) => {
                  const active = statusFilter === value;
                  return (
                    <button
                      key={value}
                      onClick={() => setStatusFilter(value)}
                      aria-pressed={active}
                      className={`min-h-9 rounded-full px-3.5 text-[12px] font-medium uppercase tracking-[0.1em] transition-all duration-200 ${
                        active
                          ? "bg-primary text-primary-foreground shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.14),0_6px_16px_-10px_hsl(var(--primary)/0.55)]"
                          : "border border-card-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
                      }`}
                      data-testid={`filter-status-${value}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between">
            <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {visibleCount} of {totalCount} {totalCount === 1 ? "booking" : "bookings"}
            </span>
            {(search || statusFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
                className="text-xs font-medium uppercase tracking-[0.14em] text-primary hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </section>
        )}

        {/* List */}
        {view === "list" && (
        <section className="crm-section overflow-hidden">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredBookings && filteredBookings.length > 0 ? (
            <ul className="divide-y divide-card-border/55">
              {filteredBookings.map((booking) => {
                const content = (
                  <>
                    <div className="flex items-start gap-4">
                      {/* Date plate */}
                      <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border border-card-border bg-accent/40 font-serif">
                        {booking.firstServiceDate ? (
                          <>
                            <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.16em] leading-none text-muted-foreground">
                              {format(parseISO(booking.firstServiceDate), "MMM")}
                            </span>
                            <span
                              className="mt-1 text-xl leading-none text-foreground tabular-nums"
                              style={{ fontVariationSettings: "'opsz' 96", letterSpacing: "-0.02em" }}
                            >
                              {format(parseISO(booking.firstServiceDate), "d")}
                            </span>
                          </>
                        ) : (
                          <Calendar className="h-5 w-5 text-muted-foreground/60" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-[1.125rem] font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
                            {booking.clientName}
                          </h3>
                          <Badge className={statusTone(booking.status)} variant="outline">
                            {booking.status}
                          </Badge>
                          {booking.deletedAt && (
                            <Badge variant="destructive">Deleted</Badge>
                          )}
                        </div>
                        <div className="mt-1.5 flex items-center gap-2 text-[13px] text-muted-foreground">
                          <span className="uppercase tracking-[0.12em]">{booking.eventType}</span>
                          <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                          <span className="inline-flex items-center gap-1.5 truncate max-w-[200px] sm:max-w-[340px]">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{booking.location}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pl-[4.5rem] text-left sm:mt-0 sm:pl-0 sm:text-right">
                      <div
                        className="font-serif text-[1.375rem] text-foreground tabular-nums"
                        style={{ fontVariationSettings: "'opsz' 96", letterSpacing: "-0.02em" }}
                      >
                        ${booking.grandTotal.toLocaleString()}
                      </div>
                      {booking.deletedAt ? (
                        <div className="mt-2.5 flex flex-wrap gap-2 sm:justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRestore(booking.id)}
                            disabled={restoreBooking.isPending}
                            data-testid={`btn-restore-booking-${booking.id}`}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Restore
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handlePermanentDelete(booking.id)}
                            disabled={permanentlyDeleteBooking.isPending}
                            data-testid={`btn-permanent-delete-booking-${booking.id}`}
                          >
                            Delete forever
                          </Button>
                        </div>
                      ) : (
                        <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] sm:justify-end">
                          {booking.balancePaid ? (
                            <span className="text-emerald-700 dark:text-emerald-400">Paid in full</span>
                          ) : booking.retainerPaid ? (
                            <span className="text-primary">Retainer paid</span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400">Payment pending</span>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                );

                return (
                  <li key={booking.id}>
                    {booking.deletedAt ? (
                      <div
                        className="flex flex-col justify-between gap-4 bg-muted/25 p-5 sm:flex-row sm:items-center"
                        data-testid={`deleted-booking-${booking.id}`}
                      >
                        {content}
                      </div>
                    ) : (
                      <Link
                        href={`/bookings/${booking.id}`}
                        className="group flex flex-col justify-between gap-4 p-5 transition-colors hover:bg-accent/30 sm:flex-row sm:items-center"
                        data-testid={`link-booking-${booking.id}`}
                      >
                        {content}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center px-8 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-card-border bg-accent/50 text-foreground/70">
                <FileText className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
                No bookings found
              </h3>
              <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
                {search || statusFilter !== "all"
                  ? "No bookings match your current filters."
                  : showDeleted
                    ? "There are no deleted bookings to recover."
                    : "You haven't created any bookings yet."}
              </p>
              {!showDeleted && !search && statusFilter === "all" && (
                <Button asChild className="mt-6" size="sm">
                  <Link href="/bookings/new" data-testid="btn-add-booking-empty">
                    Create your first booking
                  </Link>
                </Button>
              )}
            </div>
          )}
        </section>
        )}
      </div>
    </Shell>
  );
}

function PipelineBoard({
  bookings,
  isLoading,
  onMove,
}: {
  bookings: Booking[];
  isLoading: boolean;
  onMove: (id: number, stage: LifecycleStage) => void;
}) {
  const grouped = LIFECYCLE_COLUMNS.map((col) => ({
    ...col,
    items: bookings.filter((b) => derivedStage(b) === col.value),
  }));

  return (
    <div className="crm-section overflow-hidden p-4">
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-7">
          {LIFECYCLE_COLUMNS.map((c) => <Skeleton key={c.value} className="h-72 w-full" />)}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {grouped.map((col) => (
            <PipelineColumn
              key={col.value}
              label={col.label}
              stage={col.value}
              items={col.items}
              onDrop={(id) => onMove(id, col.value)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PipelineColumn({
  label,
  stage,
  items,
  onDrop,
}: {
  label: string;
  stage: LifecycleStage;
  items: Booking[];
  onDrop: (id: number) => void;
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        setOver(false);
        const idStr = e.dataTransfer.getData("text/booking-id");
        if (idStr) onDrop(Number(idStr));
      }}
      className={`flex w-72 shrink-0 flex-col rounded-xl border ${over ? "border-primary/40 bg-primary/5" : "border-card-border bg-card/60"} p-3 transition-colors`}
    >
      <div className="flex items-center justify-between pb-2">
        <span className="crm-eyebrow !text-[10px]">{label}</span>
        <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">{items.length}</span>
      </div>
      <div className="crm-gold-rule mb-3 w-8" />
      <ul className="flex-1 space-y-2 overflow-y-auto" data-stage={stage}>
        {items.length === 0 ? (
          <li className="rounded-md border border-dashed border-card-border/60 px-2 py-6 text-center text-[11px] text-muted-foreground">
            Drop here
          </li>
        ) : (
          items.map((b) => (
            <li key={b.id}>
              <Link
                href={`/bookings/${b.id}`}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/booking-id", String(b.id));
                  e.dataTransfer.effectAllowed = "move";
                }}
                className="block cursor-grab rounded-lg border border-card-border bg-background p-3 text-xs transition-shadow hover:shadow-[0_8px_18px_-10px_var(--elevate-2)] active:cursor-grabbing"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {b.eventType}
                  </span>
                  <span className="font-serif tabular-nums" style={{ fontVariationSettings: "'opsz' 48" }}>
                    ${(b.grandTotal || 0).toLocaleString()}
                  </span>
                </div>
                <div className="mt-1.5 truncate font-medium text-foreground">{b.clientName}</div>
                {b.firstServiceDate && (
                  <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {format(parseISO(b.firstServiceDate), "MMM d")}
                  </div>
                )}
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
