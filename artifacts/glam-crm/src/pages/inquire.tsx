import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreatePublicLead, useGetArtistProfile } from "@workspace/api-client-react";
import { CheckCircle2 } from "lucide-react";

const EVENT_TYPES = ["Bridal", "Engagement", "Reception", "Trial", "Editorial", "Special event", "Other"];
const BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island", "New Jersey", "Long Island", "Other"];

export default function InquirePage() {
  const { data: profile } = useGetArtistProfile();
  const submit = useCreatePublicLead();
  const businessName = profile?.businessName?.trim() || "Glam Studio";

  const [form, setForm] = React.useState({
    name: "",
    email: "",
    phone: "",
    eventDate: "",
    notSure: false,
    eventType: "",
    borough: "",
    headcount: "",
    source: "",
    vision: "",
  });
  const [done, setDone] = React.useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    submit.mutate(
      {
        data: {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          eventDate: form.notSure ? undefined : form.eventDate || undefined,
          eventType: form.eventType || undefined,
          borough: form.borough || undefined,
          headcount: form.headcount ? Number(form.headcount) : undefined,
          source: form.source.trim() || undefined,
          vision: form.vision.trim() || undefined,
        },
      },
      {
        onSuccess: () => setDone(true),
      }
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-card-border bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-2xl px-6 py-6">
          <div className="crm-eyebrow">{businessName}</div>
          <div className="mt-1 font-serif text-2xl text-foreground" style={{ fontVariationSettings: "'opsz' 72" }}>
            Inquire about your day
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10 sm:py-14">
        {done ? (
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/8 p-8 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-700 dark:text-emerald-300" strokeWidth={1.5} />
            <h1 className="mt-4 font-serif text-3xl text-foreground" style={{ fontVariationSettings: "'opsz' 96" }}>
              Thank you
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {businessName} has received your inquiry and will respond within 48 hours.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-7">
            <header>
              <h1 className="font-serif text-4xl text-foreground" style={{ fontVariationSettings: "'opsz' 144", letterSpacing: "-0.02em" }}>
                Tell us about it
              </h1>
              <p className="mt-3 max-w-xl text-sm text-muted-foreground">
                The more we know now, the more thoughtful the proposal we'll send back. Replies within 48 hours.
              </p>
              <div className="crm-gold-rule mt-6 w-16" />
            </header>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Your name" required>
                <Input value={form.name} onChange={(e) => update("name", e.target.value)} required autoComplete="name" />
              </Field>
              <Field label="Email" required>
                <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required autoComplete="email" />
              </Field>
              <Field label="Phone (optional)">
                <Input type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} autoComplete="tel" />
              </Field>
              <Field label="Event type">
                <select
                  value={form.eventType}
                  onChange={(e) => update("eventType", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                >
                  <option value="">Select…</option>
                  {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>

              <Field label="Event date">
                <Input
                  type="date"
                  value={form.eventDate}
                  onChange={(e) => update("eventDate", e.target.value)}
                  disabled={form.notSure}
                />
                <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={form.notSure}
                    onChange={(e) => update("notSure", e.target.checked)}
                    className="h-4 w-4 rounded border-card-border text-primary"
                  />
                  Not sure yet
                </label>
              </Field>
              <Field label="Borough / area">
                <select
                  value={form.borough}
                  onChange={(e) => update("borough", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                >
                  <option value="">Select…</option>
                  {BOROUGHS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </Field>

              <Field label="Headcount">
                <Input
                  type="number"
                  min={1}
                  value={form.headcount}
                  onChange={(e) => update("headcount", e.target.value)}
                  placeholder="e.g. 4 faces"
                />
              </Field>
              <Field label="How did you hear about us?">
                <Input
                  value={form.source}
                  onChange={(e) => update("source", e.target.value)}
                  placeholder="Instagram, referral, etc."
                />
              </Field>
            </div>

            <Field label="Your vision">
              <Textarea
                value={form.vision}
                onChange={(e) => update("vision", e.target.value)}
                placeholder="Tell us about the look, vibe, and anything you've been saving on Pinterest."
                rows={5}
              />
            </Field>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                We never share your information.
              </p>
              <Button type="submit" size="lg" disabled={submit.isPending}>
                {submit.isPending ? "Sending…" : "Send inquiry"}
              </Button>
            </div>
            {submit.isError && (
              <p className="text-sm text-destructive">Something went wrong. Please try again or email us directly.</p>
            )}
          </form>
        )}
      </main>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="crm-eyebrow !text-[10px]">{label}{required && <span className="ml-1 text-primary">*</span>}</span>
      {children}
    </label>
  );
}
