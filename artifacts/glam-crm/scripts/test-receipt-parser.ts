import assert from "node:assert/strict";
import { containsLikelyCardNumber, parseReceiptText } from "../src/features/expenses/receipt-ocr";

assert.equal(containsLikelyCardNumber("CARD 4111 1111 1111 1111"), true);
assert.equal(containsLikelyCardNumber("039645113684 80# MORTAR-S"), false);

const itemized = parseReceiptText(`
SEPHORA
510 FIFTH AVENUE
05/08/2026 14:22
123456 MAKE UP FOR EVER HD SKIN FOUNDATION 44.00
NARS RADIANT CREAMY CONCEALER 32.00
SUBTOTAL 76.00
SALES TAX 6.08
TOTAL 82.08
VISA 82.08
`, 93);

assert.equal(itemized.vendor, "Sephora");
assert.equal(itemized.expenseDate, "2026-05-08");
assert.equal(itemized.total, 82.08);
assert.equal(itemized.tax, 6.08);
assert.equal(itemized.items.length, 2);
assert.equal(itemized.items[0].productCode, "123456");
assert.equal(itemized.items[0].category, "makeup_products");
assert.equal(itemized.warnings.length, 0);

const inferred = parseReceiptText(`
ULTA BEAUTY
May 6, 2026
BRUSH CLEANER 12.00
BOBBY PINS 6.00
TOTAL 19.44
`, 84);

assert.equal(inferred.expenseDate, "2026-05-06");
assert.equal(inferred.items.length, 3);
assert.equal(inferred.items[2].itemName, "Unrecognized receipt item");
assert.equal(inferred.items[2].amount, 1.44);
assert.match(inferred.warnings.join(" "), /could not be matched/i);

const combined = parseReceiptText(`
CAMERA READY COSMETICS
08-01-26
AMOUNT DUE 37.50
THANK YOU
`, 58);

assert.equal(combined.vendor, "Camera Ready Cosmetics");
assert.equal(combined.expenseDate, "2026-08-01");
assert.equal(combined.items.length, 1);
assert.equal(combined.items[0].amount, 37.5);
assert.equal(combined.items[0].confidence, "low");
assert.match(combined.warnings.join(" "), /not clear enough/i);

const homeDepot = parseReceiptText(`
THE HOME DEPOT
How doers get more done
2100 ELMWOOD AVE
BUFFALO, NY 14207
07/17/26 11:28 AM
039645113684 80# MORTAR-S <A>
80LB MASON MIX-TYPE S
5@10.24 51.20N
731919955586 FG5PKNTGLV <A>
FG 5 PR NITRILE GLOVE L
2@4.98 9.96N
028756957348 SILICONE <A>
GE ALL PURP SIL WHITE 10.1 OZ
2@9.48 18.96N
045242276172 3INBITHOLD <A>
MKE 3 IN. SCREW-HOLDING BIT HOLDER
2@9.97 19.94N
077089150032 2\"WHTBRSBRSH <A>
CHIP 2.0 FLAT BRUSH
2@1.67 3.34N
077089150056 3\"WHTBRSBRSH <A>
CHIP 3.0 FLAT BRUSH
1@1.97 1.97N
073257005357 HUSKY 50CT <A>
HUSKY 42G CONTRACTOR BAGS 50CT
1@29.97 29.97N
088381554695 IMPACT XPS <A>
MAK IMPACT XPS 2\" PH2 15PC
1@18.47 18.47N
885911892827 PIVOT HOLDER <A>
DW MAXFIT PIVOT HOLDER
1@11.97 11.97N
1002-169-000 GL Recyc$ <A,U>
NY PAINTCARE FEE 1GL-2GL
1@0.95 0.95N
020066229641 CS100PRMGL <A>
COVERSTAIN 100 PRIMER 1G - VOC
1@62.98 62.98N
62.98 Pro PaintPro Paint -6.30
SUBTOTAL 223.41
SALES TAX 0.00
TOTAL $223.41
AMEX
`, 82);

assert.equal(homeDepot.vendor, "Home Depot");
assert.equal(homeDepot.expenseDate, "2026-07-17");
assert.equal(homeDepot.items.length, 11);
assert.equal(homeDepot.items[0].productCode, "039645113684");
assert.equal(homeDepot.items[0].quantity, 5);
assert.equal(homeDepot.items[0].amount, 51.2);
assert.equal(homeDepot.items[10].amount, 56.68);
assert.equal(homeDepot.items.reduce((sum, item) => Math.round((sum + item.amount) * 100) / 100, 0), 223.41);
assert.equal(homeDepot.total, 223.41);
assert.doesNotMatch(homeDepot.warnings.join(" "), /differ|could not be matched/i);

const superstore = parseReceiptText(`
Supersiore
01/20/2023 04:12 PM
Specialized Kenevo Expert Carbon 1 10999.99
SUBTOTAL 10999.99
TAX 852.50
TOTAL 11852.49
Credit Card
Entry EMV: $11852.49
`, 91);

