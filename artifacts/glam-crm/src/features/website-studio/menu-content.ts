import type { ServiceMenuContent, ServiceMenuContentItem } from "@workspace/api-client-react";
import { STUDIO_MENU_ITEMS, type StudioMenuFieldKey } from "./catalog";
import type { StudioMenuDraft } from "./storage";

export type StudioMenuValues = Partial<Record<StudioMenuFieldKey, string>>;

export function publishedMenuValues(content?: ServiceMenuContent): Record<string, StudioMenuValues> {
  return Object.fromEntries(
    (content?.items ?? []).map((item) => [item.id, item.values as StudioMenuValues]),
  );
}

export function resolvedMenuValues(
  itemId: string,
  drafts: Record<string, StudioMenuDraft>,
  published: Record<string, StudioMenuValues>,
): StudioMenuValues {
  const definition = STUDIO_MENU_ITEMS.find((item) => item.id === itemId);
  const defaults = Object.fromEntries(definition?.fields.map((field) => [field.key, field.value]) ?? []);
  return { ...defaults, ...published[itemId], ...drafts[itemId]?.values };
}

export function buildServiceMenuItems(
  drafts: Record<string, StudioMenuDraft>,
  published: Record<string, StudioMenuValues>,
): ServiceMenuContentItem[] {
  return STUDIO_MENU_ITEMS.map((item) => ({
    id: item.id,
    values: resolvedMenuValues(item.id, drafts, published),
  })) as ServiceMenuContentItem[];
}

export function printableMenuValidationError(items: ServiceMenuContentItem[]): string | null {
  for (const item of items) {
    const values = item.values as StudioMenuValues;
    if (!values.title?.trim()) return `${item.id} needs a title.`;
    const priceFields = [values.price, values["price-general"], values["price-florida"]].filter((value) => value !== undefined);
    if (priceFields.some((value) => !value?.trim())) return `${values.title} needs a displayed price.`;
    if ((values.title?.length ?? 0) > 56) return `${values.title} has a title that is too long for the printable layout.`;
    if ((values.kicker?.length ?? 0) > 60) return `${values.title} has a kicker that is too long for the printable layout.`;
    if ((values.description?.length ?? 0) > 360) return `${values.title} has a description that is too long for the printable layout.`;
    if ((values.note?.length ?? 0) > 260) return `${values.title} has a note that is too long for the printable layout.`;
    if (priceFields.some((value) => (value?.length ?? 0) > 40)) return `${values.title} has a price label that is too long for the printable layout.`;
  }
  return null;
}
