import type { ServiceMenuStoredContent, ServiceMenuStoredItem } from "@workspace/db";

type MenuValues = Record<string, string>;

export const serviceMenuKeys = ["bridal-services", "party-services"] as const;
export type ServiceMenuKey = (typeof serviceMenuKeys)[number];

const item = (id: string, values: MenuValues): ServiceMenuStoredItem => ({ id, values });

export const defaultBridalServiceMenuContent: ServiceMenuStoredContent = {
  items: [
    item("bridal-makeup", {
      title: "Bridal Makeup",
      description: "Luxury skin prep, under-eye patches, professional products, and lashes for a flawless, long-lasting finish. Every look is customized to enhance your features and create your dream bridal look.",
      price: "$400",
    }),
    item("bridal-setup", {
      title: "Bridal Set Up",
      description: "Dupatta or veil placement and jewelry placement for a polished bridal finish.",
      price: "$50",
    }),
    item("makeup-trial", {
      title: "Makeup Trial",
      description: "A personalized trial to perfect your makeup to your liking for your big day.",
      price: "$150",
    }),
    item("bridal-hair", {
      title: "Bridal Hair",
      description: "Hairstyling for your desired look, from a polished bun to romantic waves. Hair padding, bobby pins, and safety pins are included.",
      note: "Please arrive with clean, washed, completely dry hair. Bride-provided extensions only. Recommended brand: Bellami.",
      price: "$300",
    }),
    item("synthetic-bun-extension", {
      title: "Synthetic Bun Extension",
      description: "Optional add-on for a fuller bridal bun.",
      price: "$15",
    }),
    item("bridal-hijab-setup", {
      title: "Bridal Hijab Set Up",
      description: "Secure, elegant hijab styling customized to your bridal look. Gel, hairspray, and strong-hold techniques keep everything in place all day.",
      note: "Please bring your preferred hijab and under cap. Cotton or jersey is recommended for the best hold.",
      price: "$50",
    }),
    item("signature-bridal-package", {
      kicker: "Complete bridal experience",
      title: "Signature Bridal Package",
      description: "Includes Bridal Makeup, Hairstyling, and Complete Bridal Setup for your special day.",
      price: "$700",
    }),
    item("bridal-bundle", {
      kicker: "Three or more bridal services",
      title: "Bridal Bundle",
      description: "Bundle your bridal events and save. Book 3 or more bridal services and enjoy $25 off each day.",
      "price-general": "$600 / event",
      "price-florida": "$675 / event",
    }),
    item("bridal-makeup-package", {
      kicker: "Special bridal offer",
      title: "Bridal Makeup Package",
      description: "Book 2 or more bridal events and receive a free Bridal Makeup Trial - a $150 value. Your trial gives us the opportunity to perfect your dream look before the big day.",
      price: "$700 / event",
    }),
    item("travel-10-15-miles", {
      title: "Travel fee",
      description: "Travel fees are separate from service pricing and are confirmed at booking.",
      price: "10–15 mi / $50",
    }),
    item("travel-20-plus-miles", {
      title: "Travel fee",
      description: "Further distances are discussed and quoted during consultation. Clients may travel to the artist to avoid a travel fee.",
      price: "20+ mi / $100",
    }),
    item("early-morning-3-5", {
      title: "Early morning",
      description: "Applied when services begin during this time window.",
      price: "3:00–5:00 AM / $200",
    }),
    item("early-morning-6-7", {
      title: "Early morning",
      description: "Applied when services begin during this time window.",
      price: "6:00–7:00 AM / $75",
    }),
    item("style-note", {
      title: "A note on style",
      description: "I specialize in full glam makeup looks. If you are looking for completely natural glam, I may not be the right artist for you.",
    }),
  ],
};

