import { useGetContract, getGetContractQueryKey, type BookingLineItem } from "@workspace/api-client-react";
import { useRoute } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO, subDays } from "date-fns";
import { Printer, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { formatUSPhone } from "@/lib/phone";
import { Fragment, useEffect } from "react";

const AGREEMENT_TITLE = "Makeup and Hair Service Agreement";

function contractDocumentTitle(clientName?: string) {
  const safeClientName = clientName
    ?.trim()
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, " ");

  return safeClientName ? `${safeClientName} - ${AGREEMENT_TITLE}` : AGREEMENT_TITLE;
}

function guaranteedServices(event: {
  hairAndMakeupCount?: number;
  hairOnlyCount?: number;
  makeupOnlyCount?: number;
}) {
  const parts: string[] = [];
  if (event.hairAndMakeupCount) parts.push(`${event.hairAndMakeupCount} Hair & Makeup`);
  if (event.hairOnlyCount) parts.push(`${event.hairOnlyCount} Hair Only`);
  if (event.makeupOnlyCount) parts.push(`${event.makeupOnlyCount} Makeup Only`);
  return parts.join("; ") || "—";
}

function eventCalcDescription(event: {
  hairAndMakeupCount?: number;
  hairOnlyCount?: number;
  makeupOnlyCount?: number;
  hairAndMakeupRate?: number;
  hairRate?: number;
  makeupRate?: number;
}) {
  const parts: string[] = [];
  if (event.hairAndMakeupCount)
    parts.push(`${event.hairAndMakeupCount} Hair & Makeup × $${event.hairAndMakeupRate ?? 285}`);
  if (event.hairOnlyCount)
    parts.push(`${event.hairOnlyCount} Hair Only × $${event.hairRate ?? 135}`);
  if (event.makeupOnlyCount)
    parts.push(`${event.makeupOnlyCount} Makeup Only × $${event.makeupRate ?? 150}`);
  return parts.join("; ") || "—";
}

function lineItemAmount(item: BookingLineItem) {
  return item.total ?? item.quantity * item.unitPrice;
}

function lineItemRateDescription(item: BookingLineItem) {
  const amount = `$${item.unitPrice.toLocaleString()}`;
  if (item.unitLabel === "booking" || item.unitLabel === "event") {
    return `${amount} flat`;
  }
  return `${amount} per ${item.unitLabel}`;
}

function formatQuantity(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toLocaleString();
}

function quantityUnitLabel(unitLabel: string, quantity: number) {
  if (unitLabel === "person") return quantity === 1 ? "person" : "people";
  if (quantity === 1 || unitLabel.endsWith("s")) return unitLabel;
  return `${unitLabel}s`;
}

function lineItemQuantityDescription(item: BookingLineItem) {
  return `${formatQuantity(item.quantity)} ${quantityUnitLabel(item.unitLabel, item.quantity)}`;
}

