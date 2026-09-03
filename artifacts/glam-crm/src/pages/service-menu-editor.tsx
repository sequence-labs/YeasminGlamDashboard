import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { Link, useLocation, useRoute } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetServiceMenuDocumentQueryKey,
  type ServiceMenuContentItem,
  type ServiceMenuContentValues,
  type ServiceMenuKey,
  useGetServiceMenuDocument,
  useUpdateServiceMenuDocument,
} from "@workspace/api-client-react";
import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const menuNames: Record<ServiceMenuKey, string> = {
  "bridal-services": "Bridal menu",
  "party-services": "Party & event menu",
};

const fieldLabels: Record<keyof ServiceMenuContentValues, string> = {
  title: "Service name",
  description: "Description",
  note: "Client note",
  kicker: "Small heading",
  price: "Price",
  "price-general": "General price",
  "price-florida": "Florida price",
};

function isMenuKey(value?: string): value is ServiceMenuKey {
  return value === "bridal-services" || value === "party-services";
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The menu could not be saved. Please try again.";
}

const partyDescriptionMaxLengths: Record<string, number> = {
  "party-simple-glam": 240,
  "party-soft-glam": 240,
  "party-full-glam": 240,
  "party-hair": 180,
  "party-setup": 180,
  "party-hijab-setup": 180,
  "party-travel-10-15": 150,
  "party-travel-20-plus": 150,
  "party-early-3-5": 100,
  "party-early-6-7": 100,
  "party-style-note": 180,
};

function fieldMaxLength(menuKey: ServiceMenuKey, itemId: string, field: string) {
  if (menuKey === "party-services" && field === "title") return 18;
  if (menuKey === "party-services" && field.startsWith("price")) return 20;
  if (menuKey === "party-services" && field === "description") {
    return partyDescriptionMaxLengths[itemId] ?? 240;
  }
  if (menuKey === "party-services" && field === "note") return 120;
  if (field === "description") return 360;
  if (field === "note") return 260;
  if (field === "title") return 56;
  if (field === "kicker") return 60;
  return 40;
}

const partyPageOneIds = new Set(["party-simple-glam", "party-soft-glam", "party-full-glam"]);
const partyPageTwoIds = new Set([
  "party-hair",
  "party-setup",
  "party-hijab-setup",
  "party-travel-10-15",
  "party-travel-20-plus",
  "party-early-3-5",
  "party-early-6-7",
  "party-style-note",
]);

function partyLayoutScore(items: ServiceMenuContentItem[], ids: Set<string>) {
  return items.filter((menuItem) => ids.has(menuItem.id)).reduce((total, menuItem) => {
    const values = menuItem.values;
    return total
      + (values.description?.length ?? 0)
      + (values.note?.length ?? 0)
      + 4 * (values.title?.length ?? 0)
      + 2 * (values.price?.length ?? 0);
  }, 0);
}

function partyLayoutValidationError(items: ServiceMenuContentItem[]) {
  for (const menuItem of items) {
    if (/\S{15,}/.test(menuItem.values.title ?? "")) return "Add a space to long service names so they fit the printable menu.";
    if (/\S{13,}/.test(menuItem.values.price ?? "")) return "Shorten the displayed price so it fits the printable menu.";
  }
  if (partyLayoutScore(items, partyPageOneIds) > 740) return "Shorten the makeup-service wording so page 1 stays print-ready.";
  if (partyLayoutScore(items, partyPageTwoIds) > 1320) return "Shorten the hair, setup, travel, or timing wording so page 2 stays print-ready.";
  return null;
}

