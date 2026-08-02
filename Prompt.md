# Makeup Artist Hub Prompt

## Product Goal

Makeup Artist Hub is a local-first CRM for a makeup artist business. It should help manage clients, bookings, booking events, payments, dashboard metrics, and contract views through a web app backed by an API and database.

## Current User Intent

The project was originally generated and run in Replit, then exported locally. The first completed goal was to remove Replit-specific runtime assumptions and get the app running locally for ongoing development outside Replit.

The current product goal is to support reusable makeup/hair services and extra fees that can be selected during booking intake and clearly shown in the generated client contract. The booking intake should also capture first-contact client information directly, create the client record behind the scenes, support an optional makeup trial with date, timing, and amount, and avoid requiring a separate "add client first, then add booking" workflow. The implementation should be informed by `/Users/iftatbhuiyan/Downloads/SampleContract.pdf`.

The current deployment goal is to keep Render cost low by mounting the Makeup Artist Hub API onto the existing WhisperSpeechServer Render service under an isolated `/glam-api/api` path, use Supabase as the hosted Postgres database, and serve the static Vite frontend from GitHub Pages.

Secondary and visible user goal for this milestone: make the frontend feel intentionally designed and polished (professional spacing, visual hierarchy, and interaction clarity) across all core screens without changing business logic or data contracts.

The Leads intake/admin surface is no longer a desired visible CRM workflow. Keep bookings and direct client intake as the primary path unless the user explicitly asks to restore leads.

Expense tracking is now an intended CRM workflow. The app should help the artist track business costs such as makeup, hair products, tools, disposables, travel-related supplies, and other operating expenses, then reflect those costs in dashboard financial trackers.

Expense entry should be receipt-first on mobile. The artist must be able to photograph a receipt or choose a screenshot, run OCR locally without a paid subscription, review and correct the detected merchant/date/totals/product lines, and save either itemized expenses or one combined expense. OCR must never silently post to the ledger, and uncertain or unreconciled values must remain visibly editable before saving.

Expense reporting should be useful at a glance: summary cards should support time/category filtering, and mobile ledger rows should stay compact while opening a complete preview/edit surface on tap. Itemized receipt names should remain standardized and searchable while preserving the original receipt wording, SKU, payment, and review details.

Local OCR remains the immediate receipt path and safe fallback. When a server-side Gemini key is configured, the app automatically sends only the locally redacted receipt copy for the smart review pass; it must use the lowest-cost stable image-capable model, keep the key off the client, avoid retaining the analysis request, and return editable suggestions without writing to the ledger. The user reviews highlighted exceptions before saving.

The Automations surface is no longer a desired visible CRM workflow. Do not show an Automations tab or command-palette entry unless the user explicitly asks to restore automation management.

## Non-Goals

- Do not redesign the product UI for new functional behavior unless explicitly requested by the user for a UI/UX polishing pass.
- Do not replace the data model or generated API contract unless needed to make the local app work.
- Do not add a second paid Render web service unless the user explicitly changes direction.
- Do not expose CRM client, booking, contract, payment, or artist data through a public unauthenticated API.
- Do not introduce broad rewrites or full-file replacement edits.
- Do not surface Leads navigation or public-inquiry entry points unless the user explicitly reintroduces that workflow.
- Do not surface Automations navigation or automation-management entry points unless the user explicitly reintroduces that workflow.

## Constraints

- Keep diffs scoped and reviewable.
- Preserve the existing pnpm workspace structure.
- Prefer existing source patterns in `artifacts/*` and `lib/*`.
- Use focused validation before claiming the app works.
- If external documentation is needed, verify against current docs.

## Source Links

- Frontend app: `artifacts/glam-crm`
- API server: `artifacts/api-server`
- API contract: `lib/api-spec/openapi.yaml`
- React API client: `lib/api-client-react`
- Database schema: `lib/db/src/schema`
- Generated Zod contracts: `lib/api-zod`

## Current Scope

Milestone 2: service catalog, booking line items, and contract output.

## Current Calendar Subscription Intent

The calendar subscription control must provide a real read-only iCalendar feed suitable for Apple Calendar. The feed should include useful event details such as client, event type, service time, completion time, location, booking totals, retainer/balance state, and payment reminders. A stable feed URL must update existing subscribed entries when underlying booking data changes; the local app must support a configurable reachable public/LAN origin because `localhost` is not reachable from a phone.

The calendar subscription UI must offer two clearly separated subscriptions: a bookings/events calendar for scheduled trials and services, and a payment-reminders calendar for due dates. Each feed must remain read-only, independently subscribable, and update from the same underlying booking data without mixing reminders into the schedule feed.

## Current Client Social Profile Intent

Client records should support zero or more internal social/profile entries, including an Instagram handle or direct URL and other social platforms. The artist should be able to add and edit those entries from client and booking workflows, see them on client information and booking details, and open a stored profile directly in a new browser tab. Social profile data is CRM-only and must not be added to public client portal or calendar feed output unless explicitly requested.
