import { Link, useLocation } from "wouter";
import { FileText, LayoutDashboard, Users, CalendarDays, Sparkles, UserRound } from "lucide-react";
import { useGetArtistProfile } from "@workspace/api-client-react";

export function Sidebar() {
  const [location] = useLocation();
  const { data: artistProfile } = useGetArtistProfile();

  const links = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/bookings", label: "Bookings", icon: CalendarDays },
    { href: "/services", label: "Services", icon: Sparkles },
    { href: "/clients", label: "Clients", icon: Users },
    { href: "/artist", label: "Artist", icon: UserRound },
    { href: "/contract-templates", label: "Templates", icon: FileText },
  ];

  return (
    <div className="w-60 border-r bg-sidebar flex flex-col h-full shrink-0">
      <div className="px-5 py-5 border-b border-border">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">{artistProfile?.businessName ?? "Glam CRM"}</div>
        <div className="text-base font-semibold text-foreground">{artistProfile?.displayName ?? "Yeasmin Bhuiyan"}</div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            data-testid={`nav-${link.label.toLowerCase()}`}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              location === link.href || (link.href !== "/" && location.startsWith(link.href))
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
            }`}
          >
            <link.icon className="w-4 h-4" />
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="px-5 py-4 border-t text-xs text-muted-foreground">
        Internal use only
      </div>
    </div>
  );
}
