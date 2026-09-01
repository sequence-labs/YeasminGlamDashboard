import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type AssistantAgreementListItem,
  type AssistantAgreementStatus,
  type AssistantArtist,
  useListAssistantAgreements,
  useListAssistantArtists,
} from "@workspace/api-client-react";
import { ArrowRight, ClipboardPenLine, FilePlus2, Search, UsersRound } from "lucide-react";
import { Link } from "wouter";
import { useMemo, useState } from "react";

type AgreementScope = "all" | "current" | "past";

const currentStatuses = new Set<AssistantAgreementStatus>(["draft", "confirmed"]);

function formatDate(value?: string | null) {
  if (!value) return "Date to be confirmed";
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function statusLabel(status: AssistantAgreementStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusClass(status: AssistantAgreementStatus) {
  if (status === "confirmed") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (status === "completed") return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300";
  if (status === "cancelled") return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300";
  return "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300";
}

function AgreementRow({ agreement }: { agreement: AssistantAgreementListItem }) {
  return (
    <Link
      href={`/assistant-agreements/${agreement.id}`}
      data-testid={`assistant-agreement-row-${agreement.id}`}
      className="group grid gap-3 rounded-xl border border-card-border bg-card px-4 py-4 transition-colors hover:border-primary/40 hover:bg-accent/30 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{agreement.eventName}</p>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ${statusClass(agreement.status)}`}>
            {statusLabel(agreement.status)}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatDate(agreement.eventDate)} · {agreement.location || "Location to be confirmed"}
        </p>
      </div>
      <div className="flex items-center gap-2 text-xs font-semibold text-primary">
        View details <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

function AgreementGroup({ artist, agreements }: { artist: AssistantArtist; agreements: AssistantAgreementListItem[] }) {
  const current = agreements.filter((agreement) => currentStatuses.has(agreement.status));
  const past = agreements.filter((agreement) => !currentStatuses.has(agreement.status));

  return (
    <article className="crm-section overflow-hidden">
      <header className="flex flex-col gap-4 border-b border-card-border/70 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="crm-monogram h-10 w-10 shrink-0 text-sm">{artist.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("") || "A"}</div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold tracking-tight text-foreground">{artist.name}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{artist.role}</p>
          </div>
        </div>
        <span className="self-start rounded-full border border-card-border bg-muted/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
          {agreements.length} {agreements.length === 1 ? "agreement" : "agreements"}
        </span>
      </header>

      <div className="space-y-5 px-5 py-5 sm:px-6">
        {current.length > 0 && (
          <section>
            <p className="crm-eyebrow mb-2">Current</p>
            <div className="space-y-2">{current.map((agreement) => <AgreementRow key={agreement.id} agreement={agreement} />)}</div>
          </section>
        )}
        {past.length > 0 && (
          <section>
            <p className="crm-eyebrow mb-2">Past</p>
            <div className="space-y-2">{past.map((agreement) => <AgreementRow key={agreement.id} agreement={agreement} />)}</div>
          </section>
        )}
        {agreements.length === 0 && (
          <p className="rounded-lg border border-dashed border-card-border px-4 py-3 text-sm text-muted-foreground">No saved agreements yet.</p>
        )}
      </div>
    </article>
  );
}

export default function AssistantAgreementLibrary() {
  const { data: assistantArtists = [], isLoading: artistsLoading } = useListAssistantArtists();
  const { data: agreements = [], isLoading: agreementsLoading } = useListAssistantAgreements();
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<AgreementScope>("all");

  const visibleArtists = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    const agreementsByArtist = new Map<number, AssistantAgreementListItem[]>();
    for (const agreement of agreements) {
      const matchesScope = scope === "all"
        || (scope === "current" && currentStatuses.has(agreement.status))
        || (scope === "past" && !currentStatuses.has(agreement.status));
      if (!matchesScope) continue;
      const matchesSearch = !searchTerm || [agreement.assistantArtist.name, agreement.assistantArtist.role, agreement.eventName, agreement.location]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(searchTerm));
      if (!matchesSearch) continue;
      const artistAgreements = agreementsByArtist.get(agreement.assistantArtistId) ?? [];
      artistAgreements.push(agreement);
      agreementsByArtist.set(agreement.assistantArtistId, artistAgreements);
    }

    return assistantArtists
      .filter((artist) => !searchTerm || artist.name.toLowerCase().includes(searchTerm) || artist.role.toLowerCase().includes(searchTerm) || agreementsByArtist.has(artist.id))
      .map((artist) => ({ artist, agreements: agreementsByArtist.get(artist.id) ?? [] }))
      .filter(({ agreements: artistAgreements }) => scope === "all" || artistAgreements.length > 0)
      .sort((left, right) => left.artist.name.localeCompare(right.artist.name));
  }, [agreements, assistantArtists, scope, search]);

  const currentCount = agreements.filter((agreement) => currentStatuses.has(agreement.status)).length;
  const pastCount = agreements.length - currentCount;
  const isLoading = artistsLoading || agreementsLoading;

  return (
    <Shell>
      <div className="space-y-7">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="crm-eyebrow">Studio · Team</span>
            <h1 className="crm-page-title mt-2">Assistant agreements</h1>
            <p className="crm-page-subtitle">Keep every hired artist, agreement, status, and change record in one place.</p>
            <div className="crm-gold-rule mt-6 w-24" />
          </div>
          <Button asChild data-testid="btn-new-assistant-agreement">
            <Link href="/assistant-agreements/new"><FilePlus2 className="mr-2 h-4 w-4" /> New agreement</Link>
          </Button>
        </header>

        <div className="grid grid-cols-1 overflow-hidden rounded-xl border border-card-border bg-card shadow-[0_1px_0_0_hsl(var(--card-border)/0.4),0_10px_28px_-22px_var(--elevate-3)] sm:grid-cols-3">
          <LibraryStat label="Artists" value={assistantArtists.length} />
          <LibraryStat label="Current agreements" value={currentCount} />
          <LibraryStat label="Past agreements" value={pastCount} last />
        </div>

        <section className="crm-section p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <label className="relative block min-w-0 flex-1 lg:max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search an artist, role, event, or location" className="pl-9" aria-label="Search assistant agreements" />
            </label>
            <div className="flex flex-wrap gap-2" aria-label="Agreement scope">
              {(["all", "current", "past"] as AgreementScope[]).map((option) => (
                <Button key={option} type="button" size="sm" variant={scope === option ? "default" : "outline"} onClick={() => setScope(option)}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </section>

        {isLoading ? (
          <div className="space-y-5"><Skeleton className="h-64 w-full" /><Skeleton className="h-64 w-full" /></div>
        ) : visibleArtists.length > 0 ? (
          <div className="space-y-5">{visibleArtists.map(({ artist, agreements: artistAgreements }) => <AgreementGroup key={artist.id} artist={artist} agreements={artistAgreements} />)}</div>
        ) : (
          <section className="crm-section px-6 py-12 text-center">
            <UsersRound className="mx-auto h-8 w-8 text-muted-foreground" strokeWidth={1.4} />
            <h2 className="mt-4 text-lg font-semibold text-foreground">No assistant agreements found</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Try another search or create the first agreement for an assistant artist.</p>
          </section>
        )}
      </div>
    </Shell>
  );
}

function LibraryStat({ label, value, last = false }: { label: string; value: number; last?: boolean }) {
  return (
    <div className={`px-5 py-4 ${last ? "" : "border-b border-card-border sm:border-b-0 sm:border-r"}`}>
      <p className="crm-eyebrow">{label}</p>
      <p className="mt-1 font-serif text-2xl text-foreground" style={{ fontVariationSettings: "'opsz' 48" }}>{value}</p>
    </div>
  );
}
