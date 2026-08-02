# Makeup Artist Hub Plan

## Milestone 1: Local Development Migration

### Work Package 1.1: Remove Replit Runtime Assumptions

Status: Complete.

Acceptance criteria:
- The frontend can run locally without requiring Replit-only environment variables.
- Replit-only Vite plugins are removed from the active app runtime.
- Local Vite defaults are explicit and documented.

Validation commands:
- `pnpm --filter @workspace/glam-crm run typecheck`
- `pnpm --filter @workspace/glam-crm run build`

### Work Package 1.2: Local API Defaults

Status: Complete.

Acceptance criteria:
- The API can start locally with a documented default port.
- Required database setup is explicit.
- `/api/healthz` responds when the API is running.

Validation commands:
- `pnpm --filter @workspace/api-server run typecheck`
- `pnpm --filter @workspace/api-server run build`
- `curl http://localhost:8787/api/healthz`

### Work Package 1.3: Local Database Setup

Status: Complete.

Acceptance criteria:
- Local setup has a clear Postgres path that does not depend on Replit.
- Schema push command is documented.
- Missing local tooling is called out clearly.

Validation commands:
- `pnpm --filter @workspace/db run push`

### Work Package 1.4: Browser Smoke Test

Status: Complete.

Acceptance criteria:
- Frontend loads in the built-in browser.
- First meaningful screen renders.
- No framework error overlay is visible.
- Relevant browser console warnings/errors are captured and explained.
- At least one primary navigation or UI interaction is exercised.

Validation commands:
- `pnpm run typecheck`
- Built-in Browser page identity, DOM, console, screenshot, and interaction checks.

### Work Package 1.5: Production-Data Local Sandbox

Status: Complete.

Acceptance criteria:
- A fresh production data dump can be read from Supabase without issuing production writes.
- The dump restores into a distinct local Postgres database named `makeup_artist_hub_prod_snapshot`.
- Local API writes target only the snapshot database, with the reminder runner and outbound Gmail settings disabled for the sandbox session.
- The built-in Browser opens the snapshot-backed CRM and calendar.

Validation commands:
- PostgreSQL 17 `pg_dump` against `SUPABASE_DIRECT_DATABASE_URL` with no write statements.
- `pg_restore --schema=public` into `makeup_artist_hub_prod_snapshot`.
- `curl http://127.0.0.1:8787/api/healthz`.
- `curl http://127.0.0.1:8787/api/bookings` and `/api/clients`.
- Built-in Browser validation on `http://localhost:5173/calendar`.

### Work Package 2.13: Apple Calendar Subscription Reliability

Status: Complete.

Acceptance criteria:
- The existing tokenized feed remains read-only and keeps a stable calendar identity and event UIDs.
- Event `SEQUENCE` values change when relevant booking/event/payment fields change so subscribed clients can reconcile updates.
- The feed advertises a refresh interval, returns revalidation-friendly cache headers/ETag, and includes Apple-readable timezone, status, privacy, location, and notes fields.
- The UI provides an Apple Calendar `webcal://` handoff, a copyable HTTPS feed URL, and clear local-host limitations.
- A configurable `VITE_PUBLIC_CALENDAR_BASE_URL` supports a deployed HTTPS or reachable LAN feed origin.

Validation commands:
- `pnpm --filter @workspace/api-server run typecheck`
- `pnpm --filter @workspace/glam-crm run typecheck`
- `pnpm --filter @workspace/api-server run build`
- `pnpm --filter @workspace/glam-crm run build`
- Fetch `/api/public/calendar/:token.ics` and inspect headers and RFC 5545 fields.
- Browser validation of the subscription dialog and mobile event-detail interaction on `/calendar`.

### Work Package 2.14: Multi-Event Calendar Fidelity

Status: In progress.

Acceptance criteria:
- Every non-deleted booking event is represented as its own distinguishable calendar item, including multiple event dates under one booking.
- Each unpaid booking's explicit balance due date (or documented day-before-service fallback) is represented once and is visually distinguishable from service events.
- Changes to any field rendered into an event or due reminder change the subscription representation and the local calendar view on the next fetch.
- Cancelled and paid booking state does not create misleading outstanding-balance reminders.
- Local production-derived data remains isolated from the hosted production database during validation.

