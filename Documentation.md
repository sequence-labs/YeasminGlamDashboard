# Makeup Artist Hub Documentation


## 2026-05-19 - UI/UX Polish Pass (Start)

Intent:
- Raise the visual polish of the exported CRM web app so the UI feels production-grade and professional.
- Keep behavior unchanged; focus strictly on spacing, hierarchy, typography scale, surface contrast, and interaction affordances.

Scope:
- Frontend (`artifacts/glam-crm`) including global style tokens, shell layout, and primary navigation component.
- No API/client contract or schema changes are planned for this pass.

Planned validation:
- `pnpm --filter @workspace/glam-crm run typecheck`
- `pnpm --filter @workspace/glam-crm run build`
- Browser smoke on key routes (dashboard, bookings, clients, services, artist, contracts) with a visual pass for polish and hierarchy.

## 2026-05-19 - Services Page Polished Catalog Redesign

Start:
- Rework `artifacts/glam-crm/src/pages/services.tsx` so the catalog list and add flow feel production-ready while keeping existing add/edit/archive behavior intact.
- Improve visual hierarchy by grouping active catalog entries into Services and Fees, then separate archived entries while preserving row-level edit controls.

Update:
- Redesigned the `/services` page UI/UX:
  - Added compact count chips for Active, Archived, and Total items.
  - Reworked form layout with stronger hierarchy and updated helper copy.
  - Split active catalog into Services and Fees sections.
  - Grouped archived services and fees into separate sections with clearer empty states.
  - Refined editable row controls with clearer rate preview and consistent focus styling.
- Fixed row archive toggle behavior to disable Archive based on the current row state, preventing confusing action availability after local edits.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run build` passed with existing chunk-size warnings unchanged.
- `curl -s -o /tmp/services-page.html -w "%{http_code}" http://localhost:5173/services` returned `200`.

## 2026-05-19 - UI/UX Polish Pass (Route-Level Finish)

Start:
- Continue polishing remaining visible CRM screens for consistent visual language, spacing, and hierarchy.

Update:
- Updated remaining route-level screens:
  - `artifacts/glam-crm/src/pages/new-booking.tsx`
  - `artifacts/glam-crm/src/pages/new-client.tsx`
  - `artifacts/glam-crm/src/pages/client-detail.tsx`
  - `artifacts/glam-crm/src/pages/booking-detail.tsx`
  - `artifacts/glam-crm/src/pages/not-found.tsx`
  - `artifacts/glam-crm/src/pages/contract-route.tsx`
  - `artifacts/glam-crm/src/pages/contract-view.tsx`
  - `artifacts/glam-crm/src/pages/bridal-contract-view.tsx`
- Applied `crm-page-title`, `crm-page-subtitle`, and `crm-section` patterns to align these screens with dashboard/list services polish.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run build` passed.
- Vite build reported existing large chunk-size warnings, which were unchanged relative to earlier optimized frontend behavior.

## 2026-05-18 - New Booking Phone Optional

## 2026-05-18 - New Booking Payment Method Auto-Fill

Intent:
- Pre-fill payment details in New Booking Intake from saved artist profile defaults so user does not need to type them every time.

Update:
- Updated `artifacts/glam-crm/src/pages/new-booking.tsx`:
  - Added `useGetArtistProfile` fetch.
  - Automatically sets `paymentMethod` to artist profile `paymentMethod` when available and the field is still empty.
  - Kept existing manual override behavior when a value is already entered.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed.

## 2026-05-18 - First Service Date Derived From Events

Start:
- Make booking detail use the first actual service/event date as the booking first service date when a booking has multiple events.

Update:
- Added API synchronization in `artifacts/api-server/src/routes/bookings.ts` so booking `firstServiceDate` is derived from the earliest event date.
- Booking detail and contract responses now serialize `firstServiceDate` from the earliest event, including existing bookings whose stored booking date may be stale.
- Event create, update, and delete now resync the booking first service date after changing the service schedule.

Validation:
- `pnpm --filter @workspace/api-server run typecheck` failed because existing generated API types do not expose `contractTemplateId` in `CreateBookingBody`/`UpdateBookingBody`, while `bookings.ts` already references that field.
- Restarted local API and frontend dev servers.
- API build/start completed through `pnpm dev:api`; server is listening on port `8787`.
- Frontend dev server is listening on `http://localhost:5173/`.
- `curl -s http://localhost:8787/api/bookings/6 | jq '{firstServiceDate, events: [.events[] | {eventName, eventDate}]}'` returned `firstServiceDate: "2026-09-11"` for the Sangeet event before the September 12 events.
- `curl -s http://localhost:8787/api/bookings/6/contract | jq '.booking.firstServiceDate'` returned `"2026-09-11"`.
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/bookings/6` returned `200`.

## 2026-05-18 - Booking Detail Split Count Correction

Start:
- Fix selected service counts after split/edit flows left extra unit rows behind, causing Sangeet Hair Only to display `7 x` even though the edited count is `3`.

Update:
- Updated `artifacts/glam-crm/src/pages/booking-detail.tsx` grouping so a line item with `quantity > 1` is treated as the authoritative edited count for that service/event group.
- Updated the Selected Services & Fees section total and invoice summary to use grouped effective totals instead of raw duplicated split rows.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed.

## 2026-05-18 - Contract View Bundled Split Line Items

Start:
- Fix contract pricing output where split/unit line items printed individually instead of bundled under each event.

Update:
- Updated `artifacts/glam-crm/src/pages/contract-view.tsx` to group selected service/fee line items by service, rate, unit, note, and event assignment before rendering contract tables.
- The contract now treats a multi-quantity edited row as the authoritative count for that grouped service/event, matching booking detail behavior after split/edit flows.
- Rate schedule, event booking charges, booking-level charges, and visible contract totals now use grouped effective line items instead of raw duplicated split rows.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/bookings/6/contract` returned `200`.
- API evidence still shows raw split rows in `booking.lineItems`; the contract bundling is applied in the frontend render path.

## 2026-05-18 - Contract Rate Schedule Deduping

Start:
- Fix the contract Rate Schedule still showing repeated `Hair Only` and `Makeup Only` rows after booking charges were bundled.

Update:
- Updated `artifacts/glam-crm/src/pages/contract-view.tsx` so the Rate Schedule dedupes selected services/fees by service identity, unit rate, and unit label across all event assignments.
- Booking Charges remain grouped by event and quantity, while Rate Schedule now lists each unique service/rate once.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/bookings/6/contract` returned `200`.

## 2026-05-18 - Contract Service Scope Hair Rate Clarification

Start:
- Clarify contract Service Scope so standalone Hair Only uses its actual standalone rate and the discounted combined rate only applies when the same person receives Hair & Makeup.

Update:
- Updated `artifacts/glam-crm/src/pages/contract-view.tsx` to derive standalone makeup, standalone hair, and combined hair-and-makeup rates from selected contract services when available.
- Reworded Service Scope hair language to state that Hair Only is not discounted unless the same person is booked for combined Hair & Makeup.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/bookings/6/contract` returned `200`.

## 2026-05-18 - Contract Custom Hair Scope Clarification

Start:
- Clarify that the Hair & Makeup bundled rate only covers offered hairstyle categories, while custom/outside-category hair must be booked as standalone Hair Only.

Update:
- Updated `artifacts/glam-crm/src/pages/contract-view.tsx` Service Scope hair language to explain eligible bundled hairstyle categories and custom hair routing without mentioning separate stylist hiring.
- Kept standalone Hair Only priced at the standalone hair rate and the combined Hair & Makeup discount limited to eligible combined service recipients.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/bookings/6/contract` returned `200`.

## 2026-05-18 - Contract Currency Formatting Cleanup

Start:
- Clean up contract payment text where retainer and balance amounts rendered with uneven decimal places such as `$1,137.5`.

Update:
- Added shared money formatting in `artifacts/glam-crm/src/pages/contract-view.tsx`.
- Applied the formatter to contract pricing, retainer, remaining balance, cancellation amounts, and travel fee text.
- Updated retainer wording from comma-separated text to `amount due upon signing`.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/bookings/6/contract` returned `200`.

## 2026-05-18 - Contract Client Responsibility Notice

Start:
- Make the client responsibility sentence in Client Preparation and Setup stand out so clients do not miss it.

Update:
- Updated `artifacts/glam-crm/src/pages/contract-view.tsx` to render the preparation-sharing responsibility as an emphasized notice block with a label, gray background, and black left border.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/bookings/6/contract` returned `200`.

## 2026-05-18 - Contract Health Disclosure Notice

Start:
- Make the sanitation and allergies clause stand out as an important health disclosure.

Update:
- Updated `artifacts/glam-crm/src/pages/contract-view.tsx` to render the sanitation/allergies paragraph as an emphasized notice block with a `Required Health Disclosure` label.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/bookings/6/contract` returned `200`.

## 2026-05-18 - Financials Effective Total Alignment

Start:
- Fix booking financials where retainer, balance due, and invoice summary still reflected stale raw split-row totals.

Update:
- Updated `artifacts/glam-crm/src/pages/booking-detail.tsx` financials tab to calculate visible grand total from event subtotals, grouped effective line-item totals, and booking fees.
- Retainer and balance due now derive from that effective total and use consistent currency formatting.
- Updated `artifacts/glam-crm/src/pages/contract-view.tsx` retainer and cancellation-retainer references to use the same effective 25% retainer calculation so the contract and financials agree.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/bookings/6` returned `200`.
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/bookings/6/contract` returned `200`.

## 2026-05-18 - Pending Retainer Invoice Balance Behavior

Start:
- Make the invoice summary show retainer subtraction only after the retainer payment is marked paid.

Update:
- Updated `artifacts/glam-crm/src/pages/booking-detail.tsx` so the invoice summary hides the retainer credit while `booking.retainerPaid` is false.
- Balance Due now equals the full effective grand total while retainer is pending, and subtracts the retainer only after the retainer switch is marked paid.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/bookings/6` returned `200`.

## 2026-05-18 - Contract Booking-Level Charge Group

Start:
- Separate booking-level services and fees from event-specific charge groups in the contract pricing table.

Update:
- Updated `artifacts/glam-crm/src/pages/contract-view.tsx` so booking-level selected line items and booking-level fees render under a `Booking-Level Charges` row instead of appearing immediately after the last event group.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/bookings/6/contract` returned `200`.

## 2026-05-18 - Contract Booking Charges Header Wording

Start:
- Simplify the Booking Charges table first-column wording.

Update:
- Changed the contract Booking Charges header from `Selected Service / Fee` to `Service / Fee` in `artifacts/glam-crm/src/pages/contract-view.tsx`.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/bookings/6/contract` returned `200`.

## 2026-05-18 - Contract Makeup Cut Crease Exclusion

Start:
- Add cut crease to the makeup scope exclusions.

Update:
- Updated `artifacts/glam-crm/src/pages/contract-view.tsx` Service Scope makeup paragraph to state that cut crease is not included unless agreed in writing.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/bookings/6/contract` returned `200`.

## 2026-05-19 - Bookings List Effective Total Sync

Start:
- Fix the bookings list total so it matches booking detail and contract effective totals after split/group corrections.

Update:
- Updated `artifacts/api-server/src/routes/bookings.ts` so booking total recomputation and list serialization use effective grouped line-item totals.
- The `/api/bookings` list now returns corrected `grandTotal` and `retainerAmount` values instead of stale raw split-row totals.

Validation:
- `pnpm --filter @workspace/api-server run build` passed.
- Restarted local API server on port `8787`.
- `curl -s http://localhost:8787/api/bookings | jq '.[] | select(.id == 6) | {id, grandTotal, retainerAmount}'` returned `grandTotal: 3950` and `retainerAmount: 987.5`.
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/bookings` returned `200`.

## 2026-05-19 - Revert Contract Hair Combo Scope Wording

Start:
- Undo the Hair & Makeup combo-specific Service Scope wording because it was added by mistake.

Update:
- Updated `artifacts/glam-crm/src/pages/contract-view.tsx` to restore the simpler Hair scope paragraph using the standalone hair rate and offered hairstyle categories.
- Preserved the makeup cut-crease exclusion and other contract presentation fixes.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/bookings/6/contract` returned `200`.

## 2026-05-19 - Contract Non-Bridal Hair Scope Wording

Start:
- Clarify that the hair rate in Service Scope is for non-bridal party/event hair, not bridal hair planning or bridal styling.

Update:
- Updated `artifacts/glam-crm/src/pages/contract-view.tsx` hair scope text to state that the standalone hair rate applies to non-bridal party/event hair services.
- Added language excluding bridal hair planning, bridal hair design, elaborate bridal styling, and advanced/custom hair services unless separately agreed in writing.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/bookings/6/contract` returned `200`.

## 2026-05-19 - Contract Assigned Artists Makeup Assistants

Start:
- Update assigned artists language so assistants or assigned professionals may provide makeup as well as hair.

Update:
- Updated `artifacts/glam-crm/src/pages/contract-view.tsx` assigned artists clause to say makeup and hair may be performed by the Artist, an assistant, second artist, subcontracted stylist, or other assigned professional.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/bookings/6/contract` returned `200`.

## 2026-05-19 - Immediate Split Assignment Flow

Start:
- Fix split behavior where clicking `Split` only queued the split and did not immediately create individual assignable line items.

Update:
- Updated `artifacts/glam-crm/src/pages/booking-detail.tsx` so `Split` immediately persists the split, refreshes booking/list data, and expands the split group.
- The split button now shows `Splitting...` while the operation runs, and the resulting rows can be assigned individually after the refresh.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/bookings/8` returned `200`.

## 2026-05-19 - Drag Reorder Events and Line Items

Start:
- Add drag-and-drop reordering for booking events and selected services/fees on booking detail.

Update:
- Added `sortOrder` to `booking_events` in `lib/db/src/schema/events.ts` and OpenAPI, then regenerated API client/Zod types.
- Updated `artifacts/api-server/src/routes/bookings.ts` to serialize events ordered by `sortOrder`, accept event `sortOrder` updates, and keep list/detail ordering stable.
- Updated `artifacts/glam-crm/src/pages/booking-detail.tsx` with drag handles on event cards and selected service/fee rows.
- Dropping an event rewrites event sort orders; dropping a service/fee row rewrites line-item sort orders.

Validation:
- `pnpm --filter @workspace/api-spec run codegen` passed.
- `pnpm db:push` passed and applied the event `sort_order` column.
- `pnpm --filter @workspace/api-server run build` passed.
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `pnpm --filter @workspace/api-server run typecheck` still fails on the pre-existing generated `contractTemplateId` typing mismatch in `bookings.ts`.
- Restarted local API server on port `8787`.
- `curl -s http://localhost:8787/api/bookings/8 | jq '{events: [.events[] | {id,eventName,sortOrder}], lineItems: [.lineItems[] | {id,name,sortOrder,eventId}]}'` returned ordered events and line items.
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/bookings/8` returned `200`.
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/bookings/6` returned `200`.
- `curl -s http://localhost:8787/api/healthz` returned `{"status":"ok"}`.
- `pnpm --filter @workspace/glam-crm run build` passed (existing sourcemap and chunk-size warnings are unchanged).

