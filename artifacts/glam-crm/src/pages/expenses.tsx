import { Shell } from "@/components/layout/Shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  getListExpensesQueryKey,
  type Expense,
  useCreateExpense,
  useDeleteExpense,
  useListExpenses,
} from "@workspace/api-client-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Archive, CalendarDays, CircleDollarSign, ExternalLink, FileImage, PackagePlus, ReceiptText, Search, ShoppingBag, Wallet, X } from "lucide-react";
import { type InputHTMLAttributes, type Ref, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const expenseCategories = [
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
] as const;

type ExpenseCategory = (typeof expenseCategories)[number]["value"];

const itemSuggestions = [
  "Foundation restock",
  "Concealer restock",
  "Setting powder",
  "Lash adhesive",
  "Disposable mascara wands",
  "Brush cleaner",
  "Sanitizer and alcohol",
  "Hair spray",
  "Bobby pins",
  "Makeup sponges",
  "Cotton pads",
  "Travel kit supplies",
] as const;

const vendorSuggestions = [
  "Sephora",
  "Ulta Beauty",
  "Amazon",
  "Target",
  "Walmart",
  "CVS",
  "MAC Cosmetics",
  "Charlotte Tilbury",
  "Camera Ready Cosmetics",
  "Frends Beauty",
  "Nigel Beauty",
  "SalonCentric",
  "CosmoProf",
] as const;

const paymentMethodOptions = [
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
] as const;

type ExpenseSuggestionField = "itemName" | "vendor";

type SuggestedInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onBlur" | "onChange" | "value" | "ref"> & {
  inputRef: Ref<HTMLInputElement>;
  isOpen: boolean;
  onBlur: () => void;
  onOpenChange: (isOpen: boolean) => void;
  onValueChange: (value: string) => void;
  suggestions: readonly string[];
  testId: string;
  value: string;
};

function parseCurrencyInput(value: unknown) {
  if (typeof value === "number") return value;
  const cleaned = String(value ?? "")
    .replace(/[$,\s]/g, "")
    .replace(/[^\d.]/g, "");
  const [whole = "", ...fractionParts] = cleaned.split(".");
  const normalized = fractionParts.length > 0 ? `${whole}.${fractionParts.join("")}` : whole;
  return normalized ? Number(normalized) : Number.NaN;
}

function normalizeAmountTyping(value: string) {
  const cleaned = value.replace(/[$,\s]/g, "").replace(/[^\d.]/g, "");
  const [whole = "", ...fractionParts] = cleaned.split(".");
  const cents = fractionParts.join("").slice(0, 2);
  return fractionParts.length > 0 ? `${whole}.${cents}` : whole;
}