Validation commands:
- `pnpm --filter @workspace/api-server run typecheck`
- `pnpm --filter @workspace/glam-crm run typecheck`
- `pnpm --filter @workspace/api-server run build`
- `pnpm --filter @workspace/glam-crm run build`
- Fetch the local tokenized feed and compare event UIDs, `SEQUENCE`, ETag, and descriptions before/after a reversible local booking update.
- Browser validation of a booking with multiple event rows and its due reminder on `/calendar`.

### Work Package 2.15: Responsive Desktop Calendar Preview

Status: Complete.

Acceptance criteria:
- Mac/desktop widths retain the full seven-column month view plus the existing week/day modes.
- Narrower computer/tablet widths preserve the full calendar canvas with controlled horizontal scrolling instead of collapsing into an agenda or squeezing day cells.
- The mobile agenda is limited to the mobile breakpoint where the full grid is not usable.
- Clicking any calendar event opens a booking preview with the selected event context, booking schedule, status, financial summary, and a route to the full booking.
- The preview and responsive layout work without changing API or database contracts.

Validation commands:
- `pnpm --filter @workspace/glam-crm run typecheck`
- `pnpm --filter @workspace/glam-crm run build`
- Browser validation at `430x932`, `1024x900`, `1221x1138`, and `1440x900`.
- Browser interaction validation: click an event, confirm the booking preview, and follow `Open full booking`.

## Metrics

- Local install succeeds on macOS.
- API startup succeeds after local database setup.
- Frontend startup succeeds without Replit environment variables.
- Browser smoke test reaches the dashboard route.

### Work Package 2.19: Dashboard Period Insights and Compact Expense Ledger

Status: In progress — desktop and responsive source validation passed; a dedicated 430x932 browser run remains pending because the available in-app browser session cannot resize its viewport.

Acceptance criteria:
- Dashboard financial summary tiles explain their scope and link to the relevant workflow.
- Dashboard provides a week/month pulse with scheduled booking count, booked value, expenses, and net outlook.
- Expense summary cards can filter the ledger by month, year, or all time, while category filtering remains available.
- Mobile expense rows are compact 44px-target tap surfaces that open a detail preview and an edit path; desktop keeps the dense ledger layout.
- Expense preview/edit preserves receipt label, SKU, payment, business-use, and review notes without writing until the user saves an edit.

Validation commands:
- `pnpm --filter @workspace/glam-crm run typecheck`
- `pnpm --filter @workspace/glam-crm run build`
- `pnpm run typecheck`
- Browser validation at `430x932` and desktop dashboard/expenses widths, including period filter, category filter, row preview, and edit save.

### Work Package 2.20: Shareable Bridal Services Menus

Status: In progress - initial General and Florida visual direction generated and validated; awaiting user review before design approval.

Visual thesis:
- Present GLAMBYEASMIN as an elevated bridal beauty studio through warm ivory, restrained burgundy or plum, subtle champagne accents, refined editorial typography, and generous whitespace.
- Keep the menus luxurious, calm, and highly legible, avoiding stock photography, crowded decoration, generic wedding clip art, or overly delicate text that fails on phones.
- Build one coherent art direction across the PDF, share-image, and responsive CRM preview, then expose the first rendered preview for user direction before finalizing.

Acceptance criteria:
- A general services menu and a Florida services menu are generated as separate print-quality PDFs under stable, descriptive filenames in `output/pdf/`.
- Each edition provides two high-resolution PNG share images, one per PDF page, so details remain readable in messages and social DMs instead of being compressed into one tall image.
- Both editions preserve the approved service descriptions, add-ons, requirements, offers, travel fees, early-morning fees, and full-glam specialty note without introducing unapproved pricing or claims.
- The general edition lists Bridal Bundle at `$600 (each event)`; the Florida edition lists Bridal Bundle at `$675 (each event)`. All other supplied prices remain identical across editions.
- The pricing hierarchy remains unambiguous, including Signature Bridal Package at `$700`, Special Bridal Offer at `$700 (each event)`, free `$150` Bridal Makeup Trial for 2 or more bridal events, and `$25 off each day` when booking 3 or more bridal services under the Bridal Bundle.
- PDFs use embedded fonts, print-safe margins, sharp vector text, selectable/extractable copy, and no clipped, overlapping, missing, or substituted glyphs.
- The CRM provides a prominent, easy-to-find, responsive services-menu surface with clear General and Florida selection, in-app preview, PDF download, PNG download, and native share when supported with a clear fallback when it is not.
- The preview and controls work at mobile and desktop sizes, use accessible labels and touch targets, and do not require navigating into an obscure settings-only area.
- Generated assets are static and public-safe and contain no client, booking, contract, payment, receipt, or other private CRM data.
- No API contract or database change is required for the first static-asset implementation.
- The user reviews the initial rendered preview before the visual direction is considered final.

