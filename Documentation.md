# Makeup Artist Hub Documentation


## 2026-08-01 - Mobile Receipt Capture and Itemization (Start)

- User identified manual expense entry as a high-friction workflow and requested photo/screenshot receipt ingestion, automatic itemization, product-code support when available, and a mobile-friendly experience without a paid subscription.
- Scope: Work Package 2.18. Use on-device Tesseract.js OCR, deterministic receipt parsing, explicit confidence/reconciliation warnings, mandatory user review, and an atomic receipt-plus-expenses API so one stored receipt can back multiple ledger items.
- Privacy/cost boundary: receipt pixels remain in the browser during extraction. Tesseract.js is open source and has no per-use fee; its language/runtime assets may download and cache on first use. No paid AI/OCR service or production database is used for local validation.
- Target flow: `/expenses` -> take photo or choose image -> local OCR progress -> editable receipt review -> save itemized expenses or one combined expense -> refreshed ledger and summaries.
- Visual concept: `/Users/iftatbhuiyan/.codex/generated_images/019f9ce3-995c-75c0-938c-46a35433fb5f/exec-ccd8a26a-8469-4631-b074-46f1325ef2c4.png`, preserving the existing editorial cream/oxblood CRM language while making receipt capture the primary one-thumb action.

Validation failure:
- The first OpenAPI codegen attempt stopped before generation because pnpm blocked Tesseract.js 7's dependency build script under the workspace's ignored-build policy. No generated files or database state changed. The package's build script and workspace dependency policy will be inspected before allowing only the specific required dependency.
- The first root typecheck after parser-fixture validation failed only in `@workspace/scripts`: the fixture imported the browser-oriented parser from outside that package's `rootDir`, so DOM globals and the cross-package source path were invalid in the scripts TypeScript project. API/frontend typechecks and both production builds had already passed. The fixture runner will move into the frontend package, which owns the parser and DOM types.

Update:
- Added Tesseract.js 7 as an allowed, on-demand frontend dependency. The OCR engine is dynamically imported only after image selection; the normal Expenses page does not initialize it.
- Added image preparation that downsizes receipts to a bounded 2,000-pixel edge, converts them to high-contrast grayscale, and stores a compressed JPEG. Camera capture uses the phone's environment-facing camera hint; the library action accepts photos and screenshots.
- Added deterministic receipt parsing for merchant/date, subtotal, sales tax, total, product lines, quantity, category suggestions, and printed SKU/UPC/item codes. Low-confidence or unreconciled results stay visibly editable, and an unrecognized amount can be added as a review line.
- Replaced manual-first expense entry with a receipt-first capture surface. The full manual form remains available behind a clear secondary disclosure for no-receipt cases.
- Added a full-screen mobile receipt review with receipt preview, OCR confidence, warnings, editable merchant/date/payment/item/category/quantity/SKU/amount fields, live total reconciliation, business/reimbursable controls, and explicit itemized/combined save actions. Nothing writes before the user presses one of those save actions.
- Added `expense_receipts` as shared receipt storage and nullable `receipt_id`, `product_code`, and `quantity` expense fields. Reviewed imports use one database transaction, so partial itemized receipts cannot be created. A protected attachment route streams one shared stored image instead of duplicating its data in every expense API response.
- Legacy direct receipt attachments, expense search/category summaries, dashboard totals, archive behavior, and the manual-entry form remain compatible. Ledger rows now show quantity and SKU when available.
- Applied only the additive receipt table, columns, foreign key, and index to `makeup_artist_hub_prod_snapshot`. The API/frontend continue to target the local snapshot with runner and SMTP disabled; production was not used as a write target.

Validation:
- `pnpm --filter @workspace/api-spec run codegen` passed and regenerated the Zod/client artifacts from `lib/api-spec/openapi.yaml`.
- `pnpm --filter @workspace/glam-crm run test:receipt-parser` passed fixtures for itemized SKU extraction, named/numeric dates, category inference, total reconciliation, unmatched-amount review, and low-confidence combined fallback.
- API and frontend focused typechecks passed. API and frontend production builds passed; existing component sourcemap and main-bundle size warnings remain non-blocking.
- Root `pnpm run typecheck` passed after moving the fixture runner into the frontend package. `git diff --check` passed.
- Atomic API probe created two itemized expenses with SKU/quantity values, one shared receipt, and a ledger total matching the receipt total. The attachment path returned HTTP 200 with private cache headers and the stored filename/content type. Temporary API probe rows were deleted from the local snapshot.
- In-app Browser QA at `430x932` found no horizontal overflow, no framework overlay, and no warning/error logs. Camera and screenshot actions were present; the manual fallback opened and closed correctly.
- Browser OCR on a synthetic receipt completed at 94% image confidence and detected the 2026-05-08 date, three product lines, a numeric SKU, categories, $88.00 subtotal, $7.04 tax, and $95.04 total. A live parser defect that treated `BRUSH` as a product code was fixed and revalidated as `Brush Cleaner` / `Tools & equipment` with no SKU.
- Browser itemized save created three expenses totaling exactly $95.04 with one shared receipt; combined save created one $95.04 expense with one shared receipt. Both success messages rendered. All synthetic browser QA receipts and expenses were then deleted from the local snapshot.
- Desktop Browser QA at `1499x1324` retained the sidebar, summary metrics, receipt-first capture panel, secondary manual entry, category breakdown, and expense ledger without horizontal overflow or console warnings/errors.
- Image inspection compared the generated two-state mobile concept with final mobile and desktop screenshots. Copy, capture hierarchy, editorial typography, oxblood/cream palette, touch target sizing, review controls, sticky save intent, and responsive container behavior were checked; no material implementation mismatch remains for the existing CRM shell.

Remaining risk:
- Tesseract OCR is intentionally local and free, but receipt formats, glare, folds, faint thermal paper, and retailer abbreviations can reduce accuracy. Mandatory review and reconciliation are the safety boundary; the app must not treat OCR as bookkeeping truth.
- The first scan needs network access to download/cache Tesseract's English language/runtime assets and can take noticeably longer than later scans. No receipt pixels are sent to a paid OCR provider.
- OCR capture currently accepts images and screenshots. PDF receipts can still be attached through manual entry, but automatic PDF page rendering/OCR is not included.
- Real iPhone camera capture and Safari memory behavior were not exercised in this desktop Browser environment. Test one physical-device photo before production rollout.
- Production deployment must apply the additive database schema before publishing the new API/frontend bundle, then rebuild and sync the shared Render bundle. This turn changed only the local snapshot schema and did not deploy or push Git changes.


## 2026-08-01 - Split Apple Calendar Subscriptions (Start)

- User requested two separate Apple Calendar subscriptions: one for scheduled bookings/events and one for payment reminders, because a combined calendar is confusing.
- Scope: Work Package 2.17. Keep the existing tokenized, read-only feed identity and reset behavior, add separate stable booking/reminder feed paths, and replace the single combined subscription UI with two clearly labeled Apple Calendar actions.
- Validation target: each feed contains only its intended event class, both update from the same booking source, and the local snapshot remains the only database write target.

Validation failure:
- In-app Browser navigation reached `/calendar` and rendered the production-derived schedule, but click actions on the existing `Next` and `Subscribe (.ics)` controls did not change state after a fresh tab reload and a Vite restart. Console warnings/errors remained empty, so this is recorded as an interaction-harness limitation rather than an application error.

Update:
- Added separate tokenized routes for `/api/public/calendar/:token/bookings.ics` and `/api/public/calendar/:token/reminders.ics`. The original combined `:token.ics` route remains available for existing subscribers, while new UI links use the separated routes.
- Booking feeds now publish service/trial events only under `Studio bookings & events`; reminder feeds publish balance-due entries only under `Studio payment reminders`. Each feed has its own stable `X-WR-RELCALID`, ETag, filename, Apple `webcal://` link, copyable URL, and download action.
- The subscription dialog now clearly explains the two calendars, labels the reminder feed separately, and uses a bounded scroll surface so both options remain usable on a phone. Resetting the token explicitly resets both new subscriptions together.

Validation:
- `pnpm --filter @workspace/api-server run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `pnpm --filter @workspace/api-server run build` passed.
- `pnpm --filter @workspace/glam-crm run build` passed with existing sourcemap and bundle-size warnings.
- Root `pnpm run typecheck` passed across libraries, API, CRM, scripts, and mockup sandbox.
- Local feed probe returned HTTP 200 for both separated URLs. The bookings feed contained 21 service/trial events and zero `Balance due` summaries; the reminders feed contained 10 balance-due events and zero mixed service summaries. Both feeds ended with valid `END:VCALENDAR` records and had distinct calendar names and ETags.
- Conditional requests returned HTTP 304 for both feeds with matching `If-None-Match` values.
- Local-only reset probe revoked both old URLs (404) and issued new working booking/reminder URLs (200). No hosted production write path was used.
- Browser QA verified `/calendar` page identity, rendered schedule content, screenshot evidence, and empty warning/error logs. The two-button dialog interaction remains unverified because the in-app Browser click harness did not dispatch state changes even after a Vite restart and fresh reload.

Remaining risk:
- The new split dialog and its two Apple actions should receive one manual click check in a normal browser session before publishing. The server routes, feed separation, cache behavior, reset behavior, static typechecks, and builds are verified.


## 2026-08-01 - Refresh Local Production Snapshot (Start)

- User requested a fresh local clone of the hosted production database for localhost viewing and safe local testing.
- Scope: dump production read-only, replace only the explicitly named `makeup_artist_hub_prod_snapshot` database, restore the application `public` schema, apply the current local-only `clients.social_links` compatibility column if the hosted schema does not yet contain it, then restart API/frontend against the snapshot.
- Safety boundary: the hosted connection will be used only by `pg_dump`; `DATABASE_URL` for the API will point only to `postgresql://$USER@127.0.0.1:5432/makeup_artist_hub_prod_snapshot`.

## 2026-08-01 - Refresh Local Production Snapshot (Validation)

- PostgreSQL 17 was already running and accepting connections on `127.0.0.1:5432`.
- A fresh custom-format dump was taken from `SUPABASE_DIRECT_DATABASE_URL` with `pg_dump --no-owner --no-acl`; the hosted database was not used by the application process.
- The explicitly named local database `makeup_artist_hub_prod_snapshot` was recreated and restored with `pg_restore --schema=public --no-owner --no-acl`. The local compatibility column `clients.social_links` exists after restore.
- Local snapshot inventory: 18 clients and 18 database booking rows. The API's `/api/bookings` response currently exposes 13 records after application filtering.
- API restarted on port 8787 with `DATABASE_URL=postgresql://$USER@127.0.0.1:5432/makeup_artist_hub_prod_snapshot` and `GLAM_DISABLE_RUNNER=true`; frontend restarted on port 5173.
- Focused checks passed: `/api/healthz` returned `{"status":"ok"}`, `/api/clients` returned 18 records, and `/api/bookings` returned 13 records.

Validation failure:
- The existing in-app browser tab remained on its prior `This site can't be reached` state. Refreshing that localhost tab was rejected by the browser URL policy after the servers were restarted, so browser refresh could not be used as evidence for this environment handoff.

Remaining risk:
- Local validation uses production-derived CRM data. Keep the API pointed at the local snapshot and keep `GLAM_DISABLE_RUNNER=true`; do not run database push/migration commands against this restored copy without a separate, scoped plan.


## 2026-07-29 - Client Social Profiles (Start)

- User requested editable Instagram and other social/profile handles or direct links on client information and booking details.
- Work Package 2.16 is in progress. The intended model is an extensible client-owned list of platform, handle, and optional URL values, kept out of public calendar and client-portal output.
- Validation will use only the writable local `makeup_artist_hub_prod_snapshot` database; the hosted Supabase connection remains dump-only.

Validation failure:
- The first API typecheck rejected the generated OpenAPI input shape because `ClientSocialLink.url` is optional at the request boundary while the Drizzle JSON type required a present `url` key. The schema type will be aligned to the generated contract; no runtime or database data was changed.
- The documented Drizzle push against the isolated snapshot stopped at an unrelated existing `addon_requests_token_unique` prompt because the non-TTY command could not answer whether to truncate seven existing rows. No schema change was applied; validation will use a scoped additive `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` on the same local snapshot instead of forcing or truncating unrelated data.

Update:
- Added `clients.social_links` as a defaulted JSONB list with platform, handle, and optional direct URL values. OpenAPI, generated Zod contracts, and the React client were regenerated from the source spec.
- Added a reusable social-profile editor and safe link resolver covering Instagram, Facebook, TikTok, X/Twitter, LinkedIn, YouTube, websites, and other platforms. Handle-only entries resolve to platform profile URLs; explicit URLs are limited to HTTP(S) before rendering as links.
- Added social-profile capture to new-client, new-booking, and edit-booking intake. Client detail shows and edits the links; booking detail loads the linked client record and shows the same current links with an `Open client profile` route.
- Public portal serialization now uses a separate `PortalClient` shape and strips `socialLinks`, keeping this internal CRM data out of tokenized client-facing portal responses.
- Applied only `ALTER TABLE clients ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '[]'::jsonb` to `makeup_artist_hub_prod_snapshot`; the hosted production database was not used as the API target.

