# Makeup Artist Hub Prompt

## Product Goal

Makeup Artist Hub is a local-first CRM for a makeup artist business. It should help manage clients, bookings, booking events, payments, dashboard metrics, and contract views through a web app backed by an API and database.

## Current User Intent

The project was originally generated and run in Replit, then exported locally. The first completed goal was to remove Replit-specific runtime assumptions and get the app running locally for ongoing development outside Replit.

The current product goal is to support reusable makeup/hair services and extra fees that can be selected during booking intake and clearly shown in the generated client contract. The booking intake should also capture first-contact client information directly, create the client record behind the scenes, and avoid requiring a separate "add client first, then add booking" workflow. The implementation should be informed by `/Users/iftatbhuiyan/Downloads/SampleContract.pdf`.

The current deployment goal is to keep Render cost low by mounting the Makeup Artist Hub API onto the existing WhisperSpeechServer Render service under an isolated `/glam-api/api` path, use Supabase as the hosted Postgres database, and serve the static Vite frontend from GitHub Pages.

Secondary and visible user goal for this milestone: make the frontend feel intentionally designed and polished (professional spacing, visual hierarchy, and interaction clarity) across all core screens without changing business logic or data contracts.

## Non-Goals

- Do not redesign the product UI for new functional behavior unless explicitly requested by the user for a UI/UX polishing pass.
- Do not replace the data model or generated API contract unless needed to make the local app work.
- Do not add a second paid Render web service unless the user explicitly changes direction.
- Do not expose CRM client, booking, contract, payment, or artist data through a public unauthenticated API.
- Do not introduce broad rewrites or full-file replacement edits.

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
