import { Shell } from "@/components/layout/Shell";
import {
  useGetClient,
  useUpdateClient,
  useDeleteClient,
  useListBookings,
  getGetClientQueryKey,
  getListClientsQueryKey,
} from "@workspace/api-client-react";
import { useRoute } from "wouter";
import {
  ArrowLeft,
  Edit2,
  Check,
  User,
  Mail,
  Phone,
  CalendarDays,
  FileText,
  Trash2,
  Plus,
  MapPin,
} from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { useLocation } from "wouter";

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

function monogramFrom(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "·";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function ClientDetail() {
  const [, params] = useRoute("/clients/:id");
  const id = parseInt(params?.id || "0", 10);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: client, isLoading } = useGetClient(id, {
    query: { enabled: !!id, queryKey: getGetClientQueryKey(id) },
  });
  const { data: bookings } = useListBookings();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const [, setLocation] = useLocation();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", notes: "" });

  useEffect(() => {
    if (client && !isEditing) {
      setFormData({
        name: client.name,
        email: client.email,
        phone: client.phone || "",
        notes: client.notes || "",
      });
    }
  }, [client, isEditing]);

  const clientBookings = bookings?.filter((b) => b.clientId === id) || [];
  const totalBilled = clientBookings.reduce((sum, b) => sum + b.grandTotal, 0);
  const completedCount = clientBookings.filter((b) => b.status === "completed").length;

  function handleSave() {
    updateClient.mutate(
      {
        id,
        data: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          notes: formData.notes || null,
        },
      },
      {
        onSuccess: (updatedClient) => {
          queryClient.setQueryData(getGetClientQueryKey(id), updatedClient);
          queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
          setIsEditing(false);
          toast({ title: "Client updated successfully" });
        },
        onError: () => {
          toast({ title: "Failed to update client", variant: "destructive" });
        },
      },
    );
  }

  function handleDelete() {
    if (confirm("Are you sure you want to delete this client?")) {
      deleteClient.mutate(
        { id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
            toast({ title: "Client deleted successfully" });
            setLocation("/clients");
          },
          onError: () => {
            toast({ title: "Failed to delete client", variant: "destructive" });
          },
        },
      );
    }
  }

  if (isLoading) {
    return (
      <Shell>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      </Shell>
    );
  }

  if (!client) {
    return (
      <Shell>
        <div className="crm-section mx-auto max-w-xl p-10 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Client not found
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The client record could not be loaded.
          </p>
          <Button asChild className="mt-6" variant="outline">
            <Link href="/clients">Return to clients</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="space-y-8">
        {/* Back */}
        <Link
          href="/clients"
          className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
          data-testid="link-back-clients"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to clients
        </Link>

        {/* Hero */}
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-5">
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-card-border bg-accent/40 font-serif text-3xl text-foreground/85 shadow-[0_1px_0_0_hsl(var(--card-border)/0.5),0_10px_28px_-20px_var(--elevate-3)]"
              style={{ fontVariationSettings: "'opsz' 96", letterSpacing: "-0.025em" }}
            >
              {monogramFrom(client.name)}
            </div>
            <div className="min-w-0">
              <span className="crm-eyebrow">Client · Profile</span>
              {isEditing ? (
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-2 max-w-sm text-2xl font-semibold tracking-tight"
                  data-testid="edit-client-name"
                />
              ) : (
                <h1 className="crm-page-title mt-2" data-testid="text-client-name">
                  {client.name}
                </h1>
              )}
              <div className="crm-gold-rule mt-4 w-20" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="ghost"
                  onClick={() => setIsEditing(false)}
                  data-testid="btn-cancel-edit-client"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateClient.isPending}
                  data-testid="btn-save-client"
                >
                  <Check className="h-4 w-4" />
                  {updateClient.isPending ? "Saving…" : "Save changes"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  data-testid="btn-edit-client"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteClient.isPending}
                  data-testid="btn-delete-client"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </>
            )}
          </div>
        </header>

        {/* Quick stats */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile eyebrow="Bookings" value={String(clientBookings.length)} />
          <StatTile eyebrow="Completed" value={String(completedCount)} />
          <StatTile
            eyebrow="Total billed"
            value={`$${totalBilled.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          />
          <StatTile
            eyebrow="Last booking"
            value={
              clientBookings[0]?.firstServiceDate
                ? format(parseISO(clientBookings[0].firstServiceDate), "MMM yyyy")
                : "—"
            }
          />
        </section>

        {/* Main grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Contact + notes */}
          <aside className="lg:col-span-1">
            <div className="crm-section overflow-hidden">
              <div className="border-b border-card-border/70 px-6 py-4">
                <span className="crm-eyebrow">Contact</span>
              </div>
              <div className="space-y-5 px-6 py-5">
                <ContactRow
                  icon={Mail}
                  label="Email"
                  value={
                    isEditing ? (
                      <Input
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="h-9"
                        data-testid="edit-client-email"
                      />
                    ) : (
                      <a
                        href={`mailto:${client.email}`}
                        className="break-words text-foreground hover:text-primary"
                      >
                        {client.email}
                      </a>
                    )
                  }
                />
                <ContactRow
                  icon={Phone}
                  label="Phone"
                  value={
                    isEditing ? (
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="h-9"
                        placeholder="Phone number"
                        data-testid="edit-client-phone"
                      />
                    ) : client.phone ? (
                      <a
                        href={`tel:${client.phone}`}
                        className="text-foreground hover:text-primary"
                      >
                        {client.phone}
                      </a>
                    ) : (
                      <span className="italic text-muted-foreground">No phone provided</span>
                    )
                  }
                />
              </div>

              <div className="border-t border-card-border/70 px-6 py-5">
                <span className="crm-eyebrow">Internal notes</span>
                {isEditing ? (
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="mt-3 min-h-[140px] resize-y"
                    placeholder="Preferences, allergies, fit notes…"
                    data-testid="edit-client-notes"
                  />
                ) : (
                  <div
                    className="mt-3 whitespace-pre-wrap rounded-lg border border-card-border/60 bg-accent/25 px-4 py-3 text-[13.5px] leading-relaxed text-foreground/90"
                    data-testid="text-client-notes"
                  >
                    {client.notes || (
                      <span className="italic text-muted-foreground">No notes added yet.</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* Bookings */}
          <div className="lg:col-span-2">
            <div className="crm-section flex h-full flex-col overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-card-border/70 px-6 py-4">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span className="crm-eyebrow">Booking history</span>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link
                    href={`/bookings/new?clientId=${client.id}`}
                    data-testid="link-new-booking-for-client"
                  >
                    <Plus className="h-4 w-4" />
                    New booking
                  </Link>
                </Button>
              </div>

              {clientBookings.length > 0 ? (
                <ul className="flex-1 divide-y divide-card-border/55 overflow-y-auto">
                  {clientBookings.map((booking) => (
                    <li key={booking.id}>
                      <Link
                        href={`/bookings/${booking.id}`}
                        className="group flex flex-col justify-between gap-3 px-6 py-4 transition-colors hover:bg-accent/30 sm:flex-row sm:items-center"
                        data-testid={`link-booking-${booking.id}`}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[15px] font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
                              {booking.eventType}
                            </span>
                            <Badge className={statusTone(booking.status)} variant="outline">
                              {booking.status}
                            </Badge>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12.5px] text-muted-foreground">
                            <span>
                              {booking.firstServiceDate
                                ? format(parseISO(booking.firstServiceDate), "MMM d, yyyy")
                                : "Date TBD"}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate max-w-[220px]">{booking.location}</span>
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className="font-serif text-lg text-foreground tabular-nums"
                            style={{ fontVariationSettings: "'opsz' 64", letterSpacing: "-0.02em" }}
                          >
                            ${booking.grandTotal.toLocaleString()}
                          </div>
                          <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            {booking.balancePaid ? "Paid in full" : "Balance pending"}
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center px-8 py-14 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-card-border bg-accent/50 text-foreground/70">
                    <FileText className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
                    No bookings yet
                  </h3>
                  <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
                    Start a new booking to create the first contract for this client.
                  </p>
                  <Button asChild className="mt-6" size="sm">
                    <Link href={`/bookings/new?clientId=${client.id}`}>Start a booking</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function StatTile({ eyebrow, value }: { eyebrow: string; value: string }) {
  return (
    <div className="crm-section px-4 py-4">
      <div className="crm-eyebrow">{eyebrow}</div>
      <div
        className="mt-2 font-serif text-xl text-foreground tabular-nums"
        style={{ fontVariationSettings: "'opsz' 64", letterSpacing: "-0.02em" }}
      >
        {value}
      </div>
    </div>
  );
}

function ContactRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
      <div className="min-w-0 flex-1">
        <div className="crm-eyebrow !text-[10px]">{label}</div>
        <div className="mt-1 text-sm">{value}</div>
      </div>
    </div>
  );
}