function formatAmountInput(value: unknown) {
  const amount = parseCurrencyInput(value);
  if (!Number.isFinite(amount)) return "";
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function visibleSuggestions(value: string, suggestions: readonly string[]) {
  const query = value.trim().toLowerCase();
  const matches = query
    ? suggestions.filter((suggestion) => suggestion.toLowerCase().includes(query))
    : suggestions;

  return matches
    .filter((suggestion) => suggestion.toLowerCase() !== query)
    .slice(0, 6);
}

function SuggestedInput({
  inputRef,
  isOpen,
  onBlur,
  onOpenChange,
  onValueChange,
  suggestions,
  testId,
  value,
  ...inputProps
}: SuggestedInputProps) {
  const matches = visibleSuggestions(value, suggestions);
  const suggestionsId = `${testId}-suggestions`;

  return (
    <div className="relative">
      <Input
        {...inputProps}
        ref={inputRef}
        autoComplete="off"
        value={value}
        onChange={(event) => {
          onValueChange(event.target.value);
          onOpenChange(true);
        }}
        onFocus={() => onOpenChange(true)}
        onBlur={() => {
          onBlur();
          window.setTimeout(() => onOpenChange(false), 100);
        }}
        aria-autocomplete="list"
        aria-controls={suggestionsId}
        aria-expanded={isOpen && matches.length > 0}
        data-testid={testId}
      />
      {isOpen && matches.length > 0 && (
        <ul
          id={suggestionsId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 max-h-56 overflow-auto rounded-xl border border-card-border bg-card p-1 text-sm shadow-[0_20px_45px_-28px_var(--elevate-3),0_1px_0_0_hsl(var(--card-border)/0.5)]"
          data-testid={suggestionsId}
        >
          {matches.map((suggestion) => (
            <li key={suggestion} role="option" aria-selected={false}>
              <button
                type="button"
                className="block w-full rounded-lg px-3 py-2 text-left text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:outline-none"
                onMouseDown={(event) => {
                  event.preventDefault();
                  onValueChange(suggestion);
                  onOpenChange(false);
                }}
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const expenseFormSchema = z.object({
  itemName: z.string().min(1, "Item is required"),
  category: z.enum(expenseCategories.map((category) => category.value) as [ExpenseCategory, ...ExpenseCategory[]]),
  amount: z.string().refine((value) => parseCurrencyInput(value) >= 0.01, "Amount must be greater than zero"),
  expenseDate: z.string().min(1, "Date is required"),
  vendor: z.string().optional(),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
  receiptDataUrl: z.string().optional(),
  receiptFileName: z.string().optional(),
  businessUse: z.boolean(),
  reimbursable: z.boolean(),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(value: number) {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function categoryLabel(value: string) {
  return expenseCategories.find((category) => category.value === value)?.label ?? value;
}

function isCurrentMonth(value: string) {
  const now = new Date();
  const date = new Date(`${value}T00:00:00`);
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function isCurrentYear(value: string) {
  return new Date(`${value}T00:00:00`).getFullYear() === new Date().getFullYear();
}

export default function ExpensesPage() {
  const { data: expenses = [], isLoading } = useListExpenses();
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | "all">("all");
  const [openSuggestionField, setOpenSuggestionField] = useState<ExpenseSuggestionField | null>(null);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      itemName: "",
      category: "makeup_products",
      amount: "",
      expenseDate: todayDate(),
      vendor: "",
      paymentMethod: "",
      notes: "",
      receiptDataUrl: "",
      receiptFileName: "",
      businessUse: true,
      reimbursable: false,
    },
  });
  const receiptFileName = form.watch("receiptFileName");
  const receiptDataUrl = form.watch("receiptDataUrl");

  const activeExpenses = expenses.filter((expense) => expense.active);
  const filteredExpenses = activeExpenses.filter((expense) => {
    const haystack = [
      expense.itemName,
      categoryLabel(expense.category),
      expense.vendor,
      expense.paymentMethod,
      expense.notes,
    ].join(" ").toLowerCase();
    return (
      (categoryFilter === "all" || expense.category === categoryFilter) &&
      (!search || haystack.includes(search.toLowerCase()))
    );
  });

  const summary = useMemo(() => {
    const total = activeExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const month = activeExpenses.filter((expense) => isCurrentMonth(expense.expenseDate)).reduce((sum, expense) => sum + expense.amount, 0);
    const year = activeExpenses.filter((expense) => isCurrentYear(expense.expenseDate)).reduce((sum, expense) => sum + expense.amount, 0);
    const reimbursable = activeExpenses.filter((expense) => expense.reimbursable).reduce((sum, expense) => sum + expense.amount, 0);
    const categoryTotals = expenseCategories.map((category) => ({
      ...category,
      amount: activeExpenses
        .filter((expense) => expense.category === category.value)
        .reduce((sum, expense) => sum + expense.amount, 0),
    })).filter((category) => category.amount > 0);
    const topCategory = categoryTotals.sort((a, b) => b.amount - a.amount)[0];
    return { total, month, year, reimbursable, categoryTotals, topCategory };
  }, [activeExpenses]);

  function invalidateExpenses() {
    queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
  }

  function onSubmit(data: ExpenseFormValues) {
    createExpense.mutate(
      {
        data: {
          ...data,
          amount: parseCurrencyInput(data.amount),
          vendor: data.vendor || undefined,
          paymentMethod: data.paymentMethod || undefined,
          notes: data.notes || undefined,
          receiptDataUrl: data.receiptDataUrl || undefined,
          receiptFileName: data.receiptFileName || undefined,
        },
      },
      {
        onSuccess: () => {
          invalidateExpenses();
          form.reset({
            itemName: "",
            category: "makeup_products",
            amount: "",
            expenseDate: todayDate(),
            vendor: "",
            paymentMethod: "",
            notes: "",
            receiptDataUrl: "",
            receiptFileName: "",
            businessUse: true,
            reimbursable: false,
          });
          toast({ title: "Expense recorded" });
        },
        onError: () => {
          toast({ title: "Failed to record expense", variant: "destructive" });
        },
      },
    );
  }

  function handleReceiptFile(file?: File | null) {
    if (!file) return;

    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast({ title: "Receipt is too large", description: "Use an image, scan, or PDF under 5 MB.", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      form.setValue("receiptDataUrl", reader.result, { shouldDirty: true });
      form.setValue("receiptFileName", file.name, { shouldDirty: true });
    };
    reader.onerror = () => {
      toast({ title: "Could not read receipt", variant: "destructive" });
    };
    reader.readAsDataURL(file);
  }

  function clearReceipt() {
    form.setValue("receiptDataUrl", "", { shouldDirty: true });
    form.setValue("receiptFileName", "", { shouldDirty: true });
  }

  function archiveExpense(expense: Expense) {
    deleteExpense.mutate(
      { id: expense.id },
      {
        onSuccess: () => {
          invalidateExpenses();
          toast({ title: "Expense archived" });
        },
        onError: () => {
          toast({ title: "Failed to archive expense", variant: "destructive" });
        },
      },
    );
  }

  return (
    <Shell>
      <div className="space-y-7">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="crm-eyebrow">Studio · Spend</span>
            <h1 className="crm-page-title mt-2">Expenses</h1>
            <p className="crm-page-subtitle">
              Track products, tools, disposables, software, and other costs that affect studio profit.
            </p>
            <div className="crm-gold-rule mt-6 w-24" />
          </div>
          <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-card-border bg-card text-sm shadow-[0_1px_0_0_hsl(var(--card-border)/0.4),0_10px_28px_-22px_var(--elevate-3)]">
            <ExpenseStat label="This month" value={formatMoney(summary.month)} />
            <ExpenseStat label="Year to date" value={formatMoney(summary.year)} muted />
            <ExpenseStat label="Total" value={formatMoney(summary.total)} muted last />
          </div>
        </header>

        <section className="crm-section overflow-hidden">
          <div className="border-b border-card-border/70 px-5 py-5 sm:px-6">
            <span className="crm-eyebrow">Ledger · Add</span>
            <h2 className="crm-section-title mt-1">Record an expense</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Capture enough detail for monthly review, taxes, and pricing decisions without slowing down entry.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 p-5 sm:p-6 xl:grid-cols-[minmax(180px,1.2fr)_170px_120px_150px_minmax(180px,1fr)] xl:items-start">
              <FormField
                control={form.control}
                name="itemName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item</FormLabel>
                    <FormControl>
                      <SuggestedInput
                        inputRef={field.ref}
                        isOpen={openSuggestionField === "itemName"}
                        name={field.name}
                        onBlur={field.onBlur}
                        onOpenChange={(isOpen) => setOpenSuggestionField((current) => {
                          if (isOpen) return "itemName";
                          return current === "itemName" ? null : current;
                        })}
                        onValueChange={field.onChange}
                        placeholder="Foundation restock"
                        suggestions={itemSuggestions}
                        testId="input-expense-item"
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-expense-category">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {expenseCategories.map((category) => (
                          <SelectItem key={category.value} value={category.value}>{category.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          className="pl-7 tabular-nums"
                          value={typeof field.value === "string" ? field.value : typeof field.value === "number" ? String(field.value) : ""}
                          onChange={(event) => field.onChange(normalizeAmountTyping(event.target.value))}
                          onFocus={(event) => field.onChange(event.target.value.replace(/,/g, ""))}
                          onBlur={(event) => {
                            field.onBlur();
                            field.onChange(formatAmountInput(event.target.value));
                          }}
                          name={field.name}
                          ref={field.ref}
                          data-testid="input-expense-amount"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expenseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-expense-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vendor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor</FormLabel>
                    <FormControl>
                      <SuggestedInput
                        inputRef={field.ref}
                        isOpen={openSuggestionField === "vendor"}
                        name={field.name}
                        onBlur={field.onBlur}
                        onOpenChange={(isOpen) => setOpenSuggestionField((current) => {
                          if (isOpen) return "vendor";
                          return current === "vendor" ? null : current;
                        })}
                        onValueChange={field.onChange}
                        placeholder="Sephora, Ulta, Amazon, pro supplier"
                        suggestions={vendorSuggestions}
                        testId="input-expense-vendor"
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem className="xl:col-span-2">
                    <FormLabel>Payment method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-expense-payment-method">
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {paymentMethodOptions.map((method) => (
                          <SelectItem key={method} value={method}>{method}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="xl:col-span-2">
                <span className="crm-eyebrow">Receipt scan</span>
                <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-dashed border-input bg-card px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/45 hover:text-foreground">
                  <FileImage className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                  <span className="min-w-0 flex-1 truncate">
                    {receiptFileName || "Upload receipt photo, scan, or PDF"}
                  </span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="sr-only"
                    data-testid="input-expense-receipt-file"
                    onChange={(event) => handleReceiptFile(event.target.files?.[0])}
                  />
                </label>
                {receiptDataUrl && (
                  <button
                    type="button"
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                    onClick={clearReceipt}
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Remove receipt
                  </button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:col-span-2">
                <FormField
                  control={form.control}
                  name="businessUse"
                  render={({ field }) => (
                    <FormItem className="flex min-h-11 items-center justify-between rounded-lg border border-card-border bg-card px-3 py-2">
                      <FormLabel className="m-0 text-xs font-medium">Business use</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reimbursable"
                  render={({ field }) => (
                    <FormItem className="flex min-h-11 items-center justify-between rounded-lg border border-card-border bg-card px-3 py-2">
                      <FormLabel className="m-0 text-xs font-medium">Reimbursable</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="xl:col-span-4">
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder="Shade range, kit use, client reimbursement, tax note..." {...field} data-testid="textarea-expense-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button className="xl:self-end" disabled={createExpense.isPending} data-testid="button-create-expense">
                <PackagePlus className="h-4 w-4" />
                Add expense
              </Button>
            </form>
          </Form>
        </section>

        <div className="grid gap-5 xl:grid-cols-[0.75fr_1.25fr]">
          <section className="crm-section p-5 sm:p-6">
            <div className="mb-5">
              <span className="crm-eyebrow">Cost mix</span>
              <h2 className="crm-section-title mt-1">Category breakdown</h2>
              <p className="mt-1 text-sm text-muted-foreground">Which parts of the kit and studio are consuming cash.</p>
            </div>
            {isLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : summary.categoryTotals.length > 0 ? (
              <div className="space-y-4">
                {summary.categoryTotals.map((category) => {
                  const width = summary.topCategory ? Math.max(8, (category.amount / summary.topCategory.amount) * 100) : 0;
                  return (
                    <button
                      key={category.value}
                      type="button"
                      onClick={() => setCategoryFilter(category.value)}
                      className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-left"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="truncate font-medium text-foreground">{category.label}</span>
                          <span className="font-serif text-base text-foreground tabular-nums" style={{ fontVariationSettings: "'opsz' 48" }}>
                            {formatMoney(category.amount)}
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <EmptyExpenseState title="No expense mix yet" detail="Add an expense to see where your operating costs land." />
            )}
          </section>

          <section className="crm-section overflow-hidden">
            <div className="border-b border-card-border/70 px-5 py-5 sm:px-6">
              <div className="grid gap-3 lg:grid-cols-[1fr_220px] lg:items-end">
                <label className="block min-w-0">
                  <span className="crm-eyebrow">Search</span>
                  <div className="mt-2 flex min-h-11 items-center rounded-lg border border-input bg-card px-3.5 shadow-[inset_0_1px_0_0_hsl(var(--card-border)/0.4)] transition-[border-color,box-shadow] duration-200 focus-within:border-primary/55 focus-within:ring-2 focus-within:ring-primary/30">
                    <Search className="mr-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search item, vendor, notes..."
                      className="min-w-0 flex-1 bg-transparent p-0 text-sm text-foreground outline-none placeholder:text-muted-foreground/80"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      data-testid="input-search-expenses"
                    />
                  </div>
                </label>
                <label className="block">
                  <span className="crm-eyebrow">Category</span>
                  <Select onValueChange={(value) => setCategoryFilter(value as ExpenseCategory | "all")} value={categoryFilter}>
                    <SelectTrigger className="mt-2" data-testid="select-expense-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {expenseCategories.map((category) => (
                        <SelectItem key={category.value} value={category.value}>{category.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-3 p-6">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : filteredExpenses.length > 0 ? (
              <ul className="divide-y divide-card-border/55">
                {filteredExpenses.map((expense) => (
                  <ExpenseRow
                    key={expense.id}
                    expense={expense}
                    onArchive={() => archiveExpense(expense)}
                    archiving={deleteExpense.isPending}
                  />
                ))}
              </ul>
            ) : (
              <EmptyExpenseState
                title={search || categoryFilter !== "all" ? "No matching expenses" : "No expenses yet"}
                detail={search || categoryFilter !== "all" ? "Adjust search or category filters." : "Record product and operating costs to build the ledger."}
              />
            )}
          </section>
        </div>
      </div>
    </Shell>
  );
}

function ExpenseStat({ label, value, muted = false, last = false }: { label: string; value: string; muted?: boolean; last?: boolean }) {
  return (
    <div className={`px-4 py-3 ${last ? "" : "border-r border-card-border/70"}`}>
      <div className="crm-eyebrow !text-[10px]">{label}</div>
      <div
        className={`mt-1 font-serif text-xl tabular-nums ${muted ? "text-muted-foreground" : "text-foreground"}`}
        style={{ fontVariationSettings: "'opsz' 64", letterSpacing: "-0.02em" }}
      >
        {value}
      </div>
    </div>
  );
}

function ExpenseRow({ expense, onArchive, archiving }: { expense: Expense; onArchive: () => void; archiving: boolean }) {
  return (
    <li className="grid gap-3 px-5 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_180px_150px_104px] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-[1.0125rem] font-semibold tracking-tight text-foreground">{expense.itemName}</h3>
          <Badge variant="outline" className="!normal-case !tracking-tight">{categoryLabel(expense.category)}</Badge>
          {expense.reimbursable && <Badge variant="outline" className="border-primary/25 bg-primary/8 text-primary">Reimbursable</Badge>}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[12.5px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatDate(expense.expenseDate)}
          </span>
          {expense.vendor && (
            <span className="inline-flex items-center gap-1.5">
              <ShoppingBag className="h-3.5 w-3.5" />
              {expense.vendor}
            </span>
          )}
          {expense.paymentMethod && <span>{expense.paymentMethod}</span>}
          {expense.receiptDataUrl && (
            <a
              href={expense.receiptDataUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {expense.receiptFileName || "Open receipt"}
            </a>
          )}
        </div>
        {expense.notes && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{expense.notes}</p>}
      </div>
      <div className="font-serif text-2xl text-foreground tabular-nums lg:text-right" style={{ fontVariationSettings: "'opsz' 80", letterSpacing: "-0.03em" }}>
        {formatMoney(expense.amount)}
      </div>
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
        {expense.businessUse ? <Wallet className="h-4 w-4" /> : <CircleDollarSign className="h-4 w-4" />}
        {expense.businessUse ? "Business" : "Personal"}
      </div>
      <Button variant="outline" size="sm" onClick={onArchive} disabled={archiving} data-testid={`button-archive-expense-${expense.id}`}>
        <Archive className="h-4 w-4" />
        Archive
      </Button>
    </li>
  );
}

function EmptyExpenseState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center px-8 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-card-border bg-accent/50 text-foreground/70">
        <ReceiptText className="h-5 w-5" strokeWidth={1.5} />
      </div>
      <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}