Intent:
- Make `Client Phone` optional during New Booking Intake and ensure creation works without it.

Update:
- Updated `artifacts/glam-crm/src/pages/new-booking.tsx`:
  - `clientPhone` validation now accepts empty values and only validates complete numbers when provided.
  - Updated create booking payload to include `phone` only when present.
  - Renamed New Booking form label from `Client Phone *` to `Client Phone` to match optional behavior.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` (first run) failed due to strict `string | undefined` phone typing in submit payload.
- `pnpm --filter @workspace/glam-crm run typecheck` (second run) passed after conditional phone payload patch.
- `pnpm --filter @workspace/glam-crm run build` passed (existing sourcemap and chunk-size warnings are unchanged).

## 2026-05-18 - Contract Payment Header Business Name Fix

Intent:
- Ensure the contract payment section shows the artist business name from Artist Profile, not just the payment method.

Update:
- Updated `artifacts/api-server/src/routes/bookings.ts` so `GET /bookings/:id/contract` always resolves business name from persisted profile data and always includes `artistBusinessName` in the response (with a safe fallback).
- Updated `artifacts/glam-crm/src/pages/contract-view.tsx` to derive a readable label from contract data plus profile name fallback.
- Rebuilt API and regenerated API contracts so frontend types include `artistBusinessName` again.

Validation:
- `pnpm --filter @workspace/api-server run build` passed.
- API restart on port `8787` completed and `/api/bookings/2/contract` now returns `artistBusinessName: "Alyaan Inc."`.
- `pnpm --filter @workspace/api-spec run codegen` passed.
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run build` passed (existing Vite sourcemap warnings noted).
- `pnpm --filter @workspace/api-server run typecheck` still reports pre-existing `contractTemplateId` type mismatches in several booking route payload references and is not considered part of this contract-page fix.

## 2026-05-17 21:58 EDT - Local Migration Start

Intent:
- Understand the exported Replit codebase.
- Remove Replit-specific runtime assumptions.
- Get the web CRM running locally and open it in the built-in Browser.

Initial findings:
- Root control docs were missing and were created in this pass.
- The repo is a pnpm workspace with frontend, API, API contract, generated clients, and DB packages.
- The likely primary app is `artifacts/glam-crm`.
- The API is `artifacts/api-server`.
- The database layer requires PostgreSQL through `DATABASE_URL`.
- `docker` and `psql` are not currently installed on this machine.
- The frontend Vite config currently requires `PORT` and `BASE_PATH`, which came from the Replit environment.
- The Vite config and app dependencies include Replit-only development plugins.
- `node_modules` is currently missing.

Commands run:
- `rg --files ...`
- `sed -n ... package.json`
- `sed -n ... artifacts/glam-crm/vite.config.ts`
- `sed -n ... artifacts/api-server/src/index.ts`
- `sed -n ... lib/db/src/index.ts`
- `node -v`
- `pnpm -v`
- `docker --version`
- `psql --version`
- `git status --short`

Output summary:
- Node: `v25.8.0`
- pnpm: `11.1.1`
- `docker`: command not found
- `psql`: command not found
- Git status was clean before edits.

Next actions:
- Patch local Vite/API defaults.
- Remove Replit package dependencies from active apps.
- Fix pnpm platform overrides that block macOS local dependency installs.
- Install dependencies.
- Decide and validate a local Postgres path.
- Launch the app in the built-in Browser.

## 2026-05-17 22:02 EDT - Local Runtime Patch

Files changed:
- `package.json`
- `artifacts/glam-crm/vite.config.ts`
- `artifacts/glam-crm/package.json`
- `artifacts/mockup-sandbox/vite.config.ts`
- `artifacts/mockup-sandbox/package.json`
- `artifacts/api-server/src/index.ts`
- `artifacts/glam-crm/src/components/ui/button.tsx`
- `artifacts/glam-crm/src/components/ui/badge.tsx`
- `pnpm-workspace.yaml`
- `.env.example`
- `Setup.md`

Changes:
- Added root `dev`, `dev:api`, `dev:web`, and `db:push` scripts.
- Changed the API to default to port `5000` when `PORT` is not set.
- Changed the main frontend to default to port `5173` and base path `/`.
- Added a Vite `/api` proxy from the frontend to the local API target.
- Changed the mockup sandbox to default to port `5174` and base path `/`.
- Removed active Replit Vite plugins and package catalog entries.
- Removed Replit-specific package-manager platform exclusions so macOS can install native optional packages.
- Removed remaining `@replit` source comments in active shared UI primitives.
- Added `.env.example` with local development defaults.

Next validation:
- Run `pnpm install`.
- Run focused typechecks and builds.
- Set up a local Postgres path, push schema, start the API, and open the frontend.

## 2026-05-17 22:04 EDT - Dependency Install Attempt

Command run:
- `pnpm install`

Output summary:
- Dependencies resolved and downloaded.
- Install exited with `ERR_PNPM_IGNORED_BUILDS`.
- Ignored build script: `esbuild@0.27.3`.

Fix plan:
- Approve or rebuild the allowed native dependency build so Vite/esbuild can run locally.

## 2026-05-17 22:05 EDT - Native Build Approval and Install Script Failure

Commands run:
- `pnpm approve-builds esbuild`
- `pnpm install`

Output summary:
- `esbuild@0.27.3` postinstall ran successfully.
- A follow-up `pnpm install` then failed in the root `preinstall` guard with `Use pnpm instead`, even though the command was run through pnpm.

Fix plan:
- Loosen the package-manager guard to accept pnpm user-agent variants used by the local pnpm version.

Follow-up:
- The widened guard still failed because the local pnpm lifecycle did not provide `npm_config_user_agent`.
- Replaced the blocking `preinstall` guard with the standard root `packageManager` declaration: `pnpm@11.1.1`.

Result:
- `pnpm install` now completes successfully.
- `pnpm-lock.yaml` was updated after removing Replit plugin dependencies and localizing platform package behavior.

Note:
- If `minimumReleaseAge` blocks a required package during this migration, use a narrow allowlist entry for the exact trusted package and record the reason here. Do not disable the policy globally.

## 2026-05-17 22:07 EDT - Focused Typecheck Failures

Commands run:
- `pnpm --filter @workspace/glam-crm run typecheck`
- `pnpm --filter @workspace/api-server run typecheck`
- `pnpm --filter @workspace/mockup-sandbox run typecheck`

Output summary:
- `@workspace/mockup-sandbox` typecheck passed.
- `@workspace/api-server` typecheck failed because `@workspace/db` did not export `clientsTable`, `bookingsTable`, `eventsTable`, or `paymentsTable` from its package surface.
- `@workspace/glam-crm` typecheck failed on optional generated fields in booking detail and contract view.

Next actions:
- Patch the DB package export surface.
- Add narrow frontend normalization/defaults where generated API fields are optional but UI calculations require numbers.

## 2026-05-17 22:11 EDT - Typecheck Fixes

Files changed:
- `lib/db/src/index.ts`
- `artifacts/glam-crm/src/pages/booking-detail.tsx`
- `artifacts/glam-crm/src/pages/contract-view.tsx`

Changes:
- Made the DB package export its schema index explicitly.
- Normalized optional booking fees to `0` before invoice/contract calculations.
- Normalized optional artist contact fields for the contract view.
- Updated contract helper functions to tolerate optional generated event count/rate fields while preserving existing defaults.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `pnpm --filter @workspace/api-server run typecheck` passed.
- `pnpm --filter @workspace/db exec tsc -p tsconfig.json --noEmit false` passed.

## 2026-05-17 22:13 EDT - Build Validation

Commands run:
- `pnpm --filter @workspace/glam-crm run build`
- `pnpm --filter @workspace/api-server run build`
- `pnpm run typecheck`

Output summary:
- Frontend build passed.
- API build passed.
- Root typecheck passed.
- Frontend build emitted non-fatal source-map warnings for a few UI components.
- Frontend build emitted a non-fatal large chunk warning for the app bundle.

Remaining validation:
- Local database setup and API runtime.
- Built-in Browser smoke test.

## 2026-05-17 22:15 EDT - Local Postgres Install

Command run:
- `brew install postgresql@16`

Output summary:
- Homebrew installed `postgresql@16` version `16.14`.
- Homebrew initialized a default database cluster at `/opt/homebrew/var/postgresql@16`.

Next actions:
- Start the service.
- Create the local app role/database.
- Push the Drizzle schema.

## 2026-05-17 22:16 EDT - Local Database Ready

Commands run:
- `brew services start postgresql@16`
- `/opt/homebrew/opt/postgresql@16/bin/psql --version`
- `/opt/homebrew/opt/postgresql@16/bin/psql postgres -c "CREATE ROLE makeup_artist_hub WITH LOGIN PASSWORD 'makeup_artist_hub';"`
- `/opt/homebrew/opt/postgresql@16/bin/createdb -O makeup_artist_hub makeup_artist_hub`
- `DATABASE_URL=postgres://makeup_artist_hub:makeup_artist_hub@localhost:5432/makeup_artist_hub pnpm --filter @workspace/db run push`

Output summary:
- Postgres service started successfully.
- Local `psql` reports PostgreSQL `16.14`.
- App role/database were created.
- Drizzle schema push completed with `Changes applied`.

Next actions:
- Start API and frontend.
- Validate `/api/healthz`.
- Open the frontend in the built-in Browser.

## 2026-05-17 22:17 EDT - API Port Conflict

Command run:
- `DATABASE_URL=postgres://makeup_artist_hub:makeup_artist_hub@localhost:5432/makeup_artist_hub pnpm --filter @workspace/api-server run dev`
- `lsof -nP -iTCP:5000 -sTCP:LISTEN`
- `lsof -nP -iTCP:8787 -sTCP:LISTEN`
- `lsof -nP -iTCP:5173 -sTCP:LISTEN`

Output summary:
- API startup failed with `EADDRINUSE` on port `5000`.
- Port `5000` is occupied by macOS `ControlCe`.
- Ports `8787` and `5173` were free.

Fix:
- Changed the local API default from `5000` to `8787`.
- Changed the frontend API proxy default to `http://127.0.0.1:8787`.
- Updated local setup docs and `.env.example`.

## 2026-05-17 22:20 EDT - Local App Runtime and Browser Smoke Test

Commands run:
- `DATABASE_URL=postgres://makeup_artist_hub:makeup_artist_hub@localhost:5432/makeup_artist_hub pnpm --filter @workspace/api-server run dev`
- `curl -sS http://localhost:8787/api/healthz`
- `pnpm --filter @workspace/glam-crm run dev`
- `pnpm run typecheck`
- `pnpm --filter @workspace/glam-crm run build`

Browser validation:
- Opened `http://localhost:5173/` in the built-in Browser.
- Page title: `Glam CRM`.
- Dashboard rendered with active bookings, pending revenue, total clients, and total earned cards.
- No framework error overlay was present.
- Browser console errors/warnings: none relevant, empty result from Browser console check.
- Exercised navigation from Dashboard to Clients.
- Clients route loaded at `http://localhost:5173/clients` and displayed the `New Client` action plus empty client state.
- Saved screenshots:
  - `/tmp/makeup-artist-hub/dashboard-smoke.png`
  - `/tmp/makeup-artist-hub/clients-smoke.png`

Validation summary:
- API health check returned `{"status":"ok"}`.
- Root typecheck passed.
- Frontend build passed with non-fatal source-map warnings and the existing large chunk warning.

Current runtime:
- API server is running on `http://localhost:8787`.
- Frontend dev server is running on `http://localhost:5173`.

## 2026-05-17 22:22 EDT - Local Script Ergonomics

Files changed:
- `package.json`
- `artifacts/api-server/package.json`
- `Setup.md`

Changes:
- Root `db:push` now defaults to the local development database URL when `DATABASE_URL` is not already set.
- API `dev` script now defaults to the local development database URL when `DATABASE_URL` is not already set.
- `Setup.md` now documents `pnpm dev:api` and `pnpm dev`.

Validation:
- `PORT=8788 pnpm --filter @workspace/api-server run dev` reached `Server listening` with no manual `DATABASE_URL`; the test process was then stopped with `SIGINT`.
- `pnpm run typecheck` passed again after script/doc changes.
- `curl -sS http://localhost:8787/api/healthz` returned `{"status":"ok"}`.
- Confirmed current listeners:
  - API: node on TCP `8787`
  - Frontend: node on TCP `5173`

## 2026-05-18 - Services and Contract Feature Start

Intent:
- Inspect `/Users/iftatbhuiyan/Downloads/SampleContract.pdf`.
- Add durable support for reusable services/fees.
- Let booking intake select those services/fees.
- Show selected services/fees clearly in generated contract output.

Milestone:
- Milestone 2, Work Packages 2.1 through 2.4.

Commands run:
- `cat /Users/iftatbhuiyan/.codex/skills/pdf/SKILL.md`
- `cat /Users/iftatbhuiyan/.codex/plugins/cache/openai-curated/build-web-apps/dc902811/skills/frontend-testing-debugging/SKILL.md`
- `cat /Users/iftatbhuiyan/.codex/plugins/cache/openai-curated/build-web-apps/dc902811/skills/react-best-practices/SKILL.md`
- `brew install poppler`

Output summary:
- Poppler was not initially installed.
- Homebrew installed Poppler `26.04.0`.

Next actions:
- Render and extract the sample contract.
- Map current booking intake and generated contract data flow.
- Implement service catalog and booking line items.

## 2026-05-18 - Sample Contract Review and API Contract Draft

PDF findings:
- Sample contract has 4 pages.
- Pricing uses two related tables: a reusable `Service / Fee` rate table and a booking-specific `Event / Fee` calculation table.
- Reusable service rates in the sample are Makeup `$150/person`, Hair `$135/person`, and Hair & Makeup `$285/person`.
- Reusable fees in the sample include Early Morning Fee `$200`, Travel Fee `$150`, and client-caused overtime `$100/hour` billed in 30-minute increments.
- Booking-specific line items snapshot the chosen service, quantity, rate, calculation label, and amount.
- Grand total drives the 25% retainer, remaining balance, and cancellation tiers.

