import { Link, useLocation } from "wouter";
import { FileText, LayoutDashboard, Users, CalendarDays, Sparkles, UserRound } from "lucide-react";
import { useGetArtistProfile } from "@workspace/api-client-react";

export function Sidebar() {
  const [location] = useLocation();
  const { data: artistProfile } = useGetArtistProfile();
  const businessName = artistProfile?.businessName?.trim() || "Glam Studio";
  const displayName = artistProfile?.displayName?.trim() || "Artist Profile";

  const links = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/bookings", label: "Bookings", icon: CalendarDays },
    { href: "/services", label: "Services", icon: Sparkles },
    { href: "/clients", label: "Clients", icon: Users },
    { href: "/artist", label: "Artist", icon: UserRound },
    { href: "/contracts", label: "Contracts", icon: FileText },
  ];

  return (
    <>
      <div className="sticky top-0 z-30 border-b border-sidebar-border bg-background/92 px-4 py-3 shadow-[0_10px_30px_-28px_var(--elevate-3)] backdrop-blur-xl md:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{businessName}</div>
            <div className="truncate text-sm font-semibold text-foreground">{displayName}</div>
          </div>
        </div>
      </div>

      <nav
        aria-label="Primary mobile navigation"
        className="crm-mobile-nav fixed inset-x-3 bottom-3 z-40 grid grid-cols-6 rounded-2xl border border-sidebar-border bg-background/94 p-1 shadow-[0_18px_45px_-22px_var(--elevate-3)] backdrop-blur-xl md:hidden"
      >
        {links.map((link) => {
          const isActive = location === link.href || (link.href !== "/" && location.startsWith(link.href));

          return (
            <Link
              key={link.href}
              href={link.href}
              data-testid={`mobile-nav-${link.label.toLowerCase()}`}
              className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold transition-all active:scale-[0.97] ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-[0_10px_22px_-16px_var(--elevate-3)]"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <link.icon className="h-4 w-4" />
              <span className="max-w-full truncate leading-none">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="hidden h-full w-72 shrink-0 flex-col border-r border-sidebar-border bg-sidebar/90 backdrop-blur md:flex">
        <div className="border-b border-sidebar-border/80 px-6 py-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold uppercase tracking-widest text-muted-foreground">{businessName}</div>
              <div className="truncate text-sm font-medium text-foreground">{displayName}</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Makeup booking and contract operations
          </p>
        </div>
        <nav className="flex-1 space-y-1.5 px-4 py-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              data-testid={`nav-${link.label.toLowerCase()}`}
              className={`group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                location === link.href || (link.href !== "/" && location.startsWith(link.href))
                  ? "crm-section text-primary border border-primary/25 bg-primary/12 shadow-[0_12px_30px_-20px_var(--elevate-3)]"
                  : "border border-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-foreground hover:shadow-sm"
              }`}
            >
              <link.icon className="w-4 h-4" />
              <span>{link.label}</span>
              {location === link.href || (link.href !== "/" && location.startsWith(link.href)) ? (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
              ) : null}
            </Link>
          ))}
        </nav>
        <div className="border-t border-sidebar-border/80 px-6 py-4 text-xs text-muted-foreground">
          Internal use only
        </div>
      </div>
    </>
  );
}