Validation:
- `pnpm --filter @workspace/api-spec run codegen` passed.
- `pnpm run typecheck` passed after rebuilding workspace library declarations.
- API typecheck and build passed; frontend typecheck and build passed. Existing sourcemap and bundle-size warnings remain non-blocking.
- `git diff --check` passed.
- Browser QA on local snapshot-backed app passed: `/clients` loaded 18 clients; `/clients/12` displayed a reversible Instagram handle-derived link and explicit website URL; client edit exposed add/remove/profile fields; `/bookings/new` exposed the social-profile editor; `/bookings/12` displayed the same client links and direct client-profile route. Browser warning/error logs were empty.
- A reversible local PATCH populated client 12 for UI verification and was restored to `socialLinks: []`; the final API response and browser handoff were verified after restoration.
- A read-only local tokenized portal probe returned HTTP 200 and confirmed the client payload keys exclude `socialLinks`.

Remaining risk:
- Direct-link opening was verified through rendered HTTP(S) hrefs, not by navigating to third-party profile pages. The stored profile data is intentionally internal and is not included in public calendar or portal payloads.


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

## 2026-07-26 - Local Production-Data Snapshot Runtime

Start:
- User requested a localhost runtime populated from the hosted production data without allowing localhost actions to write to production.
- Scope is environment/runtime setup only: create a separate local Postgres snapshot database, point the local API at it, and launch the frontend/API in the built-in Browser. No product source behavior changes are intended.
- Safety acceptance criteria: production is used only as a dump source; localhost uses a distinct database name; local API writes remain confined to that local database; browser opens the snapshot-backed app.

Failure:
- Initial snapshot command failed before touching the database because the PostgreSQL `createdb` invocation used an unsupported `-d` option. No production mutation occurred and the local snapshot database was not created by that failed command.
- Fresh dump completed without a production write, but restore stopped on the Supabase-only `supabase_vault` extension, which is unavailable in local Homebrew PostgreSQL. The target local snapshot database is partial and must be recreated before retrying.
- A follow-up restore-only attempt could not find the temporary dump after the prior shell ended, so the next retry will dump and restore within one bounded command.

Update:
- PostgreSQL 17 was started locally and a fresh dump was taken from `SUPABASE_DIRECT_DATABASE_URL`. The first restore path was corrected to restore only `public`, avoiding Supabase-managed schemas and the unavailable `supabase_vault` extension.
- Created local database `makeup_artist_hub_prod_snapshot` and restored the application schema/data into it. The hosted database was used only as a dump source.
- Started the API on port `8787` with `DATABASE_URL=postgresql://$USER@127.0.0.1:5432/makeup_artist_hub_prod_snapshot`, `GLAM_DISABLE_RUNNER=true`, blank local auth/session variables, and blank SMTP variables. The existing Vite frontend remains on port `5173` and proxies to this API.

Validation:
- Local database verification returned `makeup_artist_hub_prod_snapshot|18` for the booking count and `18` for the client count.
- `curl http://127.0.0.1:8787/api/healthz` returned `{"status":"ok"}` with HTTP 200.
- `GET /api/bookings` returned production snapshot bookings with HTTP 200.
- `GET /api/clients` returned production snapshot clients with HTTP 200.
- Built-in Browser loaded `http://localhost:5173/calendar` with title `Glam CRM`; the July 2026 calendar rendered snapshot events including Jannatul ferdous and Jenat Fahima.
- Browser warning/error log check returned no entries for the snapshot-backed calendar page.

Residual risk:
- The snapshot is a point-in-time copy and will become stale as production changes. Refresh it by repeating the documented dump/restore flow.
- The sandbox database is writable by design, but it is a separate local database. Do not replace its `DATABASE_URL` with a hosted connection string.

## 2026-07-27 - Apple Calendar Subscription Reliability

Start:
- User requested that the Calendar subscription control work correctly with Apple Calendar, expose relevant booking information, and update subscribed calendars as data changes.
- Scope is Work Package 2.13: tokenized iCalendar feed behavior and the Calendar subscription dialog. No schema or generated API contract changes are required.
- Reference expectation: Apple supports adding a subscription by web address and shows subscribed calendars across devices signed into the same iCloud account; the feed must therefore remain reachable, stable, and read-only.

Update:
- `artifacts/api-server/src/routes/public-calendar.ts` now emits a stable `X-WR-RELCALID`, `X-PUBLISHED-TTL:PT15M`, `REFRESH-INTERVAL;VALUE=DURATION:PT15M`, `STATUS:CONFIRMED`, `TRANSP:OPAQUE`, `CLASS:PRIVATE`, change-sensitive event `SEQUENCE` values, `ETag`, `Content-Disposition`, and revalidation-friendly cache headers.
- Service and payment entries retain rich summaries, locations, timezone-aware start/end times, and detailed notes covering client, service breakdown, totals, retainer, balance, payment method, event date, and booking ID.
- `VITE_PUBLIC_CALENDAR_BASE_URL` is now supported by the subscription UI so production or LAN-reachable feeds can be used instead of a phone-inaccessible `localhost` URL. The dialog now clearly exposes the Apple handoff and copyable subscription URL.

Validation:
- API and frontend typechecks passed.
- API and frontend production builds passed; existing sourcemap and bundle-size warnings remain non-blocking.
- Live local feed response returned `Content-Type: text/calendar`, inline `.ics` disposition, `Cache-Control: public, max-age=60, must-revalidate`, and an ETag.
- Feed inspection confirmed stable `X-WR-RELCALID`, refresh hints, timezone-aware `DTSTART`/`DTEND`, `SUMMARY`, `LOCATION`, rich `DESCRIPTION`, `STATUS:CONFIRMED`, `TRANSP:OPAQUE`, `CLASS:PRIVATE`, and non-zero `SEQUENCE` values.
- Browser mobile QA at `430x932` loaded `/calendar` with no console warnings/errors, opened the subscription dialog with `Add to Apple Calendar` and a copyable feed URL, and opened the Jannatul Ferdous event detail from the mobile agenda.
- Browser desktop QA at `1280x900` retained the original month/week/day controls and seven-column month grid with no console warnings/errors.

Remaining risk:
- Apple Calendar's actual refresh timing is controlled by Apple; the feed advertises a 15-minute target but cannot force an immediate client refresh.
- End-to-end device testing still requires adding a deployed HTTPS or LAN-reachable URL to an Apple Calendar account. The local `localhost` feed is intentionally documented as computer-only.

## 2026-07-27 - Mobile Calendar Redesign

Start:
- User requested a complete mobile redesign of the Calendar tab because the desktop seven-column month grid collapses into an unreadable narrow layout.
- Scope is Work Package 2.10 UI and UX Polish, limited to `artifacts/glam-crm/src/pages/calendar.tsx`; desktop month/week/day behavior and API/data contracts remain unchanged.
- Target flow: `/calendar` at a mobile viewport -> month navigation -> clearly grouped scheduled dates -> event/payment detail interaction.
- Visual thesis: replace the shrunken calendar matrix with a calm editorial agenda where the date is the anchor and each event is a readable, tappable row.

## 2026-07-27 - Multi-Event Calendar Fidelity

Start:
- User requested that one booking's multiple events and payment due information remain accurate, distinguishable, and synchronized in both the in-app calendar and Apple subscription feed.
- Scope is Work Package 2.14. The local production-derived snapshot is the only write target for validation; hosted production remains dump-only.

Initial audit:
- The database supports multiple `booking_events` rows per booking, each with its own event date and service window.
- The current payment model supports one explicit booking-level `balanceDueDate`; it does not support several independently dated payment milestones within one booking, so no due dates will be fabricated.
- The existing feed already emits one VEVENT per booking event and one balance-due VEVENT per eligible booking. This pass will verify the identity inputs cover every rendered field and that the browser makes the relationship clear.

Validation failure:
- The first focused typecheck after adding stable ICS stamps failed because the inferred service-item type required `status` on payment reminder items. The fix is scoped to the feed item construction and will add the explicit confirmed status to those reminders.
- The first live feed probe against the restarted API returned HTTP 401 because the restart command omitted the repository's local auth-disable flag. No data was changed; the probe will be repeated with the documented sandbox auth settings.

Update:
- Public service-event summaries now include the booking number, service-event sequences hash every rendered event/booking field, locations include the optional location detail, and cancelled bookings publish `STATUS:CANCELLED` instead of looking confirmed.
- Payment reminders now include client, event type, booking number, location, and the computed outstanding balance; zero-dollar reminders are omitted. The in-app mobile agenda uses the same identifiers so multiple events and due reminders are distinguishable.
- VEVENT `DTSTAMP` now uses the stable booking creation timestamp. This keeps an unchanged feed body and ETag stable between refreshes while source changes still alter the relevant `SEQUENCE` and feed ETag.

Validation:
- API/frontend typechecks and production builds passed. Existing sourcemap and bundle-size warnings remain non-blocking.
- Live feed probe against the isolated snapshot returned stable ETags across a two-second interval and HTTP 304 for a matching `If-None-Match` request.
- Snapshot booking 6 has three event rows (event IDs 5, 6, and 7); the feed emitted one stable UID per row and included booking references for the related event/due entries.
- Reversible local API update of booking 6's location changed event 5's `SEQUENCE` from `206269409` to `4014024096` and changed the feed ETag; the original location was restored and the feed ETag returned to its prior value. The update was confined to `makeup_artist_hub_prod_snapshot`.
- Reversible local API update of booking 6's balance due date from `2026-09-10` to `2026-09-09` changed the balance reminder `SEQUENCE` from `2128408334` to `4179093626` and changed the feed ETag; the original due date was restored to `2026-09-10`.
- Built-in Browser mobile QA at `430x932` showed August 2026 with 8 events and 5 due reminders, including all three event dates for booking 22 and booking-numbered due reminders, with no browser warning/error logs. Desktop QA at `1280x900` retained the month/week/day controls and seven-column month grid.

Remaining risk:
- The current schema has one explicit booking-level `balanceDueDate`; it cannot yet represent several independently dated retainer, partial, custom, or event-specific payment milestones inside one booking. The calendar and feed do not invent such dates. A future payment-schedule table should be added before claiming full multi-milestone support.
- The tokenized Apple feed necessarily exposes the booking details included in its entries to anyone holding the URL; treat feed-token rotation as the privacy control.

## 2026-07-27 - Responsive Desktop Calendar Preview

Start:
- User requested that the computer calendar adapt to available screen width and that clicking an event open a booking-details preview.
- Scope is Work Package 2.15, limited to `artifacts/glam-crm/src/pages/calendar.tsx`; API and database contracts remain unchanged.
- Target flow: `/calendar` -> responsive calendar surface -> click event -> booking preview -> optional full booking route.

Validation failure:
- The first hot-reload browser check at `1221x1138` logged `ReferenceError: BookingPreviewDialog is not defined` from `CalendarPage`, even though the compact agenda itself rendered. The preview symbol/module output will be inspected and corrected before continuing interaction QA.

Direction update:
- User clarified that Mac/desktop must retain the full calendar-view presentation. The responsive implementation will therefore keep the seven-column month/week/day surface for computer widths and limit the agenda presentation to mobile; narrow computer widths will use a controlled scrollable calendar canvas.

Update:
- Desktop/tablet computer widths now retain the full month/week/day calendar. Month and week canvases use a readable minimum width with horizontal scrolling only when the available content area is genuinely narrower than the calendar.
- The mobile agenda is limited to below the `md` breakpoint and derives its own month range, so resizing from desktop week/day mode does not leave mobile showing an inconsistent partial range.
- Calendar event clicks now open a booking preview that loads the booking record, shows the selected event date/time/location, all scheduled booking events, status, total, retainer, balance, and an `Open full booking` route.
- Month-grid overflow items are no longer hidden behind static `+n more` text; all event and payment items remain individually reachable.

