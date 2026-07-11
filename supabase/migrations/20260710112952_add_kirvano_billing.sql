ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_provider_check;
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_provider_check
  CHECK (provider IN ('manual', 'stripe', 'mercado_pago', 'kirvano'));

ALTER TABLE public.billing_events
  DROP CONSTRAINT IF EXISTS billing_events_provider_check;
ALTER TABLE public.billing_events
  ADD CONSTRAINT billing_events_provider_check
  CHECK (provider IN ('stripe', 'mercado_pago', 'kirvano'));

CREATE TABLE public.billing_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('kirvano')),
  provider_product_id TEXT NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('gratis', 'pro', 'business')),
  lots_limit INTEGER NOT NULL DEFAULT 9999 CHECK (lots_limit >= 0),
  access_days INTEGER CHECK (access_days IS NULL OR access_days > 0),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_product_id)
);

CREATE TABLE public.billing_access_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('kirvano')),
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

CREATE INDEX idx_billing_access_grants_email_status
  ON public.billing_access_grants(lower(email), status);

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

  INSERT INTO public.subscriptions (user_id, plan, status, lots_limit)
  VALUES (NEW.id, 'gratis', 'active', 5);

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

DROP TRIGGER IF EXISTS set_billing_products_updated_at ON public.billing_products;
CREATE TRIGGER set_billing_products_updated_at
  BEFORE UPDATE ON public.billing_products
  FOR EACH ROW EXECUTE FUNCTION private.update_updated_at();

DROP TRIGGER IF EXISTS set_billing_access_grants_updated_at ON public.billing_access_grants;
CREATE TRIGGER set_billing_access_grants_updated_at
  BEFORE UPDATE ON public.billing_access_grants
  FOR EACH ROW EXECUTE FUNCTION private.update_updated_at();

REVOKE ALL ON TABLE public.billing_products, public.billing_access_grants FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_products TO authenticated;

ALTER TABLE public.billing_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_access_grants ENABLE ROW LEVEL SECURITY;

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
