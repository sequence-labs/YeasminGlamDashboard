import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  getGetAssistantAgreementQueryKey,
  getListAssistantAgreementsQueryKey,
  getListAssistantArtistsQueryKey,
  type AssistantAgreementDetail,
  type AssistantAgreementStatus,
  useCreateAssistantAgreement,
  useCreateAssistantArtist,
  useGetAssistantAgreement,
  useGetArtistProfile,
  useListAssistantAgreements,
  useListAssistantArtists,
  useUpdateAssistantAgreement,
  useUpdateAssistantArtist,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, FilePlus2, History, Printer, Save, UserRound } from "lucide-react";
import { Link, useLocation, useRoute } from "wouter";
import { useEffect, useMemo, useState } from "react";

type AgreementFields = {
  artistName: string;
  artistBusinessName: string;
  artistEmail: string;
  assistantName: string;
  assistantEmail: string;
  assistantPhone: string;
  role: string;
  eventName: string;
  eventDate: string;
  location: string;
  startTime: string;
  minimumClients: number;
  maximumClients: number;
  perClientRate: number;
  bookingDeposit: number;
  paymentMethod: string;
  paymentTiming: string;
  specialNotes: string;
  status: AssistantAgreementStatus;
};

const initialFields: AgreementFields = {
  artistName: "Yeasmin Bhuiyan",
  artistBusinessName: "GLAMBYEASMIN",
  artistEmail: "",
  assistantName: "",
  assistantEmail: "",
  assistantPhone: "",
  role: "Makeup Artist",
  eventName: "Wedding / Event",
  eventDate: "",
  location: "",
  startTime: "",
  minimumClients: 2,
  maximumClients: 3,
  perClientRate: 90,
  bookingDeposit: 100,
  paymentMethod: "",
  paymentTiming: "Remaining compensation is paid after the assigned services are completed on the event date.",
  specialNotes: "",
  status: "draft",
};

function formatMoney(value: number) {
  return `$${Number.isFinite(value) ? value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : "0"}`;
}

function fieldValue(value: string, fallback: string) {
  return value.trim() || fallback;
}