Commands run:
- `pdfinfo /Users/iftatbhuiyan/Downloads/SampleContract.pdf`
- `pdftotext -layout /Users/iftatbhuiyan/Downloads/SampleContract.pdf tmp/pdfs/sample-contract/sample-contract.txt`
- `pdftoppm -png -r 144 /Users/iftatbhuiyan/Downloads/SampleContract.pdf tmp/pdfs/sample-contract/rendered/page`
- `pnpm --filter @workspace/api-spec run codegen`
- `pnpm --filter @workspace/api-server run typecheck`
- `pnpm --filter @workspace/glam-crm run typecheck`

Files changed:
- `Prompt.md`
- `Plan.md`
- `lib/db/src/schema/services.ts`
- `lib/db/src/schema/index.ts`
- `lib/api-spec/openapi.yaml`
- `artifacts/api-server/src/routes/services.ts`
- `artifacts/api-server/src/routes/index.ts`
- `artifacts/api-server/src/routes/bookings.ts`
- Generated API client/Zod files via Orval.

Output summary:
- Codegen succeeded.
- Frontend typecheck still passed.
- API typecheck failed because `lineItems` was accidentally attached to `ClientInput` instead of `BookingInput` in OpenAPI, `CreateServiceItemResponse` was not generated by Orval, and the default service seed array was readonly.

Fix plan:
- Move `lineItems` to `BookingInput`.
- Parse created services with an actually generated service item schema.
- Make the default seed array mutable for Drizzle insert.

## 2026-05-18 - OpenAPI Line Item Schema Fix Attempt

Commands run:
- `pnpm --filter @workspace/api-spec run codegen`

Output summary:
- Codegen failed after moving booking line item fields with Orval reporting `Failed to resolve input: Please provide a valid string value or pass a loader to process the input`.

Next action:
- Inspect the edited OpenAPI/YAML structure, fix the malformed schema placement, then rerun codegen.

## 2026-05-18 - Service API Contract Fix

Commands run:
- `pnpm --filter @workspace/api-spec run codegen`
- `pnpm --filter @workspace/api-server run typecheck`
- `pnpm --filter @workspace/db run push`

Output summary:
- YAML parsing confirmed `BookingInput` now owns `lineItems` and `ClientInput` does not.
- Codegen succeeded and library typecheck succeeded.
- API server typecheck passed.
- Package-level DB push failed because `DATABASE_URL` was not set for that direct package command.

Next action:
- Rerun the schema push through the documented local-default command or with the explicit local database URL.

## 2026-05-18 - Service Catalog and Intake UI

Files changed:
- `artifacts/glam-crm/src/pages/services.tsx`
- `artifacts/glam-crm/src/App.tsx`
- `artifacts/glam-crm/src/components/layout/Sidebar.tsx`
- `artifacts/glam-crm/src/pages/new-booking.tsx`
- `artifacts/glam-crm/src/pages/booking-detail.tsx`
- `artifacts/glam-crm/src/pages/contract-view.tsx`

Commands run:
- `pnpm db:push`
- `pnpm --filter @workspace/glam-crm run typecheck`

Output summary:
- Root `pnpm db:push` applied the new `service_items` and `booking_line_items` schema changes using the documented local database default.
- Added a reusable Services & Fees catalog page with create, update, archive, and active/inactive support.
- Added booking intake line items sourced from active catalog items, plus custom service and custom fee rows.
- Booking detail now surfaces selected services/fees and includes them in the invoice summary.
- Contract pricing now renders selected services/fees in the rate table and booking-specific calculation table.
- Frontend typecheck passed.

Next action:
- Restart the API server so the new `/api/services` route and line item booking behavior are active, then validate API and Browser workflows.

## 2026-05-18 - Inline Client Intake Start

Intent:
- Streamline booking intake so the artist enters the client's name and contact information directly on the booking form.
- Automatically create the client record from the intake submission before creating the booking.
- Remove the need to create a client in the Clients section before starting a booking.

Milestone:
- Milestone 2, Work Package 2.5.

Files in scope:
- `artifacts/glam-crm/src/pages/new-booking.tsx`
- `Prompt.md`
- `Plan.md`
- `Documentation.md`

Next action:
- Replace the client dropdown with client/contact fields and update submit behavior to create the client first, then create the booking with selected line items.

## 2026-05-18 - Full Client Phone Number Requirement Start

Intent:
- Ensure the client email/phone line in generated contracts has a complete phone number.
- Prevent booking intake from saving partial phone values like seven-digit local numbers.
- Store complete intake phone numbers in a consistent display format.

Files in scope:
- `artifacts/glam-crm/src/pages/new-booking.tsx`
- `artifacts/glam-crm/src/pages/new-client.tsx`
- `artifacts/glam-crm/src/pages/contract-view.tsx`
- `Documentation.md`

## 2026-05-18 - Contract Calculation Display Start

Intent:
- In the contract pricing calculation table, avoid repeating the service or fee name inside the `Calculation` column because that name is already shown in the `Event / Fee` column.
- Render booking line-item calculations as quantity times unit price, for example `2 x $285`.

Files in scope:
- `artifacts/glam-crm/src/pages/contract-view.tsx`
- `Documentation.md`

Update:
- Contract line-item calculations now render as `quantity x unit price`, for example `2 x $285`, instead of repeating the service or fee name.
- The client signature phone line now uses the same formatted complete phone value as the booking information table.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- Browser validation on `http://localhost:5173/bookings/2/contract` found `2 x $285` once and no old `2 Hair & Makeup services @ $285` text.
- Browser validation found `(555) 020-0000` and no old partial `555-0200` text on the contract.
- Browser console had no error logs for the verified contract page.
- Screenshot evidence saved to `/tmp/makeup-artist-hub/contract-calculation-phone-fixed.png`.
- `pnpm --filter @workspace/glam-crm run build` passed. Vite still reports existing sourcemap warnings for `tooltip.tsx`, `select.tsx`, and `label.tsx`, plus the existing large chunk warning.
- `pnpm run typecheck` passed.

## 2026-05-18 - Pricing and Cancellation Clarity Start

Intent:
- Make contract pricing easier to understand by separating unit prices from actual booking charges.
- Keep selected services/fees detailed without repeating confusing `Service / Fee` and `Event / Fee` labels.
- Show calculated cancellation cutoff dates directly under each cancellation timing row when a First Service Date exists.

Files in scope:
- `artifacts/glam-crm/src/pages/contract-view.tsx`
- `Documentation.md`

Update:
- Pricing now labels the first table `Rate Schedule` and the second table `Booking Charges`.
- Booking charges now use columns for selected item, quantity, unit rate, and amount.
- Cancellation rows now show explicit cutoff/date-range text, or a clear fallback if no First Service Date is set.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run build` passed. Vite still reports existing sourcemap warnings for `tooltip.tsx`, `select.tsx`, and `label.tsx`, plus the existing large chunk warning.
- `pnpm run typecheck` passed.
- Local smoke booking `2` was updated to `firstServiceDate: 2026-09-20` so cancellation cutoff dates could be verified.
- Browser validation on `http://localhost:5173/bookings/2/contract` showed `Rate Schedule`, `Booking Charges`, `2 people`, `$285 per person`, and cancellation dates `On or before June 22, 2026`, `June 23, 2026 through August 20, 2026`, and `On or after August 21, 2026`.
- Browser console had no error logs for the verified contract page.
- Screenshot evidence saved to `/tmp/makeup-artist-hub/contract-pricing-cancellation-clarified.png`.

## 2026-05-18 - Cancellation Wording Clarification Start

Intent:
- Remove ambiguity from the cancellation timing rows by making clear that each tier is based on when Client's cancellation notice is received.
- Label the calculated date lines as client cancellation dates.

Files in scope:
- `artifacts/glam-crm/src/pages/contract-view.tsx`
- `Documentation.md`

Update:
- Cancellation table header changed from `Cancellation Timing` to `If Client Cancels`.
- Tier labels now say `Cancellation notice is received ... before the First Service Date`.
- Calculated date sublines now start with `Client cancellation date:`.

## 2026-05-18 - Cancellation Emphasis Update

Intent:
- Make the cancellation table easier to scan by emphasizing the key dates and the dollar amount owed in each tier.

Files in scope:
- `artifacts/glam-crm/src/pages/contract-view.tsx`
- `Documentation.md`

Update:
- Bolded each cancellation amount in the `Total Amount Owed by Client` column.
- Bolded the `Client cancellation date:` label and the calculated date/cutoff range in each cancellation timing row.

## 2026-05-18 - Cancellation Action Wording Update

Intent:
- Avoid saying `cancellation notice is received`, since the contract should not imply a separate notice workflow.

Files in scope:
- `artifacts/glam-crm/src/pages/contract-view.tsx`
- `Documentation.md`

Update:
- Cancellation tiers now read `Client cancels ... before the First Service Date`.

## 2026-05-18 - Contract Print and Emphasis Polish

Intent:
- Remove repeated `Client cancels` wording from cancellation timing rows because the column header already says `If Client Cancels`.
- Match the sample contract timing format with a bold timing window and italic calculated date range beneath it.
- Emphasize the artist name, client name, First Service Date, Agreement Date, and all `Client Initials: _____` lines.
- Make contract printing / Save as PDF use tabloid paper size.

Files changed:
- `artifacts/glam-crm/src/pages/contract-view.tsx`
- `artifacts/glam-crm/src/index.css`
- `Documentation.md`

Update:
- Booking information values for artist, client, First Service Date, and Agreement Date now render in bold.
- Cancellation rows now read as timing fragments under `If Client Cancels`, for example `31 to 89 calendar days before the First Service Date`, with the calculated date range below in italic parentheses.
- All six client-initials lines now use a shared bold `ClientInitials` component.
- Added print CSS with `@page { size: 11in 17in; margin: 0.5in; }` so browser print / Save as PDF targets tabloid dimensions. The first attempt used `size: tabloid portrait`, but Chromium normalized that away in CSSOM, so it was changed to explicit dimensions.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run build` passed. Vite still reports existing sourcemap warnings for `tooltip.tsx`, `select.tsx`, and `label.tsx`, plus the existing large chunk warning.
- `pnpm run typecheck` passed.
- Browser validation on `http://localhost:5173/bookings/2/contract` confirmed the four booking-information values have `font-semibold`, all six `Client Initials: _____` lines have `font-semibold`, no cancellation row repeats `Client cancels`, and no old `Client cancellation date:` / `Cancellation date:` labels remain.
- Browser validation confirmed the contract document has `.contract-print-page` and the loaded print stylesheet includes `@page { size: 11in 17in; margin: 0.5in; }`.
- Browser console had no error or warning logs for the verified contract page.

## 2026-05-18 - Contract Typography Balance

Intent:
- Make the contract text less thin without making the entire document look bold.
- Preserve a clear visual difference between normal text, emphasized booking fields, and headings.

Files changed:
- `artifacts/glam-crm/src/index.css`
- `Documentation.md`

Update:
- Added contract-scoped typography rules for `.contract-print-page`.
- First pass set the contract base weight to `450` and darkened gray text; browser validation showed the document became too uniformly bold/dark.
- Final pass keeps the contract base at `font-weight: 400`, uses normal font smoothing, sets base ink to `#111827`, and keeps gray helper text at distinct gray levels.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run build` passed. Vite still reports existing sourcemap warnings for `tooltip.tsx`, `select.tsx`, and `label.tsx`, plus the existing large chunk warning.
- `pnpm run typecheck` passed.
- Browser validation on `http://localhost:5173/bookings/2/contract` confirmed normal contract text computes to `fontWeight: 400`, emphasized booking fields compute to `fontWeight: 600`, and section headings compute to `fontWeight: 700`.
- Browser validation confirmed the print tabloid rule remains loaded and console logs had no errors or warnings.

## 2026-05-18 - Contract PDF Title

Intent:
- Make browser print / Save as PDF recommend a useful filename based on the client name.
- Remove `Simple` from the visible agreement title.

Files changed:
- `artifacts/glam-crm/src/pages/contract-view.tsx`
- `Documentation.md`

Update:
- Contract route now sets `document.title` to `{Client Name} - Makeup and Hair Service Agreement` while the contract page is mounted.
- Client names are lightly sanitized for filename-hostile characters before being used in the browser title.
- Main heading and footer now say `Makeup & Hair Service Agreement` instead of `Simple Makeup & Hair Service Agreement`.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run build` passed. Vite still reports existing sourcemap warnings for `tooltip.tsx`, `select.tsx`, and `label.tsx`, plus the existing large chunk warning.
- `pnpm run typecheck` passed.
- Browser validation on `http://localhost:5173/bookings/2/contract` confirmed `document.title` is `Inline Intake Client - Makeup and Hair Service Agreement`, the rendered H1 is `Makeup & Hair Service Agreement`, no `Simple Makeup` agreement text remains, and console logs had no errors or warnings.

## 2026-05-18 - Bookings Filter Hierarchy Start

Intent:
- Rework the bookings list search and status filters so status chips do not clip or compete with the search field on one cramped line.

Files in scope:
- `artifacts/glam-crm/src/pages/bookings.tsx`
- `Documentation.md`

Plan:
- Split the filter toolbar into clearer search and status sections.
- Allow status filters to wrap instead of horizontal scrolling.
- Validate the bookings route in the built-in Browser after the UI change.

Update:
- Reworked the bookings filter toolbar into a bordered block with `Search` as the first row and `Status` chips as a second row.
- Status chips now use `flex-wrap` with no horizontal overflow, and each status button has `aria-pressed` for the selected state.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run build` passed. Vite still reports existing sourcemap warnings for `tooltip.tsx`, `select.tsx`, and `label.tsx`, plus the existing large chunk warning.
- `pnpm run typecheck` passed.
- Browser validation on `http://localhost:5173/bookings` confirmed the status row is below the search row, status buttons fit within the toolbar, `documentScrollWidth` equals the viewport width, and no horizontal overflow is present.
- Browser interaction clicked the `Draft` status filter and confirmed `aria-pressed` moved from `All` to `Draft`.
- Browser console had no error or warning logs for the verified bookings page.

## 2026-05-18 - Services Catalog Card Separation Start

Intent:
- Make each service/fee catalog item feel like an individual editable record instead of part of one connected block.

Files in scope:
- `artifacts/glam-crm/src/pages/services.tsx`
- `Documentation.md`

Plan:
- Remove connected `divide-y` list styling from active and archived catalog groups.
- Give each service/fee row its own bordered card surface, spacing, and subtle shadow.
- Validate the services route in the built-in Browser.

Update:
- Active and archived catalog lists now use padded `space-y-4` stacks instead of connected divider rows.
- Each service/fee row now renders as an individual rounded, bordered card with its own background and shadow.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run build` passed. Vite still reports existing sourcemap warnings for `tooltip.tsx`, `select.tsx`, and `label.tsx`, plus the existing large chunk warning.
- `pnpm run typecheck` passed.
- Browser validation on `http://localhost:5173/services` confirmed six service rows render as individual bordered cards with 16px vertical gaps, rounded corners, shadows, and no horizontal overflow.
- Browser console had no error or warning logs for the verified services page.

