# Makeup Artist Hub Setup

## Toolchain

- Node.js: current local shell reports `v25.8.0`.
- Package manager: pnpm, current local shell reports `11.1.1`.
- Workspace package manager: pnpm workspaces.

## Local App Setup

Install dependencies:

```sh
pnpm install
```

Local environment defaults are documented in `.env.example`.

Run typechecks:

```sh
pnpm run typecheck
```

## Local Database Setup

The API uses PostgreSQL through Drizzle ORM. Set `DATABASE_URL` before running the API or database schema commands.

Expected local development URL:

```sh
DATABASE_URL=postgres://makeup_artist_hub:makeup_artist_hub@localhost:5432/makeup_artist_hub
```

Current machine check:
- `docker` is not installed.
- PostgreSQL 16.14 is installed through Homebrew at `/opt/homebrew/opt/postgresql@16`.
- Homebrew is installed at `/opt/homebrew/bin/brew`.

One local setup path is Homebrew PostgreSQL:

```sh
brew install postgresql@16
brew services start postgresql@16
/opt/homebrew/opt/postgresql@16/bin/psql postgres -c "CREATE ROLE makeup_artist_hub WITH LOGIN PASSWORD 'makeup_artist_hub';"
/opt/homebrew/opt/postgresql@16/bin/createdb -O makeup_artist_hub makeup_artist_hub
```

After Postgres is available, push the schema:

```sh
DATABASE_URL=postgres://makeup_artist_hub:makeup_artist_hub@localhost:5432/makeup_artist_hub pnpm --filter @workspace/db run push
```

## Local API Setup

Run the API after `DATABASE_URL` is set:

```sh
DATABASE_URL=postgres://makeup_artist_hub:makeup_artist_hub@localhost:5432/makeup_artist_hub pnpm --filter @workspace/api-server run dev
```

For the standard local database above, this also works without manually exporting `DATABASE_URL`:

```sh
pnpm dev:api
```

Expected default API port: `8787`.

Health check:

```sh
curl http://localhost:8787/api/healthz
```

## Local Frontend Setup

Run the frontend:

```sh
pnpm --filter @workspace/glam-crm run dev
```

Expected default frontend URL: `http://localhost:5173/`.

The frontend dev server proxies `/api` to `API_TARGET`, defaulting to `http://127.0.0.1:8787`.

Receipt image OCR uses open-source Tesseract.js in the browser. It does not require an API key or paid subscription. The OCR module is loaded only after the user chooses an image; on first use, Tesseract.js may download and cache its English language/runtime assets, so an internet connection is required for that initial scan.

### Optional automatic Gemini receipt review

Gemini is an optional automatic smart-review pass after local scanning. It is not required for ordinary local scanning. Put the key in the ignored local secret file; never add it to a `VITE_` variable or commit it to the repository:

```text
# .local/deployment-secrets.env
GEMINI_API_KEY=<your Google AI Studio key>
```

Restart the API after adding or rotating the key. In non-production mode the API automatically loads `.local/deployment-secrets.env`; an environment value already supplied to the process takes precedence. The endpoint uses the currently available low-cost stable model `gemini-3.1-flash-lite`.

The browser first runs local OCR and paints opaque black rectangles over detected card, account, authorization, terminal, membership, masked-number, and checksum-valid payment-card-number lines. Product UPC/SKU lines remain readable. When the key is configured, the prepared redacted copy is sent automatically to Gemini; the UI shows a compact progress/result status, and the editable review remains the only save path. Gemini does not save an expense or retain the analysis request in the application database.

For the deployed Render API, add `GEMINI_API_KEY` as a secret environment variable on the server service. Do not expose it in the GitHub Pages frontend build.

The receipt workflow adds the `expense_receipts` table plus nullable `expenses.receipt_id`, `expenses.product_code`, and `expenses.quantity` columns. A normal schema push applies these additive fields for a standard local database:

```sh
DATABASE_URL=postgres://makeup_artist_hub:makeup_artist_hub@localhost:5432/makeup_artist_hub pnpm --filter @workspace/db run push
```

For the production-derived local snapshot, keep using the explicitly named snapshot `DATABASE_URL` and do not use `push-force`; the Work Package 2.18 validation applied only the additive table, columns, foreign key, and index.

Run API and frontend together:

```sh
pnpm dev
```

## Safe Local Production-Data Sandbox

When localhost needs current CRM data without writing to the hosted production database, use a local snapshot database. The hosted database is used only as the source for `pg_dump`; the app must never receive the hosted connection string as its local `DATABASE_URL`.

Start the local PostgreSQL 17 service used by the snapshot runtime:

```sh
brew services start postgresql@17
```

Create a fresh temporary dump and restore only the application `public` schema. Supabase-managed schemas and extensions are intentionally excluded from the local restore:

