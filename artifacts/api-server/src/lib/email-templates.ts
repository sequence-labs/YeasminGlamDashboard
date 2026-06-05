import { eq } from "drizzle-orm";
import {
  db,
  emailTemplatesTable,
  clientsTable,
  bookingsTable,
  eventsTable,
  artistProfilesTable,
  type EmailTemplate,
} from "@workspace/db";

export const BUILT_IN_TEMPLATES: Array<{ slug: string; name: string; subject: string; body: string }> = [
  {
    slug: "inquiry-reply",
    name: "Inquiry Reply",
    subject: "Thank you for reaching out, {{client_name}}",
    body: [
      "Hi {{client_name}},",
      "",
      "Thank you so much for your inquiry about {{event_type}} on {{event_date}}. I'd love to help you look and feel your best.",
      "",
      "Could we set up a quick call this week to discuss your vision and timing? Once we're aligned, I'll send a contract and a small retainer reserves your date.",
      "",
      "Warmly,",
      "{{artist_name}}",
    ].join("\n"),
  },
  {
    slug: "trial-confirmation",
    name: "Trial Confirmation",
    subject: "Your trial is confirmed — {{event_date}}",
    body: [
      "Hi {{client_name}},",
      "",
      "Just confirming your trial on {{event_date}} at {{services_begin}}. Please come with clean, dry hair and a bare face. Bring any inspiration photos and the accessories (veil, dupatta, jewelry) you plan to wear day-of.",
      "",
      "I'll have skin prep, lashes, and a tonal kit ready. Can't wait!",
      "",
      "Warmly,",
      "{{artist_name}}",
    ].join("\n"),
  },
  {
    slug: "retainer-reminder",
    name: "Retainer Reminder",
    subject: "A small reminder — {{event_type}} retainer",
    body: [
      "Hi {{client_name}},",
      "",
      "I'm so excited to be part of your {{event_type}} on {{event_date}}. To officially lock the date, the retainer of {{retainer_amount}} is the next step.",
      "",
      "Payment instructions: {{payment_instructions}}",
      "",
      "Let me know once it's sent — I'll confirm right away.",
      "",
      "Warmly,",
      "{{artist_name}}",
    ].join("\n"),
  },
  {
    slug: "day-before-logistics",
    name: "Day-Before Logistics",
    subject: "Tomorrow's plan — {{event_type}}",
    body: [
      "Hi {{client_name}},",
      "",
      "Just a quick note ahead of tomorrow. I'll arrive ready to start services at {{services_begin}} at {{location}}.",
      "",
      "Please make sure everyone receiving services arrives with clean skin, hair dry and brushed, and any extensions/accessories ready. A nearby outlet, table, and chair would be wonderful.",
      "",
      "Texting me any last-minute timing changes is totally fine — see you soon!",
      "",
      "Warmly,",
      "{{artist_name}}",
    ].join("\n"),
  },
  {
    slug: "thank-you",
    name: "Thank You",
    subject: "Thank you — and a small ask",
    body: [
      "Hi {{client_name}},",
      "",
      "It was such a joy being a part of your {{event_type}}. Thank you for trusting me with one of your most special days.",
      "",
      "If the experience was a wonderful one, I'd be so grateful for a quick review or a referral. Either makes such a difference for a small studio like mine.",
      "",
      "With love,",
      "{{artist_name}}",
    ].join("\n"),
  },
];

export async function ensureBuiltInEmailTemplates() {
  for (const template of BUILT_IN_TEMPLATES) {
    const existing = await db.select().from(emailTemplatesTable).where(eq(emailTemplatesTable.slug, template.slug)).limit(1);
    if (existing[0]) continue;
    await db.insert(emailTemplatesTable).values({
      slug: template.slug,
      name: template.name,
      subject: template.subject,
      body: template.body,
      builtIn: true,
      active: true,
    });
  }
}

export function serializeEmailTemplate(t: EmailTemplate) {
  return {
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export function applyMergeFields(text: string, fields: Record<string, string>): string {
  return text.replace(/\{\{\s*([\w_]+)\s*\}\}/g, (_, name: string) => {
    const value = fields[name];
    return value === undefined ? `{{${name}}}` : value;
  });
}

function moneyString(n: number) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function buildHandleSummary(artist: typeof artistProfilesTable.$inferSelect) {
  const parts: string[] = [];
  if (artist.zelleHandle) parts.push(`Zelle: ${artist.zelleHandle}`);
  if (artist.venmoHandle) parts.push(`Venmo: ${artist.venmoHandle}`);
  if (artist.cashAppHandle) parts.push(`Cash App: ${artist.cashAppHandle}`);
  return parts.length ? parts.join(" · ") : null;
}

export async function buildMergeFields(input: { clientId?: number | null; bookingId?: number | null }): Promise<Record<string, string>> {
  const fields: Record<string, string> = {
    client_name: "your name",
    client_first_name: "your name",
    event_type: "event",
    event_date: "TBA",
    services_begin: "TBA",
    retainer_amount: "$0",
    balance_amount: "$0",
    grand_total: "$0",
    location: "TBA",
    payment_instructions: "TBA",
    artist_name: "the studio",
    artist_business_name: "the studio",
    artist_email: "",
    artist_phone: "",
  };

  const [artist] = await db.select().from(artistProfilesTable).orderBy(artistProfilesTable.id).limit(1);
  if (artist) {
    fields.artist_name = artist.displayName ?? fields.artist_name;
    fields.artist_business_name = artist.businessName ?? fields.artist_business_name;
    fields.artist_email = artist.email ?? "";
    fields.artist_phone = artist.phone ?? "";
    fields.payment_instructions = artist.paymentInstructions ?? buildHandleSummary(artist) ?? fields.payment_instructions;
  }

  if (input.clientId) {
    const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, input.clientId));
    if (client) {
      fields.client_name = client.name;
      fields.client_first_name = client.name.split(/\s+/)[0] ?? client.name;
    }
  }

  if (input.bookingId) {
    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, input.bookingId));
    if (booking) {
      const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, booking.clientId));
      if (client) {
        fields.client_name = client.name;
        fields.client_first_name = client.name.split(/\s+/)[0] ?? client.name;
      }
      fields.event_type = booking.eventType;
      fields.event_date = booking.firstServiceDate ?? "TBA";
      fields.location = booking.location;
      const grandTotal = parseFloat(booking.grandTotal as unknown as string);
      const retainerAmount = parseFloat(booking.retainerAmount as unknown as string);
      fields.grand_total = moneyString(grandTotal);
      fields.retainer_amount = moneyString(retainerAmount);
      fields.balance_amount = moneyString(Math.max(0, grandTotal - (booking.retainerPaid ? retainerAmount : 0)));

      const [firstEvent] = await db
        .select()
        .from(eventsTable)
        .where(eq(eventsTable.bookingId, booking.id))
        .orderBy(eventsTable.sortOrder, eventsTable.eventDate, eventsTable.id)
        .limit(1);
      if (firstEvent?.servicesBegin) fields.services_begin = firstEvent.servicesBegin;
    }
  }

  return fields;
}

export async function renderTemplateForBooking(template: EmailTemplate, input: { clientId?: number | null; bookingId?: number | null }) {
  const fields = await buildMergeFields(input);
  return {
    subject: applyMergeFields(template.subject, fields),
    body: applyMergeFields(template.body, fields),
  };
}
