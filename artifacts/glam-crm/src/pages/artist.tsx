import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatUSPhone, formatUSPhoneInput, isCompleteUSPhone } from "@/lib/phone";
import {
  getGetArtistProfileQueryKey,
  useGetArtistProfile,
  useUpdateArtistProfile,
} from "@workspace/api-client-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Save, UserRound } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const artistProfileSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  displayName: z.string().min(1, "Artist name is required"),
  email: z.string().optional().refine((value) => !value || z.string().email().safeParse(value).success, "Enter a valid email"),
  phone: z.string().optional().refine((value) => !value || isCompleteUSPhone(value), "Enter a full 10-digit phone number"),
  website: z.string().optional(),
  instagram: z.string().optional(),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
});

type ArtistProfileFormValues = z.infer<typeof artistProfileSchema>;

function optionalText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export default function Artist() {
  const { data: artistProfile, isLoading } = useGetArtistProfile();
  const updateArtistProfile = useUpdateArtistProfile();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<ArtistProfileFormValues>({
    resolver: zodResolver(artistProfileSchema),
    defaultValues: {
      businessName: "",
      displayName: "",
      email: "",
      phone: "",
      website: "",
      instagram: "",
      paymentMethod: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (!artistProfile) return;

    form.reset({
      businessName: artistProfile.businessName,
      displayName: artistProfile.displayName,
      email: artistProfile.email ?? "",
      phone: artistProfile.phone ?? "",
      website: artistProfile.website ?? "",
      instagram: artistProfile.instagram ?? "",
      paymentMethod: artistProfile.paymentMethod ?? "",
      notes: artistProfile.notes ?? "",
    });
  }, [artistProfile, form]);

  function onSubmit(data: ArtistProfileFormValues) {
    updateArtistProfile.mutate({
      data: {
        businessName: data.businessName.trim(),
        displayName: data.displayName.trim(),
        email: optionalText(data.email),
        phone: data.phone ? formatUSPhone(data.phone) : null,
        website: optionalText(data.website),
        instagram: optionalText(data.instagram),
        paymentMethod: optionalText(data.paymentMethod),
        notes: optionalText(data.notes),
      },
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetArtistProfileQueryKey() });
        toast({ title: "Artist profile saved" });
      },
      onError: () => {
        toast({ title: "Failed to save artist profile", variant: "destructive" });
      },
    });
  }

  return (
    <Shell>
      <div className="space-y-7">
        <header className="max-w-2xl">
          <span className="crm-eyebrow">Studio · Identity</span>
          <h1 className="crm-page-title mt-2">Artist profile</h1>
          <p className="crm-page-subtitle">
            Manage the business and contact details used across the app, generated contracts, and client-facing surfaces.
          </p>
          <div className="crm-gold-rule mt-6 w-24" />
        </header>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[320px_1fr]">
            <div className="crm-section p-6">
              <div className="crm-monogram mb-5 h-12 w-12">
                <UserRound className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <span className="crm-eyebrow">{form.watch("businessName") || "Business name"}</span>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                {form.watch("displayName") || "Artist Profile"}
              </h2>
              <div className="crm-gold-rule my-5 w-12" />
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="crm-eyebrow !text-[10px]">Email</dt>
                  <dd className="mt-1 break-words text-foreground">{form.watch("email") || <span className="italic text-muted-foreground">Not set</span>}</dd>
                </div>
                <div>
                  <dt className="crm-eyebrow !text-[10px]">Phone</dt>
                  <dd className="mt-1 text-foreground">{form.watch("phone") || <span className="italic text-muted-foreground">Not set</span>}</dd>
                </div>
                {form.watch("instagram") && (
                  <div>
                    <dt className="crm-eyebrow !text-[10px]">Instagram</dt>
                    <dd className="mt-1 text-foreground">{form.watch("instagram")}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="crm-section p-6 sm:p-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-7">
                  <div>
                    <span className="crm-eyebrow">Edit · Details</span>
                    <h2 className="crm-section-title mt-1">Profile details</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      These details appear in the sidebar and on generated service agreements.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="businessName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Name</FormLabel>
                        <FormControl><Input {...field} data-testid="input-artist-business-name" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="displayName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Artist Name</FormLabel>
                        <FormControl><Input {...field} data-testid="input-artist-display-name" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl><Input type="email" placeholder="artist@example.com" {...field} data-testid="input-artist-email" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="(555) 123-4567"
                            {...field}
                            onChange={(event) => field.onChange(formatUSPhoneInput(event.target.value))}
                            data-testid="input-artist-phone"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="website" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl><Input placeholder="https://example.com" {...field} data-testid="input-artist-website" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="instagram" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instagram</FormLabel>
                        <FormControl><Input placeholder="@artist" {...field} data-testid="input-artist-instagram" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Payment Method</FormLabel>
                      <FormControl><Input placeholder="e.g. Zelle @username, Venmo @handle, Cash" {...field} data-testid="input-artist-payment-method" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Internal Notes</FormLabel>
                      <FormControl><Textarea rows={4} placeholder="Business details, contract notes, or internal reminders." {...field} data-testid="textarea-artist-notes" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="flex justify-end border-t border-card-border/60 pt-5">
                    <Button type="submit" disabled={updateArtistProfile.isPending} data-testid="btn-save-artist-profile">
                      <Save className="h-4 w-4" />
                      Save artist profile
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