## 2026-05-18 - Event Schedule Intake and Dialog Redesign Start

Intent:
- Make event scheduling feel connected from new booking intake through booking detail.
- Avoid making events look like a second pricing system now that Services & Fees owns contract pricing.
- Streamline the add/edit event dialog for schedule and guaranteed-service counts.

Files in scope:
- `artifacts/glam-crm/src/pages/new-booking.tsx`
- `artifacts/glam-crm/src/pages/booking-detail.tsx`
- `artifacts/glam-crm/src/pages/contract-view.tsx`
- `Documentation.md`

Plan:
- Add a first-event schedule section to the new booking intake.
- Create that first event after booking creation when schedule fields are provided.
- Redesign the booking-detail event dialog around event info, timing, and guaranteed services.
- Validate intake and booking-detail event flows in the built-in Browser.

Validation failure:
- `pnpm --filter @workspace/glam-crm run typecheck` failed after the first patch because `data.initialEventName` was possibly undefined when creating the initial event payload.

Update:
- Added a `First Event Schedule` section to new booking intake so the first event date and timing can be captured before the booking detail screen.
- Removed service-count entry from first-event intake and add/edit event dialogs after review; Services & Fees is now the only place for service quantities and pricing.
- Simplified the add/edit event dialog to `Event Details` and `Timing`.
- Adjusted booking detail event cards to show timing without a duplicate service-count breakdown.
- Adjusted the contract schedule section to `Service Schedule` and removed the `Guaranteed Services` column so the document points service quantities to Pricing.
- Filtered legacy event subtotals out of invoice/contract pricing unless an event actually has a positive subtotal.

Validation:
- Fixed the initial `data.initialEventName` typecheck failure by normalizing the optional event name before creating the first event.
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run build` passed. Vite still reports existing sourcemap warnings for `tooltip.tsx`, `select.tsx`, and `label.tsx`, plus the existing large chunk warning.
- `pnpm run typecheck` passed.
- Browser validation on `http://localhost:5173/bookings/new` confirmed the `First Event Schedule` section remains, the guaranteed-service count block and initial count inputs are gone, Services & Fees remains present, and there is no horizontal overflow.
- Browser validation on `http://localhost:5173/bookings/2` confirmed the add-event dialog contains only event details and timing, with no guaranteed-service count block, count inputs, rate labels, or overflow.
- Browser validation on `http://localhost:5173/bookings/2/contract` confirmed Section 2 is now `Service Schedule`, the old guaranteed-services schedule header/column is gone, and the schedule copy points service quantities and fees to Pricing.

## 2026-05-18 - Booking History Trail and Header Cleanup Start

Intent:
- Add a durable booking history trail so booking, event, and payment changes have timestamps and reviewable descriptions.
- Clean up the booking detail header hierarchy so title, status, metadata, and actions read as an organized booking summary.

Files in scope:
- `Plan.md`
- `lib/db/src/schema/*`
- `lib/api-spec/openapi.yaml`
- `lib/api-zod/src/generated/*`
- `lib/api-client-react/src/generated/*`
- `artifacts/api-server/src/routes/bookings.ts`
- `artifacts/glam-crm/src/pages/booking-detail.tsx`
- `Documentation.md`

Plan:
- Add a `booking_activity` table and expose activity records through booking detail.
- Log core booking lifecycle, event, and payment mutations in the API.
- Add a `History` tab to booking detail.
- Rework the booking detail header into a cleaner summary/action layout.
- Run codegen, schema push, typechecks, build, and Browser validation.

Validation failure:
- `pnpm --filter @workspace/db run push` failed because `DATABASE_URL` was not present in the shell environment. The repo-level `pnpm db:push` script supplies the documented local default and will be used for the retry.
- `pnpm --filter @workspace/glam-crm run typecheck` failed because the generated list `Booking` type did not include `deletedAt` yet, while the bookings page needs that field for the deleted-bookings view.

Update:
- Added `deleted_at` to bookings and a new `booking_activity` table for durable timestamped booking history.
- Extended the OpenAPI contract and regenerated API client/Zod types for booking activity, `deletedAt`, deleted-booking list filtering, restore, and permanent delete.
- API now soft-deletes bookings by setting `deletedAt`, restores them through `POST /bookings/{id}/restore`, and permanently deletes through `DELETE /bookings/{id}/permanent`.
- API records booking activity for booking creation, booking updates, soft delete, restore, event create/update/delete, and payment record/delete.
- Booking detail now has a cleaner card-style summary header, a blue `Contract PDF` action, and a `History` tab.
- Booking detail line-item calculations now display as count x amount, for example `2 x $285`.
- Bookings list now has a `Deleted Bookings` view with restore and permanent-delete controls for deleted records.
- Contract signature now populates the artist phone number with `(555) 020-0000`.

Validation:
- `pnpm --filter @workspace/api-spec run codegen` passed.
- `pnpm db:push` passed after using the repo default local `DATABASE_URL`.
- `pnpm --filter @workspace/api-server run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run build` passed. Vite still reports existing sourcemap warnings for `tooltip.tsx`, `select.tsx`, and `label.tsx`, plus the existing large chunk warning.
- `pnpm run typecheck` passed.
- Restarted the local API process on port `8787` so the running app serves the new activity/deleted fields.
- Browser validation on `http://localhost:5173/bookings/2` confirmed the reorganized header, blue contract button, `History` tab, `2 x $285` calculation text, no old calculation wording, and no horizontal overflow.
- Browser validation on `http://localhost:5173/bookings` confirmed the deleted-bookings toggle is present and no horizontal overflow is present.
- Browser validation on `http://localhost:5173/bookings/2/contract` confirmed the artist phone number is present and no horizontal overflow is present.
- API recovery smoke test created a temporary booking, soft-deleted it, confirmed it appeared in `includeDeleted=true`, restored it, soft-deleted it again, permanently deleted it, confirmed a 404, and removed the temporary client.

## 2026-05-18 - Structured Event Time Inputs Start

Intent:
- Replace free-text service timing fields with structured hour, minute, and AM/PM controls so users do not need to type exact time formatting.

Files in scope:
- `artifacts/glam-crm/src/components/TimePartsInput.tsx`
- `artifacts/glam-crm/src/pages/booking-detail.tsx`
- `artifacts/glam-crm/src/pages/new-booking.tsx`
- `Documentation.md`

Plan:
- Add a reusable time-parts input that stores formatted values like `6:30 PM`.
- Use it for `Services Begin` and `Completion Target` in the add/edit event dialog.
- Use it for the first-event timing fields in new booking intake.
- Run frontend typecheck/build and Browser validation.

Update:
- Added a reusable `TimePartsInput` with hour, minute, and AM/PM controls.
- Replaced free-text `Services Begin` and `Completion Target` fields in the add/edit event dialog.
- Replaced free-text first-event timing fields in new booking intake.
- The time control stores formatted strings such as `6:30 PM` while allowing normal hour/minute typing.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run build` passed. Vite still reports existing sourcemap warnings for `tooltip.tsx`, `select.tsx`, and `label.tsx`, plus the existing large chunk warning.
- Browser validation on `http://localhost:5173/bookings/2` confirmed the add-event dialog has hour/minute/AM-PM controls for both timing fields, the old free-text timing inputs are gone, and there is no horizontal overflow.
- Browser validation on `http://localhost:5173/bookings/new` confirmed first-event timing uses the same structured controls, the old free-text timing inputs are gone, and there is no horizontal overflow.

## 2026-05-18 - Event-Level Service Assignment Start

Intent:
- Let booking services and fees be connected to the event they belong to when a booking has multiple events, while still supporting general booking-level charges.

Files in scope:
- `Plan.md`
- `lib/db/src/schema/services.ts`
- `lib/api-spec/openapi.yaml`
- `lib/api-zod/src/generated/*`
- `lib/api-client-react/src/generated/*`
- `artifacts/api-server/src/routes/bookings.ts`
- `artifacts/glam-crm/src/pages/booking-detail.tsx`
- `artifacts/glam-crm/src/pages/contract-view.tsx`
- `Documentation.md`

Plan:
- Add nullable `eventId` support to booking line items.
- Add an API mutation for assigning a line item to an event or clearing the assignment.
- Add booking-detail UI controls for event assignment on each selected service/fee.
- Group contract pricing by assigned event.
- Run schema push, generated type refresh, typechecks, build, and Browser validation.

Update:
- Added nullable `event_id` on booking line items.
- Added `PATCH /bookings/{id}/line-items/{lineItemId}` for assigning a selected service/fee to a booking event or moving it back to booking-level charges.
- Regenerated API client and Zod contracts.
- Added an event assignment select to each selected service/fee on booking detail.
- Contract pricing now groups assigned services/fees under their event and leaves unassigned services/fees as booking-level charges.
- Restarted the local API on port `8787` after the route/schema change.

Validation:
- `pnpm --filter @workspace/api-spec run codegen` passed.
- `pnpm db:push` passed.
- `pnpm --filter @workspace/api-server run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run build` passed. Vite still reports existing sourcemap warnings for `tooltip.tsx`, `select.tsx`, and `label.tsx`, plus the existing large chunk warning.
- `pnpm run typecheck` passed.
- API smoke test created a temporary booking, event, and line item; assigned the line item to the event; confirmed `eventId` persisted; then permanently removed the temporary records.
- Browser validation on `http://localhost:5173/bookings/2` confirmed the selected service/fee event assignment control is present, existing event names are available on the page, and there is no horizontal overflow.
- API check after restarting the server confirmed the line-item assignment route responds on the running local API.

## 2026-05-18 - Post-Creation Service and Fee Editing Start

Intent:
- Let a booking continue to add, edit, assign, and remove selected services/fees after the initial booking intake.

Files in scope:
- `lib/api-spec/openapi.yaml`
- `lib/api-zod/src/generated/*`
- `lib/api-client-react/src/generated/*`
- `artifacts/api-server/src/routes/bookings.ts`
- `artifacts/glam-crm/src/pages/booking-detail.tsx`
- `Documentation.md`

Plan:
- Add API endpoints to create, update, and delete booking line items.
- Regenerate generated API types/hooks.
- Add booking-detail controls for adding from catalog, adding custom service/fee, editing selected line items, and removing selected line items.
- Recompute totals and record activity when line items change.
- Run focused validation, root typecheck, and Browser validation.

Update:
- Added `POST /bookings/{id}/line-items` for adding selected services/fees after a booking exists.
- Expanded `PATCH /bookings/{id}/line-items/{lineItemId}` so selected services/fees can update name, description, type, count, rate, unit, event assignment, and sort order.
- Added `DELETE /bookings/{id}/line-items/{lineItemId}` for removing selected services/fees from a booking.
- Line item create/update/delete now recomputes booking totals and records booking history entries.
- Added booking-detail controls to add from the reusable service catalog, add custom services, add custom fees, edit existing selected services/fees, assign them to events, and remove them.
- Restarted the local API on port `8787` after the route change.

Validation:
- `pnpm --filter @workspace/api-spec run codegen` passed.
- `pnpm --filter @workspace/api-server run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run build` passed. Vite still reports existing sourcemap warnings for `tooltip.tsx`, `select.tsx`, and `label.tsx`, plus the existing large chunk warning.
- `pnpm run typecheck` passed.
- API smoke test created a temporary booking, event, and line item; updated the line item count, rate, and event assignment; confirmed the recalculated total; deleted the line item; and permanently removed the temporary booking/client records.
- Browser validation on `http://localhost:5173/bookings/2` confirmed the Selected Services & Fees section now shows Add from catalog, Add Selected, Custom Service, Custom Fee, edit/delete controls, event assignment, and no console errors.

## 2026-05-18 - Artist Profile Management Start

Intent:
- Add an Artist profile page where the artist can edit business/contact details that should populate app chrome and generated contracts.

Files in scope:
- `Plan.md`
- `lib/db/src/schema/*`
- `lib/api-spec/openapi.yaml`
- `lib/api-zod/src/generated/*`
- `lib/api-client-react/src/generated/*`
- `artifacts/api-server/src/routes/*`
- `artifacts/glam-crm/src/App.tsx`
- `artifacts/glam-crm/src/components/layout/Sidebar.tsx`
- `artifacts/glam-crm/src/pages/*`
- `Documentation.md`

Plan:
- Add a persisted artist profile record with editable name, email, phone, business name, and payment/contact fields.
- Expose profile get/update endpoints and generated client hooks.
- Add an Artist navigation item and profile editing page.
- Wire the contract view and sidebar to use saved artist details.
- Run database push, codegen, typechecks, build, API smoke test, and Browser validation.

Dashboard note:
- The user clarified that the earlier Total Clients value came from an extra client in the Clients tab. Dashboard `totalClients` remains a roster count from the Clients table, while booking-specific dashboard lists continue to ignore deleted bookings.

Update:
- Added persisted artist profile storage and API endpoints for get/update.
- Added an Artist sidebar tab and profile page with editable business name, artist name, email, phone, website, Instagram, default payment method, and notes.
- Artist phone input now formats as the user types and the summary card uses the same formatted value.
- Sidebar branding and contract artist fields now use the saved artist profile.
- Added persisted contract template storage and API endpoints for list/create/update/archive.
- Added a Templates sidebar tab with a default Makeup & Hair Service Agreement template seeded from the current contract structure.
- Reworked template editing from a raw body textarea into a contract-style preview with demo auto-populated values and editable clause textareas for the actual contract language.
- Removed temporary smoke-test templates created during validation.
- Confirmed Total Clients should remain a Clients roster count after the user clarified the earlier count.

Validation:
- `pnpm --filter @workspace/api-spec run codegen` passed.
- `pnpm db:push` passed for artist profile and contract template tables.
- `pnpm --filter @workspace/api-server run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run build` passed. Vite still reports existing sourcemap warnings for `tooltip.tsx`, `select.tsx`, and `label.tsx`, plus the existing large chunk warning.
- `pnpm run typecheck` passed.
- API smoke test confirmed artist profile defaults, default contract template seeding, template create/update/archive, and dashboard client count matching the Clients API count.
- Browser validation confirmed `http://localhost:5173/artist` renders the artist profile form with formatted phone display and no console errors.
- Browser validation confirmed `http://localhost:5173/contract-templates` renders the default template, full preview, editable clause fields, and no smoke-test templates or console errors.

## 2026-05-18 - Locked Default Contract Template Start

Intent:
- Make the built-in Makeup & Hair Service Agreement the locked default contract template.
- Show the full default agreement content in the contract-template preview.
- Make newly added templates editable copies of the locked default template.

