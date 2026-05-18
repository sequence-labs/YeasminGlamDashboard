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

## Worktree Setup

No separate worktree is required for the initial local migration. Use a worktree for risky experiments or independent future workstreams.

## Automation Setup

Do not create recurring automations until the local setup has been tested manually in a normal thread.