```sh
snapshot_dir=$(mktemp -d /tmp/makeup-artist-hub-prod-snapshot.XXXXXX)
remote_url=$(sed -n 's/^SUPABASE_DIRECT_DATABASE_URL=//p' .local/deployment-secrets.env)
remote_url=$(printf '%s' "$remote_url" | sed 's/sslmode=no-verify/sslmode=require/g')
local_db=makeup_artist_hub_prod_snapshot

/opt/homebrew/opt/postgresql@17/bin/pg_dump \
  --format=custom --no-owner --no-acl \
  --file "$snapshot_dir/production.dump" "$remote_url"
/opt/homebrew/opt/postgresql@17/bin/dropdb --maintenance-db=postgres --if-exists "$local_db"
/opt/homebrew/opt/postgresql@17/bin/createdb --maintenance-db=postgres -O "$USER" "$local_db"
/opt/homebrew/opt/postgresql@17/bin/psql "postgresql://$USER@127.0.0.1:5432/$local_db" \
  -v ON_ERROR_STOP=1 \
  -c 'create extension if not exists pgcrypto' \
  -c 'create extension if not exists "uuid-ossp"'
/opt/homebrew/opt/postgresql@17/bin/pg_restore \
  --exit-on-error --no-owner --no-acl --schema=public \
  --dbname "postgresql://$USER@127.0.0.1:5432/$local_db" \
  "$snapshot_dir/production.dump"
```

Run the API against the local snapshot, with local authentication, scheduled work, and SMTP disabled for the session:

```sh
env NODE_ENV=development \
  PORT=8787 \
  DATABASE_URL=postgresql://$USER@127.0.0.1:5432/makeup_artist_hub_prod_snapshot \
  GLAM_ADMIN_PASSWORD= \
  GLAM_SESSION_SECRET= \
  GLAM_GMAIL_USER= \
  GLAM_GMAIL_APP_PASSWORD= \
  GLAM_EMAIL_FROM= \
  GLAM_DISABLE_RUNNER=true \
  pnpm --filter @workspace/api-server run dev
```

Keep the frontend proxy pointed at `http://127.0.0.1:8787`. Confirm the runtime before using the browser:

```sh
curl http://127.0.0.1:8787/api/healthz
curl http://127.0.0.1:8787/api/bookings
```

The snapshot restore can replace contents of the explicitly named local snapshot database. It does not write to Supabase; keep the hosted URL out of `DATABASE_URL` for the API process.

If Drizzle's non-interactive `push` stops at an unrelated data-loss prompt for an existing constraint, do not use `push-force` to truncate snapshot data. Review the exact additive change and apply a scoped SQL migration to the explicitly named snapshot database instead.

## GitHub Pages Frontend Deployment

The frontend deploys from `.github/workflows/pages.yml`.

Pages settings should use:

```text
Source: GitHub Actions
```

The workflow builds the frontend with:

```sh
BASE_PATH=/YeasminGlamDashboard/ VITE_API_BASE_URL=https://whisperflowserver.onrender.com/glam-api pnpm --filter @workspace/glam-crm run build
```

The deployed frontend calls the shared Render API at:

```text
https://whisperflowserver.onrender.com/glam-api/api/*
```

### Installable Home Screen build requirements

The installable metadata and service-worker scope follow the Vite base path. Local development uses `/`; GitHub Pages uses `/YeasminGlamDashboard/`. Build and preview the production path explicitly:

```sh
BASE_PATH=/YeasminGlamDashboard/ \
VITE_API_BASE_URL=https://whisperflowserver.onrender.com/glam-api \
pnpm --filter @workspace/glam-crm run build

BASE_PATH=/YeasminGlamDashboard/ pnpm --filter @workspace/glam-crm run serve
```

The built output must contain a base-path-safe manifest, 180-by-180 Apple touch icon, 192-by-192 and 512-by-512 manifest icons, and the service worker. Probe them through `/YeasminGlamDashboard/` rather than opening files directly.

Service-worker caching is public-shell-only. Never cache `/api/*`, `/glam-api/api/*`, session/authentication responses, non-GET traffic, cross-origin responses, or CRM records. Version shell caches without deleting unrelated browser storage, and never force-reload an open page with unsaved work.

Final acceptance requires a real iPhone Safari Add to Home Screen test covering the icon, name, standalone launch, authentication, safe areas, navigation, an unsaved form, background/resume, and update behavior. The product intentionally includes no in-app installation instructions.

For Apple Calendar subscriptions, set `VITE_PUBLIC_CALENDAR_BASE_URL` when the feed should use a specific public or LAN-reachable origin. In production this should be the HTTPS API origin that serves `/api/public/calendar/:token.ics`; on a phone, `localhost` is the phone itself and will not reach the development computer.

## Shared Render API Setup

