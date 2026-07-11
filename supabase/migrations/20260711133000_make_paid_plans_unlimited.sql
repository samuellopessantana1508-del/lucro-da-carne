UPDATE public.subscriptions
SET lots_limit = 9999
WHERE plan IN ('pro', 'business')
  AND lots_limit < 9999;

UPDATE public.billing_products
SET lots_limit = 9999
WHERE plan IN ('pro', 'business')
  AND lots_limit < 9999;

UPDATE public.billing_access_grants
SET lots_limit = 9999
WHERE plan IN ('pro', 'business')
  AND lots_limit < 9999;
