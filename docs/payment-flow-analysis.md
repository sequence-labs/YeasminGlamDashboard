# Booking Payment Flow — Senior Review, Analysis & Plan

> **Status:** Analysis + proposed plan for your approval. No payment code changed yet.
> **Date:** 2026-07-01 · **Scope:** the Financials & Payments tab of a booking and everything that feeds it.

---

## TL;DR (the verdict)

The payment section **works for the happy path** (retainer paid, then balance paid) but it is built on a **binary model** (`retainerPaid` / `balancePaid` booleans) instead of a **ledger** (money billed vs. money collected). That one architectural choice is the root of almost every gap:

- **Partial payments are invisible.** Recording a $100 payment against a $525 balance changes nothing you can see — the balance still reads $525.
- **The amount you type is mostly decorative.** For a "retainer" or "balance" payment, only the *type* matters; a $1 "balance" payment marks the whole balance paid.
- **Balance is computed three different ways in three places, with two different formulas** — they can disagree.
- **No refunds, no credits, no overpayment handling.**
- **Two parallel "record a payment" surfaces** (Payment Tracker toggles + Record Payment dialog + Payment Requests) that aren't reconciled and can double-count or drift.

None of this is a crisis — it's a solo studio and the happy path holds — but it's the kind of foundation that quietly produces wrong numbers as soon as real life (deposits, installments, partial refunds, cancellations) shows up. The fix is to make **the payments table the single source of truth** and derive everything from it.

---

## 1. What exists today (three overlapping mechanisms)

**A. Payment Tracker — two boolean toggles.**
`retainerPaid` and `balancePaid` on the booking. These *drive the displayed balance*: `balanceDue = grandTotal − (retainerPaid ? retainerAmount : 0)`. Flipping a switch is the real "source of truth" for what's owed.

**B. Record Payment — the `payments` table.**
Dialog captures `amount`, `type` (retainer / balance / partial / other), `paidAt`, `note` (free text). On save:
- `type: retainer` → sets `retainerPaid = true`
- `type: balance` → sets `balancePaid = true`
- `type: partial` / `other` → **records the row but touches nothing else**
The row's `amount` is *not* used to compute the balance (except in one card — see §2). Deleting a payment removes the row but **does not** un-set the flags.

**C. Payment Requests — the `payment_intents` table.**
"Send a payment request" (Zelle/Venmo/Cash App). Lifecycle: `requested → paid | cancelled`. Marking an intent "paid" **also** inserts a `payments` row *and* flips `retainerPaid`/`balancePaid`. So there are now **two doors** that create payments and flip flags (B and C), plus a **third** (A) that flips flags directly.

---

## 2. The core defect: three balance formulas, no ledger

The "balance due" is computed in **three** places:

| Where | Formula | Uses actual payments? | Includes add-ons? |
|---|---|---|---|
| Payment Tracker + Invoice (`booking-detail.tsx`) | `grandTotal − (retainerPaid ? retainerAmount : 0) + approvedAddons` | ❌ no | ✅ (I added this) |
| Payment Links card (`booking-detail.tsx` L851) | `grandTotal − retainerAmount − Σpayments + approvedAddons` | ✅ yes | ✅ |
| Client portal (`public-portal.ts`) | `grandTotal − (retainerPaid ? retainerAmount : 0)` | ❌ no | ❌ **no** |

These **do not agree**. The invoice can say "$525 due" while the payment-links card says "$425 due" (if a $100 partial was recorded), while the client's portal says something else again. There is no single `amountPaid` or `balanceRemaining` that the whole app trusts.

---

## 3. Concrete gaps & bugs (ranked)