Files in scope:
- `Plan.md`
- `lib/db/src/schema/contract-templates.ts`
- `lib/api-spec/openapi.yaml`
- `lib/api-zod/src/generated/*`
- `lib/api-client-react/src/generated/*`
- `artifacts/api-server/src/routes/contract-templates.ts`
- `artifacts/glam-crm/src/pages/contract-templates.tsx`
- `Documentation.md`

Plan:
- Add a persisted locked flag for system-owned contract templates.
- Seed or repair the default agreement as active, default, locked, and populated with full clause content.
- Block locked-template edits and archive attempts in the API.
- Render locked templates as read-only full previews while editable copies keep editable clause controls.
- Update the Add Template flow to copy the locked default agreement body.
- Add a persisted booking contract-template selection, expose it in intake and booking detail, and include the selected template in contract generation.
- Run schema/codegen/typecheck/build/API/browser validation.

## 2026-05-18 - Booking Detail Line Item Split

Intent:
- Add an edit-page action to split line items with quantity greater than 1 so each unit can be assigned to its own event.

Files in scope:
- `artifacts/glam-crm/src/pages/booking-detail.tsx`
- `Documentation.md`

Update:
- Added `Split` action in `artifacts/glam-crm/src/pages/booking-detail.tsx` for multi-quantity line items, splitting them into unit-quantity rows via existing create/update mutations.
- The split action updates the source row to quantity 1 and creates additional rows with the same event assignment, description, rates, and sort-order increment.
- Updated row layout to include split action inline when quantity > 1.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run build` passed. Vite still reports existing sourcemap warnings for `tooltip.tsx`, `select.tsx`, and `label.tsx`, plus the existing large chunk warning.

## 2026-05-18 - Booking Detail Intake Fields Editable

Start:
- Make `booking detail` edit screen support editing booking-level intake fields directly: primary client name, location, first service date, and the first event name.

Update:
- Added a `BookingMetaDialog` on `artifacts/glam-crm/src/pages/booking-detail.tsx`.
- Added inline mutation flow to update booking `location`/`firstServiceDate`, client `name` via `client` mutation, and first event `eventName` via event mutation.
- Added focused invalidation for booking, bookings list, primary client, and clients list queries.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run build` passed. Existing sourcemap warnings for `tooltip.tsx`, `select.tsx`, and `label.tsx` remain. Existing chunk-size warning remains.

## 2026-05-18 - Grouped Line Items in Booking Detail

Start:
- Keep split line items manageable in the edit view by collapsing identical line items back into grouped rows after assignment.

Update:
- Added grouped-line calculation in `artifacts/glam-crm/src/pages/booking-detail.tsx` so the “Selected Services & Fees” list renders grouped by shared service/fee attributes and event assignment, using total quantity and total amount.
- Added grouped actions so event reassignment and deletion operate across the grouped entries together, preserving current single-row split/edit flows when an item still has quantity > 1.
- Kept the split operation untouched for multi-quantity rows while ensuring its output can display as combined “3 × Service” style rows instead of repeated “1” rows.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run build` passed. Existing sourcemap warnings for `tooltip.tsx`, `select.tsx`, and `label.tsx` remain. Existing chunk-size warning remains.

## 2026-05-18 - Split Action Stabilization (Booking Detail)

Start:
- Prevent split/grouped line-item actions from conflict-running and destabilizing the booking detail render path.

Update:
- Added a lightweight mutation guard in `artifacts/glam-crm/src/pages/booking-detail.tsx` to serialize grouped updates for:
  - split operations,
  - group event reassignment,
  - group deletion.
- Switched grouped reassignment/deletion handlers from parallel `Promise.all` mutations to sequential awaits to reduce transactional contention and preserve deterministic UI state.
- Wired action controls to the active mutation key so repeated clicks cannot trigger overlapping mutations on the same group.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run build` passed. Existing sourcemap warnings for `tooltip.tsx`, `select.tsx`, and `label.tsx` remain. Existing chunk-size warning remains.

## 2026-05-18 - Queue Split Operations for Booking Detail Save

Start:
- Resolve split action instability by decoupling split clicks from immediate persistence and requiring an explicit save for staged split changes.

Update:
- Added queued split workflow in `artifacts/glam-crm/src/pages/booking-detail.tsx`:
  - `Split` now stages selected multi-quantity line items into a queue instead of executing immediately.
  - Added `Save line item changes` and `Discard queued changes` controls to commit or clear staged split operations.
  - Added shared split performer to execute queued changes sequentially and invalidate booking/list queries once after completion.
  - Preserved grouped event/reassign/delete behavior and kept split actions isolated to line items with `quantity > 1`.
- UI now shows queued count and disabled button states while operations are pending.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run build` passed. Existing sourcemap warnings for `tooltip.tsx`, `select.tsx`, and `label.tsx` remain. Existing chunk-size warning remains.

## 2026-05-18 02:36:56 - BookingDetail Hooks Stabilization
- Start: fix conditional early return path in booking detail that breaks hook ordering after split/queue workflow changes.

## 2026-05-18 - Split Button Visibility Fix for Grouped Multi-Count Services

Start:
- Fix split action visibility regression where grouped services with more than one total count were no longer showing `Split` because the grouped renderer only allowed split when `items.length === 1`.

Update:
- Updated `artifacts/glam-crm/src/pages/booking-detail.tsx` to render split action whenever a grouped row has at least one underlying line item still at `quantity > 1`.
- The button now targets a `splitCandidate` row (`find`s first item with `quantity > 1`) so grouped services with count>1 still expose split, while fully split groups (all `quantity === 1`) correctly keep split hidden.
- Kept queued split behavior and existing split/apply/discard flow intact.

Validation:
- Not run during this step (requested UI visibility fix only).

## 2026-05-18 - Split Visibility for Fully Decomposed Multi-Count Groups

Start:
- Address remaining split visibility gaps for grouped services with more than 1 total quantity when all underlying rows are already quantity 1.

Update:
- Updated `artifacts/glam-crm/src/pages/booking-detail.tsx` so grouped rows now show a split control for any group with `totalQuantity > 1`.
- If a group has no remaining multi-quantity source row, the action is shown as disabled with `No split needed` and a toast clarifies it is already split at unit level.
- Kept queued split behavior unchanged for rows with a valid split candidate.
- Hardened grouping keying by including `serviceItemId` for better separation between similarly described services.

Validation:
- Not run during this step (requested immediate UI logic fix only).

## 2026-05-18 - Split Button Expands Unitized Groups

Start:
- Fix the `No split needed` state in booking detail because multi-count grouped options still need an actionable `Split` control.

Update:
- Updated `artifacts/glam-crm/src/pages/booking-detail.tsx` so grouped multi-count rows always show `Split`, never `No split needed`.
- If the grouped row still contains an underlying line item with `quantity > 1`, the button keeps using the existing queued split/save workflow.
- If the grouped row is already made from unit-level line items, the button expands that grouped option into separate line-item cards in the current view.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed.

## 2026-05-19 - Event and Service Drag Reorder

Start:
- Add manual drag-and-drop ordering for booking events and selected services/fees on the booking detail Events & Services tab.

Update:
- Added persistent `sortOrder` support to booking events in `lib/db/src/schema/events.ts`, `lib/api-spec/openapi.yaml`, and generated API/Zod clients.
- Updated booking event reads to order by `sortOrder`, then date/id for stable fallback behavior.
- Updated new event creation to append after the current max sort order when no explicit sort order is provided.
- Added drag handles and drop handlers in `artifacts/glam-crm/src/pages/booking-detail.tsx` for event cards and grouped service/fee rows.
- Service/fee drag reorder persists the visible grouped order by rewriting underlying line-item sort orders.

Validation:
- `pnpm db:push` passed and applied the event `sort_order` column.
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `pnpm --filter @workspace/api-server run build` pending in current run.
- Existing `pnpm --filter @workspace/api-server run typecheck` failure remains the pre-existing generated `contractTemplateId` mismatch in booking create/update bodies.

## 2026-05-19 - Contract Version Selection

Start:
- Preserve the current contract view as the locked non-bridal makeup and hair service agreement, replace the user-facing Templates wording with Contracts, add a bridal contract view duplicate for later edits, and let bookings select which contract version applies.

Update:
- Preserved the current generated contract view as the non-bridal contract view.
- Added `artifacts/glam-crm/src/pages/bridal-contract-view.tsx` as a duplicated bridal contract view for later bridal-specific edits.
- Added a contract route selector so `/bookings/:id/contract` renders the bridal duplicate when the selected contract version is bridal.
- Renamed the sidebar/page language from Templates to Contracts while keeping `/contract-templates` as a compatibility route alias.
- Made locked built-in contract records read-only in the Contracts page.
- Added built-in locked contract versions for non-bridal and bridal agreements in the API seed/normalization path.
- Added `contractTemplateId`, locked contract metadata, and contract data template metadata to the OpenAPI source, then regenerated API/Zod clients.
- Added contract selection to new booking intake and the booking detail edit dialog.

Validation:
- `pnpm --filter @workspace/api-spec run codegen` passed, including workspace library typecheck.
- `pnpm --filter @workspace/api-server run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
Follow-up:
- Archived old editable contract-template records from the built-in contract seeding path so the active contract choices reset to the locked non-bridal and bridal agreements.
- Hid inactive leftover contract records from the Contracts page list.

Validation:
- `pnpm --filter @workspace/api-server run typecheck` passed after cleanup changes.
- `pnpm --filter @workspace/glam-crm run typecheck` passed after cleanup changes.

## 2026-05-19 - Bridal Contract Service Scope

Start:
- Update the locked bridal contract view with the bridal-specific service pricing and scope explained by the business owner while keeping the non-bridal contract unchanged.

Update:
- Set bridal contract fallback rates to $300 for bridal makeup and $300 for bridal hair.
- Added bridal makeup scope covering luxury bridal service, skin preparation/skincare, lashes, and customized desired look.
- Added bridal hair scope covering customized bridal styles, hair padding, bobby pins, safety pins, clean/dry hair requirement, and extension recommendation.
- Added bridal add-on language for $15 synthetic bun extension, $50 bridal dupatta/veil/jewelry setup, and $50 bridal hijab setup with undercap/material recommendations.
- Updated the locked bridal contract template body used in Contracts page preview to match the bridal service scope.
- Left shared fine-print sections such as timing, safety, cancellation, emergency, and general terms unchanged.

Validation:
- `pnpm --filter /api-server run typecheck` passed.
- `pnpm --filter /glam-crm run typecheck` passed.

## 2026-05-19 - Non-Bridal Contract Title and Scope Cleanup

Update:
- Updated the non-bridal contract view title and document title to explicitly say Non-Bridal Makeup and Hair Service Agreement.
- Removed repeated dollar-amount wording from the non-bridal Service Scope section so pricing stays in the pricing tables and scope stays focused on inclusions/exclusions.

Validation:
- Not run; copy-only contract view update.

## 2026-05-19 - Bridal Service Scope Price Wording Cleanup

Update:
- Removed the remaining visible dollar-rate phrasing from the first bridal makeup and bridal hair scope paragraphs.
- Left pricing values in the pricing tables/rate schedule only.

Validation:
- Not run; copy-only bridal contract view update.

## 2026-05-19 - Bridal Hijab Preparation Emphasis

Update:
- Promoted the bridal hijab setup paragraph in the bridal contract Service Scope into an emphasized callout labeled Important Bridal Hijab Preparation.
- Kept the content unchanged while making the undercap and non-slippery cotton/jersey hijab recommendation harder to miss.

Validation:
- Not run; presentation-only bridal contract view update.

## 2026-05-19 - Bridal Add-ons Copy Cleanup

Update:
- Removed touch-up kits from the bridal contract Other add-ons sentence.
- Mirrored the bridal template preview body so stored contract preview language no longer mentions touch-up kits.

Validation:
- Not run; copy-only bridal contract update.

## 2026-05-19 - New Booking Phone Formatting

Update:
- Added live US phone formatting to the New Booking Intake client phone input using the existing phone input formatter.
- Kept existing 10-digit validation and submission normalization unchanged.

Validation:
- Not run; small input formatting change.

## 2026-05-19 - Bridal Hair Extensions Responsibility

Update:
- Updated the bridal contract hair scope to state that hair extensions are not included and must be provided by the bride.
- Mirrored the same bridal hair extension responsibility in the locked bridal contract preview body.

Validation:
- Not run; copy-only bridal contract update.

## 2026-05-19 - Non-Bridal Hairstyle Scope

Update:
- Updated the non-bridal contract hair scope to clarify that non-bridal hair includes basic curls, buns, or half-up styles.
- Added that bobby pins and hair padding for the selected basic style are included.
- Explicitly excluded Hollywood waves and extension styling from non-bridal hair unless agreed in writing.
- Mirrored the same scope in the locked non-bridal contract preview body.

Validation:
- Not run; copy-only non-bridal contract update.

## 2026-05-19 - Bridal Hair Extension Sentence Emphasis

Update:
- Bolded the bridal contract sentence stating that hair extensions are not included and must be provided by the bride.

Validation:
- Not run; copy styling-only bridal contract update.

## 2026-05-19 - Booking Detail Event Type Edit

Update:
- Added Event Type to the Edit Booking Details dialog on booking detail.
- Wired Event Type changes into the existing booking update payload so the header label can be edited from the modal.

Validation:
- Not run; small booking detail form update.

## 2026-05-19 - Repository Push and Local Data Snapshot

Start:
- Save the current local CRM database state before pushing the repository to GitHub so local bookings, clients, artist profile, contracts, services, and related records are preserved.

Update:
- Created a timestamped PostgreSQL dump at `data/backups/makeup_artist_hub-20260519-023306.sql`.
- Added `data/backups/README.md` with restore notes.

Validation:
- `pg_dump` completed successfully against the local `makeup_artist_hub` database.

## 2026-05-19 - Reduced Bridal Makeup Conditional Scope

Start:
- Update the bridal contract so Section 5 reflects the selected bridal service tier, especially reduced bridal makeup, instead of always showing full bridal makeup language.

Update:
- Made the bridal contract Service Scope conditional on selected services.
- Added a Reduced Bridal Makeup Limitation callout when a selected service contains reduced bridal makeup.
- Full bridal makeup language now appears only for full bridal makeup selections.
- Bridal hair language now appears only when a bridal hair service is selected.
- Bridal setup and bridal hijab setup scope language now appears only when those services are selected.
- Updated the locked bridal contract preview body to document the reduced bridal makeup tier.

Validation:
- `pnpm --filter /glam-crm run typecheck` passed.
- `pnpm --filter /api-server run typecheck` passed.

## 2026-05-19 - Local Data Snapshot Push