export const defaultPartyServiceMenuContent: ServiceMenuStoredContent = {
  items: [
    item("party-simple-glam", {
      title: "Simple Glam",
      description: "Luxury skincare prep, a customized complexion, blush, bronzer, highlight, brows, lips, and lashes. Eyeshadow and eyeliner are not included.",
      price: "$130",
    }),
    item("party-soft-glam", {
      title: "Soft Glam",
      description: "Luxury skincare prep, a customized complexion, neutral blended eyeshadow with one shimmer, soft lash-line definition, brows, blush, bronzer, highlight, lip application, and lashes. Liquid, gel, and winged liner are not included.",
      price: "$175",
    }),
    item("party-full-glam", {
      title: "Party Glam",
      description: "Personalized skincare prep, a long-lasting complexion, two to three blended eyeshadows with shimmer or glitter, customized eyeliner, brows, blush, bronzer, highlight, lip application, and false lashes.",
      price: "$225",
    }),
    item("party-hair", {
      title: "Party Hair",
      description: "Choose classic curls, a high or low bun, or a half-up, half-down style. Finishing spray is included and curling is optional for half-up styles.",
      price: "$185",
    }),
    item("party-setup", {
      title: "Setups",
      description: "Dupatta or veil setting and jewelry placement for a polished finish.",
      price: "$75",
    }),
    item("party-hijab-setup", {
      title: "Hijab Setups",
      description: "Secure, elegant hijab styling customized to your look with strong-hold techniques for a long-lasting finish.",
      note: "Please bring your preferred hijab and undercap.",
      price: "$75",
    }),
    item("party-travel-10-15", {
      title: "Travel fee",
      description: "Travel fees are separate from service pricing and confirmed at booking.",
      price: "10–15 mi / $50",
    }),
    item("party-travel-20-plus", {
      title: "Travel fee",
      description: "Further distances are discussed and quoted during consultation. Clients may travel to the artist to avoid a travel fee.",
      price: "20+ mi / $100",
    }),
    item("party-early-3-5", {
      title: "Early morning",
      description: "Applied when services begin during this time window.",
      price: "3:00–5:00 AM / $200",
    }),
    item("party-early-6-7", {
      title: "Early morning",
      description: "Applied when services begin during this time window.",
      price: "6:00–7:00 AM / $75",
    }),
    item("party-style-note", {
      title: "A note on style",
      description: "I specialize in full glam makeup looks. If you are looking for completely natural glam, I may not be the right artist for you.",
    }),
  ],
};

export const defaultServiceMenuContentByKey: Record<ServiceMenuKey, ServiceMenuStoredContent> = {
  "bridal-services": defaultBridalServiceMenuContent,
  "party-services": defaultPartyServiceMenuContent,
};

const allowedItemFieldsByKey = new Map(
  serviceMenuKeys.map((menuKey) => [
    menuKey,
    new Map(defaultServiceMenuContentByKey[menuKey].items.map((menuItem) => [menuItem.id, Object.keys(menuItem.values)])),
  ]),
);

const fieldMaxLengths: Record<string, number> = {
  title: 56,
  kicker: 60,
  description: 360,
  note: 260,
  price: 40,
  "price-general": 40,
  "price-florida": 40,
};

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

function maxFieldLength(menuKey: ServiceMenuKey, itemId: string, field: string) {
  if (menuKey === "party-services" && field === "title") return 18;
  if (menuKey === "party-services" && field.startsWith("price")) return 20;
  if (menuKey === "party-services" && field === "description") {
    return partyDescriptionMaxLengths[itemId] ?? fieldMaxLengths.description;
  }
  if (menuKey === "party-services" && field === "note") return 120;
  return fieldMaxLengths[field] ?? 0;
}

const partyPageOneIds = ["party-simple-glam", "party-soft-glam", "party-full-glam"];
const partyPageTwoIds = [
  "party-hair",
  "party-setup",
  "party-hijab-setup",
  "party-travel-10-15",
  "party-travel-20-plus",
  "party-early-3-5",
  "party-early-6-7",
  "party-style-note",
];

function partyLayoutScore(items: ServiceMenuStoredItem[], ids: string[]) {
  const selected = items.filter((menuItem) => ids.includes(menuItem.id));
  return selected.reduce((total, menuItem) => {
    const values = menuItem.values;
    return total
      + (values.description?.length ?? 0)
      + (values.note?.length ?? 0)
      + 4 * (values.title?.length ?? 0)
      + 2 * (values.price?.length ?? 0);
  }, 0);
}

