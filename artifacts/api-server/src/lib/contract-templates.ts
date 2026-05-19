import { desc, eq } from "drizzle-orm";
import { contractTemplatesTable, db } from "@workspace/db";

export const defaultContractTemplateName = "Non-Bridal Makeup and Hair Service Agreement";
export const bridalContractTemplateName = "Bridal Makeup and Hair Service Agreement";

export const defaultTemplateClauses = {
  intro:
    "This Makeup & Hair Service Agreement is between the Artist and Client for makeup and hair services at the listed event location. This Agreement becomes binding when signed by both parties and the non-refundable retainer is received by Artist.",
  schedule:
    "The service windows below are for scheduling and coordination. Contracted services, quantities, and fees are listed in the Pricing section. Artist is not responsible for the actual start time of any ceremony, reception, cocktail hour, photo session, or other event activity.",
  pricing:
    "The rate schedule lists the unit prices. The booking charges table applies those rates to the selected quantities for this Agreement.",
  payment:
    "The retainer is earned upon receipt because Artist reserves the requested dates and times, may decline other work, and begins planning. No dates or times are reserved until this Agreement is signed and the retainer is received. The retainer is non-refundable and non-transferable. The remaining balance must be paid in cleared funds by the deadline above. Artist is not required to begin or continue services until the balance is paid.",
  scope:
    "Makeup service rates apply to the selected makeup services shown in this Agreement. Full bridal makeup, highly detailed eye looks, rhinestones, glitter-heavy looks, face/body art, tattoo coverage, or other advanced/custom looks are not included unless agreed in writing. Non-bridal hair services include basic styling such as curls, buns, or half-up styles. Bobby pins and hair padding needed for the selected basic style are included. Bridal hair planning, bridal hair design, elaborate bridal styling, Hollywood waves, extension styling, washing, blow-drying, drying wet hair, extensions, hair accessories, veil or dupatta placement, jewelry setting, or other advanced/custom hair services are not included unless agreed in writing. Touch-up kits, extra touch-ups, style changes, upgrades, and additional people are subject to Artist availability, may be declined, and must be paid before the additional service begins.",
  responsibilities:
    "Client must provide accurate timing, location, access, parking, room, and service recipient information before the event date. Client is responsible for sharing preparation, timing, allergy-disclosure, conduct, and setup requirements with every person receiving services. Client must provide a clean, safe, smoke-free, well-lit service area with a table or workstation, chair, nearby outlet, and enough space for Artist, assigned assistants, tools, and products.",
  limitations:
    "All people receiving services must be present, ready, and prepared at their scheduled time. Artist may set or revise the order of services to protect the overall timeline. If someone is late, unavailable, unprepared, has wet hair, has makeup already applied, has lash extensions that were supposed to be removed, or otherwise causes delay, Artist may shorten, modify, or skip that service to stay on schedule. No refund, credit, or price reduction will be given for services shortened, modified, skipped, refused, or discontinued due to late arrival, lack of preparation, client delay, guest delay, venue delay, room access issues, safety concerns, or schedule changes outside Artist's control.",
  cancellation:
    "The non-refundable retainer is kept if Client cancels. The parties agree that the cancellation amounts shown in this Agreement are reasonable because Artist reserves the dates, may decline other work, and late replacement bookings may be difficult. A request to reschedule, postpone, change locations, or materially change the timeline is subject to Artist availability and must be agreed in writing. If Artist is unavailable or the parties do not agree to the change, the request is treated as a Client cancellation.",
  emergency:
    "If the Artist cannot perform due to illness, emergency, family emergency, accident, severe weather, venue restrictions, transportation disruption, unsafe conditions, or any circumstances beyond the Artist's reasonable control, the Artist will make reasonable efforts to arrange a qualified substitute. If no substitute is available, the Client will receive a full refund of all amounts paid for any services not performed. If a service is not completed due to the Artist's own delay or inability, and the failure is not caused by the Client, guests, venue, access, preparation, timing, safety, or schedule issues, the Client will receive a refund of the amount paid for that specific unperformed service.",
  general:
    "Artist may take and use photos or videos of completed services for portfolio, website, advertising, or social media only if Client gives written consent. Client may decline without affecting services. This Agreement is governed by New York law. The parties will try to resolve disputes informally first. Any changes must be in writing and confirmed by both parties. Electronic signatures are valid. This Agreement is the full agreement between the parties and replaces prior messages, quotes, or discussions. Services will be performed in accordance with applicable health, sanitation, legal, and venue requirements disclosed to Artist in advance.",
  signatures:
    "By signing below, Client confirms that Client understands the non-refundable retainer, cancellation policy, final payment deadline, guaranteed minimum services, late/unprepared client policy, service limitations, allergy disclosure requirements, and no-payment-no-service rule.",
};

export type DefaultTemplateClauses = typeof defaultTemplateClauses;

