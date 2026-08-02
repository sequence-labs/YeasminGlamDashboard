import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAnalyzeExpenseReceipt, useImportExpenseReceipt } from "@workspace/api-client-react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  FileImage,
  LoaderCircle,
  LockKeyhole,
  Plus,
  ReceiptText,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import {
  allocateReceiptTax,
  parseReceiptText,
  prepareReceiptImage,
  recognizeReceipt,
  type OcrProgress,
  type ReceiptDraft,
  type ReceiptExpenseCategory,
  type ReceiptImage,
  type ReceiptLineDraft,
} from "./receipt-ocr";

const categories: { value: ReceiptExpenseCategory; label: string }[] = [
  { value: "makeup_products", label: "Makeup products" },
  { value: "hair_products", label: "Hair products" },
  { value: "tools_equipment", label: "Tools & equipment" },
  { value: "disposables", label: "Disposables" },
  { value: "travel", label: "Travel" },
  { value: "education", label: "Education" },
  { value: "marketing", label: "Marketing" },
  { value: "software", label: "Software" },
  { value: "studio_supplies", label: "Studio supplies" },
  { value: "other", label: "Other" },
];

const paymentMethods = [
  "Credit/debit card",
  "Business card",
  "Personal card",
  "Cash",
  "Venmo",
  "Zelle",
  "PayPal",
  "Bank transfer",
  "Check",
  "Store credit",
  "Other",
];

type Props = {
  onImported: () => void;
  onManualEntry: () => void;
};

function money(value: number) {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function numericInput(value: string) {
  const parsed = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
}

function normalizePaymentMethod(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "";
  if (/(visa|mastercard|amex|american express|discover|credit|debit|card)/.test(normalized)) return "Credit/debit card";
  const match = paymentMethods.find((method) => method.toLowerCase() === normalized);
  return match ?? "Other";
}

function standardizeReceiptItemName(value: string) {
  let normalized = value
    .replace(/\s+/g, " ")
    .replace(/[|]+/g, " ")
    .trim()
    .replace(/^\d{8,14}\s+/, "");
  if (!normalized) return "Receipt item";

  normalized = normalized
    .replace(/\bALL\s+PURP\s+SIL\b/gi, "all-purpose silicone")
    .replace(/\bNITRILE\s+GLOVE\b/gi, "nitrile gloves")
    .replace(/\bMASON\s+MIX-TYPE\b/gi, "masonry mix")
    .replace(/\bPAINTCARE\s+FEE\b/gi, "PaintCare fee")
    .replace(/\bCOVERSTAIN\b/gi, "Cover Stain primer")
    .replace(/\b(\d+(?:\.\d+)?)\s*LB\b/gi, "$1 lb")
    .replace(/\b(\d+(?:\.\d+)?)\s*OZ\b/gi, "$1 oz")
    .replace(/\b(\d+)\s*CT\b/gi, "$1 count")
    .replace(/\b(\d+)\s*PR\b/gi, "$1 pair");

  const titled = normalized.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
  return titled
    .replace(/\bGe\b/g, "GE")
    .replace(/\bMke\b/g, "Makita")
    .replace(/\bDw\b/g, "DeWalt")
    .replace(/\bFfg\b/g, "FG")
    .replace(/\bOz\b/g, "oz")
    .replace(/\bLb\b/g, "lb")
    .replace(/\bXps\b/g, "XPS")
    .trim();
}

function standardizeDraftItems(items: ReceiptLineDraft[]) {
  return items.map((item) => ({ ...item, itemName: standardizeReceiptItemName(item.itemName) }));
}

function newLine(): ReceiptLineDraft {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `line-${Date.now()}`,
    itemName: "",
    category: "other",
    amount: 0,
    quantity: 1,
    productCode: "",
    confidence: "medium",
    sourceLine: "",
  };
}

