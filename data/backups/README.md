# Local CRM Data Backups

This folder stores timestamped local PostgreSQL snapshots for Makeup Artist Hub.

These backups include CRM business data such as artist profile, clients, bookings, events, services, contract records, payments, and related local app data.

Restore example:

```sh
createdb makeup_artist_hub_restore
psql makeup_artist_hub_restore < data/backups/makeup_artist_hub-20260519-030003.sql
```

For the standard local development database, make sure PostgreSQL is running and restore intentionally because this can replace local table contents depending on the target database.
