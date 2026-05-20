import * as React from "react";
import { Link, useLocation } from "wouter";
import {
  Command as CommandIcon,
  FileText,
  Inbox,
  LayoutDashboard,
  Users,
  CalendarDays,
  Sparkles,
  UserRound,
  MoreHorizontal,
  Moon,
  Sun,
  Wand2,
  CalendarRange,
} from "lucide-react";
import {
  getListNotificationsQueryKey,
  useGetArtistProfile,
  useListNotifications,
} from "@workspace/api-client-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NotificationBell } from "@/components/NotificationBell";
import { CommandPalette, useCommandPalette } from "@/components/CommandPalette";
import { useTheme } from "@/lib/theme";

const primaryLinks = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/calendar", label: "Calendar", icon: CalendarRange },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/leads", label: "Leads", icon: Inbox },
];

const secondaryLinks = [
  { href: "/services", label: "Services", icon: Sparkles },
  { href: "/artist", label: "Artist", icon: UserRound },
  { href: "/contracts", label: "Contracts", icon: FileText },
  { href: "/automations", label: "Automations", icon: Wand2 },
];

const allLinks = [...primaryLinks, ...secondaryLinks];

function isLinkActive(location: string, href: string) {
  if (href === "/") return location === "/";
  return location === href || location.startsWith(`${href}/`);
}