function printableDate(value: string) {
  if (!value) return "To be confirmed";
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function NumberField({
  id,
  label,
  value,
  onChange,
  step = 1,
  min = 0,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

export default function AssistantAgreements() {
  const [isNewRoute] = useRoute("/assistant-agreements/new");
  const [, routeParams] = useRoute("/assistant-agreements/:id");
  const requestedAgreementId = isNewRoute ? null : Number(routeParams?.id);
  const [, navigate] = useLocation();
  const { data: artistProfile } = useGetArtistProfile();
  const { data: assistantArtists = [] } = useListAssistantArtists();
  const { data: savedAgreements = [] } = useListAssistantAgreements();
  const { data: savedAgreementDetail } = useGetAssistantAgreement(requestedAgreementId || 0, {
    query: { enabled: Boolean(requestedAgreementId), queryKey: getGetAssistantAgreementQueryKey(requestedAgreementId || 0) },
  });
  const createAssistantArtist = useCreateAssistantArtist();
  const updateAssistantArtist = useUpdateAssistantArtist();
  const createAssistantAgreement = useCreateAssistantAgreement();
  const updateAssistantAgreement = useUpdateAssistantAgreement();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [fields, setFields] = useState<AgreementFields>(initialFields);
  const [selectedAssistantArtistId, setSelectedAssistantArtistId] = useState<number | null>(null);
  const [selectedAgreementId, setSelectedAgreementId] = useState<number | null>(null);

  useEffect(() => {
    if (!artistProfile) return;
    setFields((current) => ({
      ...current,
      artistName: current.artistName === initialFields.artistName ? artistProfile.displayName : current.artistName,
      artistBusinessName: current.artistBusinessName === initialFields.artistBusinessName ? artistProfile.businessName : current.artistBusinessName,
      artistEmail: current.artistEmail || artistProfile.email || "",
      paymentMethod: current.paymentMethod || artistProfile.paymentMethod || "",
    }));
  }, [artistProfile]);

  const compensation = useMemo(() => {
    const minimum = Math.max(0, Math.min(fields.minimumClients, fields.maximumClients));
    const maximum = Math.max(fields.minimumClients, fields.maximumClients);
    return {
      minimum,
      maximum,
      minimumPay: minimum * fields.perClientRate,
      maximumPay: maximum * fields.perClientRate,
    };
  }, [fields.minimumClients, fields.maximumClients, fields.perClientRate]);

  function update<K extends keyof AgreementFields>(key: K, value: AgreementFields[K]) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  function applyAssistantArtist(id: string) {
    const assistantArtistId = Number(id);
    const assistantArtist = assistantArtists.find((item) => item.id === assistantArtistId);
    if (!assistantArtist) return;
    setSelectedAssistantArtistId(assistantArtist.id);
    setFields((current) => ({
      ...current,
      assistantName: assistantArtist.name,
      role: assistantArtist.role,
      assistantEmail: assistantArtist.email ?? "",
      assistantPhone: assistantArtist.phone ?? "",
      paymentMethod: assistantArtist.paymentMethod ?? current.paymentMethod,
      specialNotes: assistantArtist.notes ?? current.specialNotes,
    }));
  }

  function applyAgreement(agreement: AssistantAgreementDetail) {
    setSelectedAgreementId(agreement.id);
    setSelectedAssistantArtistId(agreement.assistantArtistId);
    setFields((current) => ({
      ...current,
      assistantName: agreement.assistantArtist.name,
      role: agreement.assistantArtist.role,
      assistantEmail: agreement.assistantArtist.email ?? "",
      assistantPhone: agreement.assistantArtist.phone ?? "",
      eventName: agreement.eventName,
      eventDate: agreement.eventDate ?? "",
      location: agreement.location ?? "",
      startTime: agreement.arrivalTime ?? "",
      minimumClients: agreement.minimumClients,
      maximumClients: agreement.maximumClients,
      perClientRate: agreement.perClientRate,
      bookingDeposit: agreement.bookingDeposit,
      paymentMethod: agreement.paymentMethod ?? agreement.assistantArtist.paymentMethod ?? "",
      paymentTiming: agreement.paymentTiming ?? initialFields.paymentTiming,
      specialNotes: agreement.specialNotes ?? agreement.assistantArtist.notes ?? "",
      status: agreement.status,
    }));
  }

  function beginNewAgreement() {
    setSelectedAgreementId(null);
    setFields((current) => ({
      ...initialFields,
      artistName: current.artistName,
      artistBusinessName: current.artistBusinessName,
      artistEmail: current.artistEmail,
      assistantName: current.assistantName,
      role: current.role,
      assistantEmail: current.assistantEmail,
      assistantPhone: current.assistantPhone,
      paymentMethod: current.paymentMethod,
    }));
  }

  useEffect(() => {
    if (!savedAgreementDetail) return;
    applyAgreement(savedAgreementDetail);
  }, [savedAgreementDetail]);

  async function saveAgreement() {
    if (fields.maximumClients < fields.minimumClients) {
      toast({ title: "Maximum clients cannot be lower than minimum clients", variant: "destructive" });
      return;
    }
    if (!fields.assistantName.trim()) {
      toast({ title: "Enter the assistant artist's name first", variant: "destructive" });
      return;
    }

    const assistantData = {
      name: fields.assistantName.trim(),
      role: fields.role.trim() || "Makeup Artist",
      email: fields.assistantEmail.trim() || null,
      phone: fields.assistantPhone.trim() || null,
      paymentMethod: fields.paymentMethod.trim() || null,
      active: true,
    };

    try {
      let assistantArtistId = selectedAssistantArtistId;
      if (assistantArtistId) {
        await updateAssistantArtist.mutateAsync({ id: assistantArtistId, data: assistantData });
      } else {
        const assistantArtist = await createAssistantArtist.mutateAsync({ data: assistantData });
        assistantArtistId = assistantArtist.id;
        setSelectedAssistantArtistId(assistantArtistId);
      }

      const agreementData = {
        assistantArtistId,
        eventName: fields.eventName.trim() || "Wedding / Event",
        eventDate: fields.eventDate || null,
        location: fields.location.trim() || null,
        arrivalTime: fields.startTime.trim() || null,
        minimumClients: fields.minimumClients,
        maximumClients: fields.maximumClients,
        perClientRate: fields.perClientRate,
        bookingDeposit: fields.bookingDeposit,
        paymentMethod: fields.paymentMethod.trim() || null,
        paymentTiming: fields.paymentTiming.trim() || null,
        specialNotes: fields.specialNotes.trim() || null,
        status: fields.status,
      };
      const agreement = selectedAgreementId
        ? await updateAssistantAgreement.mutateAsync({ id: selectedAgreementId, data: agreementData })
        : await createAssistantAgreement.mutateAsync({ data: agreementData });

      setSelectedAgreementId(agreement.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListAssistantArtistsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListAssistantAgreementsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetAssistantAgreementQueryKey(agreement.id) }),
      ]);
      toast({ title: selectedAgreementId ? "Assistant agreement updated" : "Assistant profile and agreement saved" });
      if (!selectedAgreementId) navigate(`/assistant-agreements/${agreement.id}`);
    } catch {
      toast({ title: "Could not save the assistant agreement", variant: "destructive" });
    }
  }

  const artist = fieldValue(fields.artistName, "Artist");
  const business = fieldValue(fields.artistBusinessName, artist);
  const assistant = fieldValue(fields.assistantName, "Assistant Artist");
  const eventName = fieldValue(fields.eventName, "Wedding / Event");
  const location = fieldValue(fields.location, "To be confirmed");
  const eventDate = printableDate(fields.eventDate);
  const rate = formatMoney(fields.perClientRate);
  const deposit = formatMoney(fields.bookingDeposit);

  return (
    <Shell>
      <div className="space-y-7">
        <header className="assistant-agreement-controls flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Link href="/assistant-agreements" className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.13em] text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" /> Assistant agreements
            </Link>
            <span className="crm-eyebrow mt-5 block">Studio · Team</span>
            <h1 className="crm-page-title mt-2">Assistant agreements</h1>
            <p className="crm-page-subtitle">
              Prepare a clear, print-ready agreement before bringing another artist onto an event.
            </p>
            <div className="crm-gold-rule mt-6 w-24" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={beginNewAgreement} data-testid="btn-new-assistant-agreement">
              <FilePlus2 className="mr-2 h-4 w-4" /> New agreement
            </Button>
            <Button type="button" onClick={saveAgreement} disabled={createAssistantArtist.isPending || updateAssistantArtist.isPending || createAssistantAgreement.isPending || updateAssistantAgreement.isPending} data-testid="btn-save-assistant-agreement">
              <Save className="mr-2 h-4 w-4" /> {selectedAgreementId ? "Save changes" : "Save agreement"}
            </Button>
            <Button type="button" variant="outline" onClick={() => window.print()} data-testid="btn-print-assistant-agreement">
              <Printer className="mr-2 h-4 w-4" /> Print / Save PDF
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 items-start gap-6 2xl:grid-cols-[400px_minmax(0,1fr)]">
          <aside className="assistant-agreement-controls crm-section p-5 sm:p-6">
            <div>
              <span className="crm-eyebrow">Fill in · Agreement</span>
              <h2 className="crm-section-title mt-1">Assignment details</h2>
              <p className="mt-1 text-sm text-muted-foreground">Save an assistant once, then reuse their details on future agreements. Each agreement keeps its own event and payment terms.</p>
            </div>

            <div className="mt-6 space-y-6">
              {savedAgreements.length > 0 && (
                <section className="space-y-2 border-b border-card-border pb-5">
                  <Label htmlFor="saved-assistant-agreement">Saved agreement</Label>
                  <Select value={selectedAgreementId?.toString() ?? "new"} onValueChange={(value) => value === "new" ? beginNewAgreement() : navigate(`/assistant-agreements/${value}`)}>
                    <SelectTrigger id="saved-assistant-agreement"><SelectValue placeholder="New agreement" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New agreement</SelectItem>
                      {savedAgreements.map((agreement) => (
                        <SelectItem key={agreement.id} value={agreement.id.toString()}>{agreement.assistantArtist.name} · {agreement.eventName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </section>
              )}

              {savedAgreementDetail && (
                <AgreementHistory history={savedAgreementDetail.history} />
              )}

              <FieldGroup title="Your details">
                <TextField id="assistant-artist-name" label="Hiring artist" value={fields.artistName} onChange={(value) => update("artistName", value)} />
                <TextField id="assistant-business-name" label="Business name" value={fields.artistBusinessName} onChange={(value) => update("artistBusinessName", value)} />
                <TextField id="assistant-artist-email" label="Hiring artist email" value={fields.artistEmail} onChange={(value) => update("artistEmail", value)} />
              </FieldGroup>

              <FieldGroup title="Assistant artist">
                {assistantArtists.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="saved-assistant-artist">Saved assistant profile</Label>
                    <Select value={selectedAssistantArtistId?.toString() ?? "new"} onValueChange={(value) => value === "new" ? setSelectedAssistantArtistId(null) : applyAssistantArtist(value)}>
                      <SelectTrigger id="saved-assistant-artist"><SelectValue placeholder="Create a new assistant profile" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">Create a new assistant profile</SelectItem>
                        {assistantArtists.filter((artist) => artist.active).map((assistantArtist) => (
                          <SelectItem key={assistantArtist.id} value={assistantArtist.id.toString()}>{assistantArtist.name} · {assistantArtist.role}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <TextField id="assistant-name" label="Assistant name" value={fields.assistantName} onChange={(value) => update("assistantName", value)} placeholder="Full name" />
                <TextField id="assistant-role" label="Role" value={fields.role} onChange={(value) => update("role", value)} placeholder="Makeup Artist, Hairstylist, or Assistant" />
                <TextField id="assistant-email" label="Assistant email" value={fields.assistantEmail} onChange={(value) => update("assistantEmail", value)} placeholder="assistant@example.com" />
                <TextField id="assistant-phone" label="Assistant phone" value={fields.assistantPhone} onChange={(value) => update("assistantPhone", value)} placeholder="(555) 555-5555" />
              </FieldGroup>

              <FieldGroup title="Event and assignment">
                <TextField id="assistant-event-name" label="Event" value={fields.eventName} onChange={(value) => update("eventName", value)} />
                <TextField id="assistant-event-date" label="Event date" value={fields.eventDate} type="date" onChange={(value) => update("eventDate", value)} />
                <TextField id="assistant-location" label="Venue / location" value={fields.location} onChange={(value) => update("location", value)} placeholder="Venue name and city" />
                <TextField id="assistant-start-time" label="Arrival / start time" value={fields.startTime} onChange={(value) => update("startTime", value)} placeholder="e.g. 7:00 AM" />
              </FieldGroup>

              <FieldGroup title="Compensation">
                <div className="grid grid-cols-2 gap-3">
                  <NumberField id="assistant-min-clients" label="Minimum clients" value={fields.minimumClients} onChange={(value) => update("minimumClients", value)} />
                  <NumberField id="assistant-max-clients" label="Maximum clients" value={fields.maximumClients} onChange={(value) => update("maximumClients", value)} />
                </div>
                <NumberField id="assistant-per-client-rate" label="Rate per completed client" value={fields.perClientRate} step={5} onChange={(value) => update("perClientRate", value)} />
                <NumberField id="assistant-booking-deposit" label="Booking deposit paid now" value={fields.bookingDeposit} step={25} onChange={(value) => update("bookingDeposit", value)} />
                <div className="space-y-2">
                  <Label htmlFor="assistant-agreement-status">Agreement status</Label>
                  <Select value={fields.status} onValueChange={(value) => update("status", value as AssistantAgreementStatus)}>
                    <SelectTrigger id="assistant-agreement-status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <TextField id="assistant-payment-method" label="Deposit payment method / proof" value={fields.paymentMethod} onChange={(value) => update("paymentMethod", value)} placeholder="e.g. Zelle, Venmo, Cash App" />
                <div className="space-y-2">
                  <Label htmlFor="assistant-payment-timing">Final payment timing</Label>
                  <Textarea id="assistant-payment-timing" rows={3} value={fields.paymentTiming} onChange={(event) => update("paymentTiming", event.target.value)} />
                </div>
              </FieldGroup>

              <div className="space-y-2">
                <Label htmlFor="assistant-special-notes">Special assignment notes</Label>
                <Textarea id="assistant-special-notes" rows={4} value={fields.specialNotes} onChange={(event) => update("specialNotes", event.target.value)} placeholder="Optional: specific services, kit details, parking, dress code, or contact instructions." />
              </div>
            </div>
          </aside>

          <AssistantAgreementDocument
            assistant={assistant}
            artist={artist}
            business={business}
            artistEmail={fields.artistEmail}
            assistantEmail={fields.assistantEmail}
            assistantPhone={fields.assistantPhone}
            role={fieldValue(fields.role, "Assistant Artist")}
            eventName={eventName}
            eventDate={eventDate}
            location={location}
            startTime={fieldValue(fields.startTime, "To be confirmed")}
            rate={rate}
            deposit={deposit}
            paymentMethod={fieldValue(fields.paymentMethod, "To be confirmed")}
            paymentTiming={fieldValue(fields.paymentTiming, "Remaining compensation is paid after the assigned services are completed on the event date.")}
            specialNotes={fields.specialNotes.trim()}
            status={fields.status}
            compensation={compensation}
          />
        </div>
      </div>
    </Shell>
  );
}

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-t border-card-border pt-5 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

function AgreementHistory({ history }: { history: AssistantAgreementDetail["history"] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="border-b border-card-border pb-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" strokeWidth={1.6} />
          <div>
          <p className="text-sm font-semibold text-foreground">Change history</p>
            <p className="text-xs text-muted-foreground">{history.length} saved {history.length === 1 ? "change" : "changes"}</p>
          </div>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => setIsOpen((current) => !current)} aria-expanded={isOpen}>
          {isOpen ? "Hide history" : "Show history"}
        </Button>
      </div>
      {isOpen && (
        <ol className="mt-4 space-y-3 border-l border-card-border pl-4">
          {history.map((event) => (
            <li key={event.id} className="relative">
              <span aria-hidden className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full border border-primary/50 bg-card" />
              <p className="text-sm font-medium text-foreground">{event.summary}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {new Date(event.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} · {event.actorType === "artist" ? "Hiring artist" : "System"}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function TextField({ id, label, value, onChange, placeholder, type = "text" }: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

function AssistantAgreementDocument({
  assistant,
  artist,
  business,
  artistEmail,
  assistantEmail,
  assistantPhone,
  role,
  eventName,
  eventDate,
  location,
  startTime,
  rate,
  deposit,
  paymentMethod,
  paymentTiming,
  specialNotes,
  status,
  compensation,
}: {
  assistant: string;
  artist: string;
  business: string;
  artistEmail: string;
  assistantEmail: string;
  assistantPhone: string;
  role: string;
  eventName: string;
  eventDate: string;
  location: string;
  startTime: string;
  rate: string;
  deposit: string;
  paymentMethod: string;
  paymentTiming: string;
  specialNotes: string;
  status: AssistantAgreementStatus;
  compensation: { minimum: number; maximum: number; minimumPay: number; maximumPay: number };
}) {
  const range = compensation.minimum === compensation.maximum
    ? `${compensation.minimum} completed client${compensation.minimum === 1 ? "" : "s"}`
    : `${compensation.minimum}-${compensation.maximum} completed clients`;
  const compensationRange = compensation.minimumPay === compensation.maximumPay
    ? formatMoney(compensation.minimumPay)
    : `${formatMoney(compensation.minimumPay)}-${formatMoney(compensation.maximumPay)}`;

  return (
    <article className="assistant-agreement-document contract-print-page mx-auto w-full max-w-[900px] rounded-sm border border-slate-200 bg-white px-6 py-8 font-sans text-[13px] leading-relaxed text-slate-900 shadow-[0_24px_70px_-42px_rgba(15,23,42,.55)] sm:px-10 sm:py-10">
      <header className="border-b-2 border-slate-900 pb-5 text-center">
        <div className="flex items-center justify-between gap-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
          <span>{business}</span>
          <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> {status}</span>
        </div>
        <h2 className="mt-2 font-serif text-2xl font-bold tracking-tight sm:text-3xl">Assistant Artist Agreement</h2>
        <p className="mt-2 text-sm text-slate-600">For makeup artists, hairstylists, and event-service assistants</p>
      </header>

      <p className="mt-6">
        This Assistant Artist Agreement (the <strong>“Agreement”</strong>) is between <strong>{artist}</strong> (the <strong>“Hiring Artist”</strong>) and <strong>{assistant}</strong> (the <strong>“Assistant Artist”</strong>) for the event described below. The parties agree that this written Agreement, together with proof of the booking-deposit payment, documents the reserved assignment.
      </p>

      <AgreementSection title="1. Event and assignment">
        <AgreementTable rows={[
          ["Event", eventName],
          ["Event date", eventDate],
          ["Venue / location", location],
          ["Assistant role", role],
          ["Arrival / start time", startTime],
          ["Assigned work", `${range} at ${rate} per completed client; the Hiring Artist will assign the order and specific recipients onsite to protect the event timeline.`],
        ]} />
        <p>The Assistant Artist will arrive on time, fully prepared, and ready to complete the assigned services professionally, safely, and within the agreed event schedule. The Assistant Artist will bring a clean, sanitary, professional kit and supplies needed for the assigned work unless the parties agree otherwise in writing.</p>
      </AgreementSection>

      <AgreementSection title="2. Compensation and booking deposit">
        <AgreementTable rows={[
          ["Rate", `${rate} per completed client`],
          ["Assignment range", range],
          ["Estimated compensation range", compensationRange],
          ["Booking deposit", `${deposit}, paid to reserve the assignment and credited toward final compensation`],
          ["Payment method / proof", paymentMethod],
          ["Final payment", paymentTiming],
        ]} />
        <p>The number of completed clients may move within the stated assignment range based on the event timeline and the Hiring Artist’s needs. The Assistant Artist will be paid for completed assigned services at the agreed rate. No additional services, travel, parking, kit, overtime, or other fees are owed unless approved in writing by the Hiring Artist before they are incurred.</p>
      </AgreementSection>

      <AgreementSection title="3. Confirmation, attendance, and cancellation">
        <p>By signing, the Assistant Artist confirms that the booking deposit was received and that the date and assignment are reserved. If the Assistant Artist cancels, materially changes availability, arrives too late to complete the assigned work, refuses the agreed work, or does not appear without a documented emergency or force-majeure event, the Assistant Artist must return the booking deposit within three business days. The Hiring Artist may seek reasonable, documented replacement costs to the extent permitted by applicable law.</p>
        <p>If the Hiring Artist cancels the assignment more than 14 calendar days before the event date, the Assistant Artist will return the booking deposit within three business days. If the Hiring Artist cancels 14 calendar days or fewer before the event, the Assistant Artist may retain the booking deposit as cancellation compensation, unless the parties agree otherwise in writing.</p>
      </AgreementSection>

      <AgreementSection title="4. Professional standards and client protection">
        <p>The Assistant Artist will use reasonable professional sanitation practices, follow venue rules, keep the work area orderly, and disclose any issue that could affect the timeline or service quality as soon as possible. The Assistant Artist will not provide services outside the assigned scope without the Hiring Artist’s approval. The Assistant Artist will not independently quote, collect payment from, or market directly to the Hiring Artist’s clients during the event without written permission.</p>
        <p>Client names, contact information, event details, rates, business processes, and non-public communications are confidential and may be used only to perform this assignment. This clause does not restrict either party from making truthful statements or meeting legal obligations.</p>
      </AgreementSection>

      <AgreementSection title="5. Relationship and responsibility">
        <p>The parties intend this to be an engagement for the specific event assignment described above. Nothing in this Agreement alone determines employee or independent-contractor status; classification depends on the actual relationship and applicable law. Each party remains responsible for complying with applicable tax, wage, insurance, licensing, and worker-classification requirements. The parties may revise this Agreement only in writing.</p>
        <p>Neither party may use the other’s name, image, client information, or completed-work images for advertising or social media without permission from the person or business entitled to grant it.</p>
      </AgreementSection>

      {specialNotes && (
        <AgreementSection title="6. Special assignment notes">
          <p className="whitespace-pre-wrap">{specialNotes}</p>
        </AgreementSection>
      )}

      <AgreementSection title={specialNotes ? "7. Signatures" : "6. Signatures"}>
        <p>Electronic signatures and copies are valid. Each party should keep a signed copy of this Agreement and the payment confirmation for the booking deposit.</p>
        <div className="mt-7 grid grid-cols-1 gap-8 md:grid-cols-2">
          <SignatureBlock title="Hiring Artist" name={artist} email={artistEmail} />
          <SignatureBlock title="Assistant Artist" name={assistant} email={assistantEmail} phone={assistantPhone} />
        </div>
      </AgreementSection>
    </article>
  );
}

function AgreementSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7 break-inside-avoid">
      <h3 className="border-b-2 border-slate-900 pb-1 font-serif text-base font-bold">{title}</h3>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function AgreementTable({ rows }: { rows: Array<[string, string]> }) {
  return (
    <table className="w-full border-collapse text-xs sm:text-[13px]">
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label} className="border-b border-slate-200">
            <td className="w-[37%] bg-slate-100 px-2 py-2 align-top font-semibold">{label}</td>
            <td className="px-2 py-2 align-top">{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SignatureBlock({ title, name, email, phone }: { title: string; name: string; email?: string; phone?: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide">{title}</p>
      <div className="mt-4 space-y-4 text-xs">
        <p>Name: {name}</p>
        <p>Signature: <span className="inline-block h-5 w-[72%] border-b border-slate-900 align-bottom" /></p>
        <p>Date: <span className="inline-block h-5 w-[78%] border-b border-slate-900 align-bottom" /></p>
        {email && <p>Email: {email}</p>}
        {phone && <p>Phone: {phone}</p>}
      </div>
    </div>
  );
}