export default function ServiceMenuEditorPage() {
  const [, params] = useRoute("/service-menus/edit/:menuKey");
  const [, navigate] = useLocation();
  const menuKey = isMenuKey(params?.menuKey) ? params.menuKey : null;
  const { data, isLoading, error } = useGetServiceMenuDocument(menuKey ?? "bridal-services", {
    query: {
      enabled: Boolean(menuKey),
      queryKey: getGetServiceMenuDocumentQueryKey(menuKey ?? "bridal-services"),
    },
  });
  const updateMenu = useUpdateServiceMenuDocument();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [items, setItems] = useState<ServiceMenuContentItem[]>([]);

  useEffect(() => {
    if (data) setItems(structuredClone(data.items));
  }, [data]);

  const hasChanges = useMemo(
    () => data ? JSON.stringify(items) !== JSON.stringify(data.items) : false,
    [data, items],
  );

  function updateField(itemIndex: number, field: string, value: string) {
    setItems((current) => current.map((item, index) => index === itemIndex
      ? { ...item, values: { ...item.values, [field]: value } }
      : item));
  }

  async function saveMenu() {
    if (!menuKey || !data) return;
    const layoutError = menuKey === "party-services" ? partyLayoutValidationError(items) : null;
    if (layoutError) {
      toast({ variant: "destructive", title: "Menu is too long to print cleanly", description: layoutError });
      return;
    }
    try {
      const saved = await updateMenu.mutateAsync({
        menuKey,
        data: { expectedRevision: data.revision, items },
      });
      queryClient.setQueryData(getGetServiceMenuDocumentQueryKey(menuKey), saved);
      setItems(structuredClone(saved.items));
      toast({ title: "Menu saved", description: `${menuNames[menuKey]} is ready to preview, print, or share.` });
    } catch (saveError) {
      toast({
        variant: "destructive",
        title: "Menu not saved",
        description: errorMessage(saveError),
      });
    }
  }

  if (!menuKey) {
    navigate("/service-menus");
    return null;
  }

  return (
    <Shell>
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-5 border-b border-card-border pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Button asChild variant="ghost" className="-ml-3 mb-3 gap-2 text-muted-foreground">
              <Link href={`/service-menus?menu=${menuKey}`}><ArrowLeft className="h-4 w-4" /> Service menus</Link>
            </Button>
            <span className="crm-eyebrow">Edit client-facing menu</span>
            <h1 className="crm-page-title mt-2">{menuNames[menuKey]}</h1>
            <p className="crm-page-subtitle">Update the wording and prices clients will see. Booking prices are not changed here.</p>
          </div>
          <Button
            onClick={saveMenu}
            disabled={!data || !hasChanges || updateMenu.isPending}
            className="min-h-11 gap-2 px-6"
            data-testid="button-save-service-menu"
          >
            {updateMenu.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {updateMenu.isPending ? "Saving…" : "Save changes"}
          </Button>
        </header>

        {isLoading && <div className="crm-section flex min-h-52 items-center justify-center text-sm text-muted-foreground">Loading menu…</div>}
        {error && <div className="crm-section border-destructive/30 p-6 text-sm text-destructive">This menu could not be loaded. Refresh the page and try again.</div>}

        {data && (
          <div className="space-y-4">
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm leading-6 text-muted-foreground">
              {menuKey === "bridal-services"
                ? "General and Florida prices are separate where both fields appear. All other prices are shared across both editions."
                : "This is the General Party menu from the approved source PDF. A new location edition can be added when its pricing is confirmed."}
            </div>

            {items.map((menuItem, itemIndex) => (
              <section key={menuItem.id} className="crm-section p-5 sm:p-6">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <span className="crm-eyebrow">Menu item {String(itemIndex + 1).padStart(2, "0")}</span>
                    <h2 className="mt-1 font-serif text-2xl text-foreground">{menuItem.values.title}</h2>
                  </div>
                  <span className="rounded-full border border-card-border px-3 py-1 text-xs text-muted-foreground">{menuItem.id}</span>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  {Object.entries(menuItem.values).map(([field, value]) => {
                    const multiline = field === "description" || field === "note";
                    const label = fieldLabels[field as keyof ServiceMenuContentValues] ?? field;
                    return (
                      <div className={multiline ? "space-y-2 sm:col-span-2" : "space-y-2"} key={field}>
                        <Label htmlFor={`${menuItem.id}-${field}`}>{label}</Label>
                        {multiline ? (
                          <Textarea
                            id={`${menuItem.id}-${field}`}
                            value={value}
                            maxLength={fieldMaxLength(menuKey, menuItem.id, field)}
                            onChange={(event) => updateField(itemIndex, field, event.target.value)}
                          />
                        ) : (
                          <Input
                            id={`${menuItem.id}-${field}`}
                            value={value}
                            maxLength={fieldMaxLength(menuKey, menuItem.id, field)}
                            onChange={(event) => updateField(itemIndex, field, event.target.value)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}

            <div className="flex justify-end border-t border-card-border pt-5">
              <Button onClick={saveMenu} disabled={!hasChanges || updateMenu.isPending} className="min-h-11 gap-2 px-6">
                <Save className="h-4 w-4" /> Save changes
              </Button>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
