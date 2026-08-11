-- Phase 2: invitations + tenant signup helper + ownership guard

CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  email text NOT NULL,
  role membership_role NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  invited_by_auth_user_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS invitations_tenant_id_idx ON invitations (tenant_id);
CREATE INDEX IF NOT EXISTS invitations_email_idx ON invitations (email);
CREATE INDEX IF NOT EXISTS invitations_token_idx ON invitations (token);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON invitations;
CREATE POLICY tenant_isolation ON invitations
  USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE invitations TO akura_app;

-- Lookup invite by token (public accept flow; no tenant GUC yet)
CREATE OR REPLACE FUNCTION app_resolve_invitation_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  tenant_id uuid,
  tenant_slug text,
  tenant_name text,
  email text,
  role membership_role,
  expires_at timestamptz,
  accepted_at timestamptz,
  deleted_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.id,
    i.tenant_id,
    t.slug,
    t.name,
    i.email,
    i.role,
    i.expires_at,
    i.accepted_at,
    i.deleted_at
  FROM invitations i
  JOIN tenants t ON t.id = i.tenant_id
  WHERE i.token = p_token
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION app_resolve_invitation_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_resolve_invitation_by_token(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION app_resolve_invitation_by_token(text) TO akura_app;

-- Signup: create tenant + owner membership atomically (bypasses RLS as definer)
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

  INSERT INTO audit_log (tenant_id, actor_user_id, action, entity_type, entity_id, payload)
  VALUES (
    v_id,
    p_auth_user_id,
    'tenant.created',
    'tenant',
    v_id::text,
    jsonb_build_object('slug', p_slug, 'name', p_name)
  );

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION app_create_tenant_with_owner(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_create_tenant_with_owner(text, text, text, text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION app_create_tenant_with_owner(text, text, text, text) TO akura_app;

-- Accept invite: mark accepted + upsert membership
CREATE OR REPLACE FUNCTION app_accept_invitation(
  p_token text,
  p_auth_user_id text,
  p_email text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv invitations%ROWTYPE;
  v_membership_id uuid;
BEGIN
  SELECT * INTO v_inv FROM invitations WHERE token = p_token FOR UPDATE;
  IF NOT FOUND OR v_inv.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'invite_not_found';
  END IF;
  IF v_inv.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'invite_already_accepted';
  END IF;
  IF v_inv.expires_at < now() THEN
    RAISE EXCEPTION 'invite_expired';
  END IF;
  IF lower(v_inv.email) <> lower(p_email) THEN
    RAISE EXCEPTION 'invite_email_mismatch';
  END IF;

  INSERT INTO memberships (tenant_id, auth_user_id, role, is_owner, status)
  VALUES (v_inv.tenant_id, p_auth_user_id, v_inv.role, false, 'active')
  ON CONFLICT (tenant_id, auth_user_id) DO UPDATE
    SET role = EXCLUDED.role,
        status = 'active',
        deleted_at = NULL,
        updated_at = now()
  RETURNING id INTO v_membership_id;

  UPDATE invitations
  SET accepted_at = now(), updated_at = now()
  WHERE id = v_inv.id;

  INSERT INTO audit_log (tenant_id, actor_user_id, action, entity_type, entity_id, payload)
  VALUES (
    v_inv.tenant_id,
    p_auth_user_id,
    'invitation.accepted',
    'invitation',
    v_inv.id::text,
    jsonb_build_object('role', v_inv.role, 'email', v_inv.email)
  );

  RETURN v_inv.tenant_id;
END;
$$;

REVOKE ALL ON FUNCTION app_accept_invitation(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_accept_invitation(text, text, text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION app_accept_invitation(text, text, text) TO akura_app;

-- List memberships for an auth user (login redirect) — SECURITY DEFINER
CREATE OR REPLACE FUNCTION app_list_memberships_for_user(p_auth_user_id text)
RETURNS TABLE (
  tenant_id uuid,
  tenant_slug text,
  tenant_name text,
  role membership_role,
  is_owner boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.tenant_id,
    t.slug,
    t.name,
    m.role,
    m.is_owner
  FROM memberships m
  JOIN tenants t ON t.id = m.tenant_id
  WHERE m.auth_user_id = p_auth_user_id
    AND m.status = 'active'
    AND m.deleted_at IS NULL
    AND t.deleted_at IS NULL
  ORDER BY m.created_at ASC;
$$;

REVOKE ALL ON FUNCTION app_list_memberships_for_user(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_list_memberships_for_user(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION app_list_memberships_for_user(text) TO akura_app;
