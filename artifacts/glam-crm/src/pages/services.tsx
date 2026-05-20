import { Shell } from "@/components/layout/Shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  getListServiceItemsQueryKey,
  type ServiceItem,
  useCreateServiceItem,
  useDeleteServiceItem,
  useListServiceItems,
  useUpdateServiceItem,
} from "@workspace/api-client-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Archive, CircleDollarSign, Plus, Save } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const serviceFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  kind: z.enum(["service", "fee"]),
  defaultUnitPrice: z.coerce.number().min(0, "Price cannot be negative"),
  unitLabel: z.string().min(1, "Unit is required"),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;
type ServiceKind = ServiceFormValues["kind"];

type ServiceCatalogSectionProps = {
  title: string;
  description: string;
  items: ServiceItem[];
  emptyMessage: string;
};

function formatMoney(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

function ServiceCatalogSection({
  title,
  description,
  items,
  emptyMessage,
}: ServiceCatalogSectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h3>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">{description}</p>
        </div>
        <span className="w-fit rounded-full border border-card-border bg-card px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {items.length} item{items.length === 1 ? "" : "s"}
        </span>
      </div>

      {items.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-card-border bg-card">
          <div className="hidden border-b border-card-border/70 bg-accent/15 px-3 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground lg:grid lg:grid-cols-[82px_minmax(150px,1.1fr)_minmax(180px,1.5fr)_88px_94px_120px_74px_78px] lg:items-center lg:gap-2">
            <span>Type</span>
            <span>Name</span>
            <span>Description</span>
            <span>Rate</span>
            <span>Unit</span>
            <span>Class</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>
          {items.map((item) => (
            <ServiceItemRow key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-card-border bg-accent/10 px-4 py-6 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      )}
    </section>
  );
}

export default function Services() {
  const { data: serviceItems, isLoading } = useListServiceItems();
  const createServiceItem = useCreateServiceItem();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: "",
      description: "",
      kind: "service",
      defaultUnitPrice: 0,
      unitLabel: "person",
    },
  });

  function onSubmit(data: ServiceFormValues) {
    createServiceItem.mutate(
      {
        data: {
          ...data,
          description: data.description || undefined,
          active: true,
          sortOrder: (serviceItems?.length ?? 0) * 10 + 10,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListServiceItemsQueryKey() });
          form.reset({
            name: "",
            description: "",
            kind: "service",
            defaultUnitPrice: 0,
            unitLabel: "person",
          });
          toast({ title: "Service item added" });
        },
        onError: () => {
          toast({ title: "Failed to add service item", variant: "destructive" });
        },
      },
    );
  }

  const activeItems = serviceItems?.filter((item) => item.active) ?? [];
  const inactiveItems = serviceItems?.filter((item) => !item.active) ?? [];
  const activeServices = activeItems.filter((item) => item.kind === "service");
  const activeFees = activeItems.filter((item) => item.kind === "fee");
  const inactiveServices = inactiveItems.filter((item) => item.kind === "service");
  const inactiveFees = inactiveItems.filter((item) => item.kind === "fee");

  return (
    <Shell>
      <div className="space-y-7">
        <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <span className="crm-eyebrow">Studio · Catalog</span>
            <h1 className="crm-page-title mt-2">Services &amp; fees</h1>
            <p className="crm-page-subtitle">
              Maintain reusable service rates and contract fees that power booking intake.
            </p>
            <div className="crm-gold-rule mt-6 w-24" />
          </div>
          <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-card-border bg-card text-sm shadow-[0_1px_0_0_hsl(var(--card-border)/0.4),0_10px_28px_-22px_var(--elevate-3)]">
            <CatalogStat label="Active" value={activeItems.length} />
            <CatalogStat label="Archived" value={inactiveItems.length} muted />
            <CatalogStat label="Total" value={serviceItems?.length ?? 0} muted last />
          </div>
        </header>

        <div className="crm-section overflow-hidden">
          <div className="border-b border-card-border/70 px-5 py-5 sm:px-6">
            <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="crm-eyebrow">Intake · Add</span>
                <h2 className="crm-section-title mt-1">Add catalog item</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create a reusable service or fee that appears in new booking intake.
                </p>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3 lg:grid-cols-[minmax(180px,1.25fr)_116px_110px_110px_minmax(180px,1.2fr)_150px] lg:items-start">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Hair & Makeup"
                          {...field}
                          className="crm-input-focus"
                          data-testid="input-service-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="kind"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-service-kind">
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

                <FormField
                  control={form.control}
                  name="defaultUnitPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rate ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="crm-input-focus"
                          {...field}
                          data-testid="input-service-rate"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unitLabel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="person"
                          {...field}
                          className="crm-input-focus"
                          data-testid="input-service-unit"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Scope, limits, or contract language"
                          {...field}
                          className="crm-input-focus"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="mt-6 w-full lg:mt-[22px]"
                  disabled={createServiceItem.isPending}
                  data-testid="button-add-service"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {createServiceItem.isPending ? "Adding..." : "Add Item"}
                </Button>
              </form>
            </Form>
          </div>

          <div className="border-b border-card-border/70 bg-accent/15 px-5 py-5 sm:px-6">
            <span className="crm-eyebrow">Library</span>
            <h2 className="crm-section-title mt-1">Catalog</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Active items appear in new booking intake. Archived items are kept for reference and re-activation.
            </p>
          </div>

          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-14 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-5 p-4">
              <ServiceCatalogSection
                title="Services"
                description="Bookable line items with per-unit pricing."
                items={activeServices}
                emptyMessage="No active services yet. Add one using the form."
              />

              <ServiceCatalogSection
                title="Fees"
                description="Surcharges, booking fees, and add-on charges."
                items={activeFees}
                emptyMessage="No active fees yet. Add one using the form."
              />

              {(inactiveServices.length > 0 || inactiveFees.length > 0) && (
                <div className="space-y-5 border-t border-border pt-5">
                  <ServiceCatalogSection
                    title="Archived Services"
                    description="Previously used services kept for reference."
                    items={inactiveServices}
                    emptyMessage="No archived services."
                  />

                  <ServiceCatalogSection
                    title="Archived Fees"
                    description="Previously used fees kept for re-activation."
                    items={inactiveFees}
                    emptyMessage="No archived fees."
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}

function CatalogStat({
  label,
  value,
  muted = false,
  last = false,
}: {
  label: string;
  value: number;
  muted?: boolean;
  last?: boolean;
}) {
  return (
    <div className={`px-4 py-3 ${last ? "" : "border-r border-card-border/70"}`}>
      <div className="crm-eyebrow !text-[10px]">{label}</div>
      <div
        className={`mt-1 font-serif text-xl tabular-nums ${muted ? "text-muted-foreground" : "text-foreground"}`}
        style={{ fontVariationSettings: "'opsz' 64", letterSpacing: "-0.02em" }}
      >
        {value}
      </div>
    </div>
  );
}

function ServiceItemRow({ item }: { item: ServiceItem }) {
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description ?? "");
  const [kind, setKind] = useState<ServiceKind>(item.kind);
  const [unitPrice, setUnitPrice] = useState(item.defaultUnitPrice.toString());
  const [unitLabel, setUnitLabel] = useState(item.unitLabel);
  const [active, setActive] = useState(item.active);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateServiceItem = useUpdateServiceItem();
  const deleteServiceItem = useDeleteServiceItem();

  function invalidateCatalog() {
    queryClient.invalidateQueries({ queryKey: getListServiceItemsQueryKey() });
  }

  function saveItem() {
    updateServiceItem.mutate(
      {
        id: item.id,
        data: {
          name,
          description: description || null,
          kind,
          defaultUnitPrice: parseFloat(unitPrice) || 0,
          unitLabel,
          active,
        },
      },
      {
        onSuccess: () => {
          invalidateCatalog();
          toast({ title: "Service item updated" });
        },
        onError: () => {
          toast({ title: "Failed to update service item", variant: "destructive" });
        },
      },
    );
  }

  function archiveItem() {
    deleteServiceItem.mutate(
      { id: item.id },
      {
        onSuccess: () => {
          invalidateCatalog();
          toast({ title: "Service item archived" });
        },
        onError: () => {
          toast({ title: "Failed to archive service item", variant: "destructive" });
        },
      },
    );
  }

  return (
    <div
      className="grid gap-2 border-b border-border p-3 last:border-b-0 lg:grid-cols-[82px_minmax(150px,1.1fr)_minmax(180px,1.5fr)_88px_94px_120px_74px_78px] lg:items-center"
      data-testid={`service-row-${item.id}`}
    >
      <div className="flex flex-wrap items-center gap-2 lg:block">
        <Badge variant={kind === "fee" ? "secondary" : "outline"}>
          {kind === "fee" ? "Fee" : "Service"}
        </Badge>
        {!active && <Badge variant="outline">Inactive</Badge>}
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground lg:hidden">
          <CircleDollarSign className="w-3.5 h-3.5" />
          {formatMoney(parseFloat(unitPrice) || 0)} per {unitLabel}
        </span>
      </div>

      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="crm-input-focus h-9 text-sm font-medium text-foreground"
        aria-label="Service name"
      />

      <Input
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="Description or scope"
        className="crm-input-focus h-9"
        aria-label="Description"
      />

      <Input
        value={unitPrice}
        onChange={(event) => setUnitPrice(event.target.value)}
        type="number"
        min="0"
        step="0.01"
        className="crm-input-focus h-9"
        aria-label="Default unit price"
      />

      <Input
        value={unitLabel}
        onChange={(event) => setUnitLabel(event.target.value)}
        className="crm-input-focus h-9"
        aria-label="Unit label"
      />

      <Select value={kind} onValueChange={(value: ServiceKind) => setKind(value)}>
        <SelectTrigger className="h-9" aria-label="Service type">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="service">Service</SelectItem>
          <SelectItem value="fee">Fee</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground lg:justify-center">
        <span className="lg:hidden">Active</span>
        <Switch checked={active} onCheckedChange={setActive} aria-label="Active" />
      </div>

      <div className="flex justify-end gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={archiveItem}
          disabled={deleteServiceItem.isPending || !active}
          aria-label="Archive service item"
          title="Archive"
        >
          <Archive className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          onClick={saveItem}
          disabled={updateServiceItem.isPending || !name || !unitLabel}
          aria-label="Save service item"
          title="Save"
        >
          <Save className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
