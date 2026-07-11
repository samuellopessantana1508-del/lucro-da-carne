-- Lucro da Carne - schema SaaS para Supabase/PostgreSQL.
-- Esta mesma estrutura e aplicada pela migration em supabase/migrations.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;

-- Perfis de aplicacao: mantem apenas os dados necessarios fora de auth.users.
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  business_name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lotes pertencem a um unico usuario e sao protegidos por RLS.
CREATE TABLE IF NOT EXISTS public.lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'traseiro',
  supplier TEXT NOT NULL DEFAULT '',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  input_weight_kg NUMERIC NOT NULL CHECK (input_weight_kg >= 0),
  cost_per_kg NUMERIC NOT NULL CHECK (cost_per_kg >= 0),
  total_cost NUMERIC NOT NULL CHECK (total_cost >= 0),
  desired_margin_percent NUMERIC NOT NULL DEFAULT 30 CHECK (desired_margin_percent >= 0),
  notes TEXT NOT NULL DEFAULT '',
  cuts JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Estado de assinatura independente do provedor de pagamento.
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'gratis' CHECK (plan IN ('gratis', 'pro', 'business')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'expired')),
  lots_limit INTEGER NOT NULL DEFAULT 3 CHECK (lots_limit >= 0),
  provider TEXT NOT NULL DEFAULT 'manual' CHECK (provider IN ('manual', 'stripe', 'mercado_pago', 'kirvano', 'perfectpay')),
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  sale_code TEXT,
  product_code TEXT,
  plan_code TEXT,
  plan_name TEXT,
  billing_cycle TEXT CHECK (billing_cycle IS NULL OR billing_cycle IN ('free', 'monthly', 'annual')),
  amount NUMERIC CHECK (amount IS NULL OR amount >= 0),
  approved_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  free_uses_consumed INTEGER NOT NULL DEFAULT 0 CHECK (free_uses_consumed >= 0),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Eventos recebidos de gateways de pagamento. Nao ficam acessiveis no cliente.
CREATE TABLE IF NOT EXISTS public.billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'mercado_pago', 'kirvano', 'perfectpay')),
  provider_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processed', 'failed')),
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_event_id)
);

-- Produtos externos que concedem acesso ao SaaS.
CREATE TABLE IF NOT EXISTS public.billing_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('kirvano', 'perfectpay')),
  provider_product_id TEXT NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('gratis', 'pro', 'business')),
  lots_limit INTEGER NOT NULL DEFAULT 9999 CHECK (lots_limit >= 0),
  access_days INTEGER CHECK (access_days IS NULL OR access_days > 0),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_product_id)
);

-- Acesso de compras recebidas antes do comprador concluir o cadastro.
CREATE TABLE IF NOT EXISTS public.billing_access_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('kirvano', 'perfectpay')),
  provider_sale_id TEXT NOT NULL,
  provider_product_id TEXT NOT NULL,
  email TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  plan TEXT NOT NULL CHECK (plan IN ('gratis', 'pro', 'business')),
  lots_limit INTEGER NOT NULL CHECK (lots_limit >= 0),
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'granted', 'revoked')),
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_sale_id, provider_product_id)
);

