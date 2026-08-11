-- Phase 4: people, classes, registration

CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  auth_user_id text,
  full_name text NOT NULL,
  email text,
  phone text,
  date_of_birth date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  custom_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS guardians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  name text NOT NULL,
  relationship text NOT NULL DEFAULT 'guardian',
  email text,
  phone text,
  is_primary boolean NOT NULL DEFAULT false,
  receives_email boolean NOT NULL DEFAULT true,
  email_verified_at timestamptz,
  email_status text NOT NULL DEFAULT 'unknown' CHECK (email_status IN ('unknown', 'ok', 'bounced')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  name text NOT NULL,
  code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  name text NOT NULL,
  academic_year text,
  subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
  teacher_auth_user_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS class_enrolments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'withdrawn')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (class_id, student_id)
);

CREATE TABLE IF NOT EXISTS registration_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  token text NOT NULL UNIQUE,
  slug text,
  label text NOT NULL DEFAULT 'Registration',
  class_id uuid REFERENCES classes(id) ON DELETE SET NULL,
  requires_approval boolean NOT NULL DEFAULT true,
  max_uses integer,
  use_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  collect_guardian boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS registration_links_tenant_slug_uidx
  ON registration_links (tenant_id, slug)
  WHERE slug IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS student_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  registration_link_id uuid REFERENCES registration_links(id) ON DELETE SET NULL,
  auth_user_id text,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  date_of_birth date,
  requested_class_id uuid REFERENCES classes(id) ON DELETE SET NULL,
  guardian_name text,
  guardian_email text,
  guardian_phone text,
  guardian_relationship text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by_auth_user_id text,
  reviewed_at timestamptz,
  rejection_reason text,
  src text,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS students_tenant_id_idx ON students (tenant_id);
CREATE INDEX IF NOT EXISTS students_email_idx ON students (tenant_id, email);
CREATE INDEX IF NOT EXISTS guardians_student_id_idx ON guardians (student_id);
CREATE INDEX IF NOT EXISTS classes_tenant_id_idx ON classes (tenant_id);
CREATE INDEX IF NOT EXISTS class_enrolments_class_id_idx ON class_enrolments (class_id);
CREATE INDEX IF NOT EXISTS student_applications_tenant_status_idx
  ON student_applications (tenant_id, status);
CREATE INDEX IF NOT EXISTS registration_links_token_idx ON registration_links (token);

-- RLS
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'students', 'guardians', 'subjects', 'classes', 'class_enrolments',
    'registration_links', 'student_applications'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (tenant_id = NULLIF(current_setting(''app.current_tenant'', true), '''')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting(''app.current_tenant'', true), '''')::uuid)',
      t
    );
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I TO akura_app',
      t
    );
  END LOOP;
END $$;

-- Public resolve helpers (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION app_resolve_registration_link(p_token text)
RETURNS TABLE (
  id uuid,
  tenant_id uuid,
  tenant_slug text,
  tenant_name text,
  accent_color text,
  logo_url text,
  label text,
  class_id uuid,
  class_name text,
  requires_approval boolean,
  collect_guardian boolean,
  is_active boolean,
  expires_at timestamptz,
  max_uses integer,
  use_count integer,
  deleted_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    rl.id,
    rl.tenant_id,
    t.slug,
    t.name,
    t.accent_color,
    t.logo_url,
    rl.label,
    rl.class_id,
    c.name,
    rl.requires_approval,
    rl.collect_guardian,
    rl.is_active,
    rl.expires_at,
    rl.max_uses,
    rl.use_count,
    rl.deleted_at
  FROM registration_links rl
  JOIN tenants t ON t.id = rl.tenant_id
  LEFT JOIN classes c ON c.id = rl.class_id
  WHERE rl.token = p_token
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION app_resolve_registration_by_join_slug(p_join_slug text)
RETURNS TABLE (
  id uuid,
  tenant_id uuid,
  tenant_slug text,
  tenant_name text,
  accent_color text,
  logo_url text,
  label text,
  class_id uuid,
  class_name text,
  requires_approval boolean,
  collect_guardian boolean,
  is_active boolean,
  expires_at timestamptz,
  max_uses integer,
  use_count integer,
  deleted_at timestamptz,
  token text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    rl.id,
    rl.tenant_id,
    t.slug,
    t.name,
    t.accent_color,
    t.logo_url,
    rl.label,
    rl.class_id,
    c.name,
    rl.requires_approval,
    rl.collect_guardian,
    rl.is_active,
    rl.expires_at,
    rl.max_uses,
    rl.use_count,
    rl.deleted_at,
    rl.token
  FROM registration_links rl
  JOIN tenants t ON t.id = rl.tenant_id
  LEFT JOIN classes c ON c.id = rl.class_id
  WHERE rl.slug = p_join_slug
    AND rl.deleted_at IS NULL
    AND t.deleted_at IS NULL
  ORDER BY rl.created_at DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION app_submit_student_application(
  p_link_id uuid,
  p_auth_user_id text,
  p_full_name text,
  p_email text,
  p_phone text,
  p_dob date,
  p_class_id uuid,
  p_guardian_name text,
  p_guardian_email text,
  p_guardian_phone text,
  p_guardian_relationship text,
  p_src text,
  p_ip text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link registration_links%ROWTYPE;
  v_app_id uuid;
BEGIN
  SELECT * INTO v_link FROM registration_links WHERE id = p_link_id FOR UPDATE;
  IF NOT FOUND OR v_link.deleted_at IS NOT NULL OR NOT v_link.is_active THEN
    RAISE EXCEPTION 'link_inactive';
  END IF;
  IF v_link.expires_at IS NOT NULL AND v_link.expires_at < now() THEN
    RAISE EXCEPTION 'link_expired';
  END IF;
  IF v_link.max_uses IS NOT NULL AND v_link.use_count >= v_link.max_uses THEN
    RAISE EXCEPTION 'link_exhausted';
  END IF;

  INSERT INTO student_applications (
    tenant_id, registration_link_id, auth_user_id, full_name, email, phone,
    date_of_birth, requested_class_id, guardian_name, guardian_email,
    guardian_phone, guardian_relationship, status, src, ip
  ) VALUES (
    v_link.tenant_id, v_link.id, p_auth_user_id, p_full_name, lower(p_email), p_phone,
    p_dob, COALESCE(p_class_id, v_link.class_id), p_guardian_name, p_guardian_email,
    p_guardian_phone, p_guardian_relationship, 'pending', p_src, p_ip
  ) RETURNING id INTO v_app_id;

  UPDATE registration_links
  SET use_count = use_count + 1, updated_at = now()
  WHERE id = v_link.id;

  RETURN v_app_id;
END;
$$;

REVOKE ALL ON FUNCTION app_resolve_registration_link(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_resolve_registration_by_join_slug(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_submit_student_application(uuid, text, text, text, text, date, uuid, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_resolve_registration_link(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION app_resolve_registration_by_join_slug(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION app_submit_student_application(uuid, text, text, text, text, date, uuid, text, text, text, text, text, text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION app_resolve_registration_link(text) TO akura_app;
GRANT EXECUTE ON FUNCTION app_resolve_registration_by_join_slug(text) TO akura_app;
GRANT EXECUTE ON FUNCTION app_submit_student_application(uuid, text, text, text, text, date, uuid, text, text, text, text, text, text) TO akura_app;
