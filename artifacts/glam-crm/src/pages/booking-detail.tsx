import { Shell } from "@/components/layout/Shell";
import {
  useGetBooking,
  useUpdateBooking,
  useDeleteBooking,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  useListServiceItems,
  useCreateBookingLineItem,
  useUpdateBookingLineItem,
  useDeleteBookingLineItem,
  useRecordPayment,
  useDeletePayment,
  useUpdateClient,
  useListContractTemplates,
  getGetBookingQueryKey,
  getListBookingsQueryKey,
  getListClientsQueryKey,
  getGetClientQueryKey,
  type BookingLineItem,
  type ServiceItem
} from "@workspace/api-client-react";
import { useRoute } from "wouter";
import { ArrowLeft, Printer, CheckCircle, CreditCard, Calendar, Plus, Trash2, Edit, History, GripVertical } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo, useState } from "react";
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

function formatMoney(value: number) {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function optionalText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function toDateInputValue(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

type GroupedLineItem = {
  key: string;
  eventId: number | null;
  eventName: string;
  items: BookingLineItem[];
  representativeItem: BookingLineItem;
  totalQuantity: number;
  totalAmount: number;
  sortOrder: number;
};

export default function BookingDetail() {
  const [, params] = useRoute("/bookings/:id");
  const id = parseInt(params?.id || "0", 10);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: booking, isLoading } = useGetBooking(id, { query: { enabled: !!id, queryKey: getGetBookingQueryKey(id) } });
  const updateBooking = useUpdateBooking();
  const deleteBooking = useDeleteBooking();
  const updateEvent = useUpdateEvent();
  const { data: serviceItems, isLoading: loadingServiceItems } = useListServiceItems();
  const { data: contractTemplates } = useListContractTemplates();
  const createLineItem = useCreateBookingLineItem();
  const updateLineItem = useUpdateBookingLineItem();
  const deleteLineItem = useDeleteBookingLineItem();
  const [selectedServiceItemId, setSelectedServiceItemId] = useState("");
  const [mutatingGroupKey, setMutatingGroupKey] = useState<string | null>(null);
  const [queuedSplitLineItemIds, setQueuedSplitLineItemIds] = useState<number[]>([]);
  const [expandedLineItemGroupKeys, setExpandedLineItemGroupKeys] = useState<string[]>([]);
  const [draggedEventId, setDraggedEventId] = useState<number | null>(null);
  const [draggedLineItemGroupKey, setDraggedLineItemGroupKey] = useState<string | null>(null);
  const lineItems = booking?.lineItems ?? [];
  const events = booking?.events ?? [];

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

  const earlyMorningFee = booking?.earlyMorningFee ?? 0;
  const travelFee = booking?.travelFee ?? 0;
  const activeServiceItems = serviceItems?.filter((item) => item.active) ?? [];
  const selectedServiceItem = activeServiceItems.find((item) => item.id.toString() === selectedServiceItemId);
  const groupedLineItems = useMemo(() => {
    const groups = new Map<string, GroupedLineItem>();
    if (!booking) {
      return [];
    }

    for (const item of lineItems) {
      const eventId = item.eventId ?? null;
      const eventName = eventId == null
        ? "Booking-level"
        : events.find((event) => event.id === eventId)?.eventName ?? "Event not found";
      const key = `${item.kind}|${item.serviceItemId ?? "custom"}|${item.name}|${item.description ?? ""}|${item.unitPrice}|${item.unitLabel}|${item.calculationNote ?? ""}|${item.eventId ?? "booking"}`;

      const existing = groups.get(key);
      if (!existing) {
        groups.set(key, {
          key,
          eventId,
          eventName,
          items: [item],
          representativeItem: item,
          totalQuantity: item.quantity,
          totalAmount: lineItemAmount(item),
          sortOrder: item.sortOrder,
        });
      } else {
        existing.items.push(item);
        existing.totalQuantity += item.quantity;
        existing.totalAmount += lineItemAmount(item);
        existing.sortOrder = Math.min(existing.sortOrder, item.sortOrder);
      }
    }

    return [...groups.values()]
      .map((group) => {
        const authoritativeQuantityItem = group.items.find((item) => item.quantity > 1);
        if (!authoritativeQuantityItem) {
          return group;
        }

        return {
          ...group,
          representativeItem: authoritativeQuantityItem,
          totalQuantity: authoritativeQuantityItem.quantity,
          totalAmount: lineItemAmount(authoritativeQuantityItem),
        };
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [booking, lineItems, events]);
  const lineItemsTotal = groupedLineItems.reduce((sum, group) => sum + group.totalAmount, 0);
  const eventsTotal = events.reduce((sum, event) => sum + event.subtotal, 0);
  const effectiveGrandTotal = eventsTotal + lineItemsTotal + earlyMorningFee + travelFee;
  const effectiveRetainerAmount = effectiveGrandTotal * 0.25;
  const effectiveRetainerCredit = booking?.retainerPaid ? effectiveRetainerAmount : 0;
  const effectiveBalanceDue = Math.max(0, effectiveGrandTotal - effectiveRetainerCredit);
  const displayedLineItemGroups = useMemo(() => {
    return groupedLineItems.flatMap((group) => {
      if (!expandedLineItemGroupKeys.includes(group.key)) {
        return [group];
      }

      return group.items.map((item) => ({
        ...group,
        key: `${group.key}|line-item:${item.id}`,
        items: [item],
        representativeItem: item,
        totalQuantity: item.quantity,
        totalAmount: lineItemAmount(item),
        sortOrder: item.sortOrder,
      }));
    });
  }, [groupedLineItems, expandedLineItemGroupKeys]);

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

  const performLineItemSplit = async (lineItem: BookingLineItem) => {
    if (!Number.isInteger(lineItem.quantity) || lineItem.quantity <= 1) {
      toast({
        title: "Split requires a whole number above 1",
        variant: "destructive",
      });
      return;
    }

    await updateLineItem.mutateAsync({
      id,
      lineItemId: lineItem.id,
      data: { quantity: 1 },
    });
    for (let index = 0; index < lineItem.quantity - 1; index += 1) {
      await createLineItem.mutateAsync({
        id,
        data: {
          serviceItemId: lineItem.serviceItemId ?? undefined,
          eventId: lineItem.eventId ?? undefined,
          name: lineItem.name,
          description: optionalText(lineItem.description ?? undefined),
          kind: lineItem.kind,
          quantity: 1,
          unitPrice: lineItem.unitPrice,
          unitLabel: lineItem.unitLabel,
          calculationNote: optionalText(lineItem.calculationNote ?? undefined),
          sortOrder: (lineItem.sortOrder ?? 0) + index + 1,
        },
      });
    }
  };

  const handleLineItemSplit = async (lineItem: BookingLineItem, groupKey: string) => {
    if (mutatingGroupKey !== null) return;
    setMutatingGroupKey(`split:${lineItem.id}`);

    try {
      await performLineItemSplit(lineItem);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(id) }),
        queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() }),
      ]);
      setExpandedLineItemGroupKeys((current) => (
        current.includes(groupKey) ? current : [...current, groupKey]
      ));
      toast({ title: "Split applied. You can now assign each item individually." });
    } catch {
      toast({ title: "Failed to split service or fee", variant: "destructive" });
    } finally {
      setMutatingGroupKey(null);
    }
  };

  const handleApplyPendingSplits = async () => {
    if (queuedSplitLineItemIds.length === 0 || mutatingGroupKey !== null) return;
    setMutatingGroupKey("save:line-items");
    const pendingIds = [...queuedSplitLineItemIds];
    const failed: number[] = [];
    let totalSplits = 0;

    try {
      for (const lineItemId of pendingIds) {
        const lineItem = lineItems.find((item) => item.id === lineItemId);
        if (!lineItem) {
          failed.push(lineItemId);
          continue;
        }
        try {
          await performLineItemSplit(lineItem);
          totalSplits += 1;
        } catch {
          failed.push(lineItemId);
        }
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(id) }),
        queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() }),
      ]);

      if (failed.length === 0) {
        setQueuedSplitLineItemIds([]);
        toast({ title: `Applied ${totalSplits} split action${totalSplits === 1 ? "" : "s"}.` });
      } else if (totalSplits > 0) {
        setQueuedSplitLineItemIds(failed);
        toast({
          title: "Some split actions could not be applied",
          description: "The remaining changes are still queued. You can try Save again.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Unable to apply split actions", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to apply split actions", variant: "destructive" });
    } finally {
      setMutatingGroupKey(null);
    }
  };

  const handleGroupedLineItemEventChange = async (group: GroupedLineItem, eventId: string) => {
    const nextEventId = eventId === "booking" ? null : Number(eventId);
    if (mutatingGroupKey !== null) return;
    setMutatingGroupKey(`event:${group.key}`);
    try {
      for (const item of group.items) {
        await updateLineItem.mutateAsync({
          id,
          lineItemId: item.id,
          data: { eventId: nextEventId },
        });
      }
      queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(id) });
      toast({ title: "Service assignments updated" });
    } catch {
      toast({ title: "Failed to update service assignments", variant: "destructive" });
    } finally {
      setMutatingGroupKey(null);
    }
  };

  const handleGroupedLineItemDelete = async (group: GroupedLineItem) => {
    const confirmMessage = group.items.length === 1
      ? "Remove this service or fee from the booking?"
      : `Remove ${group.totalQuantity} units of ${group.representativeItem.name} from the booking?`;

    if (!confirm(confirmMessage)) return;
    if (mutatingGroupKey !== null) return;
    setMutatingGroupKey(`delete:${group.key}`);

    try {
      for (const item of group.items) {
        await deleteLineItem.mutateAsync({ id, lineItemId: item.id });
      }
      queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
      toast({ title: "Service or fee removed" });
    } catch {
      toast({ title: "Failed to remove service or fee", variant: "destructive" });
    } finally {
      setMutatingGroupKey(null);
    }
  };

  const handleEventDrop = async (targetEventId: number) => {
    if (!draggedEventId || draggedEventId === targetEventId || mutatingGroupKey !== null) return;
    const currentIndex = events.findIndex((event) => event.id === draggedEventId);
    const targetIndex = events.findIndex((event) => event.id === targetEventId);
    if (currentIndex < 0 || targetIndex < 0) return;

    const nextEvents = [...events];
    const [draggedEvent] = nextEvents.splice(currentIndex, 1);
    nextEvents.splice(targetIndex, 0, draggedEvent);

    setMutatingGroupKey("event-reorder");
    try {
      for (const [index, event] of nextEvents.entries()) {
        await updateEvent.mutateAsync({
          id,
          eventId: event.id,
          data: { sortOrder: index * 10 },
        });
      }
      queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
      toast({ title: "Event order updated" });
    } catch {
      toast({ title: "Failed to reorder events", variant: "destructive" });
    } finally {
      setDraggedEventId(null);
      setMutatingGroupKey(null);
    }
  };

  const handleLineItemGroupDrop = async (targetGroupKey: string) => {
    if (!draggedLineItemGroupKey || draggedLineItemGroupKey === targetGroupKey || mutatingGroupKey !== null) return;
    const currentIndex = displayedLineItemGroups.findIndex((group) => group.key === draggedLineItemGroupKey);
    const targetIndex = displayedLineItemGroups.findIndex((group) => group.key === targetGroupKey);
    if (currentIndex < 0 || targetIndex < 0) return;

    const nextGroups = [...displayedLineItemGroups];
    const [draggedGroup] = nextGroups.splice(currentIndex, 1);
    nextGroups.splice(targetIndex, 0, draggedGroup);

    setMutatingGroupKey("line-item-reorder");
    try {
      let nextSortOrder = 0;
      for (const group of nextGroups) {
        for (const item of group.items) {
          await updateLineItem.mutateAsync({
            id,
            lineItemId: item.id,
            data: { sortOrder: nextSortOrder },
          });
          nextSortOrder += 10;
        }
      }
      queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
      toast({ title: "Service and fee order updated" });
    } catch {
      toast({ title: "Failed to reorder services and fees", variant: "destructive" });
    } finally {
      setDraggedLineItemGroupKey(null);
      setMutatingGroupKey(null);
    }
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
                <BookingMetaDialog
                  bookingId={id}
                  bookingClientName={booking.clientName}
                  bookingClientId={booking.clientId}
                  contractTemplateId={booking.contractTemplateId ?? null}
                  contractTemplates={contractTemplates ?? []}
                  eventType={booking.eventType}
                  location={booking.location}
                  firstServiceDate={booking.firstServiceDate ?? null}
                  primaryEventId={booking.events[0]?.id}
                  primaryEventName={booking.events[0]?.eventName}
                />
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
                {booking.events.map((event) => (
                  <div
                    key={event.id}
                    draggable={mutatingGroupKey === null}
                    onDragStart={() => setDraggedEventId(event.id)}
                    onDragOver={(dragEvent) => dragEvent.preventDefault()}
                    onDrop={() => handleEventDrop(event.id)}
                    onDragEnd={() => setDraggedEventId(null)}
                    className={`bg-card border rounded-lg p-5 shadow-sm ${draggedEventId === event.id ? "opacity-60" : ""}`}
                    data-testid={`event-card-${event.id}`}
                  >
                    <div className="flex justify-between items-start mb-4 pb-4 border-b">
                      <div className="flex min-w-0 gap-3">
                        <div className="mt-1 cursor-grab text-muted-foreground active:cursor-grabbing" aria-label="Drag to reorder event">
                          <GripVertical className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-serif text-lg text-primary">{event.eventName}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{format(parseISO(event.eventDate), "EEEE, MMMM d, yyyy")}</span>
                          </div>
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

                  {groupedLineItems.length > 0 ? (
                <div className="space-y-3">
                  {displayedLineItemGroups.map((group) => {
                    const splitCandidate = group.items.find((item) => item.quantity > 1);
                    const canShowSplit = group.totalQuantity > 1;

                    return (
                    <div
                      key={group.key}
                      draggable={mutatingGroupKey === null}
                      onDragStart={() => setDraggedLineItemGroupKey(group.key)}
                      onDragOver={(dragEvent) => dragEvent.preventDefault()}
                      onDrop={() => handleLineItemGroupDrop(group.key)}
                      onDragEnd={() => setDraggedLineItemGroupKey(null)}
                      className={`grid grid-cols-1 gap-3 text-sm border rounded-md p-3 lg:grid-cols-[1fr_140px_220px_auto_auto_auto] lg:items-center ${draggedLineItemGroupKey === group.key ? "opacity-60" : ""}`}
                    >
                      <div className="flex min-w-0 gap-3">
                        <div className="mt-0.5 cursor-grab text-muted-foreground active:cursor-grabbing" aria-label="Drag to reorder service or fee">
                          <GripVertical className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-foreground">
                            {group.eventId ? `${group.totalQuantity} × ${group.representativeItem.name}` : `${group.totalQuantity} × ${group.representativeItem.name}`}
                          </div>
                          {group.representativeItem.description && (
                            <div className="text-muted-foreground mt-1">
                              {group.representativeItem.description}
                            </div>
                          )}
                          {group.items.length > 1 ? (
                            <div className="mt-1 text-xs text-muted-foreground">
                              Assigned in {group.items.length} line entries
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div className="text-muted-foreground">
                        {group.totalQuantity} x ${group.representativeItem.unitPrice}
                      </div>
                      <div>
                        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Event</div>
                        <Select
                          value={group.eventId ? String(group.eventId) : "booking"}
                          onValueChange={(value) => handleGroupedLineItemEventChange(group, value)}
                          disabled={updateLineItem.isPending || mutatingGroupKey === `event:${group.key}`}
                        >
                          <SelectTrigger data-testid={`select-line-item-event-${group.key}`}>
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
                      <div className="font-serif text-right">${group.totalAmount.toLocaleString()}</div>
                        <div className="flex justify-end gap-1">
                        {canShowSplit ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => {
                              if (!splitCandidate) {
                                setExpandedLineItemGroupKeys((current) => (
                                  current.includes(group.key) ? current : [...current, group.key]
                                ));
                                return;
                              }
                              handleLineItemSplit(splitCandidate, group.key);
                            }}
                            disabled={
                              createLineItem.isPending ||
                              updateLineItem.isPending ||
                              deleteLineItem.isPending ||
                              mutatingGroupKey === `split:${splitCandidate?.id}`
                            }
                            data-testid={`btn-split-line-item-${group.key}`}
                          >
                            {splitCandidate && mutatingGroupKey === `split:${splitCandidate.id}` ? "Splitting..." : "Split"}
                          </Button>
                        ) : null}
                          <LineItemDialog
                              bookingId={id}
                              events={booking.events}
                              lineItem={group.representativeItem}
                              trigger={<Button type="button" variant="outline" size="sm" className="h-8 px-2" data-testid={`btn-edit-line-item-${group.key}`}><Edit className="w-3.5 h-3.5 mr-1" /> Edit</Button>}
                            />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleGroupedLineItemDelete(group)}
                          disabled={deleteLineItem.isPending || mutatingGroupKey === `delete:${group.key}`}
                          data-testid={`btn-delete-line-item-${group.key}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="border rounded-md border-dashed p-6 text-center text-muted-foreground">
                  No booking intake line items were added.
                </div>
              )}

              {queuedSplitLineItemIds.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2 items-center">
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={handleApplyPendingSplits}
                    disabled={queuedSplitLineItemIds.length === 0 || mutatingGroupKey !== null}
                    data-testid="btn-apply-split-changes"
                  >
                    Save line item changes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setQueuedSplitLineItemIds([])}
                    disabled={mutatingGroupKey !== null}
                  >
                    Discard queued changes
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {queuedSplitLineItemIds.length} split change{queuedSplitLineItemIds.length === 1 ? "" : "s"} queued
                  </span>
                </div>
              ) : null}
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
                        <div className="text-sm text-muted-foreground">{formatMoney(effectiveRetainerAmount)} required to secure date</div>
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
                        <div className="text-sm text-muted-foreground">{formatMoney(effectiveBalanceDue)} due {booking.balanceDueDate ? `on ${format(parseISO(booking.balanceDueDate), "MMM d")}` : ""}</div>
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
                            <span className="font-medium font-serif">{formatMoney(payment.amount)}</span>
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
                        <span>{formatMoney(event.subtotal)}</span>
                      </div>
                    ))}

                    {groupedLineItems.map((group) => (
                      <div key={group.key} className="flex justify-between gap-3">
                        <span className="text-muted-foreground">{group.representativeItem.name}</span>
                        <span>{formatMoney(group.totalAmount)}</span>
                      </div>
                    ))}
                    
                    {earlyMorningFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Early Morning Fee</span>
                        <span>{formatMoney(earlyMorningFee)}</span>
                      </div>
                    )}
                    
                    {travelFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Travel Fee</span>
                        <span>{formatMoney(travelFee)}</span>
                      </div>
                    )}
                    
                    <div className="pt-4 mt-4 border-t border-border flex justify-between font-serif text-xl text-foreground">
                      <span>Grand Total</span>
                      <span data-testid="text-grand-total">{formatMoney(effectiveGrandTotal)}</span>
                    </div>

                    <div className="pt-4 space-y-2">
                      {booking.retainerPaid ? (
                        <div className="flex justify-between text-muted-foreground">
                          <span>Retainer Paid</span>
                          <span>-{formatMoney(effectiveRetainerAmount)}</span>
                        </div>
                      ) : null}
                      <div className="flex justify-between font-medium">
                        <span>Balance Due</span>
                        <span data-testid="text-balance-due">{formatMoney(effectiveBalanceDue)}</span>
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

const bookingMetaSchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  contractTemplateId: z.string().min(1, "Contract is required"),
  eventType: z.string().min(1, "Event type is required"),
  location: z.string().min(1, "Location is required"),
  firstServiceDate: z.string().optional(),
  eventName: z.string().optional(),
});

type BookingMetaFormValues = z.infer<typeof bookingMetaSchema>;

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

function BookingMetaDialog({
  bookingId,
  bookingClientName,
  bookingClientId,
  contractTemplateId,
  contractTemplates,
  eventType,
  location,
  firstServiceDate,
  primaryEventId,
  primaryEventName,
}: {
  bookingId: number;
  bookingClientName: string;
  bookingClientId: number;
  contractTemplateId: number | null;
  contractTemplates: Array<{ id: number; name: string; active: boolean; isDefault: boolean }>;
  eventType: string;
  location: string;
  firstServiceDate: string | null;
  primaryEventId?: number;
  primaryEventName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateBooking = useUpdateBooking();
  const updateClient = useUpdateClient();
  const updateEvent = useUpdateEvent();

  const hasPrimaryEvent = Boolean(primaryEventId);
  const fallbackContractTemplateId = contractTemplates.find((contract) => contract.isDefault && contract.active)?.id
    ?? contractTemplates.find((contract) => contract.active)?.id
    ?? null;
  const currentContractTemplateId = contractTemplateId ?? fallbackContractTemplateId;

  const form = useForm<BookingMetaFormValues>({
    resolver: zodResolver(bookingMetaSchema),
    defaultValues: {
      clientName: bookingClientName,
      contractTemplateId: currentContractTemplateId ? String(currentContractTemplateId) : "",
      eventType,
      location,
      firstServiceDate: toDateInputValue(firstServiceDate),
      eventName: primaryEventName ?? "",
    },
  });

  async function onSubmit(data: BookingMetaFormValues) {
    const trimmedClientName = data.clientName.trim();
    const trimmedEventType = data.eventType.trim();
    const trimmedLocation = data.location.trim();
    const newContractTemplateId = Number(data.contractTemplateId);
    const newFirstServiceDate = data.firstServiceDate?.trim() || "";
    const currentFirstServiceDate = toDateInputValue(firstServiceDate);
    const trimmedEventName = data.eventName?.trim() || "";
    const currentEventName = primaryEventName ?? "";

    if (hasPrimaryEvent && !trimmedEventName) {
      form.setError("eventName", { message: "Event name is required" });
      return;
    }

    const isClientNameChanged = trimmedClientName !== bookingClientName;
    const isEventTypeChanged = trimmedEventType !== eventType;
    const isLocationChanged = trimmedLocation !== location;
    const isContractChanged = newContractTemplateId !== currentContractTemplateId;
    const isDateChanged = newFirstServiceDate !== currentFirstServiceDate;
    const isEventNameChanged = hasPrimaryEvent && trimmedEventName !== currentEventName;

    if (!isClientNameChanged && !isEventTypeChanged && !isLocationChanged && !isContractChanged && !isDateChanged && !isEventNameChanged) {
      setOpen(false);
      return;
    }

    setIsSaving(true);

    const bookingUpdate: { contractTemplateId?: number; eventType?: string; location?: string; firstServiceDate?: string | null } = {};

    if (isContractChanged) {
      bookingUpdate.contractTemplateId = newContractTemplateId;
    }
    if (isEventTypeChanged) {
      bookingUpdate.eventType = trimmedEventType;
    }
    if (isLocationChanged) {
      bookingUpdate.location = trimmedLocation;
    }
    if (isDateChanged) {
      bookingUpdate.firstServiceDate = newFirstServiceDate || null;
    }

    const updateTasks: Array<Promise<unknown>> = [];

    if (isClientNameChanged) {
      updateTasks.push(updateClient.mutateAsync({
        id: bookingClientId,
        data: { name: trimmedClientName },
      }));
    }
    if (Object.keys(bookingUpdate).length > 0) {
      updateTasks.push(updateBooking.mutateAsync({
        id: bookingId,
        data: bookingUpdate,
      }));
    }
    if (isEventNameChanged && primaryEventId) {
      updateTasks.push(updateEvent.mutateAsync({
        id: bookingId,
        eventId: primaryEventId,
        data: { eventName: trimmedEventName },
      }));
    }

    try {
      await Promise.all(updateTasks);
      queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(bookingId) });
      queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetClientQueryKey(bookingClientId) });
      queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
      toast({ title: "Booking details updated" });
      setOpen(false);
    } catch {
      toast({ title: "Failed to update booking details", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-10" data-testid="btn-edit-booking-details">Edit Booking Details</Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Booking Details</DialogTitle>
          <DialogDescription>
            Update primary booking details captured during intake.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField control={form.control} name="clientName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Name</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-booking-client-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="eventType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Type</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-booking-event-type" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="location" render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-booking-location" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField control={form.control} name="contractTemplateId" render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Contract</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-booking-contract">
                        <SelectValue placeholder="Select contract" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {contractTemplates.filter((contract) => contract.active || contract.id === currentContractTemplateId).map((contract) => (
                        <SelectItem key={contract.id} value={String(contract.id)}>
                          {contract.name}{contract.isDefault ? " (Default)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="firstServiceDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>First Service Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} data-testid="input-booking-first-service-date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              {hasPrimaryEvent ? (
                <FormField control={form.control} name="eventName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Event Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-booking-primary-event-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              ) : (
                <FormItem>
                  <FormLabel>Primary Event Name</FormLabel>
                  <div className="text-sm text-muted-foreground">Add an event first to edit event name.</div>
                </FormItem>
              )}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving || updateBooking.isPending || updateClient.isPending || updateEvent.isPending} data-testid="btn-save-booking-details">
                {isSaving ? "Saving..." : "Save Changes"}
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
