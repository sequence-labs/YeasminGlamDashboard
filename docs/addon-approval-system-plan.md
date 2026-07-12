# On-Day Add-On Approval System — Plan + Implementation

> **Status: BUILT & adversarially reviewed (2026-06-30).** All three pieces implemented and
> verified end-to-end in dev against local Postgres. Decisions resolved: **email** verification,
> **local Postgres** for dev (Supabase = prod only), all others = recommended defaults.
> A 6-lens adversarial review found 12 real defects — **all fixed** (DB transactions on every
> state change, atomic OTP attempt counter, cancel race-guard, 6-digit OTP regex, `expiresAt`
> enforcement, 44px tap targets, note cap). One **residual** remains, documented in §3.
> **Endpoints are hand-wired (not OpenAPI codegen)** — see §1.7 rationale.
>
> **Audit immutability is now enforced at the DB level** via a trigger (`lib/db/sql/addon_audit_immutability.sql`),
> applied + tested on local. This is **required, not optional** — it's what makes the audit
> genuinely tamper-evident against the database owner. **You must run that one SQL file on
> Supabase** for prod (command in the file).
>
> **Deferred (need you):** ① run the immutability SQL on Supabase, ② `db:push` to Supabase,
> ③ set `GLAM_RESEND_API_KEY`/`GLAM_EMAIL_FROM` for real email. Work is **uncommitted**.
> **Author:** Claude · **Date:** 2026-06-30

---

## Implementation outcome (what shipped)

- **Schema** `lib/db/src/schema/addons.ts` (4 tables) + `bookings.docusignEnvelopeId` — pushed to **local** Postgres only.
- **Backend** `artifacts/api-server/src/lib/{addons,email,otp}.ts`; `routes/addons.ts` (admin) + `routes/public-addons.ts` (public). Email via Resend HTTP API (no new dependency); OTP hashed at rest, dev-echo gated off in prod.
- **Frontend** `lib/addons-api.ts` + pages `addon-approval.tsx` (`/a/:token`), `addon-menu.tsx` (`/a-menu/:shareToken`), `upgrade-menu-view.tsx` (`/bookings/:id/upgrade-menu`) + `components/booking/BookingAddonsSection.tsx`; balance surfaced in `booking-detail.tsx`.
- **Integrity verified empirically:** wrong code rejected, replay blocked, attempt-cap enforced, approval only via the public OTP path (no authed self-approve endpoint), full immutable audit chain with the DocuSign-amendment proof line.

---

## 0. Why this is a plan, not a finished build

Your prompt contained a real conflict: the top said *"Auto start the implementation, I'm going to sleep,"* but the **DELIVERABLES** block said *"(do not build until I approve)"* and asked for *"any assumptions or gaps you need me to confirm."*

I resolved it toward **plan-first** for one reason — **risk asymmetry**:

- The system touches your three most sensitive areas: **DB schema**, **money math** (balance/retainer), and **auth/integrity**. Several design choices materially change behavior and you explicitly said you want to confirm assumptions and that the integrity guarantee is *"the part I care most about."*
- If I build the wrong shape overnight, you wake to a large diff in sensitive code built on guessed assumptions — expensive to unwind. If I only plan, you lose nothing and approve in seconds.
- I genuinely hit **decisions only you can make** (how add-on charges hit the balance; which verification channel/provider; audit immutability depth). Those are listed in §8.

**What I did do tonight (safe, explicitly carved out by you as "cleanup only / display only"):** replaced the portal's raw-JSON contract dump with clean formatted text and removed the `dangerouslySetInnerHTML` (§9).

Everything else below is ready to build the moment you sign off on §8.

---

## 1. Current-state map

### 1.1 The dormant portal (what we're repurposing)

