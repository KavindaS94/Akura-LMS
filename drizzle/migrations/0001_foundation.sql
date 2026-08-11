-- Akura Phase 1 foundation: tenants, memberships, audit_log, events + RLS

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE membership_role AS ENUM ('admin', 'teacher', 'student');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE membership_status AS ENUM ('active', 'disabled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  logo_url text,
  accent_color text,
  billing_name text,
  billing_address text,
  business_reg_no text,
  tax_id text,
  billing_email text,
  billing_phone text,
  timezone text NOT NULL DEFAULT 'Asia/Colombo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  auth_user_id text NOT NULL,
  role membership_role NOT NULL,
  is_owner boolean NOT NULL DEFAULT false,
  status membership_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT memberships_tenant_auth_user_uidx UNIQUE (tenant_id, auth_user_id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  actor_user_id text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS memberships_tenant_id_idx ON memberships (tenant_id);
CREATE INDEX IF NOT EXISTS memberships_auth_user_id_idx ON memberships (auth_user_id);
CREATE INDEX IF NOT EXISTS audit_log_tenant_id_idx ON audit_log (tenant_id);
CREATE INDEX IF NOT EXISTS events_tenant_id_idx ON events (tenant_id);
CREATE INDEX IF NOT EXISTS events_processed_at_idx ON events (processed_at);

-- RLS: enable + force so table owners cannot bypass
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON tenants;
CREATE POLICY tenant_isolation ON tenants
  USING (id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

DROP POLICY IF EXISTS tenant_isolation ON memberships;
CREATE POLICY tenant_isolation ON memberships
  USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

DROP POLICY IF EXISTS tenant_isolation ON audit_log;
CREATE POLICY tenant_isolation ON audit_log
  USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

DROP POLICY IF EXISTS tenant_isolation ON events;
CREATE POLICY tenant_isolation ON events
  USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

-- Slug → id without trusting client tenant ids (bypasses RLS as definer)
CREATE OR REPLACE FUNCTION app_resolve_tenant_id(p_slug text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM tenants
  WHERE slug = p_slug
    AND deleted_at IS NULL
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION app_resolve_tenant_id(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_resolve_tenant_id(text) TO PUBLIC;

-- Bootstrap helpers for migrations/tests (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION app_bootstrap_tenant(
  p_id uuid,
  p_slug text,
  p_name text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO tenants (id, slug, name)
  VALUES (p_id, p_slug, p_name)
  ON CONFLICT (slug) DO UPDATE
    SET name = EXCLUDED.name,
        deleted_at = NULL,
        updated_at = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION app_bootstrap_membership(
  p_tenant_id uuid,
  p_auth_user_id text,
  p_role membership_role,
  p_is_owner boolean DEFAULT false
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO memberships (tenant_id, auth_user_id, role, is_owner, status)
  VALUES (p_tenant_id, p_auth_user_id, p_role, p_is_owner, 'active')
  ON CONFLICT (tenant_id, auth_user_id) DO UPDATE
    SET role = EXCLUDED.role,
        is_owner = EXCLUDED.is_owner,
        status = 'active',
        deleted_at = NULL,
        updated_at = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION app_bootstrap_tenant(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_bootstrap_membership(uuid, text, membership_role, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_bootstrap_tenant(uuid, text, text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION app_bootstrap_membership(uuid, text, membership_role, boolean) TO PUBLIC;

-- Drop legacy application tables if present (destructive reset of prior schema)
DROP TABLE IF EXISTS "QuizAttempt" CASCADE;
DROP TABLE IF EXISTS "QuizQuestion" CASCADE;
DROP TABLE IF EXISTS "Quiz" CASCADE;
DROP TABLE IF EXISTS "LessonProgress" CASCADE;
DROP TABLE IF EXISTS "Enrollment" CASCADE;
DROP TABLE IF EXISTS "Lesson" CASCADE;
DROP TABLE IF EXISTS "Module" CASCADE;
DROP TABLE IF EXISTS "Course" CASCADE;
DROP TABLE IF EXISTS "Invite" CASCADE;
DROP TABLE IF EXISTS "Membership" CASCADE;
DROP TABLE IF EXISTS "Institute" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;
DROP TABLE IF EXISTS "_prisma_migrations" CASCADE;

DO $$ BEGIN
  DROP TYPE IF EXISTS "Role" CASCADE;
  DROP TYPE IF EXISTS "InstituteStatus" CASCADE;
  DROP TYPE IF EXISTS "EnrollmentMode" CASCADE;
  DROP TYPE IF EXISTS "CourseStatus" CASCADE;
  DROP TYPE IF EXISTS "LessonType" CASCADE;
  DROP TYPE IF EXISTS "EnrollmentStatus" CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
