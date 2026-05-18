import { desc, eq } from "drizzle-orm";
import { contractTemplatesTable, db } from "@workspace/db";

export const defaultContractTemplateName = "Makeup & Hair Service Agreement";

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
    "Makeup service rates apply to the selected makeup services shown in this Agreement. Full bridal makeup, highly detailed eye looks, rhinestones, glitter-heavy looks, face/body art, tattoo coverage, or other advanced/custom looks are not included unless agreed in writing. Hair service rates apply to the selected hairstyle categories shown in this Agreement. Washing, blow-drying, drying wet hair, extensions, padding, accessories, veil or dupatta placement, jewelry setting, or elaborate bridal hair are not included unless agreed in writing. Touch-up kits, extra touch-ups, style changes, upgrades, and additional people are subject to Artist availability, may be declined, and must be paid before the additional service begins.",
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

export function defaultContractTemplateBody() {
  return JSON.stringify({ version: 1, clauses: defaultTemplateClauses }, null, 2);
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
        description: "Built-in client agreement generated from the current contract format.",
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
    description: "Built-in client agreement generated from the current contract format.",
    body: defaultBody,
    active: true,
    isDefault: true,
    locked: true,
  }).returning();

  await clearOtherDefaults(template.id);
  return template;
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
