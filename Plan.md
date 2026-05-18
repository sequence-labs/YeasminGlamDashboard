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

## Metrics

- Local install succeeds on macOS.
- API startup succeeds after local database setup.
- Frontend startup succeeds without Replit environment variables.
- Browser smoke test reaches the dashboard route.

## Rollback Conditions

- Local migration requires replacing generated source files wholesale.
- Database setup would require destructive local database operations without approval.
- A package update introduces unrelated large dependency churn.

## Milestone 2: Services, Fees, and Contract Line Items

### Work Package 2.1: Contract Reference Review

Status: In progress.

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

Status: In progress.

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

Status: In progress.

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