Validation:
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run build` passed; existing sourcemap and bundle-size warnings remain non-blocking.
- In-app Browser clean-tab QA passed at `430x932`, `1024x900`, `1221x1138`, and `1440x900`. Computer sizes retained the month controls and seven-column grid; mobile showed the agenda.
- At `1221x1138`, the full month grid rendered without the prior unnecessary horizontal bar after reducing the minimum canvas width; the calendar remained visually complete.
- Clicking the July 4 Jannatul ferdous event at desktop and mobile opened `Booking preview` with the selected event, booking schedule, financial metrics, and `Open full booking`. Following that link reached `/bookings/12` and rendered the booking detail page.
- Clean-tab browser logs were empty at all tested sizes. The earlier hot-reload symbol error did not recur after a full reload.

Remaining risk:
- The preview currently fetches booking details when opened, so a slow API response briefly shows a loading state; no stale booking data is displayed as the preview's final state.

Publish note:
- The GitHub connector rejected draft PR creation with HTTP 403 (`Resource not accessible by integration`) after the branch push succeeded. The documented `gh` fallback will be used after verifying the same authenticated GitHub CLI session.
## 2026-08-01 - Real Receipt Scanner Follow-Up (Start)

User evidence:
- A real iPhone capture of `/expenses` showed `0 detected lines`, `32% image confidence`, an unreadable merchant guess, no purchase date, and disabled save actions for `/Users/iftatbhuiyan/Downloads/IMG_5832.JPG`.
- The supplied Home Depot receipt is long and narrow, fills only part of a wider phone photo, sits on a patterned background, and uses a three-line SKU/description/quantity format. Its visible ground truth includes Home Depot, `07/17/26`, multiple 12-digit product codes, a `$223.41` subtotal/total, `$0.00` sales tax, and AMEX.

Work package:
- Reopened Work Package 2.18 for a real-receipt scanner follow-up.
- Target flow: mobile `/expenses` -> take or choose a full-frame receipt photo -> automatically isolate and enhance the paper -> locally extract editable merchant/date/SKU/item/total proposals -> save only after explicit review.
- Acceptance focus: no paid OCR service, no production writes, preserve the original review step, and make the exact supplied photo materially useful rather than returning an empty review.

Initial diagnosis:
- The existing preprocessing scales the entire photo to a 2,000-pixel maximum edge. On this photo that leaves the narrow receipt text too small while retaining the patterned background as OCR noise.
- The parser expects item descriptions and prices on one line, but Home Depot prints each item as a SKU/header line, a description line, then a quantity-at-unit-price/line-total line.

Implementation:
- Added local document isolation that finds the largest light paper region, crops away the capture background, preserves a compressed color review image, and produces separate high-resolution grayscale and adaptive-threshold OCR inputs.
- Long receipts are scanned in readable sections instead of one tall low-resolution page. A second OCR treatment runs only when the first result is incomplete, and a focused numeric header pass attempts to recover difficult dates.
- Added Home Depot-aware merchant aliases and resilient multi-line retail parsing for SKU/header, description, quantity-at-unit-price, amount-only, OCR-collapsed, discount, tax-exempt, and loyalty-statement lines.
- Product discounts are folded into their positive item line so imports remain compatible with the API's non-negative expense invariant. Duplicated OCR lines are removed by product code or normalized item/amount identity.
- The review UI reports when receipt edges were cleaned and explains that photos and screenshots are accepted. The heavy OCR dependency remains dynamically loaded only after capture.

Exact-photo validation:
- The original implementation reproduced the user's failure: `0 detected lines`, `32% image confidence`, an unreadable merchant, and no usable totals/date.
- The final local pass on `/Users/iftatbhuiyan/Downloads/IMG_5832.JPG` produced `Home Depot`, `66% image confidence`, the correct `$223.41` total, `$0.00` tax, seven separately identified product/SKU lines, and one balanced `$89.92` review remainder. The item total reconciles exactly to `$223.41` and the incorrect `$7,599.48` Pro Xtra loyalty-spend value is excluded.
- OCR read the printed `07/17/26` as invalid `07/41/26`. The app correctly left the date blank instead of silently inventing bookkeeping data; entering `2026-07-17` remains the required manual correction for this crumpled test image.
- No Home Depot test expense was saved and no production database was touched. Browser warning/error logs were empty.

Validation:
- `pnpm --filter @workspace/glam-crm run test:receipt-parser` passed, including an 11-item Home Depot fixture with SKUs, quantities, the `$6.30` discount, zero tax, and exact `$223.41` reconciliation.
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run build` passed with the existing component sourcemap and main-bundle-size warnings.
- Root `pnpm run typecheck` and `git diff --check` passed.

Optional AI fallback research:
- Cloudflare Workers AI is the recommended optional cleanup service: the current free allocation is 10,000 neurons per day, JSON mode is supported, and Cloudflare states that Workers AI customer content is not used to train or improve models without explicit consent.
- The privacy-preserving design is local image crop/OCR first, local redaction of card/auth identifiers, then an explicit user-approved server-side request containing only scrubbed OCR text. The model would structure uncertain text into JSON; it would not write ledger data or receive the receipt image by default.
- Gemini's unpaid API tier was rejected for receipt data because its current terms permit submitted content to be used for product improvement and human review. Hugging Face's free inference credit is currently only `$0.10` per month and is not a dependable production allowance.
- External AI integration remains a pending product decision because it requires a provider account, server-side credentials, explicit consent UI, rate-limit handling, and privacy documentation. Work Package 2.18 remains in progress until that direction is chosen or the local-only residual is accepted.
## 2026-08-01 - Six-Receipt OCR Corpus (Start)

User evidence:
- The user supplied six non-production receipt images for broader OCR validation instead of tuning against only the Home Depot photograph.
- The corpus covers: a clean high-resolution Superstore receipt; a 240x400 Grocery Depot thermal receipt; a 345x576 Walmart receipt with barcode and two tax lines; an angled Texas Roadhouse receipt on a wood background with no visible date; a zero-dollar Grocery Mart receipt; and a 3024x4032 Circle K photograph with quantities, deposits, recycling fees, parenthesized discounts, GST/PST, and a long item list.

Expected safety behavior:
- No corpus image will be saved to the expense ledger.
- Missing dates must remain explicit rather than fabricated, a zero-dollar receipt must remain non-saveable under the current positive-expense contract, and tax/discount parsing must reconcile without turning summary or card metadata into products.

Target flow:
- `/expenses` -> choose each supplied receipt image -> local edge cleanup/OCR -> editable review -> compare merchant/date/items/tax/total against visible ground truth -> close without saving.

Baseline failures:
- Superstore: date, product amount, tax, and `$11,852.49` total were recognized, but the merchant was misspelled `Supersiore` and `Entry EMV $11,852.49` was incorrectly added as a second product, breaking reconciliation.
- Grocery Depot (240x400): `01/07/2019` became the plausible-looking future date `2088-03-09`; `$29.82` became `$529.82`; item text was not usable. The pipeline was not enlarging low-resolution input before OCR.
- Walmart (345x576): the date was correct, but `$27.27` became an inferred `$3.37` and the product lines were unusable. This shares the low-resolution upscaling defect and also requires two tax lines to be summed.
- Texas Roadhouse angled photo: merchant and `$1,826.00` total were recognized, and the missing date stayed blank as required, but three clear products collapsed into one combined line. The current axis-aligned crop does not deskew the receipt.
- Grocery Mart zero-dollar receipt: the correct date was recognized, but `$0.00` became a saveable `$8.00 Amount Paid` item. This is a safety failure: explicit zero totals and payment-summary lines must not be conflated with positive expenses.
- Circle K 3024x4032 photo: processing returned to the capture screen without a review. The broad receipt crop exceeded the practical image/memory budget used successfully by the narrower Home Depot photo.

Validation failure:
- `pnpm --filter @workspace/glam-crm run test:receipt-parser` failed after adding the corpus fixtures because `WALL-MART-SUPERSTORE` matched the generic `Superstore` alias before the Walmart alias. The fix is intentionally limited to vendor precedence; the fixture remains as the regression guard.
- `pnpm --filter @workspace/glam-crm run typecheck` then exposed an upstream declaration mismatch in `@techstark/opencv-js@4.11.0-release.1`: its documented runtime default is a ready promise, but its declaration file only re-exports the OpenCV namespace. The integration keeps strict project settings and adapts that one dynamic-import boundary.
- Browser rerun identified the large Circle K rejection as an upload guard, not an OCR crash: the supplied PNG is `13,894,430` bytes, above the old 12 MiB ceiling. Because image preparation now immediately downsamples to explicit pixel budgets, the ceiling is raised to 25 MiB for current phone photos while processed canvases remain bounded.

## 2026-08-01 - Optional Gemini Receipt Fallback (Start)

User decision:
- The user has a Gemini free-tier API key and explicitly requested the least-expensive image-capable model as a fallback for receipt extraction.

Initial provider choice and live correction:
- The initial implementation selected `gemini-2.5-flash-lite` from the pricing page, but the user's newly configured key returned provider `404 NOT_FOUND`: that model is unavailable to new users. The current key successfully accepts `gemini-3.1-flash-lite`, Google's current lowest-cost stable multimodal model at `$0.25` per million text/image/video input tokens and `$1.50` per million output tokens on paid standard, with input/output free on the free tier.
- Google's unpaid-service terms say submitted content and responses may be used to improve products, may be processed by human reviewers, and should not contain sensitive, confidential, or personal information.
- Therefore Gemini will never run automatically. The review UI must disclose the free-tier risk and require an explicit user action; the key remains server-only, the endpoint performs analysis only, and no response enters the expense ledger until ordinary review and save.

Acceptance and validation:
- Add a no-write authenticated receipt-analysis endpoint with bounded inline image input and validated structured output.
- Preserve local OCR as the default and merge Gemini suggestions only into the open editable review.
- Validate missing configuration and provider failures without leaking key or receipt content to logs.
- Run API/frontend typechecks and builds, focused parser tests, and browser QA with the supplied non-production corpus. Live provider validation waits for `GEMINI_API_KEY` to be configured locally.

Validation failure:
- Initial API code generation stopped because pnpm required an explicit lifecycle-script policy for `@google/genai` and transitive `protobufjs`. Their published runtime files are already built and the blocked consumer-time scripts are unnecessary, so both are explicitly denied under `allowBuilds`; no supply-chain override or script approval was granted.
- The first isolated API launch used the repository fallback PostgreSQL role and failed during startup because local role `makeup_artist_hub` does not exist. Validation was redirected to the documented `makeup_artist_hub_prod_snapshot` URL owned by the local macOS user; no schema or data mutation command was run.

## 2026-08-01 - Redaction-First Gemini Receipt Fallback (Implementation)

Implementation:
- Added `POST /api/expense-receipts/analyze` to the generated API contract and server. It accepts only bounded JPEG, PNG, or WebP data URLs, uses fixed model `gemini-3.1-flash-lite`, requests schema-constrained JSON through the supported `generateContent` image/JSON format, validates the response again with generated Zod, and performs no database operation.
- Added local pre-upload redaction to the browser OCR path. Tesseract line boxes matching card/account, payment brand, authorization, terminal, membership/loyalty, masked-number, or checksum-valid payment-card-number patterns are covered with opaque black rectangles. Product UPC/SKU numbers remain readable. The original receipt preview remains unchanged; Gemini receives only the prepared redacted JPEG sections.
- Added an explicit review panel that shows the redacted copy, reports the number of covered lines, discloses the Gemini free-tier product-improvement/human-review risk, and keeps **Analyze redacted copy** disabled until the user checks consent.
- Gemini suggestions populate only the open editable draft. The post-request update uses functional React state so edits made while the request is in flight are not overwritten wholesale. The existing itemized/combined save controls remain the only database-write path.
- Added setup instructions for server-only `GEMINI_API_KEY` in the ignored `.local/deployment-secrets.env` file and as a Render secret. No key was present or printed during this work; the user clarified that it has not yet been provided to the local runtime.
- Selected the MIT-licensed `opencv-document-scanner` wrapper with pinned `@techstark/opencv-js` for lazy perspective correction. The OpenCV bundle is dynamically loaded only after a receipt image is selected. Candidate paper bounds and perspective contours are quality-gated; uncertain crops fall back safely.

Corpus results after fixes:
- Superstore: merchant/date, one `$10,999.99` line, `$852.50` tax, and `$11,852.49` total are correct; four payment-sensitive lines are locally blacked out before consent.
- Walmart: merchant/date, `$23.09` combined item amount, two taxes summed to `$4.18`, and `$27.27` total are correct; four sensitive payment/account lines are locally blacked out while product codes remain visible. Low-resolution product names still require Gemini or manual review.
- Grocery Depot: merchant and `2019-01-07` are now correct, but the low-resolution image still yields a combined `$28.00` inference instead of the printed `$29.82`; the explicit warning remains and Gemini/manual review is required.
- Texas Roadhouse: perspective correction yields three separate `$420`, `$1,337`, and `$69` lines and exact `$1,826` reconciliation. The receipt has no printed date, so the date correctly remains blank and saving stays disabled.
- Grocery Mart: the zero-dollar receipt now produces zero lines, `$0.00`, a clear warning, and disabled save controls. A browser rerun found a contradictory `$8` reconciliation branch; a new regression fixture and parser guard ensure an explicit zero total cannot be turned back into a positive expense.
- Circle K: the 13.9 MB phone image now reaches review within the bounded image budget instead of being rejected. Local OCR remains unusable on that partial, high-resolution capture (`0 detected lines`), so the review stays non-saveable and is a primary Gemini-fallback case. No payment/card line is visible in the supplied partial image, so the UI reports that no automatic redaction was found and requires visual inspection before consent.
- Every corpus dialog was closed without saving an expense.

Validation evidence:
- `pnpm --filter @workspace/api-spec run codegen` passed.
- `pnpm --filter @workspace/glam-crm run test:receipt-parser` passed with retail, Home Depot, multiple-tax, discount, date-bound, explicit-zero, noisy-zero, and contradictory-zero fixtures.
- `pnpm run typecheck` passed across generated libraries, API server, frontend, scripts, and mockup sandbox.
- API and frontend production builds passed. The frontend still reports existing component sourcemap/main-chunk warnings; OpenCV is emitted as a separate lazy chunk.
- `git diff --check` passed.
- Live snapshot-backed API probes returned health `200`, invalid image `400`, and valid-image-without-key `503`. After the key was configured and the model/request format were corrected, a real Texas receipt returned `200` with structured merchant, date, tax, total, and item data. Browser QA confirmed the consent-gated live request applied `gemini-3.1-flash-lite` suggestions while retaining the editable review.
- Responsive implementation inspection confirmed the full-screen mobile dialog rules (`100dvh`, independently scrollable review body, vertically stacked 48px save controls) remain below the desktop breakpoint; desktop browser review rendered the redaction/consent panel without overflow. A fresh physical/mobile-viewport pass remains part of the live-key follow-up.

