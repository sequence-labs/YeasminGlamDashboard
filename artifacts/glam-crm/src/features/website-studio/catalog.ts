export type StudioPreviewRouteId = "homepage" | "services";

export interface StudioPreviewRoute {
  id: StudioPreviewRouteId;
  label: string;
  path: string;
}

export interface StudioImageSlot {
  id: string;
  section: string;
  role: string;
  title: string;
  developmentPath: string;
  productionPath: string;
  width: number;
  height: number;
  sourceFile: string;
}

export type StudioMenuSectionId =
  | "bridal-essentials"
  | "curated-experiences";

export type StudioMenuPresentation =
  | "essential"
  | "package"
  | "feature"
  | "detail";

export type StudioMenuFieldKey =
  | "kicker"
  | "title"
  | "description"
  | "note"
  | "price"
  | "price-general"
  | "price-florida";

export interface StudioMenuField {
  key: StudioMenuFieldKey;
  label: string;
  value: string;
  multiline: boolean;
  maxLength: number;
}

export interface StudioMenuItem {
  id: string;
  sectionId: StudioMenuSectionId;
  sectionLabel: string;
  presentation: StudioMenuPresentation;
  displayOrder: number;
  fields: readonly StudioMenuField[];
}

const textField = (
  key: StudioMenuFieldKey,
  label: string,
  value: string,
  multiline = false,
): StudioMenuField => ({
  key,
  label,
  value,
  multiline,
  maxLength: multiline ? 1_000 : 160,
});

export const STUDIO_PREVIEW_ROUTES: readonly StudioPreviewRoute[] = [
  { id: "homepage", label: "Homepage", path: "/" },
  { id: "services", label: "Services menu", path: "/services/" },
] as const;

/**
 * Exact image contract from YeasminWebsite/src/data/studio-image-slots.ts.
 * Keep the stable IDs aligned with the public preview's data-studio-slot-id values.
 */
