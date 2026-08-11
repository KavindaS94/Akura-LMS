-- Phase 8: email outbox claim helpers (SECURITY DEFINER — cron is cross-tenant)

CREATE OR REPLACE FUNCTION app_list_pending_events(p_limit integer DEFAULT 50)
RETURNS TABLE (
  id uuid,
  tenant_id uuid,
  type text,
  payload jsonb,
  attempts integer,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id, e.tenant_id, e.type, e.payload, e.attempts, e.created_at
  FROM events e
  WHERE e.processed_at IS NULL
    AND e.attempts < 8
  ORDER BY e.created_at ASC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 200));
$$;

REVOKE ALL ON FUNCTION app_list_pending_events(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_list_pending_events(integer) TO PUBLIC;

CREATE OR REPLACE FUNCTION app_mark_event_processed(p_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE events
  SET processed_at = now(),
      error = NULL
  WHERE id = p_id;
$$;

REVOKE ALL ON FUNCTION app_mark_event_processed(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_mark_event_processed(uuid) TO PUBLIC;

CREATE OR REPLACE FUNCTION app_mark_event_failed(p_id uuid, p_error text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE events
  SET attempts = attempts + 1,
      error = left(COALESCE(p_error, 'unknown'), 2000)
  WHERE id = p_id
    AND processed_at IS NULL;
$$;

REVOKE ALL ON FUNCTION app_mark_event_failed(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_mark_event_failed(uuid, text) TO PUBLIC;

CREATE OR REPLACE FUNCTION app_mark_guardian_email_status(
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
  WHERE lower(email) = lower(p_email)
    AND deleted_at IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION app_mark_guardian_email_status(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_mark_guardian_email_status(text, text) TO PUBLIC;