1. **[High] Partial payments don't reduce the balance.** The primary balance formula ignores `payments.amount` entirely. A deposit or installment is recorded but invisible to what's owed.
2. **[High] Any-amount payment flips the whole flag.** A "retainer" payment of $1 marks the retainer fully paid; a "balance" payment of $1 marks the balance fully settled. No concept of "retainer partially met."
3. **[High] Deleting a payment doesn't reverse state.** Delete the "balance" payment → `balancePaid` stays `true`. Silent drift between the ledger and the flags.
4. **[High] Three divergent balance formulas** (§2) — the same booking shows different "due" numbers in different views, and the client portal is the least accurate (ignores payments *and* add-ons).
5. **[Med] No refunds or credits.** `paymentSchema` enforces `amount ≥ 1`; there's no refund type, no negative/void, no reason field. The only "undo" is a hard delete, which erases history.
6. **[Med] Overpayment is clamped and hidden.** `Math.max(0, …)` means paying too much just shows $0 due — no "credit owed to client" surfaced.
7. **[Med] Two payment-creation paths aren't reconciled.** Marking an intent "paid" *and* separately recording a manual payment for the same money → double-counted in the one card that sums payments. No idempotency/linkage.
8. **[Med] Payment method is free text.** "Note: e.g. Venmo, Zelle, Cash" — not a structured field, so you can't report by method or reconcile with the payment-request method.
9. **[Low] Approved add-ons aren't part of the paid/settled model.** They raise the balance (good) but there's no way to mark them collected; the `balancePaid` boolean doesn't know they exist, so "balance paid" can be true while add-ons are unpaid.
10. **[Low] UX/validation:** Record Payment defaults to `$0` + type "Partial" (the one type that does nothing); `paidAt` can be in the future; no confirmation on payment delete; no running-balance history; retainer is hard-coded at 25% elsewhere.

---

## 4. Target design — a payment ledger

Make the **`payments` table the single source of truth** and derive everything:

```
totalBilled       = grandTotal + approvedAddonsTotal
amountCollected   = Σ(payments.amount where direction = 'in')  −  Σ(refunds where direction = 'out')
balanceRemaining  = totalBilled − amountCollected          // may be negative → credit
retainerMet       = amountCollected ≥ retainerAmount        // DERIVED, not a manual toggle
paymentStatus     = unpaid | deposit_received | partially_paid | paid_in_full | overpaid
```

- **One `balanceRemaining`**, computed server-side, returned in the booking payload, used by booking-detail, the payment-links card, the client portal, the calendar reminders, and the add-on balance — all reading the same number.
- **Payment `type` becomes a label** (retainer / deposit / installment / balance / final / refund / other), not a state-machine trigger. Every payment contributes its amount.
- **`retainerPaid` / `balancePaid` become derived** (or kept as optional manual overrides that reconcile against the ledger, if you want a manual escape hatch — a decision below).
- **Refunds** are first-class: a payment with `direction = 'out'` (or a dedicated refund row) with a reason, reducing `amountCollected`. Prefer **void/refund over hard delete** so history is preserved.

---

## 5. Phased plan

**Phase 1 — One source of truth (no schema change).**
Compute `amountCollected` and `balanceRemaining` server-side from the `payments` table; return them in the booking payload. Replace all three formulas (booking-detail ×2, portal) with this one. Derive the status chip from it. *Immediately fixes gaps #1, #4, and makes partials real.*

**Phase 2 — Payments become the truth; flags derived.**
Stop letting a payment's *type* flip a boolean; instead derive `retainerMet`/`fullyPaid` from `amountCollected`. Recompute on payment create **and delete** (fixes #2, #3). Add a delete confirmation. Structured payment-method field (fixes #8).

**Phase 3 — Refunds, credits, overpayment.**
Add refund/void (with reason), preserve history instead of hard-delete, surface a credit balance when overpaid (fixes #5, #6). Small schema add (`direction` or a `refunds` concept + `method` column).

**Phase 4 — Reconcile the two payment doors.**
Link a `payment` to the `payment_intent` it fulfilled (idempotent), so "mark intent paid" and "record payment" can't double-count (fixes #7). Clarify the mental model: *intents = requests you send; payments = money received; an intent, when fulfilled, produces exactly one payment.*

**Phase 5 — Add-ons + polish.**
Fold approved add-ons cleanly into `totalBilled` for the settled model (fixes #9), add a "Collected $X of $Y · $Z remaining" progress UI with the status chip, running-balance history, and sensible Record-Payment defaults (fixes #10). Align the calendar payment-due reminder and client portal to the same ledger.

---

## 6. Decisions I need from you

1. **Derived vs. manual flags.** Fully derive "retainer met / paid in full" from the ledger (cleanest, recommended), or keep the manual toggles as an override that must reconcile? (Some studios like a manual "mark paid" escape hatch.)
2. **Refund model.** Signed ledger (`direction: in/out` on `payments`) vs. a separate `refunds` concept? (Signed ledger is simpler; recommended.)
3. **Delete vs. void.** Switch payment deletion to a **void** (kept, struck-through, reversible) to preserve financial history? (Recommended for money.)
4. **Scope for now.** Do all five phases, or start with **Phase 1–2** (the correctness fixes that make partials real and unify the balance) and revisit refunds later?
5. **Payment methods.** Fixed enum (Zelle, Venmo, Cash App, Cash, Check, Other) — good?
