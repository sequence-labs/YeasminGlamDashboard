import * as React from "react";
import { Command } from "cmdk";
import { useLocation } from "wouter";
import {
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Inbox,
  LayoutDashboard,
  ListChecks,
  PenSquare,
  Plus,
  Search,
  Sparkles,
  Sun,
  Moon,
  UserPlus,
  UserRound,
  Users,
  Wand2,
} from "lucide-react";
import {
  getListBookingsQueryKey,
  getListClientsQueryKey,
  useListBookings,
  useListClients,
} from "@workspace/api-client-react";
import { useTheme } from "@/lib/theme";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CommandPalette({ open, onOpenChange }: Props) {
  const [, setLocation] = useLocation();
  const [query, setQuery] = React.useState("");
  const { data: clients } = useListClients({
    query: { enabled: open, queryKey: getListClientsQueryKey() },
  });
  const { data: bookings } = useListBookings(undefined, {
    query: { enabled: open, queryKey: getListBookingsQueryKey() },
  });
  const { theme, toggle: toggleTheme } = useTheme();

  const close = React.useCallback(() => {
    onOpenChange(false);
    setQuery("");
  }, [onOpenChange]);

  const go = React.useCallback((href: string) => {
    setLocation(href);
    close();
  }, [setLocation, close]);

  const filteredClients = (clients ?? [])
    .filter((c) => !query || c.name.toLowerCase().includes(query.toLowerCase()) || c.email?.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 6);
  const filteredBookings = (bookings ?? [])
    .filter((b) =>
      !query ||
      b.clientName.toLowerCase().includes(query.toLowerCase()) ||
      b.eventType.toLowerCase().includes(query.toLowerCase()) ||
      b.location.toLowerCase().includes(query.toLowerCase()),
    )
    .slice(0, 6);

  if (!open) return null;

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      className="fixed inset-0 z-[60] flex items-start justify-center bg-foreground/30 px-4 pt-[12vh] backdrop-blur-sm"
    >
      <Command
        label="Command palette"
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-card-border bg-card shadow-[0_30px_80px_-30px_var(--elevate-3)]"
        loop
      >
        <div className="flex items-center gap-3 border-b border-card-border/60 px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Command.Input
            autoFocus
            value={query}
            onValueChange={setQuery}
            placeholder="Search clients, bookings, or jump to…"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground/80"
          />
          <kbd className="ml-2 hidden rounded border border-card-border bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground sm:inline">esc</kbd>
        </div>
        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
          <Command.Empty className="px-3 py-6 text-sm text-muted-foreground">
            No results for that.
          </Command.Empty>

          <Command.Group heading="Go to" className="px-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.18em] [&_[cmdk-group-heading]]:text-muted-foreground">
            <PaletteItem onSelect={() => go("/")} icon={LayoutDashboard} label="Dashboard" />
            <PaletteItem onSelect={() => go("/bookings")} icon={ListChecks} label="Bookings" />
            <PaletteItem onSelect={() => go("/calendar")} icon={CalendarDays} label="Calendar" />
            <PaletteItem onSelect={() => go("/clients")} icon={Users} label="Clients" />
            <PaletteItem onSelect={() => go("/services")} icon={Sparkles} label="Services" />
            <PaletteItem onSelect={() => go("/leads")} icon={Inbox} label="Leads" />
            <PaletteItem onSelect={() => go("/automations")} icon={Wand2} label="Automations" />
            <PaletteItem onSelect={() => go("/artist")} icon={UserRound} label="Artist profile" />
            <PaletteItem onSelect={() => go("/contracts")} icon={PenSquare} label="Contracts" />
          </Command.Group>

          <Command.Group heading="Create" className="px-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.18em] [&_[cmdk-group-heading]]:text-muted-foreground">
            <PaletteItem onSelect={() => go("/bookings/new")} icon={CalendarPlus} label="New booking" />
            <PaletteItem onSelect={() => go("/clients/new")} icon={UserPlus} label="New client" />
            <PaletteItem onSelect={() => go("/inquire")} icon={Plus} label="Open public inquiry form" />
          </Command.Group>

          <Command.Group heading="Preferences" className="px-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.18em] [&_[cmdk-group-heading]]:text-muted-foreground">
            <PaletteItem
              onSelect={() => {
                toggleTheme();
                close();
              }}
              icon={theme === "dark" ? Sun : Moon}
              label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            />
          </Command.Group>

          {filteredClients.length > 0 && (
            <Command.Group heading="Clients" className="px-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.18em] [&_[cmdk-group-heading]]:text-muted-foreground">
              {filteredClients.map((client) => (
                <PaletteItem
                  key={`client-${client.id}`}
                  value={`client ${client.id} ${client.name} ${client.email ?? ""}`}
                  onSelect={() => go(`/clients/${client.id}`)}
                  icon={UserRound}
                  label={client.name}
                  detail={client.email ?? undefined}
                />
              ))}
            </Command.Group>
          )}

          {filteredBookings.length > 0 && (
            <Command.Group heading="Bookings" className="px-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.18em] [&_[cmdk-group-heading]]:text-muted-foreground">
              {filteredBookings.map((booking) => (
                <PaletteItem
                  key={`booking-${booking.id}`}
                  value={`booking ${booking.id} ${booking.clientName} ${booking.eventType} ${booking.location}`}
                  onSelect={() => go(`/bookings/${booking.id}`)}
                  icon={CheckCircle2}
                  label={booking.clientName}
                  detail={`${booking.eventType} · ${booking.location}`}
                />
              ))}
            </Command.Group>
          )}
        </Command.List>
      </Command>
    </div>
  );
}

function PaletteItem({
  icon: Icon,
  label,
  detail,
  value,
  onSelect,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  detail?: string;
  value?: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={value ?? label}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] text-foreground transition-colors aria-selected:bg-accent/70 aria-selected:text-accent-foreground"
    >
      <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
      <span className="flex-1 truncate">{label}</span>
      {detail && <span className="truncate text-xs text-muted-foreground">{detail}</span>}
    </Command.Item>
  );
}

export function useCommandPalette() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    function handle(event: KeyboardEvent) {
      const isMeta = event.metaKey || event.ctrlKey;
      if (isMeta && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      } else if (event.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, []);

  return { open, setOpen };
}