Start:
- Save the current local CRM database state after booking and service edits so the new clients, bookings, contracts, services, artist profile, and related app data are preserved in git.

Update:
- Created a timestamped PostgreSQL dump at `data/backups/makeup_artist_hub-20260519-030003.sql`.
- Updated the backup restore example to point at the latest snapshot.
- Included the pending reduced bridal makeup contract logic in the same push so the data and contract behavior stay in sync.

Validation:
- `pg_dump` completed successfully against the local `makeup_artist_hub` database.

## 2026-05-19 - Shared Render/Supabase/GitHub Pages Deployment

Start:
- Prepare deployment so Makeup Artist Hub uses Supabase-hosted Postgres, mounts its API onto the existing WhisperSpeechServer Render service without breaking WhisperSpeech behavior, and serves the frontend from GitHub Pages.
- Treat Supabase as hosted Postgres rather than rewriting away from the current Drizzle/Postgres data model.

Update:
- Added a mountable Glam CRM API bundle entrypoint for the existing WhisperSpeechServer Render service.
- Added API session-password protection so public GitHub Pages cannot expose CRM data without the private admin password.
- Added frontend `VITE_API_BASE_URL` support and a login gate for the protected CRM API.
- Added a GitHub Pages Actions workflow that builds `artifacts/glam-crm` with `/YeasminGlamDashboard/` as the base path and deploys `artifacts/glam-crm/dist/public`.
- Patched `/Users/iftatbhuiyan/WhisperSpeechServer` to lazy-load the bundled CRM API only for `/glam-api/api/*` requests, preserving existing WhisperSpeechServer routes.
- Updated `Prompt.md`, `Plan.md`, and `Setup.md` for the new deployment scope.

Validation:
- `pnpm --filter @workspace/api-server run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `pnpm --filter @workspace/api-server run build` passed and produced `dist/embedded.mjs`.
- `pnpm --filter @workspace/glam-crm run build` passed.
- `npm test` passed in `/Users/iftatbhuiyan/WhisperSpeechServer`.
- Local shared-server smoke passed: `/health` returned Whisper health, `/glam-api/api/healthz` returned Glam API health, unauthenticated `/glam-api/api/clients` returned `401`, and authenticated `/glam-api/api/clients` returned CRM client data.

## 2026-05-19 - Supabase/Render Account Setup Pass

Start:
- Continue production deployment setup in the signed-in Dia browser.
- Goal is to create/configure Supabase-hosted Postgres, restore the latest local CRM data snapshot, configure the existing WhisperSpeechServer Render service with Glam CRM environment variables, and finish GitHub Pages activation without adding another paid Render project.
- Stop before any account-side action that creates persistent secrets/resources, changes billing, or requires credential/secret handling that cannot be safely completed unattended.

Blocked:
- Supabase dashboard is signed in and the new project form is prepared with project name `Makeup Artist Hub`, region `East US (North Virginia)`, and Data API disabled because the app uses direct Postgres through the existing API server rather than Supabase client APIs.
- Paused before entering/generating the database password and before clicking `Create new project`, because that creates persistent cloud credentials/resources and requires action-time confirmation.

Resumed:
- User explicitly confirmed creating the Supabase project, generating and using database credentials, configuring Render environment variables, restoring CRM data, and finishing GitHub Pages deployment.

Update:
- Created Supabase project `Makeup Artist Hub` in `us-east-1` with project ref `revpsisofkxznnudzvoq`.
- Stored generated deployment credentials locally in `.local/deployment-secrets.env` and excluded that file through `.git/info/exclude`.
- Restored `data/backups/makeup_artist_hub-20260519-030003.sql` into Supabase Postgres after rewriting local owner references from `makeup_artist_hub` to `postgres`.
- Configured the existing Render `WhisperSpeechServer` service (`srv-d6rsnl9j16oc73ed9kug`) with Glam-only env vars: database URL, admin password, session secret, CORS origin, secure cookie flag, and `/glam-api` cookie path.
- Switched GitHub Pages for `sequence-labs/YeasminGlamDashboard` to GitHub Actions publishing.
- Updated `GLAM_DATABASE_URL` to use the Supabase pooler URL with `sslmode=no-verify`; the `sslmode=require` URL worked in `psql` but caused Node `pg` to fail with `SELF_SIGNED_CERT_IN_CHAIN`.

Validation:
- Supabase restore counts verified with SQL: `clients=5`, `bookings=5`, `services=12`, `templates=3`.
- Local API smoke against Supabase passed: authenticated `/api/clients` returned `200` with `5` clients.
- Remote Whisper health stayed live: `https://whisperflowserver.onrender.com/health` returned `200`.
- Remote Glam API health passed: `https://whisperflowserver.onrender.com/glam-api/api/healthz` returned `200`.
- Remote unauthenticated `/glam-api/api/clients` returned `401`.
- Remote authenticated checks passed: `/clients=5`, `/bookings=5`, `/services=12`, `/contract-templates=3`, and `/artist-profile` returned an object.
- GitHub Pages workflow run `26084374054` completed successfully.
- GitHub Pages root returned the deployed app HTML, app JS contains `https://whisperflowserver.onrender.com/glam-api`, and `/YeasminGlamDashboard/bookings` returns the SPA fallback body.

## 2026-05-19 - GitHub Pages Session and Local Admin Password Fix

Start:
- Fix GitHub Pages loading into an empty bookings state even though the remote API has CRM data.
- Fix local development so `GLAM_ADMIN_PASSWORD` from the deployment secrets file is loaded by the API process without manual shell export.

Findings:
- Remote authenticated `/glam-api/api/bookings` returns CRM booking data, so Supabase data is present.
- GitHub Pages is cross-origin from the Render API; relying only on a third-party session cookie can fail in browsers/privacy modes and leave generated API calls unauthenticated.
- The generated API client already supports bearer tokens, but the CRM frontend was not registering a token getter and the API session route was not returning a token.

Validation note:
- Initial local session smoke attempted to import `dist/index.mjs` as an Express app default export and failed before server start because that bundle is the executable server entrypoint, not an app export. Retrying through the real start path.

Update:
- Added a local-only deployment env loader for the API server so localhost reads `GLAM_ADMIN_PASSWORD` from `.local/deployment-secrets.env` when the shell has not exported it.
- Added cross-origin bearer session support for the Glam API while preserving the existing secure cookie path.
- Updated the CRM frontend to store the signed session token after unlock and attach it through the generated API client.

Validation:
- `pnpm --filter @workspace/api-server run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `pnpm --filter @workspace/api-server run build` passed.
- `pnpm --filter @workspace/glam-crm run build` passed with the existing sourcemap/chunk-size warnings.
- Local API session smoke passed: local secrets loaded, password login succeeded, a session token was returned, and bearer session verification succeeded.

## 2026-05-19 - Services Catalog Name Visibility Fix

Start:
- Fix the Services & Fees catalog row layout after browser evidence showed service names clipped into tiny empty-looking boxes.
- Scope is Work Package 2.10 UI and UX Polish; no API, database, or generated contract changes are intended.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run build` passed with the existing sourcemap/chunk-size warnings.
- Attempted a Playwright DOM/screenshot check through `npx -p playwright@1.49.0 node`, but the temporary CLI package was not available to `require("playwright")` inside the pnpm workspace, so this browser validation path failed before opening the page.
- Reworked the Services & Fees page from a two-column add-form plus oversized catalog cards into a compact add toolbar and full-width editable catalog lists.
- Desktop Playwright check at 1430x1137 passed: first five service rows rendered with populated names and compact row heights around 61px; screenshot saved at `/tmp/makeup-services-catalog-compact.png`.
- Mobile Playwright check at 390x900 had no document horizontal overflow and service names were present, but the existing app shell/sidebar consumes most of the viewport and squeezes the page content; that is a broader responsive shell issue outside this services catalog row fix.

## 2026-05-19 - Dashboard UI and UX Redesign

Start:
- Redesign the dashboard as an operational CRM workspace rather than a loose set of cards.
- Scope is Work Package 2.10 UI and UX Polish; use existing dashboard/bookings hooks only and do not change API contracts, server routes, generated clients, or database schema.

Update:
- Installed `Leonxlnx/taste-skill` from GitHub at local skill path `/Users/iftatbhuiyan/.codex/skills/taste-skill` and reviewed its dashboard/UI guidance before continuing.
- Reworked the dashboard hierarchy around a command-center header, concise metric strip, next scheduled work, payment attention, booking mix, revenue by event type, and booking ledger.
- Replaced the weak status donut chart with compact status bars so sparse one-status data still reads cleanly.
- Added a mobile shell/sidebar layout so narrow viewports no longer squeeze the main dashboard column beside the desktop sidebar.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run build` passed with the existing sourcemap/chunk-size warnings.
- Desktop Playwright check at 1430x1137 passed with no horizontal overflow; screenshot saved at `/tmp/makeup-dashboard-redesign-shell-desktop.png`.
- Mobile Playwright check at 390x900 passed with no horizontal overflow and the responsive mobile nav visible; screenshot saved at `/tmp/makeup-dashboard-redesign-shell-mobile.png`.

## 2026-05-19 - Contracts Page UI and Preview Redesign

Start:
- Redesign the Contracts page using the same senior UI/UX pass as the dashboard and services work.
- Scope is Work Package 2.10 UI and UX Polish; keep existing contract template hooks and do not change API contracts, server routes, generated clients, or database schema.
- Main product requirement: contract previews on `/contracts` should look like the generated booking contract view instead of looking like a form embedded inside the document.

Update:
- Reworked the Contracts page layout into a tighter agreement-library workspace with a compact contract version selector, count summary, and dedicated detail pane.
- Changed locked contract detail presentation from a form-like card into a status header plus generated-contract preview.
- Separated editable contract language controls from the visual contract preview so the preview no longer contains textareas or editor chrome.
- Rebuilt the template preview to use the same document-style `contract-print-page` surface and contract sections used by generated booking contracts, while preserving existing template body parsing and mutation behavior.
- Scope stayed inside `artifacts/glam-crm/src/pages/contract-templates.tsx`; no API contracts, database schema, generated clients, server routes, or contract data model changes were made.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run build` passed with existing sourcemap/chunk-size warnings.
- Desktop Playwright check at 1430x1137 passed on `http://127.0.0.1:5173/contracts`: page title rendered, generated preview rendered, preview contained 0 textareas, no horizontal overflow, and no page/console errors; screenshot saved at `/tmp/makeup-contracts-redesign.png`.
- Secondary Playwright click-through checked the contract selector state: 2 contract buttons rendered, generated preview stayed visible, preview contained 0 textareas, no horizontal overflow, and no page/console errors; screenshot saved at `/tmp/makeup-contracts-editable-redesign.png`.

## 2026-05-19 - Mobile Shell Optimization

Start:
- Fix mobile layout so the CRM does not show a desktop sidebar or desktop table patterns on phone-sized screens.
- Scope is Work Package 2.10 UI and UX Polish; keep route behavior and API/data contracts unchanged.

Validation note:
- Initial `pnpm --filter @workspace/glam-crm run typecheck` failed after the first dashboard mobile-table patch with `src/pages/dashboard.tsx(362,13): error TS2657: JSX expressions must have one parent element.` Fixing JSX structure before rerunning validation.

Update:
- Replaced the mobile horizontal nav strip with a dedicated phone shell: compact sticky identity header plus fixed bottom tab navigation.
- Added mobile safe-area bottom padding so page content is not hidden behind the bottom nav.
- Kept the desktop sidebar behavior intact at desktop widths.
- Tightened dashboard mobile density by using a two-column mobile metric grid, smaller mobile page heading scale, reduced event card scale, and a stacked mobile booking ledger instead of a table.
- Scope stayed inside frontend layout/dashboard styling files; no API contracts, generated clients, server routes, or data behavior changed.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed after fixing the documented JSX structure failure.
- `pnpm --filter @workspace/glam-crm run build` passed with existing sourcemap/chunk-size warnings.
- Mobile Playwright checks at 430x932 passed for `/`, `/services`, and `/contracts`: shell direction was column, bottom nav rendered as grid, document width stayed 430px with no horizontal overflow, and no page/console errors were recorded; screenshots saved at `/tmp/makeup-mobile-dashboard-optimized.png`, `/tmp/makeup-mobile-services-optimized.png`, and `/tmp/makeup-mobile-contracts-optimized.png`.
- Desktop Playwright check at 1430x1137 passed for `/`: shell direction stayed row, mobile nav was hidden, no horizontal overflow, and no page/console errors were recorded; screenshot saved at `/tmp/makeup-desktop-after-mobile-shell.png`.

## 2026-06-04 - Local Run For User Preview

Start:
- Start the local API and Vite frontend so the user can preview the CRM in the built-in browser.
- Scope is environment/runtime only; no product, API, database, or UI source changes are intended.
- Milestone context: Work Package 1.4 Browser Smoke Test and current Work Package 2.10 preview validation.

Validation:
- `pnpm dev` started successfully.
- Vite frontend is serving `http://localhost:5173/`.
- API server is listening on port `8787`.
- `curl -s -i http://localhost:8787/api/healthz` returned `HTTP/1.1 200 OK`.
- Built-in Browser opened `http://localhost:5173/`; page title was `Glam CRM`, the dashboard rendered, and initial browser console inspection reported no errors.

Follow-up:
- API logs showed the localhost preview shell loading while protected data endpoints returned `401` because local deployment secrets enabled admin-session enforcement.
- Restarting for preview with `GLAM_ADMIN_PASSWORD=` and `GLAM_SESSION_SECRET=` explicitly blanked so the local API does not require a session token; this avoids reading or transmitting local secrets.
- After restart, authenticated routes no longer returned `401`, but `/api/notifications` returned `500` because the local Postgres schema was missing the current notifications table shape.
- Running documented schema sync command `pnpm db:push` before refreshing the preview.

Result:
- `pnpm db:push` completed successfully with Drizzle reporting `Changes applied`.
- Refreshed `http://localhost:5173/` in the built-in Browser.
- Browser validation after refresh: page title `Glam CRM`, dashboard headings rendered, no visible error/unauthorized text, no browser console errors, and no horizontal overflow at the current browser viewport.
- API log after refresh showed `200` responses for `/api/notifications`, `/api/artist-profile`, `/api/dashboard/stats`, `/api/dashboard/upcoming`, `/api/bookings`, and `/api/dashboard/next-actions`.
- Current local preview command remains running: `GLAM_ADMIN_PASSWORD= GLAM_SESSION_SECRET= pnpm dev`.

## 2026-06-05 - Remove Leads From Visible CRM Surface

