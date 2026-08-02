export type ReceiptExpenseCategory =
  | "makeup_products"
  | "hair_products"
  | "tools_equipment"
  | "disposables"
  | "travel"
  | "education"
  | "marketing"
  | "software"
  | "studio_supplies"
  | "other";

export type ReceiptLineDraft = {
  id: string;
  itemName: string;
  category: ReceiptExpenseCategory;
  amount: number;
  quantity: number;
  productCode: string;
  confidence: "high" | "medium" | "low";
  sourceLine: string;
};

export type ReceiptDraft = {
  vendor: string;
  expenseDate: string;
  purchaseTime: string;
  paymentMethod: string;
  subtotal: number;
  tax: number;
  total: number;
  confidence: number;
  rawText: string;
  items: ReceiptLineDraft[];
  warnings: string[];
};

export type ReceiptImage = {
  dataUrl: string;
  ocrSections: string[];
  fallbackOcrSections: string[];
  metadataOcrDataUrl: string;
  fileName: string;
  previewUrl: string;
  scanDetected: boolean;
  geminiDataUrls: string[];
  redactionCount: number;
};

export type OcrProgress = {
  label: string;
  progress: number;
};

const subtotalPattern = /\b(?:sub[-\s]*total|s[-\s]*total|su[bs]s?[-\s]*total|btotal)\b/i;
const summaryLinePattern = /\b((?:sub[-\s]*|s[-\s]*|[b])?total|su[bs]s?[-\s]*total|tax|gst|pst|hst|change|cash|credit|debit|visa|mastercard|amex|discover|balance|tender|payment|amount due|amount paid|tip|savings?|usd)\b/i;
const ignoredLinePattern = /\b(thank|receipt|return policy|www\.|http|cashier|register|transaction|approval|auth|store hours|customer copy|phone|tel\b|pro\s+xtra|member(?:ship)?|year\s+to\s+date|annual\s+spend|uspg|credit\s+card|card\s+num|entry\s+emv|terminal|reference|\bid\s*#?)\b/i;
const addressPattern = /\b(street|st\.|avenue|ave\.|road|rd\.|boulevard|blvd\.|drive|dr\.|suite|zip)\b/i;

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `receipt-line-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function parseMoney(value: string | undefined) {
  if (!value) return Number.NaN;
  const negative = /^\s*-/.test(value) || /\(.*\)/.test(value);
  const numeric = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(numeric) ? roundMoney(negative ? -numeric : numeric) : Number.NaN;
}

function moneyAtEnd(line: string) {
  const match = line.match(/(?:^|\s)(-?\(?\$?\s*\d{1,5}(?:,\d{3})*(?:\.\d{2})\)?)[A-Z]?\s*$/i);
  if (!match) return null;
  const amount = parseMoney(match[1]);
  if (!Number.isFinite(amount)) return null;
  return { amount, value: match[1], index: match.index ?? 0 };
}

function isoDate(year: number, month: number, day: number) {
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) return "";
  const earliest = Date.UTC(1990, 0, 1);
  const latest = Date.now() + 2 * 24 * 60 * 60 * 1000;
  if (candidate.getTime() < earliest || candidate.getTime() > latest) return "";
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function findReceiptDate(lines: string[]) {
  const monthNames: Record<string, number> = {
    jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
    may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9,
    sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
  };

  for (const line of lines) {
    const dateReadableLine = line.replace(/[Oo]/g, "0").replace(/[Il]/g, "1");
    const numeric = dateReadableLine.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/) ??
      dateReadableLine.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2}|\d{2})\b/);
    if (numeric) {
      if (numeric[1].length === 4) return isoDate(Number(numeric[1]), Number(numeric[2]), Number(numeric[3]));
      const year = Number(numeric[3]) < 100 ? 2000 + Number(numeric[3]) : Number(numeric[3]);
      return isoDate(year, Number(numeric[1]), Number(numeric[2]));
    }

    const named = dateReadableLine.match(/\b(January|February|March|April|May|June|July|August|September|Sept|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(20\d{2})\b/i);
    if (named) return isoDate(Number(named[3]), monthNames[named[1].toLowerCase()], Number(named[2]));
  }
  return "";
}

function findReceiptTime(lines: string[]) {
  for (const line of lines) {
    const twelveHour = line.match(/\b(0?[1-9]|1[0-2])[:.]([0-5]\d)\s*(AM|PM)\b/i);
    if (twelveHour) {
      let hour = Number(twelveHour[1]) % 12;
      if (twelveHour[3].toUpperCase() === "PM") hour += 12;
      return `${hour.toString().padStart(2, "0")}:${twelveHour[2]}`;
    }
    const twentyFourHour = line.match(/\b([01]\d|2[0-3]):([0-5]\d)\b/);
    if (twentyFourHour) return `${twentyFourHour[1]}:${twentyFourHour[2]}`;
  }
  return "";
}

function findReceiptPaymentMethod(lines: string[]) {
  const text = lines.join(" ").toLowerCase();
  if (/\b(venmo)\b/.test(text)) return "Venmo";
  if (/\b(zelle)\b/.test(text)) return "Zelle";
  if (/\b(paypal)\b/.test(text)) return "PayPal";
  if (/bank\s+transfer|ach/.test(text)) return "Bank transfer";
  if (/\b(check|cheque)\b/.test(text)) return "Check";
  if (/\b(cash|tender\s+cash|change\s+due)\b/.test(text)) return "Cash";
  if (/\b(visa|mastercard|amex|american\s+express|discover|credit\s+card|debit\s+card|contactless|entry\s+emv)\b/.test(text)) return "Credit/debit card";
  return "";
}

function titleCase(value: string) {
  const normalized = value.replace(/[_|]+/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (/[a-z]/.test(normalized)) return normalized;
  return normalized.toLowerCase().replace(/\b\w/g, (character) => character.toUpperCase());
}

function findVendor(lines: string[]) {
  const joined = lines.join(" ");
  const knownVendor = [
    { pattern: /\b(?:the\s+)?home\s*depot\b|\bhow\s+doers\s+get\s+more\s+done\b|\bpro\s+xtra\b/i, name: "Home Depot" },
    { pattern: /\bwall\s*[- ]?mart(?:\s*[- ]?superstore)?\b/i, name: "Walmart" },
    { pattern: /\bsuper(?:store|siore)\b/i, name: "Superstore" },
    { pattern: /\bgrocery\s+depot\b/i, name: "Grocery Depot" },
    { pattern: /\bgrocery\s+mart\b/i, name: "Grocery Mart" },
    { pattern: /\btexas\s+roadhouse\b/i, name: "Texas Roadhouse" },
    { pattern: /\bcircle\s*k\b/i, name: "Circle K" },
    { pattern: /\bulta(?:\s+beauty)?\b/i, name: "Ulta Beauty" },
    { pattern: /\bsephora\b/i, name: "Sephora" },
  ].find(({ pattern }) => pattern.test(joined));
  if (knownVendor) return knownVendor.name;

  const candidate = lines.slice(0, 10).find((line) => {
    const letters = (line.match(/[A-Za-z]/g) ?? []).length;
    return letters >= 3 && !moneyAtEnd(line) && !ignoredLinePattern.test(line) && !addressPattern.test(line) && !findReceiptDate([line]);
  });
  return titleCase(candidate ?? "");
}

function inferCategory(itemName: string): ReceiptExpenseCategory {
  const value = itemName.toLowerCase();
  if (/foundation|concealer|powder|blush|bronzer|mascara|lip|liner|brow|shadow|palette|primer|makeup|cosmetic/.test(value)) return "makeup_products";
  if (/hair|spray|shampoo|conditioner|gel|mousse|curl|bobby|pin|comb/.test(value)) return "hair_products";
  if (/brush|dryer|iron|curler|mirror|light|tripod|case|kit|tool|equipment/.test(value)) return "tools_equipment";
  if (/wipe|cotton|sponge|wand|tissue|glove|applicator|disposable|sanitizer|alcohol/.test(value)) return "disposables";
  if (/gas|fuel|parking|toll|train|uber|lyft|travel/.test(value)) return "travel";
  if (/class|course|workshop|education|book|training/.test(value)) return "education";
  if (/ad\b|advert|marketing|print|business card|flyer/.test(value)) return "marketing";
  if (/subscription|software|app\b|cloud|domain|hosting/.test(value)) return "software";
  if (/cleaner|paper|label|storage|shelf|studio|office/.test(value)) return "studio_supplies";
  return "other";
}

function findSummaryAmount(lines: string[], pattern: RegExp, exclude?: RegExp) {
  for (const line of [...lines].reverse()) {
    if (!pattern.test(line) || (exclude && exclude.test(line))) continue;
    const money = moneyAtEnd(line);
    if (money && money.amount >= 0) return { found: true, amount: money.amount };
  }
  return { found: false, amount: 0 };
}

function sumSummaryAmounts(lines: string[], pattern: RegExp, exclude?: RegExp) {
  const seen = new Set<string>();
  let found = false;
  let amount = 0;
  for (const line of lines) {
    if (!pattern.test(line) || (exclude && exclude.test(line))) continue;
    const normalized = line.toLowerCase().replace(/\s+/g, " ").trim();
    if (seen.has(normalized)) continue;
    const money = moneyAtEnd(line);
    if (!money || money.amount < 0) continue;
    seen.add(normalized);
    found = true;
    amount = roundMoney(amount + money.amount);
  }
  return { found, amount };
}

function parseProductCode(description: string) {
  const explicit = description.match(/^(?:SKU|UPC|ITEM)\s*[:#-]?\s*([A-Z0-9][A-Z0-9-]{3,19})\s+(.+)$/i);
  const leading = description.match(/^([A-Z0-9][A-Z0-9-]{4,15})\s+(.+)$/i);
  const match = explicit ?? leading;
  if (
    !match ||
    /^\d{1,2}$/.test(match[1]) ||
    /[/.]/.test(match[1]) ||
    (!explicit && !/\d/.test(match[1]))
  ) {
    return { productCode: "", itemName: description };
  }
  return { productCode: match[1], itemName: match[2] };
}

function parseQuantity(description: string) {
  const match = description.match(/^(\d+(?:\.\d+)?)\s*[x@]\s*\$?\d+(?:\.\d{2})?\s+(.+)$/i);
  if (match) return { quantity: Math.max(0.01, Number(match[1])), itemName: match[2] };
  const leading = description.match(/^(\d{1,3})\s+([A-Za-z].+)$/);
  if (leading) return { quantity: Math.max(1, Number(leading[1])), itemName: leading[2] };
  return { quantity: 1, itemName: description };
}

function parseStructuredRetailItems(lines: string[]) {
  const items: ReceiptLineDraft[] = [];
  const consumed = new Set<number>();

  const quantityDetails = (line: string) => {
    const match = line.match(/^(\d+(?:\.\d+)?)\s*[@x]\s*\$?(\d+(?:\.\d{1,2})?)\s+\$?(\d{1,5}(?:,\d{3})*(?:\.\d{2}))[A-Z]?\s*$/i) ??
      line.match(/^(\d{1,2})8(\d{1,3}\.\d{2})\s+\$?(\d{1,5}(?:,\d{3})*(?:\.\d{2}))[A-Z]?\s*$/i);
    return match ? { quantity: Number(match[1]), amount: parseMoney(match[3]) } : null;
  };
  const cleanDescription = (value: string) => titleCase(
    value.replace(/\s+<[^>»]*[>»]?\s*$/i, "").replace(/[-~\\]+$/g, "").trim(),
  );
  const isDescription = (line: string | undefined) => Boolean(
    line && !summaryLinePattern.test(line) && !ignoredLinePattern.test(line) &&
    !findReceiptDate([line]) && !/^[0-9][0-9-]{7,16}\s+/.test(line) && !moneyAtEnd(line),
  );

  for (let index = 0; index < lines.length - 2; index += 1) {
    const headerMoney = moneyAtEnd(lines[index]);
    const header = headerMoney ? lines[index].slice(0, headerMoney.index).trim() : lines[index];
    const sku = header.match(/^([0-9][0-9-]{7,16})\s+(.+?)(?:\s+<[A-Z, ]+>)?$/i);
    if (!sku || summaryLinePattern.test(lines[index])) continue;

    const descriptionLine = lines[index + 1];
    const quantityLine = lines[index + 2];
    const nextQuantity = quantityDetails(descriptionLine);
    const followingQuantity = quantityDetails(quantityLine);
    const followingAmount = moneyAtEnd(quantityLine);
    let itemName = cleanDescription(sku[2]);
    let amount = Number.NaN;
    let quantity = 1;
    let lastConsumed = index;

    if (headerMoney && headerMoney.amount > 0) {
      amount = headerMoney.amount;
      if (isDescription(descriptionLine)) {
        itemName = cleanDescription(descriptionLine);
        lastConsumed = index + 1;
      }
    } else if (nextQuantity) {
      amount = nextQuantity.amount;
      quantity = nextQuantity.quantity;
      lastConsumed = index + 1;
    } else if (isDescription(descriptionLine) && followingQuantity) {
      itemName = cleanDescription(descriptionLine);
      amount = followingQuantity.amount;
      quantity = followingQuantity.quantity;
      lastConsumed = index + 2;
    } else if (isDescription(descriptionLine) && followingAmount && followingAmount.amount > 0) {
      itemName = cleanDescription(descriptionLine);
      amount = followingAmount.amount;
      lastConsumed = index + 2;
    }

    if (!itemName || !Number.isFinite(amount) || amount <= 0) continue;

    // Retail discounts are often printed on a separate line immediately after
    // the affected item. Fold them into the positive ledger line so the receipt
    // can still reconcile with APIs that correctly reject negative expenses.
    for (let offset = lastConsumed + 1; offset < Math.min(lines.length, lastConsumed + 5); offset += 1) {
      if (/^[0-9][0-9-]{7,16}\s+/.test(lines[offset]) || /\bsub\s*total\b/i.test(lines[offset])) break;
      const adjustment = moneyAtEnd(lines[offset]);
      if (adjustment && adjustment.amount < 0 && amount + adjustment.amount > 0) {
        amount = roundMoney(amount + adjustment.amount);
        consumed.add(offset);
      }
    }

    items.push({
      id: makeId(),
      itemName,
      category: inferCategory(itemName),
      amount,
      quantity: Math.max(0.01, quantity),
      productCode: sku[1],
      confidence: "high",
      sourceLine: lines.slice(index, lastConsumed + 1).join(" | "),
    });
    for (let consumedIndex = index; consumedIndex <= lastConsumed; consumedIndex += 1) consumed.add(consumedIndex);
    index = lastConsumed;
  }

  return { items, consumed };
}

export function parseReceiptText(rawText: string, confidence = 0): ReceiptDraft {
  const lines = rawText
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/[\t|]+/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const vendor = findVendor(lines);
  const expenseDate = findReceiptDate(lines);
  const purchaseTime = findReceiptTime(lines);
  const paymentMethod = findReceiptPaymentMethod(lines);
  const zeroAmountLines = lines.filter((line) => {
    const money = moneyAtEnd(line);
    return money?.amount === 0 || /(?:^|\s)\$?\s*[0O][.,]\s*[0O]{2}[A-Z]?\s*$/i.test(line);
  }).length;
  const subtotalResult = findSummaryAmount(lines, subtotalPattern);
  const taxResult = sumSummaryAmounts(lines, /\b(?:sales\s+tax|tax\s*\d*|gst|pst|hst)\b/i, /\b(?:total|exempt)\b/i);
  const explicitTotalResult = findSummaryAmount(
    lines,
    /\b(?:grand\s+total|total|amount due|balance due)\b/i,
    subtotalPattern,
  );
  const subtotal = subtotalResult.amount;
  const tax = taxResult.amount;

  const structured = parseStructuredRetailItems(lines);
  const items: ReceiptLineDraft[] = [...structured.items];
  for (const [lineIndex, line] of lines.entries()) {
    if (structured.consumed.has(lineIndex)) continue;
    if (summaryLinePattern.test(line) || ignoredLinePattern.test(line) || addressPattern.test(line) || findReceiptDate([line])) continue;
    const money = moneyAtEnd(line);
    if (!money || money.amount <= 0 || money.amount > 100_000) continue;

    let description = line.slice(0, money.index).replace(/[-:.·]+$/g, "").trim();
    if (description.length < 2 || /^\d+$/.test(description)) continue;
    const quantity = parseQuantity(description);
    const product = parseProductCode(quantity.itemName);
    description = titleCase(product.itemName.replace(/\b(?:ea|each)\b$/i, ""));
    if (!description) continue;

    items.push({
      id: makeId(),
      itemName: description,
      category: inferCategory(description),
      amount: money.amount,
      quantity: quantity.quantity,
      productCode: product.productCode,
      confidence: product.productCode || description.length >= 5 ? "high" : "medium",
      sourceLine: line,
    });
    if (items.length >= 50) break;
  }

  const seenItems = new Set<string>();
  const deduplicatedItems = items.filter((item) => {
    const normalizedCode = item.productCode.replace(/[^A-Z0-9]/gi, "").toLowerCase();
    const normalizedName = item.itemName.replace(/[^A-Z0-9]/gi, "").toLowerCase();
    const key = normalizedCode ? `code:${normalizedCode}` : `item:${normalizedName}:${item.amount.toFixed(2)}`;
    if (seenItems.has(key)) return false;
    seenItems.add(key);
    return true;
  });
  items.splice(0, items.length, ...deduplicatedItems);

  const warnings: string[] = [];
  let detectedItemsTotal = roundMoney(items.reduce((sum, item) => sum + item.amount, 0));

  if (subtotalResult.found && subtotal > 0 && detectedItemsTotal - subtotal > 0.01 && items.length > 0) {
    const discount = roundMoney(detectedItemsTotal - subtotal);
    let remainingSubtotal = subtotal;
    items.forEach((item, index) => {
      const adjustedAmount = index === items.length - 1
        ? remainingSubtotal
        : roundMoney((item.amount / detectedItemsTotal) * subtotal);
      item.amount = Math.max(0.01, adjustedAmount);
      item.confidence = "low";
      remainingSubtotal = roundMoney(remainingSubtotal - item.amount);
    });
    detectedItemsTotal = roundMoney(items.reduce((sum, item) => sum + item.amount, 0));
    warnings.push(`$${discount.toFixed(2)} in receipt discounts was allocated across the product lines. Review the highlighted amounts.`);
  }

  let total = explicitTotalResult.found
    ? explicitTotalResult.amount
    : subtotalResult.found
      ? roundMoney(subtotal + tax)
      : detectedItemsTotal;
  const explicitZeroReceipt = explicitTotalResult.found && explicitTotalResult.amount === 0 && zeroAmountLines >= 3;
  const calculatedSummaryTotal = roundMoney(subtotal + tax);
  if (
    !explicitZeroReceipt && explicitTotalResult.found && subtotalResult.found && taxResult.found &&
    total + 0.01 < subtotal && calculatedSummaryTotal > total
  ) {
    warnings.push("The printed total was less than its subtotal, so subtotal plus tax was used. Review the highlighted total.");
    total = calculatedSummaryTotal;
  }
  const expectedPretax = subtotalResult.found ? subtotal : Math.max(0, roundMoney(total - tax));

  const likelyZeroReceipt = explicitZeroReceipt || explicitTotalResult.found && total === 0 ||
    !explicitTotalResult.found && !subtotalResult.found && zeroAmountLines >= 3;
  if (likelyZeroReceipt) {
    items.splice(0, items.length);
    detectedItemsTotal = 0;
    total = 0;
    warnings.push("This receipt totals $0.00, so it cannot create a positive expense.");
  }

  if (!likelyZeroReceipt && items.length === 0 && total > 0) {
    items.push({
      id: makeId(),
      itemName: vendor ? `${vendor} purchase` : "Receipt purchase",
      category: "other",
      amount: Math.max(0.01, expectedPretax || total),
      quantity: 1,
      productCode: "",
      confidence: "low",
      sourceLine: "",
    });
    warnings.push("Individual products were not clear enough to separate. Review this combined line before saving.");
  } else if (!likelyZeroReceipt && expectedPretax - detectedItemsTotal > 0.01) {
    const difference = roundMoney(expectedPretax - detectedItemsTotal);
    items.push({
      id: makeId(),
      itemName: "Unrecognized receipt item",
      category: "other",
      amount: difference,
      quantity: 1,
      productCode: "",
      confidence: "low",
      sourceLine: "",
    });
    warnings.push(`$${difference.toFixed(2)} could not be matched to a product line. Rename or remove the highlighted line.`);
  }

  const reviewedItemsTotal = roundMoney(items.reduce((sum, item) => sum + item.amount, 0));
  const reconciliationDifference = roundMoney(total - reviewedItemsTotal - tax);
  if (Math.abs(reconciliationDifference) > 0.01) {
    warnings.push(`The detected lines differ from the receipt total by $${Math.abs(reconciliationDifference).toFixed(2)}.`);
  }
  if (!vendor) warnings.push("Merchant name was not detected.");
  if (!expenseDate) warnings.push("Purchase date was not detected.");
  if (!explicitTotalResult.found) warnings.push("Receipt total was inferred. Confirm it before saving.");
  if (confidence < 70) warnings.push("Image confidence is low. Check every highlighted value.");

  return {
    vendor,
    expenseDate,
    purchaseTime,
    paymentMethod,
    subtotal: subtotalResult.found ? subtotal : reviewedItemsTotal,
    tax,
    total: explicitTotalResult.found || subtotalResult.found ? total : roundMoney(reviewedItemsTotal + tax),
    confidence: Math.max(0, Math.min(100, roundMoney(confidence))),
    rawText,
    items,
    warnings: [...new Set(warnings)],
  };
}

function readFileAsDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read receipt image."));
    reader.onerror = () => reject(new Error("Could not read receipt image."));
    reader.readAsDataURL(file);
  });
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("The selected image could not be opened."));
    };
    image.src = url;
  });
}

function loadDataUrlImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The prepared receipt image could not be opened."));
    image.src = dataUrl;
  });
}

type ReceiptOcrBlock = {
  paragraphs: Array<{
    lines: Array<{ text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }>;
  }>;
};

export function containsLikelyCardNumber(value: string) {
  const candidates: string[] = value.match(/(?:\d[\s-]?){13,19}/g) ?? [];
  return candidates.some((candidate) => {
    const digits = candidate.replace(/\D/g, "");
    if (digits.length < 13 || digits.length > 19) return false;
    let sum = 0;
    let doubleDigit = false;
    for (let index = digits.length - 1; index >= 0; index -= 1) {
      let digit = Number(digits[index]);
      if (doubleDigit) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      doubleDigit = !doubleDigit;
    }
    return sum % 10 === 0;
  });
}

async function redactSensitiveReceiptLines(dataUrl: string, blocks: ReceiptOcrBlock[] | null) {
  const image = await loadDataUrlImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot redact the receipt image.");
  context.drawImage(image, 0, 0);

  const sensitiveLine = /\b(?:account|acct|card|credit|debit|visa|mastercard|amex|american express|auth(?:orization)?|approval|terminal|reference|entry\s+emv|contactless|aid|member(?:ship)?|loyalty)\b/i;
  const maskedNumber = /(?:\*|x){3,}\s*\d{2,4}/i;
  const lines = (blocks ?? []).flatMap((block) => block.paragraphs.flatMap((paragraph) => paragraph.lines));
  const redactions = lines.filter((line) => (
    sensitiveLine.test(line.text) || maskedNumber.test(line.text) || containsLikelyCardNumber(line.text)
  ));
  context.fillStyle = "#000000";
  for (const { bbox } of redactions) {
    const paddingX = Math.max(6, Math.round((bbox.x1 - bbox.x0) * 0.05));
    const paddingY = Math.max(4, Math.round((bbox.y1 - bbox.y0) * 0.2));
    context.fillRect(
      Math.max(0, bbox.x0 - paddingX),
      Math.max(0, bbox.y0 - paddingY),
      Math.min(canvas.width - bbox.x0 + paddingX, bbox.x1 - bbox.x0 + paddingX * 2),
      Math.min(canvas.height - bbox.y0 + paddingY, bbox.y1 - bbox.y0 + paddingY * 2),
    );
  }
  return { dataUrl: canvas.toDataURL("image/jpeg", 0.86), count: redactions.length };
}

type ReceiptBounds = { x: number; y: number; width: number; height: number };
type ReceiptCanvasSource = HTMLImageElement | HTMLCanvasElement;

function histogramPercentile(histogram: Uint32Array, pixelCount: number, percentile: number) {
  const target = pixelCount * percentile;
  let seen = 0;
  for (let value = 0; value < histogram.length; value += 1) {
    seen += histogram[value];
    if (seen >= target) return value;
  }
  return 255;
}

function detectReceiptBounds(image: HTMLImageElement): ReceiptBounds | null {
  const analysisEdge = 480;
  const analysisScale = Math.min(1, analysisEdge / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * analysisScale));
  const height = Math.max(1, Math.round(image.naturalHeight * analysisScale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;
  const histogram = new Uint32Array(256);

  for (let offset = 0; offset < pixels.length; offset += 4) {
    const gray = Math.round(pixels[offset] * 0.299 + pixels[offset + 1] * 0.587 + pixels[offset + 2] * 0.114);
    histogram[gray] += 1;
  }

  // Receipts are generally among the lighter connected regions in a phone
  // photo. The adaptive floor keeps a white screenshot usable while excluding
  // patterned beds, counters, and other common capture backgrounds.
  const lightThreshold = Math.max(148, histogramPercentile(histogram, width * height, 0.56));
  const mask = new Uint8Array(width * height);
  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    const offset = pixel * 4;
    const red = pixels[offset];
    const green = pixels[offset + 1];
    const blue = pixels[offset + 2];
    const gray = red * 0.299 + green * 0.587 + blue * 0.114;
    const chroma = Math.max(red, green, blue) - Math.min(red, green, blue);
    if (gray >= lightThreshold && chroma <= Math.max(46, gray * 0.28)) mask[pixel] = 1;
  }

  const visited = new Uint8Array(mask.length);
  const queue = new Int32Array(mask.length);
  let best = { area: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 };
  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) continue;
    let head = 0;
    let tail = 1;
    queue[0] = start;
    visited[start] = 1;
    let area = 0;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;

    while (head < tail) {
      const current = queue[head++];
      const x = current % width;
      const y = Math.floor(current / width);
      area += 1;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      if (x > 0 && mask[current - 1] && !visited[current - 1]) {
        visited[current - 1] = 1;
        queue[tail++] = current - 1;
      }
      if (x < width - 1 && mask[current + 1] && !visited[current + 1]) {
        visited[current + 1] = 1;
        queue[tail++] = current + 1;
      }
      if (y > 0 && mask[current - width] && !visited[current - width]) {
        visited[current - width] = 1;
        queue[tail++] = current - width;
      }
      if (y < height - 1 && mask[current + width] && !visited[current + width]) {
        visited[current + width] = 1;
        queue[tail++] = current + width;
      }
    }

    if (area > best.area) best = { area, minX, minY, maxX, maxY };
  }

  const boundsWidth = best.maxX - best.minX + 1;
  const boundsHeight = best.maxY - best.minY + 1;
  const boundsArea = boundsWidth * boundsHeight;
  if (
    best.area < width * height * 0.035 ||
    boundsArea < width * height * 0.08 ||
    best.area / Math.max(1, boundsArea) < 0.16
  ) return null;

  const paddingX = Math.max(3, Math.round(boundsWidth * 0.035));
  const paddingY = Math.max(3, Math.round(boundsHeight * 0.015));
  const minX = Math.max(0, best.minX - paddingX);
  const minY = Math.max(0, best.minY - paddingY);
  const maxX = Math.min(width - 1, best.maxX + paddingX);
  const maxY = Math.min(height - 1, best.maxY + paddingY);
  return {
    x: Math.round(minX / analysisScale),
    y: Math.round(minY / analysisScale),
    width: Math.max(1, Math.round((maxX - minX + 1) / analysisScale)),
    height: Math.max(1, Math.round((maxY - minY + 1) / analysisScale)),
  };
}

function createReceiptCanvas(
  image: ReceiptCanvasSource,
  bounds: ReceiptBounds,
  maxEdge: number,
  maxScale = 1,
  maxPixels = 2_500_000,
) {
  const edgeScale = maxEdge / Math.max(bounds.width, bounds.height);
  const pixelScale = Math.sqrt(maxPixels / Math.max(1, bounds.width * bounds.height));
  const scale = Math.max(0.1, Math.min(maxScale, edgeScale, pixelScale));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bounds.width * scale));
  canvas.height = Math.max(1, Math.round(bounds.height * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("This browser cannot prepare the receipt image.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, bounds.x, bounds.y, bounds.width, bounds.height, 0, 0, canvas.width, canvas.height);
  return canvas;
}

async function perspectiveCorrectReceipt(source: HTMLCanvasElement, expectedBounds: ReceiptBounds) {
  try {
    const [cvModule, { DocumentScanner }] = await Promise.all([
      import("@techstark/opencv-js"),
      import("opencv-document-scanner"),
    ]);
    const cv = await (cvModule as unknown as { default: Promise<unknown> }).default;
    (window as unknown as { cv: unknown }).cv = cv;
    const scanner = new DocumentScanner();
    const points = scanner.detect(source, { useCanny: true });
    if (points.length !== 4 || points.some((point) => !point || !Number.isFinite(point.x) || !Number.isFinite(point.y))) {
      return null;
    }
    const marginX = source.width * 0.015;
    const marginY = source.height * 0.015;
    if (points.some((point) => (
      point.x <= marginX || point.x >= source.width - marginX ||
      point.y <= marginY || point.y >= source.height - marginY
    ))) return null;

    const minX = Math.min(...points.map((point) => point.x));
    const maxX = Math.max(...points.map((point) => point.x));
    const minY = Math.min(...points.map((point) => point.y));
    const maxY = Math.max(...points.map((point) => point.y));
    const coverage = ((maxX - minX) * (maxY - minY)) / Math.max(1, source.width * source.height);
    if (coverage < 0.08 || coverage > 0.98) return null;
    const intersectionWidth = Math.max(0, Math.min(maxX, expectedBounds.x + expectedBounds.width) - Math.max(minX, expectedBounds.x));
    const intersectionHeight = Math.max(0, Math.min(maxY, expectedBounds.y + expectedBounds.height) - Math.max(minY, expectedBounds.y));
    const intersectionArea = intersectionWidth * intersectionHeight;
    const detectedArea = (maxX - minX) * (maxY - minY);
    const expectedArea = expectedBounds.width * expectedBounds.height;
    const overlap = intersectionArea / Math.max(1, detectedArea + expectedArea - intersectionArea);
    if (overlap < 0.45) return null;

    const width = Math.max(scanner.distance(points[0], points[1]), scanner.distance(points[2], points[3]));
    const height = Math.max(scanner.distance(points[0], points[3]), scanner.distance(points[1], points[2]));
    if (width < 80 || height < 120) return null;
    const scale = Math.min(1, 2_200 / Math.max(width, height), Math.sqrt(2_200_000 / (width * height)));
    return scanner.crop(source, points, Math.round(width * scale), Math.round(height * scale));
  } catch {
    return null;
  }
}

function normalizeReceiptText(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("This browser cannot enhance the receipt image.");
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const histogram = new Uint32Array(256);
  for (let index = 0; index < imageData.data.length; index += 4) {
    const gray = Math.round(imageData.data[index] * 0.299 + imageData.data[index + 1] * 0.587 + imageData.data[index + 2] * 0.114);
    histogram[gray] += 1;
  }
  const pixelCount = canvas.width * canvas.height;
  const shadow = histogramPercentile(histogram, pixelCount, 0.04);
  const paper = histogramPercentile(histogram, pixelCount, 0.93);
  const range = Math.max(42, paper - shadow);
  for (let index = 0; index < imageData.data.length; index += 4) {
    const gray = imageData.data[index] * 0.299 + imageData.data[index + 1] * 0.587 + imageData.data[index + 2] * 0.114;
    const normalized = Math.max(0, Math.min(255, ((gray - shadow) / range) * 255));
    imageData.data[index] = normalized;
    imageData.data[index + 1] = normalized;
    imageData.data[index + 2] = normalized;
  }
  context.putImageData(imageData, 0, 0);
}

function createAdaptiveTextCanvas(source: HTMLCanvasElement) {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const sourceContext = source.getContext("2d", { willReadFrequently: true });
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!sourceContext || !context) throw new Error("This browser cannot enhance the receipt image.");
  const input = sourceContext.getImageData(0, 0, source.width, source.height);
  const output = context.createImageData(source.width, source.height);
  const stride = source.width + 1;
  const integral = new Uint32Array(stride * (source.height + 1));

  for (let y = 1; y <= source.height; y += 1) {
    let rowTotal = 0;
    for (let x = 1; x <= source.width; x += 1) {
      rowTotal += input.data[((y - 1) * source.width + x - 1) * 4];
      integral[y * stride + x] = integral[(y - 1) * stride + x] + rowTotal;
    }
  }

  const radius = Math.max(10, Math.round(Math.min(source.width, source.height) * 0.012));
  for (let y = 0; y < source.height; y += 1) {
    const top = Math.max(0, y - radius);
    const bottom = Math.min(source.height - 1, y + radius);
    for (let x = 0; x < source.width; x += 1) {
      const left = Math.max(0, x - radius);
      const right = Math.min(source.width - 1, x + radius);
      const area = (right - left + 1) * (bottom - top + 1);
      const sum = integral[(bottom + 1) * stride + right + 1] - integral[top * stride + right + 1] -
        integral[(bottom + 1) * stride + left] + integral[top * stride + left];
      const gray = input.data[(y * source.width + x) * 4];
      const value = gray < sum / area - 13 ? 0 : 255;
      const offset = (y * source.width + x) * 4;
      output.data[offset] = value;
      output.data[offset + 1] = value;
      output.data[offset + 2] = value;
      output.data[offset + 3] = 255;
    }
  }
  context.putImageData(output, 0, 0);
  return canvas;
}

function splitReceiptCanvas(source: HTMLCanvasElement) {
  const targetHeight = Math.max(900, Math.round(source.width * 1.2));
  if (source.height <= targetHeight * 1.2) return [source];
  const sectionCount = Math.ceil(source.height / targetHeight);
  const sectionHeight = Math.ceil(source.height / sectionCount);
  return Array.from({ length: sectionCount }, (_, index) => {
    const top = index * sectionHeight;
    const height = Math.min(sectionHeight, source.height - top);
    const canvas = document.createElement("canvas");
    canvas.width = source.width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser cannot section the receipt image.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source, 0, top, source.width, height, 0, 0, source.width, height);
    return canvas;
  });
}

function canvasDataUrl(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<string>((resolve, reject) => {
    canvas.toBlob(async (value) => {
      if (!value) return reject(new Error("Could not compress the receipt image."));
      try {
        resolve(await readFileAsDataUrl(value));
      } catch (error) {
        reject(error);
      }
    }, type, quality);
  });
}

export async function prepareReceiptImage(file: File): Promise<ReceiptImage> {
  if (!file.type.startsWith("image/")) throw new Error("Choose a receipt photo or image screenshot.");
  if (file.size > 25 * 1024 * 1024) throw new Error("Choose an image smaller than 25 MB.");

  const image = await loadImage(file);
  const fullBounds = { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight };
  const candidateBounds = detectReceiptBounds(image);
  const detectedBounds = candidateBounds &&
    candidateBounds.width >= fullBounds.width * 0.32 &&
    candidateBounds.height >= fullBounds.height * 0.32
    ? candidateBounds
    : null;
  const detectedArea = detectedBounds
    ? (detectedBounds.width * detectedBounds.height) / (fullBounds.width * fullBounds.height)
    : 1;
  const perspectiveMarginX = fullBounds.width * 0.015;
  const perspectiveMarginY = fullBounds.height * 0.015;
  const hasCompletePaperOutline = detectedBounds &&
    detectedBounds.x > perspectiveMarginX &&
    detectedBounds.y > perspectiveMarginY &&
    detectedBounds.x + detectedBounds.width < fullBounds.width - perspectiveMarginX &&
    detectedBounds.y + detectedBounds.height < fullBounds.height - perspectiveMarginY;
  const perspectiveSource = hasCompletePaperOutline && detectedArea < 0.9
    ? createReceiptCanvas(image, fullBounds, 2_200, 2, 2_200_000)
    : null;
  const expectedPerspectiveBounds = perspectiveSource && detectedBounds ? {
    x: detectedBounds.x / fullBounds.width * perspectiveSource.width,
    y: detectedBounds.y / fullBounds.height * perspectiveSource.height,
    width: detectedBounds.width / fullBounds.width * perspectiveSource.width,
    height: detectedBounds.height / fullBounds.height * perspectiveSource.height,
  } : null;
  const perspectiveCanvas = perspectiveSource && expectedPerspectiveBounds
    ? await perspectiveCorrectReceipt(perspectiveSource, expectedPerspectiveBounds)
    : null;
  const source: ReceiptCanvasSource = perspectiveCanvas ?? image;
  const bounds = perspectiveCanvas
    ? { x: 0, y: 0, width: perspectiveCanvas.width, height: perspectiveCanvas.height }
    : detectedBounds ?? fullBounds;
  const scanDetected = Boolean(perspectiveCanvas || (detectedBounds && detectedArea < 0.92));
  const storedCanvas = createReceiptCanvas(source, bounds, 2_200, 1, 1_400_000);
  const ocrCanvas = createReceiptCanvas(source, bounds, 2_800, 4, 2_200_000);
  normalizeReceiptText(ocrCanvas);
  const adaptiveCanvas = createAdaptiveTextCanvas(ocrCanvas);
  const metadataBounds = { ...bounds, height: Math.min(bounds.height, Math.round(bounds.width * 1.35)) };
  const metadataCanvas = createReceiptCanvas(source, metadataBounds, 2_200, 3, 1_200_000);
  normalizeReceiptText(metadataCanvas);
  const [dataUrl, ocrSections, fallbackOcrSections, metadataOcrDataUrl] = await Promise.all([
    canvasDataUrl(storedCanvas, "image/jpeg", 0.88),
    Promise.all(splitReceiptCanvas(ocrCanvas).map((section) => canvasDataUrl(section, "image/jpeg", 0.92))),
    Promise.all(splitReceiptCanvas(adaptiveCanvas).map((section) => canvasDataUrl(section, "image/png"))),
    canvasDataUrl(metadataCanvas, "image/jpeg", 0.94),
  ]);
  const baseName = file.name.replace(/\.[^.]+$/, "") || "receipt";
  return {
    dataUrl,
    ocrSections,
    fallbackOcrSections,
    metadataOcrDataUrl,
    fileName: `${baseName}.jpg`,
    previewUrl: dataUrl,
    scanDetected,
    geminiDataUrls: [],
    redactionCount: 0,
  };
}

export async function recognizeReceipt(
  image: ReceiptImage,
  onProgress: (progress: OcrProgress) => void,
): Promise<ReceiptDraft> {
  const { createWorker, PSM } = await import("tesseract.js");
  let recognitionPass: "primary" | "fallback" = "primary";
  let activeSection = 0;
  let sectionCount = Math.max(1, image.ocrSections.length);
  const worker = await createWorker("eng", 1, {
    logger(message) {
      const progress = typeof message.progress === "number" ? message.progress : 0;
      const label = message.status === "recognizing text" ? "Reading receipt text" :
        message.status === "loading language traineddata" ? "Loading the local reader" :
          message.status === "initializing api" ? "Preparing receipt reader" : "Preparing image";
      const sectionProgress = (activeSection + progress) / sectionCount;
      const scaledProgress = recognitionPass === "primary"
        ? 12 + Math.round(sectionProgress * 60)
        : 74 + Math.round(sectionProgress * 22);
      onProgress({ label: recognitionPass === "fallback" ? "Double-checking difficult receipt text" : label, progress: scaledProgress });
    },
  });

  try {
    const recognizeSections = async (sections: string[], mode: typeof PSM[keyof typeof PSM]) => {
      await worker.setParameters({
        tessedit_pageseg_mode: mode,
        preserve_interword_spaces: "1",
        user_defined_dpi: "300",
      });
      sectionCount = Math.max(1, sections.length);
      const text: string[] = [];
      const redactedSections: string[] = [];
      let redactionCount = 0;
      let confidenceTotal = 0;
      for (const [index, section] of sections.entries()) {
        activeSection = index;
        const captureRedactions = recognitionPass === "primary";
        const result = await worker.recognize(
          section,
          { rotateAuto: true },
          { blocks: captureRedactions, imageColor: captureRedactions },
        );
        text.push(result.data.text);
        confidenceTotal += result.data.confidence;
        if (captureRedactions) {
          const redacted = await redactSensitiveReceiptLines(
            result.data.imageColor || section,
            result.data.blocks as ReceiptOcrBlock[] | null,
          );
          redactedSections.push(redacted.dataUrl);
          redactionCount += redacted.count;
        }
      }
      return {
        text: text.join("\n"),
        confidence: confidenceTotal / Math.max(1, sections.length),
        redactedSections,
        redactionCount,
      };
    };

    const result = await recognizeSections(image.ocrSections, PSM.SINGLE_COLUMN);
    image.geminiDataUrls = result.redactedSections;
    image.redactionCount = result.redactionCount;
    let draft = parseReceiptText(result.text, result.confidence);
    const detectedSourceLines = draft.items.filter((item) => item.sourceLine).length;

    if (detectedSourceLines < 2 || !draft.expenseDate || draft.total <= 0 || draft.confidence < 55) {
      recognitionPass = "fallback";
      const fallbackResult = await recognizeSections(image.fallbackOcrSections, PSM.SPARSE_TEXT);
      const fallbackDraft = parseReceiptText(fallbackResult.text, fallbackResult.confidence);
      const mergedDraft = parseReceiptText(
        `${result.text}\n${fallbackResult.text}`,
        Math.max(result.confidence, fallbackResult.confidence),
      );
      const quality = (candidate: ReceiptDraft) =>
        candidate.items.filter((item) => item.sourceLine).length * 12 +
        (candidate.vendor ? 8 : 0) +
        (candidate.expenseDate ? 12 : 0) +
        (candidate.purchaseTime ? 4 : 0) +
        (candidate.total > 0 ? 15 : 0) +
        candidate.confidence * 0.2 -
        candidate.warnings.length * 2 -
        Math.min(30, Math.abs(
          candidate.total - candidate.tax - candidate.items.reduce((sum, item) => sum + item.amount, 0),
        ));
      const candidates = [draft, fallbackDraft, mergedDraft];
      draft = candidates.sort((left, right) => quality(right) - quality(left))[0];
      const metadataCandidate = candidates.find((candidate) => candidate.expenseDate);
      if (!draft.expenseDate && metadataCandidate?.expenseDate) {
        draft = { ...draft, expenseDate: metadataCandidate.expenseDate };
      }
      if (!draft.purchaseTime && metadataCandidate?.purchaseTime) {
        draft = { ...draft, purchaseTime: metadataCandidate.purchaseTime };
      }
      if (!draft.paymentMethod && metadataCandidate?.paymentMethod) {
        draft = { ...draft, paymentMethod: metadataCandidate.paymentMethod };
      }
    }

    if (!draft.expenseDate) {
      recognitionPass = "fallback";
      activeSection = 0;
      sectionCount = 1;
      onProgress({ label: "Double-checking receipt date", progress: 96 });
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SPARSE_TEXT,
        tessedit_char_whitelist: "0123456789/.-: ",
        preserve_interword_spaces: "1",
      });
      const metadataResult = await worker.recognize(image.metadataOcrDataUrl);
      const metadataDraft = parseReceiptText(metadataResult.data.text, metadataResult.data.confidence);
      if (metadataDraft.expenseDate || metadataDraft.purchaseTime) {
        draft = {
          ...draft,
          expenseDate: metadataDraft.expenseDate || draft.expenseDate,
          purchaseTime: metadataDraft.purchaseTime || draft.purchaseTime,
          paymentMethod: metadataDraft.paymentMethod || draft.paymentMethod,
        };
      }
    }

    onProgress({ label: "Organizing receipt items", progress: 100 });
    return draft;
  } finally {
    await worker.terminate();
  }
}

export function allocateReceiptTax(items: ReceiptLineDraft[], tax: number) {
  const validItems = items.filter((item) => item.itemName.trim() && item.amount > 0);
  const subtotal = roundMoney(validItems.reduce((sum, item) => sum + item.amount, 0));
  let remainingTax = roundMoney(Math.max(0, tax));
  return validItems.map((item, index) => {
    const taxShare = index === validItems.length - 1 || subtotal <= 0
      ? remainingTax
      : roundMoney((item.amount / subtotal) * tax);
    remainingTax = roundMoney(remainingTax - taxShare);
    return { item, taxShare, total: roundMoney(item.amount + taxShare) };
  });
}
