import { Shell } from "@/components/layout/Shell";
import { useListClients } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Plus, Search, User, Mail, Phone } from "lucide-react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

function monogramFrom(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "·";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function Clients() {
  const { data: clients, isLoading } = useListClients();
  const [search, setSearch] = useState("");

  const filteredClients = clients?.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.includes(search)),
  );

  const visibleCount = filteredClients?.length ?? 0;
  const totalCount = clients?.length ?? 0;

  return (
    <Shell>
      <div className="space-y-7">
        {/* Header */}
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <span className="crm-eyebrow">Studio · Roster</span>
            <h1 className="crm-page-title mt-2">Clients</h1>
            <p className="crm-page-subtitle">
              The client roster. Manage relationships, contact details, and history.
            </p>
            <div className="crm-gold-rule mt-6 w-24" />
          </div>
          <Button asChild data-testid="btn-add-client">
            <Link href="/clients/new">
              <Plus className="h-4 w-4" />
              New client
            </Link>
          </Button>
        </header>

        {/* Search */}
        <section className="crm-section p-5 sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <label className="block min-w-0">
              <span className="crm-eyebrow">Search</span>
              <div className="mt-2 flex min-h-11 items-center rounded-lg border border-input bg-card px-3.5 shadow-[inset_0_1px_0_0_hsl(var(--card-border)/0.4)] transition-[border-color,box-shadow] duration-200 focus-within:border-primary/55 focus-within:ring-2 focus-within:ring-primary/30">
                <Search className="mr-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Name, email, or phone…"
                  className="min-w-0 flex-1 bg-transparent p-0 text-sm text-foreground outline-none placeholder:text-muted-foreground/80"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  data-testid="input-search-clients"
                />
              </div>
            </label>
            <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground sm:self-end sm:pb-2.5">
              {visibleCount} of {totalCount} {totalCount === 1 ? "client" : "clients"}
            </span>
          </div>
        </section>

        {/* List */}
        <section className="crm-section overflow-hidden">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredClients && filteredClients.length > 0 ? (
            <ul className="divide-y divide-card-border/55">
              {filteredClients.map((client) => (
                <li key={client.id}>
                  <Link
                    href={`/clients/${client.id}`}
                    className="group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-accent/30 sm:px-6"
                    data-testid={`link-client-${client.id}`}
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-card-border bg-accent/50 font-serif text-base text-foreground/80"
                        style={{ fontVariationSettings: "'opsz' 48", letterSpacing: "-0.01em" }}
                      >
                        {monogramFrom(client.name)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-[1.0625rem] font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
                          {client.name}
                        </h3>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12.5px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5" />
                            <span className="truncate">{client.email}</span>
                          </span>
                          {client.phone && (
                            <span className="inline-flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5" />
                              <span>{client.phone}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-primary opacity-0 transition-opacity group-hover:opacity-100 sm:inline">
                      Open →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center px-8 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-card-border bg-accent/50 text-foreground/70">
                <User className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
                No clients found
              </h3>
              <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
                {search
                  ? "No clients match your search criteria."
                  : "You haven't added any clients yet."}
              </p>
              {!search && (
                <Button asChild className="mt-6" size="sm">
                  <Link href="/clients/new" data-testid="btn-add-client-empty">
                    Add your first client
                  </Link>
                </Button>
              )}
            </div>
          )}
        </section>
      </div>
    </Shell>
  );
}
