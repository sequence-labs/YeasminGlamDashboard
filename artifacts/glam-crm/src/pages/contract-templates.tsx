import { Shell } from "@/components/layout/Shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  getListContractTemplatesQueryKey,
  type ContractTemplate,
  useDeleteContractTemplate,
  useListContractTemplates,
  useUpdateContractTemplate,
} from "@workspace/api-client-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Archive, Eye, FileText, Lock, Save } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const contractFormSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  body: z.string().min(1, "Template body is required"),
  active: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

type TemplateFormValues = z.infer<typeof contractFormSchema>;

const blankTemplate = `Contract Template

Use this area for clauses, sections, or contract notes that should be available as a reusable contract.`;

const defaultTemplateClauses = {
  intro:
    "This Makeup & Hair Service Agreement is between the Artist and Client for makeup and hair services at the listed event location. This Agreement becomes binding when signed by both parties and the non-refundable retainer is received by Artist.",
  schedule:
    "Services are priced per person and per service, not hourly. The service windows are for scheduling and coordination. Artist is not responsible for the actual start time of any ceremony, reception, cocktail hour, photo session, or other event activity.",
  pricing:
    "The rate schedule lists the unit prices. The booking charges table applies those rates to the selected quantities for this Agreement.",
  payment:
    "The retainer is earned upon receipt because Artist reserves the requested dates and times, may decline other work, and begins planning. No dates or times are reserved until this Agreement is signed and the retainer is received.",
  scope:
    "Services will be performed according to the selected booking services and the agreed event schedule. Any additional services must be approved by Artist and may require additional fees.",
  responsibilities:
    "Client is responsible for providing accurate timing, location, access, parking, room, and service recipient information before the event date.",
  limitations:
    "Artist may shorten, modify, or skip services if Client, guests, venue access, preparation, timing, safety, or schedule issues cause delay.",
  cancellation:
    "The non-refundable retainer is kept if Client cancels. The parties agree that the cancellation amounts shown in this Agreement are reasonable because Artist reserves the date and may decline other work.",
  emergency:
    "If Artist cannot perform due to illness, emergency, severe weather, unsafe conditions, or circumstances beyond Artist's reasonable control, Artist will make reasonable efforts to arrange a qualified substitute.",
  general:
    "This Agreement is governed by New York law. Any changes must be in writing and confirmed by both parties. Electronic signatures are valid.",
  signatures:
    "By signing below, Client confirms that Client understands the payment terms, cancellation policy, service limits, and responsibilities in this Agreement.",
};

type TemplateClauseKey = keyof typeof defaultTemplateClauses;
type TemplateClauses = Record<TemplateClauseKey, string>;

const contractClauseLabels: Array<{ key: TemplateClauseKey; label: string }> = [
  { key: "intro", label: "Opening Agreement Language" },
  { key: "schedule", label: "Schedule Language" },
  { key: "pricing", label: "Pricing Language" },
  { key: "payment", label: "Payment Language" },
  { key: "scope", label: "Service Scope Language" },
  { key: "responsibilities", label: "Client Responsibilities Language" },
  { key: "limitations", label: "Limitations and Safety Language" },
  { key: "cancellation", label: "Cancellation Language" },
  { key: "emergency", label: "Emergency Language" },
  { key: "general", label: "General Terms Language" },
  { key: "signatures", label: "Signature Confirmation Language" },
];

function parseTemplateClauses(body: string): TemplateClauses {
  try {
    const parsed = JSON.parse(body) as { clauses?: Partial<TemplateClauses> };
    return { ...defaultTemplateClauses, ...(parsed.clauses ?? {}) };
  } catch {
    return defaultTemplateClauses;
  }
}

function serializeTemplateClauses(clauses: TemplateClauses) {
  return JSON.stringify({ version: 1, clauses }, null, 2);
}

