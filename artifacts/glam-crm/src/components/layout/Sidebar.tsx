import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, CalendarDays, Receipt } from "lucide-react";

export function Sidebar() {
  const [location] = useLocation();

  const links = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/bookings", label: "Bookings", icon: CalendarDays },
    { href: "/clients", label: "Clients", icon: Users },
  ];

  return (
    <div className="w-64 border-r bg-card flex flex-col h-full">
      <div className="p-6">
        <h1 className="font-serif text-2xl tracking-tight text-primary">Glam CRM</h1>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            data-testid={`nav-${link.label.toLowerCase()}`}
            className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
              location === link.href || (link.href !== "/" && location.startsWith(link.href))
                ? "bg-accent text-accent-foreground"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <link.icon className="w-5 h-5" />
            <span className="font-medium text-sm">{link.label}</span>
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-border/50 text-xs text-muted-foreground text-center">
        Yeasmin's Backstage
      </div>
    </div>
  );
}
