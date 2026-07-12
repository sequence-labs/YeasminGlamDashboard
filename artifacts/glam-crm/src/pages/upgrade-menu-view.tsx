import { useRoute, Link } from "wouter";
import { useEffect } from "react";
import {
  useGetContract,
  getGetContractQueryKey,
  useListServiceItems,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Printer, ArrowLeft } from "lucide-react";
import { renderDescription } from "@/lib/description";

function formatMoney(value: number) {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function rateDescription(unitPrice: number, unitLabel: string) {
  if (unitLabel === "booking" || unitLabel === "event") return `${formatMoney(unitPrice)} flat`;
  return `${formatMoney(unitPrice)} per ${unitLabel}`;
}

export default function UpgradeMenuView() {
  const [, params] = useRoute("/bookings/:id/upgrade-menu");
  const id = parseInt(params?.id || "0", 10);
  const { data: contract, isLoading } = useGetContract(id, {
    query: { enabled: !!id, queryKey: getGetContractQueryKey(id) },
  });
  const { data: services, isLoading: servicesLoading } = useListServiceItems();

  useEffect(() => {
    if (!contract) return;
    const previous = document.title;
    const business = contract.artistBusinessName?.trim() || contract.artistName?.trim() || "Studio";
    document.title = `${business} - Upgrade Menu`;
    return () => {
      document.title = previous;
    };
  }, [contract]);

  if (isLoading || servicesLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-8 p-8">
        <Skeleton className="mx-auto h-12 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (!contract) {
    return (
      <div className="mx-auto max-w-xl p-8">
        <div className="crm-section p-10 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Booking not found</h2>
          <Link href="/bookings" className="mt-6 inline-flex text-xs font-medium uppercase tracking-[0.14em] text-primary hover:underline">
            Return to bookings
          </Link>
        </div>
      </div>
    );
  }

  const { client } = contract;
  const artistName = contract.artistName ?? "Yeasmin Bhuiyan";
  const artistBusinessName = (contract.artistBusinessName?.trim() || artistName).trim();
  const artistEmail = contract.artistEmail ?? "";
  const artistPhone = contract.artistPhone ?? "";
  const artistContact = [artistEmail, artistPhone].filter(Boolean).join(" / ");
  const activeServices = (services ?? [])
    .filter((s) => s.active && s.showOnUpgradeMenu)
    .sort((a, b) => a.sortOrder - b.sortOrder);

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
          data-testid="btn-print-upgrade-menu"
        >
          <Printer className="w-4 h-4" /> Print / Download PDF
        </button>
      </div>

      <div className="contract-print-page max-w-[820px] mx-auto px-10 py-10 print:px-8 print:py-6 font-sans">
        {/* Header */}
        <div className="text-center mb-8 pb-6 border-b-2 border-black">
          <p className="text-sm uppercase tracking-[0.18em] text-gray-600">{artistBusinessName}</p>
          <h1 className="text-2xl font-bold text-black tracking-tight uppercase mt-1 mb-1">Upgrade &amp; Add-On Menu</h1>
          <p className="text-sm text-gray-600">Enhancements available for your event</p>
          <p className="text-sm mt-3 max-w-2xl mx-auto">
            Prepared for <strong>{client.name}</strong> by <strong>{artistName}</strong>. Review the available
            add-ons below. To add any of these — before the event or on the day — your artist will send a secure
            link where you confirm with a one-time email code. Nothing is charged until you approve in writing.
          </p>
        </div>

        {/* Menu table */}
        {activeServices.length === 0 ? (
          <p className="text-sm text-gray-700">No add-on services are currently listed.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-black bg-gray-100">
                <th className="py-2 px-3 font-semibold text-left">Add-On</th>
                <th className="py-2 px-3 font-semibold text-right whitespace-nowrap">Rate</th>
              </tr>
            </thead>
            <tbody>
              {activeServices.map((s) => (
                <tr key={s.id} className="border-b border-gray-200 align-top">
                  <td className="py-2 px-3">
                    <div className="font-medium text-black">{s.name}</div>
                    {s.description && (
                      <div className="mt-0.5 text-xs text-gray-600">{renderDescription(s.description)}</div>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right whitespace-nowrap">{rateDescription(s.defaultUnitPrice, s.unitLabel)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-600">
          <p className="mb-1">
            <strong>How approvals work:</strong> Each approved add-on is treated as a written amendment to your
            signed service agreement and is added to your balance. Approval requires a one-time code sent to the
            email on file, so every add-on is confirmed by you — not added on your behalf.
          </p>
          {artistContact && <p className="mt-2">Questions? Contact {artistName} at {artistContact}.</p>}
        </div>
      </div>
    </div>
  );
}
