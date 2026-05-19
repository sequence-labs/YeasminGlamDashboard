import { Shell } from "@/components/layout/Shell";
import {
  useCreateBooking,
  useCreateClient,
  useCreateEvent,
  getListClientsQueryKey,
  useGetArtistProfile,
  useListContractTemplates,
  useListServiceItems,
  getListBookingsQueryKey,
  type ServiceItem,
} from "@workspace/api-client-react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatUSPhone, formatUSPhoneInput, isCompleteUSPhone } from "@/lib/phone";
import { useEffect, useState } from "react";
import { TimePartsInput } from "@/components/TimePartsInput";

const lineItemSchema = z.object({
  serviceItemId: z.number().optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  kind: z.enum(["service", "fee"]),
  quantity: z.coerce.number().min(0, "Quantity cannot be negative"),
  unitPrice: z.coerce.number().min(0, "Rate cannot be negative"),
  unitLabel: z.string().min(1, "Unit is required"),
  calculationNote: z.string().optional(),
  sortOrder: z.number().optional(),
});

const bookingSchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  clientEmail: z.string().min(1, "Client email is required").email("Enter a valid email"),
  clientPhone: z.string().optional().refine((value) => !value || isCompleteUSPhone(value), "Enter a full 10-digit phone number"),
  clientNotes: z.string().optional(),
  eventType: z.string().min(1, "Event type is required"),
  contractTemplateId: z.string().min(1, "Contract is required"),
  location: z.string().min(1, "Location is required"),
  locationDetail: z.string().optional(),
  firstServiceDate: z.string().optional(),
  initialEventName: z.string().optional(),
  initialServicesBegin: z.string().optional(),
  initialCompletionTarget: z.string().optional(),
  status: z.enum(["draft", "active", "completed", "cancelled"]).default("draft"),
  retainerAmount: z.coerce.number().min(0).default(0),
  balanceDueDate: z.string().optional(),
  paymentMethod: z.string().optional(),
  earlyMorningFee: z.coerce.number().min(0).default(0),
  travelFee: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
  lineItems: z.array(lineItemSchema).default([]),
}).superRefine((data, ctx) => {
  const hasInitialEvent =
    !!data.initialEventName?.trim() ||
    !!data.initialServicesBegin?.trim() ||
    !!data.initialCompletionTarget?.trim();

  if (!hasInitialEvent) return;

  if (!data.initialEventName?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["initialEventName"],
      message: "Event name is required when adding a first event",
    });
  }

  if (!data.firstServiceDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["firstServiceDate"],
      message: "First Service Date is required when adding a first event",
    });
  }
});

type BookingFormValues = z.infer<typeof bookingSchema>;

