-- Makes addon_audit_events append-only at the DATABASE level (not just in app code).
-- This is what makes the add-on approval audit trail genuinely tamper-EVIDENT: even the
-- database owner cannot quietly UPDATE a recorded OTP destination or DELETE the record of
-- an approval. INSERT remains allowed (the app appends rows); UPDATE and DELETE raise.
--
-- drizzle-kit push does NOT manage triggers, so this is applied out-of-band and persists
-- across schema pushes. Apply it on EVERY environment that holds real data:
--   psql "$DATABASE_URL"      -f lib/db/sql/addon_audit_immutability.sql   # local
--   psql "$GLAM_DATABASE_URL" -f lib/db/sql/addon_audit_immutability.sql   # Supabase (prod)
--
-- To intentionally clear test data in dev, disable then re-enable:
--   ALTER TABLE addon_audit_events DISABLE TRIGGER addon_audit_events_no_modify;
--   DELETE FROM addon_audit_events; -- (or whatever)
--   ALTER TABLE addon_audit_events ENABLE TRIGGER addon_audit_events_no_modify;

CREATE OR REPLACE FUNCTION addon_audit_events_immutable()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'addon_audit_events is append-only; % is not permitted', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS addon_audit_events_no_modify ON addon_audit_events;
CREATE TRIGGER addon_audit_events_no_modify
  BEFORE UPDATE OR DELETE ON addon_audit_events
  FOR EACH ROW EXECUTE FUNCTION addon_audit_events_immutable();