Remaining validation:
- The live provider success path is now verified locally. A deployed Render success path remains pending until the same server-only secret is configured in Render and the API bundle is deployed.
- Gemini improves extraction but does not make receipt data authoritative. The user must inspect the redacted preview before consent and review every suggested accounting field before either save action.

Final validation failure:
- After refining numeric redaction to preserve UPC/SKU values, the workspace typecheck reported that TypeScript inferred a regular-expression match callback value as `never` in `containsLikelyCardNumber`. Runtime corpus QA had succeeded; the scoped fix is an explicit `string[]` annotation at that regex boundary, followed by a full typecheck rerun.

Final validation resolution:
- Added the scoped regex-match type annotation. `pnpm run typecheck`, the receipt parser suite, the frontend production build, and `git diff --check` all passed on the final source. The browser redaction rerun still covered four Superstore payment lines and four Walmart payment/account lines while preserving Walmart product-code lines.

## 2026-08-02 - Local Gemini Key End-to-End Validation

## 2026-08-02 - Gemini-First Receipt Review Refinement (Start)

Scope:
- Make the approved Gemini pass the clearly identified source for final receipt metadata and itemized lines, while keeping local OCR as the immediate preliminary draft and safe fallback.
- Add payment-method extraction and purchase-time recognition without transmitting unredacted payment data or changing the ledger before explicit save.
- Validate the Home Depot browser flow at the point where the user sees the date, payment method, and itemized results.

Acceptance checks:
- After the user approves the redacted upload, Gemini suggestions fill merchant, purchase date, payment method, optional purchase time, totals, categories, quantities, and product codes in the editable review.
- The UI labels pre-Gemini rows as preliminary and post-Gemini rows as the smart itemization to review, with flagged exceptions remaining visible.
- Missing Gemini metadata never fabricates a date or payment method; local values remain unchanged when the provider omits a field.

Automatic-review correction:
- The user clarified that Gemini should not be a separate review section or an extra action. Removed the consent panel and Analyze button from the receipt dialog. Once local OCR and local payment redaction finish, the configured server-side Gemini pass now runs automatically against only the redacted image copy.
- The review dialog keeps only a compact status line, labels local OCR rows as `Preliminary local read` while the request is pending, then switches to `Gemini itemized expenses` after the response. The normal editable exception review and save controls remain unchanged.
- The Home Depot browser rerun confirmed the automatic path: no old Gemini panel or Analyze button, Gemini status applied, merchant `The Home Depot`, purchase date `2026-07-17`, purchase time `11:28`, normalized payment `Credit/debit card`, and `11` Gemini itemized rows with quantity/SKU data. The `$47.38` unmatched-line warning remains visible for deliberate review.
- Browser console warnings/errors were empty. The local snapshot remained at `2` expenses and `0` receipt records; API health remained HTTP `200`.

Standardized item naming refinement (start):
- Receipt item names will use a readable, broadly searchable display form while preserving the exact printed receipt label and product/SKU code as searchable details.
- Search will include canonical item name, original receipt wording, product code, category, vendor, payment method, and notes so both general terms such as `primer` and exact store codes can find a line.

Validation:
- Confirmed `.local/deployment-secrets.env` contains a non-empty `GEMINI_API_KEY` without printing the secret. Restarted the API on port `8787` with `DATABASE_URL=...makeup_artist_hub_prod_snapshot`, blank local auth/SMTP settings, and `GLAM_DISABLE_RUNNER=true`; the frontend remained on `http://localhost:5173`.
- The first live request safely returned `503` when no key was loaded, proving the configuration guard. After loading the key, `gemini-2.5-flash-lite` returned provider `404 NOT_FOUND` because it is unavailable to new users. A direct provider check confirmed both `gemini-3.1-flash-lite` and `gemini-3.5-flash-lite` are accepted; `gemini-3.1-flash-lite` is cheaper and is now the fixed model.
- The endpoint was moved from the Interactions request shape to the current `generateContent` inline-image plus structured-JSON format. A real Texas Roadhouse image then returned HTTP 200 with structured merchant, date, tax, total, and three item fields. Unsupported numeric schema constraints were removed from the provider schema; server-side generated Zod remains authoritative.
- Browser flow `/expenses` -> choose Texas receipt -> inspect review -> check redaction consent -> Analyze redacted copy completed successfully. The toast said `Gemini suggestions applied`, the model warning was recorded in the editable draft, and the dialog remained open for review.
- Browser privacy flow with fake Superstore card receipt showed `4 sensitive payment lines were blacked out locally before upload`, preserved product code `EG1C0043323511`, completed the live Gemini request, and applied suggestions without saving.
- Browser page identity was `Glam CRM` at `http://localhost:5173/expenses`; the page was non-blank, had no framework overlay, and browser warning/error logs were empty. The review screenshot showed the consent panel, redacted-copy thumbnail, applied-suggestions warning, editable item fields, and save controls.
- The isolated snapshot `expenses` count remained `2` after all direct and browser tests. No receipt was saved and no hosted production database was used for writes.
- Final `pnpm run typecheck`, receipt parser tests, frontend build, API typecheck/build, and `git diff --check` passed. Build output retains existing sourcemap/OpenCV chunk-size warnings only.

Deployment handoff:
- Local Gemini is fully validated. Before production, add the same `GEMINI_API_KEY` as a secret environment variable on the Render API service, deploy the rebuilt API bundle, and repeat one redacted non-production receipt test against the deployed API. Do not add the key to GitHub Pages frontend variables.

Home Depot follow-up failure:
- The first full browser run with `/Users/iftatbhuiyan/Downloads/IMG_5832.JPG` completed local OCR, detected `Home Depot`, prepared four local payment redactions, and showed the consent gate, but the live Gemini action returned the generic provider-failure toast. No receipt was saved. The next fix adds only sanitized provider status diagnostics to the local API log so the request can be corrected without logging the key or receipt contents.

Home Depot follow-up resolution and full-flow evidence:
- Sanitized local diagnostics identified the provider response issue without exposing the API key or receipt data: Gemini returned a negative value at `items.11.amount`, representing a non-expense adjustment/discount line that the accounting schema correctly rejects. The server now filters non-positive model item amounts before generated Zod validation, while the editable review still requires the user to reconcile any remaining mismatch.
- Re-ran the complete local browser flow with `/Users/iftatbhuiyan/Downloads/IMG_5832.JPG`: upload -> bounded image preparation and perspective cleanup -> local OCR -> four local payment redactions -> explicit free-tier consent -> live `gemini-3.1-flash-lite` request -> editable review. The review completed successfully with `THE HOME DEPOT`, purchase date `2026-07-17`, `11 detected lines`, and Gemini-applied suggestions.
- The editable result preserved item detail, categories, quantities, and product numbers: Mason Mix, nitrile gloves, silicone, screw-holding bit holder, chip brushes, contractor bags, impact bit set, pivot holder, PaintCare fee, and Cover Stain primer. Product SKUs remained available for review while payment/account lines stayed redacted before upload.
- The review correctly surfaced an unresolved `$6.30` difference between the suggested item sum (`$229.71`) and printed receipt total (`$223.41`), alongside the local `$47.38 could not be matched` warning and low-confidence notice. Itemized save remained disabled; the combined save option remained available for deliberate review. No save action was clicked because this was a real test receipt.
- After closing the review, the isolated snapshot `expenses` count was still `2`, API health returned HTTP `200`, and browser console warning/error logs were empty. Production was not queried for writes and was not modified.

Final validation after the normalization fix:
- `pnpm run typecheck` passed across libraries, API server, frontend, scripts, and mockup sandbox.
- `pnpm --filter @workspace/glam-crm run test:receipt-parser` passed with retail, tax, discount, date-bound, zero-total, and Home Depot multi-line fixtures.
- `pnpm --filter @workspace/api-server run build`, `pnpm --filter @workspace/glam-crm run build`, and `git diff --check` passed. Build output retained only known sourcemap, OpenCV browser-externalization, and chunk-size warnings.
- The local Home Depot flow is complete and validated. Remaining work is deployment-only: configure the server-only key on Render, deploy the API bundle, and repeat a redacted non-production receipt test before enabling production use.

Write-path and automation confirmation:
- Re-ran the Home Depot flow through the actual combined-save control after the successful Gemini review. The local ledger displayed `The Home Depot receipt`, `The Home Depot`, `2026-07-17`, and `$223.41`, and the UI showed `Receipt recorded as one expense`; this confirmed the browser-to-API-to-transaction path, not only the analysis path.
- The test row and its receipt record were identified by exact vendor, date, amount, item name, receipt id, and filename, deleted inside one local snapshot transaction, and verified absent. The snapshot returned to its baseline of `2` expense rows and `0` receipt rows. No hosted production write was made.
- The intended workflow is now automation-first: local preparation and OCR run automatically, approved Gemini analysis supplies merchant/date/tax/total/items/categories/quantities/SKUs, and the person only reviews highlighted exceptions and final values before choosing itemized or combined recording. The Home Depot `$6.30` mismatch correctly remained a review exception rather than being silently adjusted.

## 2026-08-02 - Dashboard and Compact Expense Ledger (Start)

Scope:
- Make dashboard summary cards actionable and add a week/month financial pulse without changing API contracts.
- Add month/year/all-time expense filtering to the summary cards while retaining category and text search.
- Replace tall mobile expense rows with compact tap-to-preview rows and an editable detail dialog; retain the full desktop ledger layout.

Milestone:
- Work Package 2.19 in `Plan.md`.

Implementation and validation notes:
- Dashboard stat tiles now route to bookings, clients, or expenses, and the new Studio Pulse card switches between week and month with scheduled count, booked value, period expenses, and net outlook.
- Expense month/year/all-time cards now filter the ledger; the category filter and standardized product/SKU search remain available. The search prompt now names product and SKU lookup directly.
- Mobile expense rows are compact tap targets at the `sm` breakpoint and expose a detail dialog with an edit mode; desktop retains the multi-column ledger and archive action.
- Snapshot QA added one reversible `QA Compact Primer` row, confirmed the filtered expense page and preview control rendered, then the row was removed through the local API. Production was not used.
- A second reversible local snapshot probe patched `QA Edit Primer` to `QA Edited Primer` and `$19.50`, verified the returned values, and deleted the exact row afterward.
- `node -e "require('playwright')"` could not run because the standalone Playwright package is not installed in this workspace; in-app browser validation remains the available UI path.
- One wrapper attempt used the zsh-reserved variable name `status`; it was immediately rerun with `rc` and passed with exit status 0.

Completion evidence:
- In-app browser dashboard validation confirmed the week/month toggle, period labels, scheduled/booked-value/expense/net metrics, and expense-linked summary tile navigation.
- In-app browser expense validation confirmed the month/year/all-time stat buttons render with counts, the compact preview control exists for each expense, and the desktop multi-column row remains the visible layout at the desktop viewport.
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run build` passed with only known sourcemap, OpenCV browser-externalization, and chunk-size warnings.
- `pnpm run typecheck` passed across libraries, API server, frontend, scripts, and mockup sandbox.
- `curl http://127.0.0.1:8787/api/healthz` returned HTTP 200; `git diff --check` passed. The local snapshot was left with zero QA expense rows, and production was not modified.

## 2026-08-02 - Apple Calendar Production Subscription Fix (Start)

Milestone:
- Work Package 2.17, Separate Apple Calendar Subscriptions.

Failure evidence:
- The production HTTPS certificate for `whisperflowserver.onrender.com` validates successfully, and the shared API health endpoint returns HTTP 200.
- The deployed legacy combined calendar route is present, but the newer tokenized `/bookings.ics` and `/reminders.ics` routes return HTTP 401 without a CRM session. Apple Calendar cannot provide that private CRM session, so iOS rejects both subscription URLs.
- The merged API source already mounts all public routes before session authentication. The production response therefore identifies a stale embedded CRM API bundle in `WhisperSpeechServer`, not a TLS certificate failure or a need to expose authenticated CRM routes.

Scope and validation plan:
- Rebuild the merged API source, sync the generated bundle into the shared Render service repository, and run its test suite plus local snapshot-backed feed probes with CRM authentication enabled.
- Publish the documentation/validation guard in a new ready pull request because the prior feature PR is already merged.
- Publish the generated shared-server bundle, wait for Render, then verify both production HTTPS feeds return `text/calendar` without a CRM session while authenticated CRM routes still return 401.

Validation issue:
- API typecheck, API build, and the 12-file bundle sync passed. The first `npm test` invocation ran from the CRM repository because the chained command retained its original working directory, so npm reported that this workspace has no root `test` script. The shared-server test is being rerun with an explicit `/Users/iftatbhuiyan/WhisperSpeechServer` working directory.
- The corrected shared-server test passed all 6 tests. Its first snapshot-backed HTTP smoke returned 503 before route handling because the newly synced bundle imports `@google/genai`, while the deployment repository did not yet declare that server dependency. No production endpoint or database was modified; the deployment manifest must pin the same SDK version as the API workspace before publishing this bundle.