Start:
- User selected the sidebar `Leads` item in the browser and noted that the app does not need leads.
- Scope is Work Package 2.10 UI and UX Polish: remove the visible Leads navigation/route affordances while keeping the change scoped and avoiding generated API or database rewrites.
- Acceptance criteria: Leads no longer appears in desktop sidebar, mobile navigation, command palette, or dashboard next actions; `/leads` no longer renders the Leads page; validation runs for the frontend and affected API route package.

Validation note:
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- Initial `pnpm --filter @workspace/api-server run typecheck` failed because the leads-action import cleanup removed `eq`, which is still used elsewhere in `dashboard.ts`; restoring that import and rerunning.

Update:
- Removed the Leads route import and `/leads` route from `artifacts/glam-crm/src/App.tsx`.
- Removed the public `/inquire` route exposure and command-palette entry because it only feeds the removed Leads workflow.
- Removed Leads from desktop sidebar, mobile bottom navigation, and command palette.
- Removed lead badge logic from the sidebar and stopped the sidebar from fetching notifications only for lead counts.
- Filtered lead-category notifications out of the notification drawer and updated notification empty-state copy so old lead notifications do not navigate to the removed route.
- Removed lead-derived next actions from the dashboard API response so dashboard action cards do not link to `/leads`.
- Updated `Prompt.md` to persist the product decision that Leads is not a visible CRM workflow.

Validation:
- `pnpm --filter @workspace/api-server run typecheck` passed after restoring the still-needed `eq` import.
- `pnpm --filter @workspace/glam-crm run build` passed with existing sourcemap/chunk-size warnings.
- Browser direct check on `http://localhost:5173/leads` showed the app's not-found page, no `Leads` heading, no Leads nav item, and no console errors.
- Browser dashboard/sidebar check showed no Leads nav item.
- Browser command-palette check showed no Leads item and no public inquiry/inquire entry, with no console errors.
- Restarted the local preview with `GLAM_ADMIN_PASSWORD= GLAM_SESSION_SECRET= pnpm dev` so the rebuilt API includes the dashboard next-action change.
- During restart Vite logged one transient proxy `ECONNREFUSED` while the API was still starting; the API then listened on port `8787` and subsequent requests completed normally.
- `curl -s -H 'Cache-Control: no-cache' http://localhost:8787/api/dashboard/next-actions` returned booking-only actions with no `/leads` hrefs.
- Post-restart browser check on `http://localhost:5173/` showed `Dashboard`, no Leads nav/text, no inquire/public-inquiry text, and no browser console errors.

## 2026-06-05 - Add Expense Tracking And Remove Automations Surface

Start:
- User selected the sidebar `Automations` item and noted the app does not need Automations.
- User requested a new expense tracker tab for makeup/products and other business expenses with fields for what it is, optional purchase source, amount, date, and dashboard tracker integration.
- Scope: remove the visible Automations page/navigation/command-palette surface, add database-backed expense tracking, expose expense summaries to the dashboard, and validate frontend/API/database flow.
- Milestone context: Work Package 2.10 UI and UX Polish plus a new expense-tracking work package for operating-cost visibility.
- Acceptance criteria: Expenses appears as a primary CRM surface; Automations no longer appears in visible navigation or command palette; expenses support item/vendor/source, category, amount, date, and notes; dashboard shows expense totals and net/revenue context; validation and browser evidence are recorded.

Validation note:
- `pnpm --filter @workspace/api-spec run codegen` passed and regenerated the React client and Zod API contracts.
- `pnpm db:push` passed and Drizzle reported `Changes applied` for the new expenses table.
- `pnpm --filter @workspace/api-server run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run build` passed with existing sourcemap/chunk-size warnings.
- The previously running local dev server logged stale-build errors while source files and generated client files changed, including a temporary `/api/expenses` `404` before the API restart. Restarting the dev server to load the rebuilt API.
- Browser validation opened `http://localhost:5173/expenses`; the page rendered, the expense form was present, Expenses appeared in navigation, Automations was absent from navigation, and no browser console errors were reported.
- First browser attempt to fill the validation expense form failed because the active element changed during `locator.fill`; retrying from a fresh page state before drawing conclusions about the UI.

Follow-up:
- User selected `Where bought` in the expense form and said it is not needed. Removing the separate purchase-location field and using Vendor as the store/source field.
- User selected `Receipt link` and asked for receipt picture/scan support instead of URL entry. Replacing the URL input with a receipt upload control for receipt photos, scans, or PDFs.

Update:
- Removed the stale purchase-location field from the expenses database schema source so the codebase matches the visible form decision.
- Regenerated the OpenAPI-derived React client and Zod contracts after the receipt image/scan contract change.
- Replaced the frontend receipt URL field with a receipt upload control that accepts receipt photos, scans, or PDFs under 5 MB and stores a data URL plus filename for review.
- Updated expense creation, listing, search, category summaries, and archive flow to use Vendor as the optional purchase source and to show attached receipt filenames in the ledger.

Validation:
- `pnpm --filter @workspace/api-spec run codegen` passed and regenerated the React client plus Zod contracts.
- `pnpm db:push` passed and Drizzle reported `Changes applied` after the expense schema cleanup.
- `pnpm --filter @workspace/api-server run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run build` passed with the existing Vite sourcemap and chunk-size warnings.
- `pnpm run typecheck` passed across workspace libs, API server, frontend, mockup sandbox, and scripts.
- Restarted the local preview with `GLAM_ADMIN_PASSWORD= GLAM_SESSION_SECRET= pnpm dev`; Vite logged transient proxy `ECONNREFUSED` messages while the API was still building, then the API listened on port `8787` and subsequent requests returned `200`.
- `curl -s -i http://localhost:8787/api/healthz` returned `HTTP/1.1 200 OK`.
- `curl -s http://localhost:8787/api/expenses` returned `[]` before validation-row creation.
- `curl -s http://localhost:8787/api/dashboard/stats` returned expense and net-revenue fields at zero before validation-row creation.
- Created a temporary validation expense through `POST /api/expenses` with `receiptDataUrl` and `receiptFileName`; the response returned `201`-equivalent JSON with `active: true`, amount `42.75`, and receipt filename `validation-receipt.txt`.
- Dashboard stats after the temporary row showed `totalExpenses`, `currentMonthExpenses`, and `yearToDateExpenses` as `42.75`, with `netRevenue` and `currentMonthNetRevenue` as `-42.75`.
- Built-in Browser validation on `http://localhost:5173/expenses`: page title `Glam CRM`; Expenses rendered; `Receipt scan` and `Upload receipt photo, scan, or PDF` were present; `Receipt link`, `Where bought`, and `Automations` were absent; validation row and receipt filename rendered; no browser console warnings or errors.
- Built-in Browser interaction proof on Expenses: searching for `Validation receipt scan` kept the validation row visible, showed `validation-receipt.txt`, did not show the no-matches empty state, and the receipt href started with a stored data URL; no browser console warnings or errors.
- Built-in Browser validation on `http://localhost:5173/`: Dashboard rendered; Expenses appeared in navigation; Automations and Leads were absent; `Costs · month` and `Net` trackers rendered; no browser console warnings or errors. Dashboard cards use existing whole-dollar display formatting, so the temporary `42.75` expense rendered as `$43`.
- Archived the temporary validation expense with `DELETE /api/expenses/1`, which returned `HTTP/1.1 204 No Content`.
- Post-archive `curl -s http://localhost:8787/api/expenses` returned `[]`.
- Post-archive dashboard stats returned expense and net-revenue fields back at zero.
- Final built-in Browser check left `http://localhost:5173/expenses` open for preview; the page showed the receipt scan upload, no purchase-location or receipt-link fields, no validation row, an empty ledger state, and no browser console warnings or errors.

## 2026-06-05 - Expense Form Polish Follow-Up

Start:
- User noted the desktop sidebar footer looks visually awkward and requested expense-form refinements: payment method as dropdown options, typed suggestions for the vendor/source field, and formatted amount entry.
- Scope is Work Package 2.10 UI and UX Polish on `artifacts/glam-crm/src/components/layout/Sidebar.tsx` and `artifacts/glam-crm/src/pages/expenses.tsx`; avoid API, generated client, database, and unrelated route changes.
- Acceptance criteria: sidebar footer looks calmer at desktop height, payment method uses selectable options, vendor/source supports suggestions while typing, amount entry formats as currency, and rendered browser validation is recorded.

Validation note:
- Initial `pnpm --filter @workspace/glam-crm run typecheck` failed after the first currency-formatting patch because the Zod resolver output inferred `amount` as transformed `number` while React Hook Form still held the input value as `unknown`. Fixing by keeping form state as a formatted string and parsing to a number at submit time.

Update:
- Reworked the desktop sidebar footer into a compact card-like utility area labeled `Private studio` with notification and theme controls grouped cleanly.
- Changed the expense `Payment method` control from a text input to a select with common payment options including business card, personal card, cash, Venmo, Zelle, PayPal, bank transfer, check, store credit, and other.
- Added type-ahead datalist suggestions to the expense item and vendor/source inputs so common product/restock and supplier names appear while typing without blocking custom entries.
- Changed the amount entry to a currency-styled input with a visible dollar prefix; typed values are normalized while entering and formatted with commas and two decimals on blur.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed after fixing the documented resolver typing issue.
- `pnpm --filter @workspace/glam-crm run build` passed with existing Vite sourcemap and chunk-size warnings.
- `pnpm run typecheck` passed across workspace libs, API server, frontend, mockup sandbox, and scripts.
- Built-in Browser validation on `http://localhost:5173/expenses`: page title `Glam CRM`; Expenses rendered; no framework overlay; item and vendor inputs had datalist suggestion sources; payment method rendered as a select placeholder; sidebar footer rendered as `Private studio` / `Internal tools`.
- Built-in Browser interaction proof: entering `1234.5` in Amount formatted to `1,234.50`; opening Payment method showed dropdown options and selecting `Business card` updated the control; item suggestions included `Foundation restock`, `Concealer restock`, `Setting powder`, and `Lash adhesive`; vendor suggestions included `Sephora`, `Ulta Beauty`, `Amazon`, and `Target`.
- Fresh browser-log filtering after the final select fix showed no new warnings or errors during the interaction validation.

## 2026-06-05 - Sticky Desktop Sidebar Footer Fix

Start:
- User clarified that the desktop sidebar footer was still moving upward while scrolling long pages, with Services shown as the example page.
- Scope is Work Package 2.10 UI and UX Polish on shared shell/sidebar layout only; no API, generated client, database, route, or form behavior changes.
- Acceptance criteria: desktop sidebar occupies the viewport height, main content scrolls independently, sidebar brand/nav/footer remain fixed in viewport coordinates, and validation covers Expenses plus Services.

Update:
- Changed the desktop shell to use viewport height with hidden desktop shell overflow, making the `main` element the vertical scroll container.
- Added `min-h-0` to the desktop main content and sidebar nav flex regions so the footer keeps its bottom position instead of being pushed during overflow.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run build` passed with existing Vite sourcemap and chunk-size warnings.
- `pnpm run typecheck` passed across workspace libs, API server, frontend, mockup sandbox, and scripts.
- Built-in Browser measurement on `http://localhost:5173/expenses`: after scrolling main content by 800px, `window.scrollY` stayed `0`, sidebar top delta was `0`, brand top delta was `0`, footer top delta was `0`, footer bottom delta was `0`, and no browser console warnings or errors were reported.
- Built-in Browser measurement on `http://localhost:5173/services`: after scrolling main content by 471px, `window.scrollY` stayed `0`, sidebar top delta was `0`, brand top delta was `0`, footer top delta was `0`, footer bottom delta was `0`, and no browser console warnings or errors were reported.

## 2026-06-05 - Cross Page Form Polish Follow-Up

Start:
- User requested visible suggestions while typing in the Expenses vendor/input field, noted the Services add-catalog row clips at different window sizes, and noted the Artist business name is too close to the profile image.
- Scope is Work Package 2.10 UI and UX Polish on `artifacts/glam-crm/src/pages/expenses.tsx`, `artifacts/glam-crm/src/pages/services.tsx`, and `artifacts/glam-crm/src/pages/artist.tsx`; no API, generated client, database, or route changes.
- Acceptance criteria: Expense suggestions are visible in-app while typing, Services add row wraps instead of clipping, Artist profile summary spacing is clearer, and rendered browser validation is recorded.

Validation note:
- Initial Browser verification used an unsupported `networkidle` load-state wait, so the rendered check was rerun with the supported `load` wait mode.
- The first visible-suggestion browser pass exposed a race where leaving Vendor could close the Item suggestion menu; fixed by only closing the currently active suggestion field.

Update:
- Replaced the native expense item/vendor datalists with visible in-app suggestion menus that open on focus and while typing, still allowing custom values.
- Updated suggestion close behavior so switching between Item and Vendor does not let one field close the other field's menu.
- Changed the Services add-catalog form from a forced one-line grid to a responsive grid that wraps fields and keeps the submit button inside the form bounds.
- Reworked the Artist profile summary header into a monogram plus identity row with explicit spacing between the profile image and business name.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run build` passed with existing Vite sourcemap and chunk-size warnings.
- `pnpm run typecheck` passed across workspace libs, API server, frontend, mockup sandbox, and scripts.
- Built-in Browser validation on `http://localhost:5173/expenses`: typing `pow` in Item showed `Setting powder`; typing `Se` in Vendor showed `Sephora`; the old native datalist elements were absent; no browser console warnings or errors were reported.
- Built-in Browser measurement on `http://localhost:5173/services` at `1239x1138`: add-catalog form had no clipped children, the Add button stayed within the form bounds, and horizontal document overflow was `0`.
- Built-in Browser measurement on `http://localhost:5173/services` at `900x900`: add-catalog form still had no clipped children and horizontal document overflow was `0`.
- Built-in Browser measurement on `http://localhost:5173/artist`: the profile monogram and business name had a `16px` horizontal gap, and horizontal document overflow was `0`.

## 2026-06-05 - Production Dashboard Blank Page Hotfix

Start:
- User reported that after merging the PR, the GitHub Pages deployment showed a blank dark page with console errors.
- Screenshot and pasted console evidence showed production requests for `/glam-api/api/notifications`, `/dashboard/next-actions`, and `/expenses` returning `404`, followed by `Cannot read properties of undefined (reading 'toLocaleString')` in the built dashboard bundle.
- Scope is Work Package 3.1 GitHub Pages Frontend and Work Package 3.2 Shared Render API Mount: diagnose the live production API state and prevent dashboard render crashes when the frontend briefly receives stale or incomplete API data during deploy skew.