Validation commands:
- `pnpm --filter @workspace/glam-crm run typecheck`
- `pnpm --filter @workspace/glam-crm run build`
- `pnpm run typecheck`
- `pdfinfo output/pdf/glambyeasmin-services-general.pdf` and `pdfinfo output/pdf/glambyeasmin-services-florida.pdf`.
- `pdffonts` on both PDFs to confirm every production font is embedded.
- `pdftotext -layout` on both PDFs, followed by a pricing/copy comparison confirming `$600` appears only in the general Bridal Bundle and `$675` appears only in the Florida Bridal Bundle.
- `pdftoppm -png -r 180` for both PDFs, followed by visual inspection of every rendered page for spacing, hierarchy, clipping, legibility, and edition labeling.
- Inspect all four final PNG share images at original size and a phone-width preview; confirm readable type, expected dimensions, and no compression artifacts.
- Browser validation of menu discovery, edition switching, preview, PDF download, PNG download, native-share support/fallback, and responsive behavior at `430x932`, `768x1024`, and `1440x900`.
- `git diff --check`.

## Rollback Conditions

- Local migration requires replacing generated source files wholesale.
- Database setup would require destructive local database operations without approval.
- A package update introduces unrelated large dependency churn.
- Deployment would expose CRM data without authentication.
- Shared Render routing breaks existing WhisperSpeechServer health or websocket behavior.

## Milestone 2: Services, Fees, and Contract Line Items

### Work Package 2.1: Contract Reference Review

Status: Complete.

Acceptance criteria:
- Sample contract service/fee structure is inspected visually and by text extraction.
- Relevant findings are recorded in `Documentation.md`.

Validation commands:
- `pdfinfo /Users/iftatbhuiyan/Downloads/SampleContract.pdf`
- `pdftotext -layout /Users/iftatbhuiyan/Downloads/SampleContract.pdf ...`
- `pdftoppm -png /Users/iftatbhuiyan/Downloads/SampleContract.pdf ...`

### Work Package 2.2: Service Catalog Data Model and API

Status: Pending.

Acceptance criteria:
- Reusable services/fees can be stored locally.
- Bookings can store selected service/fee line items.
- API responses expose booking line items for UI and contract output.

Validation commands:
- `pnpm --filter @workspace/api-spec run codegen`
- `pnpm --filter @workspace/db run push`
- `pnpm --filter @workspace/api-server run typecheck`

### Work Package 2.3: Booking Intake UI

Status: Pending.

Acceptance criteria:
- New booking intake lets the user pick reusable services/fees.
- New booking intake can capture an optional makeup trial date, timing, and amount.
- Makeup trial amount persists as a booking charge and appears in contract pricing.
- User can adjust quantity, unit price, and notes per selected line item.
- Selected line items affect booking totals and persist through the API.

Validation commands:
- `pnpm --filter @workspace/glam-crm run typecheck`
- Browser validation on `http://localhost:5173/bookings/new`

### Work Package 2.4: Contract Output

Status: Pending.

Acceptance criteria:
- Generated contract shows selected services and fees clearly.
- Existing event/service schedule remains readable.
- Contract totals reflect selected service/fee line items.

Validation commands:
- Browser validation on a generated contract route.
- `pnpm --filter @workspace/glam-crm run build`
- `pnpm run typecheck`

### Work Package 2.5: Inline Client Intake

Status: Complete.

Acceptance criteria:
- New booking intake captures client name and contact information directly.
- Client phone is captured as a complete 10-digit phone number before contract generation.
- Submitting the intake creates the client record automatically before creating the booking.
- The booking still links to the created client and the generated contract uses that client information.
- The intake no longer requires selecting from an existing-client dropdown.

