import { Shell } from "@/components/layout/Shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
import { Archive, Plus, Save } from "lucide-react";
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

  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-serif text-foreground">Services & Fees</h1>
          <p className="text-muted-foreground mt-1">
            Maintain reusable service rates and contract fees for booking intake.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6 items-start">
          <div className="bg-card border rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-serif mb-5">Add Service or Fee</h2>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Hair & Makeup" {...field} data-testid="input-service-name" />
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

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="defaultUnitPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rate ($)</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" step="0.01" {...field} data-testid="input-service-rate" />
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
                          <Input placeholder="person" {...field} data-testid="input-service-unit" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Scope, limits, or contract language"
                          className="min-h-[90px] resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={createServiceItem.isPending} data-testid="button-add-service">
                  <Plus className="w-4 h-4 mr-2" />
                  {createServiceItem.isPending ? "Adding..." : "Add to Catalog"}
                </Button>
              </form>
            </Form>
          </div>

          <div className="space-y-4">
            <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
              <div className="p-5 border-b">
                <h2 className="text-xl font-serif">Catalog</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Active items appear in new booking intake.
                </p>
              </div>

              {isLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((item) => (
                    <Skeleton key={item} className="h-24 w-full" />
                  ))}
                </div>
              ) : activeItems.length > 0 ? (
                <div className="p-4 space-y-4">
                  {activeItems.map((item) => (
                    <ServiceItemRow key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <div className="p-10 text-center text-muted-foreground">
                  No active services or fees yet.
                </div>
              )}
            </div>

            {inactiveItems.length > 0 && (
              <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
                <div className="p-5 border-b">
                  <h2 className="text-xl font-serif">Archived</h2>
                </div>
                <div className="p-4 space-y-4">
                  {inactiveItems.map((item) => (
                    <ServiceItemRow key={item.id} item={item} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
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
      className="rounded-lg border bg-background p-4 shadow-sm space-y-4"
      data-testid={`service-row-${item.id}`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={kind === "fee" ? "secondary" : "outline"}>{kind === "fee" ? "Fee" : "Service"}</Badge>
            {!active && <Badge variant="outline">Inactive</Badge>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_130px_120px] gap-3">
            <Input value={name} onChange={(event) => setName(event.target.value)} aria-label="Service name" />
            <Input
              value={unitPrice}
              onChange={(event) => setUnitPrice(event.target.value)}
              type="number"
              min="0"
              step="0.01"
              aria-label="Default unit price"
            />
            <Input value={unitLabel} onChange={(event) => setUnitLabel(event.target.value)} aria-label="Unit label" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Select value={kind} onValueChange={(value: ServiceKind) => setKind(value)}>
            <SelectTrigger className="w-[120px]" aria-label="Service type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="service">Service</SelectItem>
              <SelectItem value="fee">Fee</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            Active
            <Switch checked={active} onCheckedChange={setActive} aria-label="Active" />
          </div>
        </div>
      </div>

      <Textarea
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="Description or scope"
        className="min-h-[72px] resize-none"
        aria-label="Description"
      />

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={archiveItem}
          disabled={deleteServiceItem.isPending || !item.active}
        >
          <Archive className="w-4 h-4 mr-2" />
          Archive
        </Button>
        <Button type="button" onClick={saveItem} disabled={updateServiceItem.isPending || !name || !unitLabel}>
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>
      </div>
    </div>
  );
}
