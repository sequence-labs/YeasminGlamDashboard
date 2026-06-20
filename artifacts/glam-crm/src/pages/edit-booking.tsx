import { Shell } from "@/components/layout/Shell";
import { TimePartsInput } from "@/components/TimePartsInput";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatUSPhone, formatUSPhoneInput, isCompleteUSPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";
import {
  getGetBookingQueryKey,
  getGetClientQueryKey,
  getListBookingsQueryKey,
  getListClientsQueryKey,
  useCreateBookingLineItem,
  useCreateEvent,
  useDeleteBookingLineItem,
  useDeleteEvent,
  useGetBooking,
  useGetClient,
  useListContractTemplates,
  useListServiceItems,
  useUpdateBooking,
  useUpdateBookingLineItem,
  useUpdateClient,
  useUpdateEvent,
  type BookingDetail,
  type BookingEvent,
  type BookingLineItem,
  type ServiceItem,
} from "@workspace/api-client-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, RotateCcw, Save, ShieldAlert, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { Link, useLocation, useRoute } from "wouter";
import { z } from "zod";

const lineItemSchema = z.object({
  id: z.number().optional(),
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

const eventSchema = z.object({
  id: z.number().optional(),
  kind: z.enum(["event", "trial"]).default("event"),
  eventName: z.string().min(1, "Event name is required"),
  eventDate: z.string().min(1, "Date is required"),
  servicesBegin: z.string().optional(),
  completionTarget: z.string().optional(),
  sortOrder: z.number().optional(),
});

const editBookingSchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  clientEmail: z.string().min(1, "Client email is required").email("Enter a valid email"),
  clientPhone: z.string().optional().refine((value) => !value || isCompleteUSPhone(value), "Enter a full 10-digit phone number"),
  clientNotes: z.string().optional(),
  contractTemplateId: z.string().min(1, "Contract is required"),
  eventType: z.string().min(1, "Event type is required"),
  status: z.enum(["draft", "active", "completed", "cancelled"]).default("draft"),
  location: z.string().min(1, "Location is required"),
  locationDetail: z.string().optional(),
  firstServiceDate: z.string().optional(),
  events: z.array(eventSchema).default([]),
  lineItems: z.array(lineItemSchema).default([]),
  balanceDueDate: z.string().optional(),
  paymentMethod: z.string().optional(),
  retainerAmount: z.coerce.number().min(0).default(0),
  earlyMorningFee: z.coerce.number().min(0).default(0),
  travelFee: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
});

type EditBookingFormValues = z.infer<typeof editBookingSchema>;

function optionalText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function nullableText(value?: string | null) {
  return optionalText(value) ?? null;
}