Validation resolution:
- Added the already-pinned `@google/genai@2.13.0` runtime dependency to the shared Render service repository. Its 6-test Node suite passed again.
- Started the shared server on port 8799 with CRM authentication enabled and the isolated `makeup_artist_hub_prod_snapshot` database. The tokenized bookings feed returned HTTP 200, `text/calendar`, calendar name `Studio bookings & events`, and 21 events; the reminders feed returned HTTP 200, `text/calendar`, calendar name `Studio payment reminders`, and 10 events.
- The same smoke confirmed an invalid feed token returns 404 and unauthenticated `/clients` remains 401. The local server was stopped after validation, and no production database write occurred.
- `npm audit --omit=dev` on the existing shared service dependency tree reports 18 advisories (1 low, 10 moderate, 5 high, 2 critical). Automated force upgrades were not applied because they are unrelated, potentially breaking changes; this remains a separate deployment-repository security maintenance item.
- The first production polling wrapper stopped before authentication because zsh cannot safely `source` the dotenv-formatted secrets file when a value contains shell-significant text. The retry loads only `GLAM_ADMIN_PASSWORD` through the repository's dotenv parser; no secret or feed token is printed.

Production deployment evidence:
- Published `/Users/iftatbhuiyan/WhisperSpeechServer` commit `a8cd133` (`Commit #23 - Deploy split calendar feeds and Gemini runtime`) to `main`, which triggered the shared Render deployment.
- The first live poll after deployment returned health 200, bookings 200, and reminders 200. A second content inspection confirmed both production responses use `text/calendar; charset=utf-8`; bookings publishes `Studio bookings & events` with 22 current events, while reminders publishes `Studio payment reminders` with 10 current events.
- The production `/clients` route still returns 401 without a session. TLS verification remains valid, and the calendar URLs are HTTPS; Apple Calendar can now fetch the read-only tokenized feeds without a CRM login.
- Work Package 2.17 is complete. The user should remove any failed calendar entries from iOS and subscribe again so Apple validates the newly deployed routes.

## 2026-08-21 - Owner-Editable Bridal Services Menus (Start)

Milestone and work package:
- Milestone 2, Work Package 2.21: Owner-Editable Bridal Services Menus.

User intent:
- Preserve the existing General and Florida printable/PDF menu design while allowing the owner to edit every displayed item name, description/inclusion/note, and price herself.
- Add editing to an existing relevant page when possible, and connect saved changes directly to the previewable printable menu.

Initial audit:
- The current `/service-menus` page previews and shares committed static PDF/PNG assets generated by `artifacts/glam-crm/scripts/generate-service-menus.py`; its prices and copy cannot currently change at runtime.
- `Services & Fees` already edits reusable booking-catalog rows, but the bridal marketing menu includes packages, regional pricing, offers, travel rules, and editorial notes that do not map safely to booking line items.
- `Website Studio` contains a browser-local editor for similar public-site menu copy, but its drafts are not authenticated server-persisted and do not drive the printable menu.
- The implementation will keep marketing-menu content isolated from booking pricing, add authenticated persistence, and preserve the existing static artifacts as the unchanged fallback.

Planned validation:
- Generate the OpenAPI clients and apply only additive schema changes to the isolated local database.
- Run focused API/frontend typechecks and builds, then the root typecheck.
- Exercise a reversible authenticated save/reload round-trip and visually inspect both dynamic print pages at desktop and mobile widths.

Backend persistence update:
- Added a separate revisioned `service_menu_content` JSON document table and additive Supabase migration. The table is not part of the booking `service_items` catalog, has RLS enabled, and grants no direct `anon` or `authenticated` Data API access.
- Added authenticated `GET/PATCH /api/service-menu-content`. The default GET is read-only and returns the reviewed 14-entry menu model without inserting a row; PATCH validates the exact allowlisted item/field set and uses optimistic revisions so stale tabs cannot overwrite newer edits.
- The owner-managed model includes the prior 13 Website Studio menu items plus the previously hard-coded specialty style note.
- Current Supabase changelog and Data API security guidance were reviewed. No relevant database breaking change affects this additive Postgres table; the production project's disabled Data API and existing direct server connection remain the intended access boundary.
- `pnpm --filter @workspace/api-spec run codegen` passed and regenerated the API client and Zod contracts.
- `pnpm --filter @workspace/api-server run typecheck` passed.

Editor and printable-preview update:
- Extended the existing Website Studio Menu tab instead of creating a duplicate editor. It now loads the authenticated saved revision as its base, keeps in-progress edits as local drafts, validates print-safe field lengths, and provides explicit `Save printable menu` and `Preview printable menu` actions.
- Added the previously missing `A note on style` entry, bringing the editor and saved printable document to 14 entries.
- Replaced the static image-only preview on `/service-menus` with a data-driven two-page US Letter document that preserves the General/Florida switch, editorial image, ivory/oxblood/champagne palette, two-column essentials, package cards, offer, travel/timing rows, style note, and the package-title/price separation.
- `Print / Save PDF` uses the browser print workflow and the current saved content. Checked-in PDFs and page PNGs remain available as clearly labeled reviewed originals; after customization the UI warns that those archived downloads retain original pricing.
- The booking Services & Fees schema, API, row count, and booking line-item rows were not changed.

Validation failure:
- Applying the additive migration to the isolated Homebrew snapshot created the table and enabled RLS, then stopped at `revoke ... from anon, authenticated` because plain local PostgreSQL does not define Supabase's Data API roles. The migration is being narrowed to conditionally revoke only roles that exist, preserving the production hardening without making local validation depend on Supabase-managed roles.
- The first stale-revision probe returned HTTP 500 instead of 409 because Drizzle wraps PostgreSQL's `23505` unique-key code under the query error's `cause`. The valid save, invalid-content rejection, and default restore still succeeded; the error-code check is being corrected before repeating the stale-write test.

## 2026-08-02 - Shareable Bridal Services Menus (Start)

Milestone and work package:
- Milestone 2, Work Package 2.20: Shareable Bridal Services Menus.
- This entry starts the requirements/design phase only. No PDF, PNG, frontend source, database, API, or deployment file is changed in this documentation subtask.

Scope:
- Create two public-facing GLAMBYEASMIN services menus: one general edition and one Florida edition.
- Deliver each edition as a print-quality PDF plus a high-resolution PNG that can be shared through text, email, or social messaging.
- Add a prominent responsive CRM surface where the artist can select an edition, preview it, download either format, and use native sharing when available with a clear fallback.
- Produce an initial rendered preview for user direction before treating the visual design as final.

Canonical pricing guard:
- Bridal Makeup: `$400`.
- Bridal Hair: `$300`.
- Synthetic bun extension add-on: `$15`.
- Bridal Set Up: `$50`.
- Bridal Hijab Set Up: `$50`.
- Bridal Makeup Trial: `$150`.
- Signature Bridal Package: `$700`.
- Bridal Bundle, general edition: `$600 (each event)` with `$25 off each day` when booking 3 or more bridal services.
- Bridal Bundle, Florida edition: `$675 (each event)` with the same bundle terms. This is the only Florida-specific price change currently approved.
- Special Bridal Offer: Bridal Makeup Package at `$700 (each event)` with a free `$150` Bridal Makeup Trial when booking 2 or more bridal events.
- Travel: `$50` for 10-15 miles; `$100` for 20+ miles; further distances are quoted during consultation.
- Early Morning Fee: `$200` for 3:00-5:00 AM; `$75` for 6:00-7:00 AM.

Visual thesis:
- Elevated bridal editorial rather than a generic price sheet: warm ivory foundation, restrained burgundy or plum, subtle champagne accents, refined serif display type, crisp body typography, and generous whitespace.
- Use beauty-oriented detail and composition without stock photography, clip art, crowded ornament, or low-contrast text.
- Preserve a coherent visual identity across PDF, PNG, and the CRM preview while keeping the service descriptions easy to scan on a phone.

Acceptance criteria:
- Two distinct, correctly labeled PDFs and four matching page-level share PNGs preserve every supplied price and service requirement without forcing details into one extra-tall image.
- Only the Bridal Bundle price differs by region: `$600` general and `$675` Florida.
- PDF fonts are embedded, text remains selectable, margins are print-safe, and rendered pages have no clipping, overlap, missing glyphs, or illegible copy.
- PNG assets remain sharp and legible at original size and phone width.
- The responsive CRM surface makes the menus easy to discover and supports preview, edition selection, PDF download, PNG download, and share/fallback behavior.
- The user receives a visual preview before final design approval.

Validation plan:
- Run frontend typecheck/build and root typecheck after implementation.
- Use `pdfinfo`, `pdffonts`, and `pdftotext -layout` to validate both PDFs structurally and compare edition pricing.
- Render every PDF page with `pdftoppm -png -r 180` and visually inspect layout, hierarchy, typography, margins, and legibility.
- Inspect all four final page-level share PNGs at original resolution and phone width.
- Validate menu discovery, edition switching, preview, downloads, and native-share fallback in the browser at `430x932`, `768x1024`, and `1440x900`.
- Run `git diff --check` and review the final scoped diff.

Privacy and non-goals:
- These are static, public-safe marketing assets. They must contain no client, booking, contract, payment, receipt, or other private CRM data.
- Do not add a database model, authenticated API dependency, paid image service, or dynamic pricing system for the first version.
- Do not invent new prices, regional differences, contact details, booking policies, or marketing claims.
- Do not publish the first visual direction as final before user review.

## 2026-08-02 - Shareable Bridal Services Menus (Initial Preview Evidence)

Implementation:
- Generated original bridal editorial artwork with the built-in image-generation tool: warm ivory stone, bridal veil, makeup brushes, ivory rose, and an oxblood ribbon with no people, logos, or text.
- Added `artifacts/glam-crm/scripts/generate-service-menus.py`, which produces two-page, letter-size General and Florida PDFs plus 180-DPI page-level share PNGs for each edition.
- Added the static public-safe assets under `artifacts/glam-crm/public/service-menus/` and review PDF copies under `output/pdf/`.
- Added `/service-menus` with a General/Florida switch, two-page live preview, PDF and PNG downloads, full-PDF opening, and native sharing with copied-link fallback.
- Added prominent discovery from the desktop/mobile navigation, command palette, and the Services page header.
- No database, API, authentication, client, booking, receipt, or other private-data surface changed.

Pricing and PDF validation:
- `pdftotext -layout` comparison confirmed the editions differ only in edition labels and Bridal Bundle price: General is `$600 / event`; Florida is `$675 / event`.
- Both editions retain Bridal Makeup `$400`, Bridal Hair `$300`, Bridal Set Up `$50`, Bridal Hijab Set Up `$50`, Synthetic Bun Extension `$15`, Makeup Trial `$150`, Signature Bridal Package `$700`, Special Bridal Offer `$700 / event`, travel fees `$50` and `$100`, and early fees `$200` and `$75`.
- `pdfinfo` reports two unencrypted US Letter pages for each PDF with no JavaScript or forms.
- `pdffonts` reports every Arial and Georgia production font embedded and subset with Unicode mapping.
- Increased the PDF body/detail typography to improve readability, then visually inspected every rendered page at 180 DPI. Each page-level share PNG is `1530x1980`; no extra-tall composite is generated. No clipping, overlap, missing glyphs, or illegible text was found.

Frontend validation:
- `pnpm --filter @workspace/glam-crm run build` passed. Existing sourcemap, OpenCV browser-externalization, and chunk-size warnings remain unchanged.
- `pnpm run typecheck` passed across libraries, API server, frontend, scripts, and mockup sandbox.
- The in-app browser confirmed the menu route and Services-page entry point, General/Florida switching, correct region-specific price and asset URLs, loaded `1530x1980` previews, and no horizontal overflow at `430x932` and `768x1024`. Desktop validation at the default app viewport also passed.
- All four public download assets returned HTTP 200 from localhost with the expected `application/pdf` or `image/png` content type and nonzero byte size.
- Browser warning/error logs were empty. The share control was exercised without a console error; final iPhone native-share-sheet acceptance remains part of user review.
- `git diff --check` passed before the final documentation update and is rerun in the final scoped-diff review.

Current status:
- The initial visual direction is ready for user review. Work Package 2.20 remains in progress until the user approves the visual direction or requests revisions.

Publication preparation:
- Scoped files were staged on `codex/service-menu-pdfs`; no unrelated worktree changes were included.

## 2026-08-02 - Shareable Bridal Services Menus (Readability Revision)

User feedback:
- The original detail copy was too small, and one extra-tall share image was difficult to use in messages.

Revision:
- Increased PDF body, supporting-detail, package, travel/timing, and style-note typography while preserving the two-page editorial composition and all canonical pricing.
- Removed the extra-tall composite share PNGs. Each edition now exposes its rendered PDF page 1 and page 2 as separate `1530x1980` share-ready PNG downloads.
- Updated the CRM copy and controls from one `Download share image` action to `Share page 1` and `Share page 2` actions.
- Removed the obsolete composite assets from the public asset directory and updated Prompt, Plan, Setup, and Documentation to describe the page-level format.

