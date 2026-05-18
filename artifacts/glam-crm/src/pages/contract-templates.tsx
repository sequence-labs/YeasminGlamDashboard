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
  useCreateContractTemplate,
  useDeleteContractTemplate,
  useListContractTemplates,
  useUpdateContractTemplate,
} from "@workspace/api-client-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Archive, CopyPlus, FileText, Save } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const templateFormSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  body: z.string().min(1, "Template body is required"),
  active: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

const blankTemplate = `Contract Template

Use this area for clauses, sections, or contract notes that should be available as a reusable template.`;

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

const templateClauseLabels: Array<{ key: TemplateClauseKey; label: string }> = [
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

export default function ContractTemplates() {
  const { data: templates, isLoading } = useListContractTemplates();
  const createTemplate = useCreateContractTemplate();
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const selectedTemplate = templates?.find((template) => template.id === selectedTemplateId) ?? templates?.[0] ?? null;

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-serif text-foreground">Contract Templates</h1>
            <p className="text-muted-foreground mt-1">Manage reusable contract language. The current agreement is saved as the default template.</p>
          </div>
          <Button
            type="button"
            onClick={() => {
              createTemplate.mutate({
                data: {
                  name: "New Contract Template",
                  description: "Draft contract template.",
                  body: serializeTemplateClauses({
                    ...defaultTemplateClauses,
                    intro: blankTemplate,
                  }),
                  active: true,
                  isDefault: false,
                },
              }, {
                onSuccess: (template) => {
                  queryClient.invalidateQueries({ queryKey: getListContractTemplatesQueryKey() });
                  setSelectedTemplateId(template.id);
                  toast({ title: "Contract template added" });
                },
                onError: () => toast({ title: "Failed to add contract template", variant: "destructive" }),
              });
            }}
            disabled={createTemplate.isPending}
            data-testid="btn-add-contract-template"
          >
            <CopyPlus className="w-4 h-4 mr-2" />
            Add Template
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-[520px] w-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6 items-start">
            <div className="bg-card border rounded-lg p-4 shadow-sm space-y-3">
              <div>
                <h2 className="text-lg font-serif">Templates</h2>
                <p className="text-sm text-muted-foreground">Select a template to edit.</p>
              </div>

              {templates && templates.length > 0 ? (
                <div className="space-y-2">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setSelectedTemplateId(template.id)}
                      className={`w-full rounded-md border p-3 text-left transition-colors ${
                        selectedTemplate?.id === template.id ? "border-primary bg-primary/5" : "hover:bg-muted/40"
                      }`}
                      data-testid={`btn-contract-template-${template.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium text-foreground">{template.name}</div>
                          {template.description && <div className="mt-1 text-sm text-muted-foreground">{template.description}</div>}
                        </div>
                        {template.isDefault && <Badge variant="secondary">Default</Badge>}
                      </div>
                      {!template.active && <div className="mt-2 text-xs font-medium text-muted-foreground">Archived</div>}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-dashed p-6 text-center text-muted-foreground">
                  No templates yet.
                </div>
              )}
            </div>

            {selectedTemplate ? (
              <ContractTemplateEditor template={selectedTemplate} />
            ) : (
              <div className="bg-card border rounded-lg p-8 text-center text-muted-foreground">
                Select or add a template to start editing.
              </div>
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}

function ContractTemplateEditor({ template }: { template: ContractTemplate }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateTemplate = useUpdateContractTemplate();
  const deleteTemplate = useDeleteContractTemplate();

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    values: {
      name: template.name,
      description: template.description ?? "",
      body: template.body,
      active: template.active,
      isDefault: template.isDefault,
    },
  });

  function onSubmit(data: TemplateFormValues) {
    updateTemplate.mutate({
      id: template.id,
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
        toast({ title: "Contract template saved" });
      },
      onError: () => toast({ title: "Failed to save contract template", variant: "destructive" }),
    });
  }

  function handleArchive() {
    if (!confirm("Archive this contract template?")) return;

    deleteTemplate.mutate({ id: template.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListContractTemplatesQueryKey() });
        toast({ title: "Contract template archived" });
      },
      onError: () => toast({ title: "Failed to archive contract template", variant: "destructive" }),
    });
  }

  return (
    <div className="bg-card border rounded-lg p-6 shadow-sm">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="flex items-start justify-between gap-4 border-b pb-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-serif">Edit Template</h2>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Update template copy, status, and default selection.</p>
            </div>
            <Button type="button" variant="outline" onClick={handleArchive} disabled={deleteTemplate.isPending || template.isDefault} data-testid="btn-archive-contract-template">
              <Archive className="w-4 h-4 mr-2" />
              Archive
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Template Name</FormLabel>
                <FormControl><Input {...field} data-testid="input-contract-template-name" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Input {...field} data-testid="input-contract-template-description" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-md border bg-muted/20 p-4 sm:grid-cols-2">
            <FormField control={form.control} name="active" render={({ field }) => (
              <FormItem className="flex items-center justify-between gap-3 rounded-md bg-background p-3">
                <div>
                  <FormLabel>Active</FormLabel>
                  <p className="text-xs text-muted-foreground">Keep this template available.</p>
                </div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-contract-template-active" /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="isDefault" render={({ field }) => (
              <FormItem className="flex items-center justify-between gap-3 rounded-md bg-background p-3">
                <div>
                  <FormLabel>Default</FormLabel>
                  <p className="text-xs text-muted-foreground">Use as the primary agreement template.</p>
                </div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-contract-template-default" /></FormControl>
              </FormItem>
            )} />
          </div>

          <ContractTemplatePreview
            body={form.watch("body")}
            onChange={(body) => form.setValue("body", body, { shouldDirty: true, shouldValidate: true })}
          />

          <div className="flex justify-end border-t pt-4">
            <Button type="submit" disabled={updateTemplate.isPending} data-testid="btn-save-contract-template">
              <Save className="w-4 h-4 mr-2" />
              Save Template
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

function ContractTemplatePreview({ body, onChange }: { body: string; onChange: (body: string) => void }) {
  const clauses = parseTemplateClauses(body);

  function updateClause(key: TemplateClauseKey, value: string) {
    onChange(serializeTemplateClauses({ ...clauses, [key]: value }));
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-serif">Template Preview</h3>
        <p className="text-sm text-muted-foreground">
          Demo values show what the app auto-populates. Edit only the contract language fields inside each section.
        </p>
      </div>

      <div className="rounded-lg border bg-white p-6 text-sm text-slate-900 shadow-sm">
        <div className="text-center">
          <h4 className="text-xl font-bold uppercase">Makeup & Hair Service Agreement</h4>
          <p className="mt-1 text-slate-600">Professional Makeup and Hair Services for Wedding Events</p>
          <div className="mx-auto mt-5 h-px w-full bg-slate-900" />
        </div>

        <EditableClause
          label={templateClauseLabels[0].label}
          value={clauses.intro}
          onChange={(value) => updateClause("intro", value)}
        />

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
          <EditableClause label={templateClauseLabels[1].label} value={clauses.schedule} onChange={(value) => updateClause("schedule", value)} compact />
          <PreviewTable
            rows={[
              ["Wedding morning", "September 20, 2026 · Services begin 8:00 AM · Completion target 1:00 PM"],
              ["Reception touch-up", "September 20, 2026 · Services begin 4:00 PM · Completion target 5:00 PM"],
            ]}
          />
        </PreviewSection>

        <PreviewSection title="3. Pricing">
          <EditableClause label={templateClauseLabels[2].label} value={clauses.pricing} onChange={(value) => updateClause("pricing", value)} compact />
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
          <EditableClause label={templateClauseLabels[3].label} value={clauses.payment} onChange={(value) => updateClause("payment", value)} compact />
        </PreviewSection>

        {templateClauseLabels.slice(4, 10).map(({ key, label }, index) => (
          <PreviewSection key={key} title={`${index + 5}. ${sectionTitleForClause(key)}`}>
            <EditableClause label={label} value={clauses[key]} onChange={(value) => updateClause(key, value)} compact />
            <p className="text-xs text-slate-500">Client Initials: ____</p>
          </PreviewSection>
        ))}

        <PreviewSection title="11. Agreement and Signatures">
          <EditableClause label={templateClauseLabels[10].label} value={clauses.signatures} onChange={(value) => updateClause("signatures", value)} compact />
          <div className="grid grid-cols-1 gap-5 pt-2 md:grid-cols-2">
            <SignaturePreview title="Client" name="Demo Client Name" email="client@example.com" phone="(555) 010-0000" />
            <SignaturePreview title="Artist" name="Demo Artist Name" email="artist@example.com" phone="(347) 781-8809" />
          </div>
        </PreviewSection>
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
      <h5 className="border-b-2 border-slate-900 pb-1 text-base font-bold">{title}</h5>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function EditableClause({
  label,
  value,
  onChange,
  compact = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-primary">{label}</span>
      <Textarea
        rows={compact ? 3 : 4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="bg-amber-50 text-sm leading-relaxed"
        data-testid={`textarea-template-clause-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
      />
    </label>
  );
}

function PreviewTable({ rows }: { rows: string[][] }) {
  return (
    <table className="w-full border-collapse text-xs">
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${row[0]}-${index}`} className="border-b border-slate-200">
            {row.map((cell, cellIndex) => (
              <td key={`${cell}-${cellIndex}`} className={`px-2 py-2 ${cellIndex === 0 ? "bg-slate-100 font-semibold" : "text-right"}`}>
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
