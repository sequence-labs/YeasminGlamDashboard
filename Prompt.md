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

## Current Shareable Services Menu Intent

GLAMBYEASMIN needs two polished, public-safe bridal services menus that the artist can quickly preview, download, and share with prospective clients: a general edition and a Florida edition. Each edition must be available as a print-quality PDF and as a high-resolution PNG suitable for messaging and social sharing. The CRM entry point must be prominent and responsive rather than hidden in a secondary settings surface.

The visual direction is elevated bridal editorial: warm ivory, restrained burgundy or plum, subtle champagne accents, refined serif display typography, highly legible body copy, generous spacing, and tasteful beauty-inspired detail. The design should feel luxurious and personal without relying on stock photography, visual clutter, or novelty wedding motifs. The first implementation should provide a faithful preview for user review before treating the visual direction as final.

Canonical menu content and pricing:
- Bridal Makeup - $400. Includes luxury skin prep with under-eye patches, professional products, lashes, a flawless long-lasting finish, and a customized bridal look.
- Bridal Hair - $300. Includes styling for the desired look, hair padding, bobby pins, and safety pins. The bride must arrive with clean, washed, completely dry hair and provide any hair extensions. Recommended extension brand: Bellami.
- Synthetic bun extension add-on - $15.
- Bridal Set Up - $50. Includes dupatta or veil placement and jewelry placement.
- Bridal Hijab Set Up - $50. Includes secure bridal hijab styling with gel, hairspray, and strong-hold techniques. The client must bring a preferred hijab and under cap. Recommended fabrics: cotton or jersey.
- Bridal Makeup Trial - $150. A personalized trial to perfect the bridal makeup look before the wedding day.
- Signature Bridal Package - $700. Includes Bridal Makeup, Hairstyling, and Complete Bridal Setup.
- Bridal Bundle, general edition - $600 per event. Book 3 or more bridal services and receive $25 off each day.
- Bridal Bundle, Florida edition - $675 per event. This is the only regional price change from the general edition unless the user provides additional Florida-specific copy.
- Special Bridal Offer - Bridal Makeup Package: $700 per event. Book 2 or more bridal events and receive a free Bridal Makeup Trial, a $150 value.
- Travel fee, 10-15 miles - $50.
- Travel fee, 20+ miles - $100.
- Further-distance travel pricing is discussed during consultation; travel fees are confirmed at booking, and clients may travel to the artist to avoid a travel fee.
- Early Morning Fee, 3:00-5:00 AM - $200.
- Early Morning Fee, 6:00-7:00 AM - $75.
- Specialty note: the artist specializes in full glam and may not be the right artist for clients seeking completely natural glam.

The menu assets are static marketing materials. They must not contain client, booking, contract, payment, receipt, or other private CRM data.

## Non-Goals

- Do not redesign the product UI for new functional behavior unless explicitly requested by the user for a UI/UX polishing pass.
- Do not replace the data model or generated API contract unless needed to make the local app work.
- Do not add a second paid Render web service unless the user explicitly changes direction.
- Do not expose CRM client, booking, contract, payment, or artist data through a public unauthenticated API.
- Do not introduce broad rewrites or full-file replacement edits.
- Do not surface Leads navigation or public-inquiry entry points unless the user explicitly reintroduces that workflow.
- Do not surface Automations navigation or automation-management entry points unless the user explicitly reintroduces that workflow.
- Do not auto-publish a final visual design before the user has reviewed the preview.
- Do not make the public services menu depend on authenticated CRM data or expose private CRM records.

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