export default function NewBooking() {
  const [, setLocation] = useLocation();

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: serviceItems, isLoading: loadingServiceItems } = useListServiceItems();
  const { data: contractTemplates, isLoading: loadingContractTemplates } = useListContractTemplates();
  const { data: artistProfile } = useGetArtistProfile();
  const createClient = useCreateClient();
  const createBooking = useCreateBooking();
  const createEvent = useCreateEvent();
  const [selectedServiceItemId, setSelectedServiceItemId] = useState("");

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      clientNotes: "",
      eventType: "",
      contractTemplateId: "",
      location: "",
      locationDetail: "",
      firstServiceDate: "",
      initialEventName: "",
      initialServicesBegin: "",
      initialCompletionTarget: "",
      status: "draft",
      retainerAmount: 0,
      balanceDueDate: "",
      paymentMethod: "",
      earlyMorningFee: 0,
      travelFee: 0,
      notes: "",
      lineItems: [],
    },
  });

  useEffect(() => {
    const profilePaymentMethod = optionalText(artistProfile?.paymentMethod ?? "");
    if (profilePaymentMethod) {
      const currentPaymentMethod = form.getValues("paymentMethod");
      if (!currentPaymentMethod) {
        form.setValue("paymentMethod", profilePaymentMethod);
      }
    }
  }, [artistProfile, form]);

  useEffect(() => {
    if (!contractTemplates || form.getValues("contractTemplateId")) return;
    const defaultContract = contractTemplates.find((contract) => contract.isDefault && contract.active)
      ?? contractTemplates.find((contract) => contract.active);
    if (defaultContract) {
      form.setValue("contractTemplateId", String(defaultContract.id));
    }
  }, [contractTemplates, form]);

  const { fields: lineItemFields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  const activeServiceItems = serviceItems?.filter((item) => item.active) ?? [];
  const selectedServiceItem = activeServiceItems.find((item) => item.id.toString() === selectedServiceItemId);
  const lineItems = form.watch("lineItems") ?? [];
  const lineItemsTotal = lineItems.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0);
  const estimatedRetainer = lineItemsTotal * 0.25;

  function appendServiceItem(item: ServiceItem) {
    append({
      serviceItemId: item.id,
      name: item.name,
      description: item.description ?? "",
      kind: item.kind,
      quantity: 1,
      unitPrice: item.defaultUnitPrice,
      unitLabel: item.unitLabel,
      calculationNote: item.kind === "fee" ? item.description ?? "" : `1 ${item.name} @ $${item.defaultUnitPrice}`,
      sortOrder: lineItemFields.length * 10,
    });
    setSelectedServiceItemId("");
  }

  function appendCustomLineItem(kind: "service" | "fee") {
    append({
      name: kind === "fee" ? "Custom Fee" : "Custom Service",
      description: "",
      kind,
      quantity: 1,
      unitPrice: 0,
      unitLabel: kind === "fee" ? "booking" : "person",
      calculationNote: "",
      sortOrder: lineItemFields.length * 10,
    });
  }

  function optionalText(value?: string) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  }

  async function onSubmit(data: BookingFormValues) {
    try {
      const clientPhone = optionalText(formatUSPhone(data.clientPhone ?? ""));
      const client = await createClient.mutateAsync({
        data: {
          name: data.clientName.trim(),
          email: data.clientEmail.trim(),
          ...(clientPhone ? { phone: clientPhone } : {}),
          notes: optionalText(data.clientNotes),
        },
      });

      const bookingData = {
        clientId: client.id,
        contractTemplateId: Number(data.contractTemplateId),
        eventType: data.eventType,
        location: data.location,
        locationDetail: optionalText(data.locationDetail),
        firstServiceDate: optionalText(data.firstServiceDate),
        status: data.status,
        balanceDueDate: optionalText(data.balanceDueDate),
        paymentMethod: optionalText(data.paymentMethod),
        earlyMorningFee: 0,
        travelFee: 0,
        retainerAmount: 0,
        notes: optionalText(data.notes),
        lineItems: data.lineItems.map((lineItem, index) => ({
          ...lineItem,
          description: optionalText(lineItem.description),
          calculationNote: optionalText(lineItem.calculationNote),
          sortOrder: lineItem.sortOrder ?? index * 10,
        })),
      };

      const booking = await createBooking.mutateAsync({ data: bookingData });
      const initialEventName = optionalText(data.initialEventName);
      const shouldCreateInitialEvent =
        !!initialEventName ||
        !!data.initialServicesBegin?.trim() ||
        !!data.initialCompletionTarget?.trim();

      if (shouldCreateInitialEvent && data.firstServiceDate && initialEventName) {
        try {
          await createEvent.mutateAsync({
            id: booking.id,
            data: {
              eventName: initialEventName,
              eventDate: data.firstServiceDate,
              servicesBegin: optionalText(data.initialServicesBegin),
              completionTarget: optionalText(data.initialCompletionTarget),
            },
          });
        } catch {
          toast({ title: "Booking created, but the first event was not added", variant: "destructive" });
        }
      }

      queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
      toast({ title: "Booking created successfully" });
      setLocation(`/bookings/${booking.id}`);
    } catch {
      toast({ title: "Failed to create booking", variant: "destructive" });
    }
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
          <h1 className="crm-page-title">New Booking Intake</h1>
          <p className="crm-page-subtitle">Create a new booking and contract draft.</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="crm-section p-6 space-y-6">
              <h2 className="text-xl font-serif border-b pb-2">Client Contact & Event Details</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Client full name" {...field} data-testid="input-client-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clientEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Email *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="client@example.com" {...field} data-testid="input-client-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clientPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Phone</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(555) 123-4567"
                          {...field}
                          onChange={(event) => field.onChange(formatUSPhoneInput(event.target.value))}
                          data-testid="input-client-phone"
                        />
                      </FormControl>
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
                  name="contractTemplateId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contract *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={loadingContractTemplates}>
                        <FormControl>
                          <SelectTrigger data-testid="select-contract">
                            <SelectValue placeholder={loadingContractTemplates ? "Loading contracts..." : "Select contract"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(contractTemplates ?? []).filter((contract) => contract.active).map((contract) => (
                            <SelectItem key={contract.id} value={String(contract.id)}>
                              {contract.name}{contract.isDefault ? " (Default)" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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

                <FormField
                  control={form.control}
                  name="clientNotes"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Client Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Contact preferences, inquiry context, or notes that belong on the client profile"
                          className="resize-none min-h-[90px]"
                          {...field}
                          data-testid="input-client-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="crm-section p-6 space-y-6">
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

            <div className="crm-section p-6 space-y-6">
              <div className="border-b pb-3">
                <h2 className="text-xl font-serif">First Event Schedule</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Add the first service schedule now if the timing is known. More events can be added later.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="initialEventName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Wedding morning, Reception glam" {...field} data-testid="input-initial-event-name" />
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
                      <FormLabel>First Service Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="initialServicesBegin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Services Begin</FormLabel>
                      <FormControl>
                        <TimePartsInput value={field.value} onChange={field.onChange} testIdPrefix="input-initial-services-begin" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="initialCompletionTarget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Completion Target</FormLabel>
                      <FormControl>
                        <TimePartsInput value={field.value} onChange={field.onChange} testIdPrefix="input-initial-completion-target" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="crm-section p-6 space-y-6">
              <div className="border-b pb-3">
                <h2 className="text-xl font-serif">Services & Fees</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Select reusable catalog items and snapshot the quantity, rate, and contract calculation for this booking.
                </p>
              </div>

              <div className="flex flex-col lg:flex-row gap-3">
                <Select value={selectedServiceItemId} onValueChange={setSelectedServiceItemId}>
                  <SelectTrigger className="flex-1" data-testid="select-service-item">
                    <SelectValue placeholder={loadingServiceItems ? "Loading services..." : "Choose service or fee"} />
                  </SelectTrigger>
                  <SelectContent>
                    {activeServiceItems.map((item) => (
                      <SelectItem key={item.id} value={item.id.toString()}>
                        {item.name} - ${item.defaultUnitPrice} / {item.unitLabel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  onClick={() => selectedServiceItem && appendServiceItem(selectedServiceItem)}
                  disabled={!selectedServiceItem}
                  data-testid="button-add-selected-service"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Selected
                </Button>
                <Button type="button" variant="outline" onClick={() => appendCustomLineItem("service")}>
                  Custom Service
                </Button>
                <Button type="button" variant="outline" onClick={() => appendCustomLineItem("fee")}>
                  Custom Fee
                </Button>
              </div>

              {activeServiceItems.length === 0 && !loadingServiceItems && (
                <div className="text-sm text-muted-foreground border rounded-md p-4">
                  No active catalog items yet. <Link href="/services" className="text-primary hover:underline">Add services and fees</Link>.
                </div>
              )}

              {lineItemFields.length > 0 ? (
                <div className="space-y-4">
                  {lineItemFields.map((field, index) => {
                    const current = lineItems[index];
                    const rowTotal = (current?.quantity || 0) * (current?.unitPrice || 0);

                    return (
                      <div key={field.id} className="border rounded-md p-4 space-y-4" data-testid={`line-item-${index}`}>
                        <div className="flex items-center justify-between gap-3">
                          <Badge variant={current?.kind === "fee" ? "secondary" : "outline"}>
                            {current?.kind === "fee" ? "Fee" : "Service"}
                          </Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => remove(index)}
                            aria-label="Remove line item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-[1fr_130px] gap-4">
                          <FormField
                            control={form.control}
                            name={`lineItems.${index}.name` as const}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Name</FormLabel>
                                <FormControl>
                                  <Input {...field} data-testid={`input-line-item-name-${index}`} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`lineItems.${index}.kind` as const}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Type</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="service">Service</SelectItem>
                                    <SelectItem value="fee">Fee</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-[110px_130px_120px_1fr] gap-4">
                          <FormField
                            control={form.control}
                            name={`lineItems.${index}.quantity` as const}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Qty</FormLabel>
                                <FormControl>
                                  <Input type="number" min="0" step="0.01" {...field} data-testid={`input-line-item-qty-${index}`} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`lineItems.${index}.unitPrice` as const}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Rate ($)</FormLabel>
                                <FormControl>
                                  <Input type="number" min="0" step="0.01" {...field} data-testid={`input-line-item-rate-${index}`} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`lineItems.${index}.unitLabel` as const}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Unit</FormLabel>
                                <FormControl>
                                  <Input {...field} data-testid={`input-line-item-unit-${index}`} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`lineItems.${index}.calculationNote` as const}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Contract Calculation</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder={`${current?.quantity || 0} ${current?.name || "item"} @ $${current?.unitPrice || 0}`}
                                    {...field}
                                    data-testid={`input-line-item-note-${index}`}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="flex justify-end text-sm">
                          <span className="text-muted-foreground mr-2">Line total</span>
                          <span className="font-serif text-lg">${rowTotal.toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="border rounded-md border-dashed p-8 text-center text-muted-foreground">
                  Add services and fees before creating the contract draft.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-5">
                <div className="rounded-md border p-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Services & Fees</div>
                  <div className="text-2xl font-serif mt-1">${lineItemsTotal.toLocaleString()}</div>
                </div>
                <div className="rounded-md border p-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Estimated Retainer</div>
                  <div className="text-2xl font-serif mt-1">${estimatedRetainer.toLocaleString()}</div>
                </div>
                <div className="rounded-md border p-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Estimated Balance</div>
                  <div className="text-2xl font-serif mt-1">${Math.max(0, lineItemsTotal - estimatedRetainer).toLocaleString()}</div>
                </div>
              </div>
            </div>

            <div className="crm-section p-6 space-y-6">
              <h2 className="text-xl font-serif border-b pb-2">Payment Details</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
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

            <div className="crm-section p-6">
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
              <Button
                type="submit"
                size="lg"
                disabled={createClient.isPending || createBooking.isPending || createEvent.isPending || loadingServiceItems || loadingContractTemplates}
                data-testid="button-submit-booking"
              >
                {createClient.isPending || createBooking.isPending || createEvent.isPending
                  ? "Creating Booking..."
                  : "Create Booking"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </Shell>
  );
}
