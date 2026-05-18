import { Shell } from "@/components/layout/Shell";
import { useCreateBooking, useListClients, getListBookingsQueryKey } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, useSearch } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect } from "react";

const bookingSchema = z.object({
  clientId: z.coerce.number().min(1, "Please select a client"),
  eventType: z.string().min(1, "Event type is required"),
  location: z.string().min(1, "Location is required"),
  locationDetail: z.string().optional(),
  firstServiceDate: z.string().optional(),
  status: z.enum(["draft", "active", "completed", "cancelled"]).default("draft"),
  retainerAmount: z.coerce.number().min(0).default(0),
  balanceDueDate: z.string().optional(),
  paymentMethod: z.string().optional(),
  earlyMorningFee: z.coerce.number().min(0).default(0),
  travelFee: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
});

type BookingFormValues = z.infer<typeof bookingSchema>;

export default function NewBooking() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const prefilledClientId = params.get("clientId");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: clients, isLoading: loadingClients } = useListClients();
  const createBooking = useCreateBooking();

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      clientId: prefilledClientId ? parseInt(prefilledClientId, 10) : 0,
      eventType: "",
      location: "",
      locationDetail: "",
      firstServiceDate: "",
      status: "draft",
      retainerAmount: 0,
      balanceDueDate: "",
      paymentMethod: "",
      earlyMorningFee: 0,
      travelFee: 0,
      notes: "",
    },
  });

  useEffect(() => {
    if (prefilledClientId && !form.getValues("clientId")) {
      form.setValue("clientId", parseInt(prefilledClientId, 10));
    }
  }, [prefilledClientId, form]);

  function onSubmit(data: BookingFormValues) {
    createBooking.mutate({ data }, {
      onSuccess: (booking) => {
        queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
        toast({ title: "Booking created successfully" });
        setLocation(`/bookings/${booking.id}`);
      },
      onError: () => {
        toast({ title: "Failed to create booking", variant: "destructive" });
      }
    });
  }

  return (
    <Shell>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link
            href="/bookings"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
            data-testid="link-back-bookings"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Bookings
          </Link>
          <h1 className="text-3xl font-serif text-foreground">New Booking Intake</h1>
          <p className="text-muted-foreground mt-1">Create a new booking and contract draft.</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="bg-card border rounded-lg p-6 shadow-sm space-y-6">
              <h2 className="text-xl font-serif border-b pb-2">Client & Event Details</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client *</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(parseInt(val, 10))}
                        value={field.value ? field.value.toString() : ""}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-client">
                            <SelectValue placeholder="Select a client" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients?.map(client => (
                            <SelectItem key={client.id} value={client.id.toString()}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Don't see them? <Link href="/clients/new" className="text-primary hover:underline">Add client first</Link>
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="eventType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Type *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Wedding, Birthday, Photoshoot" {...field} data-testid="input-event-type" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="firstServiceDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft (Inquiry)</SelectItem>
                          <SelectItem value="active">Active (Contracted)</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="bg-card border rounded-lg p-6 shadow-sm space-y-6">
              <h2 className="text-xl font-serif border-b pb-2">Location</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Main Location / Venue *</FormLabel>
                      <FormControl>
                        <Input placeholder="Hotel Name, City, State" {...field} data-testid="input-location" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="locationDetail"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Room Number / Specific Instructions</FormLabel>
                      <FormControl>
                        <Input placeholder="Room 402, gate code 1234" {...field} data-testid="input-location-detail" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="bg-card border rounded-lg p-6 shadow-sm space-y-6">
              <h2 className="text-xl font-serif border-b pb-2">Financials & Fees</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="retainerAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Retainer Required ($)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} data-testid="input-retainer" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="balanceDueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Balance Due Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-due-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="travelFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Travel Fee ($)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} data-testid="input-travel-fee" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="earlyMorningFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Early Morning Fee ($)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} data-testid="input-early-fee" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Payment Method</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Zelle @username, Venmo @handle, Cash" {...field} data-testid="input-payment-method" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="bg-card border rounded-lg p-6 shadow-sm">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Internal Booking Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Logistics, parking info, special requests..."
                        className="resize-none min-h-[100px]"
                        {...field}
                        data-testid="input-booking-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end pt-4 pb-12">
              <Button type="submit" size="lg" disabled={createBooking.isPending || loadingClients} data-testid="button-submit-booking">
                {createBooking.isPending ? "Creating Booking..." : "Create Booking & Add Events"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </Shell>
  );
}
