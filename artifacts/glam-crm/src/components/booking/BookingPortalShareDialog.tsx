import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  useGetBookingShareLink,
  useRevokeBookingShareLink,
  useRotateBookingShareLink,
  getGetBookingShareLinkQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, ExternalLink, Link2, RotateCw, ShieldOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";

type Props = { bookingId: number };

export function BookingPortalShareDialog({ bookingId }: Props) {
  const [open, setOpen] = React.useState(false);
  const { data, isLoading } = useGetBookingShareLink(bookingId, {
    query: { enabled: open, queryKey: getGetBookingShareLinkQueryKey(bookingId) },
  });
  const rotate = useRotateBookingShareLink();
  const revoke = useRevokeBookingShareLink();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  function refresh() {
    queryClient.invalidateQueries({ queryKey: getGetBookingShareLinkQueryKey(bookingId) });
  }

  const isRevoked = !!data?.revokedAt;
  const url = data?.url ? `${window.location.origin}${data.url}` : "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Link2 className="h-4 w-4" /> Share portal
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <span className="crm-eyebrow">Portal · Client</span>
          <DialogTitle className="font-serif text-2xl" style={{ fontVariationSettings: "'opsz' 72" }}>
            Share with the client
          </DialogTitle>
          <DialogDescription>
            A private read-only link with the agreement, schedule, and payment status.
          </DialogDescription>
          <div className="crm-gold-rule mt-2" />
        </DialogHeader>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : data ? (
          <div className="space-y-4">
            <div>
              <div className="crm-eyebrow !text-[10px]">Portal URL</div>
              <code className={`mt-1 block break-all rounded-lg border p-3 text-xs ${isRevoked ? "border-destructive/30 bg-destructive/8 text-muted-foreground line-through" : "border-card-border bg-muted/40 text-foreground"}`}>
                {url}
              </code>
              {isRevoked && (
                <div className="mt-1 text-xs text-destructive">
                  Revoked {data.revokedAt ? format(parseISO(data.revokedAt), "MMM d, yyyy") : ""}. Rotate to issue a new link.
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <Meta label="Views" value={String(data.viewCount)} />
              <Meta label="Last viewed" value={data.lastViewedAt ? format(parseISO(data.lastViewedAt), "MMM d, h:mm a") : "Not yet"} />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="default"
                disabled={isRevoked}
                onClick={async () => {
                  await navigator.clipboard.writeText(url);
                  toast({ title: "Portal URL copied" });
                }}
              >
                <Copy className="h-4 w-4" /> Copy URL
              </Button>
              <Button asChild variant="outline" disabled={isRevoked}>
                <a href={url} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" /> Open
                </a>
              </Button>
              <Button
                variant="ghost"
                disabled={rotate.isPending}
                onClick={() =>
                  rotate.mutate(
                    { id: bookingId },
                    {
                      onSuccess: () => {
                        refresh();
                        toast({ title: "Link rotated", description: "Old URL is no longer valid." });
                      },
                    }
                  )
                }
              >
                <RotateCw className="h-4 w-4" /> Rotate
              </Button>
              {!isRevoked && (
                <Button
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  disabled={revoke.isPending}
                  onClick={() =>
                    revoke.mutate(
                      { id: bookingId },
                      {
                        onSuccess: () => {
                          refresh();
                          toast({ title: "Portal link revoked" });
                        },
                      }
                    )
                  }
                >
                  <ShieldOff className="h-4 w-4" /> Revoke
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-card-border bg-card/70 p-3">
      <div className="crm-eyebrow !text-[10px]">{label}</div>
      <div className="mt-1 font-serif text-base text-foreground" style={{ fontVariationSettings: "'opsz' 48" }}>{value}</div>
    </div>
  );
}
