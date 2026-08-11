-- Phase 3: settings + billing skeleton

CREATE TABLE IF NOT EXISTS setting_definitions (
  key text PRIMARY KEY,
  capability text NOT NULL,
  type text NOT NULL CHECK (type IN ('boolean', 'number', 'string', 'enum', 'json')),
  default_value jsonb NOT NULL,
  validation jsonb NOT NULL DEFAULT '{}'::jsonb,
  label text NOT NULL,
  description text NOT NULL DEFAULT '',
  scope text NOT NULL DEFAULT 'tenant' CHECK (scope IN ('tenant')),
  requires_role membership_role NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  key text NOT NULL REFERENCES setting_definitions(key) ON DELETE RESTRICT,
  value jsonb NOT NULL,
  updated_by_auth_user_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, key)
);

CREATE TABLE IF NOT EXISTS setting_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  key text NOT NULL,
  old_value jsonb,
  new_value jsonb NOT NULL,
  changed_by_auth_user_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plans (
  key text PRIMARY KEY,
  name text NOT NULL,
  prices jsonb NOT NULL DEFAULT '{}'::jsonb,
  limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TYPE subscription_status AS ENUM (
  'trialing',
  'active',
  'past_due',
  'free',
  'read_only',
  'dormant'
);

CREATE TYPE billing_cycle AS ENUM ('monthly', 'yearly');

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  plan_key text NOT NULL REFERENCES plans(key) ON DELETE RESTRICT,
  status subscription_status NOT NULL DEFAULT 'trialing',
  billing_cycle billing_cycle NOT NULL DEFAULT 'monthly',
  currency text NOT NULL DEFAULT 'LKR',
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  grace_ends_at timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  provider text NOT NULL DEFAULT 'none',
  provider_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- At most one non-dormant "current" subscription per tenant enforced in app;
-- unique partial index for active-ish statuses
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_one_current_per_tenant
  ON subscriptions (tenant_id)
  WHERE status IN ('trialing', 'active', 'past_due', 'free', 'read_only');

CREATE TABLE IF NOT EXISTS usage_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  metric text NOT NULL,
  quantity bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, metric)
);

CREATE TABLE IF NOT EXISTS usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  metric text NOT NULL,
  delta bigint NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE setting_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE setting_history FORCE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_counters FORCE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events FORCE ROW LEVEL SECURITY;

-- setting_definitions and plans are global catalogs (read-only to app)
ALTER TABLE setting_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE setting_definitions FORCE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON tenant_settings;
CREATE POLICY tenant_isolation ON tenant_settings
  USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

DROP POLICY IF EXISTS tenant_isolation ON setting_history;
CREATE POLICY tenant_isolation ON setting_history
  USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

DROP POLICY IF EXISTS tenant_isolation ON subscriptions;
CREATE POLICY tenant_isolation ON subscriptions
  USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

DROP POLICY IF EXISTS tenant_isolation ON usage_counters;
CREATE POLICY tenant_isolation ON usage_counters
  USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

DROP POLICY IF EXISTS tenant_isolation ON usage_events;
CREATE POLICY tenant_isolation ON usage_events
  USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

-- Global catalogs: readable whenever a tenant GUC is set (any authenticated tenant txn)
DROP POLICY IF EXISTS catalog_read ON setting_definitions;
CREATE POLICY catalog_read ON setting_definitions
  FOR SELECT
  USING (NULLIF(current_setting('app.current_tenant', true), '') IS NOT NULL);

DROP POLICY IF EXISTS catalog_read ON plans;
CREATE POLICY catalog_read ON plans
  FOR SELECT
  USING (NULLIF(current_setting('app.current_tenant', true), '') IS NOT NULL);

GRANT SELECT ON setting_definitions, plans TO akura_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  tenant_settings, setting_history, subscriptions, usage_counters, usage_events
TO akura_app;

-- Seed plans
INSERT INTO plans (key, name, prices, limits) VALUES
  ('free', 'Free', '{"monthly":0,"yearly":0}', '{"students":30,"staff":5,"storage_bytes":1073741824,"emails":100}'),
  ('growth', 'Growth', '{"monthly":990000,"yearly":9900000}', '{"students":200,"staff":25,"storage_bytes":21474836480,"emails":5000}'),
  ('scale', 'Scale', '{"monthly":2490000,"yearly":24900000}', '{"students":1000,"staff":100,"storage_bytes":107374182400,"emails":25000}')
ON CONFLICT (key) DO NOTHING;