Revision validation:
- Regenerated both PDFs and all four page-level PNGs with the scoped generator.
- `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `pnpm --filter @workspace/glam-crm run build` passed with the same existing sourcemap, OpenCV browser-externalization, and chunk-size warnings.
- `pdfinfo`, `pdffonts`, and `pdftotext -layout` passed for both two-page Letter PDFs; the only edition content difference remains the General `$600` versus Florida `$675` Bridal Bundle price.
- Visual inspection confirmed larger detail copy, clean spacing, no clipping/overlap, and page-level PNG dimensions of `1530x1980`.
- Local HTTP checks returned 200 with the expected PDF/PNG content types for both PDFs and all four page-level images. No composite share image is generated or linked.
- Published as `Commit #34 - Improve menu readability and sharing` on `codex/service-menu-pdfs`; because PR #6 had already merged, the revision is tracked in follow-up ready PR #7.
- Commit created: `41f545b` (`Commit #33 - Add shareable bridal service menus`).
- Binary PDF internals produce expected `git diff --check` trailing-space diagnostics; the check excluding `**/*.pdf` passed for all source, documentation, script, and PNG changes.

Final polish:
- Constrained the enlarged package titles to their own text column so Signature Bridal Package and its `$700` price never overlap.
- Re-rendered and visually inspected the corrected package card, page 1, and detail sections; the title now wraps cleanly and all prices remain separated.
- Final focused frontend typecheck and build passed. Existing sourcemap, OpenCV browser-externalization, and chunk-size warnings remain unchanged.

## 2026-08-03 — Authenticated Website Studio migration (started)

- **User direction:** move the GLAMBYEASMIN Website Studio out of the public website and into Yeasmin's existing authenticated Makeup Artist Hub dashboard so GitHub Pages never exposes editor controls.
- **Architecture decision:** the dashboard will own authentication, drafts, image/media authorization, preview, publish, and rollback. The public website will receive only a sanitized published snapshot; it will not query private CRM rows or expose dashboard credentials.
- **Initial audit:** the dashboard already has an `AuthGate`, session-protected API middleware, a `/service-menus` page, a Vite/Wouter route structure, and the existing service catalog/API boundary. The current YeasminWebsite Studio remains a development-only reference implementation until the dashboard route is integrated.
- **Security constraints:** do not rely on a hidden frontend route as authorization; protect reads and writes in the API/session boundary, keep service-role/database secrets server-side, validate uploads, and review storage/RLS policies before adding persistence.
- **Work scope:** audit and port the Studio preview/editor seam, add the authenticated dashboard route, add only the minimum public-site preview bridge required for exact cross-origin previews, and validate production exclusion plus authenticated/unauthenticated behavior before publication.

## 2026-08-03 — Dashboard Studio route vertical slice

- Added `artifacts/glam-crm/src/pages/website-studio.tsx` and routed it at `/website-studio`.
- Added `Website Studio` to the authenticated dashboard Sidebar and Command Palette; the existing mobile More sheet consumes the same secondary-link list.
- The page provides Homepage/Services menu preview selection, desktop/tablet/mobile frame controls, an exact public-site iframe preview URL, a source-file inventory for known portfolio/service/ornament slots, and browser-local replacement staging/reset controls.
- The route is inside `AuthGate`; the local development bypass is unchanged and must not be treated as production authentication.
- Deliberately did not copy the public site's dev-only Astro Studio or claim durable publishing: these controls use browser-local drafts until the authenticated website-content/media schema and server-side publish workflow are implemented.

Validation:
- `pnpm --filter @workspace/glam-crm typecheck` passed.
- Remaining validation: frontend production build, deployed-like auth smoke test, API-backed draft/media model, and removal/verification of the public site's dev-only Studio route after dashboard persistence is ready.

## 2026-08-03 — Dashboard home Studio shortcut

- Added a prominent `Website Studio` button to the dashboard command-center header, so the protected editor is reachable without typing `/website-studio`.
- Kept the shortcut inside the dashboard; no public-site navigation or unauthenticated editor link was added.

## 2026-08-03 — Full Website Studio browser-local parity

- User review correctly identified that the dashboard route was only a preview/audit scaffold, not the complete editor previously available at the website's development-only `/studio/` route.
- Required parity scope is now explicit: all 16 image slots, source inventory, search/filter, replacement and per-slot reset, the complete 13-item service-menu editor, live cross-origin preview updates, desktop/tablet/mobile preview controls, import/export, reset-all confirmation, and browser-local persistence matching the former editor's behavior.
- This parity slice remains protected by the dashboard `AuthGate`. Browser-local drafts are not represented as server-published content; API-backed publishing remains a separate security-sensitive gate.

### Dedicated full-screen editor correction

- User review clarified that Website Studio must not render as another page inside the normal dashboard shell. The dashboard entry point now transitions to the protected `/website-studio` route as a dedicated full-screen workspace with its own branded header and an explicit `Dashboard` back link.
- Removed the Studio page's `Shell` wrapper, CRM sidebar, mobile dashboard navigation, and shell padding while retaining the existing `AuthGate` around the route. The editor and exact public-site preview now share the full viewport in a two-pane desktop workspace.
- Browser validation at `http://127.0.0.1:5173/website-studio` confirmed one `Website Studio` heading, one `Dashboard` back link, zero navigation/sidebar landmarks, all 16 image slots, all 13 menu entries, and the connected exact homepage preview.
- `pnpm --filter @workspace/glam-crm typecheck` passed.
- `pnpm --filter @workspace/glam-crm build` passed. Existing sourcemap, OpenCV browser-externalization, and large-chunk warnings remain unchanged.
- Root `pnpm run typecheck` passed across libraries, API server, Glam CRM, mockup sandbox, and scripts.
- A 430x932 browser pass reported equal `scrollWidth` and `clientWidth` with the full-screen Studio heading and controls visible; no horizontal page overflow was present. Browser warning/error logs were empty.
- The public preview bridge was independently validated in YeasminWebsite with formatting, Astro check, 12 unit/content tests, a Pages-like two-route production build, production-asset boundary verification, and a focused Chromium iframe test covering valid image/menu application plus atomic rejection of unknown identifiers.

## 2026-08-04 — Production booking-detail schema incident

- **User report:** the production bookings list renders, but opening existing bookings such as IDs 11, 12, and 24 shows `Booking not found` while the API returns HTTP 500.
- **Confirmed cause:** the deployed Drizzle schema selects `clients.social_links`, but hosted Supabase `public.clients` does not contain that column. PostgreSQL logs repeatedly report `column clients.social_links does not exist` at the booking-detail requests.
- **Why list still works:** the list query selects only `clients.name`; the detail query and client-detail query select the complete client record and therefore request the missing column.
- **Change boundary:** apply one idempotent, additive `jsonb NOT NULL DEFAULT '[]'` column migration. Do not modify or delete existing client or booking data.
- **Acceptance:** hosted schema reports the expected column/type/default; authenticated client/list endpoints remain 200; every active booking ID returned by the production list has a 200 detail response; IDs 11, 12, and 24 render in the deployed dashboard.

### Repair and validation evidence

- Generated and retained the idempotent migration at `supabase/migrations/20260804052843_add_client_social_links.sql`; its version matches the hosted `supabase_migrations.schema_migrations` entry created by the production migration.
- Applied `ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '[]'::jsonb` to hosted Supabase. Postflight inspection returned `data_type=jsonb`, `is_nullable=NO`, default `'[]'::jsonb`, and zero null client rows.
- Authenticated production API smoke passed: `/clients` 200, `/bookings` 200, and all 14 booking IDs returned by the list produced 200 detail responses. Reported IDs 11, 12, and 24 each returned 200 independently.
- Deployed browser verification passed for all three reported routes: booking 11 rendered `Asma Shariff`, booking 12 rendered `Jannatul ferdous`, and booking 24 rendered `Fatima ihsan`; none rendered `Booking not found`.
- Booking 24 received a final visual inspection with its client, booking summary, and service schedule visible. Browser warning/error logs were empty.
- Supabase Security Advisor returned no findings after the migration. Performance Advisor reported pre-existing informational foreign-key/index notices unrelated to this additive column repair; no index changes were made in this incident scope.
- Current Supabase breaking-change review found no platform change relevant to this direct Postgres column addition. The repository migration and hosted migration history are now aligned.

## 2026-08-21 - Owner-Editable Bridal Services Menus (Completion Evidence)

Implementation outcome:
- Website Studio remains the single owner editing surface. Opening `/website-studio?tab=menu` shows all 14 printable entries and editable titles, descriptions/inclusions, notes, kickers, shared prices, and General/Florida Bridal Bundle prices.
- `Save printable menu` persists one validated, revisioned public-safe marketing document through the authenticated API. `/service-menus` reads that same saved document for both dynamic previews and browser Print / Save PDF output.
- The current two-page editorial composition, regional switch, original artwork, color system, package-title price separation, route discovery, and reviewed-original PDF/PNG fallbacks remain intact.
- No booking service-catalog or historical booking-line-item behavior was connected to marketing menu edits.

Database and API evidence:
- The additive migration applied successfully to `makeup_artist_hub_prod_snapshot` after making Supabase-role revocation conditional for plain local PostgreSQL. The table is RLS-enabled and has no browser/Data API grants.
- With API authentication enabled, unauthenticated GET returned `401`; authenticated default GET returned `customized:false`, revision `0`, 14 items, General `$600 / event`, and Florida `$675 / event` without inserting a row.
- A reversible authenticated update changed Bridal Makeup to `$401 QA`, returned revision `1`, and a subsequent GET preserved it. Empty-title input returned `400`; unknown fields and duplicate item IDs returned `400`; a stale revision returned `409`; the saved default restore returned revision `2`.
- A real Browser editor save changed Bridal Makeup to `$425 QA`; `/service-menus` rendered the change, displayed the archived-original warning, and retained it after reload. The exact QA row was then deleted from the isolated snapshot after verifying its key and value.
- Post-cleanup snapshot counts returned to `menu_rows=0`, `services=16`, and `booking_lines=82`, proving the menu test did not change the booking catalog or booking line items. Hosted production was not modified.

Rendered browser and print evidence:
- Desktop validation at `1440x1200` rendered two 600x776 preview sheets with `scrollHeight === clientHeight` and zero application horizontal overflow. Visual inspection found no title/price collisions, clipping, or overlap on either page.
- General/Florida switching changed both edition labels and the Bridal Bundle price; Florida showed two `$675 / event` occurrences and zero General edition labels.
- Mobile validation at `430x932` rendered 334x432 sheets, retained equal page client/scroll heights, and reported application width equal to the available viewport width.
- Print-media emulation hid the editor controls, set the body to white, and produced two visible named `service-menu` pages at exactly `816x1056` CSS pixels (8.5x11 inches at 96 DPI). The in-app browser cannot programmatically write the native print dialog's PDF file, so structural PDF-file inspection was not available; the actual supported user path remains the visible Print / Save PDF control.
- Browser warning/error logs were empty after validation.

Command evidence:
- `pnpm --filter @workspace/api-spec run codegen` passed.
- `pnpm --filter @workspace/api-server run typecheck` and `pnpm --filter @workspace/glam-crm run typecheck` passed.
- `pnpm --filter @workspace/api-server run build` and `pnpm --filter @workspace/glam-crm run build` passed. The frontend retained only the existing sourcemap, OpenCV browser-externalization, and large-chunk warnings.
- `pnpm run typecheck` passed across libraries, API server, frontend, scripts, and mockup sandbox.
- `python3 -m py_compile artifacts/glam-crm/scripts/generate-service-menus.py` passed for the reviewed-original fallback generator.
- `git diff --check -- . ':(exclude)**/*.pdf'` passed.

Deployment boundary:
- This work is implemented and locally validated but not deployed. Production rollout must apply the new migration first, rebuild/sync the shared Render API bundle, and publish the frontend afterward. Supabase advisors should be run before applying the production migration.

### 2026-08-21 production rollout and final review

- Applied the versioned `owner_editable_bridal_service_menu` migration to hosted Supabase before API deployment. Postflight inspection confirmed the six expected columns, RLS enabled, and no `anon` or `authenticated` grants. The advisor's informational `RLS Enabled No Policy` notice is intentional because only the session-protected server connection accesses this document.
- Final review found that form fields remained editable during an in-flight save, while the success handler cleared drafts. Disabled menu inputs and draft-reset controls while a save is pending so later keystrokes cannot be silently discarded.
- Aligned API, generated-contract, editor-input, and server normalization limits with the fixed printable layout: title 56, kicker 60, description 360, note 260, and price labels 40 characters.
- Rebuilt and synchronized the API bundle into WhisperSpeechServer. Its six-test suite passed, and deployment PR #1 merged before the final dashboard follow-up.

## 2026-09-01 - Assistant Artist Agreement Builder (Start)

- Started Work Package 2.22 to create a printable, internal agreement for hired makeup artists, hairstylists, and comparable assistants. This is intentionally separate from client booking contracts.
- Initial contract defaults are $90 per completed client and a $100 booking deposit, with editable terms for different assistants and jobs.
- Reviewed the existing client-contract system and New York State guidance before implementation. The agreement will avoid claiming that a contract label alone determines worker classification; that determination depends on the actual relationship and applicable law.
- The three user-mentioned reference images were not available at their supplied paths, so no image-derived instructions were used.
- Validation failure: the first `pnpm --filter @workspace/api-server run typecheck` stopped on two TypeScript narrowing errors in the new assistant-agreement route when reporting invalid request data. No database or hosted environment was changed; the validation guards are being corrected before the next run.
- Browser validation note: the first local save-flow attempt stopped before submission because the test automation used the ambiguous label `Event`, which also matched `Event date`. The page was rendered without console errors; the retry uses an exact field locator.
- Browser validation note: the first print-emulation inspection command used a TypeScript-only non-null assertion, which the browser JavaScript runtime rejected before it reached the page. The rendered contract was unaffected; the print check is being rerun with valid JavaScript.
- Print validation failure: print media correctly hid the agreement controls and set the page background to white, but the CRM sidebar remained visible in the print canvas. The print styles are being narrowed to the assistant-agreement shell so the exported document contains only the agreement.
- Final database-inspection note: the first post-cleanup RLS query referenced a non-existent `information_schema.tables.row_security` column. The migration and API smoke checks had already succeeded; RLS is being rechecked against PostgreSQL's `pg_class.relrowsecurity` field.