| Piece | Location | Notes |
|---|---|---|
| Token table | `lib/db/src/schema/portal.ts` → `bookingShareLinksTable` | `id, bookingId, token (unique), viewCount, lastViewedAt, revokedAt, createdAt` |
| Signature table | `lib/db/src/schema/portal.ts` → `contractSignaturesTable` | `id, bookingId, signerName, signerInitials, signerEmail, contractSnapshot, ipAddress, userAgent, signedAt, createdAt` |
| Token generator | `artifacts/api-server/src/lib/tokens.ts` | `generateToken(byteLength=24)` → `crypto.randomBytes(24).toString("base64url")` |
| Admin token routes | `artifacts/api-server/src/routes/portal.ts` | `GET/POST/DELETE /bookings/:id/share-link` (create / rotate / revoke) |
| Public routes | `artifacts/api-server/src/routes/public-portal.ts` | `GET /public/portal/:token`, `POST /public/portal/:token/sign`; `loadPortalPayload()` L71–158 |
| Frontend page | `artifacts/glam-crm/src/pages/portal.tsx` | route `/p/:token`; renders contract via `dangerouslySetInnerHTML` (L118–121 — the cleanup target) |
| Frontend routing | `artifacts/glam-crm/src/App.tsx` | `PublicGate` lets `/p/*` bypass `AuthGate` (L61–72) |

**Reusable for add-ons:** the token mint/lookup mechanism, the public-router pattern (unauthenticated, token-gated), IP/User-Agent capture, and the snapshot-on-action pattern. We'll mint a **separate per-request token** rather than overload the share-link token.

### 1.2 Auth model — the key to the integrity guarantee

- HMAC-SHA256 session tokens, **single shared secret** `GLAM_ADMIN_PASSWORD`, 14-day expiry (`artifacts/api-server/src/app.ts` L44–118).
- Middleware order (`app.ts` L193–196): `registerSessionRoutes → publicRouter → authRequiredMiddleware → router`. **Public routes are mounted before the auth gate**, so `/public/*` is reachable without the artist session; everything on `router` requires it.
- **There is no server-side "client" identity** — only *authenticated artist* vs *anonymous public*. This is actually a gift for the integrity requirement: there is no client account for the artist to impersonate, and **no existing endpoint sets any "approval" state.** We get to define approval such that it can *only* be set on the public, token+OTP-gated surface.

### 1.3 Bookings, balance, and the retainer trap

- `artifacts/api-server/src/routes/bookings.ts`: `effectiveBookingTotals()` L166–217, `recomputeGrandTotal()` L154–164. Adding a line item (`POST /bookings/:id/line-items` L584–620) recomputes and persists `grandTotal` **and** `retainerAmount = 25% of grandTotal`.
- Balance is **derived, not stored**, and there are **two inconsistent formulas**:
  - `booking-detail.tsx` L200: `grandTotal − (retainerPaid ? retainerAmount : 0)`
  - `booking-detail.tsx` L851 (`BookingPaymentLinksCard`): `grandTotal − retainerAmount − sum(payments)`
- **The trap (confirmed):** if an approved add-on of `$X` is added as a normal line item, `grandTotal += X` but `retainerAmount += 0.25X`, so balance rises by only **0.75X — the add-on is under-billed by 25%.** There's also a grouping-dedup collision risk in `effectiveBookingTotals()` (composite key `kind|serviceItemId|name|description|unitPrice|unitLabel|calculationNote|eventId`) that can silently swallow a colliding charge.
- **Conclusion:** do **not** bill approved add-ons as ordinary line items through `recomputeGrandTotal`. Model them as a separate first-class amount (§2.6).

### 1.4 Services catalog (dynamic source of add-on data)

- `lib/db/src/schema/services.ts` → `serviceItemsTable`: `id, name, description, kind ('service'|'fee'), defaultUnitPrice numeric(10,2), unitLabel, active, sortOrder, createdAt`.
- `GET /api/services` returns `defaultUnitPrice` as a **number (dollars)**, e.g. `150`. No hard-coded amounts anywhere — the request flow and menu both read this live.

### 1.5 Contract PDF pipeline (basis for the Upgrade Menu PDF)