Validation commands:
- `pnpm --filter @workspace/glam-crm run typecheck`
- Browser validation on `http://localhost:5173/bookings/new`
- Browser validation on the generated booking detail and contract route.

### Work Package 2.6: Booking History and Audit Trail

Status: Complete.

Acceptance criteria:
- Booking detail exposes a chronological history of meaningful booking, event, payment, and contract-related changes.
- History records are stored in the local database with timestamps, action labels, and human-readable descriptions.
- Main booking mutations create audit entries without requiring the user to type separate notes.
- The booking detail UI has a clear History surface that can be reviewed alongside events and financials.

Validation commands:
- `pnpm --filter @workspace/api-spec run codegen`
- `pnpm --filter @workspace/db run push`
- `pnpm --filter @workspace/api-server run typecheck`
- `pnpm --filter @workspace/glam-crm run typecheck`
- Browser validation on `http://localhost:5173/bookings/1`

### Work Package 2.7: Event-Level Service Assignment

Status: In progress.

Acceptance criteria:
- Selected booking services and fees can be assigned to a specific booking event or left as booking-level items.
- Booking detail makes the event assignment clear and editable.
- Contract pricing groups assigned services under their event, while unassigned items remain booking-level charges.

Validation commands:
- `pnpm --filter @workspace/api-spec run codegen`
- `pnpm db:push`
- `pnpm --filter @workspace/api-server run typecheck`
- `pnpm --filter @workspace/glam-crm run typecheck`
- `pnpm --filter @workspace/glam-crm run build`
- Browser validation on `http://localhost:5173/bookings/2`
- Browser validation on `http://localhost:5173/bookings/2/contract`

### Work Package 2.8: Artist Profile Management

Status: In progress.

Acceptance criteria:
- Sidebar navigation includes an Artist page.
- The Artist page lets the artist edit business name, artist name, email, phone, payment method, and supporting details.
- Saved artist details persist in the local database.
- Contract output uses the saved artist name, email, phone, and default payment method when applicable.

Validation commands:
- `pnpm --filter @workspace/api-spec run codegen`
- `pnpm db:push`
- `pnpm --filter @workspace/api-server run typecheck`
- `pnpm --filter @workspace/glam-crm run typecheck`
- `pnpm --filter @workspace/glam-crm run build`
- `pnpm run typecheck`
- Browser validation on `http://localhost:5173/artist`
- Browser validation on `http://localhost:5173/bookings/2/contract`

### Work Package 2.9: Contract Template Management

Status: In progress.

Acceptance criteria:
- Sidebar navigation includes a contract templates page.
- The current makeup and hair service agreement appears as the locked, non-editable default contract template.
- Users can add editable templates as copies of the default agreement.
- Users can archive and edit non-default user-created contract templates.
- Template editing shows a full contract-style preview with demo auto-populated values.
- Editable template language is separated from demo fields that the app auto-populates.
- New booking intake lets the user choose the contract template for the booking.
- Booking detail lets the user review and change the selected contract template.
- Generated contract data includes the selected booking template.

Validation commands:
- `pnpm --filter @workspace/api-spec run codegen`
- `pnpm db:push`
- `pnpm --filter @workspace/api-server run typecheck`
- `pnpm --filter @workspace/glam-crm run typecheck`
- `pnpm --filter @workspace/glam-crm run build`
- `pnpm run typecheck`
- Browser validation on `http://localhost:5173/contract-templates`

### Work Package 2.10: UI and UX Polish

Status: In progress.

Acceptance criteria:
- Core navigation, page headers, cards, lists, and empty states follow one visual language.
- Dashboard and list screens show stronger visual hierarchy and improved whitespace rhythm.
- Primary actions and destructive actions are visually distinct with clear affordance.
- No changes to API contracts, server routes, or data model behavior.
- The polish pass is documented in `Documentation.md` with validation outputs.

Validation commands:
- `pnpm --filter @workspace/glam-crm run typecheck`
- `pnpm --filter @workspace/glam-crm run build`
- Browser visual smoke check on `/`, `/bookings`, `/clients`, `/services`, `/artist`, and `/contracts`.

### Work Package 2.11: Expense Tracking

