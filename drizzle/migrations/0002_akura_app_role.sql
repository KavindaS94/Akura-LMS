-- App role without BYPASSRLS. Owner (migrate) retains bypass for DDL;
-- withTenant() always SET LOCAL ROLE akura_app so RLS applies under Neon.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'akura_app') THEN
    CREATE ROLE akura_app NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS NOLOGIN;
  END IF;
END
$$;

ALTER ROLE akura_app NOBYPASSRLS;

-- Allow the login role (neondb_owner / local migrate user) to assume akura_app
GRANT akura_app TO CURRENT_USER;

GRANT USAGE ON SCHEMA public TO akura_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  tenants,
  memberships,
  audit_log,
  events
TO akura_app;

GRANT EXECUTE ON FUNCTION app_resolve_tenant_id(text) TO akura_app;
GRANT EXECUTE ON FUNCTION app_bootstrap_tenant(uuid, text, text) TO akura_app;
GRANT EXECUTE ON FUNCTION app_bootstrap_membership(uuid, text, membership_role, boolean) TO akura_app;

-- Session GUCs used by RLS must be settable by the app role
GRANT USAGE ON SCHEMA public TO akura_app;
