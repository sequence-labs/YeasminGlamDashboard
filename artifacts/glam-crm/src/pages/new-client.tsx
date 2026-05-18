import { Shell } from "@/components/layout/Shell";
import { useCreateClient, getListClientsQueryKey } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { formatUSPhone, isCompleteUSPhone } from "@/lib/phone";

const clientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional().refine((value) => !value || isCompleteUSPhone(value), "Enter a full 10-digit phone number"),
  notes: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

export default function NewClient() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createClient = useCreateClient();

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      notes: "",
    },
  });

  function onSubmit(data: ClientFormValues) {
    createClient.mutate({
      data: {
        ...data,
        phone: data.phone ? formatUSPhone(data.phone) : undefined,
      },
    }, {
      onSuccess: (client) => {
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
        toast({ title: "Client created successfully" });
        setLocation(`/clients/${client.id}`);
      },
      onError: () => {
        toast({ title: "Failed to create client", variant: "destructive" });
      }
    });
  }

  return (
    <Shell>
      <div className="max-w-2xl space-y-6">
        <div>
          <Link
            href="/clients"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
            data-testid="link-back-clients"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Clients
          </Link>
          <h1 className="text-3xl font-serif text-foreground">New Client</h1>
          <p className="text-muted-foreground mt-1">Add a new client to your roster.</p>
        </div>

        <div className="bg-card border rounded-lg p-6 shadow-sm">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Jane Doe" {...field} data-testid="input-client-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="jane@example.com" {...field} data-testid="input-client-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="(555) 123-4567" {...field} data-testid="input-client-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Internal)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Skin type, preferences, allergies..."
                        className="resize-none min-h-[120px]"
                        {...field}
                        data-testid="input-client-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={createClient.isPending} data-testid="button-submit-client">
                  {createClient.isPending ? "Creating..." : "Create Client"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </Shell>
  );
}