function toDateInputValue(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function normalizeForCompare(value: unknown) {
  return JSON.stringify(value, (_key, item) => (item === undefined ? null : item));
}

function isSameValue(left: unknown, right: unknown) {
  return normalizeForCompare(left) === normalizeForCompare(right);
}

function eventToForm(event: BookingEvent): EditBookingFormValues["events"][number] {
  return {
    id: event.id,
    kind: event.kind === "trial" ? "trial" : "event",
    eventName: event.eventName,
    eventDate: event.eventDate,
    servicesBegin: event.servicesBegin ?? "",
    completionTarget: event.completionTarget ?? "",
    sortOrder: event.sortOrder,
  };
}

function lineItemToForm(item: BookingLineItem): EditBookingFormValues["lineItems"][number] {
  return {
    id: item.id,
    serviceItemId: item.serviceItemId ?? null,
    eventId: item.eventId ? String(item.eventId) : "booking",
    name: item.name,
    description: item.description ?? "",
    kind: item.kind,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    unitLabel: item.unitLabel,
    calculationNote: item.calculationNote ?? "",
    sortOrder: item.sortOrder,
  };
}

function buildInitialValues(
  booking: BookingDetail,
  client: { email?: string | null; phone?: string | null; notes?: string | null } | undefined,
  fallbackContractTemplateId: number | null,
): EditBookingFormValues {
  return {
    clientName: booking.clientName,
    clientEmail: client?.email ?? booking.clientEmail ?? "",
    clientPhone: formatUSPhoneInput(client?.phone ?? booking.clientPhone ?? ""),
    clientNotes: client?.notes ?? "",
    contractTemplateId: String(booking.contractTemplateId ?? fallbackContractTemplateId ?? ""),
    eventType: booking.eventType,
    status: booking.status,
    location: booking.location,
    locationDetail: booking.locationDetail ?? "",
    firstServiceDate: toDateInputValue(booking.firstServiceDate),
    events: booking.events.map(eventToForm),
    lineItems: booking.lineItems.map(lineItemToForm),
    balanceDueDate: toDateInputValue(booking.balanceDueDate),
    paymentMethod: booking.paymentMethod ?? "",
    retainerAmount: booking.retainerAmount ?? 0,
    earlyMorningFee: booking.earlyMorningFee ?? 0,
    travelFee: booking.travelFee ?? 0,
    notes: booking.notes ?? "",
  };
}

function sectionChanged(current: unknown, initial: unknown) {
  return initial !== undefined && !isSameValue(current, initial);
}

function SectionShell({
  step,
  title,
  detail,
  changed,
  onRestore,
  children,
}: {
  step: string;
  title: string;
  detail?: string;
  changed: boolean;
  onRestore: () => void;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "crm-section space-y-6 p-6 transition-colors sm:p-8",
        changed && "border-amber-400/70 bg-amber-50/45 shadow-[0_0_0_1px_hsl(38_92%_50%/0.16)] dark:bg-amber-400/8",
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="crm-eyebrow">{step}</span>
            {changed ? (
              <Badge className="border-amber-500/45 bg-amber-500/12 text-amber-700 dark:text-amber-300" variant="outline">
                Changed
              </Badge>
            ) : null}
          </div>
          <h2 className="crm-section-title mt-1">{title}</h2>
          {detail ? <p className="mt-1 text-sm text-muted-foreground">{detail}</p> : null}
        </div>
        {changed ? (
          <Button type="button" variant="outline" size="sm" onClick={onRestore}>
            <RotateCcw className="h-3.5 w-3.5" />
            Restore section
          </Button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function parseEventId(value?: string | null) {
  if (!value || value === "booking") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function lineItemTotal(item: EditBookingFormValues["lineItems"][number]) {
  return (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
}

function eventUpdatePayload(event: EditBookingFormValues["events"][number], index: number) {
  return {
    kind: event.kind,
    eventName: event.eventName.trim(),
    eventDate: event.eventDate,
    servicesBegin: nullableText(event.servicesBegin),
    completionTarget: nullableText(event.completionTarget),
    sortOrder: index * 10,
  };
}

function lineItemUpdatePayload(item: EditBookingFormValues["lineItems"][number], index: number) {
  return {
    serviceItemId: item.serviceItemId ?? null,
    eventId: parseEventId(item.eventId),
    name: item.name.trim(),
    description: nullableText(item.description),
    kind: item.kind,
    quantity: Number(item.quantity || 0),
    unitPrice: Number(item.unitPrice || 0),
    unitLabel: item.unitLabel.trim(),
    calculationNote: nullableText(item.calculationNote),
    sortOrder: index * 10,
  };
}

export default function EditBooking() {
  const [, params] = useRoute("/bookings/:id/edit");
  const id = Number(params?.id ?? 0);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: booking, isLoading: loadingBooking } = useGetBooking(id, { query: { enabled: Boolean(id), queryKey: getGetBookingQueryKey(id) } });
  const { data: client } = useGetClient(booking?.clientId ?? 0, {
    query: {
      enabled: Boolean(booking?.clientId),
      queryKey: getGetClientQueryKey(booking?.clientId ?? 0),
    },
  });
  const { data: contractTemplates, isLoading: loadingContractTemplates } = useListContractTemplates();
  const { data: serviceItems, isLoading: loadingServiceItems } = useListServiceItems();

  const updateBooking = useUpdateBooking();
  const updateClient = useUpdateClient();
  const updateEvent = useUpdateEvent();
  const createEvent = useCreateEvent();
  const deleteEvent = useDeleteEvent();
  const updateLineItem = useUpdateBookingLineItem();
  const createLineItem = useCreateBookingLineItem();
  const deleteLineItem = useDeleteBookingLineItem();

  const [initialValues, setInitialValues] = useState<EditBookingFormValues | null>(null);
  const [selectedServiceItemId, setSelectedServiceItemId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fallbackContractTemplateId = useMemo(() => (
    contractTemplates?.find((contract) => contract.isDefault && contract.active)?.id
      ?? contractTemplates?.find((contract) => contract.active)?.id
      ?? null
  ), [contractTemplates]);

  const form = useForm<EditBookingFormValues>({
    resolver: zodResolver(editBookingSchema),
    defaultValues: {
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      clientNotes: "",
      contractTemplateId: "",
      eventType: "",
      status: "draft",
      location: "",
      locationDetail: "",
      firstServiceDate: "",
      events: [],
      lineItems: [],
      balanceDueDate: "",
      paymentMethod: "",
      retainerAmount: 0,
      earlyMorningFee: 0,
      travelFee: 0,
      notes: "",
    },
  });

  const {
    fields: eventFields,
    append: appendEvent,
    remove: removeEvent,
    replace: replaceEvents,
  } = useFieldArray({ control: form.control, name: "events" });
  const {
    fields: lineItemFields,
    append: appendLineItem,
    remove: removeLineItem,
    replace: replaceLineItems,
  } = useFieldArray({ control: form.control, name: "lineItems" });

  useEffect(() => {
    if (!booking || !client || !contractTemplates) return;
    const nextValues = buildInitialValues(booking, client, fallbackContractTemplateId);
    form.reset(nextValues);
    setInitialValues(nextValues);
  }, [booking, client, contractTemplates, fallbackContractTemplateId, form]);

  const watchedValues = useWatch({ control: form.control }) as EditBookingFormValues;
  const activeServiceItems = serviceItems?.filter((item) => item.active) ?? [];
  const selectedServiceItem = activeServiceItems.find((item) => String(item.id) === selectedServiceItemId);
  const currentLineItems = watchedValues.lineItems ?? [];
  const currentEvents = watchedValues.events ?? [];
  const servicesTotal = currentLineItems.reduce((sum, item) => sum + lineItemTotal(item), 0);
  const totalWithFees = servicesTotal + Number(watchedValues.earlyMorningFee || 0) + Number(watchedValues.travelFee || 0);
  const estimatedRetainer = Number(watchedValues.retainerAmount || 0) || totalWithFees * 0.25;

  const changed = {
    client: sectionChanged(
      {
        clientName: watchedValues.clientName,
        clientEmail: watchedValues.clientEmail,
        clientPhone: watchedValues.clientPhone,
        clientNotes: watchedValues.clientNotes,
        eventType: watchedValues.eventType,
      },
      initialValues && {
        clientName: initialValues.clientName,
        clientEmail: initialValues.clientEmail,
        clientPhone: initialValues.clientPhone,
        clientNotes: initialValues.clientNotes,
        eventType: initialValues.eventType,
      },
    ),
    location: sectionChanged(
      { location: watchedValues.location, locationDetail: watchedValues.locationDetail },
      initialValues && { location: initialValues.location, locationDetail: initialValues.locationDetail },
    ),
    schedule: sectionChanged(
      { firstServiceDate: watchedValues.firstServiceDate, events: watchedValues.events },
      initialValues && { firstServiceDate: initialValues.firstServiceDate, events: initialValues.events },
    ),
    services: sectionChanged(watchedValues.lineItems, initialValues?.lineItems),
    payment: sectionChanged(
      {
        status: watchedValues.status,
        contractTemplateId: watchedValues.contractTemplateId,
        balanceDueDate: watchedValues.balanceDueDate,
        paymentMethod: watchedValues.paymentMethod,
        retainerAmount: watchedValues.retainerAmount,
        earlyMorningFee: watchedValues.earlyMorningFee,
        travelFee: watchedValues.travelFee,
      },
      initialValues && {
        status: initialValues.status,
        contractTemplateId: initialValues.contractTemplateId,
        balanceDueDate: initialValues.balanceDueDate,
        paymentMethod: initialValues.paymentMethod,
        retainerAmount: initialValues.retainerAmount,
        earlyMorningFee: initialValues.earlyMorningFee,
        travelFee: initialValues.travelFee,
      },
    ),
    notes: sectionChanged(watchedValues.notes, initialValues?.notes),
  };
  const hasChanges = Object.values(changed).some(Boolean);
  const isLocked = Boolean(booking && (booking.status !== "draft" || booking.signedAt));
  const canMoveToDraft = Boolean(booking && booking.status !== "draft" && !booking.signedAt);

  function restoreSection(section: keyof typeof changed) {
    if (!initialValues) return;
    if (section === "client") {
      form.setValue("clientName", initialValues.clientName);
      form.setValue("clientEmail", initialValues.clientEmail);
      form.setValue("clientPhone", initialValues.clientPhone);
      form.setValue("clientNotes", initialValues.clientNotes);
      form.setValue("eventType", initialValues.eventType);
    }
    if (section === "location") {
      form.setValue("location", initialValues.location);
      form.setValue("locationDetail", initialValues.locationDetail);
    }
    if (section === "schedule") {
      form.setValue("firstServiceDate", initialValues.firstServiceDate);
      replaceEvents(initialValues.events);
    }
    if (section === "services") {
      replaceLineItems(initialValues.lineItems);
    }
    if (section === "payment") {
      form.setValue("status", initialValues.status);
      form.setValue("contractTemplateId", initialValues.contractTemplateId);
      form.setValue("balanceDueDate", initialValues.balanceDueDate);
      form.setValue("paymentMethod", initialValues.paymentMethod);
      form.setValue("retainerAmount", initialValues.retainerAmount);
      form.setValue("earlyMorningFee", initialValues.earlyMorningFee);
      form.setValue("travelFee", initialValues.travelFee);
    }
    if (section === "notes") {
      form.setValue("notes", initialValues.notes);
    }
  }

  function appendCatalogLineItem(item: ServiceItem) {
    appendLineItem({
      serviceItemId: item.id,
      eventId: "booking",
      name: item.name,
      description: item.description ?? "",
      kind: item.kind,
      quantity: 1,
      unitPrice: item.defaultUnitPrice,
      unitLabel: item.unitLabel,
      calculationNote: item.kind === "fee" ? item.description ?? "" : `1 ${item.name} @ $${item.defaultUnitPrice}`,
      sortOrder: currentLineItems.length * 10,
    });
    setSelectedServiceItemId("");
  }

  function appendCustomLineItem(kind: "service" | "fee") {
    appendLineItem({
      eventId: "booking",
      name: kind === "fee" ? "Custom Fee" : "Custom Service",
      description: "",
      kind,
      quantity: 1,
      unitPrice: 0,
      unitLabel: kind === "fee" ? "booking" : "person",
      calculationNote: "",
      sortOrder: currentLineItems.length * 10,
    });
  }

  async function moveToDraft() {
    if (!booking) return;
    try {
      await updateBooking.mutateAsync({ id: booking.id, data: { status: "draft" } });
      await queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(booking.id) });
      await queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
      toast({ title: "Booking moved back to draft" });
    } catch {
      toast({ title: "Failed to move booking to draft", variant: "destructive" });
    }
  }

  async function onSubmit(data: EditBookingFormValues) {
    if (!booking || !initialValues || isLocked) return;
    setIsSaving(true);

    try {
      const clientPhone = nullableText(formatUSPhone(data.clientPhone ?? ""));
      const clientUpdate = {
        name: data.clientName.trim(),
        email: data.clientEmail.trim(),
        phone: clientPhone,
        notes: nullableText(data.clientNotes),
      };
      const originalClientUpdate = {
        name: initialValues.clientName.trim(),
        email: initialValues.clientEmail.trim(),
        phone: nullableText(formatUSPhone(initialValues.clientPhone ?? "")),
        notes: nullableText(initialValues.clientNotes),
      };

      if (!isSameValue(clientUpdate, originalClientUpdate)) {
        await updateClient.mutateAsync({ id: booking.clientId, data: clientUpdate });
      }

      const bookingUpdate = {
        contractTemplateId: Number(data.contractTemplateId),
        eventType: data.eventType.trim(),
        status: data.status,
        location: data.location.trim(),
        locationDetail: nullableText(data.locationDetail),
        firstServiceDate: nullableText(data.firstServiceDate),
        balanceDueDate: nullableText(data.balanceDueDate),
        paymentMethod: nullableText(data.paymentMethod),
        retainerAmount: Number(data.retainerAmount || 0),
        earlyMorningFee: Number(data.earlyMorningFee || 0),
        travelFee: Number(data.travelFee || 0),
        notes: nullableText(data.notes),
      };
      const originalBookingUpdate = {
        contractTemplateId: Number(initialValues.contractTemplateId),
        eventType: initialValues.eventType.trim(),
        status: initialValues.status,
        location: initialValues.location.trim(),
        locationDetail: nullableText(initialValues.locationDetail),
        firstServiceDate: nullableText(initialValues.firstServiceDate),
        balanceDueDate: nullableText(initialValues.balanceDueDate),
        paymentMethod: nullableText(initialValues.paymentMethod),
        retainerAmount: Number(initialValues.retainerAmount || 0),
        earlyMorningFee: Number(initialValues.earlyMorningFee || 0),
        travelFee: Number(initialValues.travelFee || 0),
        notes: nullableText(initialValues.notes),
      };

      if (!isSameValue(bookingUpdate, originalBookingUpdate)) {
        await updateBooking.mutateAsync({ id: booking.id, data: bookingUpdate });
      }

      const originalEventIds = new Set(initialValues.events.map((event) => event.id).filter(Boolean) as number[]);
      const currentEventIds = new Set(data.events.map((event) => event.id).filter(Boolean) as number[]);
      for (const originalId of originalEventIds) {
        if (!currentEventIds.has(originalId)) {
          await deleteEvent.mutateAsync({ id: booking.id, eventId: originalId });
        }
      }
      for (const [index, event] of data.events.entries()) {
        const updatePayload = eventUpdatePayload(event, index);
        if (event.id) {
          const original = initialValues.events.find((item) => item.id === event.id);
          if (!original || !isSameValue(updatePayload, eventUpdatePayload(original, index))) {
            await updateEvent.mutateAsync({ id: booking.id, eventId: event.id, data: updatePayload });
          }
        } else {
          await createEvent.mutateAsync({
            id: booking.id,
            data: {
              kind: event.kind,
              eventName: event.eventName.trim(),
              eventDate: event.eventDate,
              servicesBegin: optionalText(event.servicesBegin),
              completionTarget: optionalText(event.completionTarget),
              sortOrder: index * 10,
            },
          });
        }
      }

      const originalLineItemIds = new Set(initialValues.lineItems.map((item) => item.id).filter(Boolean) as number[]);
      const currentLineItemIds = new Set(data.lineItems.map((item) => item.id).filter(Boolean) as number[]);
      for (const originalId of originalLineItemIds) {
        if (!currentLineItemIds.has(originalId)) {
          await deleteLineItem.mutateAsync({ id: booking.id, lineItemId: originalId });
        }
      }
      for (const [index, item] of data.lineItems.entries()) {
        const updatePayload = lineItemUpdatePayload(item, index);
        if (item.id) {
          const original = initialValues.lineItems.find((lineItem) => lineItem.id === item.id);
          if (!original || !isSameValue(updatePayload, lineItemUpdatePayload(original, index))) {
            await updateLineItem.mutateAsync({ id: booking.id, lineItemId: item.id, data: updatePayload });
          }
        } else {
          await createLineItem.mutateAsync({
            id: booking.id,
            data: {
              serviceItemId: item.serviceItemId ?? undefined,
              eventId: parseEventId(item.eventId) ?? undefined,
              name: item.name.trim(),
              description: optionalText(item.description),
              kind: item.kind,
              quantity: Number(item.quantity || 0),
              unitPrice: Number(item.unitPrice || 0),
              unitLabel: item.unitLabel.trim(),
              calculationNote: optionalText(item.calculationNote),
              sortOrder: index * 10,
            },
          });
        }
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(booking.id) }),
        queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetClientQueryKey(booking.clientId) }),
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() }),
      ]);
      toast({ title: "Booking changes saved" });
      setLocation(`/bookings/${booking.id}`);
    } catch {
      toast({ title: "Failed to save booking changes", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }

  if (loadingBooking || (booking && !initialValues)) {
    return (
      <Shell>
        <div className="space-y-6">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Shell>
    );
  }

  if (!booking || !initialValues) {
    return (
      <Shell>
        <div className="crm-section mx-auto max-w-xl p-10 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Booking not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">The booking record could not be loaded.</p>
          <Button asChild className="mt-6" variant="outline">
            <Link href="/bookings">Return to bookings</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mx-auto max-w-4xl space-y-7 pb-20">
        <div>
          <Link
            href={`/bookings/${booking.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
            data-testid="link-back-booking-detail"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to booking
          </Link>
          <div className="mt-5">
            <span className="crm-eyebrow">Schedule · Edit intake</span>
            <h1 className="crm-page-title mt-2">Edit booking</h1>
            <p className="crm-page-subtitle">
              Review and update the full booking intake for {booking.clientName}. Changed sections are highlighted before save.
            </p>
            <div className="crm-gold-rule mt-6 w-24" />
          </div>
        </div>

        {isLocked ? (
          <div className="rounded-xl border border-amber-400/60 bg-amber-50/70 p-4 text-sm text-amber-900 dark:bg-amber-400/10 dark:text-amber-200">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <div className="font-semibold">Protected booking</div>
                  <p className="mt-1">
                    {booking.signedAt
                      ? "This booking has a signed contract, so intake editing is locked. Keep contract-impacting changes deliberate."
                      : "This booking is not a draft. Move it back to draft before editing contract-impacting details."}
                  </p>
                </div>
              </div>
              {canMoveToDraft ? (
                <Button type="button" variant="outline" onClick={moveToDraft} disabled={updateBooking.isPending}>
                  Move to draft
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-7">
            <fieldset disabled={isLocked || isSaving} className="space-y-7 disabled:opacity-75">
              <SectionShell
                step="Step 1 · Client & event"
                title="Client contact & event details"
                changed={changed.client}
                onRestore={() => restoreSection("client")}
              >
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <FormField control={form.control} name="clientName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Name *</FormLabel>
                      <FormControl><Input {...field} data-testid="input-edit-client-name" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="clientEmail" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Email *</FormLabel>
                      <FormControl><Input type="email" {...field} data-testid="input-edit-client-email" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="clientPhone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Phone</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(event) => field.onChange(formatUSPhoneInput(event.target.value))}
                          data-testid="input-edit-client-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="eventType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Type *</FormLabel>
                      <FormControl><Input {...field} data-testid="input-edit-event-type" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="clientNotes" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Client Notes</FormLabel>
                      <FormControl><Textarea className="min-h-[90px]" {...field} data-testid="textarea-edit-client-notes" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </SectionShell>

              <SectionShell
                step="Step 2 · Location"
                title="Location"
                changed={changed.location}
                onRestore={() => restoreSection("location")}
              >
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <FormField control={form.control} name="location" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Main Location / Venue *</FormLabel>
                      <FormControl><Input {...field} data-testid="input-edit-location" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="locationDetail" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Room Number / Specific Instructions</FormLabel>
                      <FormControl><Input {...field} data-testid="input-edit-location-detail" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </SectionShell>

              <SectionShell
                step="Step 3 · Schedule"
                title="Service schedule"
                detail="Edit the booking date, event rows, trial rows, and service timing."
                changed={changed.schedule}
                onRestore={() => restoreSection("schedule")}
              >
                <FormField control={form.control} name="firstServiceDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Service Date</FormLabel>
                    <FormControl><Input type="date" {...field} data-testid="input-edit-first-service-date" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="space-y-4">
                  {eventFields.map((field, index) => (
                    <div key={field.id} className="rounded-xl border border-card-border/70 bg-accent/15 p-4 sm:p-5">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <Badge variant="outline">Event {index + 1}</Badge>
                        <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => removeEvent(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <FormField control={form.control} name={`events.${index}.kind`} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Kind</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="event">Event</SelectItem>
                                <SelectItem value="trial">Makeup trial</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name={`events.${index}.eventDate`} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date</FormLabel>
                            <FormControl><Input type="date" {...field} data-testid={`input-edit-event-date-${index}`} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name={`events.${index}.eventName`} render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Event Name</FormLabel>
                            <FormControl><Input {...field} data-testid={`input-edit-event-name-${index}`} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name={`events.${index}.servicesBegin`} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Services Begin</FormLabel>
                            <FormControl><TimePartsInput value={field.value} onChange={field.onChange} testIdPrefix={`input-edit-event-begin-${index}`} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name={`events.${index}.completionTarget`} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Completion Target</FormLabel>
                            <FormControl><TimePartsInput value={field.value} onChange={field.onChange} testIdPrefix={`input-edit-event-complete-${index}`} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => appendEvent({
                      kind: "event",
                      eventName: "",
                      eventDate: watchedValues.firstServiceDate || "",
                      servicesBegin: "",
                      completionTarget: "",
                      sortOrder: currentEvents.length * 10,
                    })}
                    data-testid="btn-edit-add-event"
                  >
                    <Plus className="h-4 w-4" />
                    Add event or trial
                  </Button>
                </div>
              </SectionShell>

              <SectionShell
                step="Step 4 · Services"
                title="Services & fees"
                detail="Selected booking charges are editable here before the contract is active."
                changed={changed.services}
                onRestore={() => restoreSection("services")}
              >
                <div className="flex flex-col gap-3 lg:flex-row">
                  <Select value={selectedServiceItemId} onValueChange={setSelectedServiceItemId} disabled={loadingServiceItems}>
                    <SelectTrigger className="flex-1" data-testid="select-edit-service-item">
                      <SelectValue placeholder={loadingServiceItems ? "Loading services..." : "Choose service or fee"} />
                    </SelectTrigger>
                    <SelectContent>
                      {activeServiceItems.map((item) => (
                        <SelectItem key={item.id} value={String(item.id)}>
                          {item.name} - ${item.defaultUnitPrice} / {item.unitLabel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" onClick={() => selectedServiceItem && appendCatalogLineItem(selectedServiceItem)} disabled={!selectedServiceItem}>
                    <Plus className="h-4 w-4" />
                    Add selected
                  </Button>
                  <Button type="button" variant="outline" onClick={() => appendCustomLineItem("service")}>Custom service</Button>
                  <Button type="button" variant="outline" onClick={() => appendCustomLineItem("fee")}>Custom fee</Button>
                </div>
                <div className="space-y-4">
                  {lineItemFields.length > 0 ? lineItemFields.map((field, index) => {
                    const current = currentLineItems[index];
                    return (
                      <div key={field.id} className="space-y-4 rounded-xl border border-card-border/70 bg-accent/15 p-4 sm:p-5" data-testid={`edit-line-item-${index}`}>
                        <div className="flex items-center justify-between gap-3">
                          <Badge variant={current?.kind === "fee" ? "secondary" : "outline"}>{current?.kind === "fee" ? "Fee" : "Service"}</Badge>
                          <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => removeLineItem(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_130px]">
                          <FormField control={form.control} name={`lineItems.${index}.name`} render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl><Input {...field} data-testid={`input-edit-line-name-${index}`} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name={`lineItems.${index}.kind`} render={({ field }) => (
                            <FormItem>
                              <FormLabel>Type</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                  <SelectItem value="service">Service</SelectItem>
                                  <SelectItem value="fee">Fee</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-[100px_120px_120px_1fr]">
                          <FormField control={form.control} name={`lineItems.${index}.quantity`} render={({ field }) => (
                            <FormItem>
                              <FormLabel>Qty</FormLabel>
                              <FormControl><Input type="number" min="0" step="0.01" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name={`lineItems.${index}.unitPrice`} render={({ field }) => (
                            <FormItem>
                              <FormLabel>Rate ($)</FormLabel>
                              <FormControl><Input type="number" min="0" step="0.01" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name={`lineItems.${index}.unitLabel`} render={({ field }) => (
                            <FormItem>
                              <FormLabel>Unit</FormLabel>
                              <FormControl><Input {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name={`lineItems.${index}.calculationNote`} render={({ field }) => (
                            <FormItem>
                              <FormLabel>Contract Calculation</FormLabel>
                              <FormControl><Input {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:items-end">
                          <FormField control={form.control} name={`lineItems.${index}.eventId`} render={({ field }) => (
                            <FormItem>
                              <FormLabel>Event Assignment</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                  <SelectItem value="booking">Booking-level</SelectItem>
                                  {booking.events.map((event) => (
                                    <SelectItem key={event.id} value={String(event.id)}>{event.eventName}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <div className="rounded-lg border border-card-border bg-card px-4 py-2 text-right">
                            <div className="crm-eyebrow !text-[10px]">Line total</div>
                            <div className="font-serif text-lg tabular-nums">${lineItemTotal(current).toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="rounded-xl border border-dashed border-card-border bg-accent/10 p-8 text-center text-sm text-muted-foreground">
                      No services or fees are attached to this booking.
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 border-t border-card-border/60 pt-5 md:grid-cols-3">
                  <SummaryTile label="Services & fees" value={servicesTotal} />
                  <SummaryTile label="Estimated retainer" value={estimatedRetainer} />
                  <SummaryTile label="Estimated balance" value={Math.max(0, totalWithFees - estimatedRetainer)} tone="primary" />
                </div>
              </SectionShell>

              <SectionShell
                step="Step 5 · Payment"
                title="Payment details"
                changed={changed.payment}
                onRestore={() => restoreSection("payment")}
              >
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <FormField control={form.control} name="contractTemplateId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contract</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={loadingContractTemplates}>
                        <FormControl><SelectTrigger data-testid="select-edit-contract"><SelectValue placeholder="Select contract" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {(contractTemplates ?? []).filter((contract) => contract.active || String(contract.id) === initialValues.contractTemplateId).map((contract) => (
                            <SelectItem key={contract.id} value={String(contract.id)}>
                              {contract.name}{contract.isDefault ? " (Default)" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger data-testid="select-edit-status"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="balanceDueDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Balance Due Date</FormLabel>
                      <FormControl><Input type="date" {...field} data-testid="input-edit-balance-due-date" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <FormControl><Input placeholder="e.g. Zelle, Venmo, Cash" {...field} data-testid="input-edit-payment-method" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="retainerAmount" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Retainer Amount ($)</FormLabel>
                      <FormControl><Input type="number" min="0" step="0.01" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="earlyMorningFee" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Early Morning Fee ($)</FormLabel>
                      <FormControl><Input type="number" min="0" step="0.01" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="travelFee" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Travel Fee ($)</FormLabel>
                      <FormControl><Input type="number" min="0" step="0.01" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </SectionShell>

              <SectionShell
                step="Step 6 · Internal"
                title="Internal booking notes"
                changed={changed.notes}
                onRestore={() => restoreSection("notes")}
              >
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl><Textarea className="min-h-[120px] resize-y" {...field} data-testid="textarea-edit-booking-notes" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </SectionShell>
            </fieldset>

            <div className="sticky bottom-4 z-[1] flex flex-col gap-3 rounded-xl border border-card-border bg-card/95 p-3 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                {hasChanges ? "Unsaved changes are highlighted above." : "No changes yet."}
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button asChild type="button" variant="ghost">
                  <Link href={`/bookings/${booking.id}`}>Cancel</Link>
                </Button>
                {hasChanges ? (
                  <Button type="button" variant="outline" onClick={() => form.reset(initialValues)} disabled={isLocked || isSaving}>
                    <RotateCcw className="h-4 w-4" />
                    Restore all
                  </Button>
                ) : null}
                <Button
                  type="submit"
                  disabled={!hasChanges || isLocked || isSaving}
                  data-testid="button-save-booking-edit"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving changes..." : "Save changes"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </Shell>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: number; tone?: "primary" }) {
  return (
    <div className={cn("rounded-xl border border-card-border bg-card p-4", tone === "primary" && "border-primary/20 bg-[linear-gradient(155deg,hsl(var(--accent)/0.55)_0%,hsl(var(--card))_55%)]")}>
      <div className="crm-eyebrow !text-[10px]">{label}</div>
      <div className="mt-1.5 font-serif text-2xl text-foreground tabular-nums">
        ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </div>
    </div>
  );
}
