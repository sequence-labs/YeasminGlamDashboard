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

Run API and frontend together:

```sh
pnpm dev
```

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
