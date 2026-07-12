import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Booking status color coding. Kept distinct from the payment-status palette (amber
// "payment pending" / emerald "paid") to avoid two badge families competing for the same
// hues on the same row: draft stays neutral (nothing to see here), active is blue
// (unused elsewhere in the app), completed is emerald, cancelled is red.
const STATUS_STYLES: Record<string, { classes: string; dot: string }> = {
  draft: {
    classes: "border-border bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/50",
  },
  active: {
    classes: "border-blue-600/30 bg-blue-600/12 text-blue-700 dark:border-blue-400/30 dark:bg-blue-400/12 dark:text-blue-300",
    dot: "bg-blue-600 dark:bg-blue-400",
  },
  completed: {
    classes: "border-emerald-700/30 bg-emerald-700/12 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/12 dark:text-emerald-300",
    dot: "bg-emerald-700 dark:bg-emerald-400",
  },
  cancelled: {
    classes: "border-destructive/30 bg-destructive/12 text-destructive",
    dot: "bg-destructive",
  },
};

function styleFor(status: string) {
  return STATUS_STYLES[status] ?? STATUS_STYLES.draft;
}

/** Tailwind classes only — for callers that need to compose their own badge markup. */
export function bookingStatusTone(status: string): string {
  return styleFor(status).classes;
}

/** A booking-status pill with a colored dot, consistent across dashboard/bookings/etc. */
export function BookingStatusBadge({ status, className }: { status: string; className?: string }) {
  const style = styleFor(status);
  return (
    <Badge variant="outline" className={cn(style.classes, className)}>
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", style.dot)} />
      {status}
    </Badge>
  );
}
