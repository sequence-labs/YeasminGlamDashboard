import { Shell } from "@/components/layout/Shell";
import { useGetBooking, useUpdateBooking, useDeleteBooking, useCreateEvent, useUpdateEvent, useDeleteEvent, useRecordPayment, useDeletePayment, getGetBookingQueryKey, getListBookingsQueryKey } from "@workspace/api-client-react";
import { useRoute } from "wouter";
import { ArrowLeft, Printer, CheckCircle, CreditCard, Calendar, Plus, Trash2, Edit } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useLocation } from "wouter";

export default function BookingDetail() {
  const [, params] = useRoute("/bookings/:id");
  const id = parseInt(params?.id || "0", 10);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: booking, isLoading } = useGetBooking(id, { query: { enabled: !!id, queryKey: getGetBookingQueryKey(id) } });
  const updateBooking = useUpdateBooking();
  const deleteBooking = useDeleteBooking();

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

  return (
    <Shell>
      <div className="space-y-8 pb-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Link
              href="/bookings"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
              data-testid="link-back-bookings"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Bookings
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-serif text-foreground" data-testid="text-booking-title">{booking.clientName}</h1>
              <Select value={booking.status} onValueChange={(v: any) => handleStatusChange(v)}>
                <SelectTrigger className={`h-8 border-none text-xs font-bold uppercase tracking-wider ${
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
            <p className="text-muted-foreground mt-1 font-medium">{booking.eventType} • {booking.location}</p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/bookings/${id}/contract`}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
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

        <Tabs defaultValue="events" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
            <TabsTrigger value="events" data-testid="tab-events">Events & Services</TabsTrigger>
            <TabsTrigger value="financials" data-testid="tab-financials">Financials & Payments</TabsTrigger>
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
                        <span className="font-serif text-lg">${event.subtotal.toLocaleString()}</span>
                        <div className="flex gap-2">
                          <EventDialog bookingId={id} event={event} trigger={<Button variant="outline" size="sm" className="h-7 px-2 text-xs" data-testid={`btn-edit-event-${event.id}`}><Edit className="w-3 h-3 mr-1" /> Edit</Button>} />
                          <DeleteEventButton bookingId={id} eventId={event.id} />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                      <div>
                        <div className="font-medium text-foreground mb-2">Timing</div>
                        <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                          <div>Services Begin:</div>
                          <div className="text-foreground">{event.servicesBegin || "TBD"}</div>
                          <div>Completion Target:</div>
                          <div className="text-foreground">{event.completionTarget || "TBD"}</div>
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-foreground mb-2">Service Breakdown</div>
                        <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                          {!!event.hairAndMakeupCount && (
                            <>
                              <div>Hair & Makeup ({event.hairAndMakeupCount} @ ${event.hairAndMakeupRate}):</div>
                              <div className="text-foreground text-right">${(event.hairAndMakeupCount * (event.hairAndMakeupRate||0))}</div>
                            </>
                          )}
                          {!!event.hairOnlyCount && (
                            <>
                              <div>Hair Only ({event.hairOnlyCount} @ ${event.hairRate}):</div>
                              <div className="text-foreground text-right">${(event.hairOnlyCount * (event.hairRate||0))}</div>
                            </>
                          )}
                          {!!event.makeupOnlyCount && (
                            <>
                              <div>Makeup Only ({event.makeupOnlyCount} @ ${event.makeupRate}):</div>
                              <div className="text-foreground text-right">${(event.makeupOnlyCount * (event.makeupRate||0))}</div>
                            </>
                          )}
                        </div>
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
                    {booking.events.map(event => (
                      <div key={event.id} className="flex justify-between">
                        <span className="text-muted-foreground">{event.eventName}</span>
                        <span>${event.subtotal.toLocaleString()}</span>
                      </div>
                    ))}
                    
                    {booking.earlyMorningFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Early Morning Fee</span>
                        <span>${booking.earlyMorningFee.toLocaleString()}</span>
                      </div>
                    )}
                    
                    {booking.travelFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Travel Fee</span>
                        <span>${booking.travelFee.toLocaleString()}</span>
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
        </Tabs>
      </div>
    </Shell>
  );
}

// Subcomponents for dialogs