CREATE INDEX IF NOT EXISTS idx_lots_user_created_at ON public.lots(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_provider_subscription
  ON public.subscriptions(provider, provider_subscription_id)
  WHERE provider_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_sale_code
  ON public.subscriptions(provider, sale_code)
  WHERE sale_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_code
  ON public.subscriptions(provider, plan_code)
  WHERE plan_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_billing_events_user_created_at
  ON public.billing_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_events_status_created_at
  ON public.billing_events(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_access_grants_email_status
  ON public.billing_access_grants(lower(email), status);
CREATE INDEX IF NOT EXISTS idx_billing_access_grants_user_id
  ON public.billing_access_grants(user_id);

-- Cria o perfil e o plano gratuito na mesma transacao do cadastro do Auth.
CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  pending_grant public.billing_access_grants%ROWTYPE;
BEGIN
  INSERT INTO public.profiles (id, email, name, business_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'business_name', '')
  );

  INSERT INTO public.subscriptions (
    user_id,
    plan,
    status,
    lots_limit,
    billing_cycle,
    free_uses_consumed,
    expires_at
  )
  VALUES (NEW.id, 'gratis', 'active', 3, 'free', 0, NULL);

  SELECT *
  INTO pending_grant
  FROM public.billing_access_grants
  WHERE lower(email) = lower(NEW.email)
    AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.subscriptions
    SET
      plan = pending_grant.plan,
      status = 'active',
      lots_limit = pending_grant.lots_limit,
      provider = pending_grant.provider,
      provider_customer_id = lower(NEW.email),
      provider_subscription_id = pending_grant.provider_sale_id,
      sale_code = pending_grant.provider_sale_id,
      product_code = pending_grant.provider_product_id,
      plan_code = pending_grant.provider_product_id,
      billing_cycle = CASE pending_grant.plan
        WHEN 'business' THEN 'annual'
        WHEN 'pro' THEN 'monthly'
        ELSE 'free'
      END,
      approved_at = COALESCE(pending_grant.granted_at, now()),
      current_period_start = COALESCE(pending_grant.granted_at, now()),
      current_period_end = pending_grant.expires_at,
      cancelled_at = NULL,
      free_uses_consumed = 0,
      expires_at = pending_grant.expires_at
    WHERE user_id = NEW.id;

    UPDATE public.billing_access_grants
    SET user_id = NEW.id, status = 'granted', granted_at = now()
    WHERE lower(email) = lower(NEW.email)
      AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- A funcao e usada somente pelas politicas RLS e nunca confia em metadata editavel do usuario.
CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND role = 'admin'
  );
$$;