- `artifacts/glam-crm/src/pages/contract-view.tsx`: shared `Section` (L854–863), `Th/Td` (L882–891), `ClientInitials`, `SignatureLine`, `window.print()` (L287), `formatMoney` (L56–61).
- Print CSS in `artifacts/glam-crm/src/index.css`: `.contract-print-page` (L452–458), `@media print` 11×17in / 0.5in margins (L464–486), `print-color-adjust: exact`.
- Data via `useGetContract(id)` → `GET /bookings/:id/contract` (artist branding fields included). The Upgrade Menu PDF reuses these exact building blocks.

### 1.6 DocuSign, audit, and comms — what exists vs. gaps

- **DocuSign envelope id: does not exist anywhere** (0 hits repo-wide). Bookings only have `signedAt`, `signedByName`. → must add a field.
- **Audit:** `lib/db/src/schema/booking-activity.ts` → `bookingActivityTable (id, bookingId, action, title, description, metadata, createdAt)`. Append-only **in practice** (no update/delete code) but **not enforced** at the DB level. Good model to follow; we'll add a dedicated, stricter audit table for approvals.
- **Email/SMS: no outbound sending exists at all.** `emailMessagesTable` stores drafts only; no nodemailer/sendgrid/resend/twilio dependency. SMS has no table and no code. `clients.email` (notNull) and `clients.phone` (nullable) exist. → verification delivery is a build + credential gap.

### 1.7 Schema & migration conventions

- Drizzle, Postgres. Tables in `lib/db/src/schema/*.ts`, re-exported from `index.ts`. `serial('id').primaryKey()`, snake_case columns, `timestamp('created_at').defaultNow().notNull()`, money as `numeric(col, { precision: 10, scale: 2 })`, FKs via `.references(() => t.id, { onDelete: 'cascade' | 'set null' })`. Each file exports an `insert…Schema` (omit `id`/`createdAt`) + inferred types.
- **No SQL migration files** — `pnpm --filter @workspace/db db:push` diffs TypeScript schema against `DATABASE_URL` and applies immediately. **In production that URL is your live Supabase DB** — pushing is irreversible from the tool. ⚠️ I will not push without your go-ahead.
- API surface is OpenAPI-first: `lib/api-spec` YAML → codegen → `lib/api-client-react` hooks. **New endpoints require editing the YAML and running codegen**, not just adding a route.

---

## 2. Implementation plan

### 2.1 Data model changes (new tables + one field)

All follow repo conventions (serial id, snake_case, `numeric(10,2)` money, `defaultNow().notNull()` timestamps).

**`bookings` (add one field):**
- `docusignEnvelopeId text` — manual reference to the signed master agreement (no DocuSign API; you paste/enter it). Optional `docusignCompletedAt timestamp`.

**`addon_requests`** — the artist-created request (status lives here):
```
id serial pk
bookingId        → bookings.id (cascade), notNull
token            text notNull unique            -- dedicated per-request token
status           text notNull default 'pending' -- pending|approved|declined|expired|cancelled
artistNote       text
clientNameSnapshot   text notNull               -- snapshot at creation
clientEmailSnapshot  text                        -- snapshot at creation
clientPhoneSnapshot  text                        -- snapshot at creation
docusignEnvelopeIdSnapshot text                  -- snapshot of booking.docusignEnvelopeId
totalAmount      numeric(10,2) notNull default '0'
source           text notNull default 'on_day'  -- on_day|pre_event
createdAt        timestamp defaultNow notNull
decidedAt        timestamp
expiresAt        timestamp
```
> **`status` is only ever set to `approved`/`declined` by the public verified endpoint (§2.4).**

**`addon_request_items`** — snapshot of the selected services (price-locked):
```
id serial pk
requestId    → addon_requests.id (cascade), notNull
serviceItemId → service_items.id (set null)
name         text notNull           -- snapshot
description  text                    -- snapshot
unitLabel    text notNull           -- snapshot
unitPrice    numeric(10,2) notNull  -- snapshot (so later price edits don't change the request)
quantity     integer notNull default 1
lineTotal    numeric(10,2) notNull
sortOrder    integer notNull default 0
createdAt    timestamp defaultNow notNull
```