function monogramFrom(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "G";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function Sidebar() {
  const [location] = useLocation();
  const { data: artistProfile } = useGetArtistProfile();
  const { data: notifications = [] } = useListNotifications({
    query: {
      refetchInterval: 60_000,
      refetchOnWindowFocus: true,
      queryKey: getListNotificationsQueryKey(),
    },
  });
  const businessName = artistProfile?.businessName?.trim() || "Glam Studio";
  const displayName = artistProfile?.displayName?.trim() || "Artist Profile";
  const monogram = monogramFrom(displayName || businessName);
  const palette = useCommandPalette();
  const { theme, toggle: toggleTheme } = useTheme();
  const leadCount = notifications.filter((n) => n.category === "lead" && !n.readAt).length;
  const [moreOpen, setMoreOpen] = React.useState(false);

  return (
    <>
      <CommandPalette open={palette.open} onOpenChange={palette.setOpen} />

      {/* ---------- Mobile top bar ---------- */}
      <header className="sticky top-0 z-30 border-b border-sidebar-border bg-background/90 px-4 py-3 backdrop-blur-xl md:hidden">
        <div className="flex items-center gap-3">
          <div className="crm-monogram h-10 w-10 font-serif text-sm">
            <span style={{ fontVariationSettings: "'opsz' 48" }}>{monogram}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="crm-eyebrow truncate">{businessName}</div>
            <div className="truncate font-serif text-base text-foreground" style={{ fontVariationSettings: "'opsz' 48" }}>
              {displayName}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Open command palette"
              onClick={() => palette.setOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-card-border bg-card text-muted-foreground transition-colors hover:text-foreground"
            >
              <CommandIcon className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <NotificationBell />
          </div>
        </div>
        <div className="crm-gold-rule mt-3" />
      </header>

      {/* ---------- Mobile bottom nav ---------- */}
      <nav
        aria-label="Primary mobile navigation"
        className="crm-mobile-nav fixed inset-x-3 bottom-3 z-40 grid grid-cols-6 gap-0.5 rounded-2xl border border-sidebar-border/80 bg-card/95 p-1.5 backdrop-blur-xl
                   shadow-[0_22px_50px_-22px_var(--elevate-3),0_6px_18px_-10px_var(--elevate-2)]
                   md:hidden"
      >
        {primaryLinks.map((link) => {
          const active = isLinkActive(location, link.href);
          const badge = link.href === "/leads" ? leadCount : 0;
          return (
            <Link
              key={link.href}
              href={link.href}
              data-testid={`mobile-nav-${link.label.toLowerCase()}`}
              className={`group relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold uppercase tracking-[0.08em] transition-all duration-200 ease-out
                ${
                  active
                    ? "bg-primary text-primary-foreground shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.14),0_8px_20px_-10px_hsl(var(--primary)/0.55)]"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
            >
              <link.icon className="h-4 w-4" strokeWidth={active ? 2 : 1.5} />
              <span className="max-w-full truncate leading-none">{link.label}</span>
              {badge > 0 && (
                <span className="absolute right-1 top-1 inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold leading-none text-primary-foreground">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </Link>
          );
        })}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="More navigation"
              className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            >
              <MoreHorizontal className="h-4 w-4" strokeWidth={1.5} />
              <span className="max-w-full truncate leading-none">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-3xl">
            <SheetHeader>
              <SheetTitle className="font-serif text-xl" style={{ fontVariationSettings: "'opsz' 48" }}>
                Studio
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {secondaryLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 rounded-xl border border-card-border bg-card p-3 text-sm text-foreground hover:border-primary/30"
                >
                  <link.icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  <span>{link.label}</span>
                </Link>
              ))}
              <button
                onClick={() => { toggleTheme(); setMoreOpen(false); }}
                className="flex items-center gap-3 rounded-xl border border-card-border bg-card p-3 text-sm text-foreground hover:border-primary/30"
              >
                {theme === "dark" ? <Sun className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} /> : <Moon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />}
                <span>{theme === "dark" ? "Light theme" : "Dark theme"}</span>
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </nav>

      {/* ---------- Desktop sidebar ---------- */}
      <aside className="hidden h-dvh w-72 shrink-0 flex-col border-r border-sidebar-border bg-sidebar/85 backdrop-blur-xl md:sticky md:top-0 md:flex">
        {/* Brand block */}
        <div className="px-7 pb-6 pt-8">
          <div className="flex items-start gap-3">
            <div className="crm-monogram h-12 w-12 font-serif text-lg" style={{ fontVariationSettings: "'opsz' 48" }}>
              {monogram}
            </div>
            <div className="min-w-0 flex-1">
              <div className="crm-eyebrow truncate">{businessName}</div>
              <div
                className="mt-0.5 truncate font-serif text-lg text-foreground"
                style={{ fontVariationSettings: "'opsz' 96" }}
              >
                {displayName}
              </div>
            </div>
          </div>
          <div className="crm-gold-rule mt-6" />
        </div>

        <div className="px-7 pb-3">
          <button
            type="button"
            onClick={() => palette.setOpen(true)}
            className="group flex w-full items-center gap-2 rounded-lg border border-card-border bg-card px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
          >
            <CommandIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span className="flex-1 truncate">Quick search…</span>
            <kbd className="rounded border border-card-border bg-muted/60 px-1.5 py-0.5 text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">⌘K</kbd>
          </button>
        </div>

        <div className="px-7 pb-2.5">
          <span className="crm-eyebrow">Studio</span>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-4 pb-2">
          {allLinks.map((link) => {
            const active = isLinkActive(location, link.href);
            const badge = link.href === "/leads" ? leadCount : 0;
            return (
              <Link
                key={link.href}
                href={link.href}
                data-testid={`nav-${link.label.toLowerCase()}`}
                className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium tracking-tight transition-all duration-200 ease-out
                  ${
                    active
                      ? "bg-card text-foreground shadow-[0_1px_0_0_hsl(var(--card-border)/0.55),0_10px_24px_-18px_var(--elevate-3)]"
                      : "text-muted-foreground hover:bg-card/60 hover:text-foreground"
                  }`}
              >
                <span
                  aria-hidden
                  className={`pointer-events-none absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full transition-all duration-300 ease-out ${
                    active ? "bg-primary opacity-100" : "bg-primary opacity-0"
                  }`}
                />
                <link.icon
                  className={`h-[17px] w-[17px] shrink-0 transition-colors ${active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`}
                  strokeWidth={active ? 2 : 1.5}
                />
                <span className="flex-1">{link.label}</span>
                {badge > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold leading-none text-primary-foreground">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
                {active && badge === 0 && (
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--gold))] shadow-[0_0_0_2px_hsl(var(--gold)/0.18)]"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border/60 px-7 py-5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="crm-eyebrow">Internal use only</div>
              <div className="mt-1 text-xs text-muted-foreground/80">
                Private studio operations
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <NotificationBell />
              <button
                type="button"
                aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
                onClick={toggleTheme}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-card-border bg-card text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" strokeWidth={1.5} /> : <Moon className="h-4 w-4" strokeWidth={1.5} />}
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