Status: Complete.

Acceptance criteria:
- Sidebar navigation includes an Expenses page and no longer includes Automations.
- Expenses can record item name, category, amount, expense date, optional vendor, optional payment method, optional notes, optional receipt image/scan, business-use flag, and reimbursable flag.
- Expenses can be reviewed, searched, summarized by category, and archived without deleting history.
- Dashboard financial trackers include expense totals and net revenue context.
- The implementation keeps generated API client and Zod files generated from `lib/api-spec/openapi.yaml`.

Validation commands:
- `pnpm --filter @workspace/api-spec run codegen`
- `pnpm db:push`
- `pnpm --filter @workspace/api-server run typecheck`
- `pnpm --filter @workspace/glam-crm run typecheck`
- `pnpm --filter @workspace/glam-crm run build`
- Browser validation on `http://localhost:5173/expenses`
- Browser validation on `http://localhost:5173/`

## Milestone 3: Low-Cost Production Deployment

### Work Package 3.1: GitHub Pages Frontend

Status: In progress.

Acceptance criteria:
- GitHub Actions builds the Vite frontend from `artifacts/glam-crm`.
- GitHub Pages uses `/YeasminGlamDashboard/` as the frontend base path.
- Client-side routes work after refresh through a `404.html` SPA fallback.
- The built frontend calls the shared Render Glam API base URL instead of same-origin `/api`.

Validation commands:
- `pnpm --filter @workspace/glam-crm run typecheck`
- `pnpm --filter @workspace/glam-crm run build`
- GitHub Actions Pages deployment on `main`.

### Work Package 3.2: Shared Render API Mount

Status: In progress.

Acceptance criteria:
- The Makeup Artist Hub API can be imported as a mountable bundle.
- WhisperSpeechServer serves Glam CRM routes only under `/glam-api/api`.
- Existing WhisperSpeechServer `/health` and websocket behavior remain unchanged.
- Glam CRM API requires an admin password session before exposing CRM data.

Validation commands:
- `pnpm --filter @workspace/api-server run typecheck`
- `pnpm --filter @workspace/api-server run build`
- `npm test` in `/Users/iftatbhuiyan/WhisperSpeechServer`
- Local `curl` checks for `/health`, `/glam-api/api/healthz`, unauthenticated `/glam-api/api/clients`, and authenticated `/glam-api/api/clients`.

### Work Package 3.3: Supabase Postgres Migration

Status: Complete.

Acceptance criteria:
- Supabase project exists for Makeup Artist Hub.
- Supabase Postgres schema exists through the restored production data snapshot.
- Latest local CRM data backup is restored to Supabase.
- Render has `GLAM_DATABASE_URL` pointing at Supabase.

Validation commands:
- `DATABASE_URL=<supabase-url> pnpm --filter @workspace/db run push`
- `psql <supabase-url> < data/backups/makeup_artist_hub-20260519-030003.sql`
- `curl https://whisperflowserver.onrender.com/glam-api/api/healthz`

### Work Package 2.16: Client Social Profiles

Status: Complete.

Acceptance criteria:
- Client records support zero or more social/profile entries with a platform name, display handle, and optional direct URL.
- New-client intake and client detail editing can add, remove, and update social/profile entries.
- Client detail displays saved entries as direct links that open safely in a new tab.
- Booking detail loads the current linked client record and displays the same social/profile entries, with a route to edit the client when needed.
- Social profile data remains internal CRM data and is not emitted by public calendar or client-portal responses.
- The local production-derived snapshot is the only database write target during validation.

Validation commands:
- `pnpm --filter @workspace/api-spec run codegen`
- `DATABASE_URL=postgresql://$USER@127.0.0.1:5432/makeup_artist_hub_prod_snapshot pnpm --filter @workspace/db run push`
- `pnpm --filter @workspace/api-server run typecheck`
- `pnpm --filter @workspace/glam-crm run typecheck`
- `pnpm --filter @workspace/glam-crm run build`
- `pnpm run typecheck`
- Browser validation on `/clients/new`, `/clients/:id`, and `/bookings/:id`.

### Work Package 2.17: Separate Apple Calendar Subscriptions

Status: Complete — split feeds deployed and verified on the production HTTPS API.