### Implementation and validation evidence

- Added persistent `assistant_artists` profiles and `assistant_agreements` records. A saved profile holds reusable contact, role, and payment details; every agreement separately snapshots its event, assignment range, rate, deposit, payment timing, special notes, and status.
- Added authenticated API routes for list/create/read/update operations and regenerated the OpenAPI Zod contracts and React Query client. The page at `/assistant-agreements` now saves and reloads agreements, auto-fills the contract, and provides a Print / Save PDF action.
- The print-ready agreement includes deposit receipt/credit language, attendance and cancellation/no-show terms, reasonable replacement-cost language, professional/sanitary scope, client/business confidentiality, independent-classification caveat, and two signature blocks. It defaults to $90 per completed client, a 2-3 person assignment range, and a $100 booking deposit, while keeping every field editable.
- Created the additive, RLS-enabled migration `supabase/migrations/20260901045121_add_assistant_artists_and_agreements.sql`. It revokes direct `anon` and `authenticated` access because data remains available only through the authenticated server API. The migration was applied only to `makeup_artist_hub_prod_snapshot`; hosted Supabase was not changed.
- Database postflight on the isolated snapshot confirmed both tables exist, both collections return empty after cleanup, and `pg_class.relrowsecurity` is true for `assistant_artists` and `assistant_agreements`.
- Browser QA on `http://127.0.0.1:5173/assistant-agreements` passed: creating a QA assistant generated a profile and agreement, a $95 rate updated the compensation range to $190-$285, restoring $90 restored $180-$270, and the saved agreement reloaded with its values. The QA agreement and assistant were then deleted by their verified local IDs, leaving both new tables at zero rows.
- Desktop and 430x932 mobile checks reported no relevant console warnings/errors and no mobile horizontal overflow (`scrollWidth=clientWidth=415`). Print-media emulation hid the controls and CRM sidebar, set the body to white, and retained only the agreement document.
- `pnpm --filter @workspace/api-spec run codegen`, focused API/frontend typechecks, API/frontend builds, root `pnpm run typecheck`, API smoke checks, and `git diff --check` passed. The frontend build retained the existing sourcemap, OpenCV browser-externalization, and large-chunk warnings.
- Production rollout is intentionally not performed. Before deploying, apply the reviewed migration to hosted Supabase, run the advisor/security review, rebuild and synchronize the shared Render API bundle, then publish the dashboard frontend.

### 2026-09-01 - Assistant Agreement Heading Contrast Fix

- Browser review found that the Assistant Artist Agreement title and its numbered section headings inherited a light color on the white document canvas. Set the assistant-agreement `h2` and `h3` text to a dark print-safe navy with a scoped rule.
- Browser recheck confirmed the title, sections 1-5, and the section 6 signatures heading are now dark and legible on the white agreement page. The rule is also part of the printable document stylesheet, so the contrast persists for Print / Save PDF.
- Focused frontend TypeScript validation and the production dashboard build passed after the stylesheet change. The build retained the pre-existing source-map, OpenCV browser-externalization, and large-chunk warnings; `git diff --check` also passed.

## 2026-09-01 - Assistant Agreements Workspace and Audit History (Start)

- Continuing Work Package 2.22: Assistant Agreements will move out of the client-contract page into a dedicated sidebar workspace. The workspace will list each assistant artist and their present/past agreements, provide agreement detail/editing, and show a durable change history.
- The audit trail will be append-only, scoped to the agreement, and written atomically with creation and updates so the displayed history cannot omit a successful change.
- Reviewed current Supabase migration/RLS guidance before adding the history table. The database remains server-accessed; the new table will enable RLS and revoke direct `anon` and `authenticated` access like the existing assistant-agreement tables.
- Validation failure: the first frontend typecheck rejected the generated agreement-detail query options because the generated hook requires its query key when options are supplied. The editor is being aligned with the existing query-hook pattern before the next validation run.
- Isolated Browser-data setup note: the first clone attempt used a PostgreSQL 16 `pg_dump` client against the local PostgreSQL 17 snapshot, so PostgreSQL rejected the dump before any data was copied. The empty test database will be removed and recreated with the matching client; no working agreement data was changed.
- Local server refresh note: stopping the previous development wrapper did not stop its child API process, so the first refreshed API start correctly failed with `EADDRINUSE` on port 8792. The exact listener will be identified and stopped before retrying; no source or database data was affected.

### Implementation and validation evidence

- Added the `assistant_agreement_audit_events` migration and Drizzle schema. It captures a timestamp, actor, action, plain-language summary, changed values, and a contract snapshot. RLS is enabled, direct `anon` and `authenticated` table access is revoked, and a database trigger rejects audit-row updates and deletes.
- The agreement API now creates the agreement and its `created` history event in one transaction. It appends only meaningful agreement updates, distinguishes status changes, and also records assistant-profile changes on the linked agreement history. Detail responses include newest-first history; list responses remain lightweight.
- Assistant Agreements is now a first-class sidebar destination. Its dedicated landing page supports search and all/current/past filters, groups agreements by artist, displays current versus past work and statuses, and opens an editable full agreement. The old shortcut card was removed from client Contracts.
- Browser QA used a temporary isolated database and confirmed: a new agreement appears under its artist with a confirmed current status; opening it shows full editable detail; creation, status update, and assistant-profile update appear in the visible timeline. The temporary database, test data, and temporary servers were removed afterward; normal local data was not changed.
- Local snapshot postflight confirmed `assistant_agreement_audit_events` exists with RLS enabled and its immutable trigger installed. The main local API was rebuilt and restarted against the normal local snapshot after the feature change.
- The immutable-trigger behavior was also exercised in a rollback-only local transaction: an inserted temporary audit event rejected `DELETE` with `assistant agreement audit events are append-only`, and the following count confirmed zero retained test rows.
- `pnpm --filter @workspace/api-spec run codegen`, focused API/frontend typechecks, root `pnpm run typecheck`, API build, frontend build, and `git diff --check` passed. The frontend build retained the existing source-map, OpenCV browser-externalization, and large-chunk warnings.
- Production rollout was not performed. Apply `supabase/migrations/20260901051005_add_assistant_agreement_audit_events.sql` to hosted Supabase before deploying the rebuilt API and dashboard.

### 2026-09-01 - Assistant Agreements Interface Refinements

- Renamed the shared sidebar entry from `Artist` to `Profile`; this also updates the corresponding mobile navigation label while preserving the existing `/artist` destination.
- Removed the legal-use note from the Assistant Agreements editor as requested.
- Change history is now collapsed by default and can be expanded with `Show history` or collapsed again with `Hide history`; the complete audit trail remains intact.
- Browser recheck on the local dashboard confirmed the `Profile` navigation label and the removed legal-note box. Focused frontend typecheck, production build, and `git diff --check` passed. The build retained only the pre-existing sourcemap, OpenCV browser-externalization, and large-chunk warnings.

## 2026-09-01 - Live Assistant Agreement Save and Print Investigation (Start)

- Began Work Package 2.22 production investigation after a live mobile save reported that the assistant agreement could not be saved and Print / Save PDF appeared not to respond.
- The deployed GitHub Pages frontend contains the Assistant Agreements workspace, including the Profile navigation refinement; the hosted API requires authentication. The prior feature record explicitly states that its new migrations and rebuilt API bundle were not deployed, so the live API/schema rollout is being verified before changing the client behavior.

### Diagnosis, rollout, and validation evidence

- Confirmed the cause of the save failure: the live Supabase database initially had none of `assistant_artists`, `assistant_agreements`, or `assistant_agreement_audit_events`, and the embedded Render API bundle had no assistant-agreement routes. An authenticated production request returned `404 Cannot GET /glam-api/api/assistant-agreements`.
- Applied the two existing additive migrations to hosted Supabase. All three tables now exist with RLS enabled; the audit-event immutability trigger was created. No agreement, artist, or other CRM records were created, edited, or deleted during diagnosis.
- Rebuilt and synchronized the API bundle, ran `/Users/iftatbhuiyan/WhisperSpeechServer`'s six-test suite successfully, and merged its deployment pull request #3. After Render picked up the bundle, the same authenticated live request returned `200` with an agreement list response.
- Updated the agreement print action to retain the native print path while giving a clear phone-specific message: the device print screen is where the artist can print, save, or share the PDF. If a browser does not expose printing, the app now tells the artist to open the agreement in Safari or Chrome instead of silently doing nothing.
- Focused frontend typecheck and production build passed, as did `git diff --check`. The frontend build retained only the existing sourcemap, OpenCV browser-externalization, and large-chunk warnings.

## 2026-09-03 - Cohesive Bridal and Party Service Menu Library (Start)

- Started Work Package 2.23 as a documentation-only planning pass. No application source, generated client, database, migration, or deployed environment was changed.
- The Service Menus flow will be redesigned as one cohesive library organized first by menu type (`Bridal` and `Party`) and then by available location (`General` and `Florida` where applicable). One selected-menu workspace will own the preview and the three clear primary actions: Edit, Share, and Print.
- Reviewed originals will remain available for recovery but will move under an `Archived originals` section that is collapsed by default, so fallback files no longer compete with the current editable menu.
- Reviewed the supplied four-page `Party priceless (1).pdf` by text extraction and rendered-page inspection. It is the source for the current Party General menu: Simple Glam `$130`, Soft Glam `$175`, Party Glam `$225`, Party Hair `$185`, Setups `$75`, Hijab Setups `$75`, travel `$50` for 10-15 miles and `$100` for 20+ miles with consultation for further distances, Early Morning Fee `$200` for 3:00-5:00 AM and `$75` for 6:00-7:00 AM, and the note that the artist specializes in full glam.
- The marketing-menu data boundary remains explicit: Bridal and Party collateral must not update booking Services & Fees, operational service records, or prior booking-local price snapshots.
- Acceptance criteria and future validation now cover generated API clients when needed, an isolated local migration when needed, authenticated API persistence, frontend typecheck/build, desktop and mobile Browser flows, marketing/booking data isolation, and clean print/PDF output for every available menu edition.
- Focused API typecheck passed. The first frontend typecheck failed in the new editor because the generated query hook requires an explicit query key and the change comparison did not narrow optional response data; implementation was paused to record the failure before applying those two local typing fixes.
- The additive migration `supabase/migrations/20260903175807_expand_service_menu_library.sql` was applied only to local `makeup_artist_hub_prod_snapshot`; its constraint now allows the preserved `bridal-services` key and new `party-services` key. A first isolation-count query used a guessed `public.services` table name and failed without changing data; the actual schema will be inspected before retrying with the real table names.
- Desktop and 430-by-932 Browser checks passed for menu selection, location choices, Party preview, editor access, save/reload, restored source wording, touch targets, and horizontal overflow. The first real two-page PDF render exposed a pre-existing print isolation defect: the printable pages inherited dashboard positioning, which shifted and clipped content. The print document is being moved to a body-level print portal before the render is repeated.

## 2026-09-03 - Cohesive Bridal and Party Service Menu Library (Completed Locally)

- Rebuilt `/service-menus` around a two-step choice: select Bridal or Party & Event, then select only a confirmed location edition. Bridal offers General and Florida; Party intentionally offers General only because the supplied PDF does not define Florida pricing.
- Replaced the competing download/open/share controls with one selected-menu workspace, a live two-page preview, one primary `Save or share menu` action, and secondary Edit and Print actions. Bridal source files remain recoverable under `Archived originals`, collapsed by default.
- Added a dedicated editor for each menu key. A successful Browser round trip changed the first Party service name, saved it, reloaded it from the API, verified the persisted value, and restored `Simple Glam`. Save errors surface through a destructive recovery toast and optimistic concurrency preserves the last saved revision.
- Added the Party General document with all 11 source-derived items and a distinct two-page editorial layout. `Setups` and `Hijab Setups` preserve the source naming and current `$75` prices. Party marketing content remains separate from operational `service_items` and booking records.
- Extended the existing server-owned `service_menu_content` persistence with `party-services` while preserving the legacy Bridal endpoint. Generated React Query and Zod clients were regenerated from the updated OpenAPI contract. The additive database migration was applied only to `makeup_artist_hub_prod_snapshot`; hosted Supabase was not changed.
- The isolation round trip kept counts unchanged at 18 bookings and 16 operational service items while the menu row count changed only from 0 to 1. A repeated stale Party save returned HTTP 409 with the expected reload-before-saving message.
- Fixed the print defect by rendering a body-level print-only document instead of inheriting the dashboard's positioned layout. Headless Chrome produced two-page, US Letter PDFs for Party General, Bridal General, and Bridal Florida. Rendered-page inspection confirmed clean margins, no clipping or overlap, no private CRM controls, and preserved Florida Bridal Bundle pricing of `$675 / event`.
- Browser checks at desktop and 430-by-932 phone size confirmed clear selected-menu identity, Party/Bridal switching, Party's single General location, Bridal's General/Florida options, editor access, save/reload, touch-sized actions, collapsed archives, zero horizontal overflow, and no console warnings or errors.
- Validation passed: API code generation, API typecheck/build, frontend typecheck/build, root workspace typecheck, and `git diff --check`. The frontend build emitted only the repository's existing sourcemap, OpenCV externalization, and large-chunk warnings.
- Deployment boundary: this work is complete in the local branch only. No hosted database migration, commit, push, merge, GitHub Pages publication, or production API deployment was performed in this task.