**`addon_verifications`** — OTP, hashed:
```
id serial pk
requestId        → addon_requests.id (cascade), notNull
codeHash         text notNull       -- HMAC-SHA256(otp, secret); NEVER plaintext
destinationType  text notNull       -- email|sms
destinationMasked text notNull      -- "j***@gmail.com" / "(***) ***-1234"
destination      text notNull       -- exact target used (from snapshot; server-only, never returned)
attempts         integer notNull default 0
maxAttempts      integer notNull default 5
consumedAt       timestamp
expiresAt        timestamp notNull
createdAt        timestamp defaultNow notNull
```

**`addon_audit_events`** — immutable, append-only, denormalized (survives parent deletion):
```
id serial pk
requestId    integer notNull     -- snapshot (no cascade FK, so audit can't be cascade-deleted)
bookingId    integer notNull     -- snapshot
action       text notNull        -- request.created|portal.viewed|verification.sent|
                                  --   verification.failed|verification.verified|
                                  --   addon.approved|addon.declined|request.expired|request.cancelled
actorType    text notNull        -- artist|client|system
verified     boolean notNull default false
amountSnapshot numeric(10,2)
docusignEnvelopeIdSnapshot text
destinationMasked text
ipAddress    text
userAgent    text
detail       text
metadata     text                -- JSON
createdAt    timestamp defaultNow notNull
```
> Append-only enforced at app layer (no update/delete code path). **True DB-level immutability** (REVOKE UPDATE/DELETE on the table, or a `BEFORE UPDATE/DELETE` trigger that raises) is **outside drizzle push** and needs a one-time manual SQL statement on Supabase — see §8.4.

### 2.2 API endpoints

**Admin (authed, on `router`) — new `routes/addons.ts`:**
- `POST /bookings/:id/addon-requests` — create request: pick service items + quantities + note; **snapshots** client contact, docusign envelope id, and service data; mints token; `status='pending'`; writes `addon_audit_events(action='request.created', actorType='artist')`. Returns the request + the `/a/:token` portal URL. **Does not, and cannot, set `approved`.**
- `GET /bookings/:id/addon-requests` — list (read-only status for the artist).
- `GET /addon-requests/:id` — detail.
- `POST /addon-requests/:id/cancel` — cancel a *pending* request (`status='cancelled'`, audit). The only status write the artist can make — and it can never be `approved`/`declined`.
- `PATCH /bookings/:id` (existing, extended) — set `docusignEnvelopeId`.

**Public (unauthed, token-gated, on `publicRouter`) — new `routes/public-addons.ts`:**
- `GET /public/addon/:token` — load request payload (items, prices, total, booking headline, masked destination, status). Audit `portal.viewed`.
- `POST /public/addon/:token/send-code` — generate OTP, store **hash**, send to the snapshot contact, rate-limited. Audit `verification.sent`. **Dev-only echo** of the code (response + log) **gated off whenever `GLAM_ADMIN_PASSWORD` is set** (i.e., prod-like).
- `POST /public/addon/:token/approve` — body `{ code }`. Verify hash + not-expired + not-consumed + attempts<max. On success: `status='approved'`, `decidedAt=now`, consume OTP, audit `verification.verified` + `addon.approved (actorType='client', verified=true, ip, ua)`, surface balance (§2.6).
- `POST /public/addon/:token/decline` — body `{ code }` (verified, so the decline is attributable). `status='declined'`, audit `addon.declined`.

All new endpoints get added to the OpenAPI YAML + codegen (§1.7).

### 2.3 Token + client-verification design

1. Artist creates request → dedicated token (`generateToken()`), short link `/a/:token`. Token has optional `expiresAt`.
2. Client opens `/a/:token` → sees the add-on(s), description, price, total, and a masked destination ("we'll text a code to (***) ***-1234").
3. Client taps "Send code" → 6-digit OTP generated, **hashed at rest**, sent to the **snapshotted** contact only.
4. Client enters code → server verifies the hash; on success the Approve/Decline buttons act and the verified action is recorded.
5. OTP: 6 digits, ~10-min expiry, max 5 attempts, single-use (`consumedAt`). Never returned by any authed endpoint; never logged in prod.