Acceptance criteria:
- The calendar subscription dialog presents separate bookings/events and payment-reminders subscriptions with distinct labels and descriptions.
- The bookings feed includes service/trial events only; the reminders feed includes payment-due reminders only.
- Each feed has a stable tokenized URL, distinct calendar identity/name, Apple `webcal://` handoff, copyable HTTPS URL, and downloadable `.ics` file.
- Resetting the calendar feed token invalidates both subscription URLs together and generates fresh URLs.
- Both feeds preserve the existing Apple Calendar refresh, ETag, timezone, privacy, status, and sequence behavior.
- Public calendar output remains CRM-safe and does not expose client social profile data.
- The deployed shared API serves both split feed routes without a CRM session; the unguessable feed token remains the authorization boundary.

Validation commands:
- `pnpm --filter @workspace/api-server run typecheck`
- `pnpm --filter @workspace/glam-crm run typecheck`
- `pnpm --filter @workspace/api-server run build`
- `pnpm --filter @workspace/glam-crm run build`
- Fetch both local tokenized feeds and verify their event classes, distinct calendar identities, ETags, and update behavior.
- Fetch both deployed HTTPS feed URLs without a session and verify HTTP 200 plus `text/calendar` after syncing the embedded Render bundle.
- Browser validation of the split subscription dialog and both Apple Calendar actions on `/calendar`.

### Work Package 2.18: Mobile Receipt Capture and Itemization

Status: In progress — local OCR, Gemini, review, and isolated write path validated; deployed Render validation remains.

Acceptance criteria:
- Expenses presents receipt capture as the primary mobile entry path while preserving a secondary manual-entry path.
- The user can take a receipt photo or choose an image/screenshot and run OCR locally without a paid API or subscription.
- Full-frame phone photos automatically isolate and reconstruct the receipt paper before OCR, while preserving a reviewable image and a safe fallback when edges are uncertain.
- Validation covers a mixed receipt corpus: clean digital layouts, very low-resolution thermal receipts, photographed/angled paper, barcodes, multiple tax lines, discounts, zero-dollar receipts, and long item lists.
- Extraction proposes merchant, purchase date, total, tax, line items, quantities, product/SKU codes when printed, categories, and confidence/reconciliation warnings.
- No OCR result is written automatically; every proposed value is editable and requires explicit review before saving.
- Gemini is optional and runs automatically after local receipt preparation when a server key is configured. The prepared receipt is locally redacted before upload; the user reviews highlighted exceptions and final values before saving.
- Before any Gemini request, detected card, account, authorization, terminal, membership, masked-number, and checksum-valid payment-card-number lines are painted over locally with opaque black rectangles; product UPC/SKU lines remain readable. The user is shown a compact automatic-review status while only the redacted copy is uploaded.
- Gemini uses the currently available low-cost `gemini-3.1-flash-lite` model, keeps `GEMINI_API_KEY` server-side, validates structured output, retains no analysis request in the application, and still requires the ordinary editable review/save step.
- The reviewed receipt can be saved atomically as itemized expenses or as one combined expense, with one shared receipt record instead of duplicating the image per line item.
- The capture, progress, review, correction, save, and fallback/manual states work at a 430x932 mobile viewport and remain usable on desktop.
- Existing expense history, search, summaries, dashboard totals, archival behavior, and legacy receipt attachments remain compatible.

Validation commands:
- `pnpm --filter @workspace/api-spec run codegen`
- Apply only the scoped additive expense-receipt schema changes to `makeup_artist_hub_prod_snapshot`.
- `pnpm --filter @workspace/api-server run typecheck`
- `pnpm --filter @workspace/glam-crm run typecheck`
- `pnpm --filter @workspace/api-server run build`
- `pnpm --filter @workspace/glam-crm run build`
- `pnpm run typecheck`
- Parser fixtures covering common receipt totals, dates, SKU codes, uncertain lines, reconciliation, multiple tax lines, discounts, zero-dollar receipts, and multi-line retail formats such as Home Depot quantity/unit-price receipts.
- Browser validation on `/expenses` for capture, OCR progress/review, item editing, itemized save, combined save, and mobile/desktop layouts.
- API validation for missing-key, invalid-image, provider-error, and valid structured Gemini responses without database writes.
