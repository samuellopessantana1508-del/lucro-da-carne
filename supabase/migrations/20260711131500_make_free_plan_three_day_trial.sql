ALTER TABLE public.subscriptions
  ALTER COLUMN lots_limit SET DEFAULT 9999;

UPDATE public.subscriptions
SET
  lots_limit = 9999,
  expires_at = COALESCE(expires_at, started_at + interval '3 days', created_at + interval '3 days', now() + interval '3 days')
WHERE plan = 'gratis'
  AND provider = 'manual';

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

  INSERT INTO public.subscriptions (user_id, plan, status, lots_limit, expires_at)
  VALUES (NEW.id, 'gratis', 'active', 9999, now() + interval '3 days');

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
      provider_customer_id = NEW.email,
      provider_subscription_id = pending_grant.provider_sale_id,
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