-- ~17 setting definitions
INSERT INTO setting_definitions (key, capability, type, default_value, validation, label, description, requires_role) VALUES
  ('attendance.lock_hours', 'attendance', 'number', '48', '{"min":1,"max":168}', 'Attendance lock (hours)', 'Sessions lock after this many hours', 'admin'),
  ('attendance.eligibility_threshold_pct', 'attendance', 'number', '80', '{"min":0,"max":100}', 'Attendance eligibility %', 'Minimum attendance percentage for eligibility', 'admin'),
  ('exams.class_rank_visible', 'exams', 'boolean', 'false', '{}', 'Show class rank', 'When on, students see class rank on published results', 'admin'),
  ('exams.default_grade_scale', 'exams', 'string', '"letter"', '{"maxLength":40}', 'Default grade scale key', 'Institute default grade scale identifier', 'admin'),
  ('notifications.quiet_hours_start', 'notifications', 'string', '"21:00"', '{}', 'Quiet hours start', 'Local time HH:MM', 'admin'),
  ('notifications.quiet_hours_end', 'notifications', 'string', '"07:00"', '{}', 'Quiet hours end', 'Local time HH:MM', 'admin'),
  ('notifications.absence_email_enabled', 'notifications', 'boolean', 'true', '{}', 'Absence emails', 'Email guardians on absence', 'admin'),
  ('notifications.results_email_enabled', 'notifications', 'boolean', 'true', '{}', 'Results emails', 'Email guardians when marks publish', 'admin'),
  ('registration.require_approval', 'students', 'boolean', 'true', '{}', 'Require application approval', 'Self-registered students need admin approval', 'admin'),
  ('registration.collect_guardian', 'students', 'boolean', 'true', '{}', 'Collect guardian on registration', 'Ask for guardian contact on public forms', 'admin'),
  ('branding.allow_accent_override', 'platform', 'boolean', 'true', '{}', 'Allow accent override', 'Let workspace accent override brand accent', 'admin'),
  ('reports.include_attendance_on_report_card', 'exams', 'boolean', 'true', '{}', 'Attendance on report cards', 'Pull attendance % onto report card PDFs', 'admin'),
  ('locale.date_format', 'platform', 'enum', '"YYYY-MM-DD"', '{"options":["YYYY-MM-DD","DD/MM/YYYY","MM/DD/YYYY"]}', 'Date format', 'Display date format', 'admin'),
  ('security.session_timeout_minutes', 'platform', 'number', '10080', '{"min":30,"max":43200}', 'Session timeout (minutes)', 'Soft guidance for idle timeout', 'admin'),
  ('courses.drip_enabled_default', 'courses', 'boolean', 'false', '{}', 'Drip release default', 'New modules default to scheduled release', 'admin'),
  ('billing.show_usage_to_admins', 'billing', 'boolean', 'true', '{}', 'Show usage to admins', 'Non-owner admins can view usage', 'admin'),
  ('students.deactivate_retains_records', 'students', 'boolean', 'true', '{}', 'Retain deactivated records', 'Always true in product; exposed for clarity', 'admin')
ON CONFLICT (key) DO NOTHING;

-- Attach Growth trial subscription when a tenant is created
CREATE OR REPLACE FUNCTION app_create_tenant_with_owner(
  p_slug text,
  p_name text,
  p_auth_user_id text,
  p_timezone text DEFAULT 'Asia/Colombo'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_slug IS NULL OR p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' THEN
    RAISE EXCEPTION 'invalid_slug';
  END IF;
  IF EXISTS (SELECT 1 FROM tenants WHERE slug = p_slug AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'slug_taken';
  END IF;

  INSERT INTO tenants (slug, name, timezone)
  VALUES (p_slug, p_name, COALESCE(NULLIF(p_timezone, ''), 'Asia/Colombo'))
  RETURNING id INTO v_id;

  INSERT INTO memberships (tenant_id, auth_user_id, role, is_owner, status)
  VALUES (v_id, p_auth_user_id, 'admin', true, 'active');

  INSERT INTO subscriptions (
    tenant_id, plan_key, status, billing_cycle, currency,
    trial_ends_at, current_period_start, current_period_end, provider
  ) VALUES (
    v_id, 'growth', 'trialing', 'monthly', 'LKR',
    now() + interval '30 days', now(), now() + interval '30 days', 'none'
  );

  INSERT INTO usage_counters (tenant_id, metric, quantity) VALUES
    (v_id, 'students', 0),
    (v_id, 'staff', 1),
    (v_id, 'storage_bytes', 0),
    (v_id, 'emails', 0);

  INSERT INTO audit_log (tenant_id, actor_user_id, action, entity_type, entity_id, payload)
  VALUES (
    v_id,
    p_auth_user_id,
    'tenant.created',
    'tenant',
    v_id::text,
    jsonb_build_object('slug', p_slug, 'name', p_name, 'trial', 'growth_30d')
  );

  RETURN v_id;
END;
$$;

-- Bootstrap helpers for catalog reads outside tenant context (migrate/tests)
CREATE OR REPLACE FUNCTION app_list_setting_definitions()
RETURNS SETOF setting_definitions
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM setting_definitions ORDER BY capability, key;
$$;

REVOKE ALL ON FUNCTION app_list_setting_definitions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_list_setting_definitions() TO PUBLIC;
GRANT EXECUTE ON FUNCTION app_list_setting_definitions() TO akura_app;
