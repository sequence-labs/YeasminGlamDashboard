import * as React from "react";
import { useRoute } from "wouter";
import {
  useGetPortalBooking,
  useSignPortalContract,
  getGetPortalBookingQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import { CheckCircle2, ExternalLink, FileSignature, MapPin, ShieldCheck } from "lucide-react";

export default function PortalPage() {
  const [, params] = useRoute("/p/:token");
  const token = params?.token;
  const { data, isLoading, error } = useGetPortalBooking(token || "", {
    query: { enabled: !!token, queryKey: getGetPortalBookingQueryKey(token || "") },
  });

  if (!token) return <PortalShell><PortalEmpty title="Invalid link" detail="This link is missing a token." /></PortalShell>;
  if (isLoading) {
    return (
      <PortalShell>
        <div className="space-y-4">
          <Skeleton className="h-12 w-2/3" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-60 w-full" />
        </div>
      </PortalShell>
    );
  }
  if (error || !data) {
    return (
      <PortalShell>
        <PortalEmpty title="Link unavailable" detail="This portal link has been revoked or does not exist." />
      </PortalShell>
    );
  }

  const { booking, client, events, payments, signed, signedAt, signedByName, retainerAmount, balanceDue, grandTotal } = data;
  const nextEvent = events[0];
  const bookingHeadline = nextEvent?.eventName || `${booking.eventType} engagement`;
  const paid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const paidPct = grandTotal > 0 ? Math.min(100, Math.round((paid / grandTotal) * 100)) : 0;

  return (
    <PortalShell businessName={data.artistBusinessName} artistName={data.artistName}>
      <header className="mb-10">
        <span className="crm-eyebrow">Your engagement · {booking.eventType}</span>
        <h1 className="mt-2 font-serif text-4xl text-foreground sm:text-5xl" style={{ fontVariationSettings: "'opsz' 144", letterSpacing: "-0.02em" }}>
          {client.name}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
          {data.artistName} has prepared the following for your records. Please review the agreement and submit your signature below.
        </p>
        <div className="crm-gold-rule mt-6 w-20" />
      </header>

      {nextEvent && (
        <section className="crm-section mb-8 grid gap-6 p-6 sm:grid-cols-[200px_minmax(0,1fr)]">
          <div className="relative rounded-xl border border-card-border bg-accent/40 p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {format(parseISO(nextEvent.eventDate), "EEEE")}
            </div>
            <div className="mt-3 font-serif text-[3.25rem] leading-[0.95] text-foreground" style={{ fontVariationSettings: "'opsz' 144", letterSpacing: "-0.04em" }}>
              {format(parseISO(nextEvent.eventDate), "d")}
            </div>
            <div className="mt-1 font-serif text-base text-muted-foreground" style={{ fontVariationSettings: "'opsz' 48" }}>
              {format(parseISO(nextEvent.eventDate), "MMMM yyyy")}
            </div>
            <div className="crm-gold-rule mt-5 w-full" />
            <div className="mt-4 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {nextEvent.servicesBegin || "Time TBD"}
            </div>
          </div>
          <div>
            <span className="crm-eyebrow">{nextEvent.eventName}</span>
            <h2 className="mt-1 font-serif text-2xl text-foreground" style={{ fontVariationSettings: "'opsz' 96" }}>
              {bookingHeadline}
            </h2>
            <div className="mt-4 flex items-start gap-2 text-sm text-foreground/80">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span>{booking.location}</span>
            </div>
          </div>
        </section>
      )}

      <section className="crm-section mb-8 overflow-hidden">
        <div className="border-b border-card-border/70 px-6 py-5">
          <span className="crm-eyebrow">Money · ledger</span>
          <h2 className="crm-section-title mt-1">Payment status</h2>
        </div>
        <div className="grid gap-6 p-6 sm:grid-cols-3">
          <Money label="Contract total" value={grandTotal} emphasis />
          <Money label="Retainer" value={retainerAmount} hint={booking.retainerPaid ? "Paid" : "Outstanding"} tone={booking.retainerPaid ? "ok" : "warn"} />
          <Money label="Balance" value={balanceDue} hint={booking.balancePaid ? "Paid" : "Due before event"} tone={booking.balancePaid ? "ok" : "warn"} />
        </div>
        <div className="px-6 pb-6">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all duration-500" style={{ width: `${paidPct}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            <span>{paidPct}% collected</span>
            <span>${(grandTotal - paid).toLocaleString()} remaining</span>
          </div>
        </div>
      </section>

      <section className="crm-section mb-8 overflow-hidden">
        <div className="border-b border-card-border/70 px-6 py-5">
          <span className="crm-eyebrow">Agreement</span>
          <h2 className="crm-section-title mt-1">Contract</h2>
        </div>
        <div className="px-6 py-6">
          <div
            className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed text-foreground/90"
            dangerouslySetInnerHTML={{ __html: data.contractTemplate.body }}
          />
        </div>
      </section>

      {signed ? (
        <section className="crm-section overflow-hidden border-emerald-400/40 bg-emerald-400/5">
          <div className="px-6 py-6">
            <span className="crm-eyebrow">Signed · on record</span>
            <h2 className="crm-section-title mt-1 text-emerald-800 dark:text-emerald-300">Thank you, {signedByName}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Signed {signedAt ? format(parseISO(signedAt), "MMMM d, yyyy 'at' h:mm a") : ""}.
              {data.artistEmail && <> Questions? Email <a className="underline" href={`mailto:${data.artistEmail}`}>{data.artistEmail}</a>.</>}
            </p>
          </div>
        </section>
      ) : (
        <SignatureSection token={token} />
      )}

      {(data.zelleHandle || data.venmoHandle || data.cashAppHandle || data.paymentInstructions) && (
        <section className="crm-section mt-8 overflow-hidden">
          <div className="border-b border-card-border/70 px-6 py-5">
            <span className="crm-eyebrow">Payment · methods</span>
            <h2 className="crm-section-title mt-1">How to pay</h2>
          </div>
          <div className="grid gap-4 p-6 sm:grid-cols-3">
            {data.zelleHandle && <PaymentMethod label="Zelle" handle={data.zelleHandle} amount={booking.retainerPaid ? balanceDue : retainerAmount} note={`${client.name} · ${bookingHeadline}`} />}
            {data.venmoHandle && <PaymentMethod label="Venmo" handle={data.venmoHandle} link={`https://venmo.com/${encodeURIComponent(data.venmoHandle.replace(/^@/, ""))}`} amount={booking.retainerPaid ? balanceDue : retainerAmount} note={`${client.name} · ${bookingHeadline}`} />}
            {data.cashAppHandle && <PaymentMethod label="Cash App" handle={data.cashAppHandle} link={`https://cash.app/${encodeURIComponent(data.cashAppHandle.startsWith("$") ? data.cashAppHandle : "$" + data.cashAppHandle)}`} amount={booking.retainerPaid ? balanceDue : retainerAmount} note={`${client.name} · ${bookingHeadline}`} />}
          </div>
          {data.paymentInstructions && (
            <div className="border-t border-card-border/60 px-6 py-4 text-xs text-muted-foreground">{data.paymentInstructions}</div>
          )}
        </section>
      )}
    </PortalShell>
  );
}

function SignatureSection({ token }: { token: string }) {
  const sign = useSignPortalContract();
  const queryClient = useQueryClient();
  const [name, setName] = React.useState("");
  const [initials, setInitials] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [agree, setAgree] = React.useState(false);
  const canSubmit = name.trim().length > 0 && initials.trim().length > 0 && agree && !sign.isPending;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    sign.mutate(
      { token, data: { signerName: name.trim(), signerInitials: initials.trim(), signerEmail: email.trim() || undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetPortalBookingQueryKey(token) });
        },
      }
    );
  }

  return (
    <section className="crm-section overflow-hidden">
      <div className="border-b border-card-border/70 px-6 py-5">
        <span className="crm-eyebrow">Signature · required</span>
        <h2 className="crm-section-title mt-1">Sign the agreement</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          By typing your full name and initials, you accept the terms above. A timestamped record is kept by the studio.
        </p>
      </div>
      <form onSubmit={submit} className="grid gap-4 p-6 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="crm-eyebrow !text-[10px]">Full legal name</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" required />
        </label>
        <label className="space-y-1.5">
          <span className="crm-eyebrow !text-[10px]">Initials</span>
          <Input value={initials} onChange={(e) => setInitials(e.target.value.toUpperCase())} placeholder="JD" maxLength={6} required />
        </label>
        <label className="space-y-1.5 sm:col-span-2">
          <span className="crm-eyebrow !text-[10px]">Email (optional)</span>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </label>
        <label className="flex items-start gap-2 text-sm text-foreground/85 sm:col-span-2">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-card-border text-primary focus-visible:ring-2 focus-visible:ring-primary/30"
          />
          <span>
            I have read and agree to the terms of this booking agreement. My typed name above constitutes my legally binding signature.
          </span>
        </label>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={!canSubmit} className="w-full sm:w-auto">
            <FileSignature className="h-4 w-4" /> {sign.isPending ? "Submitting…" : "Sign agreement"}
          </Button>
          {sign.isError && (
            <p className="mt-2 text-xs text-destructive">Could not save your signature. Please try again.</p>
          )}
        </div>
      </form>
    </section>
  );
}

