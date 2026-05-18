import { useGetContract, getGetContractQueryKey } from "@workspace/api-client-react";
import { useRoute } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import { Printer, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function ContractView() {
  const [, params] = useRoute("/bookings/:id/contract");
  const id = parseInt(params?.id || "0", 10);

  const { data: contract, isLoading } = useGetContract(id, { query: { enabled: !!id, queryKey: getGetContractQueryKey(id) } });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-8 space-y-8">
        <Skeleton className="h-12 w-64 mx-auto" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!contract) {
    return <div className="p-8 text-center">Contract not found</div>;
  }

  const { booking, client, events } = contract;
  const today = new Date();

  return (
    <div className="bg-white min-h-screen text-black">
      {/* Non-printable action bar */}
      <div className="print:hidden bg-muted p-4 flex justify-between items-center border-b border-border sticky top-0 z-10">
        <Link
          href={`/bookings/${id}`}
          className="inline-flex items-center text-sm font-medium hover:underline text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Booking
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4"
          data-testid="btn-print-contract"
        >
          <Printer className="w-4 h-4 mr-2" /> Print / Download PDF
        </button>
      </div>

      {/* Printable Document */}
      <div className="max-w-[800px] mx-auto p-8 sm:p-12 font-serif text-[15px] leading-relaxed print:p-0 print:text-[12px]">
        <header className="text-center mb-12 border-b border-black pb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-2 uppercase">Service Agreement</h1>
          <p className="text-gray-600 font-sans tracking-widest text-sm uppercase">Makeup & Hair Artistry</p>
        </header>

        <section className="mb-10">
          <p className="mb-6">
            This Service Agreement ("Agreement") is made effective as of <strong>{format(today, "MMMM d, yyyy")}</strong>, by and between <strong>Yeasmin</strong> ("Artist") and <strong>{client.name}</strong> ("Client").
          </p>

          <div className="grid grid-cols-2 gap-8 p-6 bg-gray-50 border border-gray-200 print:bg-transparent print:border-black rounded">
            <div>
              <h3 className="font-bold uppercase text-xs tracking-wider text-gray-500 mb-2 print:text-black">Artist Info</h3>
              <p><strong>Name:</strong> {contract.artistName}</p>
              {contract.artistEmail && <p><strong>Email:</strong> {contract.artistEmail}</p>}
            </div>
            <div>
              <h3 className="font-bold uppercase text-xs tracking-wider text-gray-500 mb-2 print:text-black">Client Info</h3>
              <p><strong>Name:</strong> {client.name}</p>
              <p><strong>Email:</strong> {client.email}</p>
              {client.phone && <p><strong>Phone:</strong> {client.phone}</p>}
            </div>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold border-b border-gray-300 pb-2 mb-4 print:border-black">1. Event Details</h2>
          <table className="w-full text-left border-collapse">
            <tbody>
              <tr className="border-b border-gray-200 print:border-gray-400">
                <th className="py-3 font-medium w-1/3">Event Type</th>
                <td className="py-3">{booking.eventType}</td>
              </tr>
              <tr className="border-b border-gray-200 print:border-gray-400">
                <th className="py-3 font-medium">Primary Location</th>
                <td className="py-3">{booking.location} {booking.locationDetail && `(${booking.locationDetail})`}</td>
              </tr>
              {booking.firstServiceDate && (
                <tr className="border-b border-gray-200 print:border-gray-400">
                  <th className="py-3 font-medium">First Service Date</th>
                  <td className="py-3">{format(parseISO(booking.firstServiceDate), "MMMM d, yyyy")}</td>
                </tr>
              )}
              <tr className="border-b border-gray-200 print:border-gray-400">
                <th className="py-3 font-medium">Booking Status</th>
                <td className="py-3 capitalize">{booking.status}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold border-b border-gray-300 pb-2 mb-4 print:border-black">2. Service Schedule</h2>
          {events.length > 0 ? (
            <div className="space-y-6">
              {events.map(event => (
                <div key={event.id} className="border border-gray-200 print:border-black rounded p-4">
                  <h3 className="font-bold text-lg mb-2">{event.eventName} — {format(parseISO(event.eventDate), "MMMM d, yyyy")}</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm font-sans">
                    <div><strong>Services Begin:</strong> {event.servicesBegin || "TBD"}</div>
                    <div><strong>Completion Target:</strong> {event.completionTarget || "TBD"}</div>
                  </div>
                  <table className="w-full text-sm font-sans">
                    <thead className="bg-gray-100 print:bg-gray-200">
                      <tr>
                        <th className="text-left p-2">Service</th>
                        <th className="text-center p-2">Count</th>
                        <th className="text-right p-2">Rate</th>
                        <th className="text-right p-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!!event.hairAndMakeupCount && (
                        <tr className="border-b border-gray-100">
                          <td className="p-2">Hair & Makeup</td>
                          <td className="text-center p-2">{event.hairAndMakeupCount}</td>
                          <td className="text-right p-2">${event.hairAndMakeupRate}</td>
                          <td className="text-right p-2">${(event.hairAndMakeupCount * (event.hairAndMakeupRate || 0))}</td>
                        </tr>
                      )}
                      {!!event.hairOnlyCount && (
                        <tr className="border-b border-gray-100">
                          <td className="p-2">Hair Only</td>
                          <td className="text-center p-2">{event.hairOnlyCount}</td>
                          <td className="text-right p-2">${event.hairRate}</td>
                          <td className="text-right p-2">${(event.hairOnlyCount * (event.hairRate || 0))}</td>
                        </tr>
                      )}
                      {!!event.makeupOnlyCount && (
                        <tr className="border-b border-gray-100">
                          <td className="p-2">Makeup Only</td>
                          <td className="text-center p-2">{event.makeupOnlyCount}</td>
                          <td className="text-right p-2">${event.makeupRate}</td>
                          <td className="text-right p-2">${(event.makeupOnlyCount * (event.makeupRate || 0))}</td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3} className="text-right p-2 font-bold italic">Event Subtotal:</td>
                        <td className="text-right p-2 font-bold">${event.subtotal.toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ))}
            </div>
          ) : (
            <p className="italic text-gray-500">No services scheduled yet.</p>
          )}
        </section>

        <section className="mb-10 page-break-inside-avoid">
          <h2 className="text-2xl font-bold border-b border-gray-300 pb-2 mb-4 print:border-black">3. Pricing & Payment Schedule</h2>

          <div className="flex justify-end mb-6">
            <table className="w-1/2 min-w-[300px]">
              <tbody>
                <tr>
                  <td className="py-1">Services Total:</td>
                  <td className="py-1 text-right">${events.reduce((sum, e) => sum + e.subtotal, 0).toLocaleString()}</td>
                </tr>
                {booking.earlyMorningFee > 0 && (
                  <tr>
                    <td className="py-1">Early Morning Fee:</td>
                    <td className="py-1 text-right">${booking.earlyMorningFee.toLocaleString()}</td>
                  </tr>
                )}
                {booking.travelFee > 0 && (
                  <tr>
                    <td className="py-1">Travel Fee:</td>
                    <td className="py-1 text-right">${booking.travelFee.toLocaleString()}</td>
                  </tr>
                )}
                <tr className="border-t-2 border-black font-bold text-xl">
                  <td className="py-3">Grand Total:</td>
                  <td className="py-3 text-right">${booking.grandTotal.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-gray-50 print:bg-transparent border border-gray-200 print:border-black p-6 rounded">
            <h3 className="font-bold mb-4">Payment Requirements</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Non-Refundable Retainer:</strong> ${booking.retainerAmount.toLocaleString()} is required to secure the date. This amount is deducted from the Grand Total.
              </li>
              <li>
                <strong>Remaining Balance:</strong> ${Math.max(0, booking.grandTotal - booking.retainerAmount).toLocaleString()} is due {booking.balanceDueDate ? `no later than ${format(parseISO(booking.balanceDueDate), "MMMM d, yyyy")}` : "on or before the date of service"}.
              </li>
              {booking.paymentMethod && (
                <li>
                  <strong>Accepted Payment Method:</strong> {booking.paymentMethod}
                </li>
              )}
            </ul>
          </div>
        </section>

        <section className="mb-12 space-y-6 text-sm font-sans text-gray-800 print:text-black">
          <h2 className="text-2xl font-bold border-b border-gray-300 pb-2 mb-4 print:border-black font-serif text-black">4. Terms & Conditions</h2>

          <div>
            <h3 className="font-bold mb-1">Cancellations</h3>
            <p>The retainer is strictly non-refundable and non-transferable. If the Client cancels the event within 30 days of the scheduled date, the Client will be responsible for 50% of the remaining balance. Cancellations within 14 days require payment in full.</p>
          </div>

          <div>
            <h3 className="font-bold mb-1">Preparation</h3>
            <p>A clean working environment with ample natural lighting and table space is requested. Client and all parties receiving services must have a clean face (no makeup) and clean, dry hair prior to the Artist's arrival, unless otherwise instructed.</p>
          </div>

          <div>
            <h3 className="font-bold mb-1">Delays & Timeliness</h3>
            <p>A late fee may be assessed if the Client or their party is more than 15 minutes late for a scheduled service slot. The Artist is not responsible for incomplete services due to Client delays.</p>
          </div>

          <div>
            <h3 className="font-bold mb-1">Photography</h3>
            <p>The Artist reserves the right to take photos or video of the makeup applications and use them for promotional purposes, unless the Client expressly requests privacy in writing before the event.</p>
          </div>
        </section>

        <section className="pt-12 border-t-2 border-black page-break-inside-avoid">
          <p className="mb-12 italic">By signing below, the Client agrees to all terms and conditions stated in this Agreement.</p>

          <div className="grid grid-cols-2 gap-12">
            <div>
              <div className="border-b border-black h-12 mb-2"></div>
              <p className="font-bold">Client Signature</p>
              <p className="text-gray-500 text-sm mt-1">Date: _________________</p>
            </div>
            <div>
              <div className="border-b border-black h-12 mb-2"></div>
              <p className="font-bold">Artist Signature ({contract.artistName})</p>
              <p className="text-gray-500 text-sm mt-1">Date: _________________</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