export const STUDIO_IMAGE_SLOTS: readonly StudioImageSlot[] = [
  {
    id: "hero-primary",
    section: "Homepage · Hero",
    role: "hero-primary",
    title: "Ivory bridal portrait",
    developmentPath: "/images/temporary/hero-ivory.png",
    productionPath: "/images/placeholders/portrait-ivory.svg",
    width: 1023,
    height: 1537,
    sourceFile: "src/data/portfolio.json · hero-primary",
  },
  {
    id: "hero-detail-one",
    section: "Homepage · Hero",
    role: "hero-detail-one",
    title: "Emerald bridal portrait",
    developmentPath: "/images/temporary/hero-emerald.png",
    productionPath: "/images/placeholders/portrait-sage.svg",
    width: 1024,
    height: 1536,
    sourceFile: "src/data/portfolio.json · hero-detail-one",
  },
  {
    id: "hero-detail-two",
    section: "Homepage · Hero",
    role: "hero-detail-two",
    title: "Terracotta bridal portrait",
    developmentPath: "/images/temporary/hero-terracotta.png",
    productionPath: "/images/placeholders/portrait-ruby.svg",
    width: 1023,
    height: 1537,
    sourceFile: "src/data/portfolio.json · hero-detail-two",
  },
  {
    id: "gallery-ivory",
    section: "Homepage · Bridal edit",
    role: "gallery",
    title: "Ivory & Pearl",
    developmentPath: "/images/temporary/gallery-ivory.png",
    productionPath: "/images/placeholders/portrait-ivory.svg",
    width: 1120,
    height: 1400,
    sourceFile: "src/data/portfolio.json · gallery-ivory",
  },
  {
    id: "gallery-sage",
    section: "Homepage · Bridal edit",
    role: "gallery",
    title: "Champagne & Sage",
    developmentPath: "/images/temporary/gallery-sage.png",
    productionPath: "/images/placeholders/portrait-sage.svg",
    width: 1120,
    height: 1400,
    sourceFile: "src/data/portfolio.json · gallery-sage",
  },
  {
    id: "gallery-ruby",
    section: "Homepage · Bridal edit",
    role: "gallery",
    title: "Ruby & Wine",
    developmentPath: "/images/temporary/gallery-ruby.png",
    productionPath: "/images/placeholders/portrait-ruby.svg",
    width: 1120,
    height: 1400,
    sourceFile: "src/data/portfolio.json · gallery-ruby",
  },
  {
    id: "gallery-mauve",
    section: "Homepage · Bridal edit",
    role: "gallery",
    title: "Blush & Mauve",
    developmentPath: "/images/temporary/gallery-mauve.png",
    productionPath: "/images/placeholders/portrait-mauve.svg",
    width: 1120,
    height: 1400,
    sourceFile: "src/data/portfolio.json · gallery-mauve",
  },
  {
    id: "gallery-teal",
    section: "Homepage · Bridal edit",
    role: "gallery",
    title: "Midnight & Teal",
    developmentPath: "/images/temporary/gallery-teal.png",
    productionPath: "/images/placeholders/portrait-teal.svg",
    width: 1120,
    height: 1400,
    sourceFile: "src/data/portfolio.json · gallery-teal",
  },
  {
    id: "process-tools",
    section: "Homepage · Care in every detail",
    role: "process",
    title: "Makeup",
    developmentPath: "/images/temporary/process-tools.png",
    productionPath: "/images/placeholders/detail-tools.svg",
    width: 1086,
    height: 1448,
    sourceFile: "src/data/portfolio.json · process-tools",
  },
  {
    id: "process-jewelry",
    section: "Homepage · Care in every detail",
    role: "process",
    title: "Hair",
    developmentPath: "/images/temporary/process-jewelry.png",
    productionPath: "/images/placeholders/detail-ornament.svg",
    width: 1086,
    height: 1448,
    sourceFile: "src/data/portfolio.json · process-jewelry",
  },
  {
    id: "process-pinning",
    section: "Homepage · Care in every detail",
    role: "process",
    title: "Bridal setup",
    developmentPath: "/images/temporary/process-pinning.png",
    productionPath: "/images/placeholders/detail-fabric.svg",
    width: 1086,
    height: 1448,
    sourceFile: "src/data/portfolio.json · process-pinning",
  },
  {
    id: "process-finish",
    section: "Homepage · Care in every detail",
    role: "process",
    title: "Finishing details",
    developmentPath: "/images/temporary/process-finish.png",
    productionPath: "/images/placeholders/detail-finish.svg",
    width: 1086,
    height: 1448,
    sourceFile: "src/data/portfolio.json · process-finish",
  },
  {
    id: "inquiry-ruby",
    section: "Homepage · Inquiry",
    role: "inquiry",
    title: "Ruby bridal portrait",
    developmentPath: "/images/temporary/inquiry-ruby.png",
    productionPath: "/images/placeholders/landscape-ruby.svg",
    width: 1584,
    height: 990,
    sourceFile: "src/data/portfolio.json · inquiry-ruby",
  },
  {
    id: "service-menu-hero",
    section: "Services menu · Masthead",
    role: "masthead still life",
    title: "Services menu editorial still life",
    developmentPath: "/images/service-menu-hero.jpg",
    productionPath: "/images/service-menu-hero.jpg",
    width: 1024,
    height: 1536,
    sourceFile: "src/components/menu/ServiceMenuPage.astro",
  },
  {
    id: "ornament-peony",
    section: "Homepage · Hero",
    role: "decorative ornament",
    title: "Peony engraving",
    developmentPath: "/ornaments/peony-engraving.png",
    productionPath: "/ornaments/peony-engraving.png",
    width: 1690,
    height: 931,
    sourceFile: "src/components/BotanicalLineArt.astro · hero variant",
  },
  {
    id: "ornament-branch",
    section: "Homepage · Bridal edit",
    role: "decorative ornament",
    title: "Branch engraving",
    developmentPath: "/ornaments/branch-engraving.png",
    productionPath: "/ornaments/branch-engraving.png",
    width: 1330,
    height: 1183,
    sourceFile: "src/components/BotanicalLineArt.astro · branch variant",
  },
] as const;

const essential = (
  id: string,
  displayOrder: number,
  fields: readonly StudioMenuField[],
): StudioMenuItem => ({
  id,
  sectionId: "bridal-essentials",
  sectionLabel: "Bridal Essentials",
  presentation: "essential",
  displayOrder,
  fields,
});

const curated = (
  id: string,
  presentation: Exclude<StudioMenuPresentation, "essential">,
  displayOrder: number,
  fields: readonly StudioMenuField[],
): StudioMenuItem => ({
  id,
  sectionId: "curated-experiences",
  sectionLabel: "Curated Experiences",
  presentation,
  displayOrder,
  fields,
});

