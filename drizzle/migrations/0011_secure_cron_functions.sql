-- Phase 10 hardening: restrict cross-tenant SECURITY DEFINER functions to a
-- dedicated cron role instead of PUBLIC, and tenant-scope the guardian
-- email-status helper so a bounce for one institute's guardian can never
-- mutate another institute's guardian record.

-- Dedicated role for cron/webhook workers. NOLOGIN — the app assumes it via
-- SET LOCAL ROLE inside an explicit transaction (like akura_app).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'akura_cron') THEN
    CREATE ROLE akura_cron NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS NOLOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO akura_cron;

-- Allow the login role (migration/connection role) to assume akura_cron at
-- runtime, mirroring how withTenant() assumes akura_app.
GRANT akura_cron TO CURRENT_USER;

-- Email outbox (0009)
REVOKE ALL ON FUNCTION app_list_pending_events(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_list_pending_events(integer) TO akura_cron;

REVOKE ALL ON FUNCTION app_mark_event_processed(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_mark_event_processed(uuid) TO akura_cron;

REVOKE ALL ON FUNCTION app_mark_event_failed(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_mark_event_failed(uuid, text) TO akura_cron;

-- Billing lifecycle (0010)
REVOKE ALL ON FUNCTION app_list_subscriptions_for_lifecycle(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_list_subscriptions_for_lifecycle(integer) TO akura_cron;

-- Guardian email status, now tenant-scoped. Emails carry an
-- akura-tenant-id tag so webhooks can scope the update to the right institute.
DROP FUNCTION IF EXISTS app_mark_guardian_email_status(text, text);
CREATE OR REPLACE FUNCTION app_mark_guardian_email_status(
  p_tenant_id uuid,
  p_email text,
  p_status text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  IF p_status NOT IN ('unknown', 'ok', 'bounced') THEN
    RAISE EXCEPTION 'invalid_email_status';
  END IF;
  UPDATE guardians
  SET email_status = p_status,
      updated_at = now()
  WHERE tenant_id = p_tenant_id
    AND lower(email) = lower(p_email)
    AND deleted_at IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION app_mark_guardian_email_status(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_mark_guardian_email_status(uuid, text, text) TO akura_cron;