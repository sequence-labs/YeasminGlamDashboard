import * as React from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, ShieldCheck, XCircle, Mail, Sparkles } from "lucide-react";
import { usePublicAddon, useSendAddonCode, useDecideAddon } from "@/lib/addons-api";

function money(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AddonApprovalPage() {
  const [, params] = useRoute("/a/:token");
  const token = params?.token ?? "";
  const { data, isLoading, error } = usePublicAddon(token);

  if (!token) return <Shell><Empty title="Invalid link" detail="This approval link is missing its token." /></Shell>;
  if (isLoading) {
    return (
      <Shell>
        <div className="space-y-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </Shell>
    );
  }
  if (error || !data) {
    return <Shell><Empty title="Link unavailable" detail="This approval link has expired or doesn't exist. Please contact the studio." /></Shell>;
  }

  return (
    <Shell businessName={data.businessName} artistName={data.artistName}>
      <header className="mb-7">
        <span className="crm-eyebrow">Add-on approval</span>
        <h1 className="mt-2 font-serif text-3xl text-foreground sm:text-4xl" style={{ fontVariationSettings: "'opsz' 96", letterSpacing: "-0.02em" }}>
          {data.bookingHeadline}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {data.artistName} has requested your approval for the add-on{data.items.length > 1 ? "s" : ""} below. Approving adds the amount to your balance as a written amendment to your signed agreement.
        </p>
        <div className="crm-gold-rule mt-5 w-16" />
      </header>

      <section className="crm-section mb-6 overflow-hidden">
        <div className="border-b border-card-border/70 px-5 py-4">
          <span className="crm-eyebrow">Requested add-on{data.items.length > 1 ? "s" : ""}</span>
        </div>
        <ul className="divide-y divide-card-border/60">
          {data.items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-4 px-5 py-4">
              <div>
                <div className="text-sm font-medium text-foreground">
                  {item.quantity > 1 ? `${item.quantity} × ` : ""}{item.name}
                </div>
                {item.description && <div className="mt-0.5 text-xs text-muted-foreground">{item.description}</div>}
                <div className="mt-0.5 text-xs text-muted-foreground">{money(item.unitPrice)} / {item.unitLabel}</div>
              </div>
              <div className="shrink-0 font-serif text-base tabular-nums text-foreground">{money(item.lineTotal)}</div>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t border-card-border px-5 py-4">
          <span className="crm-eyebrow !text-[10px]">Total to add</span>
          <span className="font-serif text-2xl tabular-nums text-foreground" style={{ fontVariationSettings: "'opsz' 96" }}>{money(data.total)}</span>
        </div>
        {data.artistNote && (
          <div className="border-t border-card-border/60 bg-accent/30 px-5 py-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/80">Note from {data.artistName}: </span>{data.artistNote}
          </div>
        )}
      </section>

      {data.status === "pending" && (data.hasContact
        ? <VerifyAndDecide token={token} destinationMasked={data.destinationMasked ?? "your email"} />
        : <NoContact />)}
      {data.status === "approved" && (
        <Decided tone="ok" icon={<CheckCircle2 className="h-5 w-5" />} title="Approved" detail={`You approved ${money(data.total)} in add-ons${data.decidedAt ? ` on ${new Date(data.decidedAt).toLocaleString()}` : ""}. This amount has been added to your balance.`} />
      )}
      {data.status === "declined" && (
        <Decided tone="warn" icon={<XCircle className="h-5 w-5" />} title="Declined" detail="You declined this add-on request. Nothing has been added to your balance." />
      )}
      {(data.status === "cancelled" || data.status === "expired") && (
        <Decided tone="muted" icon={<XCircle className="h-5 w-5" />} title={data.status === "cancelled" ? "Cancelled" : "Expired"} detail={`This request is no longer active (${data.status}). Please contact the studio if you have questions.`} />
      )}
    </Shell>
  );
}

function VerifyAndDecide({ token, destinationMasked }: { token: string; destinationMasked: string }) {
  const sendCode = useSendAddonCode(token);
  const decide = useDecideAddon(token);
  const [code, setCode] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [devCode, setDevCode] = React.useState<string | undefined>();

  const canDecide = code.trim().length >= 4 && !decide.isPending;

  function handleSend() {
    sendCode.mutate(undefined, {
      onSuccess: (res) => {
        setSent(true);
        setDevCode(res.devCode);
      },
    });
  }

  return (
    <section className="crm-section overflow-hidden">
      <div className="border-b border-card-border/70 px-5 py-4">
        <span className="crm-eyebrow">Verify it's you</span>
        <h2 className="crm-section-title mt-1">Confirm by email code</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          To make sure this is really you, we'll email a one-time code to <span className="font-medium text-foreground/80">{destinationMasked}</span>.
        </p>
      </div>
      <div className="space-y-4 p-5">
        {!sent ? (
          <Button onClick={handleSend} disabled={sendCode.isPending} className="h-12 w-full text-base">
            <Mail className="h-4 w-4" /> {sendCode.isPending ? "Sending…" : "Email me a code"}
          </Button>
        ) : (
          <>
            <div className="rounded-xl border border-emerald-400/40 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">
              Code sent to {destinationMasked}. Enter it below. It expires in 10 minutes.
            </div>
            {devCode && (
              <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-xs text-amber-700 dark:text-amber-300">
                Dev mode — your code is <span className="font-mono font-semibold">{devCode}</span> (this only shows locally).
              </div>
            )}
            <label className="block space-y-1.5">
              <span className="crm-eyebrow !text-[10px]">Verification code</span>
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                placeholder="123456"
                className="h-12 text-center text-lg tracking-[0.4em]"
              />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Button
                onClick={() => decide.mutate({ decision: "approve", code: code.trim() })}
                disabled={!canDecide}
                className="h-12 w-full text-base"
              >
                <CheckCircle2 className="h-4 w-4" /> {decide.isPending ? "Submitting…" : "Approve"}
              </Button>
              <Button
                variant="outline"
                onClick={() => decide.mutate({ decision: "decline", code: code.trim() })}
                disabled={!canDecide}
                className="h-12 w-full text-base"
              >
                <XCircle className="h-4 w-4" /> Decline
              </Button>
            </div>
            <button
              type="button"
              onClick={handleSend}
              disabled={sendCode.isPending}
              className="text-xs text-muted-foreground underline underline-offset-2 disabled:opacity-50"
            >
              Didn't get it? Resend code
            </button>
            {decide.isError && (
              <p className="text-sm text-destructive">{(decide.error as Error)?.message ?? "Something went wrong. Try again."}</p>
            )}
          </>
        )}
        {sendCode.isError && <p className="text-sm text-destructive">{(sendCode.error as Error)?.message ?? "Could not send a code. Try again."}</p>}
      </div>
    </section>
  );
}

function NoContact() {
  return (
    <section className="crm-section overflow-hidden">
      <div className="px-5 py-6 text-sm text-muted-foreground">
        <Sparkles className="mb-2 h-5 w-5 text-muted-foreground" />
        There's no email on file to verify your identity. Please contact the studio so they can add your email, then reopen this link.
      </div>
    </section>
  );
}

function Decided({ tone, icon, title, detail }: { tone: "ok" | "warn" | "muted"; icon: React.ReactNode; title: string; detail: string }) {
  const border = tone === "ok" ? "border-emerald-400/40 bg-emerald-400/5" : tone === "warn" ? "border-primary/40 bg-primary/5" : "border-card-border";
  const text = tone === "ok" ? "text-emerald-800 dark:text-emerald-300" : tone === "warn" ? "text-primary" : "text-foreground";
  return (
    <section className={`crm-section overflow-hidden ${border}`}>
      <div className="px-5 py-6">
        <div className={`flex items-center gap-2 ${text}`}>
          {icon}
          <h2 className="font-serif text-xl" style={{ fontVariationSettings: "'opsz' 72" }}>{title}</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
      </div>
    </section>
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
