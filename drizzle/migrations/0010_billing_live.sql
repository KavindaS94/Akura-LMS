-- Phase 9: payments + bank transfers + billing lifecycle helpers

CREATE TYPE payment_method AS ENUM ('payhere', 'bank');
CREATE TYPE payment_status AS ENUM (
  'pending',
  'paid',
  'failed',
  'canceled',
  'charged_back'
);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  order_id text NOT NULL UNIQUE,
  method payment_method NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  plan_key text NOT NULL REFERENCES plans(key) ON DELETE RESTRICT,
  billing_cycle billing_cycle NOT NULL DEFAULT 'monthly',
  amount_minor integer NOT NULL,
  currency text NOT NULL DEFAULT 'LKR',
  provider_payment_id text,
  provider_subscription_id text,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by_auth_user_id text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payments_tenant_id_idx ON payments (tenant_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON payments (status);

CREATE TABLE IF NOT EXISTS bank_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  reference text NOT NULL,
  note text,
  status text NOT NULL DEFAULT 'pending',
  confirmed_at timestamptz,
  confirmed_by text,
  created_by_auth_user_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bank_transfers_tenant_id_idx ON bank_transfers (tenant_id);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments FORCE ROW LEVEL SECURITY;
ALTER TABLE bank_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transfers FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON payments;
CREATE POLICY tenant_isolation ON payments
  USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

DROP POLICY IF EXISTS tenant_isolation ON bank_transfers;
CREATE POLICY tenant_isolation ON bank_transfers
  USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON payments, bank_transfers TO akura_app;

-- Cross-tenant lookup for PayHere notify_url
CREATE OR REPLACE FUNCTION app_find_payment_by_order_id(p_order_id text)
RETURNS TABLE (
  id uuid,
  tenant_id uuid,
  subscription_id uuid,
  order_id text,
  method payment_method,
  status payment_status,
  plan_key text,
  billing_cycle billing_cycle,
  amount_minor integer,
  currency text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.tenant_id, p.subscription_id, p.order_id, p.method, p.status,
         p.plan_key, p.billing_cycle, p.amount_minor, p.currency
  FROM payments p
  WHERE p.order_id = p_order_id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION app_find_payment_by_order_id(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_find_payment_by_order_id(text) TO PUBLIC;

CREATE OR REPLACE FUNCTION app_list_subscriptions_for_lifecycle(p_limit integer DEFAULT 100)
RETURNS TABLE (
  id uuid,
  tenant_id uuid,
  plan_key text,
  status subscription_status,
  trial_ends_at timestamptz,
  grace_ends_at timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean,
  read_only_since timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.tenant_id, s.plan_key, s.status, s.trial_ends_at, s.grace_ends_at,
         s.current_period_end, s.cancel_at_period_end,
         CASE WHEN s.status = 'read_only' THEN s.updated_at ELSE NULL END
  FROM subscriptions s
  WHERE s.status IN ('trialing', 'past_due', 'read_only', 'active')
  ORDER BY s.updated_at ASC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 100), 500));
$$;

REVOKE ALL ON FUNCTION app_list_subscriptions_for_lifecycle(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_list_subscriptions_for_lifecycle(integer) TO PUBLIC;

CREATE OR REPLACE FUNCTION app_find_bank_transfer(p_id uuid)
RETURNS TABLE (
  id uuid,
  tenant_id uuid,
  payment_id uuid,
  status text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bt.id, bt.tenant_id, bt.payment_id, bt.status
  FROM bank_transfers bt
  WHERE bt.id = p_id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION app_find_bank_transfer(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_find_bank_transfer(uuid) TO PUBLIC;