## 2026-09-03 - Work Package 2.23 Simple Glam Photo Follow-up (Start)

- Started a documentation-only follow-up to associate the two supplied JPG references with the Party General menu's Simple Glam section: `/Users/iftatbhuiyan/Makeup-Artist-Hub/artifacts/glam-crm/public/service-menus/party-simple-glam-01.jpg` and `/Users/iftatbhuiyan/Makeup-Artist-Hub/artifacts/glam-crm/public/service-menus/party-simple-glam-02.jpg`.
- The follow-up acceptance target is to keep both photos scoped to Simple Glam and apply a print-safe crop/treatment with clean margins, no clipping, and no reduction in service-copy legibility.
- This start note changes durable planning documentation only. No application source code or image asset was edited.

## 2026-09-03 - Work Package 2.23 Simple Glam Photo Follow-up (Completed Locally)

- Added the two supplied images as durable, web-optimized assets at `artifacts/glam-crm/public/service-menus/party-simple-glam-01.jpg` and `party-simple-glam-02.jpg`. Their preserved aspect ratios are 1458-by-1800 and 1480-by-1800; the combined optimized size is approximately 797 KB.
- Reshaped Party page 1 so Simple Glam is the photographic focal point: the two tightly cropped portraits sit inside the Simple Glam service block beside its name, `$130` price, and description. Soft Glam and Party Glam remain quieter supporting choices beneath it, so the images cannot be mistaken for another service.
- Browser verification confirmed both source images loaded at desktop and 430-by-932 phone size, the app retained zero horizontal overflow, and the browser console remained free of warnings and errors.
- A fresh headless-Chrome print produced a two-page US Letter PDF. Rendered page 1 inspection confirmed both portraits, the Simple Glam association, readable copy and pricing, clean margins, and no clipping or watermark intrusion in the applied crops.
- Validation passed: focused frontend typecheck, production frontend build, root workspace typecheck, and `git diff --check`. The production build retained only the repository's existing sourcemap, OpenCV browser-externalization, and large-chunk warnings.
- Deployment boundary remains unchanged: the photo follow-up is local only and has not been committed, pushed, merged, or deployed.

## 2026-09-03 - Work Package 2.23 Soft Glam Photo Follow-up (Start)

- Started a documentation-only follow-up to associate `codex-clipboard-9f4123c4-44ed-410b-a00e-f549de931473.jpg` and `codex-clipboard-d01d2e4a-35e4-4f7a-a4f2-ad7688c0a240.jpg` only with the Party General menu's Soft Glam section.
- Acceptance requires print-safe, unclipped image treatment that preserves the legibility of the Soft Glam service details and surrounding menu content. No application source or image asset is changed in this documentation-only step.
- Print-validation command failure: the first headless-Chrome command was rejected before execution because it attempted to remove predictable temporary files with `rm -f`. No PDF or project file was changed. The retry will use a fresh `mktemp` directory and avoid deletion.

## 2026-09-03 - Work Package 2.23 Soft Glam Photo Follow-up (Completed Locally)

- Added the supplied Soft Glam references as optimized, durable assets at `artifacts/glam-crm/public/service-menus/party-soft-glam-01.jpg` and `party-soft-glam-02.jpg`. Their preserved dimensions are 1775-by-1800 and 1487-by-1800; the combined optimized size is approximately 907 KB.
- Rebalanced Party page 1 into a deliberate service sequence. Simple Glam keeps its own two-photo row, Soft Glam now has a separate reversed two-photo row beside its `$175` name and description, and Party Glam remains a compact text-only service block until its own references are supplied.
- Tightened the Simple Glam crop so the source watermark remains outside the client-facing frame and explicitly set the Party hero title to ivory for reliable screen and print contrast.
- Browser checks at 1440-by-900 and 430-by-932 confirmed all four service-specific images load, the Soft Glam row stays attached to the correct title and price, and the page has no horizontal overflow. The phone preview showed the complete two-page menu within the existing responsive preview flow.
- A fresh headless-Chrome export produced a two-page US Letter PDF. Rendered page 1 inspection confirmed legible service names, prices, and descriptions; clean margins; intact face crops; no clipping or overlap; no visible source watermark; and a clear distinction among Simple Glam, Soft Glam, and Party Glam.
- Validation passed: focused frontend typecheck, production frontend build, root workspace typecheck, and `git diff --check`. The build retained only the repository's existing sourcemap, OpenCV browser-externalization, and large-chunk warnings.
- Deployment boundary remains unchanged: this follow-up is local only and has not been committed, pushed, merged, or deployed.

## 2026-09-03 - Work Package 2.23 Party Glam Photo Follow-up (Start)

- Started a documentation-only follow-up for three supplied Party Glam references, with durable asset placeholders at `artifacts/glam-crm/public/service-menus/party-glam-01.jpg`, `party-glam-02.jpg`, and `party-glam-03.jpg`.
- Acceptance requires all three photos to remain associated only with Party Glam, use a print-safe three-image composition with intact face crops, and preserve the legibility of the Party Glam service name, price, description, and surrounding menu copy.
- This start note changes durable planning documentation only. No application source code or image asset was edited, and the follow-up is not marked complete.
- Edit failure: the first combined JSX/CSS patch was rejected before changing either file because the CSS hunk was accidentally scoped to the component path. The implementation will be retried as separate, file-specific patches.

## 2026-09-03 - Work Package 2.23 Party Glam Photo Follow-up (Completed Locally)

- Added the three supplied Party Glam references as optimized assets at `artifacts/glam-crm/public/service-menus/party-glam-01.jpg`, `party-glam-02.jpg`, and `party-glam-03.jpg`. Their preserved dimensions are 1327-by-1800, 1216-by-1800, and 1737-by-1800; the combined optimized size is approximately 1.03 MB.
- Replaced the temporary text-only Party Glam block with a dedicated `$225` feature row. Its asymmetric collage uses one large portrait and two stacked supporting crops, distinguishing Party Glam from the equal two-photo Simple Glam and Soft Glam treatments while keeping every reference inside the correct service section.
- Browser measurement found the first collage grid inherited excessive intrinsic image height and pushed the makeup-inclusions note outside the page. Constraining the triptych grid to the intended feature height restored an exact fit; final desktop and 430-by-932 phone checks reported equal content scroll/client heights and zero horizontal overflow.
- A fresh headless-Chrome export produced a two-page US Letter PDF. Rendered page 1 inspection confirmed all three Party Glam images, intact face and eye-makeup crops, clear `$225` pricing and description, clean margins, the complete makeup-inclusions note, and no clipping or overlap.
- Validation passed: focused frontend typecheck, production frontend build, root workspace typecheck, and `git diff --check`. The build retained only the repository's existing sourcemap, OpenCV browser-externalization, and large-chunk warnings.
- Deployment boundary remains unchanged: the Party Glam photo follow-up is local only and has not been committed, pushed, merged, or deployed.

## 2026-09-03 - Work Package 2.23 GitHub Merge (Start)

- The user authorized committing, pushing, and merging the cohesive Service Menus library together with all supplied Simple Glam, Soft Glam, and Party Glam photos.
- The release commit must use the repository's next sequential `Commit #` prefix.
- The user subsequently clarified that the Service Menus release should be made fully operational before merge, including its required hosted Supabase constraint and shared Render API deployment.

## 2026-09-03 - Service Menu Release Review Follow-up

- Independent release review found that the new keyed endpoints initially returned HTTP 404 on the hosted Render API and the hosted database still had the older single-key constraint. The production release work below resolves that gate before the dashboard merge.
- Restored the supplied PDF's explicit Soft Glam and Party Glam inclusions for brows, blush, bronzer, highlight, lip application, and lashes.
- Added individual Party text limits plus combined page-one/page-two print budgets in both the editor and server normalization layer. A first maximum-description test fit only while titles and prices remained short; independent review then demonstrated that simultaneously maximal names, prices, and descriptions could still overflow. The final guard rejects that combined case before saving with a clear print-readiness message, limits long unbroken title/price tokens, and keeps the approved source copy at zero measured element, page-X, or page-Y overflow with 16 pixels remaining above the first-page footer. The intended source copy was restored and saved after testing.
- Reopened the prior Website Studio menu-draft view under `?tab=menu` as a clearly labeled `Saved drafts` recovery tab. Browser verification confirmed the URL no longer redirects and browser-local drafts can be reviewed or moved into the current Service Menus workflow.
- Final sequential validation passed API typecheck/build, frontend typecheck, the `/YeasminGlamDashboard/` production build, the full workspace typecheck, and `git diff --check`. The same existing sourcemap, OpenCV browser-externalization, and large-chunk warnings remain non-blocking.
- Initial GitHub release preparation opened pull request #16; its final diff was narrowed to the completed Service Menus work before merge.

## 2026-09-03 - Work Package 2.23 Production Release (Start)

- The user clarified that the completed Service Menus library, Party pricing, supplied Simple/Soft/Party Glam photos, editor, and printable output should be released now.
- Release order remains database first, shared Render API second, authenticated live Bridal/Party save-load verification third, and the Service Menus-only dashboard merge last. The production change must not alter booking-service pricing or private CRM records.
- Applied the additive `expand_service_menu_library` migration to hosted Supabase. Postflight inspection confirms the old Bridal-only check is gone, the replacement permits only `bridal-services` and `party-services`, no `anon` or `authenticated` grants exist, and the menu table remains empty until the authenticated API initializes defaults. Existing advisor notices are unchanged and unrelated to this constraint expansion.
- The first shared-server test attempt in a fresh isolated worktree stopped before loading tests because that worktree had no `node_modules` and Node could not resolve `dotenv`. The dashboard API build and 12-file bundle sync succeeded; tests will be rerun using the server repository's existing locked dependencies.
- Reran the shared-server suite against its existing locked dependencies; all six tests passed. Published `Commit #27 - Deploy service menu library API` and merged WhisperSpeechServer pull request #4. The merge completed successfully; the CLI's optional local branch cleanup reported that `main` is already checked out in the primary worktree, which did not affect the remote merge or Render deployment.
- After Render switched revisions, authenticated production requests returned HTTP 200 for both `/service-menu-content/bridal-services` and `/service-menu-content/party-services`. Saving each reviewed default created revision 1; immediate reloads returned identical items; intentionally stale revision-0 saves returned HTTP 409 for both menus. This verified live persistence and overwrite protection without modifying booking, client, contract, or operational service rows.
- Final Service Menus-only validation passed API typecheck/build, frontend typecheck, the `/YeasminGlamDashboard/` production build, the sequential full workspace typecheck, and `git diff --check`. The existing sourcemap, OpenCV browser-externalization, and large-chunk warnings remain non-blocking.
- Final independent review found and fixed three scope/accuracy issues before merge: Party Glam now says `false lashes` exactly as the supplied PDF does, the print-page rule is scoped to the named Service Menu page, and unrelated workstream documentation is absent from the release diff.
- Published the source-copy correction through WhisperSpeechServer pull request #5 (`Commit #28 - Match party menu source copy`). The production Party menu was updated through the authenticated API to revision 2, and its reload contains `false lashes` with no remaining `premium lashes` wording.
- Repeated the final print gate after scoping the page rule. Headless Chrome produced an unencrypted two-page US Letter Party Services PDF (612-by-792 points); rendered inspection confirmed all seven supplied images remain attached to the correct Simple Glam, Soft Glam, and Party Glam sections with intact crops, readable prices and descriptions, complete page-two travel/timing content, and no dashboard controls, clipping, overlap, or extra pages.
- The local in-app Browser preview remains available at `/service-menus?menu=party-services` for visible user review while the dashboard pull request is finalized.

## 2026-09-03 - Work Package 2.23 Production Release (Completed)

- Squash-merged dashboard pull request #16 as `Commit #46 - Add cohesive service menu library` (`b6b59242d9e3a69adcdb2e7e63a6fbbef5d54508`). The merged diff contains the Service Menu library, Party pricing, seven approved images, editor, generated API clients, and additive migration; installable Home Screen/PWA work remains outside this release.
- GitHub Pages workflow run `33796287545` completed successfully: both the production build and deploy jobs passed. The workflow emitted only its existing Node.js action-runtime deprecation annotation.
- Opened the deployed Party menu in the in-app Browser and confirmed Party & Event General selection, `$130` Simple Glam, `$175` Soft Glam, `$225` Party Glam, `false lashes`, and no `premium lashes` wording.
- Verified the deployed editor through the visible UI by making a harmless trailing-space edit to `Simple Glam`, saving successfully, observing the `Menu saved` confirmation, reloading, and confirming the normalized value returned as `Simple Glam`.
- Work Package 2.23 is complete. The installable Home Screen experience remains a separate, unmerged workstream for continued validation.