/** Exact editable leaf-field catalog from YeasminWebsite's 13 public menu items. */
export const STUDIO_MENU_ITEMS: readonly StudioMenuItem[] = [
  essential("bridal-makeup", 1, [
    textField("title", "Title", "Bridal Makeup"),
    textField(
      "description",
      "Description",
      "Luxury skin prep, under-eye patches, professional products, and lashes for a flawless, long-lasting finish. Every look is customized to enhance your features and create your dream bridal look.",
      true,
    ),
    textField("price", "Price", "$400"),
  ]),
  essential("bridal-setup", 2, [
    textField("title", "Title", "Bridal Set Up"),
    textField(
      "description",
      "Description",
      "Dupatta or veil placement and jewelry placement for a polished bridal finish.",
      true,
    ),
    textField("price", "Price", "$50"),
  ]),
  essential("makeup-trial", 3, [
    textField("title", "Title", "Makeup Trial"),
    textField(
      "description",
      "Description",
      "A personalized trial to perfect your makeup to your liking for your big day.",
      true,
    ),
    textField("price", "Price", "$150"),
  ]),
  essential("bridal-hair", 4, [
    textField("title", "Title", "Bridal Hair"),
    textField(
      "description",
      "Description",
      "Hairstyling for your desired look, from a polished bun to romantic waves. Hair padding, bobby pins, and safety pins are included.",
      true,
    ),
    textField(
      "note",
      "Note",
      "Please arrive with clean, washed, completely dry hair. Bride-provided extensions only. Recommended brand: Bellami.",
      true,
    ),
    textField("price", "Price", "$300"),
  ]),
  essential("synthetic-bun-extension", 5, [
    textField("title", "Title", "Synthetic Bun Extension"),
    textField(
      "description",
      "Description",
      "Optional add-on for a fuller bridal bun.",
      true,
    ),
    textField("price", "Price", "$15"),
  ]),
  essential("bridal-hijab-setup", 6, [
    textField("title", "Title", "Bridal Hijab Set Up"),
    textField(
      "description",
      "Description",
      "Secure, elegant hijab styling customized to your bridal look. Gel, hairspray, and strong-hold techniques keep everything in place all day.",
      true,
    ),
    textField(
      "note",
      "Note",
      "Please bring your preferred hijab and under cap. Cotton or jersey is recommended for the best hold.",
      true,
    ),
    textField("price", "Price", "$50"),
  ]),
  curated("signature-bridal-package", "package", 1, [
    textField("kicker", "Kicker", "Complete bridal experience"),
    textField("title", "Title", "Signature Bridal Package"),
    textField(
      "description",
      "Description",
      "Includes Bridal Makeup, Hairstyling, and Complete Bridal Setup for your special day.",
      true,
    ),
    textField("price", "Price", "$700"),
  ]),
  curated("bridal-bundle", "package", 2, [
    textField("kicker", "Kicker", "Three or more bridal services"),
    textField("title", "Title", "Bridal Bundle"),
    textField(
      "description",
      "Description",
      "Bundle your bridal events and save. Book 3 or more bridal services and enjoy $25 off each day.",
      true,
    ),
    textField("price-general", "General price", "$600 / event"),
    textField("price-florida", "Florida price", "$675 / event"),
  ]),
  curated("bridal-makeup-package", "feature", 3, [
    textField("kicker", "Kicker", "Special bridal offer"),
    textField("title", "Title", "Bridal Makeup Package"),
    textField(
      "description",
      "Description",
      "Book 2 or more bridal events and receive a free Bridal Makeup Trial - a $150 value. Your trial gives us the opportunity to perfect your dream look before the big day.",
      true,
    ),
    textField("price", "Price", "$700 / event"),
  ]),
  curated("travel-10-15-miles", "detail", 4, [
    textField("title", "Title", "Travel fee"),
    textField(
      "description",
      "Description",
      "Travel fees are separate from service pricing and are confirmed at booking.",
      true,
    ),
    textField("price", "Price", "10–15 mi / $50"),
  ]),
  curated("travel-20-plus-miles", "detail", 5, [
    textField("title", "Title", "Travel fee"),
    textField(
      "description",
      "Description",
      "Further distances are discussed and quoted during consultation. Clients may travel to the artist to avoid a travel fee.",
      true,
    ),
    textField("price", "Price", "20+ mi / $100"),
  ]),
  curated("early-morning-3-5", "detail", 6, [
    textField("title", "Title", "Early morning"),
    textField(
      "description",
      "Description",
      "Applied when services begin during this time window.",
      true,
    ),
    textField("price", "Price", "3:00–5:00 AM / $200"),
  ]),
  curated("early-morning-6-7", "detail", 7, [
    textField("title", "Title", "Early morning"),
    textField(
      "description",
      "Description",
      "Applied when services begin during this time window.",
      true,
    ),
    textField("price", "Price", "6:00–7:00 AM / $75"),
  ]),
] as const;

export const STUDIO_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
] as const;

export const STUDIO_MAX_IMAGE_BYTES = 30 * 1024 * 1024;

export const STUDIO_IMAGE_SLOT_BY_ID = new Map(
  STUDIO_IMAGE_SLOTS.map((slot) => [slot.id, slot]),
);

export const STUDIO_MENU_ITEM_BY_ID = new Map(
  STUDIO_MENU_ITEMS.map((item) => [item.id, item]),
);

export function getStudioMenuOriginalValues(
  item: StudioMenuItem,
): Partial<Record<StudioMenuFieldKey, string>> {
  return Object.fromEntries(
    item.fields.map((field) => [field.key, field.value]),
  ) as Partial<Record<StudioMenuFieldKey, string>>;
}