const eventSchema = z.object({
  eventName: z.string().min(1, "Event name is required"),
  eventDate: z.string().min(1, "Date is required"),
  servicesBegin: z.string().optional(),
  completionTarget: z.string().optional(),
  hairAndMakeupCount: z.coerce.number().min(0).default(0),
  hairOnlyCount: z.coerce.number().min(0).default(0),
  makeupOnlyCount: z.coerce.number().min(0).default(0),
  makeupRate: z.coerce.number().min(0).default(150),
  hairRate: z.coerce.number().min(0).default(135),
  hairAndMakeupRate: z.coerce.number().min(0).default(285),
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
      hairAndMakeupCount: event.hairAndMakeupCount || 0,
      hairOnlyCount: event.hairOnlyCount || 0,
      makeupOnlyCount: event.makeupOnlyCount || 0,
      makeupRate: event.makeupRate || 150,
      hairRate: event.hairRate || 135,
      hairAndMakeupRate: event.hairAndMakeupRate || 285,
    } : {
      eventName: "",
      eventDate: "",
      servicesBegin: "",
      completionTarget: "",
      hairAndMakeupCount: 0,
      hairOnlyCount: 0,
      makeupOnlyCount: 0,
      makeupRate: 150,
      hairRate: 135,
      hairAndMakeupRate: 285,
    },
  });

  // Calculate live subtotal
  const hm = form.watch("hairAndMakeupCount") || 0;
  const hmr = form.watch("hairAndMakeupRate") || 0;
  const h = form.watch("hairOnlyCount") || 0;
  const hr = form.watch("hairRate") || 0;
  const m = form.watch("makeupOnlyCount") || 0;
  const mr = form.watch("makeupRate") || 0;
  const liveSubtotal = (hm * hmr) + (h * hr) + (m * mr);

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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event ? "Edit Event" : "Add Event"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="eventName" render={({ field }) => (
                <FormItem><FormLabel>Event Name</FormLabel><FormControl><Input placeholder="e.g. Ceremony" {...field} data-testid="input-event-name"/></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="eventDate" render={({ field }) => (
                <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} data-testid="input-event-date"/></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="servicesBegin" render={({ field }) => (
                <FormItem><FormLabel>Services Begin (Time)</FormLabel><FormControl><Input placeholder="e.g. 8:00 AM" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="completionTarget" render={({ field }) => (
                <FormItem><FormLabel>Completion Target (Time)</FormLabel><FormControl><Input placeholder="e.g. 1:00 PM" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium mb-4">Services & Pricing</h3>
              <div className="grid grid-cols-12 gap-4 items-end mb-4">
                <div className="col-span-4 font-medium text-sm text-muted-foreground">Service</div>
                <div className="col-span-4 font-medium text-sm text-muted-foreground">Count</div>
                <div className="col-span-4 font-medium text-sm text-muted-foreground">Rate ($)</div>
                
                <div className="col-span-4 text-sm">Hair & Makeup</div>
                <FormField control={form.control} name="hairAndMakeupCount" render={({ field }) => (
                  <FormItem className="col-span-4"><FormControl><Input type="number" {...field} data-testid="input-hm-count"/></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="hairAndMakeupRate" render={({ field }) => (
                  <FormItem className="col-span-4"><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                )} />

                <div className="col-span-4 text-sm">Hair Only</div>
                <FormField control={form.control} name="hairOnlyCount" render={({ field }) => (
                  <FormItem className="col-span-4"><FormControl><Input type="number" {...field} data-testid="input-h-count"/></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="hairRate" render={({ field }) => (
                  <FormItem className="col-span-4"><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                )} />

                <div className="col-span-4 text-sm">Makeup Only</div>
                <FormField control={form.control} name="makeupOnlyCount" render={({ field }) => (
                  <FormItem className="col-span-4"><FormControl><Input type="number" {...field} data-testid="input-m-count"/></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="makeupRate" render={({ field }) => (
                  <FormItem className="col-span-4"><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                )} />
              </div>
              <div className="flex justify-end pt-2 border-t text-lg font-serif">
                Event Subtotal: <span className="ml-2">${liveSubtotal.toLocaleString()}</span>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={createEvent.isPending || updateEvent.isPending} data-testid="btn-save-event">
              Save Event
            </Button>
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