function validatePartyLayout(items: ServiceMenuStoredItem[]) {
  for (const menuItem of items) {
    if (/\S{15,}/.test(menuItem.values.title ?? "")) {
      throw new InvalidServiceMenuContentError(`Use spaces in long service names so they fit the printable layout: ${menuItem.id}`);
    }
    if (/\S{13,}/.test(menuItem.values.price ?? "")) {
      throw new InvalidServiceMenuContentError(`Use a shorter displayed price so it fits the printable layout: ${menuItem.id}`);
    }
  }
  if (partyLayoutScore(items, partyPageOneIds) > 740) {
    throw new InvalidServiceMenuContentError("The makeup-service wording is too long for page 1 of the printable Party menu.");
  }
  if (partyLayoutScore(items, partyPageTwoIds) > 1320) {
    throw new InvalidServiceMenuContentError("The hair, setup, travel, and timing wording is too long for page 2 of the printable Party menu.");
  }
}

export class InvalidServiceMenuContentError extends Error {}

export function isServiceMenuKey(value: string): value is ServiceMenuKey {
  return serviceMenuKeys.includes(value as ServiceMenuKey);
}

export function cloneDefaultServiceMenuContent(menuKey: ServiceMenuKey = "bridal-services"): ServiceMenuStoredContent {
  return structuredClone(defaultServiceMenuContentByKey[menuKey]);
}

export function normalizeServiceMenuContent(
  menuKey: ServiceMenuKey,
  items: ServiceMenuStoredItem[],
): ServiceMenuStoredContent {
  const defaults = defaultServiceMenuContentByKey[menuKey];
  const allowedItemFields = allowedItemFieldsByKey.get(menuKey) ?? new Map<string, string[]>();
  const byId = new Map<string, ServiceMenuStoredItem>();

  for (const menuItem of items) {
    if (byId.has(menuItem.id)) {
      throw new InvalidServiceMenuContentError(`Duplicate menu item: ${menuItem.id}`);
    }
    byId.set(menuItem.id, menuItem);
  }

  if (byId.size !== allowedItemFields.size) {
    throw new InvalidServiceMenuContentError("The complete printable menu is required.");
  }

  const normalized = defaults.items.map((defaultItem) => {
    const submitted = byId.get(defaultItem.id);
    if (!submitted) {
      throw new InvalidServiceMenuContentError(`Missing menu item: ${defaultItem.id}`);
    }

    const allowedFields = allowedItemFields.get(defaultItem.id) ?? [];
    const submittedFields = Object.keys(submitted.values);
    if (
      submittedFields.length !== allowedFields.length ||
      submittedFields.some((field) => !allowedFields.includes(field))
    ) {
      throw new InvalidServiceMenuContentError(`Unexpected fields for menu item: ${defaultItem.id}`);
    }

    const values = Object.fromEntries(allowedFields.map((field) => {
      const value = submitted.values[field];
      if (typeof value !== "string") {
        throw new InvalidServiceMenuContentError(`Missing ${field} for menu item: ${defaultItem.id}`);
      }
      const trimmed = value.trim();
      if ((field === "title" || field.startsWith("price") || field === "kicker") && !trimmed) {
        throw new InvalidServiceMenuContentError(`${field} cannot be empty for menu item: ${defaultItem.id}`);
      }
      if (trimmed.length > maxFieldLength(menuKey, defaultItem.id, field)) {
        throw new InvalidServiceMenuContentError(`${field} is too long for the printable layout: ${defaultItem.id}`);
      }
      return [field, trimmed];
    }));

    return item(defaultItem.id, values);
  });

  const unknownItem = [...byId.keys()].find((id) => !allowedItemFields.has(id));
  if (unknownItem) {
    throw new InvalidServiceMenuContentError(`Unknown menu item: ${unknownItem}`);
  }

  if (menuKey === "party-services") validatePartyLayout(normalized);

  return { items: normalized };
}