export const bridalTemplateClauses: DefaultTemplateClauses = {
  ...defaultTemplateClauses,
  scope:
    "Bridal makeup is a luxury bridal service with skin preparation/skincare included as part of the application, lashes, and a customized bridal makeup look based on the bride's desired style. Bridal hair is a customized bridal style such as a bun, waves, updo, half-up style, or another agreed bridal style. Hair padding, bobby pins, and safety pins needed for a secure finish are included. Synthetic bun extension may be added when requested or needed. Bridal dupatta/veil setting and jewelry placement include placement support for a polished bridal finish. Bridal hijab setup includes customized hijab styling, extra pinning/securing, and styling products or hold techniques as needed for stronger hold. Extra touch-ups, style changes, upgrades, and additional people are subject to Artist availability, may be declined, and must be paid before the additional service begins.",
  responsibilities:
    "Client must provide accurate timing, location, access, parking, room, and service recipient information before the event date. Client is responsible for sharing preparation, timing, allergy-disclosure, conduct, and setup requirements with every person receiving services. Client must provide a clean, safe, smoke-free, well-lit service area with a table or workstation, chair, nearby outlet, and enough space for Artist, assigned assistants, tools, and products. Bridal hair clients must arrive with clean, fully dry hair. Hair extensions are not included and must be provided by the bride. If extensions are used, Artist recommends Bellami extensions or comparable quality extensions approved in advance. Hijab clients should bring an undercap and non-slippery hijab material; cotton or jersey hijab is recommended for best results.",
};

export function defaultContractTemplateBody() {
  return JSON.stringify({ version: 1, clauses: defaultTemplateClauses }, null, 2);
}

export function bridalContractTemplateBody() {
  return JSON.stringify({
    version: 1,
    contractType: "bridal",
    baseAgreement: "Current agreement duplicated with bridal-specific service scope.",
    clauses: bridalTemplateClauses,
  }, null, 2);
}

export function serializeContractTemplate(template: typeof contractTemplatesTable.$inferSelect) {
  return {
    ...template,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

export async function ensureDefaultContractTemplate() {
  const defaultBody = defaultContractTemplateBody();
  const existingDefaults = await db
    .select()
    .from(contractTemplatesTable)
    .where(eq(contractTemplatesTable.isDefault, true))
    .orderBy(desc(contractTemplatesTable.locked), desc(contractTemplatesTable.updatedAt), contractTemplatesTable.id);

  const existingByName = existingDefaults[0]
    ?? (await db
      .select()
      .from(contractTemplatesTable)
      .where(eq(contractTemplatesTable.name, defaultContractTemplateName))
      .limit(1))[0];

  if (existingByName) {
    const [template] = await db.update(contractTemplatesTable)
      .set({
        name: defaultContractTemplateName,
        description: "Locked non-bridal party/event makeup and hair service agreement generated from the current contract view.",
        body: defaultBody,
        active: true,
        isDefault: true,
        locked: true,
        updatedAt: new Date(),
      })
      .where(eq(contractTemplatesTable.id, existingByName.id))
      .returning();

    await clearOtherDefaults(template.id);
    return template;
  }

  const [template] = await db.insert(contractTemplatesTable).values({
    name: defaultContractTemplateName,
    description: "Locked non-bridal party/event makeup and hair service agreement generated from the current contract view.",
    body: defaultBody,
    active: true,
    isDefault: true,
    locked: true,
  }).returning();

  await clearOtherDefaults(template.id);
  return template;
}

export async function ensureBuiltInContractTemplates() {
  const defaultTemplate = await ensureDefaultContractTemplate();
  const bridalBody = bridalContractTemplateBody();
  const [existingBridal] = await db
    .select()
    .from(contractTemplatesTable)
    .where(eq(contractTemplatesTable.name, bridalContractTemplateName))
    .limit(1);

  if (existingBridal) {
    await db.update(contractTemplatesTable)
      .set({
        name: bridalContractTemplateName,
        description: "Locked bridal agreement version duplicated from the current contract view for future bridal-specific edits.",
        body: bridalBody,
        active: true,
        isDefault: false,
        locked: true,
        updatedAt: new Date(),
      })
      .where(eq(contractTemplatesTable.id, existingBridal.id));
    await archiveEditableContractTemplates();
    return defaultTemplate;
  }

  await db.insert(contractTemplatesTable).values({
    name: bridalContractTemplateName,
    description: "Locked bridal agreement version duplicated from the current contract view for future bridal-specific edits.",
    body: bridalBody,
    active: true,
    isDefault: false,
    locked: true,
  });

  await archiveEditableContractTemplates();
  return defaultTemplate;
}

async function archiveEditableContractTemplates() {
  const templates = await db.select().from(contractTemplatesTable);
  await Promise.all(
    templates
      .filter((template) => !template.locked)
      .map((template) => db.update(contractTemplatesTable)
        .set({ active: false, isDefault: false, updatedAt: new Date() })
        .where(eq(contractTemplatesTable.id, template.id))),
  );
}

export async function clearOtherDefaults(templateId?: number) {
  const defaultTemplates = await db.select().from(contractTemplatesTable).where(eq(contractTemplatesTable.isDefault, true));
  await Promise.all(
    defaultTemplates
      .filter((template) => template.id !== templateId)
      .map((template) => db.update(contractTemplatesTable)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(contractTemplatesTable.id, template.id))),
  );
}
