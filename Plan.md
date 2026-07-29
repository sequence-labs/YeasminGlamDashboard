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
