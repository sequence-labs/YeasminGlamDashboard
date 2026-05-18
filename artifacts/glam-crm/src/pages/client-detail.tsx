import { Shell } from "@/components/layout/Shell";
import { useGetClient, useUpdateClient, useDeleteClient, useListBookings, getGetClientQueryKey, getListClientsQueryKey } from "@workspace/api-client-react";
import { useRoute } from "wouter";
import { ArrowLeft, Edit2, Check, User, Mail, Phone, CalendarDays, FileText, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { useLocation } from "wouter";

export default function ClientDetail() {
  const [, params] = useRoute("/clients/:id");
  const id = parseInt(params?.id || "0", 10);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: client, isLoading } = useGetClient(id, { query: { enabled: !!id, queryKey: getGetClientQueryKey(id) } });
  const { data: bookings } = useListBookings();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const [, setLocation] = useLocation();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", notes: "" });

  useEffect(() => {
    if (client && !isEditing) {
      setFormData({
        name: client.name,
        email: client.email,
        phone: client.phone || "",
        notes: client.notes || "",
      });
    }
  }, [client, isEditing]);

  const clientBookings = bookings?.filter(b => b.clientId === id) || [];

  function handleSave() {
    updateClient.mutate({
      id,
      data: {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        notes: formData.notes || null,
      }
    }, {
      onSuccess: (updatedClient) => {
        queryClient.setQueryData(getGetClientQueryKey(id), updatedClient);
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
        setIsEditing(false);
        toast({ title: "Client updated successfully" });
      },
      onError: () => {
        toast({ title: "Failed to update client", variant: "destructive" });
      }
    });
  }

  function handleDelete() {
    if (confirm("Are you sure you want to delete this client?")) {
      deleteClient.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
          toast({ title: "Client deleted successfully" });
          setLocation("/clients");
        },
        onError: () => {
          toast({ title: "Failed to delete client", variant: "destructive" });
        }
      });
    }
  }

  if (isLoading) {
    return (
      <Shell>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      </Shell>
    );
  }

  if (!client) {
    return <Shell>Client not found</Shell>;
  }

  return (
    <Shell>
      <div className="space-y-8">
        <div>
          <Link
            href="/clients"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
            data-testid="link-back-clients"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Clients
          </Link>
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-medium font-serif text-2xl shadow-sm">
                {client.name.charAt(0).toUpperCase()}
              </div>
              {isEditing ? (
                <div className="space-y-2">
                  <Input 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    className="text-2xl font-serif h-10 w-64" 
                    data-testid="edit-client-name"
                  />
                </div>
              ) : (
                <h1 className="text-3xl font-serif text-foreground" data-testid="text-client-name">{client.name}</h1>
              )}
            </div>
            {isEditing ? (
              <Button onClick={handleSave} disabled={updateClient.isPending} data-testid="btn-save-client">
                <Check className="w-4 h-4 mr-2" />
                {updateClient.isPending ? "Saving..." : "Save Changes"}
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsEditing(true)} data-testid="btn-edit-client">
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Client
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={deleteClient.isPending} data-testid="btn-delete-client">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="col-span-1 space-y-6">
            <div className="bg-card border rounded-lg p-6 shadow-sm space-y-6">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider mb-4">Contact Info</h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
                  <div className="w-full">
                    {isEditing ? (
                      <Input 
                        value={formData.email} 
                        onChange={e => setFormData({...formData, email: e.target.value})} 
                        className="h-8" 
                        data-testid="edit-client-email"
                      />
                    ) : (
                      <span className="text-foreground">{client.email}</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
                  <div className="w-full">
                    {isEditing ? (
                      <Input 
                        value={formData.phone} 
                        onChange={e => setFormData({...formData, phone: e.target.value})} 
                        className="h-8" 
                        placeholder="Phone number"
                        data-testid="edit-client-phone"
                      />
                    ) : (
                      <span className="text-foreground">{client.phone || <span className="text-muted-foreground italic">No phone provided</span>}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-border mt-6">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider mb-4">Internal Notes</h3>
                {isEditing ? (
                  <Textarea 
                    value={formData.notes} 
                    onChange={e => setFormData({...formData, notes: e.target.value})} 
                    className="min-h-[120px] resize-none" 
                    placeholder="Add notes about preferences, allergies, etc."
                    data-testid="edit-client-notes"
                  />
                ) : (
                  <div className="text-sm bg-muted/30 p-4 rounded-md whitespace-pre-wrap text-foreground min-h-[100px]" data-testid="text-client-notes">
                    {client.notes || <span className="text-muted-foreground italic">No notes added yet.</span>}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-span-1 lg:col-span-2">
            <div className="bg-card border rounded-lg shadow-sm overflow-hidden flex flex-col h-full">
              <div className="p-6 border-b border-border flex justify-between items-center">
                <h2 className="text-xl font-serif flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-muted-foreground" />
                  Booking History
                </h2>
                <Link
                  href={`/bookings/new?clientId=${client.id}`}
                  className="text-sm font-medium text-primary hover:text-primary/80"
                  data-testid="link-new-booking-for-client"
                >
                  + New Booking
                </Link>
              </div>
              
              {clientBookings.length > 0 ? (
                <div className="divide-y divide-border overflow-y-auto flex-1">
                  {clientBookings.map(booking => (
                    <Link
                      key={booking.id}
                      href={`/bookings/${booking.id}`}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-muted/50 transition-colors block"
                      data-testid={`link-booking-${booking.id}`}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-foreground">{booking.eventType}</span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            booking.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                            booking.status === 'active' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                            booking.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                          }`}>
                            {booking.status}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {booking.firstServiceDate ? format(parseISO(booking.firstServiceDate), "MMM d, yyyy") : "Date TBD"} • {booking.location}
                        </div>
                      </div>
                      <div className="mt-2 sm:mt-0 text-right">
                        <div className="font-medium font-serif">${booking.grandTotal.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">
                          {booking.balancePaid ? "Paid in full" : "Balance pending"}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-muted-foreground flex flex-col items-center flex-1 justify-center">
                  <FileText className="w-12 h-12 mb-4 opacity-20" />
                  <p className="max-w-sm mb-4">No bookings for this client yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