function optionalText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export default function ContractContracts() {
  const { data: contracts, isLoading } = useListContractTemplates();
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

  const visibleContracts = contracts?.filter((contract) => contract.active || contract.locked) ?? [];
  const selectedTemplate = visibleContracts.find((contract) => contract.id === selectedTemplateId) ?? visibleContracts[0] ?? null;
  const lockedCount = visibleContracts.filter((contract) => contract.locked).length;
  const editableCount = visibleContracts.filter((contract) => !contract.locked).length;

  return (
    <Shell>
      <div className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Agreement library</p>
            <h1 className="mt-1 font-sans text-3xl font-semibold tracking-normal text-foreground">Contracts</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Review approved agreement language exactly as it appears in generated contracts.
            </p>
          </div>
          <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-border bg-card text-sm">
            <div className="border-r border-border px-4 py-2">
              <div className="font-mono text-lg font-semibold text-foreground">{visibleContracts.length}</div>
              <div className="text-xs text-muted-foreground">Visible</div>
            </div>
            <div className="border-r border-border px-4 py-2">
              <div className="font-mono text-lg font-semibold text-foreground">{lockedCount}</div>
              <div className="text-xs text-muted-foreground">Locked</div>
            </div>
            <div className="px-4 py-2">
              <div className="font-mono text-lg font-semibold text-foreground">{editableCount}</div>
              <div className="text-xs text-muted-foreground">Editable</div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-[720px] w-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[340px_minmax(0,1fr)] xl:items-start">
            <aside className="crm-section overflow-hidden">
              <div className="border-b border-card-border px-4 py-4">
                <h2 className="font-sans text-lg font-semibold tracking-normal text-foreground">Contract versions</h2>
                <p className="mt-1 text-sm text-muted-foreground">Choose the agreement to inspect.</p>
              </div>

              {visibleContracts.length > 0 ? (
                <div className="divide-y divide-border">
                  {visibleContracts.map((contract) => (
                    <button
                      key={contract.id}
                      type="button"
                      onClick={() => setSelectedTemplateId(contract.id)}
                      className={`w-full p-4 text-left transition-colors ${
                        selectedTemplate?.id === contract.id ? "bg-primary/10" : "hover:bg-muted/35"
                      }`}
                      data-testid={`btn-contract-${contract.id}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 shrink-0 text-primary" />
                            <div className="line-clamp-2 font-medium text-foreground">{contract.name}</div>
                          </div>
                          {contract.description && <div className="mt-2 line-clamp-3 text-sm text-muted-foreground">{contract.description}</div>}
                        </div>
                        <div className="flex shrink-0 flex-col gap-1">
                          {contract.isDefault && <Badge variant="secondary">Default</Badge>}
                          {contract.locked && <Badge variant="outline">Locked</Badge>}
                        </div>
                      </div>
                      {!contract.active && <div className="mt-2 text-xs font-medium text-muted-foreground">Archived</div>}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="m-4 rounded-md border border-dashed p-6 text-center text-muted-foreground">
                  No contracts saved yet.
                </div>
              )}
            </aside>

            {selectedTemplate ? (
              <ContractTemplateEditor contract={selectedTemplate} />
            ) : (
              <div className="crm-section p-8 text-center text-muted-foreground">
                Select a contract to review.
              </div>
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}

function ContractTemplateEditor({ contract }: { contract: ContractTemplate }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateTemplate = useUpdateContractTemplate();
  const deleteTemplate = useDeleteContractTemplate();

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(contractFormSchema),
    values: {
      name: contract.name,
      description: contract.description ?? "",
      body: contract.body,
      active: contract.active,
      isDefault: contract.isDefault,
    },
  });

  if (contract.locked) {
    return (
      <div className="space-y-5">
        <div className="crm-section p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <h2 className="font-sans text-xl font-semibold tracking-normal text-foreground">{contract.name}</h2>
              </div>
              {contract.description && <p className="mt-1 text-sm text-muted-foreground">{contract.description}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {contract.isDefault && <Badge variant="secondary">Default</Badge>}
              <Badge variant="outline">Locked</Badge>
            </div>
          </div>
        </div>

        <ContractTemplatePreview body={contract.body} />
      </div>
    );
  }

  function onSubmit(data: TemplateFormValues) {
    updateTemplate.mutate({
      id: contract.id,
      data: {
        name: data.name.trim(),
        description: optionalText(data.description),
        body: data.body.trim(),
        active: data.active,
        isDefault: data.isDefault,
      },
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListContractTemplatesQueryKey() });
        toast({ title: "Contract saved" });
      },
      onError: () => toast({ title: "Failed to save contract", variant: "destructive" }),
    });
  }

  function handleArchive() {
    if (!confirm("Archive this contract?")) return;

    deleteTemplate.mutate({ id: contract.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListContractTemplatesQueryKey() });
        toast({ title: "Contract archived" });
      },
      onError: () => toast({ title: "Failed to archive contract", variant: "destructive" }),
    });
  }

  return (
    <div className="space-y-5">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="crm-section p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h2 className="font-sans text-xl font-semibold tracking-normal text-foreground">Edit Contract</h2>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Update contract copy, status, and default selection.</p>
              </div>
              <Button type="button" variant="outline" onClick={handleArchive} disabled={deleteTemplate.isPending || contract.isDefault} data-testid="btn-archive-contract">
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </Button>
            </div>
          </div>

          <div className="crm-section grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Contract Name</FormLabel>
                <FormControl><Input {...field} data-testid="input-contract-name" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Input {...field} data-testid="input-contract-description" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <div className="crm-section grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
            <FormField control={form.control} name="active" render={({ field }) => (
              <FormItem className="flex items-center justify-between gap-3 rounded-md bg-background p-3">
                <div>
                  <FormLabel>Active</FormLabel>
                  <p className="text-xs text-muted-foreground">Keep this contract available.</p>
                </div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-contract-active" /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="isDefault" render={({ field }) => (
              <FormItem className="flex items-center justify-between gap-3 rounded-md bg-background p-3">
                <div>
                  <FormLabel>Default</FormLabel>
                  <p className="text-xs text-muted-foreground">Use as the primary agreement contract.</p>
                </div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-contract-default" /></FormControl>
              </FormItem>
            )} />
          </div>

          <ContractLanguageEditor
            body={form.watch("body")}
            onChange={(body) => form.setValue("body", body, { shouldDirty: true, shouldValidate: true })}
          />

          <ContractTemplatePreview body={form.watch("body")} />

          <div className="sticky bottom-4 z-[1] flex justify-end">
            <Button type="submit" disabled={updateTemplate.isPending} data-testid="btn-save-contract">
              <Save className="mr-2 h-4 w-4" />
              Save Contract
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

function ContractLanguageEditor({ body, onChange }: { body: string; onChange: (body: string) => void }) {
  const clauses = parseTemplateClauses(body);

  function updateClause(key: TemplateClauseKey, value: string) {
    onChange(serializeTemplateClauses({ ...clauses, [key]: value }));
  }

  return (
    <div className="crm-section overflow-hidden">
      <div className="border-b border-card-border px-5 py-4">
        <h3 className="font-sans text-lg font-semibold tracking-normal text-foreground">Language controls</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Edit reusable legal copy here. Auto-filled booking details stay out of the editor and render in the preview below.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-2">
        {contractClauseLabels.map(({ key, label }) => (
          <EditableClause key={key} label={label} value={clauses[key]} onChange={(value) => updateClause(key, value)} />
        ))}
      </div>
    </div>
  );
}

function ContractTemplatePreview({ body }: { body: string }) {
  const clauses = parseTemplateClauses(body);

  return (
    <div className="crm-section overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-card-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-sans text-lg font-semibold tracking-normal text-foreground">Generated contract preview</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Demo values show the booking fields the app auto-populates when a client opens or downloads a contract.
          </p>
        </div>
        <Badge variant="secondary" className="w-fit gap-1.5">
          <Eye className="h-3.5 w-3.5" />
          Preview
        </Badge>
      </div>

      <div className="bg-[linear-gradient(180deg,hsl(var(--muted))_0%,hsl(var(--background))_100%)] px-3 py-5 sm:px-6">
        <div className="contract-print-page mx-auto max-w-[820px] rounded-sm border border-slate-200 bg-white px-6 py-8 font-sans text-[13px] leading-relaxed text-black shadow-[0_24px_70px_-42px_rgba(15,23,42,.55)] sm:px-10 sm:py-10">
        <div className="text-center">
          <h4 className="text-xl font-bold uppercase tracking-wide">Makeup & Hair Service Agreement</h4>
          <p className="mt-1 text-sm text-slate-600">Professional Makeup and Hair Services for Wedding Events</p>
          <div className="mx-auto mt-5 h-[2px] w-full bg-slate-900" />
        </div>

        <ClauseBlock label={contractClauseLabels[0].label} value={clauses.intro} />

        <PreviewSection title="1. Booking Information">
          <PreviewTable
            rows={[
              ["Artist / Service Provider", "Demo Artist Name"],
              ["Client", "Demo Client Name"],
              ["Client Email / Phone", "client@example.com / (555) 010-0000"],
              ["Artist Email / Phone", "artist@example.com / (347) 781-8809"],
              ["Primary Service Location", "Brooklyn Botanic Garden, Brooklyn, NY"],
              ["Specific Room / Suite", "Palm House bridal suite"],
              ["First Service Date", "September 20, 2026"],
              ["Agreement Date", "May 18, 2026"],
            ]}
          />
        </PreviewSection>

        <PreviewSection title="2. Service Schedule and Guaranteed Services">
          <ClauseBlock label={contractClauseLabels[1].label} value={clauses.schedule} />
          <PreviewTable
            rows={[
              ["Wedding morning", "September 20, 2026 · Services begin 8:00 AM · Completion target 1:00 PM"],
              ["Reception touch-up", "September 20, 2026 · Services begin 4:00 PM · Completion target 5:00 PM"],
            ]}
          />
        </PreviewSection>

        <PreviewSection title="3. Pricing">
          <ClauseBlock label={contractClauseLabels[2].label} value={clauses.pricing} />
          <PreviewTable
            rows={[
              ["Hair & Makeup", "2 x $285", "$570"],
              ["Travel Fee", "1 x $150", "$150"],
              ["Grand Total", "", "$720"],
            ]}
          />
        </PreviewSection>

        <PreviewSection title="4. Retainer, Final Payment, and Payment Method">
          <PreviewTable
            rows={[
              ["Grand Total", "$720"],
              ["Non-Refundable Retainer / Booking Fee", "$180, due upon signing"],
              ["Remaining Balance", "$540"],
              ["Payment Method", "Zelle (347) 781-8809"],
            ]}
          />
          <ClauseBlock label={contractClauseLabels[3].label} value={clauses.payment} />
        </PreviewSection>

        {contractClauseLabels.slice(4, 10).map(({ key, label }, index) => (
          <PreviewSection key={key} title={`${index + 5}. ${sectionTitleForClause(key)}`}>
            <ClauseBlock label={label} value={clauses[key]} />
            <p className="text-xs text-slate-500">Client Initials: ____</p>
          </PreviewSection>
        ))}

        <PreviewSection title="11. Agreement and Signatures">
          <ClauseBlock label={contractClauseLabels[10].label} value={clauses.signatures} />
          <div className="grid grid-cols-1 gap-5 pt-2 md:grid-cols-2">
            <SignaturePreview title="Client" name="Demo Client Name" email="client@example.com" phone="(555) 010-0000" />
            <SignaturePreview title="Artist" name="Demo Artist Name" email="artist@example.com" phone="(347) 781-8809" />
          </div>
        </PreviewSection>
      </div>
      </div>
    </div>
  );
}

function sectionTitleForClause(key: TemplateClauseKey) {
  const titles: Record<TemplateClauseKey, string> = {
    intro: "Agreement Opening",
    schedule: "Service Schedule and Guaranteed Services",
    pricing: "Pricing",
    payment: "Retainer, Final Payment, and Payment Method",
    scope: "Service Scope",
    responsibilities: "Client Responsibilities and Preparation",
    limitations: "Service Limitations and Safety",
    cancellation: "Cancellation and Rescheduling",
    emergency: "Artist Emergency and Limited Remedies",
    general: "Photo Consent and General Terms",
    signatures: "Agreement and Signatures",
  };
  return titles[key];
}

function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h5 className="border-b-2 border-slate-900 pb-1 font-serif text-base font-bold">{title}</h5>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function ClauseBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-slate-200 bg-slate-50/70 p-3">
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-primary">{label}</div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-900">{value}</p>
    </div>
  );
}

function EditableClause({ label, value, onChange }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-primary">{label}</span>
      <Textarea
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[112px] bg-background text-sm leading-relaxed"
        data-testid={`textarea-contract-clause-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
      />
    </label>
  );
}

function PreviewTable({ rows }: { rows: string[][] }) {
  return (
    <table className="w-full border-collapse text-xs sm:text-[13px]">
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${row[0]}-${index}`} className="border-b border-slate-200">
            {row.map((cell, cellIndex) => (
              <td key={`${cell}-${cellIndex}`} className={`px-2 py-2 align-top ${cellIndex === 0 ? "w-[38%] bg-slate-100 font-semibold" : "text-right"}`}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SignaturePreview({ title, name, email, phone }: { title: string; name: string; email: string; phone: string }) {
  return (
    <div>
      <div className="mb-3 text-center text-xs font-bold uppercase">{title}</div>
      <div className="space-y-3 text-xs">
        <div>Name: {name}</div>
        <div>Signature: <span className="inline-block w-full border-b border-slate-900 pt-4" /></div>
        <div>Date: <span className="inline-block w-full border-b border-slate-900 pt-4" /></div>
        <div>Email: {email}</div>
        <div>Phone: {phone}</div>
      </div>
    </div>
  );
}