Update:
- Confirmed the shared Render mount is live: production `/glam-api/api/healthz` returned `200`.
- Confirmed the production session endpoint returns `authenticated:false` and `authRequired:true` for unauthenticated GitHub Pages-origin requests.
- Confirmed protected production `/glam-api/api/expenses` now returns `401 Authentication required` with `access-control-allow-origin: https://sequence-labs.github.io`, which means the route exists and CORS is allowing the deployed frontend origin.
- Hardened dashboard money formatting so missing numeric fields from a stale or incomplete production API response render as `$0` instead of throwing a `toLocaleString` crash.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `BASE_PATH=/YeasminGlamDashboard/ VITE_API_BASE_URL=https://whisperflowserver.onrender.com/glam-api pnpm --filter @workspace/glam-crm run build` passed with existing Vite sourcemap and chunk-size warnings.
- `pnpm run typecheck` passed across workspace libs, API server, frontend, mockup sandbox, and scripts.
- Production curl checks with `Origin: https://sequence-labs.github.io` showed `/glam-api/api/healthz` returned `200`, `/glam-api/api/session` returned `authenticated:false` / `authRequired:true`, and `/glam-api/api/expenses` returned protected `401` instead of the screenshot's stale `404`.

## 2026-06-17 - Makeup Trial Booking Option

Start:
- User requested a service option named `Make up Trial` plus a trial date option for booking intake, then a direct push to `main`.
- Scope is Work Package 2.3 Booking Intake UI with related service-catalog seeding: add the reusable service option and create a real booking event with `kind: "trial"` from new booking intake.
- Acceptance criteria: the service catalog exposes `Make up Trial` for existing and new databases, new booking intake has an optional Trial date field, submitting with a trial date creates a trial event, validation passes, and the change is committed and pushed to `main`.

Update:
- Promoted the `Make up Trial` catalog sync into API server startup so the row is created before traffic is served, instead of relying only on request-time seeding.
- Kept the route-level sync as a safety net, but the actual durable fix now happens in `artifacts/api-server/src/index.ts` during boot.

Validation:
- `pnpm --filter @workspace/api-server run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `pnpm run typecheck` passed across workspace libs, API server, frontend, mockup sandbox, and scripts.
- Local dev server started with auth vars blanked so the API and frontend loaded without auth gates.
- Playwright verification on `http://localhost:5173/bookings/new` showed `Make up Trial - $0 / trial` in the service picker options, and the `Optional trial` block rendered with `Trial Date`, `Trial Begins`, and `Trial Completion Target`.

Update:
- Reworked `Make up Trial` from a zero-value service into a chargeable fee-style catalog item with a $100 default unit price and booking unit label.
- Removed the separate trial subpanel from the schedule step and kept only a standard `Trial Date` field, so the booking flow stays uniform while the item is still selectable as a normal catalog line item.

Validation:
- `pnpm --filter @workspace/api-server run typecheck` passed after the fee/service adjustment.
- `pnpm --filter @workspace/glam-crm run typecheck` passed after the schedule-field cleanup.
- Playwright verification on `http://localhost:5173/bookings/new` showed `Make up Trial - $100 / booking` in the service picker.

## 2026-06-17 - Makeup Trial Workflow Correction

Start:
- User clarified that makeup trial should not be a regular service dropdown seed and should return to an optional trial section in booking intake with date, start time, completion target, and amount.
- Scope is Work Package 2.3 Booking Intake UI and Work Package 2.4 Contract Output: capture the trial workflow as booking intake data, persist the amount as a booking charge, remove the default catalog seed, and show trial details in contract preview.
- Acceptance criteria: `Make up Trial` is not forced into the service catalog dropdown, booking intake has an optional trial section with amount and schedule, the amount persists into booking totals, trial schedule persists as a trial event, and contract preview displays the trial when present.

Update:
- Removed the forced `Make up Trial` service catalog seed and deactivate any exact-name row inserted by the previous implementation.
- Restored the optional makeup trial section in Step 3 with trial date, trial amount, trial begins, and trial completion target.
- Trial submission now creates a `trial` event and, when amount is greater than zero, a linked `Make up Trial` fee line item so totals and contract pricing use the normal booking charge model.

Validation:
- `pnpm --filter @workspace/api-server run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `pnpm run typecheck` passed across workspace libs, API server, frontend, mockup sandbox, and scripts.
- `pnpm --filter @workspace/glam-crm run build` passed with existing Vite sourcemap and chunk-size warnings.
- Local API validation booking `11` persisted a `Make up Trial` event with `kind: trial`, `10:00 AM` start, `11:30 AM` completion, and a linked `$125` fee line item.
- Playwright contract preview on `http://localhost:5173/bookings/11/contract` showed `Make up Trial` in Service Schedule, Rate Schedule, Booking Charges, and Grand Total.
- Playwright new-booking check showed the optional trial section with date, amount, start, and completion controls, and the Step 4 service picker no longer listed `Make up Trial`.

## 2026-06-18 - Production Expenses API 404

Start:
- User reported expense creation failing on the GitHub Pages production app. Screenshot and attached logs show Render returning 404 for `POST /glam-api/api/expenses`, `GET /glam-api/api/expenses`, and `GET /glam-api/api/notifications`, while the app UI loads.
- Scope is Work Package 2.11 Expense Tracking and Shared Render API deployment: verify local route registration, compare production behavior, and apply a durable fix instead of a UI-only workaround.
- Acceptance criteria: production API has registered expenses/notifications routes under `/glam-api/api`, expense creation no longer returns 404, validation commands pass, and deployment assumptions are documented if they change.

Update:
- Added a `sync:glam-api-bundle` script and setup documentation for copying rebuilt API bundles into `/Users/iftatbhuiyan/WhisperSpeechServer/glam-api`.
- First validation run failed because the script resolved the repo root as `/Users/iftatbhuiyan` instead of `/Users/iftatbhuiyan/Makeup-Artist-Hub`; fixing that path calculation before rerunning.

Update:
- Rebuilt `artifacts/api-server/dist` and synced it into `/Users/iftatbhuiyan/WhisperSpeechServer/glam-api`; the copied bundle now contains `GET/POST /expenses` and `GET /notifications`.
- `npm test` in `/Users/iftatbhuiyan/WhisperSpeechServer` passed.
- Local shared-server smoke on port 8799 passed: `/glam-api/api/healthz` returned 200, unauthenticated `/expenses` and `/notifications` returned 401 instead of 404, CORS preflight for `POST /expenses` returned 204, authenticated `POST /expenses` returned 201, and the temporary validation expense was archived with DELETE 204.
- Production unauthenticated checks returned 401, but authenticated `POST /glam-api/api/expenses` still returned 404 before pushing the rebuilt Render-service bundle, confirming the deployed route table is stale behind auth.

Update:
- Production route moved from 404 to 500 after the Render bundle push, indicating the route is deployed but failing inside the handler.
- First Supabase schema push attempt failed because `.local/deployment-secrets.env` does not define `GLAM_DATABASE_URL`; retrying with the stored Supabase pooler URL.

Validation:
- `pnpm --filter @workspace/api-server run build` passed and produced updated embedded bundles.
- `pnpm --filter @workspace/scripts run sync:glam-api-bundle` passed after the path fix and copied 12 bundle files into `/Users/iftatbhuiyan/WhisperSpeechServer/glam-api`.
- `pnpm run typecheck` passed across workspace libs, API server, frontend, mockup sandbox, and scripts.
- `npm test` passed in `/Users/iftatbhuiyan/WhisperSpeechServer`.
- Pushed `/Users/iftatbhuiyan/WhisperSpeechServer` commit `b02512c` so Render deploys the rebuilt CRM API bundle.
- `DATABASE_URL=$SUPABASE_POOLER_DATABASE_URL pnpm --filter @workspace/db run push` passed and Drizzle reported `Changes applied`.
- Production authenticated smoke passed on `https://whisperflowserver.onrender.com/glam-api/api/expenses`: login returned 200, list returned 200, create returned 201 for temporary expense id 1, archive returned 204, and final list returned 200.

## 2026-06-18 - Bookings Date Ordering

Start:
- User requested the Bookings list be ordered by booking date, with the nearest/most recent date at the top and the furthest-away date at the bottom.
- Scope is the `GET /bookings` ordering used by `artifacts/glam-crm/src/pages/bookings.tsx`; avoid UI redesign or contract changes.
- Acceptance criteria: bookings API returns rows sorted by `firstServiceDate` ascending, undated rows do not displace dated bookings, and focused validation passes.

Validation:
- Updated `GET /bookings` to order by `firstServiceDate` ascending, with `createdAt` descending as the tie-breaker.
- `pnpm --filter @workspace/api-server run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `pnpm --filter @workspace/api-server run build` passed and rebuilt the embedded API bundle.
- `pnpm --filter @workspace/scripts run sync:glam-api-bundle` passed and copied 12 bundle files into `/Users/iftatbhuiyan/WhisperSpeechServer/glam-api`.
- Verified `/Users/iftatbhuiyan/WhisperSpeechServer/glam-api/embedded.mjs` contains the `firstServiceDate` ordering.
- `pnpm run typecheck` passed across workspace libs, API server, frontend, mockup sandbox, and scripts.
- `npm test` passed in `/Users/iftatbhuiyan/WhisperSpeechServer`.

## 2026-06-20 - Full Booking Edit Intake

Start:
- User requested replacing the small `Edit Booking Details` modal with a full-page edit workflow that mirrors the six-step new booking intake, prefilled with the existing booking.
- Scope is Work Package 2.3 Booking Intake UI and booking-detail editing: preserve existing production bookings and API contracts, expose draft booking edit fields that are currently hard to change, highlight changed sections, and provide restore-to-original controls.
- Acceptance criteria: booking detail opens a full edit page instead of the narrow modal, draft bookings can edit core details, schedule, services/fees, payment due date, payment method, and notes; changed areas are visually flagged; changes can be restored before save; active/signed bookings are protected from direct edits; focused validation passes.

Update:
- Added a full-page `/bookings/:id/edit` draft editor and routed the booking detail edit action to it.
- First frontend typecheck failed on generated API typing: `useGetClient` needed an explicit generated query key, event create payloads cannot send null timing fields, and line-item create payloads cannot send null service item IDs. Fixing those payload shapes before rerunning validation.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run build` passed with the existing UI sourcemap and chunk-size warnings.
- `pnpm run typecheck` passed across workspace libs, API server, frontend, mockup sandbox, and scripts.
- Browser validation on local booking `9` confirmed `Edit Booking Details` opens `/bookings/9/edit`, the six-section editor is prefilled, editing the payment method marks one section as `Changed`, enables `Save changes`, and `Restore section` clears the change and disables save again.
- Browser validation temporarily moved local booking `6` to `active`, confirmed the protected booking banner and `Move to draft` action are shown, confirmed `Save changes` is disabled, and confirmed the payment field is not editable. Booking `6` was restored to `draft` after the check.

Update:
- A first save-path browser check failed because it expected the booking detail page body to visibly include the updated payment method after save. The API did persist the temporary value, so this was a validation expectation issue rather than a save failure. Local booking `9` was restored to its original payment method before rerunning the save check against the API response.

Validation:
- Browser save-path validation on local booking `9` changed the payment method from the full-page editor, submitted `Save changes`, confirmed navigation back to `/bookings/9`, confirmed the API response persisted the temporary payment method, and restored the original local value after the check.

Update:
- Final diff review found that `eventType` was displayed in Step 1 but missing from Step 1's changed-state and restore comparison. Added it so changing only the event type highlights Step 1, enables save, and restores correctly.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed after the event-type dirty-state fix.
- `pnpm --filter @workspace/glam-crm run build` passed after the event-type dirty-state fix with the existing UI sourcemap and chunk-size warnings.
- `pnpm run typecheck` passed after the event-type dirty-state fix across workspace libs, API server, frontend, mockup sandbox, and scripts.
- Browser validation on local booking `9` confirmed changing only Event Type marks one section as `Changed`, enables `Save changes`, and `Restore section` returns the field to its original value.

Update:
- Server logs from the save-path check showed a payment-only save also sent no-op event and line-item PATCH requests because form empty strings were compared against API-normalized nulls. Normalized existing event and line-item comparisons to the same API payload shape before deciding whether to send PATCH requests.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed after the no-op PATCH fix.
- Browser validation on local booking `9` changed only Payment Method, submitted `Save changes`, confirmed the API persisted the temporary value, confirmed the network sent only `PATCH /api/bookings/9` and no event or line-item PATCHes, and restored the original local value.
- `pnpm --filter @workspace/glam-crm run build` passed after the no-op PATCH fix with the existing UI sourcemap and chunk-size warnings.
- `pnpm run typecheck` passed after the no-op PATCH fix across workspace libs, API server, frontend, mockup sandbox, and scripts.

## 2026-06-20 - Align Booking Edit With Intake

Start:
- User clarified that the full booking edit page should be a near-duplicate of the new booking intake, not a parallel form with different Step 3 and Step 5 semantics.
- Scope remains Work Package 2.3 Booking Intake UI: Step 3 in edit should expose the same optional makeup trial block as new booking, including trial amount, and Step 5 should keep payment simple with balance due date and payment method while totals stay calculated from services, fees, and trial amount.
- Acceptance criteria: edit Step 3 mirrors create Step 3 for optional makeup trial fields, existing trial events and linked trial amount prefill into that block, edit Step 5 mirrors create Step 5's simpler payment details, save remains scoped to actual changes, and focused validation passes.

Update:
- Reworked `/bookings/:id/edit` to mirror the create-booking intake grouping more closely: Contract and Status moved into Step 1, Step 3 now uses the same first-event schedule plus optional makeup trial block, and Step 5 only shows Balance Due Date and Payment Method.
- Existing `trial` booking events and their linked `Make up Trial` fee line item are now pulled into the Step 3 trial date/timing/amount fields instead of appearing as generic event or service rows.
- Trial amount edits update the linked trial fee line item so booking totals and contract pricing continue to recalculate through the existing API model. Clearing the optional trial block removes the linked trial fee and trial event.
- Extra non-trial events are preserved under an additional-events area below the create-style Step 3 controls so existing bookings with more than one service event do not lose data.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run build` passed with the existing UI sourcemap and chunk-size warnings.
- `pnpm run typecheck` passed across workspace libs, API server, frontend, mockup sandbox, and scripts.
- Browser validation on local booking `11` confirmed edit Step 3 shows `First event schedule`, the separate `Optional makeup trial` block, prefilled trial date `2026-07-10`, prefilled trial amount `125`, and no generic service row for the linked trial fee.
- Browser validation on local booking `11` confirmed edit Step 5 shows only `Balance Due Date` and `Payment Method`.
- Browser validation changed booking `11` trial amount from `125` to `130`, confirmed the network sent only `PATCH /api/bookings/11/line-items/52`, confirmed the API persisted the temporary amount, and restored the local trial fee back to `125`.
- Browser validation on local booking `9` changed only Payment Method, confirmed the network still sent only `PATCH /api/bookings/9`, and restored the original local value.