The existing `IftatBhuiyan/WhisperSpeechServer` Render service hosts the CRM API under:

```text
/glam-api/api/*
```

Required Render environment variables:

```sh
GLAM_DATABASE_URL=<supabase pooled postgres url with sslmode=no-verify for node-postgres>
GLAM_ADMIN_PASSWORD=<private crm admin password>
GLAM_SESSION_SECRET=<long random secret>
GLAM_CORS_ORIGINS=https://sequence-labs.github.io
GLAM_COOKIE_SECURE=true
GLAM_COOKIE_PATH=/glam-api
```

Keep the existing WhisperSpeechServer environment variables unchanged.

When API server routes change, rebuild and sync the embedded CRM bundle into the Render service repo before pushing that service:

```sh
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/scripts run sync:glam-api-bundle
cd /Users/iftatbhuiyan/WhisperSpeechServer
npm test
```

The sync command copies `artifacts/api-server/dist/*.mjs` and `*.mjs.map` into `/Users/iftatbhuiyan/WhisperSpeechServer/glam-api` by default. Override the destination with `GLAM_API_BUNDLE_TARGET` if the Render service checkout lives somewhere else.

After Render finishes deploying a calendar-route change, probe the tokenized bookings and reminders HTTPS URLs without a CRM session. Both must return HTTP `200` with `Content-Type: text/calendar`; a `401` means the shared service is still running a stale embedded bundle rather than a public feed route.

## Supabase Postgres Setup

Supabase is used as hosted Postgres for Makeup Artist Hub. The app still uses the current Drizzle/Postgres schema; this is not a rewrite to Supabase client APIs.

Production project:

```text
Project: Makeup Artist Hub
Project ref: revpsisofkxznnudzvoq
Project URL: https://revpsisofkxznnudzvoq.supabase.co
Region: us-east-1
Data API: disabled
```

After creating the Supabase project, use the pooled Postgres connection string as `GLAM_DATABASE_URL` in Render. For Node's `pg` driver, use the Supabase pooler URL with `sslmode=no-verify`; the earlier `sslmode=require` form connects through `psql` but fails in this app with `SELF_SIGNED_CERT_IN_CHAIN`.

Local generated deployment credentials are stored outside git at:

```text
.local/deployment-secrets.env
```

For schema/data setup, use a direct or pooled connection string locally as `DATABASE_URL`.

Schema push:

```sh
DATABASE_URL=<supabase postgres url> pnpm --filter @workspace/db run push
```

Restore latest saved data:

```sh
sed 's/OWNER TO makeup_artist_hub/OWNER TO postgres/g' data/backups/makeup_artist_hub-20260519-030003.sql | psql <supabase postgres url> -v ON_ERROR_STOP=1
```

Do not paste Supabase passwords or API keys into repository files.

## Worktree Setup

No separate worktree is required for the initial local migration. Use a worktree for risky experiments or independent future workstreams.

## Automation Setup

Do not create recurring automations until the local setup has been tested manually in a normal thread.

## Local deployment-secret loading

The local API server now auto-loads `.local/deployment-secrets.env` when `NODE_ENV` is not `production`. Values already present in the shell win, so explicit exports can still override the local file.

This keeps `GLAM_ADMIN_PASSWORD` consistent between localhost and the deployed Render API without committing secrets. Keep `.local/deployment-secrets.env` out of git.

## Bridal service-menu asset generation

The checked-in CRM assets can be regenerated from the scoped source script:

```sh
python3 artifacts/glam-crm/scripts/generate-service-menus.py
```

The generator requires Python 3 with `reportlab` and `Pillow`, macOS Arial and Georgia supplemental fonts, and Poppler's `pdftoppm`. It writes review copies to `output/pdf/` and refreshes the public PDFs plus separate page-1/page-2 share PNGs under `artifacts/glam-crm/public/service-menus/`.

The checked-in files are the reviewed original fallback. Owner-edited menu content is stored separately in `service_menu_content` and rendered by `/service-menus`; it does not require rerunning the Python generator. Apply both service-menu migrations before deploying the API/frontend version that reads Bridal and Party menu keys:

```sh
psql <supabase postgres url> -v ON_ERROR_STOP=1 \
  -f supabase/migrations/20260821223010_owner_editable_bridal_service_menu.sql

psql <supabase postgres url> -v ON_ERROR_STOP=1 \
  -f supabase/migrations/20260903175807_expand_service_menu_library.sql
```

The migrations are additive, enable RLS, and grant no direct `anon` or `authenticated` table access. The authenticated Node API uses the existing server-side Postgres connection. Deploy in this order: both database migrations, rebuilt/synced API bundle, verification that the keyed Bridal and Party endpoints return HTTP 200, then frontend. Until all three are live, the reviewed original PDF/PNG assets remain the safe fallback.
