# Makeup Artist Hub Documentation


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