assert.equal(superstore.vendor, "Superstore");
assert.equal(superstore.expenseDate, "2023-01-20");
assert.equal(superstore.items.length, 1);
assert.equal(superstore.items[0].amount, 10999.99);
assert.equal(superstore.tax, 852.5);
assert.equal(superstore.total, 11852.49);
assert.doesNotMatch(superstore.items.map((item) => item.itemName).join(" "), /entry emv/i);

const walmart = parseReceiptText(`
WALL-MART-SUPERSTORE
HAND TOWEL 2.97
GATORADE 2.00
T-SHIRT 16.88
PUSH PINS 1.24
SUBTOTAL 23.09
TAX 1 7.89% 2.90
TAX 2 4.90% 1.28
TOTAL 27.27
10/17/2020 16:12
`, 88);

assert.equal(walmart.vendor, "Walmart");
assert.equal(walmart.expenseDate, "2020-10-17");
assert.equal(walmart.items.length, 4);
assert.equal(walmart.tax, 4.18);
assert.equal(walmart.total, 27.27);
assert.doesNotMatch(walmart.warnings.join(" "), /differ|could not be matched/i);

const walmartBadTotalDigit = parseReceiptText(`
WALL-MART-SUPERSTORE
SUBTOTAL 23.09
TAX 1 2.90
TAX 2 1.28
TOTAL 21.27
10/17/2020 16:12
`, 84);

assert.equal(walmartBadTotalDigit.total, 27.27);
assert.match(walmartBadTotalDigit.warnings.join(" "), /subtotal plus tax was used/i);

const zeroDollar = parseReceiptText(`
GROCERY MART
DATE: 10/26/23 14:38:21
ITEM 1: EGO ........ $0.00
ITEM 2: STRESS ..... $0.00
SUB-TOTAL .......... $0.00
SALES TAX .......... $0.00
TOTAL: $0.00
AMOUNT PAID ........ $0.00
`, 87);

assert.equal(zeroDollar.vendor, "Grocery Mart");
assert.equal(zeroDollar.expenseDate, "2023-10-26");
assert.equal(zeroDollar.items.length, 0);
assert.equal(zeroDollar.total, 0);
assert.match(zeroDollar.warnings.join(" "), /totals \$0\.00/i);

const noisyZeroDollar = parseReceiptText(`
GROCERY MART
ITEM 1: EGO ........ $0.00
ITEM 2: STRESS ..... $0.00
SALES TAX .......... $0.00
STRESS ...c 8
`, 54);

assert.equal(noisyZeroDollar.items.length, 0);
assert.equal(noisyZeroDollar.total, 0);
assert.match(noisyZeroDollar.warnings.join(" "), /totals \$0\.00/i);

const contradictoryZeroDollar = parseReceiptText(`
GROCERY MART
ITEM 1: EGO ........ $0.00
ITEM 2: STRESS ..... $0.00
SUB-TOTAL .......... $8.00
SALES TAX .......... $0.00
TOTAL: $0.00
`, 67);

assert.equal(contradictoryZeroDollar.items.length, 0, JSON.stringify(contradictoryZeroDollar));
assert.equal(contradictoryZeroDollar.total, 0);
assert.match(contradictoryZeroDollar.warnings.join(" "), /totals \$0\.00/i);

const implausibleFutureDate = parseReceiptText(`
GROCERY DEPOT
03/09/2088 09:45 AM
DELI ITEM 10.36
SUBTOTAL 10.36
TOTAL 10.36
`, 90);

assert.equal(implausibleFutureDate.expenseDate, "");
assert.match(implausibleFutureDate.warnings.join(" "), /date was not detected/i);

const circleK = parseReceiptText(`
Circle K
Date: 2/18/2019 Time: 10:09:02 AM
2 BIG CHIEF JERKY $6.98
1 FAV SPRING WATER $2.19
1 FANTA ORANGE SODA $2.69
1 COKE $2.69
1 BARQS RT BEER $2.69
1 SKITTLES ORIG FRT $1.99
1 MTG BEEF AND CHEESE WE $5.00
1 BIG CHIEF JERKY 2 FOR ($2.48)
1 COKE 473 500ML 3 FOR ($3.07)
S-Total $19.39
GST $0.61
PST $0.00
Total $20.00
`, 86);

assert.equal(circleK.vendor, "Circle K");
assert.equal(circleK.expenseDate, "2019-02-18");
assert.equal(circleK.subtotal, 19.39);
assert.equal(circleK.tax, 0.61);
assert.equal(circleK.total, 20);
assert.equal(circleK.items.reduce((sum, item) => roundForTest(sum + item.amount), 0), 19.39);
assert.match(circleK.warnings.join(" "), /discounts was allocated/i);
assert.doesNotMatch(circleK.warnings.join(" "), /differ|could not be matched/i);

console.log("Receipt parser fixtures passed: retail items, multiple taxes, zero totals, date bounds, discounts, reconciliation, and Home Depot multi-line items.");

function roundForTest(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
