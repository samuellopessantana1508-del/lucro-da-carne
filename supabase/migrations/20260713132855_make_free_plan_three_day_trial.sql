ALTER TABLE public.subscriptions
  ALTER COLUMN lots_limit SET DEFAULT 9999;

-- Preserve the original account start so existing free accounts do not receive
-- a fresh trial when this migration is applied.
UPDATE public.subscriptions
SET
  lots_limit = 9999,
  billing_cycle = 'free',
  current_period_start = COALESCE(current_period_start, started_at, created_at),
  current_period_end = COALESCE(expires_at, started_at + interval '3 days', created_at + interval '3 days'),
  expires_at = COALESCE(expires_at, started_at + interval '3 days', created_at + interval '3 days'),
  free_uses_consumed = 0
WHERE plan = 'gratis';

CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  pending_grant public.billing_access_grants%ROWTYPE;
  trial_started_at TIMESTAMPTZ := now();
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
    current_period_start,
    current_period_end,
    expires_at
  )
  VALUES (
    NEW.id,
    'gratis',
    'active',
    9999,
    'free',
    0,
    trial_started_at,
    trial_started_at + interval '3 days',
    trial_started_at + interval '3 days'
  );

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
    0,
    0,
    0,
    s.status = 'active'
      AND CASE
        WHEN s.plan = 'gratis' THEN s.expires_at IS NOT NULL AND s.expires_at > now()
        ELSE s.expires_at IS NULL OR s.expires_at > now()
      END
  FROM public.subscriptions s
  WHERE s.user_id = target_user_id
    AND target_user_id = (SELECT auth.uid());
$$;

CREATE OR REPLACE FUNCTION private.consume_usage(target_user_id UUID)
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
    RAISE EXCEPTION 'subscription_access_expired'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.get_effective_plan(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.consume_usage(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.consume_free_usage_on_lot_insert() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.get_effective_plan(UUID) TO authenticated;