export function ReceiptCaptureWorkflow({ onImported, onManualEntry }: Props) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);
  const importReceipt = useImportExpenseReceipt();
  const analyzeReceipt = useAnalyzeExpenseReceipt();
  const { toast } = useToast();
  const [image, setImage] = useState<ReceiptImage | null>(null);
  const [draft, setDraft] = useState<ReceiptDraft | null>(null);
  const [progress, setProgress] = useState<OcrProgress | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [businessUse, setBusinessUse] = useState(true);
  const [reimbursable, setReimbursable] = useState(false);
  const [geminiApplied, setGeminiApplied] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState<"idle" | "pending" | "applied" | "fallback">("idle");

  const itemSubtotal = useMemo(
    () => Math.round((draft?.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) ?? 0) * 100) / 100,
    [draft?.items],
  );
  const reconciliation = draft ? Math.round((draft.total - itemSubtotal - draft.tax) * 100) / 100 : 0;
  const visibleWarnings = draft?.warnings.filter((warning) => {
    if (warning.includes("Merchant name") && draft.vendor.trim()) return false;
    if (warning.includes("Purchase date") && draft.expenseDate) return false;
    if (warning.includes("differ from the receipt total") && Math.abs(reconciliation) <= 0.01) return false;
    return true;
  }) ?? [];
  const canSaveReceipt = Boolean(draft && image && draft.expenseDate && draft.total > 0);
  const canSaveItemized = canSaveReceipt && draft!.items.some((item) => item.itemName.trim() && item.amount > 0) && Math.abs(reconciliation) <= 0.01;

  function resetImport() {
    setDraft(null);
    setImage(null);
    setProgress(null);
    setPaymentMethod("");
    setBusinessUse(true);
    setReimbursable(false);
    setGeminiApplied(false);
    setGeminiStatus("idle");
    if (cameraInput.current) cameraInput.current.value = "";
    if (libraryInput.current) libraryInput.current.value = "";
  }

  async function processFile(file?: File) {
    if (!file) return;
    setGeminiApplied(false);
    setGeminiStatus("idle");
    setProgress({ label: "Finding receipt edges", progress: 4 });
    let prepared: ReceiptImage | null = null;
    try {
      prepared = await prepareReceiptImage(file);
      setImage(prepared);
      const result = await recognizeReceipt(prepared, setProgress);
      const preliminaryDraft = { ...result, items: standardizeDraftItems(result.items) };
      setDraft(preliminaryDraft);
      if (result.paymentMethod) setPaymentMethod(normalizePaymentMethod(result.paymentMethod));
      setProgress({ label: "Completing smart receipt review", progress: 98 });
      await applyGeminiSuggestions(preliminaryDraft, prepared);
      setProgress(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "The receipt could not be read.";
      setProgress(null);
      toast({
        title: "Receipt needs manual review",
        description: `${message} You can still enter its details from the saved image.`,
        variant: "destructive",
      });
      if (prepared) setDraft(parseReceiptText("", 0));
    }
  }

  function updateDraft(patch: Partial<ReceiptDraft>) {
    setDraft((current) => current ? { ...current, ...patch } : current);
  }

  function updateItem(id: string, patch: Partial<ReceiptLineDraft>) {
    setDraft((current) => current ? {
      ...current,
      items: current.items.map((item) => item.id === id ? { ...item, ...patch } : item),
    } : current);
  }

  function removeItem(id: string) {
    setDraft((current) => current ? { ...current, items: current.items.filter((item) => item.id !== id) } : current);
  }

  function addDifferenceLine() {
    if (!draft || reconciliation <= 0.01) return;
    setDraft({
      ...draft,
      items: [...draft.items, {
        ...newLine(),
        itemName: "Unrecognized receipt item",
        amount: reconciliation,
        confidence: "low",
      }],
    });
  }

  async function applyGeminiSuggestions(baseDraft = draft, preparedImage = image) {
    if (!baseDraft || !preparedImage || preparedImage.geminiDataUrls.length === 0) {
      setGeminiStatus("fallback");
      return;
    }
    setGeminiStatus("pending");
    try {
      const result = await analyzeReceipt.mutateAsync({ data: { redactedImages: preparedImage.geminiDataUrls } });
      const geminiItems = result.items
        .filter((item) => item.itemName.trim() && item.amount > 0)
        .map((item) => ({
          id: globalThis.crypto?.randomUUID?.() ?? `gemini-line-${Date.now()}-${Math.random()}`,
          itemName: standardizeReceiptItemName(item.itemName || item.receiptLabel),
          category: item.category,
          amount: item.amount,
          quantity: item.quantity,
          productCode: item.productCode.trim(),
          confidence: "medium" as const,
          sourceLine: item.receiptLabel.trim() || item.itemName.trim(),
        }));
      const geminiItemSubtotal = Math.round(geminiItems.reduce((sum, item) => sum + item.amount, 0) * 100) / 100;
      const geminiReconciliation = Math.round((result.total - geminiItemSubtotal - result.tax) * 100) / 100;
      setDraft((current) => current ? {
        ...current,
        vendor: result.vendor.trim() || current.vendor,
        expenseDate: result.expenseDate || current.expenseDate,
        purchaseTime: result.purchaseTime || current.purchaseTime,
        subtotal: result.subtotal,
        tax: result.tax,
        total: result.total,
        items: geminiItems.length > 0 || result.total === 0 ? geminiItems : current.items,
        confidence: Math.max(current.confidence, 80),
        warnings: [
          ...current.warnings.filter((warning) => (
            !warning.startsWith("Gemini suggestions") &&
            !warning.includes("could not be matched to a product line") &&
            !warning.includes("detected lines differ from the receipt total")
          )),
          `Gemini suggestions from ${result.model} were applied. Review every value before saving.`,
          ...(Math.abs(geminiReconciliation) > 0.01
            ? [`Gemini itemization differs from the receipt total by ${money(Math.abs(geminiReconciliation))}. Review the line totals in the itemized list above.`]
            : []),
        ],
      } : current);
      if (result.paymentMethod.trim()) setPaymentMethod(normalizePaymentMethod(result.paymentMethod));
      setGeminiApplied(true);
      setGeminiStatus("applied");
    } catch {
      setGeminiStatus("fallback");
      toast({
        title: "Smart review unavailable",
        description: "The local receipt read is still available for review. Nothing was saved.",
        variant: "destructive",
      });
    }
  }

  async function saveReceipt(kind: "itemized" | "combined") {
    if (!draft || !image || !canSaveReceipt) return;
    if (kind === "itemized" && !canSaveItemized) return;

    const itemized = allocateReceiptTax(draft.items, draft.tax).map(({ item, taxShare, total }) => ({
      itemName: item.itemName.trim(),
      category: item.category,
      amount: total,
      productCode: item.productCode.trim() || undefined,
      quantity: item.quantity > 0 ? item.quantity : undefined,
      notes: [
        item.sourceLine.trim() && item.sourceLine !== "Gemini redacted-image suggestion" ? `Receipt label: ${item.sourceLine.trim()}.` : "",
        taxShare > 0 ? `Receipt line ${money(item.amount)} plus ${money(taxShare)} allocated sales tax.` : "",
        draft.purchaseTime ? `Printed purchase time ${draft.purchaseTime}.` : "",
      ].filter(Boolean).join(" ") || undefined,
    }));
    const combinedCategory = draft.items.find((item) => item.itemName.trim())?.category ?? "other";
    const items = kind === "itemized" ? itemized : [{
      itemName: draft.vendor.trim() ? `${draft.vendor.trim()} receipt` : "Receipt purchase",
      category: combinedCategory,
      amount: draft.total,
      quantity: 1,
      notes: [
        `Combined receipt containing ${draft.items.filter((item) => item.itemName.trim()).length} reviewed line items.`,
        draft.purchaseTime ? `Printed purchase time ${draft.purchaseTime}.` : "",
      ].filter(Boolean).join(" "),
    }];

    try {
      await importReceipt.mutateAsync({
        data: {
          vendor: draft.vendor.trim() || undefined,
          expenseDate: draft.expenseDate,
          paymentMethod: paymentMethod || undefined,
          subtotal: itemSubtotal,
          tax: Math.max(0, draft.tax),
          total: draft.total,
          receiptDataUrl: image.dataUrl,
          receiptFileName: image.fileName,
          rawText: draft.rawText || undefined,
          ocrConfidence: draft.confidence,
          businessUse,
          reimbursable,
          items,
        },
      });
      onImported();
      toast({
        title: kind === "itemized" ? `${items.length} expenses recorded` : "Receipt recorded as one expense",
        description: `${draft.vendor || "Receipt"} · ${money(draft.total)}`,
      });
      resetImport();
    } catch {
      toast({ title: "Receipt was not saved", description: "Nothing was added. Review the fields and try again.", variant: "destructive" });
    }
  }

  return (
    <>
      <section className="crm-section overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
          <div className="p-5 sm:p-6 lg:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="crm-eyebrow">Receipt capture</span>
                <h2 className="mt-2 font-serif text-[clamp(1.75rem,4vw,2.35rem)] leading-none tracking-[-0.035em] text-foreground">
                  Scan it. Check it. Done.
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
                  Take a photo or choose an image. The app isolates the paper, cleans the text, and reads the merchant, date, totals, and product lines for you.
                </p>
              </div>
              <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/[0.06] text-primary sm:flex">
                <ScanLine className="h-5 w-5" strokeWidth={1.6} />
              </div>
            </div>

            {progress ? (
              <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/[0.035] p-5" aria-live="polite">
                <div className="flex items-center gap-3">
                  <LoaderCircle className="h-5 w-5 animate-spin text-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3 text-sm font-medium">
                      <span>{progress.label}</span>
                      <span className="tabular-nums text-muted-foreground">{progress.progress}%</span>
                    </div>
                    <Progress className="mt-3 h-1.5" value={Math.max(4, progress.progress)} />
                  </div>
                </div>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">Keep this page open while your phone reads the image.</p>
              </div>
            ) : (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  className="min-h-[66px] justify-start rounded-xl px-5 text-[15px] shadow-[0_12px_28px_-18px_hsl(var(--primary))]"
                  onClick={() => cameraInput.current?.click()}
                  data-testid="button-take-receipt-photo"
                >
                  <Camera className="h-5 w-5" strokeWidth={1.7} />
                  <span className="text-left">
                    <span className="block">Take receipt photo</span>
                    <span className="mt-0.5 block text-[11px] font-normal text-primary-foreground/75">Opens the back camera</span>
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-[66px] justify-start rounded-xl px-5 text-[15px]"
                  onClick={() => libraryInput.current?.click()}
                  data-testid="button-choose-receipt-image"
                >
                  <FileImage className="h-5 w-5" strokeWidth={1.7} />
                  <span className="text-left">
                    <span className="block">Choose receipt image</span>
                    <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">Photos and screenshots</span>
                  </span>
                </Button>
              </div>
            )}

            <input
              ref={cameraInput}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(event) => void processFile(event.target.files?.[0])}
              data-testid="input-receipt-camera"
            />
            <input
              ref={libraryInput}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => void processFile(event.target.files?.[0])}
              data-testid="input-receipt-library"
            />

            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-card-border/60 pt-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 text-foreground/80">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Local receipt scanning runs on this device
              </span>
              <span>Gemini runs automatically on the redacted copy</span>
            </div>
          </div>

          <div className="border-t border-card-border/70 bg-accent/[0.22] p-5 sm:p-6 lg:border-l lg:border-t-0 lg:p-7">
            <span className="crm-eyebrow">Before it saves</span>
            <ol className="mt-4 space-y-4">
              {[
                ["1", "Read", "Finds merchant, date, products, SKUs, tax, and total."],
                ["2", "Review", "Highlights uncertain lines and checks that the amounts balance."],
                ["3", "Record", "Save each product separately or keep the receipt as one expense."],
              ].map(([number, title, detail]) => (
                <li key={number} className="grid grid-cols-[30px_1fr] gap-3">
                  <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-primary/20 bg-card font-serif text-sm text-primary">{number}</span>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{title}</div>
                    <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{detail}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Button type="button" variant="ghost" className="mt-5 h-auto px-0 py-2 text-primary hover:bg-transparent hover:text-primary/80" onClick={onManualEntry}>
              Enter one expense manually
            </Button>
          </div>
        </div>
      </section>

      <Dialog open={Boolean(draft && image)} onOpenChange={(open) => !open && resetImport()}>
        <DialogContent className="left-0 top-0 h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 gap-0 overflow-hidden border-0 bg-background p-0 sm:left-1/2 sm:top-1/2 sm:h-[min(92dvh,920px)] sm:w-[min(94vw,980px)] sm:max-w-[980px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:border-card-border">
          {draft && image && (
            <div className="flex min-h-0 flex-1 flex-col">
              <DialogHeader className="border-b border-card-border/70 px-5 py-4 pr-14 text-left sm:px-7 sm:py-5">
                <div className="flex items-start gap-3">
                  <img src={image.previewUrl} alt="Receipt preview" className="h-14 w-11 shrink-0 rounded-md border border-card-border object-cover object-top" />
                  <div className="min-w-0 flex-1">
                    <DialogTitle className="font-serif text-2xl font-normal tracking-[-0.03em] sm:text-3xl">Review receipt</DialogTitle>
                    <DialogDescription className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span>{draft.items.length} detected line{draft.items.length === 1 ? "" : "s"}</span>
                      <span aria-hidden="true">·</span>
                      <span className={draft.confidence >= 80 ? "text-emerald-700" : "text-amber-700"}>{Math.round(draft.confidence)}% image confidence</span>
                      {image.scanDetected && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Receipt edges cleaned</span>
                        </>
                      )}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-7 sm:py-6">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_170px_120px_200px]">
                  <label className="block">
                    <span className="crm-eyebrow">Merchant</span>
                    <Input className="mt-2" value={draft.vendor} onChange={(event) => updateDraft({ vendor: event.target.value })} placeholder="Store or supplier" data-testid="input-receipt-vendor" />
                  </label>
                  <label className="block">
                    <span className="crm-eyebrow">Purchase date</span>
                    <Input className="mt-2" type="date" value={draft.expenseDate} onChange={(event) => updateDraft({ expenseDate: event.target.value })} data-testid="input-receipt-date" />
                  </label>
                  <label className="block">
                    <span className="crm-eyebrow">Purchase time</span>
                    <Input className="mt-2" type="time" value={draft.purchaseTime} onChange={(event) => updateDraft({ purchaseTime: event.target.value })} data-testid="input-receipt-time" />
                  </label>
                  <label className="block">
                    <span className="crm-eyebrow">Payment</span>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="mt-2"><SelectValue placeholder="Select method" /></SelectTrigger>
                      <SelectContent>{paymentMethods.map((method) => <SelectItem key={method} value={method}>{method}</SelectItem>)}</SelectContent>
                    </Select>
                  </label>
                </div>

                {visibleWarnings.length > 0 && (
                  <div className="mt-5 rounded-xl border border-amber-500/25 bg-amber-50/70 px-4 py-3 text-amber-950">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                      <div>
                        <div className="text-sm font-semibold">Check the highlighted details</div>
                        <ul className="mt-1 space-y-1 text-xs leading-5 text-amber-900/80">
                          {visibleWarnings.slice(0, 3).map((warning) => <li key={warning}>{warning}</li>)}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  {geminiStatus === "pending" && <LoaderCircle className="h-4 w-4 animate-spin text-primary" />}
                  {geminiStatus === "applied" && <Sparkles className="h-4 w-4 text-primary" />}
                  {geminiStatus === "fallback" && <ShieldCheck className="h-4 w-4 text-primary" />}
                  <span>
                    {geminiStatus === "pending"
                      ? "Completing the smart review automatically…"
                      : geminiStatus === "applied"
                        ? "Smart review applied from the locally redacted receipt."
                        : geminiStatus === "fallback"
                          ? "Local receipt review is available; smart review could not be completed."
                          : image.redactionCount > 0
                            ? `${image.redactionCount} sensitive payment line${image.redactionCount === 1 ? " was" : "s were"} redacted locally before automatic smart review.`
                            : "Receipt prepared for automatic smart review."}
                  </span>
                </div>

                <div className="mt-6 flex items-center justify-between gap-3">
                  <div>
                    <span className="crm-eyebrow">{geminiApplied ? "Gemini itemized expenses" : "Preliminary local read"}</span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {geminiApplied ? "Review the smart extraction and correct only highlighted values." : "Local OCR is a preliminary fallback while the automatic smart itemization finishes."}
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => updateDraft({ items: [...draft.items, newLine()] })}>
                    <Plus className="h-4 w-4" /> Add line
                  </Button>
                </div>

                <div className="mt-3 space-y-3">
                  {draft.items.map((item, index) => (
                    <div key={item.id} className={`rounded-xl border p-3 sm:p-4 ${item.confidence === "low" ? "border-amber-500/40 bg-amber-50/35" : "border-card-border bg-card"}`}>
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1.5fr)_160px_105px_42px] sm:items-end">
                        <label className="block min-w-0">
                          <span className="crm-eyebrow">Item {index + 1}</span>
                          <Input className="mt-2" value={item.itemName} onChange={(event) => updateItem(item.id, { itemName: event.target.value, confidence: "high" })} placeholder="Product or purchase" data-testid={`input-receipt-item-${index}`} />
                        </label>
                        <label className="block">
                          <span className="crm-eyebrow">Category</span>
                          <Select value={item.category} onValueChange={(value) => updateItem(item.id, { category: value as ReceiptExpenseCategory })}>
                            <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                            <SelectContent>{categories.map((category) => <SelectItem key={category.value} value={category.value}>{category.label}</SelectItem>)}</SelectContent>
                          </Select>
                        </label>
                        <label className="block">
                          <span className="crm-eyebrow">Line total</span>
                          <div className="relative mt-2">
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                            <Input className="pl-7 tabular-nums" inputMode="decimal" value={item.amount || ""} onChange={(event) => updateItem(item.id, { amount: numericInput(event.target.value), confidence: "high" })} />
                          </div>
                        </label>
                        <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => removeItem(item.id)} aria-label={`Remove item ${index + 1}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-card-border/55 pt-3 sm:max-w-md">
                        <label className="block">
                          <span className="crm-eyebrow">Quantity</span>
                          <Input className="mt-2" inputMode="decimal" value={item.quantity || ""} onChange={(event) => updateItem(item.id, { quantity: Math.max(0, numericInput(event.target.value)) })} />
                        </label>
                        <label className="block">
                          <span className="crm-eyebrow">SKU / product code</span>
                          <Input className="mt-2" value={item.productCode} onChange={(event) => updateItem(item.id, { productCode: event.target.value })} placeholder="If printed" />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid gap-4 rounded-xl border border-card-border bg-card p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div><div className="crm-eyebrow">Items</div><div className="mt-1 font-serif text-xl tabular-nums">{money(itemSubtotal)}</div></div>
                    <label><span className="crm-eyebrow">Tax</span><div className="relative mt-1"><span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span><Input className="h-9 pl-6 tabular-nums" inputMode="decimal" value={draft.tax || ""} onChange={(event) => updateDraft({ tax: numericInput(event.target.value) })} /></div></label>
                    <label><span className="crm-eyebrow">Receipt total</span><div className="relative mt-1"><span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span><Input className="h-9 pl-6 font-semibold tabular-nums" inputMode="decimal" value={draft.total || ""} onChange={(event) => updateDraft({ total: numericInput(event.target.value) })} data-testid="input-receipt-total" /></div></label>
                  </div>
                  <div className={`rounded-lg px-3 py-2 text-xs font-medium ${Math.abs(reconciliation) <= 0.01 ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
                    {Math.abs(reconciliation) <= 0.01 ? (
                      <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Receipt balances</span>
                    ) : (
                      <div>
                        <span>{money(Math.abs(reconciliation))} {reconciliation > 0 ? "not itemized" : "over total"}</span>
                        {reconciliation > 0 && <button type="button" className="ml-2 underline underline-offset-2" onClick={addDifferenceLine}>Add difference</button>}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="flex min-h-12 items-center justify-between rounded-xl border border-card-border bg-card px-4 text-sm font-medium">
                    Business use
                    <Switch checked={businessUse} onCheckedChange={setBusinessUse} />
                  </label>
                  <label className="flex min-h-12 items-center justify-between rounded-xl border border-card-border bg-card px-4 text-sm font-medium">
                    Reimbursable
                    <Switch checked={reimbursable} onCheckedChange={setReimbursable} />
                  </label>
                </div>
              </div>

              <div className="border-t border-card-border/70 bg-background/96 px-4 py-3 shadow-[0_-18px_42px_-34px_rgba(30,20,18,0.7)] backdrop-blur sm:px-7 sm:py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button className="min-h-12 flex-1" disabled={!canSaveItemized || importReceipt.isPending} onClick={() => void saveReceipt("itemized")} data-testid="button-save-itemized-receipt">
                    {importReceipt.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Save {draft.items.filter((item) => item.itemName.trim() && item.amount > 0).length} itemized expenses
                  </Button>
                  <Button variant="outline" className="min-h-12 sm:min-w-[240px]" disabled={!canSaveReceipt || importReceipt.isPending} onClick={() => void saveReceipt("combined")}>
                    <ReceiptText className="h-4 w-4" /> Keep as one expense
                  </Button>
                </div>
                <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                  <LockKeyhole className="h-3 w-3" /> Nothing enters the ledger until you save this review.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
