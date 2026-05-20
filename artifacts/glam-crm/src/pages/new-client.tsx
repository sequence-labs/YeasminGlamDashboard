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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { formatUSPhone, isCompleteUSPhone } from "@/lib/phone";

const clientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z
    .string()
    .optional()
    .refine((value) => !value || isCompleteUSPhone(value), "Enter a full 10-digit phone number"),
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
    defaultValues: { name: "", email: "", phone: "", notes: "" },
  });

  function onSubmit(data: ClientFormValues) {
    createClient.mutate(
      {
        data: {
          ...data,
          phone: data.phone ? formatUSPhone(data.phone) : undefined,
        },
      },
      {
        onSuccess: (client) => {
          queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
          toast({ title: "Client created successfully" });
          setLocation(`/clients/${client.id}`);
        },
        onError: () => {
          toast({ title: "Failed to create client", variant: "destructive" });
        },
      },
    );
  }

  return (
    <Shell>
      <div className="mx-auto max-w-3xl space-y-7">
        <div>
          <Link
            href="/clients"
            className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
            data-testid="link-back-clients"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to clients
          </Link>
          <div className="mt-5">
            <span className="crm-eyebrow">Roster · Intake</span>
            <h1 className="crm-page-title mt-2">New client</h1>
            <p className="crm-page-subtitle">Add a new client to your roster.</p>
            <div className="crm-gold-rule mt-6 w-24" />
          </div>
        </div>

        <div className="crm-section p-6 sm:p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-7">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full name *</FormLabel>
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
                        <Input
                          type="email"
                          placeholder="jane@example.com"
                          {...field}
                          data-testid="input-client-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2 md:max-w-xs">
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(555) 123-4567"
                          {...field}
                          data-testid="input-client-phone"
                        />
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
                    <FormLabel>Notes (internal)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Skin type, preferences, allergies, fit notes…"
                        className="min-h-[140px] resize-y"
                        {...field}
                        data-testid="input-client-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 border-t border-card-border/60 pt-5">
                <Button asChild variant="ghost" type="button">
                  <Link href="/clients">Cancel</Link>
                </Button>
                <Button type="submit" disabled={createClient.isPending} data-testid="button-submit-client">
                  {createClient.isPending ? "Creating…" : "Create client"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </Shell>
  );
}