export default function ContractView() {
  const [, params] = useRoute("/bookings/:id/contract");
  const id = parseInt(params?.id || "0", 10);
  const { data: contract, isLoading } = useGetContract(id, {
    query: { enabled: !!id, queryKey: getGetContractQueryKey(id) },
  });

  useEffect(() => {
    if (!contract) return;

    const previousTitle = document.title;
    document.title = contractDocumentTitle(contract.client.name);

    return () => {
      document.title = previousTitle;
    };
  }, [contract]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-8 space-y-8">
        <Skeleton className="h-12 w-64 mx-auto" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (!contract) return <div className="p-8 text-center">Contract not found</div>;

  const { booking, client, events } = contract;
  const lineItems = booking.lineItems ?? [];
  const today = new Date();
  const artistName = contract.artistName ?? "Yeasmin Bhuiyan";
  const artistEmail = contract.artistEmail ?? "yeasminbhuiyan1997@gmail.com";
  const artistPhone = contract.artistPhone ?? "";
  const artistPaymentMethod = contract.artistPaymentMethod ?? "";
  const artistContact = [artistEmail, artistPhone].filter(Boolean).join(" / ");
  const clientPhone = client.phone ? formatUSPhone(client.phone) : "";
  const earlyMorningFee = booking.earlyMorningFee ?? 0;
  const travelFee = booking.travelFee ?? 0;
  const pricedEvents = events.filter((event) => event.subtotal > 0);
  const lineItemsByEventId = new Map<number, BookingLineItem[]>();
  const bookingLevelLineItems = lineItems.filter((item) => !item.eventId);
  lineItems.forEach((item) => {
    if (!item.eventId) return;
    lineItemsByEventId.set(item.eventId, [...(lineItemsByEventId.get(item.eventId) ?? []), item]);
  });
  const eventChargeGroups = events
    .map((event) => ({
      event,
      lineItems: lineItemsByEventId.get(event.id) ?? [],
    }))
    .filter((group) => group.event.subtotal > 0 || group.lineItems.length > 0);

  const firstDate = booking.firstServiceDate ? parseISO(booking.firstServiceDate) : null;
  const cancel90Date = firstDate ? format(subDays(firstDate, 90), "MMMM d, yyyy") : null;
  const cancel89Date = firstDate ? format(subDays(firstDate, 89), "MMMM d, yyyy") : null;
  const cancel31Date = firstDate ? format(subDays(firstDate, 31), "MMMM d, yyyy") : null;
  const cancel30Date = firstDate ? format(subDays(firstDate, 30), "MMMM d, yyyy") : null;

  const remainingBalance = Math.max(0, booking.grandTotal - booking.retainerAmount);
  const halfTotal = (booking.grandTotal * 0.5).toFixed(2);

  const defaultMakeupRate = events[0]?.makeupRate ?? 150;
  const defaultHairRate = events[0]?.hairRate ?? 135;
  const defaultHamRate = events[0]?.hairAndMakeupRate ?? 285;
  const pricingLineItems = lineItems.length > 0
    ? lineItems
    : [];

  return (
    <div className="bg-white min-h-screen text-black text-[14px]">
      {/* Action bar — hidden on print */}
      <div className="print:hidden sticky top-0 z-10 bg-gray-100 border-b border-gray-300 px-6 py-3 flex justify-between items-center">
        <Link href={`/bookings/${id}`} className="inline-flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-black">
          <ArrowLeft className="w-4 h-4" /> Back to Booking
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 bg-black text-white text-sm font-medium px-4 py-2 rounded hover:bg-gray-800 transition-colors"
          data-testid="btn-print-contract"
        >
          <Printer className="w-4 h-4" /> Print / Download PDF
        </button>
      </div>

      {/* Contract Document */}
      <div className="contract-print-page max-w-[820px] mx-auto px-10 py-10 print:px-8 print:py-6 font-sans">

        {/* Header */}
        <div className="text-center mb-8 pb-6 border-b-2 border-black">
          <h1 className="text-2xl font-bold tracking-tight uppercase mb-1">Makeup &amp; Hair Service Agreement</h1>
          <p className="text-sm text-gray-600">Professional Makeup and Hair Services for Wedding Events</p>
          <p className="text-sm mt-3 max-w-2xl mx-auto">
            This Makeup &amp; Hair Service Agreement ("Agreement") is between{" "}
            <strong>{artistName}</strong> ("Artist") and <strong>{client.name}</strong> ("Client") for
            makeup and hair services at <strong>{booking.location}</strong>. This Agreement becomes binding when
            signed by both parties and the non-refundable retainer is received by Artist.
          </p>
        </div>

        {/* Section 1 */}
        <Section number="1" title="Booking Information">
          <table className="w-full border-collapse text-sm">
            <tbody>
              <InfoRow label="Artist / Service Provider" value={artistName} emphasized />
              <InfoRow label="Client" value={client.name} emphasized />
              <InfoRow label="Client Email / Phone" value={[client.email, clientPhone].filter(Boolean).join(" / ")} />
              <InfoRow label="Artist Email / Phone" value={artistContact} />
              <InfoRow label="Primary Service Location" value={booking.location} />
              <InfoRow
                label="Specific Room / Suite"
                value={booking.locationDetail || "To be provided by Client no later than 14 days before the first service date"}
              />
              <InfoRow
                label="First Service Date"
                value={firstDate ? format(firstDate, "MMMM d, yyyy") : "To be confirmed"}
                emphasized
              />
              <InfoRow label="All Times" value="Eastern Time" />
              <InfoRow label="Agreement Date" value={format(today, "MMMM d, yyyy")} emphasized />
            </tbody>
          </table>
        </Section>

        {/* Section 2 */}
        <Section number="2" title="Service Schedule">
          <p className="text-sm text-gray-700 mb-4">
            The service windows below are for scheduling and coordination. Contracted services, quantities,
            and fees are listed in the Pricing section. Artist is not responsible for the actual start time of
            any ceremony, reception, cocktail hour, photo session, or other event activity.
          </p>
          {events.length > 0 ? (
            <>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <Th>Event</Th>
                    <Th>Date</Th>
                    <Th>Services Begin</Th>
                    <Th>Completion Target</Th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(e => (
                    <tr key={e.id} className="border-b border-gray-200">
                      <Td>{e.eventName}</Td>
                      <Td>{format(parseISO(e.eventDate), "MMM. d, yyyy")}</Td>
                      <Td>{e.servicesBegin || "—"}</Td>
                      <Td>{e.completionTarget || "—"}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p className="italic text-gray-500 text-sm">No events scheduled yet.</p>
          )}
        </Section>

        {/* Section 3 */}
        <Section number="3" title="Pricing">
          <p className="text-sm text-gray-700 mb-4">
            The rate schedule lists the unit prices. The booking charges table applies those rates to the
            selected quantities for this Agreement.
          </p>

          <div className="mb-5">
            <h3 className="font-bold text-sm mb-2">Rate Schedule</h3>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <Th>Service / Fee</Th>
                  <Th right>Unit Rate</Th>
                </tr>
              </thead>
              <tbody>
                {pricingLineItems.length > 0 ? (
                  pricingLineItems.map((item) => (
                    <tr key={item.id} className="border-b border-gray-200">
                      <Td>{item.name}</Td>
                      <Td right>{lineItemRateDescription(item)}</Td>
                    </tr>
                  ))
                ) : (
                  <>
                    <tr className="border-b border-gray-200"><Td>Makeup</Td><Td right>${defaultMakeupRate} per person</Td></tr>
                    <tr className="border-b border-gray-200"><Td>Hair</Td><Td right>${defaultHairRate} per person</Td></tr>
                    <tr className="border-b border-gray-200"><Td>Hair &amp; Makeup</Td><Td right>${defaultHamRate} per person</Td></tr>
                  </>
                )}
                {earlyMorningFee > 0 && (
                  <tr className="border-b border-gray-200"><Td>Early Morning Fee</Td><Td right>${earlyMorningFee.toLocaleString()}</Td></tr>
                )}
                {travelFee > 0 && (
                  <tr className="border-b border-gray-200"><Td>Travel Fee</Td><Td right>${travelFee.toLocaleString()}</Td></tr>
                )}
              </tbody>
            </table>
          </div>

          <h3 className="font-bold text-sm mb-2">Booking Charges</h3>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <Th>Selected Service / Fee</Th>
                <Th>Quantity</Th>
                <Th>Unit Rate</Th>
                <Th right>Amount</Th>
              </tr>
            </thead>
            <tbody>
              {eventChargeGroups.map(({ event, lineItems: assignedLineItems }) => (
                <Fragment key={event.id}>
                  <tr key={`event-${event.id}`} className="border-b border-gray-200 bg-gray-50">
                    <Td colSpan={4}><strong>{event.eventName}</strong></Td>
                  </tr>
                  {event.subtotal > 0 && (
                    <tr key={`event-subtotal-${event.id}`} className="border-b border-gray-200">
                      <Td>{event.eventName}</Td>
                      <Td>{guaranteedServices(event)}</Td>
                      <Td>{eventCalcDescription(event)}</Td>
                      <Td right>${event.subtotal.toLocaleString()}</Td>
                    </tr>
                  )}
                  {assignedLineItems.map((item) => (
                    <tr key={item.id} className="border-b border-gray-200">
                      <Td>{item.name}</Td>
                      <Td>{lineItemQuantityDescription(item)}</Td>
                      <Td>{lineItemRateDescription(item)}</Td>
                      <Td right>${lineItemAmount(item).toLocaleString()}</Td>
                    </tr>
                  ))}
                </Fragment>
              ))}
              {bookingLevelLineItems.map((item) => (
                <tr key={item.id} className="border-b border-gray-200">
                  <Td>{item.name}</Td>
                  <Td>{lineItemQuantityDescription(item)}</Td>
                  <Td>{lineItemRateDescription(item)}</Td>
                  <Td right>${lineItemAmount(item).toLocaleString()}</Td>
                </tr>
              ))}
              {earlyMorningFee > 0 && (
                <tr className="border-b border-gray-200">
                  <Td>Early Morning Fee</Td>
                  <Td>1 booking</Td>
                  <Td>${earlyMorningFee.toLocaleString()} flat</Td>
                  <Td right>${earlyMorningFee.toLocaleString()}</Td>
                </tr>
              )}
              {travelFee > 0 && (
                <tr className="border-b border-gray-200">
                  <Td>Travel Fee</Td>
                  <Td>1 booking</Td>
                  <Td>${travelFee.toLocaleString()} flat</Td>
                  <Td right>${travelFee.toLocaleString()}</Td>
                </tr>
              )}
              <tr className="font-bold text-base border-t-2 border-black">
                <td className="py-2 px-3" colSpan={3}>Grand Total</td>
                <td className="py-2 px-3 text-right">${booking.grandTotal.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
          <ClientInitials className="mt-2" />
        </Section>

        {/* Section 4 */}
        <Section number="4" title="Retainer, Final Payment, and Payment Method">
          <table className="w-full border-collapse text-sm mb-4">
            <thead>
              <tr className="bg-gray-100">
                <Th>Payment Item</Th>
                <Th right>Amount / Deadline</Th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200 font-semibold"><Td>Grand Total</Td><Td right>${booking.grandTotal.toLocaleString()}</Td></tr>
              <tr className="border-b border-gray-200">
                <Td>Non-Refundable Retainer / Booking Fee</Td>
                <Td right>${booking.retainerAmount.toLocaleString()}, due upon signing</Td>
              </tr>
              <tr className="border-b border-gray-200"><Td>Remaining Balance</Td><Td right>${remainingBalance.toLocaleString()}</Td></tr>
              <tr className="border-b border-gray-200">
                <Td>Final Payment Deadline</Td>
                <Td right>
                  {booking.balanceDueDate
                    ? `5:00 PM Eastern Time on ${format(parseISO(booking.balanceDueDate), "MMMM d, yyyy")}`
                    : "On or before the date of service"}
                </Td>
              </tr>
              <tr className="border-b border-gray-200">
                <Td>Payment Method</Td>
                <Td right>{booking.paymentMethod || artistPaymentMethod || "As agreed"}</Td>
              </tr>
            </tbody>
          </table>
          <p className="text-sm text-gray-700 mb-2">
            The retainer is earned upon receipt because Artist reserves the requested dates and times, may decline
            other work, and begins planning. No dates or times are reserved until this Agreement is signed and the
            retainer is received. The retainer is non-refundable and non-transferable.
          </p>
          <p className="text-sm text-gray-700 mb-3">
            The remaining balance must be paid in cleared funds by the deadline above. Artist is not required to
            begin or continue services until the balance is paid. Client should send payment confirmation after
            payment is completed.
          </p>
          <ClientInitials />
        </Section>

        {/* Section 5 */}
        <Section number="5" title="Service Scope">
          <p className="text-sm text-gray-700 mb-2">
            <strong>Makeup:</strong> The ${defaultMakeupRate} makeup rate applies to non-bridal event makeup / soft glam. Full bridal
            makeup, highly detailed eye looks, rhinestones, glitter-heavy looks, face/body art, tattoo coverage,
            or other advanced/custom looks are not included unless agreed in writing.
          </p>
          <p className="text-sm text-gray-700 mb-2">
            <strong>Hair:</strong> The ${defaultHairRate} hair rate applies only when clients for the same event choose the same
            hairstyle category: curls, half-up half-down, or bun styles. Washing, blow-drying, drying wet hair,
            extensions, hair padding, hair accessories, veil/dupatta placement, jewelry setting, or elaborate
            bridal hair are not included unless agreed in writing.
          </p>
          <p className="text-sm text-gray-700 mb-2">
            <strong>Add-ons:</strong> Touch-up kits, extra touch-ups, style changes, upgrades, and additional
            people are subject to Artist availability, may be declined, and must be paid before the additional
            service begins.
          </p>
          <p className="text-sm text-gray-700">
            <strong>Assigned artists:</strong> {artistName} is assigned to provide makeup. Hair may be
            performed by an assistant, second artist, subcontracted hair stylist, or other assigned professional
            selected by Artist. Artist may bring additional artists or assistants as needed to complete the agreed
            services.
          </p>
        </Section>

        {/* Section 6 */}
        <Section number="6" title="Client Preparation and Setup">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <Th>Item</Th>
                <Th>Requirement</Th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200 align-top">
                <Td><strong>Makeup</strong></Td>
                <Td>Arrive with a clean face, no makeup applied, groomed/done eyebrows, and no lash extensions unless Artist agrees otherwise.</Td>
              </tr>
              <tr className="border-b border-gray-200 align-top">
                <Td><strong>Hair</strong></Td>
                <Td>Hair must be clean, fully dry, detangled, and free from excessive oils or heavy products. Wet or unprepared hair may cause delays, extra fees, shortened service, or skipped service.</Td>
              </tr>
              <tr className="border-b border-gray-200 align-top">
                <Td><strong>Service area</strong></Td>
                <Td>Client must provide a clean, safe, smoke-free, well-lit service area with a table/workstation, chair, nearby outlet, and enough space for Artist, assigned assistants, tools, and products.</Td>
              </tr>
              <tr className="border-b border-gray-200 align-top">
                <Td><strong>Venue details</strong></Td>
                <Td>Client must provide the room/suite, venue access instructions, parking instructions, and final timeline no later than 14 days before the first service date. Any venue insurance/vendor approval requirements must be disclosed no later than 30 days before the first service date.</Td>
              </tr>
            </tbody>
          </table>
          <p className="text-sm text-gray-700 mt-3">
            Client is responsible for sharing preparation, timing, allergy-disclosure, conduct, and setup
            requirements with every person receiving services.
          </p>
        </Section>

        {/* Section 7 */}
        <Section number="7" title="Timeline, Late Clients, Safety, and Conduct">
          <p className="text-sm text-gray-700 mb-2">
            All people receiving services must be present, ready, and prepared at their scheduled time. Artist may
            set or revise the order of services to protect the overall timeline. If someone is late, unavailable,
            unprepared, has wet hair, has makeup already applied, has lash extensions that were supposed to be
            removed, or otherwise causes delay, Artist may shorten, modify, or skip that service to stay on
            schedule.
          </p>
          <p className="text-sm text-gray-700 mb-2">
            No refund, credit, or price reduction will be given for services shortened, modified, or skipped due
            to late arrival, lack of preparation, client delay, guest delay, venue delay, room access issues, or
            schedule changes outside Artist's control. Client-caused overtime is $100 per hour, billed in
            30-minute increments, subject to Artist availability.
          </p>
          <p className="text-sm text-gray-700 mb-2">
            <strong>Sanitation and allergies:</strong> Artist and assigned assistants will use reasonable
            professional sanitation practices. Client and all people receiving services must disclose allergies,
            sensitivities, skin/eye/scalp conditions, medical concerns, recent procedures, or product reactions
            before service. Artist may refuse or stop a service if it appears unsafe or unsanitary. Artist is not
            responsible for reactions caused by undisclosed conditions, unknown sensitivities, prior treatments,
            or failure to follow preparation instructions.
          </p>
          <ClientInitials className="mb-3" />
          <p className="text-sm text-gray-700 mb-2">
            <strong>Smoking, alcohol, drugs, and unsafe conduct:</strong> No smoking, vaping, hookah, drug use,
            or open alcoholic drinks are allowed in the immediate service area. Persons actively receiving
            services may not drink alcohol during application. Artist may refuse or discontinue service for anyone
            intoxicated, disruptive, unsafe, aggressive, or unable to sit properly. No refund will be provided for
            services refused or discontinued under this section.
          </p>
          <p className="text-sm text-gray-700 mb-2">
            <strong>Damages and guest responsibility:</strong> Client is responsible for payments, delays,
            damages, added services, missed services, and policy violations caused by Client, service recipients,
            guests, children, pets, venue staff, or others in Client's event group. Client is responsible for
            actual damage to Artist products, tools, lighting, supplies, or equipment, except ordinary wear and
            tear.
          </p>
          <ClientInitials className="mb-3" />
          {travelFee > 0 && (
            <p className="text-sm text-gray-700">
              <strong>Travel and venue costs:</strong> The ${travelFee.toLocaleString()} travel fee is
              all-inclusive and covers every travel-related cost for the Artist to and from the {booking.location}{" "}
              service location, including parking, valet, tolls, rideshare, loading fees, room access fees, and
              any other transportation expenses. No additional travel-related charges will be billed to the
              Client.
            </p>
          )}
        </Section>

        {/* Section 8 */}
        <Section number="8" title="Cancellation and Rescheduling">
          <p className="text-sm text-gray-700 mb-3">
            The non-refundable retainer is kept if Client cancels. The parties agree that the cancellation amounts
            below are reasonable because Artist reserves the dates, may decline other work, and late replacement
            bookings may be difficult.
          </p>
          <table className="w-full border-collapse text-sm mb-4">
            <thead>
              <tr className="bg-gray-100">
                <Th>If Client Cancels</Th>
                <Th right>Total Amount Owed by Client (Including Retainer)</Th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200 align-top">
                <Td>
                  <div>
                    <strong>90 calendar days</strong> or more before the First Service Date
                  </div>
                  <div className="text-gray-700 italic mt-1">
                    {cancel90Date
                      ? `(on or before ${cancel90Date})`
                      : "(Cancellation-date cutoff will be calculated after First Service Date is set)"}
                  </div>
                </Td>
                <Td right>
                  <strong>${booking.retainerAmount.toLocaleString()}</strong> — the non-refundable retainer only
                </Td>
              </tr>
              <tr className="border-b border-gray-200 align-top">
                <Td>
                  <div>
                    <strong>31 to 89 calendar days</strong> before the First Service Date
                  </div>
                  <div className="text-gray-700 italic mt-1">
                    {cancel89Date && cancel31Date
                      ? `(${cancel89Date} – ${cancel31Date})`
                      : "(Cancellation-date range will be calculated after First Service Date is set)"}
                  </div>
                </Td>
                <Td right>
                  <strong>${parseFloat(halfTotal).toLocaleString()}</strong> — 50% of the total contract amount
                </Td>
              </tr>
              <tr className="border-b border-gray-200 align-top">
                <Td>
                  <div>
                    <strong>30 calendar days</strong> or fewer before the First Service Date
                  </div>
                  <div className="text-gray-700 italic mt-1">
                    {cancel30Date
                      ? `(on or after ${cancel30Date})`
                      : "(Cancellation-date cutoff will be calculated after First Service Date is set)"}
                  </div>
                </Td>
                <Td right>
                  <strong>${booking.grandTotal.toLocaleString()}</strong> — 100% of the total contract amount
                </Td>
              </tr>
            </tbody>
          </table>
          <p className="text-sm text-gray-700 mb-2">
            Any amount the Client has already paid (including the ${booking.retainerAmount.toLocaleString()} retainer) is applied
            to the total owed above. If the Client has paid less than the amount owed, the difference is due
            immediately upon cancellation. If the Client has paid more, the excess will be refunded, except for
            the non-refundable retainer.
          </p>
          <p className="text-sm text-gray-700 mb-3">
            A request to reschedule, postpone, change locations, or materially change the timeline is subject to
            Artist availability and must be agreed in writing. If Artist is unavailable or the parties do not
            agree to the change, the request is treated as a Client cancellation. In that case, the cancellation
            tier and total amount owed are determined by the date the Client submitted the reschedule request,
            measured against the original First Service Date{firstDate ? ` of ${format(firstDate, "MMMM d, yyyy")}` : ""}.
          </p>
          <ClientInitials />
        </Section>

        {/* Section 9 */}
        <Section number="9" title="Artist Emergency and Limited Remedies">
          <p className="text-sm text-gray-700 mb-2">
            If the Artist cannot perform due to illness, emergency, family emergency, accident, severe weather,
            venue restrictions, transportation disruption, unsafe conditions, or any circumstances beyond the
            Artist's reasonable control, the Artist will make reasonable efforts to arrange a qualified
            substitute. If a substitute is available, the Client agrees that the substitute may perform the
            contracted services.
          </p>
          <p className="text-sm text-gray-700 mb-2">
            <strong>Client's Remedy — If No Substitute is Available:</strong> The Client will receive a full
            refund of all amounts paid for any services not performed.
          </p>
          <p className="text-sm text-gray-700 mb-3">
            <strong>Client's Remedy — If a Service is Not Completed Due to the Artist's Own Delay or
            Inability:</strong> Provided the failure is not caused by the Client, guests, venue, access,
            preparation, timing, safety, or schedule issues, the Client will receive a refund of the amount paid
            for that specific unperformed service.
          </p>
          <ClientInitials />
        </Section>

        {/* Section 10 */}
        <Section number="10" title="Photo Consent and General Terms">
          <p className="text-sm text-gray-700 mb-3">
            <strong>Photo/video use:</strong> Artist may take and use photos or videos of completed services for
            portfolio, website, advertising, or social media only if Client gives written consent below. Client
            may decline without affecting services.
          </p>
          <div className="space-y-1 text-sm mb-4">
            <div>[ &nbsp;&nbsp; ] Client grants portfolio/social media permission.</div>
            <div>[ &nbsp;&nbsp; ] Client declines portfolio/social media permission.</div>
          </div>
          <p className="text-sm text-gray-700">
            <strong>General terms:</strong> This Agreement is governed by New York law. The parties will try to
            resolve disputes informally first. Any changes must be in writing and confirmed by both parties.
            Electronic signatures are valid. This Agreement is the full agreement between the parties and replaces
            prior messages, quotes, or discussions. Services will be performed in accordance with applicable
            health, sanitation, legal, and venue requirements disclosed to Artist in advance.
          </p>
          <p className="text-sm text-gray-700 mt-3">
            By signing below, Client confirms that Client understands the non-refundable retainer, cancellation
            policy, final payment deadline, guaranteed minimum services, late/unprepared client policy, service
            limitations, allergy disclosure requirements, and no-payment-no-service rule.
          </p>
        </Section>

        {/* Section 11 */}
        <Section number="11" title="Agreement and Signatures">
          <div className="grid grid-cols-2 gap-12 text-sm">
            <div>
              <div className="font-bold text-center mb-4 uppercase tracking-wide text-xs">CLIENT</div>
              <SignatureLine label="Name" value={client.name} />
              <SignatureLine label="Signature" blank />
              <SignatureLine label="Date" blank />
              <SignatureLine label="Email" value={client.email} />
              <SignatureLine label="Phone" value={clientPhone} blank={!clientPhone} />
            </div>
            <div>
              <div className="font-bold text-center mb-4 uppercase tracking-wide text-xs">ARTIST</div>
              <SignatureLine label="Name" value={artistName} />
              <SignatureLine label="Signature" blank />
              <SignatureLine label="Date" blank />
              <SignatureLine label="Email" value={artistEmail} />
              <SignatureLine label="Phone" value={artistPhone} blank={!artistPhone} />
            </div>
          </div>
        </Section>

        <div className="text-center text-xs text-gray-400 mt-10 pt-6 border-t">
          Makeup &amp; Hair Service Agreement · {artistName} · Generated {format(today, "MMMM d, yyyy")}
        </div>
      </div>
    </div>
  );
}

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="font-bold text-base border-b-2 border-black pb-1 mb-3">
        {number}. {title}
      </h2>
      {children}
    </div>
  );
}

function InfoRow({
  label,
  value,
  emphasized,
}: {
  label: string;
  value: React.ReactNode;
  emphasized?: boolean;
}) {
  return (
    <tr className="border-b border-gray-200">
      <th className="text-left py-2 px-3 font-medium w-1/3 bg-gray-50">{label}</th>
      <td className={`py-2 px-3 ${emphasized ? "font-semibold" : ""}`}>{value || "—"}</td>
    </tr>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={`py-2 px-3 font-semibold text-left ${right ? "text-right" : ""}`}>{children}</th>
  );
}

function Td({ children, right, colSpan }: { children: React.ReactNode; right?: boolean; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={`py-2 px-3 ${right ? "text-right" : ""}`}>{children}</td>
  );
}

function ClientInitials({ className = "" }: { className?: string }) {
  return <p className={`text-sm font-semibold ${className}`}>Client Initials: _____</p>;
}

function SignatureLine({ label, value, blank }: { label: string; value?: string; blank?: boolean }) {
  return (
    <div className="mb-3">
      <div className="text-xs text-gray-500 font-medium mb-1">{label}:</div>
      {blank || !value ? (
        <div className="border-b border-black h-6 w-full" />
      ) : (
        <div className="text-sm">{value}</div>
      )}
    </div>
  );
}
