ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS sale_code TEXT,
  ADD COLUMN IF NOT EXISTS product_code TEXT,
  ADD COLUMN IF NOT EXISTS plan_code TEXT,
  ADD COLUMN IF NOT EXISTS plan_name TEXT,
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT,
  ADD COLUMN IF NOT EXISTS amount NUMERIC,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS free_uses_consumed INTEGER NOT NULL DEFAULT 0;

-- Normalize the legacy production plan codes before Perfect Pay starts writing
-- the application plan codes used by the current frontend and webhooks.
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
ALTER TABLE public.billing_products
  DROP CONSTRAINT IF EXISTS billing_products_plan_check;
ALTER TABLE public.billing_access_grants
  DROP CONSTRAINT IF EXISTS billing_access_grants_plan_check;
ALTER TABLE public.plans
  DROP CONSTRAINT IF EXISTS plans_code_check,
  DROP CONSTRAINT IF EXISTS plans_supported_codes;

UPDATE public.subscriptions
SET plan = CASE plan
  WHEN 'mensal' THEN 'pro'
  WHEN 'anual' THEN 'business'
  ELSE plan
END
WHERE plan IN ('mensal', 'anual');

UPDATE public.billing_products
SET plan = CASE plan
  WHEN 'mensal' THEN 'pro'
  WHEN 'anual' THEN 'business'
  ELSE plan
END
WHERE plan IN ('mensal', 'anual');

UPDATE public.billing_access_grants
SET plan = CASE plan
  WHEN 'mensal' THEN 'pro'
  WHEN 'anual' THEN 'business'
  ELSE plan
END
WHERE plan IN ('mensal', 'anual');

UPDATE public.plans
SET
  code = CASE code
    WHEN 'mensal' THEN 'pro'
    WHEN 'anual' THEN 'business'
    ELSE code
  END,
  name = CASE code
    WHEN 'mensal' THEN 'Pro'
    WHEN 'anual' THEN 'Business'
    ELSE name
  END
WHERE code IN ('mensal', 'anual');

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN ('gratis', 'pro', 'business'));
ALTER TABLE public.billing_products
  ADD CONSTRAINT billing_products_plan_check
  CHECK (plan IN ('pro', 'business'));
ALTER TABLE public.billing_access_grants
  ADD CONSTRAINT billing_access_grants_plan_check
  CHECK (plan IN ('pro', 'business'));
ALTER TABLE public.plans
  ADD CONSTRAINT plans_code_check
  CHECK (code IN ('pro', 'business'));

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_provider_check;
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_provider_check
  CHECK (provider IN ('manual', 'stripe', 'mercado_pago', 'kirvano', 'perfectpay'));

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_billing_cycle_check;
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_billing_cycle_check
  CHECK (billing_cycle IS NULL OR billing_cycle IN ('free', 'monthly', 'annual'));

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_amount_check;
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_amount_check
  CHECK (amount IS NULL OR amount >= 0);

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_free_uses_consumed_check;
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_free_uses_consumed_check
  CHECK (free_uses_consumed >= 0);

ALTER TABLE public.billing_events
  DROP CONSTRAINT IF EXISTS billing_events_provider_check;
ALTER TABLE public.billing_events
  ADD CONSTRAINT billing_events_provider_check
  CHECK (provider IN ('stripe', 'mercado_pago', 'kirvano', 'perfectpay'));

ALTER TABLE public.billing_products
  DROP CONSTRAINT IF EXISTS billing_products_provider_check;
ALTER TABLE public.billing_products
  ADD CONSTRAINT billing_products_provider_check
  CHECK (provider IN ('kirvano', 'perfectpay'));

ALTER TABLE public.billing_access_grants
  DROP CONSTRAINT IF EXISTS billing_access_grants_provider_check;
ALTER TABLE public.billing_access_grants
  ADD CONSTRAINT billing_access_grants_provider_check
  CHECK (provider IN ('kirvano', 'perfectpay'));

CREATE INDEX IF NOT EXISTS idx_subscriptions_sale_code
  ON public.subscriptions(provider, sale_code)
  WHERE sale_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_code
  ON public.subscriptions(provider, plan_code)
  WHERE plan_code IS NOT NULL;

WITH usage AS (
  SELECT s.user_id, COALESCE(count(l.id), 0)::INTEGER AS lots_count
  FROM public.subscriptions s
  LEFT JOIN public.lots l ON l.user_id = s.user_id
  GROUP BY s.user_id
)
UPDATE public.subscriptions s
SET
  lots_limit = 3,
  billing_cycle = 'free',
  expires_at = NULL,
  free_uses_consumed = LEAST(3, GREATEST(s.free_uses_consumed, usage.lots_count))
FROM usage
WHERE s.user_id = usage.user_id
  AND s.plan = 'gratis';

UPDATE public.subscriptions
SET
  lots_limit = 9999,
  billing_cycle = CASE plan WHEN 'business' THEN 'annual' ELSE 'monthly' END
WHERE plan IN ('pro', 'business');

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
      expires_at = pending_grant.expires_at,
      cancelled_at = NULL,
      free_uses_consumed = 0
    WHERE user_id = NEW.id;

    UPDATE public.billing_access_grants
    SET user_id = NEW.id, status = 'granted', granted_at = now()
    WHERE lower(email) = lower(NEW.email)
      AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$$;

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

DROP TRIGGER IF EXISTS consume_free_usage_on_lot_insert ON public.lots;
CREATE TRIGGER consume_free_usage_on_lot_insert
  BEFORE INSERT ON public.lots
  FOR EACH ROW EXECUTE FUNCTION private.consume_free_usage_on_lot_insert();

REVOKE ALL ON FUNCTION private.get_effective_plan(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.can_use_calculator(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.can_insert_lot(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.consume_usage(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.consume_free_usage_on_lot_insert() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.get_effective_plan(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_use_calculator(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_insert_lot(UUID) TO authenticated;

REVOKE ALL ON TABLE public.billing_events FROM PUBLIC, anon, authenticated;
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

DROP POLICY IF EXISTS billing_events_admin_select ON public.billing_events;
CREATE POLICY billing_events_admin_select
  ON public.billing_events FOR SELECT
  TO authenticated
  USING ((SELECT private.is_admin()));