function Money({ label, value, hint, tone, emphasis }: { label: string; value: number; hint?: string; tone?: "ok" | "warn"; emphasis?: boolean }) {
  return (
    <div>
      <div className="crm-eyebrow !text-[10px]">{label}</div>
      <div
        className={`mt-1 font-serif text-3xl tabular-nums ${emphasis ? "text-foreground" : "text-foreground/90"}`}
        style={{ fontVariationSettings: "'opsz' 96" }}
      >
        ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </div>
      {hint && (
        <div className={`mt-1 text-[11px] uppercase tracking-[0.12em] ${tone === "ok" ? "text-emerald-700 dark:text-emerald-300" : tone === "warn" ? "text-primary" : "text-muted-foreground"}`}>
          {tone === "ok" && <CheckCircle2 className="inline h-3 w-3" strokeWidth={2} />} {hint}
        </div>
      )}
    </div>
  );
}

function PaymentMethod({ label, handle, link, amount, note }: { label: string; handle: string; link?: string; amount: number; note: string }) {
  const venmoDeep = label === "Venmo"
    ? `venmo://paycharge?txn=pay&recipients=${encodeURIComponent(handle.replace(/^@/, ""))}&amount=${amount}&note=${encodeURIComponent(note)}`
    : undefined;
  return (
    <div className="rounded-xl border border-card-border bg-card p-4">
      <div className="crm-eyebrow !text-[10px]">{label}</div>
      <div className="mt-1 font-serif text-lg text-foreground" style={{ fontVariationSettings: "'opsz' 48" }}>{handle}</div>
      <div className="mt-1 text-xs text-muted-foreground">Suggested: ${amount.toLocaleString()} · {note}</div>
      {venmoDeep && (
        <Button asChild size="sm" variant="outline" className="mt-3">
          <a href={venmoDeep}>Open Venmo <ExternalLink className="h-3 w-3" /></a>
        </Button>
      )}
      {link && !venmoDeep && (
        <Button asChild size="sm" variant="outline" className="mt-3">
          <a href={link} target="_blank" rel="noreferrer">Open {label} <ExternalLink className="h-3 w-3" /></a>
        </Button>
      )}
    </div>
  );
}

function PortalShell({ children, businessName, artistName }: { children: React.ReactNode; businessName?: string; artistName?: string }) {
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-card-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <div>
            <div className="crm-eyebrow">{businessName || "Glam Studio"}</div>
            <div className="font-serif text-base text-foreground" style={{ fontVariationSettings: "'opsz' 48" }}>
              {artistName || "Client portal"}
            </div>
          </div>
          <ShieldCheck className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10 sm:py-14">{children}</main>
      <footer className="mx-auto max-w-3xl px-6 pb-12 text-center text-xs text-muted-foreground">
        Private portal · please do not share this URL.
      </footer>
    </div>
  );
}

function PortalEmpty({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <h1 className="font-serif text-3xl text-foreground" style={{ fontVariationSettings: "'opsz' 96" }}>{title}</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}