### 2.4 The integrity guarantee — how the artist is server-side blocked

This is enforced **architecturally**, not by UI hiding:

1. **Approval transition exists only on the public router.** The function that sets `status ∈ {approved, declined}` lives solely in `public-addons.ts` handlers, which sit *before* `authRequiredMiddleware` and require a valid token **and** a valid OTP. There is deliberately **no authed endpoint** that can set those statuses. The artist's authed surface can only `create (pending)`, `cancel`, and `read`.
2. **OTP hashed at rest** → even with full DB read access the artist can't recover the code to self-enter. (This is what actually blocks self-approval given the operator's inherent DB access — stronger than "no authed endpoint.")
3. **Contact snapshot at creation** → the OTP is sent only to the client contact captured when the request was made; editing the client record afterward can't redirect the code. The exact destination is written into the audit.
4. **Append-only audit** with `actorType` + `verified` + ip/ua, denormalized so it survives parent deletion.
5. **DocuSign linkage** → each approval snapshots the booking's `docusignEnvelopeId`, completing the chain: *DocuSign master → verified add-on approval → audit → balance*.

See §3 for the honest limits of this (single-operator tamper-*evidence* vs. tamper-*proofing*).

### 2.5 Audit log immutability

- App layer: no update/delete code touches `addon_audit_events`; every state change appends a row.
- DB layer (recommended, manual): `REVOKE UPDATE, DELETE ON addon_audit_events FROM <app_role>;` or a trigger raising on UPDATE/DELETE. One-time SQL on Supabase — your call (§8.4).

### 2.6 Balance integration (chosen model)

**Approved add-ons are a separate first-class amount, not booking line items.** `grandTotal` and `retainerAmount` are left untouched (avoids the 25% under-bill and the grouping-dedup collision, and keeps the core money path unmodified).

- Define `approvedAddonsTotal(bookingId) = Σ addon_requests.totalAmount WHERE status='approved'`.
- Surface it in the API booking/contract/portal payloads and add it to **both** balance formulas found in §1.3 (L200 and L851) so it shows everywhere consistently.
- In the UI/portal, render it as its own line: "Approved add-ons: $X" and a "Total due (incl. add-ons)" so it's transparent and audit-friendly.
- Add-ons bill at **100%** (no retainer split) — they're post-signing amendments.

> This is the single biggest semantics decision — confirm in §8.1.

### 2.7 Piece 1 — Add-On Request → Verified Approval (admin + portal)

- **Admin UI** (`booking-detail.tsx`): "Request Add-On" → dialog listing active services (live from `GET /services`, qty + note) → creates request → shows the `/a/:token` link + status. A requests list shows each request's status (read-only). Cancel button for pending.
- **Client portal** (`/a/:token`, new mobile-first page): add-on summary → send code → enter code → Approve / Decline.
- On approve: audit + balance surface. On decline: audit. Notification to artist on both.

### 2.8 Piece 2 — Pre-event Upgrade Menu (PDF + portal)

- **PDF**: new admin print view `/bookings/:id/upgrade-menu` reusing `Section`/`Th`/`Td`/`.contract-print-page`/`window.print()` and artist branding — populated live from `GET /services` (no hard-coded amounts).
- **Portal menu**: `/a-menu/:token` (mobile-first) listing add-ons; client pre-selects → creates a `source='pre_event'` request → same verify+approve flow. Pre-approval ahead of the day, same audit chain.
- **Curation**: optionally add `service_items.show_on_upgrade_menu boolean default true` so you choose what appears (§8.5).

### 2.9 Piece 3 — Mobile-friendly client view

- Portal pages built mobile-first: single column, ≥44px tap targets, no horizontal scroll, minimal steps (view → code → approve), large legible type. Reuse the existing portal shell aesthetic.
- Artist admin stays desktop-first. This is a responsive website — no native app tooling.

---