-- Plano efetivo e uso gratuito ficam no banco, nao somente na interface.
CREATE OR REPLACE FUNCTION private.get_effective_plan(target_user_id UUID)
RETURNS TABLE (
  plan TEXT,
  status TEXT,
  billing_cycle TEXT,
  free_uses_consumed INTEGER,
  free_uses_limit INTEGER,
  free_uses_remaining INTEGER,
  can_use BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    s.plan,
    s.status,
    COALESCE(s.billing_cycle, CASE s.plan WHEN 'gratis' THEN 'free' WHEN 'business' THEN 'annual' ELSE 'monthly' END),
    s.free_uses_consumed,
    3,
    GREATEST(0, 3 - s.free_uses_consumed),
    s.status = 'active'
      AND (s.expires_at IS NULL OR s.expires_at > now())
      AND (s.plan <> 'gratis' OR s.free_uses_consumed < 3)
  FROM public.subscriptions s
  WHERE s.user_id = target_user_id
    AND target_user_id = (SELECT auth.uid());
$$;

CREATE OR REPLACE FUNCTION private.can_use_calculator(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE((
    SELECT can_use
    FROM private.get_effective_plan(target_user_id)
  ), false);
$$;

CREATE OR REPLACE FUNCTION private.can_insert_lot(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE((
    SELECT can_use
    FROM private.get_effective_plan(target_user_id)
  ), false);
$$;

CREATE OR REPLACE FUNCTION private.consume_usage(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_plan TEXT;
  current_status TEXT;
  current_expires_at TIMESTAMPTZ;
BEGIN
  SELECT plan, status, expires_at
  INTO current_plan, current_status, current_expires_at
  FROM public.subscriptions
  WHERE user_id = target_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF current_status <> 'active' OR (current_expires_at IS NOT NULL AND current_expires_at <= now()) THEN
    RETURN false;
  END IF;

  IF current_plan <> 'gratis' THEN
    RETURN true;
  END IF;

  UPDATE public.subscriptions
  SET free_uses_consumed = free_uses_consumed + 1
  WHERE user_id = target_user_id
    AND free_uses_consumed < 3;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION private.consume_free_usage_on_lot_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'permission_denied'
      USING ERRCODE = '42501';
  END IF;

  IF NOT private.consume_usage(NEW.user_id) THEN
    RAISE EXCEPTION 'free_usage_limit_reached'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.update_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.get_effective_plan(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.can_use_calculator(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.can_insert_lot(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.consume_usage(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.consume_free_usage_on_lot_insert() FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_effective_plan(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_use_calculator(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_insert_lot(UUID) TO authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION private.update_updated_at();

DROP TRIGGER IF EXISTS set_lots_updated_at ON public.lots;
CREATE TRIGGER set_lots_updated_at
  BEFORE UPDATE ON public.lots
  FOR EACH ROW EXECUTE FUNCTION private.update_updated_at();

DROP TRIGGER IF EXISTS consume_free_usage_on_lot_insert ON public.lots;
CREATE TRIGGER consume_free_usage_on_lot_insert
  BEFORE INSERT ON public.lots
  FOR EACH ROW EXECUTE FUNCTION private.consume_free_usage_on_lot_insert();

DROP TRIGGER IF EXISTS set_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION private.update_updated_at();

DROP TRIGGER IF EXISTS set_billing_products_updated_at ON public.billing_products;
CREATE TRIGGER set_billing_products_updated_at
  BEFORE UPDATE ON public.billing_products
  FOR EACH ROW EXECUTE FUNCTION private.update_updated_at();

DROP TRIGGER IF EXISTS set_billing_access_grants_updated_at ON public.billing_access_grants;
CREATE TRIGGER set_billing_access_grants_updated_at
  BEFORE UPDATE ON public.billing_access_grants
  FOR EACH ROW EXECUTE FUNCTION private.update_updated_at();

-- A Data API so expoe as tabelas que o cliente precisa. billing_events e interno.
REVOKE ALL ON TABLE public.profiles, public.lots, public.subscriptions, public.billing_events,
  public.billing_products, public.billing_access_grants
  FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (name, business_name, phone, updated_at) ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lots TO authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT UPDATE (
  plan,
  status,
  lots_limit,
  provider,
  provider_customer_id,
  provider_subscription_id,
  sale_code,
  product_code,
  plan_code,
  plan_name,
  billing_cycle,
  amount,
  approved_at,
  cancelled_at,
  free_uses_consumed,
  current_period_start,
  current_period_end,
  cancel_at_period_end,
  expires_at,
  updated_at
) ON public.subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_products TO authenticated;
GRANT SELECT (
  id,
  user_id,
  provider,
  provider_event_id,
  event_type,
  status,
  error_message,
  processed_at,
  created_at
) ON public.billing_events TO authenticated;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_access_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_select_admin ON public.profiles;
DROP POLICY IF EXISTS profiles_select_own_or_admin ON public.profiles;
CREATE POLICY profiles_select_own_or_admin
  ON public.profiles FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id OR (SELECT private.is_admin()));

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS lots_select_own ON public.lots;
DROP POLICY IF EXISTS lots_select_admin ON public.lots;
DROP POLICY IF EXISTS lots_select_own_or_admin ON public.lots;
CREATE POLICY lots_select_own_or_admin
  ON public.lots FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id OR (SELECT private.is_admin()));

DROP POLICY IF EXISTS lots_insert_own ON public.lots;
CREATE POLICY lots_insert_own
  ON public.lots FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND (SELECT private.can_insert_lot(user_id))
  );

DROP POLICY IF EXISTS lots_update_own ON public.lots;
CREATE POLICY lots_update_own
  ON public.lots FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS lots_delete_own ON public.lots;
CREATE POLICY lots_delete_own
  ON public.lots FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS subscriptions_select_own ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_select_admin ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_select_own_or_admin ON public.subscriptions;
CREATE POLICY subscriptions_select_own_or_admin
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id OR (SELECT private.is_admin()));

DROP POLICY IF EXISTS subscriptions_update_admin ON public.subscriptions;
CREATE POLICY subscriptions_update_admin
  ON public.subscriptions FOR UPDATE
  TO authenticated
  USING ((SELECT private.is_admin()))
  WITH CHECK ((SELECT private.is_admin()));

DROP POLICY IF EXISTS billing_events_no_client_access ON public.billing_events;
CREATE POLICY billing_events_no_client_access
  ON public.billing_events FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS billing_events_admin_select ON public.billing_events;
CREATE POLICY billing_events_admin_select
  ON public.billing_events FOR SELECT
  TO authenticated
  USING ((SELECT private.is_admin()));

DROP POLICY IF EXISTS billing_products_admin_all ON public.billing_products;
CREATE POLICY billing_products_admin_all
  ON public.billing_products FOR ALL
  TO authenticated
  USING ((SELECT private.is_admin()))
  WITH CHECK ((SELECT private.is_admin()));

DROP POLICY IF EXISTS billing_access_grants_no_client_access ON public.billing_access_grants;
CREATE POLICY billing_access_grants_no_client_access
  ON public.billing_access_grants FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
