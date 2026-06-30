# Local CRM Data Backups

This folder stores timestamped local PostgreSQL snapshots for Makeup Artist Hub.

These backups include CRM business data such as artist profile, clients, bookings, events, services, contract records, payments, and related local app data.

Latest production snapshot: `makeup_artist_hub-20260630-035339.sql`

Restore to local dev database:

```sh
sed 's/OWNER TO postgres/OWNER TO makeup_artist_hub/g' \
  data/backups/makeup_artist_hub-20260630-035339.sql | \
  psql postgres://makeup_artist_hub:makeup_artist_hub@localhost:5432/makeup_artist_hub -v ON_ERROR_STOP=1
```

Note: the `transaction_timeout` warning from Postgres 17 dumps is harmless on Postgres 16 — data restores correctly.

For the standard local development database, make sure PostgreSQL is running and restore intentionally because this can replace local table contents depending on the target database.