## 3. Integrity threat model (what you asked me to flag)

**Honest framing:** this is a single-operator, self-hosted app. The artist owns the server, the database, and the code, and can execute SQL directly. **Tamper-*proofing* against the operator themselves is not achievable** without an external party holding the state (e.g., keeping add-ons on DocuSign too, or a notarization service). The achievable and appropriate goal — and the words you used — is **tamper-*evident*** proof that a verified client action occurred. Here's each vector:

| # | Attack | Mitigation | Residual |
|---|---|---|---|
| A | Artist hits an authed endpoint to mark approved | No such endpoint exists; approval only on public OTP-gated route | None (by construction) |
| B | Artist reads the OTP from DB/logs and self-enters | OTP hashed at rest; never logged in prod; dev-echo off when `GLAM_ADMIN_PASSWORD` set | Artist could read the code from the **SMS/email provider dashboard** if they own it — audit records the destination, so it's evident it went to the client's number |
| C | Artist changes client contact to their own, then sends code to self | Contact **snapshotted at request creation**; destination written to audit | Artist could change contact *before* creating the request — tamper-evident via audit + the client noticing the wrong number; optional future check against DocuSign signer contact |
| D | Artist edits/forges an audit row directly in the DB | App never updates/deletes audit rows | **Needs DB-level REVOKE/trigger** for real protection (§8.4) — otherwise direct SQL is possible |
| E | Token/link leaks | OTP still required; add token `expiresAt` + one active request | Possession of link alone is insufficient |

**Bottom line:** hashed OTP + approval-only-on-public-route + snapshotted contact + append-only audit + DocuSign envelope linkage gives a strong tamper-evident chain suitable for backing the "in-writing changes are valid" clause. The one upgrade that converts "evident" toward "proof against the operator" is **DB-level audit immutability** (§8.4); the rest is inherent to self-hosting.

---

## 4. Build order (once approved)

1. Schema (tables + `bookings.docusignEnvelopeId`) → `db:push` **(needs your go-ahead — live Supabase)**.
2. OpenAPI YAML + codegen for the new endpoints.
3. Notify abstraction + dev provider (console/echo, prod-gated).
4. Admin: create/list/cancel requests + docusign-id field.
5. Public: load + send-code + approve/decline + audit.
6. Balance surfacing (both formulas + payloads).
7. Upgrade Menu PDF + portal menu.
8. Mobile polish + accessibility pass.
9. Wire real SMS/email provider **(needs your credentials)**.

---

## 5. What I changed tonight (only this)

- `artifacts/glam-crm/src/pages/portal.tsx`: replaced the `dangerouslySetInnerHTML` raw-JSON contract dump with a `ContractBody` component that parses the template JSON and renders each clause as a titled, readable block; falls back to safe plain text for non-JSON bodies. Display-only; not a signing change; removes an XSS surface. (Details in the response.)

Nothing else was built. The three pieces await your sign-off on §8.

---

## 6. Decisions I need from you (§8 — the gate)

> Listed in the response that accompanies this file; mirrored here for the record.

1. **Balance model** — approve the separate first-class add-on amount (recommended), or fold into grandTotal/line-items?
2. **Verification channel + provider** — SMS (Twilio), email (Resend/SMTP), or both? (Needs your paid account + credentials; dev-echo works until then.)
3. **DocuSign** — confirm a manual `docusignEnvelopeId` field (no API integration) for now?
4. **Audit immutability** — app-level only, or also DB-level REVOKE/trigger (one-time manual SQL on Supabase)?
5. **Upgrade-menu curation** — show all active services, or add a `show_on_upgrade_menu` flag?
6. **Pre-approval semantics** — does a pre-event approval immediately add to balance (recommended), or stay "pre-approved, confirm on day"?
7. **OTP destination** — prefer SMS→phone with email fallback, or email-only?
8. **Decline** — require OTP to decline (recommended, attributable) or allow unverified decline?
9. **Dev database** — do you have a local Postgres for testing, or is the only DB the live Supabase one? (Affects how I verify before any prod push.)
