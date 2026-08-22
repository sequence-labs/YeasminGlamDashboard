import type { ServiceMenuStoredContent, ServiceMenuStoredItem } from "@workspace/db";

type MenuValues = Record<string, string>;

const item = (id: string, values: MenuValues): ServiceMenuStoredItem => ({ id, values });

export const defaultServiceMenuContent: ServiceMenuStoredContent = {
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

const allowedItemFields = new Map(
  defaultServiceMenuContent.items.map((menuItem) => [menuItem.id, Object.keys(menuItem.values)]),
);

export class InvalidServiceMenuContentError extends Error {}

export function cloneDefaultServiceMenuContent(): ServiceMenuStoredContent {
  return structuredClone(defaultServiceMenuContent);
}

export function normalizeServiceMenuContent(items: ServiceMenuStoredItem[]): ServiceMenuStoredContent {
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

  const normalized = defaultServiceMenuContent.items.map((defaultItem) => {
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
      return [field, trimmed];
    }));

    return item(defaultItem.id, values);
  });

  const unknownItem = [...byId.keys()].find((id) => !allowedItemFields.has(id));
  if (unknownItem) {
    throw new InvalidServiceMenuContentError(`Unknown menu item: ${unknownItem}`);
  }

  return { items: normalized };
}
