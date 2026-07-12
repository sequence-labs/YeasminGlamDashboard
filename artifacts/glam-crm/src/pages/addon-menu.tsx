import * as React from "react";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, Plus, Minus, Sparkles } from "lucide-react";
import { usePublicAddonMenu, useRequestFromMenu } from "@/lib/addons-api";

function money(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AddonMenuPage() {
  const [, params] = useRoute("/a-menu/:shareToken");
  const shareToken = params?.shareToken ?? "";
  const [, navigate] = useLocation();
  const { data, isLoading, error } = usePublicAddonMenu(shareToken);
  const request = useRequestFromMenu(shareToken);
  const [qty, setQty] = React.useState<Record<number, number>>({});

  const selected = React.useMemo(
    () => Object.entries(qty).filter(([, q]) => q > 0).map(([id, q]) => ({ serviceItemId: Number(id), quantity: q })),
    [qty],
  );
  const total = React.useMemo(() => {
    if (!data) return 0;
    return selected.reduce((sum, s) => {
      const svc = data.services.find((x) => x.id === s.serviceItemId);
      return sum + (svc ? svc.defaultUnitPrice * s.quantity : 0);
    }, 0);
  }, [selected, data]);

  if (!shareToken) return <Shell><Empty title="Invalid link" detail="This menu link is missing its token." /></Shell>;
  if (isLoading) {
    return <Shell><div className="space-y-4"><Skeleton className="h-10 w-2/3" /><Skeleton className="h-64 w-full" /></div></Shell>;
  }
  if (error || !data) {
    return <Shell><Empty title="Menu unavailable" detail="This link has been revoked or doesn't exist. Please contact the studio." /></Shell>;
  }

  function bump(id: number, delta: number) {
    setQty((prev) => {
      const next = Math.max(0, (prev[id] ?? 0) + delta);
      return { ...prev, [id]: next };
    });
  }

  function submit() {
    if (selected.length === 0) return;
    request.mutate(
      { items: selected },
      { onSuccess: (res) => navigate(res.approvalUrl) },
    );
  }

  return (
    <Shell businessName={data.businessName} artistName={data.artistName}>
      <header className="mb-7">
        <span className="crm-eyebrow">Upgrade menu</span>
        <h1 className="mt-2 font-serif text-3xl text-foreground sm:text-4xl" style={{ fontVariationSettings: "'opsz' 96", letterSpacing: "-0.02em" }}>
          Enhance your look
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {data.artistName} offers the add-ons below for <span className="font-medium text-foreground/80">{data.bookingHeadline}</span>. Pick what you'd like, then confirm with a quick email verification. Nothing is charged until you approve.
        </p>
        <div className="crm-gold-rule mt-5 w-16" />
      </header>

      <section className="crm-section mb-6 overflow-hidden">
        <ul className="divide-y divide-card-border/60">
          {data.services.map((svc) => {
            const q = qty[svc.id] ?? 0;
            return (
              <li key={svc.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">{svc.name}</div>
                  {svc.description && <div className="mt-0.5 text-xs text-muted-foreground">{svc.description}</div>}
                  <div className="mt-0.5 text-xs text-muted-foreground">{money(svc.defaultUnitPrice)} / {svc.unitLabel}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    aria-label={`Remove one ${svc.name}`}
                    onClick={() => bump(svc.id, -1)}
                    disabled={q === 0}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-card-border text-foreground disabled:opacity-40"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-6 text-center tabular-nums text-sm text-foreground">{q}</span>
                  <button
                    type="button"
                    aria-label={`Add one ${svc.name}`}
                    onClick={() => bump(svc.id, 1)}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-card-border text-foreground"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="sticky bottom-4 z-10">
        <div className="crm-section flex items-center justify-between gap-4 p-4 shadow-lg">
          <div>
            <div className="crm-eyebrow !text-[10px]">Selected</div>
            <div className="font-serif text-xl tabular-nums text-foreground" style={{ fontVariationSettings: "'opsz' 72" }}>{money(total)}</div>
          </div>
          <Button onClick={submit} disabled={selected.length === 0 || request.isPending} className="h-12 px-6 text-base">
            <Sparkles className="h-4 w-4" /> {request.isPending ? "Preparing…" : "Continue to approve"}
          </Button>
        </div>
        {request.isError && <p className="mt-2 text-center text-sm text-destructive">{(request.error as Error)?.message ?? "Something went wrong."}</p>}
      </div>
    </Shell>
  );
}

function Shell({ children, businessName, artistName }: { children: React.ReactNode; businessName?: string; artistName?: string }) {
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-card-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between px-5 py-4">
          <div>
            <div className="crm-eyebrow">{businessName || "Glam Studio"}</div>
            <div className="font-serif text-base text-foreground" style={{ fontVariationSettings: "'opsz' 48" }}>{artistName || "Client portal"}</div>
          </div>
          <ShieldCheck className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
        </div>
      </header>
      <main className="mx-auto max-w-xl px-5 py-8 sm:py-12">{children}</main>
      <footer className="mx-auto max-w-xl px-5 pb-10 text-center text-xs text-muted-foreground">
        Private link · please do not share this URL.
      </footer>
    </div>
  );
}

function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <h1 className="font-serif text-2xl text-foreground" style={{ fontVariationSettings: "'opsz' 72" }}>{title}</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}
