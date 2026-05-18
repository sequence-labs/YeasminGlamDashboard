import { Shell } from "@/components/layout/Shell";
import { useGetBooking, useUpdateBooking, useDeleteBooking, useCreateEvent, useUpdateEvent, useDeleteEvent, useListServiceItems, useCreateBookingLineItem, useUpdateBookingLineItem, useDeleteBookingLineItem, useRecordPayment, useDeletePayment, getGetBookingQueryKey, getListBookingsQueryKey, type BookingLineItem, type ServiceItem } from "@workspace/api-client-react";
import { useRoute } from "wouter";
import { ArrowLeft, Printer, CheckCircle, CreditCard, Calendar, Plus, Trash2, Edit, History } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useLocation } from "wouter";
import { TimePartsInput } from "@/components/TimePartsInput";

function lineItemAmount(item: BookingLineItem) {
  return item.total ?? item.quantity * item.unitPrice;
}

function lineItemCalculation(item: BookingLineItem) {
  return `${item.quantity} x $${item.unitPrice}`;
}

function optionalText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export default function BookingDetail() {
  const [, params] = useRoute("/bookings/:id");
  const id = parseInt(params?.id || "0", 10);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: booking, isLoading } = useGetBooking(id, { query: { enabled: !!id, queryKey: getGetBookingQueryKey(id) } });
  const updateBooking = useUpdateBooking();
  const deleteBooking = useDeleteBooking();
  const { data: serviceItems, isLoading: loadingServiceItems } = useListServiceItems();
  const createLineItem = useCreateBookingLineItem();
  const updateLineItem = useUpdateBookingLineItem();
  const deleteLineItem = useDeleteBookingLineItem();
  const [selectedServiceItemId, setSelectedServiceItemId] = useState("");

  const handleStatusChange = (status: "draft" | "active" | "completed" | "cancelled") => {
    updateBooking.mutate({ id, data: { status } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(id) });
        toast({ title: `Status updated to ${status}` });
      }
    });
  };

  const handleToggleRetainer = (checked: boolean) => {
    updateBooking.mutate({ id, data: { retainerPaid: checked } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(id) })
    });
  };

  const handleToggleBalance = (checked: boolean) => {
    updateBooking.mutate({ id, data: { balancePaid: checked } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(id) })
    });
  };

  const handleDeleteBooking = () => {
    if (confirm("Are you sure you want to delete this booking?")) {
      deleteBooking.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
          toast({ title: "Booking deleted successfully" });
          setLocation("/bookings");
        },
        onError: () => {
          toast({ title: "Failed to delete booking", variant: "destructive" });
        }
      });
    }
  };

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

  if (!booking) {
    return <Shell>Booking not found</Shell>;
  }

  const earlyMorningFee = booking.earlyMorningFee ?? 0;
  const travelFee = booking.travelFee ?? 0;
  const lineItems = booking.lineItems ?? [];
  const lineItemsTotal = lineItems.reduce((sum, item) => sum + lineItemAmount(item), 0);
  const activeServiceItems = serviceItems?.filter((item) => item.active) ?? [];
  const selectedServiceItem = activeServiceItems.find((item) => item.id.toString() === selectedServiceItemId);

  const handleAddCatalogLineItem = () => {
    if (!selectedServiceItem) return;

    createLineItem.mutate({
      id,
      data: {
        serviceItemId: selectedServiceItem.id,
        name: selectedServiceItem.name,
        description: optionalText(selectedServiceItem.description),
        kind: selectedServiceItem.kind,
        quantity: 1,
        unitPrice: selectedServiceItem.defaultUnitPrice,
        unitLabel: selectedServiceItem.unitLabel,
        calculationNote: selectedServiceItem.kind === "fee"
          ? optionalText(selectedServiceItem.description)
          : `1 x $${selectedServiceItem.defaultUnitPrice}`,
        sortOrder: lineItems.length * 10,
      },
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
        setSelectedServiceItemId("");
        toast({ title: "Service or fee added" });
      },
      onError: () => toast({ title: "Failed to add service or fee", variant: "destructive" }),
    });
  };

  const handleDeleteLineItem = (lineItemId: number) => {
    if (confirm("Remove this service or fee from the booking?")) {
      deleteLineItem.mutate({ id, lineItemId }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
          toast({ title: "Service or fee removed" });
        },
        onError: () => toast({ title: "Failed to remove service or fee", variant: "destructive" }),
      });
    }
  };

  const handleLineItemEventChange = (lineItemId: number, eventId: string) => {
    updateLineItem.mutate({
      id,
      lineItemId,
      data: { eventId: eventId === "booking" ? null : Number(eventId) },
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(id) });
        toast({ title: "Service assignment updated" });
      },
      onError: () => toast({ title: "Failed to update service assignment", variant: "destructive" }),
    });
  };

  return (
    <Shell>
      <div className="space-y-8 pb-12">
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="mb-4">
            <Link
              href="/bookings"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
              data-testid="link-back-bookings"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Bookings
            </Link>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <h1 className="text-3xl font-serif text-foreground leading-tight" data-testid="text-booking-title">{booking.clientName}</h1>
                  <Select value={booking.status} onValueChange={(v: any) => handleStatusChange(v)}>
                    <SelectTrigger className={`h-8 w-fit min-w-32 border-none text-xs font-bold uppercase tracking-wider ${
                        booking.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                        booking.status === 'active' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                        booking.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                      }`} data-testid="select-booking-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{booking.eventType}</span>
                  <span>{booking.location}</span>
                  {booking.firstServiceDate && <span>First service: {format(parseISO(booking.firstServiceDate), "MMM d, yyyy")}</span>}
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
                <Link
                  href={`/bookings/${id}/contract`}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 text-sm font-medium shadow-sm"
                  data-testid="btn-view-contract"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Contract PDF
                </Link>
                <Button variant="destructive" onClick={handleDeleteBooking} disabled={deleteBooking.isPending} data-testid="btn-delete-booking">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Booking
                </Button>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="events" className="w-full">
          <TabsList className="grid w-full grid-cols-3 md:w-[620px]">
            <TabsTrigger value="events" data-testid="tab-events">Events & Services</TabsTrigger>
            <TabsTrigger value="financials" data-testid="tab-financials">Financials & Payments</TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="events" className="space-y-6 mt-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-serif">Service Schedule</h2>
              <EventDialog bookingId={id} />
            </div>

            {booking.events.length > 0 ? (
              <div className="grid gap-4">
                {booking.events.map((event, index) => (
                  <div key={event.id} className="bg-card border rounded-lg p-5 shadow-sm" data-testid={`event-card-${event.id}`}>
                    <div className="flex justify-between items-start mb-4 pb-4 border-b">
                      <div>
                        <h3 className="font-serif text-lg text-primary">{event.eventName}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{format(parseISO(event.eventDate), "EEEE, MMMM d, yyyy")}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {event.subtotal > 0 ? (
                          <span className="font-serif text-lg">${event.subtotal.toLocaleString()}</span>
                        ) : (
                          <span className="rounded-full border px-2 py-1 text-xs font-medium text-muted-foreground">
                            Schedule only
                          </span>
                        )}
                        <div className="flex gap-2">
                          <EventDialog bookingId={id} event={event} trigger={<Button variant="outline" size="sm" className="h-7 px-2 text-xs" data-testid={`btn-edit-event-${event.id}`}><Edit className="w-3 h-3 mr-1" /> Edit</Button>} />
                          <DeleteEventButton bookingId={id} eventId={event.id} />
                        </div>
                      </div>
                    </div>

                    <div className="text-sm">
                      <div className="font-medium text-foreground mb-2">Timing</div>
                      <div className="grid grid-cols-1 gap-2 text-muted-foreground sm:grid-cols-[auto_1fr]">
                        <div>Services Begin:</div>
                        <div className="text-foreground">{event.servicesBegin || "TBD"}</div>
                        <div>Completion Target:</div>
                        <div className="text-foreground">{event.completionTarget || "TBD"}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-card border rounded-lg p-12 text-center text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="mb-4">No events or services added yet.</p>
                <EventDialog bookingId={id} trigger={<Button data-testid="btn-add-first-event">Add First Event</Button>} />
              </div>
            )}

            <div className="bg-card border rounded-lg p-5 shadow-sm">
              <div className="flex items-center justify-between border-b pb-3 mb-4">
                <div>
                  <h2 className="text-xl font-serif">Selected Services & Fees</h2>
                  <p className="text-sm text-muted-foreground mt-1">Assign each service or fee to an event, or keep it as a booking-level charge.</p>
                </div>
                <div className="font-serif text-lg">${lineItemsTotal.toLocaleString()}</div>
              </div>

              <div className="mb-4 rounded-md border bg-muted/20 p-3">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_auto_auto] lg:items-end">
                  <div>
                    <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Add from catalog</div>
                    <Select value={selectedServiceItemId} onValueChange={setSelectedServiceItemId} disabled={loadingServiceItems || activeServiceItems.length === 0}>
                      <SelectTrigger data-testid="select-add-line-item">
                        <SelectValue placeholder={loadingServiceItems ? "Loading services and fees..." : "Choose service or fee"} />
                      </SelectTrigger>
                      <SelectContent>
                        {activeServiceItems.map((item) => (
                          <SelectItem key={item.id} value={String(item.id)}>
                            {item.name} · ${item.defaultUnitPrice} / {item.unitLabel}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="button" onClick={handleAddCatalogLineItem} disabled={!selectedServiceItem || createLineItem.isPending} data-testid="btn-add-selected-line-item">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Selected
                  </Button>
                  <LineItemDialog bookingId={id} events={booking.events} defaultKind="service" defaultSortOrder={lineItems.length * 10} trigger={<Button type="button" variant="outline" data-testid="btn-custom-service">Custom Service</Button>} />
                  <LineItemDialog bookingId={id} events={booking.events} defaultKind="fee" defaultSortOrder={lineItems.length * 10} trigger={<Button type="button" variant="outline" data-testid="btn-custom-fee">Custom Fee</Button>} />
                </div>
              </div>

              {lineItems.length > 0 ? (
                <div className="space-y-3">
                  {lineItems.map((item) => (
                    <div key={item.id} className="grid grid-cols-1 gap-3 text-sm border rounded-md p-3 lg:grid-cols-[1fr_140px_220px_auto_auto] lg:items-center">
                      <div>
                        <div className="font-medium text-foreground">{item.name}</div>
                        {item.description && <div className="text-muted-foreground mt-1">{item.description}</div>}
                      </div>
                      <div className="text-muted-foreground">{lineItemCalculation(item)}</div>
                      <div>
                        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Event</div>
                        <Select
                          value={item.eventId ? String(item.eventId) : "booking"}
                          onValueChange={(value) => handleLineItemEventChange(item.id, value)}
                          disabled={updateLineItem.isPending}
                        >
                          <SelectTrigger data-testid={`select-line-item-event-${item.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="booking">Booking-level</SelectItem>
                            {booking.events.map((event) => (
                              <SelectItem key={event.id} value={String(event.id)}>
                                {event.eventName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="font-serif text-right">${lineItemAmount(item).toLocaleString()}</div>
                      <div className="flex justify-end gap-1">
                        <LineItemDialog
                          bookingId={id}
                          events={booking.events}
                          lineItem={item}
                          trigger={<Button type="button" variant="outline" size="sm" className="h-8 px-2" data-testid={`btn-edit-line-item-${item.id}`}><Edit className="w-3.5 h-3.5 mr-1" /> Edit</Button>}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteLineItem(item.id)}
                          disabled={deleteLineItem.isPending}
                          data-testid={`btn-delete-line-item-${item.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border rounded-md border-dashed p-6 text-center text-muted-foreground">
                  No booking intake line items were added.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="financials" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-card border rounded-lg p-6 shadow-sm">
                  <h2 className="text-xl font-serif mb-6">Payment Tracker</h2>
                  
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 rounded-md border bg-accent/20">
                      <div>
                        <div className="font-medium text-foreground">Retainer Payment</div>
                        <div className="text-sm text-muted-foreground">${booking.retainerAmount.toLocaleString()} required to secure date</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">{booking.retainerPaid ? "Paid" : "Pending"}</span>
                        <Switch 
                          checked={booking.retainerPaid} 
                          onCheckedChange={handleToggleRetainer}
                          data-testid="switch-retainer"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-md border bg-accent/20">
                      <div>
                        <div className="font-medium text-foreground">Balance Payment</div>
                        <div className="text-sm text-muted-foreground">${(booking.grandTotal - booking.retainerAmount).toLocaleString()} due {booking.balanceDueDate ? `on ${format(parseISO(booking.balanceDueDate), "MMM d")}` : ""}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">{booking.balancePaid ? "Paid" : "Pending"}</span>
                        <Switch 
                          checked={booking.balancePaid} 
                          onCheckedChange={handleToggleBalance}
                          data-testid="switch-balance"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-card border rounded-lg p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-serif">Payment Records</h2>
                    <PaymentDialog bookingId={id} />
                  </div>

                  {booking.payments.length > 0 ? (
                    <div className="space-y-3">
                      {booking.payments.map(payment => (
                        <div key={payment.id} className="flex justify-between items-center p-3 border rounded-md" data-testid={`payment-record-${payment.id}`}>
                          <div className="flex items-center gap-3">
                            <CreditCard className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium capitalize">{payment.type}</div>
                              <div className="text-xs text-muted-foreground">{format(parseISO(payment.paidAt), "MMM d, yyyy")} {payment.note && `• ${payment.note}`}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-medium font-serif">${payment.amount.toLocaleString()}</span>
                            <DeletePaymentButton paymentId={payment.id} bookingId={id} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-6 border rounded-md border-dashed text-muted-foreground">
                      No payments recorded yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-1">
                <div className="bg-card border rounded-lg p-6 shadow-sm sticky top-6">
                  <h2 className="text-xl font-serif mb-6">Invoice Summary</h2>
                  
                  <div className="space-y-3 text-sm">
                    {booking.events.filter(event => event.subtotal > 0).map(event => (
                      <div key={event.id} className="flex justify-between">
                        <span className="text-muted-foreground">{event.eventName}</span>
                        <span>${event.subtotal.toLocaleString()}</span>
                      </div>
                    ))}

                    {lineItems.map((item) => (
                      <div key={item.id} className="flex justify-between gap-3">
                        <span className="text-muted-foreground">{item.name}</span>
                        <span>${lineItemAmount(item).toLocaleString()}</span>
                      </div>
                    ))}
                    
                    {earlyMorningFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Early Morning Fee</span>
                        <span>${earlyMorningFee.toLocaleString()}</span>
                      </div>
                    )}
                    
                    {travelFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Travel Fee</span>
                        <span>${travelFee.toLocaleString()}</span>
                      </div>
                    )}
                    
                    <div className="pt-4 mt-4 border-t border-border flex justify-between font-serif text-xl text-foreground">
                      <span>Grand Total</span>
                      <span data-testid="text-grand-total">${booking.grandTotal.toLocaleString()}</span>
                    </div>

                    <div className="pt-4 space-y-2">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Retainer</span>
                        <span>-${booking.retainerAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>Balance Due</span>
                        <span data-testid="text-balance-due">${Math.max(0, booking.grandTotal - booking.retainerAmount).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4 mt-6">
            <div className="bg-card border rounded-lg p-6 shadow-sm">
              <div className="mb-6">
                <h2 className="text-xl font-serif">Booking History</h2>
                <p className="text-sm text-muted-foreground mt-1">Timestamped trail of booking, schedule, payment, and deletion changes.</p>
              </div>

              {booking.activity.length > 0 ? (
                <div className="space-y-4">
                  {booking.activity.map((entry) => (
                    <div key={entry.id} className="flex gap-3 border-b pb-4 last:border-b-0 last:pb-0" data-testid={`activity-${entry.id}`}>
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <History className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                          <h3 className="font-medium text-foreground">{entry.title}</h3>
                          <time className="text-xs text-muted-foreground">{format(parseISO(entry.createdAt), "MMM d, yyyy h:mm a")}</time>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{entry.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
                  History will appear here after booking changes are made.
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Shell>
  );
}

// Subcomponents for dialogs

const lineItemFormSchema = z.object({
  serviceItemId: z.number().nullable().optional(),
  eventId: z.string().default("booking"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  kind: z.enum(["service", "fee"]),
  quantity: z.coerce.number().min(0, "Quantity cannot be negative"),
  unitPrice: z.coerce.number().min(0, "Rate cannot be negative"),
  unitLabel: z.string().min(1, "Unit is required"),
  calculationNote: z.string().optional(),
  sortOrder: z.number().optional(),
});

type LineItemFormValues = z.infer<typeof lineItemFormSchema>;

function LineItemDialog({
  bookingId,
  events,
  lineItem,
  defaultKind = "service",
  defaultSortOrder = 0,
  trigger,
}: {
  bookingId: number;
  events: Array<{ id: number; eventName: string }>;
  lineItem?: BookingLineItem;
  defaultKind?: "service" | "fee";
  defaultSortOrder?: number;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createLineItem = useCreateBookingLineItem();
  const updateLineItem = useUpdateBookingLineItem();

  const form = useForm<LineItemFormValues>({
    resolver: zodResolver(lineItemFormSchema),
    defaultValues: lineItem ? {
      serviceItemId: lineItem.serviceItemId ?? null,
      eventId: lineItem.eventId ? String(lineItem.eventId) : "booking",
      name: lineItem.name,
      description: lineItem.description ?? "",
      kind: lineItem.kind,
      quantity: lineItem.quantity,
      unitPrice: lineItem.unitPrice,
      unitLabel: lineItem.unitLabel,
      calculationNote: lineItem.calculationNote ?? "",
      sortOrder: lineItem.sortOrder,
    } : {
      serviceItemId: null,
      eventId: "booking",
      name: defaultKind === "fee" ? "Custom Fee" : "Custom Service",
      description: "",
      kind: defaultKind,
      quantity: 1,
      unitPrice: 0,
      unitLabel: defaultKind === "fee" ? "booking" : "person",
      calculationNote: "",
      sortOrder: defaultSortOrder,
    },
  });

  function onSubmit(data: LineItemFormValues) {
    const eventId = data.eventId === "booking" ? null : Number(data.eventId);
    const description = optionalText(data.description);
    const calculationNote = optionalText(data.calculationNote);

    if (lineItem) {
      updateLineItem.mutate({
        id: bookingId,
        lineItemId: lineItem.id,
        data: {
          serviceItemId: data.serviceItemId ?? null,
          eventId,
          name: data.name.trim(),
          description: description ?? null,
          kind: data.kind,
          quantity: data.quantity,
          unitPrice: data.unitPrice,
          unitLabel: data.unitLabel.trim(),
          calculationNote: calculationNote ?? null,
          sortOrder: data.sortOrder ?? lineItem.sortOrder,
        },
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(bookingId) });
          queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
          toast({ title: "Service or fee updated" });
          setOpen(false);
        },
        onError: () => toast({ title: "Failed to update service or fee", variant: "destructive" }),
      });
      return;
    }

    createLineItem.mutate({
      id: bookingId,
      data: {
        serviceItemId: data.serviceItemId ?? undefined,
        eventId: eventId ?? undefined,
        name: data.name.trim(),
        description,
        kind: data.kind,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        unitLabel: data.unitLabel.trim(),
        calculationNote,
        sortOrder: data.sortOrder ?? defaultSortOrder,
      },
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(bookingId) });
        queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
        toast({ title: "Service or fee added" });
        setOpen(false);
        form.reset({
          serviceItemId: null,
          eventId: "booking",
          name: defaultKind === "fee" ? "Custom Fee" : "Custom Service",
          description: "",
          kind: defaultKind,
          quantity: 1,
          unitPrice: 0,
          unitLabel: defaultKind === "fee" ? "booking" : "person",
          calculationNote: "",
          sortOrder: defaultSortOrder,
        });
      },
      onError: () => toast({ title: "Failed to add service or fee", variant: "destructive" }),
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button type="button" variant="outline">{lineItem ? "Edit" : "Add Service or Fee"}</Button>}
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lineItem ? "Edit Service or Fee" : "Add Service or Fee"}</DialogTitle>
          <DialogDescription>
            Add a booking charge, then assign it to an event or keep it at the booking level.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl><Input {...field} data-testid="input-line-item-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="kind" render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger data-testid="select-line-item-kind"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="service">Service</SelectItem>
                      <SelectItem value="fee">Fee</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Textarea rows={3} {...field} data-testid="textarea-line-item-description" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField control={form.control} name="quantity" render={({ field }) => (
                <FormItem>
                  <FormLabel>Count</FormLabel>
                  <FormControl><Input type="number" min="0" step="1" {...field} data-testid="input-line-item-quantity" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="unitPrice" render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount ($)</FormLabel>
                  <FormControl><Input type="number" min="0" step="0.01" {...field} data-testid="input-line-item-unit-price" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="unitLabel" render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit</FormLabel>
                  <FormControl><Input placeholder="person, booking, service" {...field} data-testid="input-line-item-unit-label" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="eventId" render={({ field }) => (
              <FormItem>
                <FormLabel>Event</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger data-testid="select-line-item-dialog-event"><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="booking">Booking-level</SelectItem>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={String(event.id)}>
                        {event.eventName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createLineItem.isPending || updateLineItem.isPending} data-testid="btn-save-line-item">
                {lineItem ? "Save Changes" : "Add to Booking"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const eventSchema = z.object({
  eventName: z.string().min(1, "Event name is required"),
  eventDate: z.string().min(1, "Date is required"),
  servicesBegin: z.string().optional(),
  completionTarget: z.string().optional(),
});

function EventDialog({ bookingId, event, trigger }: { bookingId: number, event?: any, trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();

  const form = useForm<z.infer<typeof eventSchema>>({
    resolver: zodResolver(eventSchema),
    defaultValues: event ? {
      eventName: event.eventName,
      eventDate: event.eventDate,
      servicesBegin: event.servicesBegin || "",
      completionTarget: event.completionTarget || "",
    } : {
      eventName: "",
      eventDate: "",
      servicesBegin: "",
      completionTarget: "",
    },
  });

  function onSubmit(data: z.infer<typeof eventSchema>) {
    if (event) {
      updateEvent.mutate({ id: bookingId, eventId: event.id, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(bookingId) });
          toast({ title: "Event updated" });
          setOpen(false);
        }
      });
    } else {
      createEvent.mutate({ id: bookingId, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(bookingId) });
          toast({ title: "Event added" });
          setOpen(false);
          form.reset();
        }
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button size="sm" data-testid="btn-add-event"><Plus className="w-4 h-4 mr-2" /> Add Event</Button>}
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event ? "Edit Event" : "Add Event"}</DialogTitle>
          <DialogDescription>
            Add the event date and service timing. Use Services & Fees for quantities and pricing.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="rounded-lg border bg-muted/20 p-4">
              <h3 className="font-medium text-foreground mb-4">Event Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="eventName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Wedding morning" {...field} data-testid="input-event-name"/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="eventDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-event-date"/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            <div className="rounded-lg border bg-muted/20 p-4">
              <h3 className="font-medium text-foreground mb-4">Timing</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="servicesBegin" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Services Begin</FormLabel>
                    <FormControl>
                      <TimePartsInput value={field.value} onChange={field.onChange} testIdPrefix="input-services-begin" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="completionTarget" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Completion Target</FormLabel>
                    <FormControl>
                      <TimePartsInput value={field.value} onChange={field.onChange} testIdPrefix="input-completion-target" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createEvent.isPending || updateEvent.isPending} data-testid="btn-save-event">
                {event ? "Save Event" : "Add Event"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteEventButton({ bookingId, eventId }: { bookingId: number, eventId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const deleteEvent = useDeleteEvent();

  const handleDelete = () => {
    if (confirm("Delete this event?")) {
      deleteEvent.mutate({ id: bookingId, eventId }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(bookingId) });
          toast({ title: "Event deleted" });
        }
      });
    }
  };

  return (
    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleDelete} data-testid={`btn-delete-event-${eventId}`}>
      <Trash2 className="w-3.5 h-3.5" />
    </Button>
  );
}

const paymentSchema = z.object({
  amount: z.coerce.number().min(1, "Amount is required"),
  type: z.enum(["retainer", "balance", "partial", "other"]),
  paidAt: z.string().optional(),
  note: z.string().optional(),
});

function PaymentDialog({ bookingId }: { bookingId: number }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const recordPayment = useRecordPayment();

  const form = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { amount: 0, type: "partial", paidAt: new Date().toISOString().split('T')[0], note: "" },
  });

  function onSubmit(data: z.infer<typeof paymentSchema>) {
    recordPayment.mutate({ id: bookingId, data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(bookingId) });
        toast({ title: "Payment recorded" });
        setOpen(false);
        form.reset();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" data-testid="btn-add-payment"><Plus className="w-4 h-4 mr-2" /> Record Payment</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="amount" render={({ field }) => (
              <FormItem><FormLabel>Amount ($)</FormLabel><FormControl><Input type="number" {...field} data-testid="input-payment-amount"/></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem><FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger data-testid="select-payment-type"><SelectValue/></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="retainer">Retainer</SelectItem>
                    <SelectItem value="balance">Balance</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="paidAt" render={({ field }) => (
              <FormItem><FormLabel>Date Paid</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="note" render={({ field }) => (
              <FormItem><FormLabel>Note</FormLabel><FormControl><Input placeholder="e.g. Venmo, Zelle, Cash" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <Button type="submit" className="w-full mt-4" disabled={recordPayment.isPending} data-testid="btn-save-payment">Save Payment</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function DeletePaymentButton({ bookingId, paymentId }: { bookingId: number, paymentId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const deletePayment = useDeletePayment();

  const handleDelete = () => {
    if (confirm("Delete this payment record?")) {
      deletePayment.mutate({ paymentId }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(bookingId) });
          toast({ title: "Payment deleted" });
        }
      });
    }
  };

  return (
    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleDelete}>
      <Trash2 className="w-3 h-3" />
    </Button>
  );
}
