import { Shell } from "@/components/layout/Shell";
import { useListClients } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Plus, Search, User } from "lucide-react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function Clients() {
  const { data: clients, isLoading } = useListClients();
  const [search, setSearch] = useState("");

  const filteredClients = clients?.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search))
  );

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="crm-page-title text-foreground">Clients</h1>
            <p className="crm-page-subtitle">Manage your client roster and their details.</p>
          </div>
          <Button asChild data-testid="btn-add-client">
            <Link href="/clients/new">
              <Plus className="w-4 h-4 mr-2" />
              New Client
            </Link>
          </Button>
        </div>

        <div className="crm-section flex items-center px-3 py-2.5 max-w-sm focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent">
          <Search className="w-4 h-4 text-muted-foreground mr-2" />
          <input
            type="text"
            placeholder="Search clients..."
            className="flex-1 bg-transparent border-none outline-none focus:ring-0 p-0 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-clients"
          />
        </div>

        <div className="crm-section overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : filteredClients && filteredClients.length > 0 ? (
            <div className="divide-y divide-border">
              {filteredClients.map(client => (
                <Link
                  key={client.id}
                  href={`/clients/${client.id}`}
                  className="p-4 flex justify-between items-center hover:bg-muted/50 transition-colors block"
                  data-testid={`link-client-${client.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-medium font-serif">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{client.name}</h3>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                        <span>{client.email}</span>
                        {client.phone && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-muted-foreground/30"></span>
                            <span>{client.phone}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
                  <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
              <User className="w-12 h-12 mb-4 opacity-20" />
              <h3 className="text-lg font-medium text-foreground mb-1">No clients found</h3>
              <p className="max-w-sm mb-6">
                {search ? "No clients match your search criteria." : "You haven't added any clients yet."}
              </p>
              {!search && (
                <Button variant="outline" asChild>
                  <Link href="/clients/new" data-testid="btn-add-client-empty">
                    Add your first client
                  </Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
